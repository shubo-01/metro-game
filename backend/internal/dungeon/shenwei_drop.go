// Package dungeon 花果山副本 → 神位系统掉落集成。
//
// 结算胜利（outcome != 死亡）时，在常规奖励池之外按 PRD《神位系统》表2-1 追加判定：
//   - 珍品神位碎片（受运气加成）：孙悟空 → 美猴王碎片 5%；混世魔王 → 混世魔王碎片 10%
//     实际掉率 = 基础掉率 × (1 + 运气值×0.01)，运气值0-100；
//     本包 luck_snapshot 已存 qi_yun/100 ∈ [0,1]，故实际掉率 = 基础 × (1 + luckSnap)，
//     即美猴王碎片 5%~10%、混世魔王碎片 10%~20%，与 PRD 线性公式一致
//   - 凡品神位直接掉落（固定掉率，不受运气）：老猴/普通猴 → 妖兵32%；
//     魔王手下 → 魔兵33%；草木石头 → 天兵20%
//   - 自由属性点 0.1%（所有角色，独立判定）
//   - 归元符 3%（所有角色，独立判定）
//
// 掉落结果通过 HTTP POST 调 character-service(8005) 的 /shenwei/grant 内部接口发放，
// 携带 X-Internal-Key 共享密钥；调用失败只记日志、不阻断结算（下次副本还能再掉）。
package dungeon

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
)

// 神位掉落在 RewardEntry.ItemType 里的专用类型段（900段，与普通物品区分）
const (
	ItemTypeShenweiFragment = 901 // 神位碎片（ItemID=目标神位ID）
	ItemTypeShenweiTalisman = 902 // 归元符
	ItemTypeShenweiFreePt   = 903 // 自由属性点
	ItemTypeShenweiWhole    = 904 // 完整神位（凡品兵直接掉落，ItemID=神位ID）
)

// 神位定义ID（与 sql/migrations/v3_shenwei_system.sql 的 shenwei_def 种子一致）
const (
	shenweiYaoBing   = 1  // 妖兵（凡品，老猴/普通猴掉落）
	shenweiMoBing    = 2  // 魔兵（凡品，魔王手下掉落）
	shenweiTianBing  = 3  // 天兵（凡品，草木石头掉落）
	shenweiMeiHouKey = 10 // 美猴王（珍品，孙悟空掉碎片）
	shenweiHunShiKey = 11 // 混世魔王（珍品，混世魔王掉碎片）
)

// /shenwei/grant 的 grant_type 枚举（与 shenwei 包定义一致，避免跨包依赖手抄常量）
const (
	grantTypeFragment  = 1 // 神位碎片
	grantTypeTalisman  = 2 // 归元符
	grantTypeFreePoint = 4 // 自由属性点
	grantTypeShenwei   = 5 // 完整神位
)

// shenweiGrantURL character-service 内部发放接口地址（同机部署，走本机回环）
const shenweiGrantURL = "http://127.0.0.1:8005/shenwei/grant"

// shenweiInternalKey 与 shenwei.InternalKey 保持一致的共享密钥
// （dungeon 包不 import shenwei 包，避免服务边界互相依赖，常量双写并以注释互相锚定）
const shenweiInternalKey = "xunxian-internal-grant-2026"

// grantShenweiDrops 花果山结算胜利后的神位掉落判定与发放。
// 返回实际掉落的奖励列表（追加进结算 rewards / reward_json）。
// 任何发放失败只记日志不返回错误——神位掉落是锦上添花，绝不能阻断主结算流程。
func (s *Service) grantShenweiDrops(sessionID, playerID int64, roleType, outcome int, luckSnap float64) []RewardEntry {
	// 死亡无掉落（其余结局：完胜/受伤/生存/观测/剧情死亡 都算"活着走出副本"）
	if outcome == OutcomeDead {
		return nil
	}

	drops := []RewardEntry{}

	// ── 1. 珍品神位碎片（受运气加成，只对特定随机身份掉落）──
	// 实际掉率 = 基础掉率 × (1 + luckSnap)，luckSnap = qi_yun/100 ∈ [0,1]
	switch roleType {
	case RoleWukong: // 孙悟空 → 美猴王碎片，基础5%（运气拉满10%）
		if rand.Float64() < 0.05*(1+luckSnap) {
			drops = append(drops, RewardEntry{ItemID: shenweiMeiHouKey, ItemType: ItemTypeShenweiFragment, Quantity: 1})
		}
	case RoleMowang: // 混世魔王 → 混世魔王碎片，基础10%（运气拉满20%）
		if rand.Float64() < 0.10*(1+luckSnap) {
			drops = append(drops, RewardEntry{ItemID: shenweiHunShiKey, ItemType: ItemTypeShenweiFragment, Quantity: 1})
		}
	}

	// ── 2. 凡品神位直接掉落（固定掉率，不受运气，按随机身份分线）──
	switch roleType {
	case RoleMonkey, RoleOldMon: // 普通猴/老猴 → 妖兵 32%
		if rand.Float64() < 0.32 {
			drops = append(drops, RewardEntry{ItemID: shenweiYaoBing, ItemType: ItemTypeShenweiWhole, Quantity: 1})
		}
	case RoleShouxa: // 魔王手下 → 魔兵 33%
		if rand.Float64() < 0.33 {
			drops = append(drops, RewardEntry{ItemID: shenweiMoBing, ItemType: ItemTypeShenweiWhole, Quantity: 1})
		}
	case RoleGrass: // 草木石头 → 天兵 20%
		if rand.Float64() < 0.20 {
			drops = append(drops, RewardEntry{ItemID: shenweiTianBing, ItemType: ItemTypeShenweiWhole, Quantity: 1})
		}
	}

	// ── 3. 自由属性点 0.1%（所有身份，独立判定）──
	if rand.Float64() < 0.001 {
		drops = append(drops, RewardEntry{ItemType: ItemTypeShenweiFreePt, Quantity: 1})
	}

	// ── 4. 归元符 3%（所有身份，独立判定）──
	if rand.Float64() < 0.03 {
		drops = append(drops, RewardEntry{ItemType: ItemTypeShenweiTalisman, Quantity: 1})
	}

	// ── 异步逐条调 /shenwei/grant 发放（结算响应不等待发放完成）──
	// 取舍说明：掉落结果先随 reward_json 落库留痕（本函数返回值由调用方写入结算记录），
	// 实际发放放进单个 goroutine 异步补偿执行——character-service 故障时最多只损失
	// 本次发放（凭 reward_json 日志可人工补发），绝不能让最多 4 条 × 1 秒的同步 HTTP
	// 阻塞副本结算响应。发放失败只记日志、不重试，与"锦上添花不阻断主流程"策略一致。
	// 注意：goroutine 生命周期独立于本次 HTTP 请求，内部不得复用 request 上下文；
	// drops 切片在 return 后调用方只读不改，传入副本参数确保无数据竞争。
	go func(pending []RewardEntry) {
		for _, d := range pending {
			grantType := 0
			switch d.ItemType {
			case ItemTypeShenweiFragment:
				grantType = grantTypeFragment
			case ItemTypeShenweiTalisman:
				grantType = grantTypeTalisman
			case ItemTypeShenweiFreePt:
				grantType = grantTypeFreePoint
			case ItemTypeShenweiWhole:
				grantType = grantTypeShenwei
			}
			if err := postShenweiGrant(playerID, grantType, d.ItemID, d.Quantity); err != nil {
				log.Printf("[dungeon] 神位掉落发放失败(不阻断结算) session=%d player=%d type=%d item=%d: %v",
					sessionID, playerID, d.ItemType, d.ItemID, err)
			}
		}
	}(append([]RewardEntry(nil), drops...))
	return drops
}

// postShenweiGrant 调用 character-service 内部发放接口。
// 1秒超时兜底：发放已整体异步化，超时只影响后台补偿 goroutine，
// 压短超时可让故障期的失败日志更快产出，便于人工按 reward_json 补发。
func postShenweiGrant(characterID int64, grantType, shenweiID, count int) error {
	body, _ := json.Marshal(map[string]interface{}{
		"character_id": characterID,
		"grant_type":   grantType,
		"shenwei_id":   shenweiID,
		"count":        count,
	})
	req, err := http.NewRequest(http.MethodPost, shenweiGrantURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Key", shenweiInternalKey)

	client := &http.Client{Timeout: 1 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// 解析业务码：code!=0 也视为失败记日志
	var out struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return fmt.Errorf("响应解析失败: %w", err)
	}
	if out.Code != 0 {
		return fmt.Errorf("发放接口返回业务错误 code=%d msg=%s", out.Code, out.Msg)
	}
	return nil
}
