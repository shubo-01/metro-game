// handler_ui.go 基础UI交互逻辑迭代（V6）新增：玩家设置 + 新手引导。
// 依据《基础UI交互逻辑PRD》与《基础UI交互逻辑-技术文档》。
//
// 本文件新增路由（在 cmd/character-service/main.go 注册）：
//   GET  /character/settings         读设置（无行时返回文档默认值，懒初始化）
//   POST /character/settings/save    保存全部设置项（取值范围校验，非法值6401）
//   POST /character/settings/reset   重置为文档默认值
//   GET  /character/tutorial/status  读引导进度（无行=未开始）+ 步骤配置清单
//   POST /character/tutorial/advance 推进步骤（只能逐步+1，非法跳步6402；最后一步事务发奖励）
//   POST /character/tutorial/skip    跳过引导（is_skipped=1 不可逆、不发奖励）
//
// 错误码分配（64xx 段：设置/引导）：
//   6401 设置项取值非法
//   6402 引导非法跳步（步骤号不是当前进度+1，或步骤ID不存在）
//   6403 引导已完成/已跳过（奖励重复领取一并用此码拦截）
//
// 【偏离文档说明·既定裁决】技术文档 6.1 UIPanelService（面板状态服务端 RPC：
// OpenPanel/ClosePanel/NavigateTo/GetPanelState）与 6.2 DamageNumberService
// （伤害数字 Redis 队列）均【不做后端实现】：面板开关/层级与伤害数字渲染纯前端
// 承担（单机环境无跨端恢复需求，伤害数据已在 /combat/cast、/combat/skill 响应中）。
package character

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
)

// ═══════════════════════════════════════════
//  V6 常量（数值出处：技术文档第3章 DDL + PRD 4.4 奖励表）
// ═══════════════════════════════════════════

const (
	// 引导奖励（PRD 4.4 原文：灵石1 + 凡品武器1 + 凡品药3）
	TutorialRewardStone       = 1    // 灵石×1（启动资金）
	TutorialRewardWeaponID    = 4101 // 凡品武器物品ID（v6迁移 shop_item_config 登记的凡品木剑）
	TutorialRewardWeaponCount = 1    // 凡品武器×1（新手装备）
	TutorialRewardPotionID    = 4001 // 凡品药物品ID（v6迁移 shop_item_config）
	TutorialRewardPotionCount = 3    // 凡品药×3（初始药品）

	// player_inventory.item_type 的 UI 系统新增段（v6迁移注释约定，假设值可配；
	// 既有 1=普通材料 2=稀有材料 3=功法残卷 4=兵器残块 5=铠甲残块 6=唯一性）
	UIItemTypeConsumable = 7 // 消耗品（药品/符箓）
	UIItemTypeWeaponItem = 8 // 武器物品

	// 引导奖励入包来源标记（player_inventory.source，配合唯一键自动堆叠）
	TutorialRewardSource = "tutorial"
)

// UISettings 玩家设置（字段与技术文档 2.3 GameSettings 结构体一一对应）。
// 默认值见 DefaultUISettings，取值范围校验见 validate。
type UISettings struct {
	// ── 画面（PRD 5.1）──
	GraphicsQuality int  `json:"graphics_quality"` // 画质：0=低 1=中 2=高 3=极高
	TargetFPS       int  `json:"target_fps"`       // 帧率：仅允许 30/60/120
	EffectLevel     int  `json:"effect_level"`     // 特效显示：0=最简 1=简化 2=全
	ScreenShake     bool `json:"screen_shake"`     // 屏幕震动（暴击/破盾）

	// ── 音效（PRD 5.2）──
	BgmVolume    int  `json:"bgm_volume"`    // 背景音乐音量 0-100
	SkillVolume  int  `json:"skill_volume"`  // 技能音效音量 0-100
	EnvVolume    int  `json:"env_volume"`    // 环境音效音量 0-100
	VoiceEnabled bool `json:"voice_enabled"` // 角色语音开关

	// ── 操作（PRD 5.3）──
	JoystickSensitivity int  `json:"joystick_sensitivity"` // 摇杆灵敏度 1-10
	SkillCastMode       int  `json:"skill_cast_mode"`      // 技能释放方式：0=拖拽 1=点击（简单模式）
	AutoAttack          bool `json:"auto_attack"`          // 自动普攻
	TargetLockMode      int  `json:"target_lock_mode"`     // 锁定目标：0=最近 1=血量最低 2=手动
	DodgeMode           int  `json:"dodge_mode"`           // 翻滚方式：0=独立按钮 1=双击摇杆

	// ── 游戏（PRD 5.4）──
	AutoPickup         bool `json:"auto_pickup"`           // 自动拾取
	ShowDamageNumbers  bool `json:"show_damage_numbers"`   // 伤害数字显示
	OtherPlayerEffects int  `json:"other_player_effects"`  // 其他玩家特效：0=关 1=简化 2=全
	TutorialSkipped    bool `json:"tutorial_skipped"`      // 新手引导跳过（PRD 4.5：不可恢复，只能 false→true）
}

// DefaultUISettings 返回文档默认设置（技术文档第3章 DDL 的 DEFAULT 值原文）。
// GET 接口在玩家无设置行时直接返回本值（懒初始化：不写库，等玩家第一次保存再落行）。
func DefaultUISettings() UISettings {
	return UISettings{
		GraphicsQuality: 2, TargetFPS: 60, EffectLevel: 2, ScreenShake: true,
		BgmVolume: 80, SkillVolume: 80, EnvVolume: 60, VoiceEnabled: true,
		JoystickSensitivity: 5, SkillCastMode: 0, AutoAttack: false,
		TargetLockMode: 0, DodgeMode: 0,
		AutoPickup: true, ShowDamageNumbers: true, OtherPlayerEffects: 2,
		TutorialSkipped: false,
	}
}

// validate 校验全部设置项取值范围（PRD 第5章四张设置表的"可选值/范围"列）。
// 返回空字符串表示合法；否则返回给玩家看的中文原因（配错误码6401）。
func (st UISettings) validate() string {
	if st.GraphicsQuality < 0 || st.GraphicsQuality > 3 {
		return "画质取值必须为 0低/1中/2高/3极高"
	}
	// 帧率是枚举而非区间（PRD 5.1：30/60/120 三档，不支持任意值）
	if st.TargetFPS != 30 && st.TargetFPS != 60 && st.TargetFPS != 120 {
		return "帧率只能是 30/60/120"
	}
	if st.EffectLevel < 0 || st.EffectLevel > 2 {
		return "特效显示取值必须为 0最简/1简化/2全"
	}
	if st.BgmVolume < 0 || st.BgmVolume > 100 {
		return "背景音乐音量必须在 0-100 之间"
	}
	if st.SkillVolume < 0 || st.SkillVolume > 100 {
		return "技能音效音量必须在 0-100 之间"
	}
	if st.EnvVolume < 0 || st.EnvVolume > 100 {
		return "环境音效音量必须在 0-100 之间"
	}
	if st.JoystickSensitivity < 1 || st.JoystickSensitivity > 10 {
		return "摇杆灵敏度必须在 1-10 之间"
	}
	if st.SkillCastMode < 0 || st.SkillCastMode > 1 {
		return "技能释放方式取值必须为 0拖拽/1点击"
	}
	if st.TargetLockMode < 0 || st.TargetLockMode > 2 {
		return "锁定目标取值必须为 0最近/1血量最低/2手动"
	}
	if st.DodgeMode < 0 || st.DodgeMode > 1 {
		return "翻滚方式取值必须为 0独立按钮/1双击摇杆"
	}
	if st.OtherPlayerEffects < 0 || st.OtherPlayerEffects > 2 {
		return "其他玩家特效取值必须为 0关/1简化/2全"
	}
	return ""
}

// boolToTinyint 布尔转 MySQL TINYINT(1)（数据库里存 0/1，Go 侧用 bool 更直观）
func boolToTinyint(b bool) int {
	if b {
		return 1
	}
	return 0
}

// ═══════════════════════════════════════════
//  GET /character/settings  读设置
// ═══════════════════════════════════════════
//
// 请求：GET /character/settings?character_id=1
// 无设置行时返回文档默认值（懒初始化：不写库，玩家第一次保存才落行），
// 响应里 is_default=true 让前端知道这是默认值而非玩家保存过的。
func (s *Service) HandleSettingsGet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	charID, ok := s.parseAndAssertOwner(w, r)
	if !ok {
		return
	}

	st, isDefault, err := s.loadSettings(charID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询设置失败"})
		return
	}

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"settings":   st,
		"is_default": isDefault, // true=玩家从未保存过，当前返回的是文档默认值
	}})
}

// loadSettings 读取玩家设置行；没有行则返回文档默认值 + isDefault=true。
func (s *Service) loadSettings(charID int64) (UISettings, bool, error) {
	st := DefaultUISettings()
	var shake, voice, autoAtk, pickup, showDmg, tutSkip int
	err := s.db.QueryRow(`
		SELECT graphics_quality, target_fps, effect_level, screen_shake,
		       bgm_volume, skill_volume, env_volume, voice_enabled,
		       joystick_sensitivity, skill_cast_mode, auto_attack, target_lock_mode, dodge_mode,
		       auto_pickup, show_damage_numbers, other_player_effects, tutorial_skipped
		  FROM player_settings WHERE player_id=?`, charID).Scan(
		&st.GraphicsQuality, &st.TargetFPS, &st.EffectLevel, &shake,
		&st.BgmVolume, &st.SkillVolume, &st.EnvVolume, &voice,
		&st.JoystickSensitivity, &st.SkillCastMode, &autoAtk, &st.TargetLockMode, &st.DodgeMode,
		&pickup, &showDmg, &st.OtherPlayerEffects, &tutSkip,
	)
	if err == sql.ErrNoRows {
		return DefaultUISettings(), true, nil
	}
	if err != nil {
		return st, false, err
	}
	st.ScreenShake = shake == 1
	st.VoiceEnabled = voice == 1
	st.AutoAttack = autoAtk == 1
	st.AutoPickup = pickup == 1
	st.ShowDamageNumbers = showDmg == 1
	st.TutorialSkipped = tutSkip == 1
	return st, false, nil
}

// ═══════════════════════════════════════════
//  POST /character/settings/save  保存设置
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "settings":{...全部设置项...}}
// 保存前逐项校验取值范围（非法值返回6401，一个都不写库）；
// 落库用 INSERT ... ON DUPLICATE KEY UPDATE（玩家第一次保存自动建行）。
//
// 注意 tutorial_skipped 是"不可恢复"开关（PRD 4.5），本接口不接受把它由 1 改回 0：
// 库里已经是 1 时强制保持 1（真正置位走 /character/tutorial/skip）。
func (s *Service) HandleSettingsSave(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64      `json:"character_id"`
		Settings    UISettings `json:"settings"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必填"})
		return
	}
	// 归属校验：只能保存自己角色的设置（未认证401/角色不存在404/非本人403）
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 取值范围校验（PRD 第5章），任一项非法整单拒绝
	if reason := req.Settings.validate(); reason != "" {
		writeJSON(w, 400, APIResponse{Code: 6401, Msg: "设置项取值非法：" + reason})
		return
	}

	// 引导跳过位只升不降：库里已跳过就锁定为已跳过（PRD 4.5 不可恢复）
	// 这里的读库错误不能吞：如果查询报错还当“没跳过”继续写，会把已经
	// 跳过的位冲回 0，相当于把“不可恢复”的开关又恢复了（数据倒退），
	// 所以真报错直接 500；只有“本来就没这行”（ErrNoRows）才按未跳过继续。
	tutSkipped := req.Settings.TutorialSkipped
	var oldSkipped int
	if err := s.db.QueryRow("SELECT tutorial_skipped FROM player_settings WHERE player_id=?", req.CharacterID).Scan(&oldSkipped); err != nil && err != sql.ErrNoRows {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询原设置失败"})
		return
	}
	if oldSkipped == 1 {
		tutSkipped = true
	}

	st := req.Settings
	_, err := s.db.Exec(`
		INSERT INTO player_settings
		  (player_id, graphics_quality, target_fps, effect_level, screen_shake,
		   bgm_volume, skill_volume, env_volume, voice_enabled,
		   joystick_sensitivity, skill_cast_mode, auto_attack, target_lock_mode, dodge_mode,
		   auto_pickup, show_damage_numbers, other_player_effects, tutorial_skipped)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
		ON DUPLICATE KEY UPDATE
		  graphics_quality=VALUES(graphics_quality), target_fps=VALUES(target_fps),
		  effect_level=VALUES(effect_level), screen_shake=VALUES(screen_shake),
		  bgm_volume=VALUES(bgm_volume), skill_volume=VALUES(skill_volume),
		  env_volume=VALUES(env_volume), voice_enabled=VALUES(voice_enabled),
		  joystick_sensitivity=VALUES(joystick_sensitivity), skill_cast_mode=VALUES(skill_cast_mode),
		  auto_attack=VALUES(auto_attack), target_lock_mode=VALUES(target_lock_mode),
		  dodge_mode=VALUES(dodge_mode), auto_pickup=VALUES(auto_pickup),
		  show_damage_numbers=VALUES(show_damage_numbers),
		  other_player_effects=VALUES(other_player_effects),
		  tutorial_skipped=VALUES(tutorial_skipped)`,
		req.CharacterID, st.GraphicsQuality, st.TargetFPS, st.EffectLevel, boolToTinyint(st.ScreenShake),
		st.BgmVolume, st.SkillVolume, st.EnvVolume, boolToTinyint(st.VoiceEnabled),
		st.JoystickSensitivity, st.SkillCastMode, boolToTinyint(st.AutoAttack), st.TargetLockMode, st.DodgeMode,
		boolToTinyint(st.AutoPickup), boolToTinyint(st.ShowDamageNumbers), st.OtherPlayerEffects, boolToTinyint(tutSkipped),
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "保存设置失败"})
		return
	}

	st.TutorialSkipped = tutSkipped
	writeJSON(w, 200, APIResponse{Code: 0, Msg: "设置已保存", Data: map[string]interface{}{
		"settings": st,
	}})
}

// ═══════════════════════════════════════════
//  POST /character/settings/reset  重置设置
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// 全部设置项恢复文档默认值。唯一例外：tutorial_skipped 已跳过的保持已跳过
// （PRD 4.5"跳过后不可恢复"，重置设置不能拿回新手引导）。
func (s *Service) HandleSettingsReset(w http.ResponseWriter, r *http.Request) {
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
	if req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必填"})
		return
	}
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	def := DefaultUISettings()
	// 引导跳过位保留原值（不可恢复）；同上，读库真报错时不能当 0 继续写，
	// 否则一次“重置设置”就把已跳过的新手引导抢了回来（违背 PRD 4.5）。
	var oldSkipped int
	if err := s.db.QueryRow("SELECT tutorial_skipped FROM player_settings WHERE player_id=?", req.CharacterID).Scan(&oldSkipped); err != nil && err != sql.ErrNoRows {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询原设置失败"})
		return
	}
	def.TutorialSkipped = oldSkipped == 1

	_, err := s.db.Exec(`
		INSERT INTO player_settings
		  (player_id, graphics_quality, target_fps, effect_level, screen_shake,
		   bgm_volume, skill_volume, env_volume, voice_enabled,
		   joystick_sensitivity, skill_cast_mode, auto_attack, target_lock_mode, dodge_mode,
		   auto_pickup, show_damage_numbers, other_player_effects, tutorial_skipped)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
		ON DUPLICATE KEY UPDATE
		  graphics_quality=VALUES(graphics_quality), target_fps=VALUES(target_fps),
		  effect_level=VALUES(effect_level), screen_shake=VALUES(screen_shake),
		  bgm_volume=VALUES(bgm_volume), skill_volume=VALUES(skill_volume),
		  env_volume=VALUES(env_volume), voice_enabled=VALUES(voice_enabled),
		  joystick_sensitivity=VALUES(joystick_sensitivity), skill_cast_mode=VALUES(skill_cast_mode),
		  auto_attack=VALUES(auto_attack), target_lock_mode=VALUES(target_lock_mode),
		  dodge_mode=VALUES(dodge_mode), auto_pickup=VALUES(auto_pickup),
		  show_damage_numbers=VALUES(show_damage_numbers),
		  other_player_effects=VALUES(other_player_effects),
		  tutorial_skipped=VALUES(tutorial_skipped)`,
		req.CharacterID, def.GraphicsQuality, def.TargetFPS, def.EffectLevel, boolToTinyint(def.ScreenShake),
		def.BgmVolume, def.SkillVolume, def.EnvVolume, boolToTinyint(def.VoiceEnabled),
		def.JoystickSensitivity, def.SkillCastMode, boolToTinyint(def.AutoAttack), def.TargetLockMode, def.DodgeMode,
		boolToTinyint(def.AutoPickup), boolToTinyint(def.ShowDamageNumbers), def.OtherPlayerEffects, boolToTinyint(def.TutorialSkipped),
	)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "重置设置失败"})
		return
	}

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "设置已恢复默认", Data: map[string]interface{}{
		"settings": def,
	}})
}

// ═══════════════════════════════════════════
//  GET /character/tutorial/status  引导进度查询
// ═══════════════════════════════════════════
//
// 请求：GET /character/tutorial/status?character_id=1
// 无进度行 = 未开始（current_step=0），一并返回全部步骤配置供前端渲染高亮/箭头/文案。
// next_step 为前端应当执行的下一步（已完成或已跳过时为0）。
func (s *Service) HandleTutorialStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	charID, ok := s.parseAndAssertOwner(w, r)
	if !ok {
		return
	}

	// 进度行（无行=未开始，全部按零值返回）
	var curStep int
	var skipped, completed, dungeonDone, rewardClaimed int
	err := s.db.QueryRow(`
		SELECT current_step, is_skipped, is_completed, dungeon_completed, reward_claimed
		  FROM tutorial_progress WHERE player_id=?`, charID).
		Scan(&curStep, &skipped, &completed, &dungeonDone, &rewardClaimed)
	if err != nil && err != sql.ErrNoRows {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询引导进度失败"})
		return
	}
	started := err != sql.ErrNoRows

	// 步骤配置全量（PRD 4.2 的4步，配置在 tutorial_step_config）
	steps, nextStep, err := s.loadTutorialSteps(curStep)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询引导步骤配置失败"})
		return
	}
	// 已跳过/已完成后不再有下一步
	if skipped == 1 || completed == 1 {
		nextStep = 0
	}

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "ok", Data: map[string]interface{}{
		"is_started":        started,
		"current_step":      curStep,
		"next_step":         nextStep,
		"is_skipped":        skipped == 1,
		"is_completed":      completed == 1,
		"dungeon_completed": dungeonDone == 1,
		"reward_claimed":    rewardClaimed == 1,
		"steps":             steps,
	}})
}

// tutorialStep 引导步骤配置（字段对应技术文档 2.2 TutorialStep 结构体）
type tutorialStep struct {
	StepID            int    `json:"step_id"`
	StepType          int    `json:"step_type"` // 0=对话 1=操作 2=采集 3=战斗
	StepName          string `json:"step_name"`
	HighlightTarget   string `json:"highlight_target"`
	ArrowTarget       string `json:"arrow_target"`
	TipText           string `json:"tip_text"`
	CompleteCondition string `json:"complete_condition"`
	NextStep          int    `json:"next_step"` // 0=引导结束
}

// loadTutorialSteps 读取全部步骤配置，并按当前进度算出"下一步该做哪步"。
// 未开始（curStep=0）时下一步就是最小步骤ID；curStep 已是最后一步时返回0。
func (s *Service) loadTutorialSteps(curStep int) ([]tutorialStep, int, error) {
	rows, err := s.db.Query(`
		SELECT step_id, step_type, step_name, highlight_target, arrow_target,
		       tip_text, complete_condition, next_step
		  FROM tutorial_step_config ORDER BY step_id`)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	steps := make([]tutorialStep, 0, 4)
	for rows.Next() {
		var st tutorialStep
		if err := rows.Scan(&st.StepID, &st.StepType, &st.StepName, &st.HighlightTarget,
			&st.ArrowTarget, &st.TipText, &st.CompleteCondition, &st.NextStep); err != nil {
			return nil, 0, err
		}
		steps = append(steps, st)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	// 下一步 = 当前步骤配置里的 next_step；未开始则取第一个步骤
	nextStep := 0
	if curStep == 0 {
		if len(steps) > 0 {
			nextStep = steps[0].StepID
		}
	} else {
		for _, st := range steps {
			if st.StepID == curStep {
				nextStep = st.NextStep
				break
			}
		}
	}
	return steps, nextStep, nil
}

// ═══════════════════════════════════════════
//  POST /character/tutorial/advance  推进引导步骤
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1, "step_id":1}
//   step_id = 客户端判定"已完成"的那一步（完成条件由前端按 complete_condition 判定，
//   服务端只做顺序权威校验：必须严格等于当前进度的 next_step，否则6402非法跳步）。
//
// 最后一步（配置 next_step=0）完成时在同一事务内：
//   1. is_completed=1、reward_claimed=1
//   2. 灵石+1 入 char_currency（PRD 4.4）
//   3. 凡品武器×1、凡品药×3 入 player_inventory（同物品同来源自动堆叠）
// 已完成/已跳过再调用返回6403（奖励绝不重复发）。
//
// 锁序说明（与 death/gongfa 两包保持一致，避免交叉死锁）：
//   tutorial_progress（自有表，最先） → char_currency → player_inventory
func (s *Service) HandleTutorialAdvance(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, APIResponse{Code: 405, Msg: "方法不允许"})
		return
	}

	var req struct {
		CharacterID int64 `json:"character_id"`
		StepID      int   `json:"step_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "参数错误"})
		return
	}
	if req.CharacterID <= 0 || req.StepID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 与 step_id 必填"})
		return
	}
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 事务：进度校验 → 推进 → 发奖励 必须原子（防并发重复领奖）
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	// 锁进度行；无行则先建行（新角色第一次推进），建完再锁
	var curStep, skipped, completed, rewardClaimed int
	err = tx.QueryRow(`SELECT current_step, is_skipped, is_completed, reward_claimed
		 FROM tutorial_progress WHERE player_id=? FOR UPDATE`, req.CharacterID).
		Scan(&curStep, &skipped, &completed, &rewardClaimed)
	if err == sql.ErrNoRows {
		if _, ierr := tx.Exec("INSERT INTO tutorial_progress (player_id) VALUES (?)", req.CharacterID); ierr != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "初始化引导进度失败"})
			return
		}
		curStep, skipped, completed, rewardClaimed = 0, 0, 0, 0
	} else if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询引导进度失败"})
		return
	}
	if skipped == 1 {
		writeJSON(w, 400, APIResponse{Code: 6403, Msg: "引导已跳过，不可再推进（跳过不可恢复）"})
		return
	}
	if completed == 1 {
		writeJSON(w, 400, APIResponse{Code: 6403, Msg: "引导已完成，奖励已领取"})
		return
	}

	// 顺序校验：本次上报的步骤必须正好是当前进度的下一步（服务端权威，防跳步刷奖励）
	expect, nextOfStep, exists, err := tutorialStepInfoTx(tx, curStep, req.StepID)
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询引导步骤配置失败"})
		return
	}
	if !exists {
		writeJSON(w, 400, APIResponse{Code: 6402, Msg: "步骤ID不存在"})
		return
	}
	if req.StepID != expect {
		writeJSON(w, 400, APIResponse{Code: 6402, Msg: "非法跳步：当前应完成步骤 " + strconv.Itoa(expect)})
		return
	}

	isLast := nextOfStep == 0 // 配置 next_step=0 即最后一步
	rewards := map[string]interface{}{}
	if isLast {
		// ── 最后一步：置完成 + 发奖励（PRD 4.4）──
		if rewardClaimed == 1 {
			writeJSON(w, 400, APIResponse{Code: 6403, Msg: "引导奖励已领取，不可重复领取"})
			return
		}
		if _, err := tx.Exec(`UPDATE tutorial_progress
			 SET current_step=?, is_completed=1, reward_claimed=1 WHERE player_id=?`,
			req.StepID, req.CharacterID); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "更新引导进度失败"})
			return
		}
		if err := grantTutorialRewardTx(tx, req.CharacterID); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "发放引导奖励失败"})
			return
		}
		rewards = map[string]interface{}{
			"spirit_stone": TutorialRewardStone,
			"items": []map[string]interface{}{
				{"item_id": TutorialRewardWeaponID, "name": "凡品武器", "count": TutorialRewardWeaponCount},
				{"item_id": TutorialRewardPotionID, "name": "凡品药", "count": TutorialRewardPotionCount},
			},
		}
	} else {
		// ── 中间步骤：只推进进度 ──
		if _, err := tx.Exec("UPDATE tutorial_progress SET current_step=? WHERE player_id=?",
			req.StepID, req.CharacterID); err != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "更新引导进度失败"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	msg := "步骤完成，继续下一步"
	if isLast {
		msg = "新手引导完成！奖励已发放"
	}
	writeJSON(w, 200, APIResponse{Code: 0, Msg: msg, Data: map[string]interface{}{
		"current_step": req.StepID,
		"next_step":    nextOfStep,
		"is_completed": isLast,
		"rewards":      rewards, // 中间步骤为空对象
	}})
}

// tutorialStepInfoTx 在事务内查步骤配置，一次返回三件事：
//   expect     当前进度 curStep 之后应完成的步骤ID（curStep=0 取最小步骤ID）
//   nextOfStep 本次上报步骤 stepID 的 next_step（0=最后一步）
//   exists     stepID 是否是配置表里存在的步骤
func tutorialStepInfoTx(tx *sql.Tx, curStep, stepID int) (expect, nextOfStep int, exists bool, err error) {
	// expect：未开始取最小步骤ID，否则取当前步骤的 next_step
	if curStep == 0 {
		err = tx.QueryRow("SELECT COALESCE(MIN(step_id),0) FROM tutorial_step_config").Scan(&expect)
	} else {
		err = tx.QueryRow("SELECT COALESCE(next_step,0) FROM tutorial_step_config WHERE step_id=?", curStep).Scan(&expect)
		if err == sql.ErrNoRows {
			// 进度指向的步骤已被配置表删除：按未开始处理，重新从第一步走
			err = tx.QueryRow("SELECT COALESCE(MIN(step_id),0) FROM tutorial_step_config").Scan(&expect)
		}
	}
	if err != nil {
		return 0, 0, false, err
	}

	err = tx.QueryRow("SELECT next_step FROM tutorial_step_config WHERE step_id=?", stepID).Scan(&nextOfStep)
	if err == sql.ErrNoRows {
		return expect, 0, false, nil
	}
	if err != nil {
		return 0, 0, false, err
	}
	return expect, nextOfStep, true, nil
}

// grantTutorialRewardTx 在事务内发放引导奖励（PRD 4.4：灵石1 + 凡品武器1 + 凡品药3）。
// 灵石入 char_currency（无货币行自动建行），物品入 player_inventory
// （唯一键 player_id+item_id+source，同物品同来源自动堆叠）。
func grantTutorialRewardTx(tx *sql.Tx, characterID int64) error {
	// 灵石入账：先锁余额行（无行则由 ON DUPLICATE 建行，锁序在 player_inventory 之前）
	// 这一句的错误不能吞：锁行失败（超时/死锁/连接断）却继续往下走，就等于
	// “没锁住就发奖”，并发时可能发重。故真报错就 return err 交给调用方回滚事务；
	// 只有“这个角色还没有货币行”（ErrNoRows）是正常情况，按余额 0 继续建行。
	var stone int64
	if err := tx.QueryRow("SELECT spirit_stone FROM char_currency WHERE character_id=? FOR UPDATE", characterID).Scan(&stone); err != nil && err != sql.ErrNoRows {
		return err
	}
	if _, err := tx.Exec(`
		INSERT INTO char_currency (character_id, spirit_stone) VALUES (?, ?)
		ON DUPLICATE KEY UPDATE spirit_stone = spirit_stone + VALUES(spirit_stone)`,
		characterID, TutorialRewardStone); err != nil {
		return err
	}

	// 物品入包：凡品武器×1、凡品药×3
	items := []struct {
		itemID   int
		itemType int
		count    int
	}{
		{TutorialRewardWeaponID, UIItemTypeWeaponItem, TutorialRewardWeaponCount},
		{TutorialRewardPotionID, UIItemTypeConsumable, TutorialRewardPotionCount},
	}
	for _, it := range items {
		if _, err := tx.Exec(`
			INSERT INTO player_inventory (player_id, item_id, item_type, quantity, source)
			VALUES (?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
			characterID, it.itemID, it.itemType, it.count, TutorialRewardSource); err != nil {
			return err
		}
	}
	return nil
}

// ═══════════════════════════════════════════
//  POST /character/tutorial/skip  跳过引导
// ═══════════════════════════════════════════
//
// 请求：{"character_id":1}
// PRD 4.5：跳过后不可恢复、不给奖励。技术文档 5.3 SkipTutorial 同时置
// is_completed=1（引导流程终结），并把设置里的 tutorial_skipped 一并置位
// （设置面板的"新手引导跳过"就是这一位，PRD 5.4）。
// 已完成的引导不允许跳过（技术文档 5.3：已完成不能跳过）→ 6403。
func (s *Service) HandleTutorialSkip(w http.ResponseWriter, r *http.Request) {
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
	if req.CharacterID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必填"})
		return
	}
	if !s.assertCharacterOwner(w, r, req.CharacterID) {
		return
	}

	// 事务：进度置跳过 + 设置位同步，两处状态必须一致
	tx, err := s.db.Begin()
	if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "系统错误"})
		return
	}
	defer tx.Rollback()

	var curStep, skipped, completed int
	err = tx.QueryRow(`SELECT current_step, is_skipped, is_completed
		 FROM tutorial_progress WHERE player_id=? FOR UPDATE`, req.CharacterID).
		Scan(&curStep, &skipped, &completed)
	if err == sql.ErrNoRows {
		// 新角色直接在设置里点跳过：建行并标记跳过
		if _, ierr := tx.Exec(`INSERT INTO tutorial_progress
			 (player_id, current_step, is_skipped, is_completed) VALUES (?, 0, 1, 1)`,
			req.CharacterID); ierr != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "跳过引导失败"})
			return
		}
	} else if err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "查询引导进度失败"})
		return
	} else {
		if skipped == 1 {
			writeJSON(w, 400, APIResponse{Code: 6403, Msg: "引导已跳过（不可恢复）"})
			return
		}
		if completed == 1 {
			writeJSON(w, 400, APIResponse{Code: 6403, Msg: "引导已完成，无需跳过"})
			return
		}
		if _, uerr := tx.Exec(`UPDATE tutorial_progress
			 SET is_skipped=1, is_completed=1 WHERE player_id=?`, req.CharacterID); uerr != nil {
			writeJSON(w, 500, APIResponse{Code: 500, Msg: "跳过引导失败"})
			return
		}
	}

	// 设置面板的"新手引导跳过"位同步置1（无设置行则按默认值建行）
	def := DefaultUISettings()
	if _, err := tx.Exec(`
		INSERT INTO player_settings
		  (player_id, graphics_quality, target_fps, effect_level, screen_shake,
		   bgm_volume, skill_volume, env_volume, voice_enabled,
		   joystick_sensitivity, skill_cast_mode, auto_attack, target_lock_mode, dodge_mode,
		   auto_pickup, show_damage_numbers, other_player_effects, tutorial_skipped)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)
		ON DUPLICATE KEY UPDATE tutorial_skipped=1`,
		req.CharacterID, def.GraphicsQuality, def.TargetFPS, def.EffectLevel, boolToTinyint(def.ScreenShake),
		def.BgmVolume, def.SkillVolume, def.EnvVolume, boolToTinyint(def.VoiceEnabled),
		def.JoystickSensitivity, def.SkillCastMode, boolToTinyint(def.AutoAttack), def.TargetLockMode, def.DodgeMode,
		boolToTinyint(def.AutoPickup), boolToTinyint(def.ShowDamageNumbers), def.OtherPlayerEffects,
	); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "同步跳过设置失败"})
		return
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, APIResponse{Code: 500, Msg: "提交失败"})
		return
	}

	writeJSON(w, 200, APIResponse{Code: 0, Msg: "已跳过新手引导（不可恢复，无奖励）", Data: map[string]interface{}{
		"is_skipped":   true,
		"is_completed": true,
		"rewards":      nil, // PRD 4.5：跳过不给奖励
	}})
}

// ═══════════════════════════════════════════
//  V6 公用小助手
// ═══════════════════════════════════════════

// parseAndAssertOwner 解析 GET 请求的 character_id 并做归属校验（两个 GET 接口共用）。
// 返回 ok=false 时错误响应已写好，调用方直接 return。
func (s *Service) parseAndAssertOwner(w http.ResponseWriter, r *http.Request) (int64, bool) {
	idStr := r.URL.Query().Get("character_id")
	if idStr == "" {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "缺少 character_id"})
		return 0, false
	}
	charID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || charID <= 0 {
		writeJSON(w, 400, APIResponse{Code: 400, Msg: "character_id 必须为正整数"})
		return 0, false
	}
	if !s.assertCharacterOwner(w, r, charID) {
		return 0, false
	}
	return charID, true
}
