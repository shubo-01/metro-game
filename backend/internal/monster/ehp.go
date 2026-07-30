// EHP 查表接口：GET /monster/ehp（《怪物血量玩家攻击力对比表.xlsx》表5-1）。
// 【零改动声明】本文件只新增查表接口，monster_entity 的 BaseHP 递推模板、
// 现有怪物生成/受击计算全部零改动。
//
// 公式（xlsx 已逐行验证40行）：
//   玩家道术攻击力 = 800 × 4.0 × 气占比 × 多修伤害倍率
//     其中 气占比 = 气 ÷ 三维均值；同级玩家三维总点 = 3+(等级-1)×2，
//     按"气优先"极端加点：气 = 总点-2（精/神各1），均值 = 总点/3
//   EHP = 玩家道术攻击力(未取整) × EHP倍数（monster_ehp_config 查表）
// 取整规则（xlsx 反推确认）：EHP 用【未取整】攻击力相乘后再四舍五入，
// 攻击力展示值单独四舍五入（例：Lv.25 攻击展示9,224 但 EHP=46,118≠9224×5）。
package monster

import (
	"database/sql"
	"math"
	"net/http"
)

// 道术攻击基础参数（xlsx 表5-1 表头注明：技能基数800、道术倍率4.0）
const (
	ehpSkillBase = 800.0 // 技能基数（道术）
	ehpDaoMult   = 4.0   // 道术倍率
)

// ehpXiuDamageMult 多修伤害倍率（PRD 3.2：1修1/2修3/3修6/4修10/5修15）
var ehpXiuDamageMult = map[int]float64{1: 1, 2: 3, 3: 6, 4: 10, 5: 15}

// CalcPlayerDaoAttack 同级玩家道术攻击力（未取整，xlsx 表5-1 口径）：
// 总点=3+(等级-1)×2 → 气=总点-2 → 气占比=气÷(总点/3) → 攻击=800×4×占比×多修倍率。
// 锚点：Lv.1 1修=3200；Lv.50 1修≈9409.9(展示9410)；神魔Lv.250 1修≈9561.7(展示9562)。
// 参数非法（等级<1或修数非1-5）返回 0。
func CalcPlayerDaoAttack(level, xiuCount int) float64 {
	if level < 1 {
		return 0
	}
	mult, ok := ehpXiuDamageMult[xiuCount]
	if !ok {
		return 0
	}
	total := float64(3 + (level-1)*2)
	qi := total - 2             // 气优先加点：精/神各留1点
	ratio := qi / (total / 3.0) // 气占三维均值的比例
	return ehpSkillBase * ehpDaoMult * ratio * mult
}

// CalcEhp 怪物EHP = 未取整攻击力 × EHP倍数，四舍五入（xlsx 取整规则）
func CalcEhp(attackFloat float64, ehpMultiplier int) int64 {
	return int64(math.Round(attackFloat * float64(ehpMultiplier)))
}

// ═══════════════════════════════════════════
//  GET /monster/ehp?stage=&monster_type=&level=  EHP查表
// ═══════════════════════════════════════════
//
// 参数：stage 怪物阶段1-8；monster_type 类型1-5（普通/精英/Boss/妖/神兽）；
//
//	level 怪物等级（同级玩家攻击力按此等级计算）
//
// 返回：EHP倍数、对应修数、同级玩家道术攻击力（展示值四舍五入）、EHP
func (s *Service) HandleEhp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "只支持GET"})
		return
	}
	stage := queryInt(r, "stage")
	monsterType := queryInt(r, "monster_type")
	level := queryInt(r, "level")
	if stage < 1 || stage > 8 || monsterType < 1 || monsterType > 5 || level < 1 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误：需要 stage(1-8)/monster_type(1-5)/level(≥1)"})
		return
	}

	// 查 EHP 倍数配置（v4 迁移种子40行：基础5/8/10/15/20，每阶+10）
	var xiuRequired, ehpMultiplier int
	err := s.db.QueryRow(
		"SELECT xiu_required, ehp_multiplier FROM monster_ehp_config WHERE stage=? AND monster_type=?",
		stage, monsterType).Scan(&xiuRequired, &ehpMultiplier)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, APIResponse{Code: 404, Msg: "该阶段/类型的EHP配置不存在"})
		return
	}
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询EHP配置失败"})
		return
	}

	attackFloat := CalcPlayerDaoAttack(level, xiuRequired)
	writeJSON(w, 200, APIResponse{
		Code: 0,
		Msg:  "查询成功",
		Data: map[string]interface{}{
			"stage":             stage,
			"monster_type":      monsterType,
			"level":             level,
			"xiu_required":      xiuRequired,                    // EHP按几修玩家攻击力折算
			"ehp_multiplier":    ehpMultiplier,                  // EHP倍数（查表）
			"player_dao_attack": int64(math.Round(attackFloat)), // 同级玩家道术攻击力（展示值）
			"ehp":               CalcEhp(attackFloat, ehpMultiplier),
		},
	})
}
