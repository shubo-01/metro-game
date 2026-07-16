/**
 * 寻仙 - 角色创建场景面板
 * Cocos Creator 3.8 Component
 *
 * 三阶段流程：
 * 1. 性别选择（男/女）
 * 2. 属性展示 + 命名（2-8汉字）
 * 3. 创建入场动画 → 进入大厅
 */

import { _decorator, Component, Label, Node, EditBox, Color, Tween, tween, Vec3 } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager, GameEvent } from '../manager/EventManager';
import { SceneManager, SceneName } from '../manager/SceneManager';
import { ThemeColor } from '../common/Constants';

const { ccclass, property } = _decorator;

/** 创建步骤 */
enum CreateStep {
    Gender = 0,
    Attrs = 1,
    Creating = 2,
}

/** 随机名称词库 */
const NAME_PREFIXES = ['云', '风', '雪', '月', '星', '霜', '青', '墨', '玄', '道', '凌', '寒', '夜', '白', '紫', '苏', '楚', '叶', '柳', '沈'];
const NAME_SUFFIXES = ['轩', '尘', '影', '音', '归', '鸿', '鹤', '寒', '澜', '渊', '歌', '瑶', '辰', '衍', '清', '远', '行', '落', '笙', '渡'];

@ccclass('CharacterCreatePanel')
export class CharacterCreatePanel extends Component {

    // ─── UI 引用 ───

    @property(Label)
    stepTitleLabel: Label | null = null;

    @property(Label)
    stepDescLabel: Label | null = null;

    // 性别选择
    @property(Node)
    maleBtn: Node | null = null;

    @property(Node)
    femaleBtn: Node | null = null;

    @property(Node)
    genderPanel: Node | null = null;

    @property(Label)
    maleSelectedLabel: Label | null = null;

    @property(Label)
    femaleSelectedLabel: Label | null = null;

    // 属性面板
    @property(Node)
    attrsPanel: Node | null = null;

    @property(Label)
    attrsJingLabel: Label | null = null;

    @property(Label)
    attrsQiLabel: Label | null = null;

    @property(Label)
    attrsShenLabel: Label | null = null;

    @property(Label)
    attrsLuckLabel: Label | null = null;

    @property(Label)
    attrsSavvyLabel: Label | null = null;

    @property(Label)
    attrsHintLabel: Label | null = null;

    // 命名
    @property(EditBox)
    nameInput: EditBox | null = null;

    @property(Node)
    randomNameBtn: Node | null = null;

    @property(Node)
    nextBtn: Node | null = null;

    // 创建动画
    @property(Node)
    creatingPanel: Node | null = null;

    @property(Label)
    creatingLabel: Label | null = null;

    // Toast
    @property(Label)
    toastLabel: Label | null = null;

    // ─── 内部状态 ───

    private _step: CreateStep = CreateStep.Gender;
    private _gender: number = 1;  // 1=男 2=女
    private _playerName: string = '';
    private _playerManager: PlayerManager = new PlayerManager();

    // ═══════════════════════════════════════
    //  生命周期
    // ═══════════════════════════════════════

    onLoad() {
        // 初始化
        this._showStep(CreateStep.Gender);

        // 绑定事件
        this.maleBtn?.on(Node.EventType.TOUCH_END, () => this._selectGender(1), this);
        this.femaleBtn?.on(Node.EventType.TOUCH_END, () => this._selectGender(2), this);
        this.nextBtn?.on(Node.EventType.TOUCH_END, this._onNext, this);
        this.randomNameBtn?.on(Node.EventType.TOUCH_END, this._onRandomName, this);

        // 隐藏创建面板
        if (this.creatingPanel) this.creatingPanel.active = false;
        if (this.attrsPanel) this.attrsPanel.active = false;
    }

    // ═══════════════════════════════════════
    //  步骤管理
    // ═══════════════════════════════════════

    private _showStep(step: CreateStep) {
        this._step = step;

        switch (step) {
            case CreateStep.Gender:
                if (this.genderPanel) this.genderPanel.active = true;
                if (this.attrsPanel) this.attrsPanel.active = false;
                if (this.stepTitleLabel) this.stepTitleLabel.string = '选择性别';
                if (this.stepDescLabel) this.stepDescLabel.string = '道有阴阳，请选择你的修行之路';
                break;

            case CreateStep.Attrs:
                if (this.genderPanel) this.genderPanel.active = false;
                if (this.attrsPanel) this.attrsPanel.active = true;
                if (this.stepTitleLabel) this.stepTitleLabel.string = '初始属性 · 命名';
                if (this.stepDescLabel) this.stepDescLabel.string = '人乃万物之灵，初入仙道，万物平等';
                this._updateAttrsDisplay();
                break;

            case CreateStep.Creating:
                if (this.attrsPanel) this.attrsPanel.active = false;
                if (this.genderPanel) this.genderPanel.active = false;
                if (this.creatingPanel) this.creatingPanel.active = true;
                if (this.creatingLabel) this.creatingLabel.string = '命运已定，仙途开启...';
                break;
        }
    }

    // ═══════════════════════════════════════
    //  性别选择
    // ═══════════════════════════════════════

    private _selectGender(gender: number) {
        this._gender = gender;

        // 视觉反馈
        if (this.maleSelectedLabel) {
            this.maleSelectedLabel.color = gender === 1
                ? new Color().fromHEX(ThemeColor.GOLD)
                : new Color().fromHEX(ThemeColor.TEXT_GRAY);
        }
        if (this.femaleSelectedLabel) {
            this.femaleSelectedLabel.color = gender === 2
                ? new Color().fromHEX(ThemeColor.GOLD)
                : new Color().fromHEX(ThemeColor.TEXT_GRAY);
        }

        // 选中后自动进入下一步
        this.scheduleOnce(() => {
            this._showStep(CreateStep.Attrs);
        }, 0.5);
    }

    // ═══════════════════════════════════════
    //  属性展示
    // ═══════════════════════════════════════

    private _updateAttrsDisplay() {
        // 初始属性：精=1 神=1 其余=0（技术方案定义）
        if (this.attrsJingLabel) {
            this.attrsJingLabel.string = '精（肉身）：1';
            this.attrsJingLabel.color = new Color().fromHEX(ThemeColor.GOLD);
        }
        if (this.attrsQiLabel) {
            this.attrsQiLabel.string = '气（五行）：金0 木0 水0 火0 土0';
            this.attrsQiLabel.color = new Color().fromHEX(ThemeColor.TEXT_WHITE);
        }
        if (this.attrsShenLabel) {
            this.attrsShenLabel.string = '神（灵魂）：1';
            this.attrsShenLabel.color = new Color().fromHEX(ThemeColor.GOLD);
        }
        if (this.attrsLuckLabel) {
            this.attrsLuckLabel.string = '气运：0';
            this.attrsLuckLabel.color = new Color().fromHEX(ThemeColor.TEXT_GRAY);
        }
        if (this.attrsSavvyLabel) {
            this.attrsSavvyLabel.string = '悟性：0';
            this.attrsSavvyLabel.color = new Color().fromHEX(ThemeColor.TEXT_GRAY);
        }
        if (this.attrsHintLabel) {
            this.attrsHintLabel.string = '人乃万物之灵，初入仙道，万物平等';
            this.attrsHintLabel.color = new Color().fromHEX(ThemeColor.TEXT_GRAY);
            this.attrsHintLabel.fontSize = 18;
        }
    }

    // ═══════════════════════════════════════
    //  命名
    // ═══════════════════════════════════════

    private _onRandomName() {
        const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
        const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
        const name = prefix + suffix;
        if (this.nameInput) {
            this.nameInput.string = name;
        }
    }

    private _validateName(): boolean {
        const name = this.nameInput?.string || '';
        // 2-8个字符
        if (name.length < 2 || name.length > 8) {
            this._showToast('名称需为2-8个汉字');
            return false;
        }
        // 纯汉字检查
        if (!/^[\u4e00-\u9fa5]+$/.test(name)) {
            this._showToast('名称只能包含汉字');
            return false;
        }
        return true;
    }

    // ═══════════════════════════════════════
    //  下一步 / 创建角色
    // ═══════════════════════════════════════

    private async _onNext() {
        if (this._step === CreateStep.Attrs) {
            // 验证名称
            if (!this._validateName()) return;
            this._playerName = this.nameInput?.string || '';

            // 进入创建动画
            this._showStep(CreateStep.Creating);
            await this._createCharacter();
        }
    }

    private async _createCharacter() {
        this._showToast('正在创建角色...');

        try {
            const res = await HttpClient.post('/player/create', {
                name: this._playerName,
                gender: this._gender,
            });

            if (res.code !== 0) {
                this._showToast(res.msg || '创建失败');
                this._showStep(CreateStep.Attrs);
                return;
            }

            // 初始化玩家数据
            this._playerManager.init({
                playerId: res.data.playerId,
                name: res.data.name,
                gender: res.data.gender,
                attrs: res.data.attrs,
                sceneId: res.data.sceneId,
                posX: res.data.pos?.x || 0,
                posY: res.data.pos?.y || 0,
            });

            EventManager.emit(GameEvent.PLAYER_CREATED, res.data);

            // 入场动画：3秒后进入大厅
            if (this.creatingLabel) {
                this.creatingLabel.string = `${this._playerName}，仙途已开...`;
            }

            // 金光动画
            if (this.creatingPanel) {
                tween(this.creatingPanel)
                    .to(3, { scale: new Vec3(1.2, 1.2, 1) })
                    .call(() => {
                        SceneManager.loadScene(SceneName.Hall);
                    })
                    .start();
            } else {
                // 无动画节点，直接跳转
                this.scheduleOnce(() => {
                    SceneManager.loadScene(SceneName.Hall);
                }, 3);
            }

        } catch (err) {
            console.error('[CharacterCreate] 创建角色失败:', err);
            this._showToast('创建失败，请重试');
            this._showStep(CreateStep.Attrs);
        }
    }

    // ═══════════════════════════════════════
    //  工具
    // ═══════════════════════════════════════

    private _showToast(msg: string) {
        if (this.toastLabel) {
            this.toastLabel.string = msg;
            this.toastLabel.node.active = true;
            this.scheduleOnce(() => {
                if (this.toastLabel) this.toastLabel.node.active = false;
            }, 2);
        }
    }
}
