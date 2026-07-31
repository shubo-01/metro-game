// handler_v2.go 人物系统属性 V2 新增 HTTP 接口
// 本文件实现 V2 版本新增的 8 个接口（加点/洗点/道积攒/子阶突破/护盾查询/技能伤害/异常状态/护盾恢复）。
// 数值计算全部调用 calc.go 中的纯函数，本文件只负责：
//   1. 解析请求参数并校验
//   2. 读写数据库（事务保证一致性）
//   3. 按统一 APIResponse{code,msg,data} 格式返回 JSON
package character

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"
)

// assertCharacterOwner 校验"当前请求的账号"是否是指定角色的主人（防越权核心）。
// 认证方式与既有接口一致：getAccountID 从请求头 X-Account-ID 读取账号ID（见 HandleCreate）。
// 校验规则：
//   - 请求头没带账号（未登录/未认证）→ 401 未认证
//   - 角色在 character_base 里查不到 → 404 角色不存在
//   - 角色的 account_id 与请求账号不一致 → 403 无权操作
//
// 返回值：true=校验通过可以继续；false=校验失败，本函数已写好错误响应，调用方直接 return 即可。
func (s *Service) assertCharacterOwner(w http.ResponseWriter, r *http.Request, characterID int64) bool {
	accountID := getAccountID(r)
	if accountID == 0 {
		writeJSON(w, 401, APIResponse{Code: 401, Msg: "未认证"})
		return false
	}
	var ownerID int64
	err := s.db.QueryRow("SELECT account_id FROM character_base WHERE character_id=?", characterID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return false
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询角色归属失败"})
		return false
	}
	if ownerID != accountID {
		writeJSON(w, 403, APIResponse{Code: 403, Msg: "无权操作他人角色"})
		return false
	}
	return true
}

// getRealmIdx 查询角色的境界档位索引（1-12），供K值/基准值/固定点查表使用。
// 内部读取 character_realm 的 major_stage（大境界）和 sub_realm（神魔子阶）。
func (s *Service) getRealmIdx(characterID int64) (int, error) {
	var majorStage, subRealm int
	err := s.db.QueryRow("SELECT major_stage, sub_realm FROM character_realm WHERE character_id=?", characterID).
		Scan(&majorStage, &subRealm)
	if err != nil {
		return 0, err
	}
	return RealmIndex(majorStage, subRealm), nil
}

// ═══════════════════════════════════════════
//  POST /character/points/allocate  分配自由属性点
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "jing":3, "qi":2, "shen":1}
// 玩家把升级获得的"待分配点数"（character_realm.unassigned_points）
// 按自己的意愿加到精/气/神上。加完后衍生属性（气血/护盾等）立即重算落库。
func (s *Service) HandleAllocatePoints(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		Jing        int   `json:"jing"` // 加到精上的点数
		Qi          int   `json:"qi"`   // 加到气上的点数
		Shen        int   `json:"shen"` // 加到神上的点数
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 各项不能为负（防止玩家用负数"偷点"）
	if req.Jing < 0 || req.Qi < 0 || req.Shen < 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "分配点数不能为负数"})
		return
	}
	// 单次加点上限：各项≤10000（防御异常大数导致的溢出/刷数据）
	if req.Jing > 10000 || req.Qi > 10000 || req.Shen > 10000 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "单次加点每项不能超过10000"})
		return
	}
	total := req.Jing + req.Qi + req.Shen
	if total <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "至少分配1点"})
		return
	}

	// 归属校验：只能给自己的角色加点（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 用事务保证"扣余额"和"加属性"要么都成功、要么都不发生
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 1. 查余额（FOR UPDATE 行锁，防止并发重复扣点）
	var unassigned int
	err = tx.QueryRow("SELECT unassigned_points FROM character_realm WHERE character_id=? FOR UPDATE", req.CharacterID).
		Scan(&unassigned)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "读取待分配点数失败"})
		return
	}
	if unassigned < total {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: fmt.Sprintf("待分配点数不足：拥有%d，需要%d", unassigned, total)})
		return
	}

	// 2. 扣减余额
	if _, err = tx.Exec("UPDATE character_realm SET unassigned_points=unassigned_points-? WHERE character_id=?",
		total, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "扣减点数失败"})
		return
	}

	// 3. 加属性：jing/qi/shen 是"总值"（固定点+自由点），free_* 单独记账（洗点时只退自由点部分）
	if _, err = tx.Exec(`UPDATE character_attributes SET
		jing=jing+?, qi=qi+?, shen=shen+?,
		free_jing=free_jing+?, free_qi=free_qi+?, free_shen=free_shen+?
		WHERE character_id=?`,
		req.Jing, req.Qi, req.Shen, req.Jing, req.Qi, req.Shen, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "属性加点失败"})
		return
	}

	// 4. 精气神变了，按 V2 公式重算衍生属性并落库（事务内执行）
	derived, err := recalcAndSaveDerived(tx, req.CharacterID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "衍生属性重算失败"})
		return
	}

	if err = tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	// 5. 返回最新属性（提交后重新读一次，保证是落库后的真实值）
	var jing, qi, shen, freeJing, freeQi, freeShen int
	s.db.QueryRow("SELECT jing, qi, shen, free_jing, free_qi, free_shen FROM character_attributes WHERE character_id=?", req.CharacterID).
		Scan(&jing, &qi, &shen, &freeJing, &freeQi, &freeShen)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "加点成功",
		Data: map[string]interface{}{
			"jing": jing, "qi": qi, "shen": shen,
			"free_jing": freeJing, "free_qi": freeQi, "free_shen": freeShen,
			"unassigned_points": unassigned - total, // 剩余待分配点数
			"derived":           derived,            // 重算后的全部衍生属性
		},
	})
}

// ═══════════════════════════════════════════
//  POST /character/points/wash  洗点（重置自由属性点）
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// 把已分配的自由点（free_jing/free_qi/free_shen）从精气神里扣回来，
// 全部返还到 unassigned_points，玩家可以重新分配。
// 洗点费用（灵石）按境界查表（人100/真人1000/...）；
// 注意：本项目目前没有经济/钱包表，所以这里只把"应扣费用"记入 wash_log 流水，
// 实际扣费跳过，等经济系统上线后再接入（届时在事务里补一条扣灵石SQL即可）。
func (s *Service) HandleWashPoints(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 归属校验：只能洗自己角色的点（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 查境界档位 → 决定洗点费用
	realmIdx, err := s.getRealmIdx(req.CharacterID)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}
	washCost := GetWashCost(realmIdx)

	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 1. 读出已分配的自由点（行锁防并发重复洗点）
	var freeJing, freeQi, freeShen int
	err = tx.QueryRow("SELECT free_jing, free_qi, free_shen FROM character_attributes WHERE character_id=? FOR UPDATE", req.CharacterID).
		Scan(&freeJing, &freeQi, &freeShen)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色属性不存在"})
		return
	}
	totalReturn := freeJing + freeQi + freeShen
	if totalReturn <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "没有已分配的自由点，无需洗点"})
		return
	}

	// 2. 从精气神里扣回自由点部分（固定点不动），并清零 free_* 记账
	//    GREATEST(1, ...) 兜底：理论上 jing >= 固定点+free_jing >= 1，防御性写法防止减成0
	if _, err = tx.Exec(`UPDATE character_attributes SET
		jing=GREATEST(1, jing-?), qi=GREATEST(1, qi-?), shen=GREATEST(1, shen-?),
		free_jing=0, free_qi=0, free_shen=0
		WHERE character_id=?`,
		freeJing, freeQi, freeShen, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "重置属性失败"})
		return
	}

	// 3. 自由点全额返还到待分配池
	if _, err = tx.Exec("UPDATE character_realm SET unassigned_points=unassigned_points+? WHERE character_id=?",
		totalReturn, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "返还点数失败"})
		return
	}

	// 4. 写洗点流水（记录本次退回的点数分布和应扣费用，便于对账/追溯）
	//    项目暂无经济表 → cost_paid=0 表示实际未扣费，cost_expected 记录应扣金额
	if _, err = tx.Exec(`INSERT INTO wash_log (character_id, jing_returned, qi_returned, shen_returned, total_returned, cost_expected, cost_paid)
		VALUES (?, ?, ?, ?, ?, ?, 0)`,
		req.CharacterID, freeJing, freeQi, freeShen, totalReturn, washCost); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "记录洗点流水失败"})
		return
	}

	// 5. 精气神变了，重算衍生属性并落库
	derived, err := recalcAndSaveDerived(tx, req.CharacterID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "衍生属性重算失败"})
		return
	}

	if err = tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	var unassigned int
	s.db.QueryRow("SELECT unassigned_points FROM character_realm WHERE character_id=?", req.CharacterID).Scan(&unassigned)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "洗点成功，自由点已全部返还",
		Data: map[string]interface{}{
			"returned_jing":     freeJing,
			"returned_qi":       freeQi,
			"returned_shen":     freeShen,
			"total_returned":    totalReturn,
			"unassigned_points": unassigned,
			"wash_cost":         washCost, // 本境界洗点应扣灵石（当前未接经济系统，实际未扣）
			"derived":           derived,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /character/dao/gain  积攒神魔之道
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "dao_type":1, "amount":10}
// dao_type：1太极 2太素 3太始 4太初 5太易（对应神魔5个子阶）
// 玩家通过任务/副本获得"道"，攒够100可突破对应子阶（见 /character/dao/breakthrough）。
func (s *Service) HandleDaoGain(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		DaoType     int   `json:"dao_type"` // 1太极 2太素 3太始 4太初 5太易
		Amount      int   `json:"amount"`   // 本次获得的道值
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if req.DaoType < 1 || req.DaoType > 5 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "dao_type 只能为1-5（太极/太素/太始/太初/太易）"})
		return
	}
	if req.Amount <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "amount 必须为正数"})
		return
	}
	// 单次获得道值上限：≤10000（防御异常大数刷道值）
	if req.Amount > 10000 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "amount 单次不能超过10000"})
		return
	}

	// 归属校验：只能给自己的角色积攒道值（未认证401/角色不存在404/非本人403）
	// 注：本校验内部已查过 character_base，角色不存在会直接返回404，无需再单独查存在性
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// dao_type → 列名映射（白名单写死，绝不拼接用户输入，防SQL注入）
	daoColumns := map[int]string{1: "dao_taiji", 2: "dao_taisu", 3: "dao_taishi", 4: "dao_taichu", 5: "dao_taiyi"}
	col := daoColumns[req.DaoType]

	// upsert：第一次积攒时插入新行，之后累加
	query := fmt.Sprintf(`INSERT INTO dao_accumulation (character_id, %s) VALUES (?, ?)
		ON DUPLICATE KEY UPDATE %s=%s+?`, col, col, col)
	if _, err := s.db.Exec(query, req.CharacterID, req.Amount, req.Amount); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "积攒道值失败"})
		return
	}

	// 返回最新的5种道值，方便前端一次刷新全部进度条
	var d1, d2, d3, d4, d5 int
	s.db.QueryRow("SELECT dao_taiji, dao_taisu, dao_taishi, dao_taichu, dao_taiyi FROM dao_accumulation WHERE character_id=?", req.CharacterID).
		Scan(&d1, &d2, &d3, &d4, &d5)

	daoNames := map[int]string{1: "太极", 2: "太素", 3: "太始", 4: "太初", 5: "太易"}
	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  fmt.Sprintf("获得 %s之道 ×%d", daoNames[req.DaoType], req.Amount),
		Data: map[string]interface{}{
			"dao_taiji": d1, "dao_taisu": d2, "dao_taishi": d3, "dao_taichu": d4, "dao_taiyi": d5,
			"breakthrough_need": 100, // 子阶突破所需道值
		},
	})
}

// ═══════════════════════════════════════════
//  POST /character/dao/breakthrough  神魔子阶突破
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// 神魔境界（major_stage=8）内部的5个子阶（太极→太素→太始→太初→太易）
// 不走天劫，而是"以道证道"：当前子阶对应的道值攒够100 → 消耗100 → 子阶+1。
// 突破后发放新子阶的固定点（精气神各提升到新档位固定点）。
func (s *Service) HandleDaoBreakthrough(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 归属校验：只能突破自己角色的子阶（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 1. 校验必须是神魔境界，且未到最终子阶太易
	var majorStage, subRealm int
	err := s.db.QueryRow("SELECT major_stage, sub_realm FROM character_realm WHERE character_id=?", req.CharacterID).
		Scan(&majorStage, &subRealm)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}
	if majorStage < 8 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "只有神魔境界才能进行子阶突破（大境界突破请走 /character/realm/breakthrough）"})
		return
	}
	if subRealm < 1 {
		subRealm = 1 // 兼容旧数据：刚突破神魔还没写 sub_realm 时按太极处理
	}
	if subRealm >= 5 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "已达神魔·太易，修行圆满，无可再破"})
		return
	}

	// 2. 检查当前子阶对应的道值是否 ≥100
	//    规则：从太极(1)突破到太素(2)，消耗的是"太极之道"——即当前子阶的道
	daoColumns := map[int]string{1: "dao_taiji", 2: "dao_taisu", 3: "dao_taishi", 4: "dao_taichu", 5: "dao_taiyi"}
	col := daoColumns[subRealm]

	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	var daoValue int
	err = tx.QueryRow(fmt.Sprintf("SELECT %s FROM dao_accumulation WHERE character_id=? FOR UPDATE", col), req.CharacterID).
		Scan(&daoValue)
	if err == sql.ErrNoRows {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "尚未积攒任何道值，请先通过 /character/dao/gain 积攒"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "读取道值失败"})
		return
	}
	daoNames := map[int]string{1: "太极", 2: "太素", 3: "太始", 4: "太初", 5: "太易"}
	if daoValue < 100 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: fmt.Sprintf("%s之道不足：当前%d，需要100", daoNames[subRealm], daoValue)})
		return
	}

	// 3. 消耗100道值，同步更新 dao_accumulation 里的当前子阶记录
	newSubRealm := subRealm + 1
	if _, err = tx.Exec(fmt.Sprintf("UPDATE dao_accumulation SET %s=%s-100, current_sub_realm=? WHERE character_id=?", col, col),
		newSubRealm, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "消耗道值失败"})
		return
	}

	// 4. 子阶+1（境界表也记一份，作为权威数据源）
	if _, err = tx.Exec("UPDATE character_realm SET sub_realm=? WHERE character_id=?",
		newSubRealm, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "更新子阶失败"})
		return
	}

	// 5. 发放新子阶固定点：精气神各 +（新档固定点 - 旧档固定点）
	//    例：太极141 → 太素181，各+40
	fixedDelta := GetFixedPoints(RealmIndex(8, newSubRealm)) - GetFixedPoints(RealmIndex(8, subRealm))
	if fixedDelta > 0 {
		if _, err = tx.Exec("UPDATE character_attributes SET jing=jing+?, qi=qi+?, shen=shen+? WHERE character_id=?",
			fixedDelta, fixedDelta, fixedDelta, req.CharacterID); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "发放固定点失败"})
			return
		}
	}

	// 6. 精气神变了，重算衍生属性并落库
	derived, err := recalcAndSaveDerived(tx, req.CharacterID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "衍生属性重算失败"})
		return
	}

	if err = tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  fmt.Sprintf("子阶突破成功！晋升为 神魔·%s", daoNames[newSubRealm]),
		Data: map[string]interface{}{
			"sub_realm":         newSubRealm,
			"sub_realm_name":    daoNames[newSubRealm],
			"dao_consumed":      100,
			"dao_remaining":     daoValue - 100,
			"fixed_point_bonus": fixedDelta,
			"derived":           derived,
		},
	})
}

// ═══════════════════════════════════════════
//  GET /character/shield  查询护盾与气血状态
// ═══════════════════════════════════════════
//
// 请求：GET /character/shield?character_id=1
// 返回护盾/HP的当前值与上限，以及护盾恢复速度（脱战5秒后每秒回多少）。
func (s *Service) HandleShield(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	// GET 接口的 character_id 在 URL 查询参数里，先解析成整数再做归属校验
	charIDStr := r.URL.Query().Get("character_id")
	if charIDStr == "" {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "缺少 character_id"})
		return
	}
	charID, err := strconv.ParseInt(charIDStr, 10, 64)
	if err != nil || charID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必须为正整数"})
		return
	}

	// 归属校验：只能查自己角色的护盾状态（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, charID) {
		return
	}

	var jing, qi, shen, hpMax, hpCur int
	var shieldMax, shieldCur int64
	err = s.db.QueryRow(
		"SELECT jing, qi, shen, hp_max, hp_current, shield_max, shield_current FROM character_attributes WHERE character_id=?",
		charID,
	).Scan(&jing, &qi, &shen, &hpMax, &hpCur, &shieldMax, &shieldCur)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Data: map[string]interface{}{
			"shield_current": shieldCur,
			"shield_max":     shieldMax,
			"hp_current":     hpCur,
			"hp_max":         hpMax,
			"shield_regen":   CalcShieldRegen(jing, qi, shen), // 每秒恢复量（脱战5秒后生效）
			"recover_delay":  ShieldRecoverDelay,              // 脱战后需等待的秒数
		},
	})
}

// ═══════════════════════════════════════════
//  POST /combat/skill  技能伤害结算（全链路）
// ═══════════════════════════════════════════
//
// 请求：{"attacker_id":1, "defender_id":2, "skill_type":2, "skill_level":5, "element_type":4}
// skill_type：1武器技(体修) 2五行技(法修) 3神位技(魂修)
// 流程：读双方属性 → 掷暴击骰 → CalcDamage 算伤害 → ApplyDamage 先扣盾后扣血 → 落库 → 返回明细。
func (s *Service) HandleCombatSkill(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		AttackerID  int64 `json:"attacker_id"`
		DefenderID  int64 `json:"defender_id"`
		SkillType   int   `json:"skill_type"`   // 1武器技 2五行技 3神位技
		SkillLevel  int   `json:"skill_level"`  // 技能等级1-10
		ElementType int   `json:"element_type"` // 五行技的元素类型1-5（其他技能可传0）
		WeaponBase  int   `json:"weapon_base"`  // 可选：武器基础伤害（不传默认100）
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if req.SkillType < SkillTypeWeapon || req.SkillType > SkillTypeDivine {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "skill_type 只能为1(武器技)/2(五行技)/3(神位技)"})
		return
	}
	if req.SkillType == SkillTypeElement && (req.ElementType < 1 || req.ElementType > 5) {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "五行技必须指定 element_type 1-5"})
		return
	}
	// 拒绝自己打自己（既无游戏意义，又可能被利用刷护盾结算）
	if req.AttackerID == req.DefenderID {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "攻击者和防守者不能为同一角色"})
		return
	}

	// 归属校验：只校验攻击方必须是自己的角色；防守方可以是任意角色（PVP场景打别人是正常操作）
	if !s.assertCharacterOwner(w, r, req.AttackerID) {
		return
	}

	// 1. 读攻击方属性（精气神 + 悟性决定暴击率）
	var atkJing, atkQi, atkShen, atkWuXing int
	err := s.db.QueryRow("SELECT jing, qi, shen, wu_xing FROM character_attributes WHERE character_id=?", req.AttackerID).
		Scan(&atkJing, &atkQi, &atkShen, &atkWuXing)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "攻击方角色不存在"})
		return
	}

	// 2. 读攻击方已修五行列表（决定多修倍率和相生系数）
	//    注意必须完整处理三段错误：Query本身 / 每行Scan / 迭代结束后的rows.Err()，
	//    否则 Query 失败时 rows 为 nil，直接 rows.Next() 会 panic 拖垮整个服务。
	var atkElements []int
	rows, err := s.db.Query("SELECT element_type FROM character_qi_elements WHERE character_id=?", req.AttackerID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "读取攻击方五行列表失败"})
		return
	}
	defer rows.Close()
	for rows.Next() {
		var et int
		if err := rows.Scan(&et); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "解析攻击方五行数据失败"})
			return
		}
		atkElements = append(atkElements, et)
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "遍历攻击方五行数据失败"})
		return
	}

	// 3. 读攻击方境界档位（决定基准功法威力/基准神/K亲和）
	realmIdx, err := s.getRealmIdx(req.AttackerID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "读取攻击方境界失败"})
		return
	}

	// 4. 读防守方主修五行（正在修炼的那个，用于克制判定；没有则0=无克制）
	//    该值只读不改，放在事务外读即可，不占行锁时间
	var defElement int
	s.db.QueryRow("SELECT element_type FROM character_qi_elements WHERE character_id=? AND is_cultivating=1 LIMIT 1", req.DefenderID).
		Scan(&defElement)

	// 5. 开事务锁定防守方：从"读护盾/HP"到"写回结果"必须是原子操作，
	//    否则两个玩家同时攻击同一目标时会互相覆盖（并发丢失更新）。
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// FOR UPDATE 行锁：锁住防守方属性行，其他并发结算会排队等待本事务提交
	var defJing, defQi, defShen, defHPCur int
	var defShieldCur int64
	err = tx.QueryRow("SELECT jing, qi, shen, hp_current, shield_current FROM character_attributes WHERE character_id=? FOR UPDATE", req.DefenderID).
		Scan(&defJing, &defQi, &defShen, &defHPCur, &defShieldCur)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "防守方角色不存在"})
		return
	}

	// 6. 掷暴击骰：暴击率 = 悟性 × 0.5%（掷骰在这里做，CalcDamage保持纯函数可测试）
	isCrit := rand.Float64() < float64(atkWuXing)*CritRatePerWuXing

	// 7. 全链路伤害计算（四条路径见 calc.go 的 CalcDamage）
	dmg := CalcDamage(DamageInput{
		SkillType:   req.SkillType,
		SkillLevel:  req.SkillLevel,
		ElementType: req.ElementType,
		WeaponBase:  req.WeaponBase,
		AtkJing:     atkJing,
		AtkQi:       atkQi,
		AtkShen:     atkShen,
		AtkElements: atkElements,
		DefElement:  defElement,
		DefJing:     defJing,
		DefQi:       defQi,
		DefShen:     defShen,
		RealmIdx:    realmIdx,
		IsCrit:      isCrit,
	})

	// 8. 护盾结算：先扣盾后扣血
	shieldAfter, hpAfter, shieldAbsorbed, hpDamage, shieldBroken :=
		ApplyDamage(defShieldCur, int64(defHPCur), dmg.RawDamage)

	// 9. 事务内落库防守方最新护盾/HP，然后提交释放行锁
	//    V5：同时刷新防守方 last_combat_time=NOW()（护盾脱战懒结算锚点，见 combat_v5.go）
	if _, err = tx.Exec("UPDATE character_attributes SET shield_current=?, hp_current=?, last_combat_time=NOW() WHERE character_id=?",
		shieldAfter, hpAfter, req.DefenderID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "伤害结算落库失败"})
		return
	}
	if err = tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	// V5：攻击方也算"进入战斗"，同样刷新 last_combat_time。
	// 【锁序说明】必须放在事务提交之后 best-effort 更新：若在事务内更新攻击方行，
	// A打B与B打A并发时会形成 "锁B等A" 与 "锁A等B" 的交叉持锁 → 死锁。
	_, _ = s.db.Exec("UPDATE character_attributes SET last_combat_time=NOW() WHERE character_id=?", req.AttackerID)

	// V5：受击硬直时长下发（PVP技能按普攻档0.2秒，暴击+0.1秒；分档纯函数见 combat_v5.go）
	staggerS := CalcHitStagger(HitSourceNormal, isCrit)

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "伤害结算完成",
		Data: map[string]interface{}{
			"raw_damage":      dmg.RawDamage,   // 最终伤害值
			"shield_absorbed": shieldAbsorbed,  // 护盾吸收量
			"hp_damage":       hpDamage,        // 打到本体的伤害
			"shield_broken":   shieldBroken,    // 是否破盾
			"is_crit":         isCrit,          // 是否暴击
			"stagger_s":       staggerS,        // V5：受击硬直秒数（普攻0.2s，暴击+0.1s）
			"equilibrium":     dmg.Equilibrium, // 均衡加成（2=均衡Build 1=偏科）
			"defender_shield": shieldAfter,     // 防守方剩余护盾
			"defender_hp":     hpAfter,         // 防守方剩余HP
			"detail": map[string]interface{}{ // 各乘区明细（前端浮字/数值排查用）
				"base_damage":    dmg.BaseDamage,
				"skill_mul":      dmg.SkillMul,
				"multi_mul":      dmg.MultiMul,
				"sheng_mul":      dmg.ShengMul,
				"counter_mul":    dmg.CounterMul,
				"affinity_bonus": dmg.AffinityBonus,
				"crit_mul":       dmg.CritMul,
			},
		},
	})
}

// ═══════════════════════════════════════════
//  POST /combat/abnormal  异常状态判定与施加
// ═══════════════════════════════════════════
//
// 请求：{"attacker_id":1, "defender_id":2, "abnormal_type":1}
// abnormal_type：1冰冻(30%基础/2秒) 2灼烧(30%/3秒) 3眩晕(20%/1.5秒)
// 实际触发概率 = 基础概率 × (1 - 防守方异常抵抗率)，抵抗率 = 抵抗值/(抵抗值+K异常)。
// 触发成功后把 active 状态存入 Redis：key = abnormal:{char_id}:{type}，TTL = 持续秒数，
// 场景服务只需查这个 key 是否存在就知道角色当前是否被控。
func (s *Service) HandleCombatAbnormal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		AttackerID   int64 `json:"attacker_id"`
		DefenderID   int64 `json:"defender_id"`
		AbnormalType int   `json:"abnormal_type"` // 1冰冻 2灼烧 3眩晕
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	baseProb, ok := AbnormalBaseProb[req.AbnormalType]
	if !ok {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "abnormal_type 只能为1(冰冻)/2(灼烧)/3(眩晕)"})
		return
	}
	duration := AbnormalDuration[req.AbnormalType]

	// 归属校验：只校验攻击方必须是自己的角色；防守方可以是任意角色（PVP施加异常是正常操作）
	if !s.assertCharacterOwner(w, r, req.AttackerID) {
		return
	}

	// 1. 读防守方的神 → 异常抵抗值 = 神 × 0.5
	var defShen int
	err := s.db.QueryRow("SELECT shen FROM character_attributes WHERE character_id=?", req.DefenderID).Scan(&defShen)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "防守方角色不存在"})
		return
	}
	resist := float64(defShen) * CoefAbnormalResist

	// 2. 读防守方境界 → K异常（人67/真人171/...）
	realmIdx, err := s.getRealmIdx(req.DefenderID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "读取防守方境界失败"})
		return
	}
	kAbnormal := GetKAbnormal(realmIdx)

	// 3. 实际触发概率 = 基础概率 × (1 - 抵抗率)，然后掷骰
	resistRate := CalcAbnormalResistRate(resist, kAbnormal)
	triggerProb := CalcAbnormalTriggerProb(baseProb, resist, kAbnormal)
	triggered := rand.Float64() < triggerProb

	abnormalNames := map[int]string{AbnormalFrozen: "冰冻", AbnormalBurn: "灼烧", AbnormalStun: "眩晕"}
	data := map[string]interface{}{
		"abnormal_type": req.AbnormalType,
		"abnormal_name": abnormalNames[req.AbnormalType],
		"base_prob":     baseProb,    // 基础触发概率
		"resist_rate":   resistRate,  // 防守方异常抵抗率
		"trigger_prob":  triggerProb, // 实际触发概率
		"triggered":     triggered,   // 本次是否触发
	}

	if !triggered {
		writeJSON(w, 200, APIResponse{Code: 0, Msg: "异常状态未触发（被抵抗）", Data: data})
		return
	}

	// 4. 触发成功：active 状态写入 Redis，TTL = 持续秒数，到期自动解除
	key := fmt.Sprintf("abnormal:%d:%d", req.DefenderID, req.AbnormalType)
	if err := s.rdb.Set(key, "1", time.Duration(duration*float64(time.Second))); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "写入异常状态失败"})
		return
	}
	data["duration"] = duration // 持续秒数
	data["redis_key"] = key     // 场景服务查询用的键名

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  fmt.Sprintf("触发 %s！持续%.1f秒", abnormalNames[req.AbnormalType], duration),
		Data: data,
	})
}

// ═══════════════════════════════════════════
//  POST /combat/shield/recover  脱战护盾恢复
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "seconds":10}
// 脱战5秒后护盾开始按 (精+气+神)×2/秒 恢复。
// 调用方（场景服务/客户端心跳）传入"已脱战恢复的秒数"，本接口按秒数结算恢复量并落库。
// 注意：恢复量不会超过护盾上限。
func (s *Service) HandleShieldRecover(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		Seconds     int   `json:"seconds"` // 本次结算的恢复秒数
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if req.Seconds <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "seconds 必须为正数"})
		return
	}
	// 单次结算秒数上限：≤3600（1小时），防御异常大数一口气把护盾刷满上限外
	if req.Seconds > 3600 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "seconds 单次不能超过3600"})
		return
	}

	// 归属校验：只能恢复自己角色的护盾（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 1. 开事务锁定角色属性行：从"读护盾"到"写回新值"必须原子，
	//    否则恢复结算和战斗扣盾并发时会互相覆盖（丢失更新）
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// FOR UPDATE 行锁读精气神（决定恢复速度）和当前护盾状态
	var jing, qi, shen int
	var shieldMax, shieldCur int64
	err = tx.QueryRow("SELECT jing, qi, shen, shield_max, shield_current FROM character_attributes WHERE character_id=? FOR UPDATE", req.CharacterID).
		Scan(&jing, &qi, &shen, &shieldMax, &shieldCur)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	// 2. 恢复量 = (精+气+神) × 2 × 秒数，封顶到护盾上限
	regenPerSec := CalcShieldRegen(jing, qi, shen)
	recovered := int64(regenPerSec) * int64(req.Seconds)
	newShield := shieldCur + recovered
	if newShield > shieldMax {
		recovered = shieldMax - shieldCur // 实际恢复量按封顶后计算
		newShield = shieldMax
	}

	// 3. 事务内落库（LEAST 双保险，防止并发时超上限），提交后释放行锁
	if _, err = tx.Exec("UPDATE character_attributes SET shield_current=LEAST(?, shield_max) WHERE character_id=?",
		newShield, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "护盾恢复落库失败"})
		return
	}
	if err = tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "护盾恢复结算完成",
		Data: map[string]interface{}{
			"regen_per_sec":  regenPerSec, // 每秒恢复量
			"seconds":        req.Seconds, // 本次结算秒数
			"recovered":      recovered,   // 实际恢复量（可能因封顶而小于理论值）
			"shield_current": newShield,   // 恢复后的护盾
			"shield_max":     shieldMax,   // 护盾上限
			"is_full":        newShield >= shieldMax,
		},
	})
}

// ═══════════════════════════════════════════
//  POST /combat/burn/tick  灼烧持续掉血结算
// ═══════════════════════════════════════════
//
// 请求：{"character_id":2}
// 灼烧（abnormal_type=2）触发后持续3秒，每秒掉一跳血。
// 调用方（场景服务/客户端心跳）每秒调用一次本接口结算一跳：
//   1. 先查 Redis key abnormal:{char_id}:2 是否存在——只有灼烧生效中才结算，
//      key 过期（3秒到）后调用会返回400，防止灼烧结束后还能继续扣血
//   2. 事务 + FOR UPDATE 行锁读改写护盾/HP（规则见 calc.go 的 ApplyBurnTick）：
//      未破盾扣护盾上限5%（最少1点）；破盾后扣当前HP5%（最少1点，HP不低于0）
//   3. 返回本跳的扣减明细
func (s *Service) HandleBurnTick(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 归属校验：只能结算自己角色身上的灼烧（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 1. 检查灼烧状态是否生效中（key 由 /combat/abnormal 触发成功时写入，TTL=3秒自动过期）
	key := fmt.Sprintf("abnormal:%d:%d", req.CharacterID, AbnormalBurn)
	burning, err := s.rdb.Exists(key)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询灼烧状态失败"})
		return
	}
	if !burning {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "角色当前没有灼烧状态，无需结算"})
		return
	}

	// 2. 开事务锁定角色属性行：读改写必须原子，防止和战斗扣盾/护盾恢复并发时丢失更新
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// FOR UPDATE 行锁读护盾上限/当前护盾/当前HP
	var shieldMax, shieldCur, hpCur int64
	err = tx.QueryRow("SELECT shield_max, shield_current, hp_current FROM character_attributes WHERE character_id=? FOR UPDATE", req.CharacterID).
		Scan(&shieldMax, &shieldCur, &hpCur)
	if err != nil {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色不存在"})
		return
	}

	// 3. 按灼烧规则结算一跳（纯函数，边界见 calc_test.go 的 TestApplyBurnTick）
	shieldAfter, hpAfter, shieldDamage, hpDamage := ApplyBurnTick(shieldMax, shieldCur, hpCur)

	// 4. 事务内落库，提交后释放行锁
	if _, err = tx.Exec("UPDATE character_attributes SET shield_current=?, hp_current=? WHERE character_id=?",
		shieldAfter, hpAfter, req.CharacterID); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "灼烧结算落库失败"})
		return
	}
	if err = tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "灼烧结算完成",
		Data: map[string]interface{}{
			"shield_damage":  shieldDamage,    // 本跳扣掉的护盾（护盾上限5%，最少1点）
			"hp_damage":      hpDamage,        // 本跳扣掉的HP（破盾后当前HP5%，最少1点）
			"shield_current": shieldAfter,     // 结算后的护盾
			"hp_current":     hpAfter,         // 结算后的HP
			"shield_max":     shieldMax,       // 护盾上限（前端算比例用）
			"is_dead":        hpAfter == 0,    // HP归零提示（后续死亡流程由死亡系统处理）
			"burning":        true,            // 本次结算时灼烧确实生效中
		},
	})
}
