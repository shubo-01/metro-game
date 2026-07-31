/**
 * 寻仙 - V6 设置面板（PRD 5.x 四大类17项）
 *
 * 布局（编辑器搭建，四大类分组）：
 *   - 画面：画质(低/中/高) / 帧率(30/60/120) / 特效(关/低/全) / 屏幕震动(关/开)
 *   - 声音：BGM音量 / 技能音量 / 环境音量（三条 Slider 0-100）/ 语音(关/开)
 *   - 操作：摇杆灵敏度(Slider 1-10) / 施放方式(点击/拖动瞄准) / 自动普攻(关/开) /
 *          目标锁定(自动就近/手动点选) / 翻滚方式(按钮/摇杆双划)
 *   - 其他：自动拾取(关/开) / 伤害数字(关/开) / 他人特效(隐藏/简化/完整) /
 *          新手引导跳过（只读展示，后端只升不降）
 *
 * 交互约定：
 *   - 档位项 = 点击按钮循环切换（按钮子节点 Label 显示当前档位文案）
 *   - 滑条项 = Slider 拖动（滑条节点子节点 ValueLabel 显示数值，约定命名）
 *   - 控件改动即 SettingsStorage.set（写本地+异步落服务端）；
 *     保存按钮 = 显式全量 POST（双保险）；重置按钮 = 二次确认后恢复默认
 *   - 音量项：工程暂无 MusicManager（manager/ 目录已确认），改动只存值不实时生效，
 *     待音乐管理器接入后从 SettingsStorage.getBgmVolume() 等读取点取值
 *
 * 面板管理：走 PanelManager（PanelType.Settings，一级面板），入口在 HallUI 快捷栏"设置"
 */

import { _decorator, Component, Label, Node, Slider } from 'cc';
import { PanelManager, PanelType } from '../manager/PanelManager';
import { SettingsStorage } from '../manager/SettingsStorage';
import { SettingsApi, SettingsErrorText } from '../net/SettingsApi';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager } from '../manager/EventManager';
import { UIEvent, UISettings } from '../common/Constants';

const { ccclass, property } = _decorator;

/** 档位项配置：设置键 → 档位值数组与档位文案（与后端 validate 枚举一致） */
const CYCLE_OPTIONS: Array<{ key: keyof UISettings; values: number[]; names: string[] }> = [
    { key: 'graphics_quality',     values: [0, 1, 2],      names: ['低', '中', '高'] },
    { key: 'target_fps',           values: [30, 60, 120],  names: ['30帧', '60帧', '120帧'] },
    { key: 'effect_level',         values: [0, 1, 2],      names: ['关', '低', '全'] },
    { key: 'screen_shake',         values: [0, 1],         names: ['关', '开'] },
    { key: 'voice_enabled',        values: [0, 1],         names: ['关', '开'] },
    { key: 'skill_cast_mode',      values: [0, 1],         names: ['点击施放', '拖动瞄准'] },
    { key: 'auto_attack',          values: [0, 1],         names: ['关', '开'] },
    { key: 'target_lock_mode',     values: [0, 1],         names: ['自动就近', '手动点选'] },
    { key: 'dodge_mode',           values: [0, 1],         names: ['按钮', '摇杆双划'] },
    { key: 'auto_pickup',          values: [0, 1],         names: ['关', '开'] },
    { key: 'show_damage_numbers',  values: [0, 1],         names: ['关', '开'] },
    { key: 'other_player_effects', values: [0, 1, 2],      names: ['隐藏', '简化', '完整'] },
];

/** 重置二次确认的有效窗口（秒）：超时后回到第一次点击状态 */
const RESET_CONFIRM_WINDOW_S = 3;

@ccclass('SettingsPanel')
export class SettingsPanel extends Component {

    // ─── 面板骨架 ───
    @property(Node) panelRoot: Node | null = null;     // 面板根节点（平时隐藏）
    @property(Node) maskNode: Node | null = null;      // 半透明叠底（PanelManager 统一设 alpha=0.7）
    @property(Node) closeBtn: Node | null = null;      // 关闭按钮

    // ─── 画面组（档位循环按钮，子节点 Label 显示当前档） ───
    @property(Node) graphicsBtn: Node | null = null;   // 画质：低/中/高
    @property(Node) fpsBtn: Node | null = null;        // 帧率：30/60/120
    @property(Node) effectBtn: Node | null = null;     // 特效强度：关/低/全
    @property(Node) shakeBtn: Node | null = null;      // 屏幕震动：关/开

    // ─── 声音组（滑条 0-100，子节点 ValueLabel 显示数值） ───
    @property(Slider) bgmSlider: Slider | null = null;      // 背景音乐音量
    @property(Slider) skillSlider: Slider | null = null;    // 技能音效音量
    @property(Slider) envSlider: Slider | null = null;      // 环境音音量
    @property(Node) voiceBtn: Node | null = null;           // 语音开关：关/开

    // ─── 操作组 ───
    @property(Slider) sensitivitySlider: Slider | null = null;  // 摇杆灵敏度 1-10
    @property(Node) castModeBtn: Node | null = null;            // 施放方式：点击/拖动瞄准
    @property(Node) autoAttackBtn: Node | null = null;          // 自动普攻：关/开
    @property(Node) lockModeBtn: Node | null = null;            // 目标锁定：自动就近/手动点选
    @property(Node) dodgeModeBtn: Node | null = null;           // 翻滚方式：按钮/摇杆双划

    // ─── 其他组 ───
    @property(Node) autoPickupBtn: Node | null = null;          // 自动拾取：关/开
    @property(Node) damageNumBtn: Node | null = null;           // 伤害数字：关/开
    @property(Node) otherEffectBtn: Node | null = null;         // 他人特效：隐藏/简化/完整
    @property(Label) tutorialSkippedLabel: Label | null = null; // 引导跳过（只读展示）

    // ─── 底部操作 ───
    @property(Node) saveBtn: Node | null = null;       // 保存（显式全量POST）
    @property(Node) resetBtn: Node | null = null;      // 重置（二次确认）
    @property(Label) toastLabel: Label | null = null;  // 提示文字（2秒自动隐藏）

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;
    private _requesting: boolean = false;      // 保存/重置请求在途防重入
    private _resetArmed: boolean = false;      // 重置二次确认状态
    private _destroyed: boolean = false;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        // 注册到 PanelManager（一级面板；maskNode 由管理器统一设 alpha=0.7）
        PanelManager.register(PanelType.Settings, {
            show: () => this._onShow(),
            hide: () => this._onHide(),
            maskNode: this.maskNode,
        });

        // 关闭按钮：走 PanelManager 统一出栈（会广播 PANEL_CLOSED）
        this.closeBtn?.on(Node.EventType.TOUCH_END, () => PanelManager.closeTop(), this);

        // 档位循环按钮：键 → 按钮节点映射后统一绑定
        const cycleBtnMap: Partial<Record<keyof UISettings, Node | null>> = {
            graphics_quality: this.graphicsBtn,
            target_fps: this.fpsBtn,
            effect_level: this.effectBtn,
            screen_shake: this.shakeBtn,
            voice_enabled: this.voiceBtn,
            skill_cast_mode: this.castModeBtn,
            auto_attack: this.autoAttackBtn,
            target_lock_mode: this.lockModeBtn,
            dodge_mode: this.dodgeModeBtn,
            auto_pickup: this.autoPickupBtn,
            show_damage_numbers: this.damageNumBtn,
            other_player_effects: this.otherEffectBtn,
        };
        for (const opt of CYCLE_OPTIONS) {
            const btn = cycleBtnMap[opt.key];
            btn?.on(Node.EventType.TOUCH_END, () => this._onCycleClick(opt.key), this);
        }

        // 滑条：slide 事件（拖动中持续触发）→ 换算存值
        this.bgmSlider?.node.on('slide', () => this._onVolumeSlide('bgm_volume', this.bgmSlider!), this);
        this.skillSlider?.node.on('slide', () => this._onVolumeSlide('skill_volume', this.skillSlider!), this);
        this.envSlider?.node.on('slide', () => this._onVolumeSlide('env_volume', this.envSlider!), this);
        this.sensitivitySlider?.node.on('slide', () => this._onSensitivitySlide(), this);

        // 保存/重置
        this.saveBtn?.on(Node.EventType.TOUCH_END, this._onSaveClick, this);
        this.resetBtn?.on(Node.EventType.TOUCH_END, this._onResetClick, this);

        // 服务端设置刷新（生产者 SettingsApi：get/save/reset 成功后广播）→ 刷新控件显示
        EventManager.on(UIEvent.SETTINGS_UPDATED, this._onSettingsUpdated, this);

        if (this.panelRoot) this.panelRoot.active = false;
    }

    onDestroy() {
        this._destroyed = true;
        PanelManager.unregister(PanelType.Settings);
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    // ═══════════════════════════════════════
    //  PanelManager 回调
    // ═══════════════════════════════════════

    private _onShow() {
        if (this.panelRoot) this.panelRoot.active = true;
        this._refreshAll();
    }

    private _onHide() {
        if (this.panelRoot) this.panelRoot.active = false;
        this._resetArmed = false;   // 关面板时取消未完成的重置确认
    }

    // ═══════════════════════════════════════
    //  控件事件
    // ═══════════════════════════════════════

    /** 档位按钮点击：当前值→下一档循环，改动即 SettingsStorage.set（写本地+异步落库） */
    private _onCycleClick(key: keyof UISettings) {
        const opt = CYCLE_OPTIONS.find(o => o.key === key);
        if (!opt) return;
        const cur = SettingsStorage.get(key);
        const idx = opt.values.indexOf(cur);
        const next = opt.values[(idx + 1) % opt.values.length];
        SettingsStorage.set(key, next);
        this._refreshAll();
    }

    /** 音量滑条拖动：progress 0~1 → 0~100 整数存值（暂无 MusicManager，只存值） */
    private _onVolumeSlide(key: keyof UISettings, slider: Slider) {
        const val = Math.round(slider.progress * 100);
        SettingsStorage.set(key, val);
        this._setSliderValueLabel(slider, String(val));
    }

    /** 灵敏度滑条拖动：progress 0~1 → 1~10 整数存值 */
    private _onSensitivitySlide() {
        if (!this.sensitivitySlider) return;
        const val = Math.max(1, Math.min(10, Math.round(this.sensitivitySlider.progress * 9) + 1));
        SettingsStorage.set('joystick_sensitivity', val);
        this._setSliderValueLabel(this.sensitivitySlider, String(val));
    }

    /** 保存按钮：显式全量 POST（SettingsStorage.set 已异步落库，这里是显式双保险） */
    private async _onSaveClick() {
        if (this._requesting) return;   // 防重入
        if (this._characterId <= 0) {
            this._showToast('未登录，设置已保存到本地');
            return;
        }
        this._requesting = true;
        try {
            const res = await SettingsApi.save(this._characterId, SettingsStorage.getAll());
            if (this._destroyed) return;
            if (res.code === 0) {
                this._showToast('设置已保存');
            } else {
                this._showToast(res.msg || SettingsErrorText[res.code] || '保存失败');
            }
        } catch {
            if (!this._destroyed) this._showToast('网络错误，保存失败（本地已生效）');
        } finally {
            this._requesting = false;
        }
    }

    /** 重置按钮：二次确认（3秒内再点一次才执行，防误触） */
    private async _onResetClick() {
        if (this._requesting) return;
        if (!this._resetArmed) {
            // 第一次点击：进入待确认状态
            this._resetArmed = true;
            this._showToast('再次点击确认恢复默认设置');
            this.scheduleOnce(() => { this._resetArmed = false; }, RESET_CONFIRM_WINDOW_S);
            return;
        }
        // 第二次点击：执行重置（本地恢复默认+服务端 reset）
        this._resetArmed = false;
        this._requesting = true;
        try {
            await SettingsStorage.reset();
            if (this._destroyed) return;
            this._refreshAll();
            this._showToast('已恢复默认设置');
        } catch {
            if (!this._destroyed) this._showToast('重置失败，请稍后再试');
        } finally {
            this._requesting = false;
        }
    }

    /** 服务端设置刷新事件（SettingsApi 广播）：面板开着时同步刷新控件显示 */
    private _onSettingsUpdated(_settings: UISettings) {
        if (this.panelRoot?.active) this._refreshAll();
    }

    // ═══════════════════════════════════════
    //  界面刷新
    // ═══════════════════════════════════════

    /** 用 SettingsStorage 当前值刷新全部控件（档位文案 + 滑条位置 + 只读项） */
    private _refreshAll() {
        const s = SettingsStorage.getAll();

        // 档位按钮文案
        this._setBtnLabel(this.graphicsBtn, this._optionName('graphics_quality', s.graphics_quality));
        this._setBtnLabel(this.fpsBtn, this._optionName('target_fps', s.target_fps));
        this._setBtnLabel(this.effectBtn, this._optionName('effect_level', s.effect_level));
        this._setBtnLabel(this.shakeBtn, this._optionName('screen_shake', s.screen_shake));
        this._setBtnLabel(this.voiceBtn, this._optionName('voice_enabled', s.voice_enabled));
        this._setBtnLabel(this.castModeBtn, this._optionName('skill_cast_mode', s.skill_cast_mode));
        this._setBtnLabel(this.autoAttackBtn, this._optionName('auto_attack', s.auto_attack));
        this._setBtnLabel(this.lockModeBtn, this._optionName('target_lock_mode', s.target_lock_mode));
        this._setBtnLabel(this.dodgeModeBtn, this._optionName('dodge_mode', s.dodge_mode));
        this._setBtnLabel(this.autoPickupBtn, this._optionName('auto_pickup', s.auto_pickup));
        this._setBtnLabel(this.damageNumBtn, this._optionName('show_damage_numbers', s.show_damage_numbers));
        this._setBtnLabel(this.otherEffectBtn, this._optionName('other_player_effects', s.other_player_effects));

        // 滑条位置与数值文案
        if (this.bgmSlider) { this.bgmSlider.progress = s.bgm_volume / 100; this._setSliderValueLabel(this.bgmSlider, String(s.bgm_volume)); }
        if (this.skillSlider) { this.skillSlider.progress = s.skill_volume / 100; this._setSliderValueLabel(this.skillSlider, String(s.skill_volume)); }
        if (this.envSlider) { this.envSlider.progress = s.env_volume / 100; this._setSliderValueLabel(this.envSlider, String(s.env_volume)); }
        if (this.sensitivitySlider) {
            this.sensitivitySlider.progress = (s.joystick_sensitivity - 1) / 9;
            this._setSliderValueLabel(this.sensitivitySlider, String(s.joystick_sensitivity));
        }

        // 只读项：引导跳过标记（后端只升不降，PRD"不可恢复"）
        if (this.tutorialSkippedLabel) {
            this.tutorialSkippedLabel.string = s.tutorial_skipped === 1 ? '已跳过（不可恢复）' : '未跳过';
        }
    }

    /** 查某设置键当前值的档位文案（找不到返回原数值字符串兜底） */
    private _optionName(key: keyof UISettings, value: number): string {
        const opt = CYCLE_OPTIONS.find(o => o.key === key);
        if (!opt) return String(value);
        const idx = opt.values.indexOf(value);
        return idx >= 0 ? opt.names[idx] : String(value);
    }

    /** 设置档位按钮的子节点 Label 文案（约定子节点名 Label，同 CombatHUDUI CDLabel 模式） */
    private _setBtnLabel(btn: Node | null, text: string) {
        if (!btn) return;
        const labelNode = btn.getChildByName('Label');
        const label = labelNode ? labelNode.getComponent(Label) : null;
        if (label) label.string = text;
    }

    /** 设置滑条的子节点 ValueLabel 数值文案（约定子节点名 ValueLabel） */
    private _setSliderValueLabel(slider: Slider, text: string) {
        const labelNode = slider.node.getChildByName('ValueLabel');
        const label = labelNode ? labelNode.getComponent(Label) : null;
        if (label) label.string = text;
    }

    /** 提示文字：2秒自动隐藏（沿用工程 toast 范式） */
    private _showToast(msg: string) {
        if (!this.toastLabel) return;
        this.toastLabel.string = msg;
        this.toastLabel.node.active = true;
        this.scheduleOnce(() => {
            if (this.toastLabel) this.toastLabel.node.active = false;
        }, 2);
    }
}
