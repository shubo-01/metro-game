// combat_v5.go 战斗操作层迭代（V5）新增：技能施放服务端校验 + 护盾脱战懒结算 + 硬直/控制时长下发。
// 依据《战斗操作层与地图系统和轮回夺舍系统PRD》战斗操作层章节。
//
// 本文件新增路由（在 cmd/character-service/main.go 注册）：
//   POST /combat/cast           技能施放校验（CD+灵力服务端权威校验与扣减）
//   POST /combat/shield/settle  护盾脱战恢复懒结算（查询/受击时结算，无后台定时器）
//
// 【结算制说明】护盾恢复不开定时器：
//   任何一次进入战斗（/combat/skill 攻防双方、天雷落雷）都会刷新
//   character_attributes.last_combat_time = NOW()；
//   前端在需要展示/使用护盾时调 /combat/shield/settle，服务端按
//   可回收秒数 = NOW() - last_combat_time - 5秒脱战延迟
//   一次性补算恢复量，并把锚点推进到 NOW()-5秒防止重复计费。
//   （与 v4 功法打坐"查询即结算"完全同风格）
package character

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// ─────────────────────────────────────
//  硬直/控制效果数值（PRD 战斗操作层：受击反馈表）
// ─────────────────────────────────────

// 受击来源分档（决定基础硬直时长）
const (
	HitSourceNormal = 1 // 普攻/普通怪攻击：硬直0.2秒
	HitSourceElite  = 2 // 精英怪攻击：硬直0.3秒
	HitSourceBoss   = 3 // Boss技能：硬直0.5秒
)

// 硬直基础时长（秒），重击/暴击额外 +0.1 秒
const (
	StaggerNormalS = 0.2 // 普攻硬直
	StaggerEliteS  = 0.3 // 精英怪硬直
	StaggerBossS   = 0.5 // Boss技硬直
	StaggerCritAdd = 0.1 // 重击/暴击追加硬直
)

// 控制效果类型（PRD 受击反馈表）
const (
	ControlKnockback = 1 // 击退：0.5秒 + 位移2-3米
	ControlKnockdown = 2 // 击倒：倒地1秒 + 起身0.5秒
	ControlStun      = 3 // 眩晕：1-3秒
	ControlRoot      = 4 // 定身：1-3秒（可施法不可移动）
	ControlPetrify   = 5 // 石化：2-3秒（期间护盾恢复×3）
)

// ControlSpec 控制效果规格（时长范围与附带参数），供前端表现层直接使用
type ControlSpec struct {
	Type      int     `json:"type"`        // 控制类型（上面的 Control* 常量）
	Name      string  `json:"name"`        // 中文名
	MinS      float64 `json:"min_s"`       // 最短持续秒数
	MaxS      float64 `json:"max_s"`       // 最长持续秒数
	ExtraDesc string  `json:"extra_desc"`  // 附带效果说明
	ExtraVal  float64 `json:"extra_value"` // 附带数值（击退距离米/起身秒/护盾恢复倍率）
}

// controlTable 控制效果全表（PRD 原文数值，只读常量表）
var controlTable = map[int]ControlSpec{
	ControlKnockback: {ControlKnockback, "击退", 0.5, 0.5, "位移2-3米", 3.0},
	ControlKnockdown: {ControlKnockdown, "击倒", 1.0, 1.0, "起身耗时0.5秒", 0.5},
	ControlStun:      {ControlStun, "眩晕", 1.0, 3.0, "无法行动", 0},
	ControlRoot:      {ControlRoot, "定身", 1.0, 3.0, "可施法不可移动", 0},
	ControlPetrify:   {ControlPetrify, "石化", 2.0, 3.0, "期间护盾恢复速度×3", 3.0},
}

// CalcHitStagger 计算受击硬直时长（纯函数，可单测）。
// sourceType：受击来源分档（1普攻0.2s/2精英0.3s/3Boss技0.5s，非法值兜底按普攻）；
// isCrit：重击/暴击追加 +0.1 秒。
func CalcHitStagger(sourceType int, isCrit bool) float64 {
	var base float64
	switch sourceType {
	case HitSourceElite:
		base = StaggerEliteS
	case HitSourceBoss:
		base = StaggerBossS
	default:
		base = StaggerNormalS // 普攻/未知来源兜底
	}
	if isCrit {
		base += StaggerCritAdd
	}
	return base
}

// GetControlSpec 查询控制效果规格（纯函数）。类型非法返回 ok=false。
func GetControlSpec(controlType int) (ControlSpec, bool) {
	spec, ok := controlTable[controlType]
	return spec, ok
}

// ─────────────────────────────────────
//  护盾脱战懒结算（纯函数部分）
// ─────────────────────────────────────

// CalcShieldRecover 计算一次懒结算可恢复的护盾量（纯函数，可单测）。
// cur/max：结算前护盾当前值/上限；regenPerSec：每秒恢复量=(精+气+神)×2（CalcShieldRegen）；
// elapsedS：可回收秒数（已扣除5秒脱战延迟，调用方算好传入，负数按0处理）。
// 返回：结算后护盾值、实际恢复量（受上限截断）。
func CalcShieldRecover(cur, max, regenPerSec, elapsedS int64) (newShield, recovered int64) {
	if elapsedS <= 0 || regenPerSec <= 0 || cur >= max {
		return cur, 0 // 还在战斗延迟内/无恢复能力/已满盾：不恢复
	}
	recovered = regenPerSec * elapsedS
	newShield = cur + recovered
	if newShield > max {
		recovered = max - cur // 满盾截断，只记实际补进去的量
		newShield = max
	}
	return newShield, recovered
}

// ═══════════════════════════════════════════
//  POST /combat/cast  技能施放校验（CD+灵力服务端权威）
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "skill_id":7}
// 职责：只做"能不能放"的权威判定与资源扣减（CD进入冷却 + 灵力扣除），
//       伤害结算仍走既有 POST /combat/skill（本接口通过后前端再调它）。
// 判定顺序：技能存在 → CD未冷却(6301) → 灵力不足(6302) → 扣灵力+记CD → 返回。
// CD 存 Redis：key = skill:cd:{character_id}:{skill_id}，TTL = cooldown_s，
// 键存在即冷却中，天然过期无需清理（普攻 cooldown_s=0 无CD不写键）。
func (s *Service) HandleCombatCast(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		SkillID     int   `json:"skill_id"` // skill_def.id（1=普攻 无CD无消耗）
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if req.CharacterID <= 0 || req.SkillID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 或 skill_id 无效"})
		return
	}

	// 归属校验：只能用自己的角色放技能（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 1. 读技能定义（v4 skill_def：cooldown_s 冷却秒数 / mp_cost 灵力消耗）
	var skillName string
	var cooldownS, mpCost int
	err := s.db.QueryRow("SELECT name, cooldown_s, mp_cost FROM skill_def WHERE id=?", req.SkillID).
		Scan(&skillName, &cooldownS, &mpCost)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "技能不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询技能定义失败"})
		return
	}

	// 2. CD 校验：Redis 键存在即冷却中（返回剩余秒数供前端转圈）
	cdKey := fmt.Sprintf("skill:cd:%d:%d", req.CharacterID, req.SkillID)
	if cooldownS > 0 {
		cooling, err := s.rdb.Exists(cdKey)
		if err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询技能冷却失败"})
			return
		}
		if cooling {
			remain, _ := s.rdb.TTL(cdKey) // TTL失败不阻断，剩余按0展示
			writeJSON(w, 200, APIResponse{Code: 6301, Msg: fmt.Sprintf("技能「%s」冷却中", skillName),
				Data: map[string]interface{}{"cd_remain_s": int(remain.Seconds())}})
			return
		}
	}

	// 3. 灵力校验与扣减（事务+FOR UPDATE：防并发施法把灵力扣成负数）
	var mpAfter int
	if mpCost > 0 {
		tx, err := s.db.Begin()
		if err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
			return
		}
		defer tx.Rollback()

		var mpCur int
		err = tx.QueryRow("SELECT mp_current FROM character_attributes WHERE character_id=? FOR UPDATE", req.CharacterID).
			Scan(&mpCur)
		if err != nil {
			writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色属性不存在"})
			return
		}
		if mpCur < mpCost {
			writeJSON(w, 200, APIResponse{Code: 6302, Msg: "灵力不足",
				Data: map[string]interface{}{"mp_current": mpCur, "mp_cost": mpCost}})
			return
		}
		mpAfter = mpCur - mpCost
		if _, err = tx.Exec("UPDATE character_attributes SET mp_current=? WHERE character_id=?",
			mpAfter, req.CharacterID); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "扣减灵力失败"})
			return
		}
		if err = tx.Commit(); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
			return
		}
	} else {
		// 普攻等零消耗技能：不开事务，直接读当前灵力用于返回
		s.db.QueryRow("SELECT mp_current FROM character_attributes WHERE character_id=?", req.CharacterID).Scan(&mpAfter)
	}

	// 4. 记 CD（灵力扣成功后才进入冷却）——受控 fail-open（评审修复）：
	//    Redis 写失败时【不回滚灵力、不报500】（宁可少收一次CD也不卡玩家），
	//    但必须显式检查错误：打日志方便运维排查（本机 Memurai 环境曾出现 Set 静默失败
	//    导致技能完全无CD的问题），并在响应里带 cd_record_failed=true 让前端/测试可感知。
	cdRecordFailed := false
	if cooldownS > 0 {
		if err := s.rdb.Set(cdKey, "1", time.Duration(cooldownS)*time.Second); err != nil {
			cdRecordFailed = true
			log.Printf("[combat/cast] 技能CD写入Redis失败（fail-open放行）: character_id=%d skill_id=%d err=%v",
				req.CharacterID, req.SkillID, err)
		}
	}

	// 组装响应 Data（cd_record_failed 仅在写CD失败时附加，正常情况不出现该字段）
	data := map[string]interface{}{
		"skill_id":   req.SkillID,
		"skill_name": skillName,
		"mp_cost":    mpCost,    // 本次消耗灵力
		"mp_current": mpAfter,   // 扣减后剩余灵力
		"cooldown_s": cooldownS, // 进入的冷却秒数（前端据此转圈）
	}
	if cdRecordFailed {
		data["cd_record_failed"] = true // CD记录失败标记（受控fail-open，本次施放未进入服务端冷却）
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  fmt.Sprintf("技能「%s」施放校验通过", skillName),
		Data: data,
	})
}

// ═══════════════════════════════════════════
//  POST /combat/shield/settle  护盾脱战恢复懒结算
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// PRD：脱战5秒后护盾开始恢复，速度 = (精+气+神)×2 / 秒。
// 懒结算算法（见文件头注释）：
//   可回收秒数 = NOW() - last_combat_time - 5秒；≤0 说明还在战斗/延迟内，不恢复。
//   last_combat_time 为 NULL（从未战斗）视为已充分脱战 → 直接补满。
//   结算成功后锚点推进到 NOW()-5秒：下次结算从零起算，杜绝同一段时间重复计费。
func (s *Service) HandleShieldSettle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}

	// 归属校验：只能结算自己角色的护盾
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 事务 + FOR UPDATE：结算期间锁属性行，防止与并发受击互相覆盖护盾值
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	var jing, qi, shen int
	var shieldCur, shieldMax int64
	var lastCombat sql.NullTime
	err = tx.QueryRow(
		`SELECT jing, qi, shen, shield_current, shield_max, last_combat_time
		 FROM character_attributes WHERE character_id=? FOR UPDATE`, req.CharacterID,
	).Scan(&jing, &qi, &shen, &shieldCur, &shieldMax, &lastCombat)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "角色属性不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询属性失败"})
		return
	}

	now := time.Now()
	regen := int64(CalcShieldRegen(jing, qi, shen)) // 每秒恢复 = (精+气+神)×2
	var newShield, recovered int64
	inCombat := false // 是否仍在战斗延迟内（前端据此决定是否轮询）

	if !lastCombat.Valid {
		// 从未战斗过：视为已充分脱战，直接补满（省去无意义的秒数换算）
		newShield, recovered = shieldMax, shieldMax-shieldCur
		if recovered < 0 {
			newShield, recovered = shieldCur, 0
		}
	} else {
		// 可回收秒数 = 脱战总时长 - 5秒延迟（向下取整，不足1秒不计）
		elapsedS := int64(now.Sub(lastCombat.Time).Seconds()) - int64(ShieldRecoverDelay)
		if elapsedS <= 0 {
			inCombat = true
		}
		newShield, recovered = CalcShieldRecover(shieldCur, shieldMax, regen, elapsedS)
	}

	if recovered > 0 {
		// 落库新护盾值，同时把锚点推进到 NOW()-5秒：
		// 已计费的时间段作废，下次结算只算增量（防重复计费的核心）
		anchor := now.Add(-time.Duration(ShieldRecoverDelay) * time.Second)
		if _, err = tx.Exec(
			"UPDATE character_attributes SET shield_current=?, last_combat_time=? WHERE character_id=?",
			newShield, anchor, req.CharacterID); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "护盾结算落库失败"})
			return
		}
	}
	if err = tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "护盾结算完成",
		Data: map[string]interface{}{
			"shield_current": newShield, // 结算后护盾值
			"shield_max":     shieldMax,
			"recovered":      recovered,          // 本次补回的护盾量
			"shield_regen":   regen,              // 每秒恢复速度
			"in_combat":      inCombat,           // true=还在战斗/5秒延迟内
			"recover_delay":  ShieldRecoverDelay, // 脱战延迟秒数（固定5）
		},
	})
}
