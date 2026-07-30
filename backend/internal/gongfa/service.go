// Package gongfa 功法·技能·经验系统业务逻辑层。
// 纯计算函数全部在 model.go（无 DB 依赖，logic_test.go 表驱动验证）；
// 本文件的业务方法（学习/遗忘/打坐/杀怪经验/技能装配）走事务 + FOR UPDATE 行锁，
// 锁序契约见 repository.go 头部注释（计划裁决8：attributes/realm 更新置事务末尾）。
package gongfa

import (
	"database/sql"

	"xunxian/internal/character"
)

// Service 功法技能服务，持有数据库连接（无需 Redis）
type Service struct {
	db *sql.DB
}

// NewService 创建功法技能服务实例
func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

// ═══════════════════════════════════════════
//  功法：学习 / 遗忘 / 列表
// ═══════════════════════════════════════════

// Learn 学习功法（PRD 2.2 + 技术方案3.2）：
//  1. 消耗背包：优先扣1个完整功法；没有完整则碎片≥9自动合成学习（一次扣9）；
//  2. 学习要求校验（PRD 表2-1）：大境界+级内等级+裸值精气神总和；
//  3. 走火入魔判定（PRD 2.5）：功法品级×10 > max(裸精,裸气,裸神) 触发，
//     【不阻断学习】（技术方案伪代码 ApplyZouHuo 后继续），只写 zouhuo_until=NOW()+72h；
//  4. 加成叠加式落地：gongfa_* += bonus（可同时学多本，与神位快照式不同）；
//  5. 事务末尾重算衍生属性（走火期有效精×0.5 由 character.RecalcAndSaveDerived 统一处理）。
func (s *Service) Learn(characterID int64, gongfaID int) (map[string]interface{}, error) {
	def, err := getGongfaDef(s.db, gongfaID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "功法不存在"}
	}
	if err != nil {
		return nil, err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 锁序第1位：char_gongfa（碎片+完整两行一次锁齐）
	items, err := lockGongfaItems(tx, characterID, gongfaID)
	if err != nil {
		return nil, err
	}
	// 锁序第2位：char_gongfa_learned（防并发重复学习）
	learned, err := lockLearned(tx, characterID, gongfaID)
	if err != nil {
		return nil, err
	}
	if learned {
		return nil, ErrAlreadyLearned
	}

	// 学习要求校验：境界等级 + 裸值精气神总和（PRD 表2-1）。
	// 只读不锁：realm/attributes 由本事务末尾的 UPDATE 加锁，读检允许微小并发窗口。
	realm, err := getRealm(tx, characterID)
	if err != nil {
		return nil, err
	}
	nJing, nQi, nShen, err := getNakedAttrs(tx, characterID)
	if err != nil {
		return nil, err
	}
	levelInStage := CharLevel(realm.MinorStage, realm.Segment)
	req := LearnReq{MajorStage: def.ReqMajorStage, Level: def.ReqLevel, AttrTotal: def.ReqAttrTotal}
	if err := CheckLearnReq(req, realm.MajorStage, levelInStage, nJing+nQi+nShen); err != nil {
		return nil, err
	}

	// 走火入魔判定（不阻断学习，只打标记）
	zouhuo := ZouhuoTriggered(def.Tier, nJing, nQi, nShen)

	// 消耗背包：完整优先，其次9碎片自动合成
	var consumed string
	switch {
	case items[ItemComplete] >= 1:
		if err := decGongfaItem(tx, characterID, gongfaID, ItemComplete, 1); err != nil {
			return nil, err
		}
		consumed = "complete"
	case items[ItemFragment] >= FuseNeed:
		if err := decGongfaItem(tx, characterID, gongfaID, ItemFragment, FuseNeed); err != nil {
			return nil, err
		}
		consumed = "fragments"
	default:
		return nil, ErrGongfaNotEnough
	}

	if err := insertLearned(tx, characterID, gongfaID); err != nil {
		return nil, err
	}

	// 事务末尾：attributes 更新（叠加加成 + 走火标记）→ 衍生值重算（计划裁决8）
	if err := applyGongfaBonus(tx, characterID, def.BonusJing, def.BonusQi, def.BonusShen, zouhuo); err != nil {
		return nil, err
	}
	derived, err := character.RecalcAndSaveDerived(tx, characterID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"gongfa":   def,
		"consumed": consumed, // complete=扣了1个完整功法 fragments=9碎片自动合成学习
		"bonus":    map[string]int{"jing": def.BonusJing, "qi": def.BonusQi, "shen": def.BonusShen},
		"zouhuo":   zouhuo, // true=本次学习触发走火入魔（72小时内有效精×0.5）
		"derived":  derived,
	}, nil
}

// Forget 遗忘功法（PRD 2.4 表2-4）：
// 费用按品级：凡法免费 / 灵法30灵石+2孟遗汤 / 仙法80+3 / 道法150+5；
// 遗忘后加成回退（gongfa_* -= bonus），功法本体【不返还】。
func (s *Service) Forget(characterID int64, gongfaID int) (map[string]interface{}, error) {
	def, err := getGongfaDef(s.db, gongfaID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "功法不存在"}
	}
	if err != nil {
		return nil, err
	}
	cost := ForgetCostTable[def.Tier]

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 锁序第2位：char_gongfa_learned（本路径不碰 char_gongfa，锁序仍单调递增）
	learned, err := lockLearned(tx, characterID, gongfaID)
	if err != nil {
		return nil, err
	}
	if !learned {
		return nil, ErrNotLearned
	}

	// 锁序第5位：char_currency 扣灵石（凡法免费跳过）
	if cost.SpiritStone > 0 {
		stone, err := lockSpiritStone(tx, characterID)
		if err != nil {
			return nil, err
		}
		if stone < int64(cost.SpiritStone) {
			return nil, ErrSpiritStoneNotEnough
		}
		if err := decSpiritStone(tx, characterID, int64(cost.SpiritStone)); err != nil {
			return nil, err
		}
	}
	// 锁序第6位：char_mengyi_soup 扣孟遗汤
	if cost.SoupCount > 0 {
		soup, err := lockSoup(tx, characterID)
		if err != nil {
			return nil, err
		}
		if soup < cost.SoupCount {
			return nil, ErrMengyiSoupNotEnough
		}
		if err := decSoup(tx, characterID, cost.SoupCount); err != nil {
			return nil, err
		}
	}

	if err := deleteLearned(tx, characterID, gongfaID); err != nil {
		return nil, err
	}

	// 事务末尾：加成回退（负数叠加）→ 衍生值重算
	if err := applyGongfaBonus(tx, characterID, -def.BonusJing, -def.BonusQi, -def.BonusShen, false); err != nil {
		return nil, err
	}
	derived, err := character.RecalcAndSaveDerived(tx, characterID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"gongfa_id": gongfaID,
		"cost":      map[string]int{"spirit_stone": cost.SpiritStone, "mengyi_soup": cost.SoupCount},
		"derived":   derived,
	}, nil
}

// List 功法总览：全部功法定义 + 角色背包（碎片/完整）+ 已学列表
// + 孟遗汤/灵石 + 走火状态 + 打坐状态（只读，无事务）。
func (s *Service) List(characterID int64) (map[string]interface{}, error) {
	defs, err := listGongfaDefs(s.db)
	if err != nil {
		return nil, err
	}
	bag, err := listGongfaBag(s.db, characterID)
	if err != nil {
		return nil, err
	}
	learnedIDs, err := listLearnedIDs(s.db, characterID)
	if err != nil {
		return nil, err
	}
	learnedSet := map[int]bool{}
	for _, id := range learnedIDs {
		learnedSet[id] = true
	}

	// 每个功法一条：定义 + 持有碎片数/完整数 + 是否已学
	list := make([]map[string]interface{}, 0, len(defs))
	for i := range defs {
		d := defs[i]
		list = append(list, map[string]interface{}{
			"def":       d,
			"fragments": bag[d.ID][ItemFragment],
			"complete":  bag[d.ID][ItemComplete],
			"learned":   learnedSet[d.ID],
			"forget_cost": map[string]int{
				"spirit_stone": ForgetCostTable[d.Tier].SpiritStone,
				"mengyi_soup":  ForgetCostTable[d.Tier].SoupCount,
			},
		})
	}

	soup, err := getSoup(s.db, characterID)
	if err != nil {
		return nil, err
	}
	stone, err := getSpiritStone(s.db, characterID)
	if err != nil {
		return nil, err
	}
	zouhuoActive, zouhuoRemain, err := getZouhuoStatus(s.db, characterID)
	if err != nil {
		return nil, err
	}
	med, err := getMeditation(s.db, characterID)
	if err != nil {
		return nil, err
	}
	// 打坐速率：已学最高品级功法决定（未学任何功法则为0）
	rate := 0
	if _, r, err2 := getBestMeditateRate(s.db, characterID); err2 == nil {
		rate = r
	} else if err2 != sql.ErrNoRows {
		return nil, err2
	}
	todaySec := med.TodaySeconds
	if !med.TodayIsToday {
		todaySec = 0 // 换日后旧额度作废，展示按0
	}

	return map[string]interface{}{
		"gongfa_list":  list,
		"mengyi_soup":  soup,
		"spirit_stone": stone,
		"soup_price":   SoupPrice,
		"zouhuo": map[string]interface{}{
			"active":     zouhuoActive,
			"remain_sec": zouhuoRemain,
		},
		"meditation": map[string]interface{}{
			"status":            med.Status,
			"xp_per_10min":      rate,
			"today_seconds":     todaySec,
			"today_remain_sec":  MeditateDayCap - todaySec,
			"daily_cap_seconds": MeditateDayCap,
		},
	}, nil
}

// ═══════════════════════════════════════════
//  打坐修炼（结算制，与 /fatigue/ 牢结值打坐完全独立）
// ═══════════════════════════════════════════

// MeditateStart 开始打坐（PRD 2.1）：
// 必须已学至少一本功法；每日上限4小时；重复开始报错。
// 【安全区/脱战条件说明】PRD 要求"安全区或脱战状态才能打坐"，当前项目没有
// 场景/战斗状态数据源，无从校验，由前端入口控制，服务端暂不拦截。
func (s *Service) MeditateStart(characterID int64) (map[string]interface{}, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 锁序第2位（只读）：已学功法决定打坐速率，未学任何功法不能打坐
	tier, rate, err := getBestMeditateRate(tx, characterID)
	if err == sql.ErrNoRows {
		return nil, ErrNoLearnedGongfa
	}
	if err != nil {
		return nil, err
	}

	// 锁序第7位：char_meditation
	m, err := lockMeditation(tx, characterID)
	if err != nil {
		return nil, err
	}
	if m.Status == 1 {
		return nil, ErrAlreadyMeditating
	}
	todaySec := m.TodaySeconds
	if !m.TodayIsToday {
		todaySec = 0 // 换日：今日额度重置
	}
	if todaySec >= MeditateDayCap {
		return nil, ErrMeditateDailyCap
	}
	if err := startMeditation(tx, characterID, !m.TodayIsToday); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"status":           1,
		"gongfa_tier":      tier,
		"xp_per_10min":     rate,
		"today_seconds":    todaySec,
		"today_remain_sec": MeditateDayCap - todaySec,
	}, nil
}

// MeditateSettle 打坐结算（PRD 2.1 结算制，无后台Cron）：
// 按 last_tick_at 到当前的完整10分钟单位数发放XP（三属性同额，不乘多修倍率——
// 文档打坐XP表就是最终值），零头留给下次；今日额度不足按额度截断。
func (s *Service) MeditateSettle(characterID int64) (map[string]interface{}, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	data, err := s.settleLocked(tx, characterID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return data, nil
}

// MeditateEnd 结束打坐：先做最后一次结算，再把状态归零
func (s *Service) MeditateEnd(characterID int64) (map[string]interface{}, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	data, err := s.settleLocked(tx, characterID)
	if err != nil {
		return nil, err
	}
	if err := endMeditation(tx, characterID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	data["status"] = 0
	return data, nil
}

// settleLocked 结算内核（事务内复用：Settle 与 End 共用）。
// 锁序：char_gongfa_learned(只读) → char_meditation(锁) →（末尾）character_realm(锁)。
func (s *Service) settleLocked(tx *sql.Tx, characterID int64) (map[string]interface{}, error) {
	// 打坐速率：打坐中途遗忘了全部功法时按0速率结算（时间照常推进，不发XP），
	// 保证 End 永远能正常结束，不会被"无功法"卡死。
	rate := 0
	if _, r, err := getBestMeditateRate(tx, characterID); err == nil {
		rate = r
	} else if err != sql.ErrNoRows {
		return nil, err
	}

	m, err := lockMeditation(tx, characterID)
	if err != nil {
		return nil, err
	}
	if m.Status != 1 {
		return nil, ErrNotMeditating
	}
	resetToday := !m.TodayIsToday
	todaySec := m.TodaySeconds
	if resetToday {
		todaySec = 0 // 换日：额度清零重记（跨日打坐的昨日零头一并作废，简化实现）
	}

	units := MeditateUnits(m.ElapsedSec, todaySec)
	advanceSec := units * MeditateUnitSec
	xp := int64(units) * int64(rate)

	// 推进结算点/累计今日秒数（换日时即使0单位也要把 today_date 拨到今天）
	if units > 0 || resetToday {
		if err := advanceMeditation(tx, characterID, advanceSec, resetToday); err != nil {
			return nil, err
		}
	}

	todayAfter := todaySec + advanceSec
	data := map[string]interface{}{
		"status":           1,
		"units":            units, // 本次结算的完整10分钟单位数
		"xp_gained":        xp,
		"xp_per_10min":     rate,
		"today_seconds":    todayAfter,
		"today_remain_sec": MeditateDayCap - todayAfter,
	}
	if xp <= 0 {
		return data, nil
	}

	// 事务末尾：character_realm 锁行 + 三属性同额入账（计划裁决8）
	r, err := lockRealm(tx, characterID)
	if err != nil {
		return nil, err
	}
	if err := addRealmExp(tx, characterID, xp); err != nil {
		return nil, err
	}
	req := character.GetRealmExpReq(r.MinorStage)
	data["exp_jing"] = r.ExpJing + xp
	data["exp_qi"] = r.ExpQi + xp
	data["exp_shen"] = r.ExpShen + xp
	data["can_upgrade"] = r.ExpJing+xp >= req && r.ExpQi+xp >= req && r.ExpShen+xp >= req
	return data, nil
}

// ═══════════════════════════════════════════
//  杀怪经验（PRD 4.2 文档公式）
// ═══════════════════════════════════════════

// KillExp 杀怪经验入账：
// 最终XP = 类型base × (怪物等级+1)/2 × 阶段累积倍率 × 等级差倍率 × 多修经验倍率 × 伤害占比，
// 向下取整后【三属性同额】写入 exp_jing/exp_qi/exp_shen。
// 【口径说明】文档公式不含悟性加成——与现有 /character/exp/add（悟性%加成）是
// 两套独立入口，互不修改；升级判定沿用现有 GetRealmExpReq 小阶口径，
// 文档的"升级XP"公式（CalcUpgradeExpReq）仅作展示字段返回。
func (s *Service) KillExp(characterID int64, monsterStage, monsterType, monsterLevel int, damageRatio float64) (map[string]interface{}, error) {
	// 参数校验（阶段1-8 / 类型1-5 / 等级1~阶段上限）
	if monsterStage < 1 || monsterStage > 8 {
		return nil, &BizError{Code: 400, Msg: "monster_stage 必须为1-8"}
	}
	if _, ok := MonsterTypeBaseTable[monsterType]; !ok {
		return nil, &BizError{Code: 400, Msg: "monster_type 必须为1-5"}
	}
	if monsterLevel < 1 || monsterLevel > StageMaxLevelTable[monsterStage] {
		return nil, &BizError{Code: 400, Msg: "monster_level 超出该阶段等级范围"}
	}
	if damageRatio == 0 {
		damageRatio = 1.0 // 未传伤害占比按单人独享
	}
	if damageRatio < 0 || damageRatio > 1 {
		return nil, &BizError{Code: 400, Msg: "damage_ratio 必须在(0,1]区间"}
	}

	// 多修经验倍率：修炼五行数 → 1/2/3/4/9（复用 character 包，口径全局唯一）
	elementCount, err := getElementCount(s.db, characterID)
	if err != nil {
		return nil, err
	}
	xiuMult := character.GetExpMultiplier(elementCount)

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 唯一锁表：character_realm（本路径不碰道具/货币，锁序天然合规）
	r, err := lockRealm(tx, characterID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "角色境界数据不存在"}
	}
	if err != nil {
		return nil, err
	}
	playerLv := CharLevel(r.MinorStage, r.Segment)
	diffMult := LevelDiffMult(playerLv - monsterLevel)
	xp := CalcKillXP(monsterStage, monsterType, monsterLevel, playerLv, xiuMult, damageRatio)

	if xp > 0 {
		if err := addRealmExp(tx, characterID, xp); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	req := character.GetRealmExpReq(r.MinorStage)
	return map[string]interface{}{
		"xp_gained":       xp,
		"monster_base_xp": CalcMonsterBaseXP(monsterStage, monsterType, monsterLevel),
		"player_level":    playerLv, // 玩家级内等级（(小阶-1)×10+段格+1）
		"level_diff_mult": diffMult,
		"xiu_mult":        xiuMult,
		"damage_ratio":    damageRatio,
		"exp_jing":        r.ExpJing + xp,
		"exp_qi":          r.ExpQi + xp,
		"exp_shen":        r.ExpShen + xp,
		"can_upgrade":     r.ExpJing+xp >= req && r.ExpQi+xp >= req && r.ExpShen+xp >= req,
		// 文档口径的升级XP（PRD 4.1：神兽base×(等级+1)/2×100），仅展示用
		"upgrade_exp_req_doc": CalcUpgradeExpReq(r.MajorStage, playerLv),
	}, nil
}

// ═══════════════════════════════════════════
//  技能：碎片合成学习 / 遗忘 / 列表 / 装配
// ═══════════════════════════════════════════

// SkillLearn 学习技能（技术方案3.3：9碎片合成1个完整技能，仅学习技 skill_type=2）。
// 与学习功法同一套要求校验（按品级查 LearnReqTable）+ 走火入魔判定
// （技能无属性加成，触发走火只写 zouhuo_until 并重算衍生值）。
func (s *Service) SkillLearn(characterID int64, skillID int) (map[string]interface{}, error) {
	def, err := getSkillDef(s.db, skillID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "技能不存在"}
	}
	if err != nil {
		return nil, err
	}
	if def.SkillType != SkillTypeLearned {
		return nil, &BizError{Code: 400, Msg: "只有学习技支持碎片合成学习"}
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 学习要求 + 走火判定（同功法口径，按裸值；只读不锁）
	realm, err := getRealm(tx, characterID)
	if err != nil {
		return nil, err
	}
	nJing, nQi, nShen, err := getNakedAttrs(tx, characterID)
	if err != nil {
		return nil, err
	}
	if err := CheckLearnReq(LearnReqTable[def.Tier], realm.MajorStage,
		CharLevel(realm.MinorStage, realm.Segment), nJing+nQi+nShen); err != nil {
		return nil, err
	}
	zouhuo := ZouhuoTriggered(def.Tier, nJing, nQi, nShen)

	// 锁序第3位：char_skill（碎片≥9 → 扣9合成1完整）
	items, err := lockSkillItems(tx, characterID, skillID)
	if err != nil {
		return nil, err
	}
	if items[ItemFragment] < FuseNeed {
		return nil, ErrSkillFragmentNotEnough
	}
	if err := decSkillItem(tx, characterID, skillID, ItemFragment, FuseNeed); err != nil {
		return nil, err
	}
	if err := addSkillItem(tx, characterID, skillID, ItemComplete, 1); err != nil {
		return nil, err
	}

	// 事务末尾：触发走火时写标记并重算（有效精×0.5 影响衍生值）
	if zouhuo {
		if err := setZouhuoOnly(tx, characterID); err != nil {
			return nil, err
		}
		if _, err := character.RecalcAndSaveDerived(tx, characterID); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"skill":     def,
		"fragments": items[ItemFragment] - FuseNeed,
		"complete":  items[ItemComplete] + 1,
		"zouhuo":    zouhuo,
	}, nil
}

// SkillForget 遗忘技能（PRD 2.4 遗忘规则对功法/技能通用）：
// 按品级扣费（凡免费/灵30+2/仙80+3/道150+5），完整技能-1（不返还碎片），
// 并从所有技能栏卸下。
func (s *Service) SkillForget(characterID int64, skillID int) (map[string]interface{}, error) {
	def, err := getSkillDef(s.db, skillID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "技能不存在"}
	}
	if err != nil {
		return nil, err
	}
	cost := ForgetCostTable[def.Tier]

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 锁序第3位：char_skill（必须持有≥1完整技能）
	items, err := lockSkillItems(tx, characterID, skillID)
	if err != nil {
		return nil, err
	}
	if items[ItemComplete] < 1 {
		return nil, ErrSkillNotOwned
	}
	// 锁序第4位：char_skill_slots——从所有装配栏位卸下。
	// 必须先于扣费（第5/6位）执行，保证锁获取顺序严格单调；
	// 若后续扣费失败整个事务回滚，卸栏不会真正生效。
	if err := removeSkillFromSlots(tx, characterID, skillID); err != nil {
		return nil, err
	}

	// 锁序第5/6位：扣费（凡术免费跳过）
	if cost.SpiritStone > 0 {
		stone, err := lockSpiritStone(tx, characterID)
		if err != nil {
			return nil, err
		}
		if stone < int64(cost.SpiritStone) {
			return nil, ErrSpiritStoneNotEnough
		}
		if err := decSpiritStone(tx, characterID, int64(cost.SpiritStone)); err != nil {
			return nil, err
		}
	}
	if cost.SoupCount > 0 {
		soup, err := lockSoup(tx, characterID)
		if err != nil {
			return nil, err
		}
		if soup < cost.SoupCount {
			return nil, ErrMengyiSoupNotEnough
		}
		if err := decSoup(tx, characterID, cost.SoupCount); err != nil {
			return nil, err
		}
	}

	// 完整技能-1：该行在上面 lockSkillItems 时已持有行锁，此处纯写不新增锁
	if err := decSkillItem(tx, characterID, skillID, ItemComplete, 1); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"skill_id": skillID,
		"cost":     map[string]int{"spirit_stone": cost.SpiritStone, "mengyi_soup": cost.SoupCount},
		"complete": items[ItemComplete] - 1,
	}, nil
}

// SkillList 技能总览：全部技能定义 + 背包（碎片/完整）+ 装配栏 + 修数（只读）
func (s *Service) SkillList(characterID int64) (map[string]interface{}, error) {
	defs, err := listSkillDefs(s.db)
	if err != nil {
		return nil, err
	}
	bag, err := listSkillBag(s.db, characterID)
	if err != nil {
		return nil, err
	}
	slots, err := listSlots(s.db, characterID)
	if err != nil {
		return nil, err
	}
	elementCount, err := getElementCount(s.db, characterID)
	if err != nil {
		return nil, err
	}

	list := make([]map[string]interface{}, 0, len(defs))
	for i := range defs {
		d := defs[i]
		// 可用性口径：五行技按修数解锁；学习技/被动技按完整持有；普攻恒可用；神位技由神位系统管
		available := false
		switch d.SkillType {
		case SkillTypeWuxing:
			available = elementCount >= WuxingSkillXiuNeed[d.Tier]
		case SkillTypeLearned, SkillTypePassive:
			available = bag[d.ID][ItemComplete] >= 1
		case SkillTypeNormal:
			available = true
		}
		list = append(list, map[string]interface{}{
			"def":       d,
			"fragments": bag[d.ID][ItemFragment],
			"complete":  bag[d.ID][ItemComplete],
			"available": available,
		})
	}
	if slots == nil {
		slots = []SlotRow{}
	}
	return map[string]interface{}{
		"skill_list":       list,
		"slots":            slots,
		"element_count":    elementCount,
		"active_slot_max":  ActiveSlotMax,
		"passive_slot_max": PassiveSlotMax,
	}, nil
}

// SlotSet 技能装配/卸下（PRD 3.1 主动10栏+被动4栏）：
//   - skill_id=0：卸下该栏位；
//   - 主动栏(1-10)只收 五行技/学习技；被动栏(1-4)只收 被动技；
//     普攻与神位技不占栏，拒绝装配；
//   - 五行技按修数校验（凡1/灵2/仙3/道5修）；学习技/被动技需背包持有≥1完整；
//   - 同一技能不能同时占两个栏位。
func (s *Service) SlotSet(characterID int64, slotType, slotIndex, skillID int) (map[string]interface{}, error) {
	// 栏位合法性
	switch slotType {
	case SlotActive:
		if slotIndex < 1 || slotIndex > ActiveSlotMax {
			return nil, ErrSlotInvalid
		}
	case SlotPassive:
		if slotIndex < 1 || slotIndex > PassiveSlotMax {
			return nil, ErrSlotInvalid
		}
	default:
		return nil, ErrSlotInvalid
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 卸下：skill_id=0 直接删行
	if skillID == 0 {
		if err := deleteSlot(tx, characterID, slotType, slotIndex); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return map[string]interface{}{"slot_type": slotType, "slot_index": slotIndex, "skill_id": 0}, nil
	}

	def, err := getSkillDef(tx, skillID)
	if err == sql.ErrNoRows {
		return nil, &BizError{Code: 404, Msg: "技能不存在"}
	}
	if err != nil {
		return nil, err
	}
	// 类型与栏位匹配（普攻/神位技不占栏）
	switch {
	case def.SkillType == SkillTypeNormal || def.SkillType == SkillTypeShenwei:
		return nil, ErrSkillNotEquippable
	case slotType == SlotActive && def.SkillType != SkillTypeWuxing && def.SkillType != SkillTypeLearned:
		return nil, ErrSkillNotEquippable
	case slotType == SlotPassive && def.SkillType != SkillTypePassive:
		return nil, ErrSkillNotEquippable
	}

	// 持有/解锁校验
	if def.SkillType == SkillTypeWuxing {
		elementCount, err := getElementCount(tx, characterID)
		if err != nil {
			return nil, err
		}
		if elementCount < WuxingSkillXiuNeed[def.Tier] {
			return nil, ErrXiuNotEnough
		}
	} else {
		// 锁序第3位：char_skill（防装配同时被遗忘掉）
		items, err := lockSkillItems(tx, characterID, skillID)
		if err != nil {
			return nil, err
		}
		if items[ItemComplete] < 1 {
			return nil, ErrSkillNotOwned
		}
	}

	// 锁序第4位：char_skill_slots（锁全栏，查重复装配）
	slots, err := lockSlots(tx, characterID)
	if err != nil {
		return nil, err
	}
	for _, sl := range slots {
		if sl.SkillID == skillID && !(sl.SlotType == slotType && sl.SlotIndex == slotIndex) {
			return nil, ErrSkillAlreadyEquipped
		}
	}
	if err := upsertSlot(tx, characterID, slotType, slotIndex, skillID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"slot_type":  slotType,
		"slot_index": slotIndex,
		"skill_id":   skillID,
		"skill_name": def.Name,
	}, nil
}
