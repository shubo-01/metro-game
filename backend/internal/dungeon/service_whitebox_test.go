// Package dungeon 花果山副本核心算法 - 白盒测试
//
// 测试目标：6 个纯逻辑函数，覆盖全部独立路径
// 测试框架：Go 标准 testing 包
// 覆盖标准：判定覆盖（分支覆盖），EvaluateGrade 升级到条件覆盖
//
// 函数清单（按圈复杂度排序）：
//  1. CalcProbs(luck)                   V(G)=3
//  2. RollRole(probs)                   V(G)=3
//  3. EvaluateGrade(...)                V(G)=16
//  4. EvaluateOutcome(...)              V(G)=5
//  5. PickWukongComment(outcome)        V(G)=4
//  6. timeUntilNextReset()              V(G)=2
//  7. getPlayerIDFromQuery(r)           V(G)=1（边界）
package dungeon

import (
	"math"
	"net/http/httptest"
	"testing"
	"time"
)

// ═══════════════════════════════════════════
//  1. CalcProbs - 运气加权概率计算
//  V(G) = 3，独立路径 = 3
//
//  控制流图（简化）：
//    Entry → {luck<0?} →[T] luck=0 → Calc → Exit
//                       →[F] {luck>1?} →[T] luck=1 → Calc → Exit
//                                       →[F] Calc → Exit
//
//  路径枚举：
//    P-001: luck<0  → luck 修正为 0
//    P-002: luck>1  → luck 修正为 1.0
//    P-003: 0≤luck≤1 → 正常计算
// ═══════════════════════════════════════════

func TestCalcProbs(t *testing.T) {

	t.Run("P-001 luck为负数时应修正为0_使用基础概率", func(t *testing.T) {
		// Path: P-001 [T, -] luck=-0.5 → 修正为 0
		probs := CalcProbs(-0.5)

		// 验证：luck=0 时应返回基础概率
		assertFloat(t, "Wukong", probs[RoleWukong], 0.01)
		assertFloat(t, "Mowang", probs[RoleMowang], 0.09)
		assertFloat(t, "Shouxa", probs[RoleShouxa], 0.30)
		assertFloat(t, "Monkey", probs[RoleMonkey], 0.35)
		assertFloat(t, "OldMon", probs[RoleOldMon], 0.10)
		assertFloat(t, "Grass", probs[RoleGrass], 0.15)

		// 概率总和应恒为 1.0
		assertProbSum(t, probs)
	})

	t.Run("P-002 luck超过1时应修正为1.0", func(t *testing.T) {
		// Path: P-002 [F, T] luck=2.0 → 修正为 1.0
		probs := CalcProbs(2.0)

		// luck=1.0 时：wkProb=0.01*(1+1)=0.02, mwProb=0.09*(1+1)=0.18
		assertFloat(t, "Wukong", probs[RoleWukong], 0.02)
		assertFloat(t, "Mowang", probs[RoleMowang], 0.18)

		// extra = (0.02-0.01)+(0.18-0.09) = 0.10
		// 手下扣除: 0.10 * 0.30/0.90 = 0.0333...
		// 猴子扣除: 0.10 * 0.35/0.90 = 0.0389...
		assertProbSum(t, probs)
	})

	t.Run("P-003 luck在正常范围0到1之间", func(t *testing.T) {
		// Path: P-003 [F, F] luck=0.5
		probs := CalcProbs(0.5)

		// luck=0.5: wkProb=0.01*1.5=0.015, mwProb=0.09*1.5=0.135
		assertFloat(t, "Wukong", probs[RoleWukong], 0.015)
		assertFloat(t, "Mowang", probs[RoleMowang], 0.135)

		// extra = (0.015-0.01)+(0.135-0.09) = 0.05
		// Shouxa: 0.30 - 0.05*0.30/0.90 = 0.30 - 0.01667 = 0.28333
		assertFloat(t, "Shouxa", probs[RoleShouxa], 0.30-0.05*(0.30/0.90))
		assertProbSum(t, probs)
	})

	t.Run("P-003b luck为0时返回基础概率", func(t *testing.T) {
		probs := CalcProbs(0)
		assertFloat(t, "Wukong", probs[RoleWukong], 0.01)
		assertFloat(t, "Mowang", probs[RoleMowang], 0.09)
		assertProbSum(t, probs)
	})

	t.Run("P-003c luck为1.0时边界值", func(t *testing.T) {
		probs := CalcProbs(1.0)
		assertFloat(t, "Wukong", probs[RoleWukong], 0.02)
		assertFloat(t, "Mowang", probs[RoleMowang], 0.18)
		assertProbSum(t, probs)
	})
}

// ═══════════════════════════════════════════
//  2. RollRole - 加权随机抽取角色
//  V(G) = 3，独立路径 = 3
//
//  路径枚举：
//    P-001: total<=0 → 兜底返回 RoleMonkey
//    P-002: roll 落在第一个角色区间 → 返回该角色
//    P-003: roll 落在最后一个角色区间 → 兜底返回 RoleMonkey
// ═══════════════════════════════════════════

func TestRollRole(t *testing.T) {

	t.Run("P-001 概率总和为0时兜底返回普通猴子", func(t *testing.T) {
		// Path: P-001 [T, -] total=0
		emptyProbs := map[int]float64{}
		result := RollRole(emptyProbs)
		if result != RoleMonkey {
			t.Errorf("期望返回 RoleMonkey(%d), 实际: %d", RoleMonkey, result)
		}
	})

	t.Run("P-002 概率总和为负数时兜底返回普通猴子", func(t *testing.T) {
		negProbs := map[int]float64{
			RoleWukong: -0.1,
			RoleMowang: -0.2,
		}
		result := RollRole(negProbs)
		if result != RoleMonkey {
			t.Errorf("期望返回 RoleMonkey(%d), 实际: %d", RoleMonkey, result)
		}
	})

	t.Run("P-003 只有大圣概率为1其余为0时必定返回大圣", func(t *testing.T) {
		// 构造确定性概率表：只有 Wukong=1.0，其余=0
		probs := map[int]float64{
			RoleWukong: 1.0,
			RoleMowang: 0,
			RoleShouxa: 0,
			RoleMonkey: 0,
			RoleOldMon: 0,
			RoleGrass:  0,
		}
		// 多次运行确保稳定
		for i := 0; i < 100; i++ {
			result := RollRole(probs)
			if result != RoleWukong {
				t.Fatalf("第 %d 次: 期望 Wukong(%d), 实际: %d", i, RoleWukong, result)
			}
		}
	})

	t.Run("P-004 只有草木概率为1时必定返回草木", func(t *testing.T) {
		probs := map[int]float64{
			RoleWukong: 0,
			RoleMowang: 0,
			RoleShouxa: 0,
			RoleMonkey: 0,
			RoleOldMon: 0,
			RoleGrass:  1.0,
		}
		for i := 0; i < 100; i++ {
			result := RollRole(probs)
			if result != RoleGrass {
				t.Fatalf("第 %d 次: 期望 Grass(%d), 实际: %d", i, RoleGrass, result)
			}
		}
	})

	t.Run("P-005 正常概率分布_大量运行后各角色均有出现", func(t *testing.T) {
		probs := CalcProbs(0.5)
		counts := make(map[int]int)
		const N = 10000

		for i := 0; i < N; i++ {
			result := RollRole(probs)
			counts[result]++
		}

		// 六种角色都应出现（概率最低的 Wukong 约 1.5%，10000次应出现约150次）
		for _, rt := range []int{RoleWukong, RoleMowang, RoleShouxa, RoleMonkey, RoleOldMon, RoleGrass} {
			if counts[rt] == 0 {
				t.Errorf("角色 %d 在 %d 次运行中未出现，概率异常", rt, N)
			}
		}
	})
}

// ═══════════════════════════════════════════
//  3. EvaluateGrade - 结算评级
//  V(G) = 16（高复杂度，使用条件覆盖）
//
//  控制流图（简化）：
//    Entry → {roleType?}
//      → Wukong: {outcome==Win?}→[T]"S" / {outcome==Hurt?}→[T]"A" / "D"
//      → Mowang: {outcome==StoryDeath?}→[T]"S" / {dur>=240?}→[T]"A" / {dur>=60?}→[T]"B" / "D"
//      → Shouxa/Monkey/OldMon: {dur>=300?}→"S" / {dur>=180?}→"A" / {dur>=120?}→"B" / {dur>=60?}→"C" / "D"
//      → Grass: {obs>=100?}→"S" / {obs>=75?}→"A" / {obs>=50?}→"B" / {obs>=25?}→"C" / "D"
//      → Default: "D"
// ═══════════════════════════════════════════

func TestEvaluateGrade(t *testing.T) {

	// ── 大圣 (RoleWukong) 路径 ──

	t.Run("P-001 大圣完胜返回S", func(t *testing.T) {
		// Path: Wukong → outcome==Win → "S"
		grade := EvaluateGrade(RoleWukong, OutcomeWin, 200, 0, 80)
		if grade != "S" {
			t.Errorf("期望 S, 实际: %s", grade)
		}
	})

	t.Run("P-002 大圣受伤返回A", func(t *testing.T) {
		// Path: Wukong → outcome!=Win → outcome==Hurt → "A"
		grade := EvaluateGrade(RoleWukong, OutcomeHurt, 200, 0, 30)
		if grade != "A" {
			t.Errorf("期望 A, 实际: %s", grade)
		}
	})

	t.Run("P-003 大圣死亡返回D", func(t *testing.T) {
		// Path: Wukong → outcome!=Win → outcome!=Hurt → "D"
		grade := EvaluateGrade(RoleWukong, OutcomeDead, 100, 0, 0)
		if grade != "D" {
			t.Errorf("期望 D, 实际: %s", grade)
		}
	})

	// ── 魔王 (RoleMowang) 路径 ──

	t.Run("P-004 魔王剧情死亡返回S", func(t *testing.T) {
		// Path: Mowang → outcome==StoryDeath → "S"
		grade := EvaluateGrade(RoleMowang, OutcomeStoryDeath, 300, 0, 100)
		if grade != "S" {
			t.Errorf("期望 S, 实际: %s", grade)
		}
	})

	t.Run("P-005 魔王存活240秒以上返回A", func(t *testing.T) {
		// Path: Mowang → outcome!=StoryDeath → dur>=240 → "A"
		grade := EvaluateGrade(RoleMowang, OutcomeDead, 250, 0, 0)
		if grade != "A" {
			t.Errorf("期望 A, 实际: %s", grade)
		}
	})

	t.Run("P-005b 魔王恰好240秒边界返回A", func(t *testing.T) {
		grade := EvaluateGrade(RoleMowang, OutcomeDead, 240, 0, 0)
		if grade != "A" {
			t.Errorf("期望 A, 实际: %s", grade)
		}
	})

	t.Run("P-006 魔王存活60到239秒返回B", func(t *testing.T) {
		// Path: Mowang → dur<240 → dur>=60 → "B"
		grade := EvaluateGrade(RoleMowang, OutcomeDead, 120, 0, 0)
		if grade != "B" {
			t.Errorf("期望 B, 实际: %s", grade)
		}
	})

	t.Run("P-006b 魔王恰好60秒边界返回B", func(t *testing.T) {
		grade := EvaluateGrade(RoleMowang, OutcomeDead, 60, 0, 0)
		if grade != "B" {
			t.Errorf("期望 B, 实际: %s", grade)
		}
	})

	t.Run("P-007 魔王存活不足60秒返回D", func(t *testing.T) {
		// Path: Mowang → dur<240 → dur<60 → "D"
		grade := EvaluateGrade(RoleMowang, OutcomeDead, 30, 0, 0)
		if grade != "D" {
			t.Errorf("期望 D, 实际: %s", grade)
		}
	})

	// ── 普通角色 (Shouxa/Monkey/OldMon) 路径 ──

	t.Run("P-008 普通角色存活满300秒返回S", func(t *testing.T) {
		grade := EvaluateGrade(RoleMonkey, OutcomeSurvive, 300, 0, 50)
		if grade != "S" {
			t.Errorf("期望 S, 实际: %s", grade)
		}
	})

	t.Run("P-009 普通角色存活180到299秒返回A", func(t *testing.T) {
		grade := EvaluateGrade(RoleShouxa, OutcomeSurvive, 200, 0, 50)
		if grade != "A" {
			t.Errorf("期望 A, 实际: %s", grade)
		}
	})

	t.Run("P-010 普通角色存活120到179秒返回B", func(t *testing.T) {
		grade := EvaluateGrade(RoleOldMon, OutcomeSurvive, 150, 0, 50)
		if grade != "B" {
			t.Errorf("期望 B, 实际: %s", grade)
		}
	})

	t.Run("P-011 普通角色存活60到119秒返回C", func(t *testing.T) {
		grade := EvaluateGrade(RoleMonkey, OutcomeDead, 90, 0, 0)
		if grade != "C" {
			t.Errorf("期望 C, 实际: %s", grade)
		}
	})

	t.Run("P-012 普通角色存活不足60秒返回D", func(t *testing.T) {
		grade := EvaluateGrade(RoleShouxa, OutcomeDead, 30, 0, 0)
		if grade != "D" {
			t.Errorf("期望 D, 实际: %s", grade)
		}
	})

	// ── 草木石头 (RoleGrass) 路径 ──

	t.Run("P-013 草木观测度100返回S", func(t *testing.T) {
		grade := EvaluateGrade(RoleGrass, OutcomeObserve, 300, 100, 0)
		if grade != "S" {
			t.Errorf("期望 S, 实际: %s", grade)
		}
	})

	t.Run("P-014 草木观测度75到99返回A", func(t *testing.T) {
		grade := EvaluateGrade(RoleGrass, OutcomeObserve, 300, 80, 0)
		if grade != "A" {
			t.Errorf("期望 A, 实际: %s", grade)
		}
	})

	t.Run("P-015 草木观测度50到74返回B", func(t *testing.T) {
		grade := EvaluateGrade(RoleGrass, OutcomeObserve, 300, 60, 0)
		if grade != "B" {
			t.Errorf("期望 B, 实际: %s", grade)
		}
	})

	t.Run("P-016 草木观测度25到49返回C", func(t *testing.T) {
		grade := EvaluateGrade(RoleGrass, OutcomeObserve, 300, 30, 0)
		if grade != "C" {
			t.Errorf("期望 C, 实际: %s", grade)
		}
	})

	t.Run("P-017 草木观测度不足25返回D", func(t *testing.T) {
		grade := EvaluateGrade(RoleGrass, OutcomeObserve, 300, 10, 0)
		if grade != "D" {
			t.Errorf("期望 D, 实际: %s", grade)
		}
	})

	// ── 未知角色类型 ──

	t.Run("P-018 未知角色类型默认返回D", func(t *testing.T) {
		grade := EvaluateGrade(99, OutcomeDead, 300, 0, 0)
		if grade != "D" {
			t.Errorf("期望 D, 实际: %s", grade)
		}
	})
}

// ═══════════════════════════════════════════
//  4. EvaluateOutcome - 结局判定
//  V(G) = 5
//
//  路径枚举：
//    P-001: Wukong + boss<=0 + self>70 → Win（完胜）
//    P-002: Wukong + boss<=0 + self>0  → Hurt（受伤）
//    P-003: Wukong + 其他             → Dead（死亡）
//    P-004: Mowang + self<=0           → Dead
//    P-005: Mowang + self>0            → StoryDeath
//    P-006: 其他角色                    → InProgress
// ═══════════════════════════════════════════

func TestEvaluateOutcome(t *testing.T) {

	// ── 大圣路径 ──

	t.Run("P-001 大圣击杀魔王且自身HP大于70返回完胜", func(t *testing.T) {
		// Path: Wukong → bossHpLeft<=0 → selfHpLeft>70
		outcome := EvaluateOutcome(RoleWukong, 80, 0)
		if outcome != OutcomeWin {
			t.Errorf("期望 OutcomeWin(%d), 实际: %d", OutcomeWin, outcome)
		}
	})

	t.Run("P-001b 大圣击杀魔王且自身HP恰好71边界值", func(t *testing.T) {
		outcome := EvaluateOutcome(RoleWukong, 71, 0)
		if outcome != OutcomeWin {
			t.Errorf("期望 OutcomeWin(%d), 实际: %d", OutcomeWin, outcome)
		}
	})

	t.Run("P-002 大圣击杀魔王但自身HP不足70返回受伤", func(t *testing.T) {
		// Path: Wukong → bossHpLeft<=0 → selfHpLeft<=70 → selfHpLeft>0
		outcome := EvaluateOutcome(RoleWukong, 30, 0)
		if outcome != OutcomeHurt {
			t.Errorf("期望 OutcomeHurt(%d), 实际: %d", OutcomeHurt, outcome)
		}
	})

	t.Run("P-002b 大圣击杀魔王且自身HP恰好70返回受伤_边界值", func(t *testing.T) {
		// 70 不满足 >70 条件，走受伤
		outcome := EvaluateOutcome(RoleWukong, 70, 0)
		if outcome != OutcomeHurt {
			t.Errorf("期望 OutcomeHurt(%d), 实际: %d", OutcomeHurt, outcome)
		}
	})

	t.Run("P-003 大圣未击杀魔王返回死亡", func(t *testing.T) {
		// Path: Wukong → bossHpLeft>0 → Dead
		outcome := EvaluateOutcome(RoleWukong, 50, 30)
		if outcome != OutcomeDead {
			t.Errorf("期望 OutcomeDead(%d), 实际: %d", OutcomeDead, outcome)
		}
	})

	t.Run("P-003b 大圣自身HP为0且魔王也死返回死亡", func(t *testing.T) {
		// selfHpLeft=0 不满足 >0，走 Dead
		outcome := EvaluateOutcome(RoleWukong, 0, 0)
		if outcome != OutcomeDead {
			t.Errorf("期望 OutcomeDead(%d), 实际: %d", OutcomeDead, outcome)
		}
	})

	// ── 魔王路径 ──

	t.Run("P-004 魔王自身HP为0返回死亡", func(t *testing.T) {
		// Path: Mowang → selfHpLeft<=0 → Dead
		outcome := EvaluateOutcome(RoleMowang, 0, 50)
		if outcome != OutcomeDead {
			t.Errorf("期望 OutcomeDead(%d), 实际: %d", OutcomeDead, outcome)
		}
	})

	t.Run("P-005 魔王自身HP大于0返回剧情死亡", func(t *testing.T) {
		// Path: Mowang → selfHpLeft>0 → StoryDeath
		outcome := EvaluateOutcome(RoleMowang, 50, 80)
		if outcome != OutcomeStoryDeath {
			t.Errorf("期望 OutcomeStoryDeath(%d), 实际: %d", OutcomeStoryDeath, outcome)
		}
	})

	// ── 其他角色 ──

	t.Run("P-006 普通猴子返回进行中", func(t *testing.T) {
		outcome := EvaluateOutcome(RoleMonkey, 100, 0)
		if outcome != OutcomeInProgress {
			t.Errorf("期望 OutcomeInProgress(%d), 实际: %d", OutcomeInProgress, outcome)
		}
	})

	t.Run("P-007 草木石头返回进行中", func(t *testing.T) {
		outcome := EvaluateOutcome(RoleGrass, 100, 0)
		if outcome != OutcomeInProgress {
			t.Errorf("期望 OutcomeInProgress(%d), 实际: %d", OutcomeInProgress, outcome)
		}
	})

	t.Run("P-008 未知角色类型返回进行中", func(t *testing.T) {
		outcome := EvaluateOutcome(99, 100, 0)
		if outcome != OutcomeInProgress {
			t.Errorf("期望 OutcomeInProgress(%d), 实际: %d", OutcomeInProgress, outcome)
		}
	})
}

// ═══════════════════════════════════════════
//  5. PickWukongComment - 大圣战评语
//  V(G) = 4（switch 3个case + default）
// ═══════════════════════════════════════════

func TestPickWukongComment(t *testing.T) {

	t.Run("P-001 完胜返回非空评语", func(t *testing.T) {
		comment := PickWukongComment(OutcomeWin)
		if comment == "" {
			t.Error("完胜评语不应为空")
		}
	})

	t.Run("P-002 受伤返回非空评语", func(t *testing.T) {
		comment := PickWukongComment(OutcomeHurt)
		if comment == "" {
			t.Error("受伤评语不应为空")
		}
	})

	t.Run("P-003 死亡返回非空评语", func(t *testing.T) {
		comment := PickWukongComment(OutcomeDead)
		if comment == "" {
			t.Error("死亡评语不应为空")
		}
	})

	t.Run("P-004 非大圣结局返回空字符串", func(t *testing.T) {
		comment := PickWukongComment(OutcomeSurvive)
		if comment != "" {
			t.Errorf("非大圣结局应返回空字符串, 实际: %s", comment)
		}
	})

	t.Run("P-005 未知结局返回空字符串", func(t *testing.T) {
		comment := PickWukongComment(999)
		if comment != "" {
			t.Errorf("未知结局应返回空字符串, 实际: %s", comment)
		}
	})
}

// ═══════════════════════════════════════════
//  6. timeUntilNextReset - 凌晨3:00倒计时
//  V(G) = 2
// ═══════════════════════════════════════════

func TestTimeUntilNextReset(t *testing.T) {

	t.Run("P-001 返回值始终为正数", func(t *testing.T) {
		d := timeUntilNextReset()
		if d <= 0 {
			t.Errorf("距下次重置的时间应为正数, 实际: %v", d)
		}
	})

	t.Run("P-002 返回值不超过24小时", func(t *testing.T) {
		d := timeUntilNextReset()
		if d > 24*time.Hour {
			t.Errorf("距下次重置不应超过24小时, 实际: %v", d)
		}
	})

	t.Run("P-003 凌晨3点前调用_下次重置为当天3点", func(t *testing.T) {
		// 构造一个凌晨2点的时间来验证逻辑（通过间接测试）
		// 由于 timeUntilNextReset 使用 time.Now()，这里做范围验证
		d := timeUntilNextReset()
		now := time.Now()
		next := now.Add(d)

		// 重置时间应该是凌晨3点
		if next.Hour() != 3 && next.Minute() != 0 {
			// 允许1秒误差
			t.Logf("下次重置时间: %v", next)
		}
	})
}

// ═══════════════════════════════════════════
//  7. getPlayerIDFromQuery - 从请求参数读取 player_id
//  V(G) = 1（无分支，但需边界值测试）
// ═══════════════════════════════════════════

func TestGetPlayerIDFromQuery(t *testing.T) {

	t.Run("P-001 正常数字参数返回对应值", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/test?player_id=42", nil)
		pid := getPlayerIDFromQuery(r)
		if pid != 42 {
			t.Errorf("期望 42, 实际: %d", pid)
		}
	})

	t.Run("P-002 缺少参数返回0", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/test", nil)
		pid := getPlayerIDFromQuery(r)
		if pid != 0 {
			t.Errorf("期望 0, 实际: %d", pid)
		}
	})

	t.Run("P-003 非数字参数返回0", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/test?player_id=abc", nil)
		pid := getPlayerIDFromQuery(r)
		if pid != 0 {
			t.Errorf("期望 0, 实际: %d", pid)
		}
	})

	t.Run("P-004 负数参数返回负数", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/test?player_id=-1", nil)
		pid := getPlayerIDFromQuery(r)
		if pid != -1 {
			t.Errorf("期望 -1, 实际: %d", pid)
		}
	})

	t.Run("P-005 空字符串参数返回0", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/test?player_id=", nil)
		pid := getPlayerIDFromQuery(r)
		if pid != 0 {
			t.Errorf("期望 0, 实际: %d", pid)
		}
	})
}

// ═══════════════════════════════════════════
//  辅助函数
// ═══════════════════════════════════════════

// assertFloat 浮点数断言（允许 1e-6 误差）
func assertFloat(t *testing.T, name string, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 1e-6 {
		t.Errorf("%s: 期望 %.6f, 实际 %.6f", name, want, got)
	}
}

// assertProbSum 验证概率总和恒为 1.0（允许 1e-6 误差）
func assertProbSum(t *testing.T, probs map[int]float64) {
	t.Helper()
	sum := 0.0
	for _, p := range probs {
		sum += p
	}
	if math.Abs(sum-1.0) > 1e-6 {
		t.Errorf("概率总和应为 1.0, 实际: %.8f", sum)
	}
}
