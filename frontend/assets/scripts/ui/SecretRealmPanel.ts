/**
 * 寻仙 - V5 秘境（遗迹洞府）面板 UI
 *
 * 功能：
 *   - 秘境设立/更新（POST /death/ruins/create）：设密码/禁制；
 *     响应 updated=true 表示只更新了已有秘境设置（不会二次划拨资产），
 *     updated=false 表示新建秘境并划拨资产（灵石1/3+材料2/3）
 *   - 秘境继承领取（POST /death/ruins/inherit）：输入秘境ID+密码（或强破），
 *     四种领取方式分支提示：owner_inherit 本尊继承 / password_open 密码开启 /
 *     expired_loot 过期拾取 / force_break 强破禁制
 *   - 强破必须传 break_atk（当前攻击力），仅老数据回退 break_level
 *   - 错误分支：6201 密码错 / 6202 强破门槛不足 / 6203 已被开启
 *
 * 事件：
 *   - 监听 SamsaraEvent.RUIN_CREATED / RUIN_INHERITED（生产者 SamsaraApi）展示结果
 *   - 监听 MapEvent.PLAYER_POS_CHANGED（生产者 HallScene）缓存玩家米坐标，
 *     监听 MapEvent.ZONE_INFO_UPDATED（生产者 MapApi）缓存分区表——
 *     两者用于"秘境"按钮打开面板时自动填位置/分区上下文
 *
 * 打开入口（评审修复）：常显的"秘境"按钮（@property openBtn，参照 GongfaPanel
 * 的 openBtn+panelRoot 模式）。点击后取缓存的玩家位置与所在分区调 show()；
 * 前端角色数据（DerivedAttrsV2）没有攻击力字段，breakAtk 固定传 0，
 * 面板内以输入框占位文字提示"强破需手动输入攻击力"
 *
 * 节点结构约定（编辑器搭建）：
 *   SecretRealmPanelNode（挂本脚本，节点保持激活以便事件监听持续生效）
 *   ├─ OpenBtn         "秘境"打开按钮（Node，常显在主 UI 区域）
 *   └─ PanelRoot       面板内容层（Node，默认隐藏，openBtn 打开 / closeBtn 关闭）
 *       ├─ TitleLabel      标题（Label）
 *       ├─ RuinIdInput     秘境ID输入框（EditBox）
 *       ├─ PasswordInput   密码输入框（EditBox，开启他人秘境用）
 *       ├─ BreakAtkInput   强破攻击力输入框（EditBox，前端无攻击力字段，需手动输入）
 *       ├─ InheritBtn      继承/开启按钮（Node）
 *       ├─ SetPasswordInput 设置密码输入框（EditBox，设立/更新自己秘境用）
 *       ├─ CreateBtn       设立/更新秘境按钮（Node）
 *       ├─ ResultLabel     结果展示（Label）
 *       ├─ ToastLabel      提示文字（Label，平时隐藏）
 *       └─ CloseBtn        关闭按钮（Node）
 */

import { _decorator, Component, Label, Node, Color, EditBox } from 'cc';
import {
    SamsaraApi, RuinCreateData, RuinInheritData,
    ERR_RUIN_PASSWORD_WRONG, ERR_RUIN_BREAK_NOT_ENOUGH, ERR_RUIN_ALREADY_OPENED,
    SamsaraErrorText,
} from '../net/SamsaraApi';
import { ZoneInfoData, ZoneRect } from '../net/MapApi';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager } from '../manager/EventManager';
import { SamsaraEvent, MapEvent } from '../common/Constants';

const { ccclass, property } = _decorator;

/** 四种领取方式 → 中文提示 */
const MethodText: Record<string, string> = {
    owner_inherit: '本尊转世继承：全额取回秘境资产',
    password_open: '密码开启：成功取走秘境宝物',
    expired_loot: '过期拾取：秘境已过7天，宝物归你',
    force_break: '强力破禁：轰开禁制夺得宝物',
};

@ccclass('SecretRealmPanel')
export class SecretRealmPanel extends Component {

    @property(Node) openBtn: Node | null = null;                  // "秘境"打开按钮（常显）
    @property(Node) panelRoot: Node | null = null;                // 面板内容层（默认隐藏）
    @property(Label) titleLabel: Label | null = null;
    @property(EditBox) ruinIdInput: EditBox | null = null;        // 秘境ID
    @property(EditBox) passwordInput: EditBox | null = null;      // 开启密码
    @property(EditBox) breakAtkInput: EditBox | null = null;      // 强破攻击力
    @property(Node) inheritBtn: Node | null = null;               // 继承/开启按钮
    @property(EditBox) setPasswordInput: EditBox | null = null;   // 设置密码（自己秘境）
    @property(Node) createBtn: Node | null = null;                // 设立/更新按钮
    @property(Label) resultLabel: Label | null = null;
    @property(Label) toastLabel: Label | null = null;
    @property(Node) closeBtn: Node | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;
    // 请求防重入
    private _busy: boolean = false;

    // 设立秘境用的位置上下文（死亡流程通过 setLocation 喂入；缺省外围原野中央）
    private _locX: number = 500;
    private _locY: number = 500;
    private _zoneId: number = 2;

    // "秘境"按钮打开面板用的自缓存（事件驱动，无缓存时用上面的缺省值）
    private _selfXM: number = 0;      // 玩家当前米坐标 X
    private _selfYM: number = 0;      // 玩家当前米坐标 Y
    private _hasPos: boolean = false; // 是否已收到过位置广播
    private _zones: ZoneRect[] = [];  // 分区表（判定所在分区用）

    onLoad() {
        this._characterId = this._playerManager.playerId;
        if (this.titleLabel) this.titleLabel.string = '遗迹洞府（秘境）';

        this.inheritBtn?.on(Node.EventType.TOUCH_END, this._onInherit, this);
        this.createBtn?.on(Node.EventType.TOUCH_END, this._onCreate, this);
        this.closeBtn?.on(Node.EventType.TOUCH_END, this._hidePanel, this);
        // "秘境"打开按钮（评审修复：面板此前无 UI 打开入口）
        this.openBtn?.on(Node.EventType.TOUCH_END, this._onOpenClick, this);

        // 内容层初始隐藏（本节点保持激活，事件监听不受影响；未绑定 panelRoot 时兼容旧的整节点显隐）
        if (this.panelRoot) this.panelRoot.active = false;

        // 监听 SamsaraApi 广播的秘境操作结果
        EventManager.on(SamsaraEvent.RUIN_CREATED, this._onRuinCreated, this);
        EventManager.on(SamsaraEvent.RUIN_INHERITED, this._onRuinInherited, this);
        // 缓存玩家位置与分区表（打开面板时自动填位置/分区上下文）
        EventManager.on(MapEvent.PLAYER_POS_CHANGED, this._onPlayerPos, this);
        EventManager.on(MapEvent.ZONE_INFO_UPDATED, this._onZoneInfo, this);
    }

    onDestroy() {
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    /**
     * 死亡流程/秘境交互调用：设置秘境位置上下文并打开面板
     * @param x/y 位置（米） @param zoneId 分区 1/2/3
     * @param breakAtk 当前攻击力（>0 自动填入强破输入框；
     *                 前端角色数据没有攻击力字段时传 0，占位文字提示手动输入）
     */
    show(x: number, y: number, zoneId: number, breakAtk: number) {
        this._locX = Math.round(x);
        this._locY = Math.round(y);
        this._zoneId = zoneId;
        if (this.breakAtkInput) {
            if (breakAtk > 0) {
                this.breakAtkInput.string = String(breakAtk);
            } else {
                // 前端无现成攻击力字段：占位提示玩家强破前手动填
                this.breakAtkInput.placeholder = '强破需手动输入攻击力';
            }
        }
        // 优先只显隐内容层（面板节点保持激活以持续收事件）；未绑定时回退整节点显隐
        if (this.panelRoot) {
            this.panelRoot.active = true;
        } else {
            this.node.active = true;
        }
    }

    /** 关闭面板：只隐藏内容层（未绑定 panelRoot 时回退隐藏整节点） */
    private _hidePanel() {
        if (this.panelRoot) {
            this.panelRoot.active = false;
        } else {
            this.node.active = false;
        }
    }

    /** "秘境"按钮点击：取缓存的玩家位置/所在分区打开面板（攻击力前端无字段传0） */
    private _onOpenClick() {
        // 有位置缓存用真实位置；HallScene 还没广播过位置时用缺省值（外围原野中央）
        const x = this._hasPos ? this._selfXM : this._locX;
        const y = this._hasPos ? this._selfYM : this._locY;
        const zone = this._zoneAt(x, y);
        this.show(x, y, zone ? zone.zone_id : this._zoneId, 0);
    }

    /** 玩家位置广播（HallScene 每0.5秒节流，米坐标）：缓存备用 */
    private _onPlayerPos(pos: { x: number; y: number }) {
        this._selfXM = pos.x;
        this._selfYM = pos.y;
        this._hasPos = true;
    }

    /** 分区配置到达（MapApi 广播）：缓存分区表 */
    private _onZoneInfo(data: ZoneInfoData) {
        this._zones = data.zones || [];
    }

    /** 找出米坐标所在分区；营地(zone1)嵌在原野(zone2)内，须优先匹配（与 HallScene 同口径） */
    private _zoneAt(xM: number, yM: number): ZoneRect | null {
        let fallback: ZoneRect | null = null;
        for (const z of this._zones) {
            if (xM >= z.x_min && xM <= z.x_max && yM >= z.y_min && yM <= z.y_max) {
                if (z.zone_id === 1) return z; // 营地优先
                if (!fallback) fallback = z;
            }
        }
        return fallback;
    }

    // ═══════════════════════════════════════
    //  继承/开启/强破
    // ═══════════════════════════════════════

    private async _onInherit() {
        if (this._busy) return;   // 防重入
        const ruinId = parseInt(this.ruinIdInput?.string || '', 10);
        if (isNaN(ruinId) || ruinId <= 0) {
            this._showToast('请输入正确的秘境ID');
            return;
        }
        const password = this.passwordInput?.string || '';
        // 强破攻击力：新秘境判定用 break_atk，输入框为空时传0（走密码/本尊/过期分支）
        const breakAtk = parseInt(this.breakAtkInput?.string || '0', 10) || 0;

        this._busy = true;
        try {
            const res = await SamsaraApi.ruinsInherit(ruinId, this._characterId, password, breakAtk);
            if (res.code === 0) {
                // 成功结果经 RUIN_INHERITED 事件回流展示
            } else if (res.code === ERR_RUIN_PASSWORD_WRONG) {
                this._showResult(res.msg || SamsaraErrorText[ERR_RUIN_PASSWORD_WRONG], '#E74C3C');
            } else if (res.code === ERR_RUIN_BREAK_NOT_ENOUGH) {
                this._showResult(res.msg || SamsaraErrorText[ERR_RUIN_BREAK_NOT_ENOUGH], '#E74C3C');
            } else if (res.code === ERR_RUIN_ALREADY_OPENED) {
                this._showResult(res.msg || SamsaraErrorText[ERR_RUIN_ALREADY_OPENED], '#8A8A9A');
            } else {
                this._showToast(res.msg || '秘境操作失败');
            }
        } catch {
            this._showToast('网络错误，请重试');
        } finally {
            this._busy = false;
        }
    }

    /** 继承成功（SamsaraApi 广播）：按四种 method 分支展示收获 */
    private _onRuinInherited(data: RuinInheritData) {
        const methodDesc = MethodText[data.method] || `领取方式：${data.method}`;
        let text = `${methodDesc}\n获得灵石 ×${data.spirit_stone}`;
        if (data.materials && data.materials.length > 0) {
            const matText = data.materials
                .map(m => `材料#${m.item_id}(${m.item_type === 2 ? '稀有' : '普通'}) ×${m.count}`)
                .join('、');
            text += `\n获得材料：${matText}`;
        }
        if (data.is_owner) {
            text += '\n（本尊身份确认，资产完璧归赵）';
        }
        this._showResult(text, '#2ECC71');
    }

    // ═══════════════════════════════════════
    //  设立/更新秘境
    // ═══════════════════════════════════════

    private async _onCreate() {
        if (this._busy) return;   // 防重入
        const password = this.setPasswordInput?.string || '';

        this._busy = true;
        try {
            const res = await SamsaraApi.ruinsCreate(
                this._characterId, this._locX, this._locY, this._zoneId, password, 0,
            );
            if (res.code === 0) {
                // 成功结果经 RUIN_CREATED 事件回流展示
            } else {
                this._showToast(res.msg || '秘境设立失败');
            }
        } catch {
            this._showToast('网络错误，请重试');
        } finally {
            this._busy = false;
        }
    }

    /** 设立/更新成功（SamsaraApi 广播）：区分 updated 两种分支提示 */
    private _onRuinCreated(data: RuinCreateData) {
        if (data.updated) {
            // 已有未掠夺秘境：只更新了密码/禁制/分区，没有二次划拨资产
            this._showResult(
                `秘境 #${data.ruin_id} 设置已更新（${data.has_password ? '已设密码' : '未设密码'}）\n` +
                `原有资产不变：灵石 ×${data.stone_amount}，强破门槛 ${data.break_threshold}`,
                '#D4A843');
        } else {
            // 新建秘境：已划拨灵石1/3+材料2/3
            let text = `秘境 #${data.ruin_id} 设立成功（${data.has_password ? '已设密码' : '未设密码'}）\n` +
                `已存入灵石 ×${data.stone_amount}，强破门槛 ${data.break_threshold}，` +
                `${data.expires_in_days}天后过期可被拾取`;
            if (data.materials && data.materials.length > 0) {
                text += `\n已存入材料 ${data.materials.length} 种`;
            }
            this._showResult(text, '#2ECC71');
        }
    }

    // ═══════════════════════════════════════
    //  展示辅助
    // ═══════════════════════════════════════

    private _showResult(text: string, hexColor: string) {
        if (this.resultLabel) {
            this.resultLabel.string = text;
            this.resultLabel.color = new Color().fromHEX(hexColor);
        }
    }

    private _showToast(msg: string) {
        if (this.toastLabel) {
            this.toastLabel.string = msg;
            this.toastLabel.node.active = true;
            this.scheduleOnce(() => { if (this.toastLabel) this.toastLabel.node.active = false; }, 2);
        }
    }
}
