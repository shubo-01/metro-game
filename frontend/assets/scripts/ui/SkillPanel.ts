/**
 * 寻仙 - 技能面板（技能背包·技能栏装配）
 * 功能：
 *   1. 技能背包列表：全部技能定义（类型/品级/伤害路线/五行/冷却/耗蓝）+ 持有碎片x/9与完整数 + 是否可用
 *   2. 技能栏展示：主动栏10格（五行技/学习技）+ 被动栏4格（被动技），空栏显示"空"
 *   3. 操作：学习技能（9碎片合成1个完整）、遗忘技能（扣费并自动卸栏）、装配、卸下
 *   4. 修数展示：当前修炼的五行数量（五行技按修数解锁：凡术1修/灵术2修/仙术3修/道术5修）
 * 数据源：GET /skill/list（总览） + 3个写接口（见 SkillApi）
 *
 * 打开方式：openBtn（技能入口按钮，场景中放在常显主 UI 区域，拖入本组件属性）
 *   - 本组件挂在常驻激活节点上，面板内容根节点 panelRoot 默认隐藏
 *   - 列表条目用代码动态创建（new Node + Label，与 ShenweiPanel/GongfaPanel 同模式），不依赖预制体
 *
 * 操作流程说明（装配需要"选技能 + 选栏位"两步）：
 *   1) 在技能背包列表点一个技能 → 2) 在主动栏/被动栏列表点一个栏位 → 3) 点"装配"
 *   卸下只需选栏位后点"卸下"（后端按 skill_id=0 处理）
 *
 * 事件配对（生产者均为 SkillApi 封装层，本面板只监听）：
 *   SKILL_UPDATED       → 用 SkillListData 全量数据渲染面板
 *   SKILL_LEARNED       → 学习结果 toast（含走火入魔提示）+ 重新拉取 list
 *   SKILL_SLOT_CHANGED  → 装配/卸下结果 toast + 重新拉取 list
 *   （遗忘技能无独立事件：成功后本面板直接 toast 并调 list 刷新，见 SkillApi.forget 注释）
 */

import { _decorator, Component, Label, Node, Color, ScrollView, Button, UITransform, Size } from 'cc';
import {
    SkillApi, SkillListData, SkillListItem, SkillLearnData, SlotSetData,
    SkillType, SlotType, SkillTypeName, SkillTierName, DamagePathName, ElementName,
    ACTIVE_SLOT_MAX, PASSIVE_SLOT_MAX, SKILL_FUSE_NEED, WuxingXiuNeedTable,
} from '../net/SkillApi';
import { ForgetCostTable, calcForgetTotalCost, GongfaErrorText } from '../net/GongfaApi';
import { SkillEvent } from '../common/Constants';
import { EventManager } from '../manager/EventManager';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

// 列表条目行高（动态创建条目时的纵向排布间距）
const ITEM_HEIGHT = 36;

@ccclass('SkillPanel')
export class SkillPanel extends Component {

    // ─── 面板开关 ───
    @property(Node) openBtn: Node | null = null;         // 技能入口按钮（常显主 UI 区域，点击打开面板）
    @property(Node) panelRoot: Node | null = null;       // 面板内容根节点（默认隐藏，openBtn 打开）
    @property(Node) closeBtn: Node | null = null;        // 关闭按钮（隐藏面板）

    // ─── 列表区 ───
    @property(ScrollView) skillScrollView: ScrollView | null = null;         // 技能背包列表（条目动态创建）
    @property(ScrollView) activeSlotScrollView: ScrollView | null = null;    // 主动技能栏10格（条目动态创建）
    @property(ScrollView) passiveSlotScrollView: ScrollView | null = null;   // 被动技能栏4格（条目动态创建）

    // ─── 信息展示 ───
    @property(Label) selectedInfoLabel: Label | null = null;   // 选中技能详情（效果/解锁条件/遗忘费用）
    @property(Label) xiuCountLabel: Label | null = null;       // 当前修数（五行技解锁依据）
    @property(Label) slotSelectedLabel: Label | null = null;   // 当前选中的栏位提示（未选时提示先选栏位）

    // ─── 操作按钮 ───
    @property(Node) learnBtn: Node | null = null;      // 学习按钮（碎片≥9的学习技可点）
    @property(Node) forgetBtn: Node | null = null;     // 遗忘按钮（持有完整技能可点，扣费并卸栏）
    @property(Node) equipBtn: Node | null = null;      // 装配按钮（需先选技能+选栏位）
    @property(Node) unequipBtn: Node | null = null;    // 卸下按钮（需先选一个非空栏位）

    // ─── Toast ───
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    /** 最近一次 list 全量数据（SKILL_UPDATED 事件缓存） */
    private _info: SkillListData | null = null;
    /** 当前选中的技能ID（0=未选中） */
    private _selectedSkillId: number = 0;
    /** 当前选中的栏位类型（0=未选中栏位；1=主动栏 2=被动栏） */
    private _selectedSlotType: number = 0;
    /** 当前选中的栏位序号（主动1-10 / 被动1-4；0=未选中） */
    private _selectedSlotIndex: number = 0;

    /** 防止重复点击：写请求进行中时忽略再次操作（与 ShenweiPanel 同模式） */
    private _requesting: boolean = false;
    /** 面板是否已销毁（异步回调可能晚于 onDestroy 到达，销毁后不再操作 UI） */
    private _destroyed: boolean = false;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        // 面板开关（面板内部交互，走 TOUCH_END，与既有 UI 风格一致）
        this.openBtn?.on(Node.EventType.TOUCH_END, this._onOpen, this);
        this.closeBtn?.on(Node.EventType.TOUCH_END, this._onClose, this);

        // 操作按钮
        this.learnBtn?.on(Node.EventType.TOUCH_END, this._onLearn, this);
        this.forgetBtn?.on(Node.EventType.TOUCH_END, this._onForget, this);
        this.equipBtn?.on(Node.EventType.TOUCH_END, this._onEquip, this);
        this.unequipBtn?.on(Node.EventType.TOUCH_END, this._onUnequip, this);

        // 技能事件（生产者为 SkillApi 封装层，见 Constants.SkillEvent 配对说明）
        EventManager.on(SkillEvent.SKILL_UPDATED, this._onInfoUpdated, this);
        EventManager.on(SkillEvent.SKILL_LEARNED, this._onLearned, this);
        EventManager.on(SkillEvent.SKILL_SLOT_CHANGED, this._onSlotChanged, this);

        // 面板内容默认隐藏，等待 openBtn 打开
        if (this.panelRoot) this.panelRoot.active = false;
    }

    onDestroy() {
        // 先置销毁标记：在途异步请求返回后据此跳过 UI 操作
        this._destroyed = true;
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    // ═══════════════════════════════════════════
    //  面板开关与数据刷新
    // ═══════════════════════════════════════════

    /** 打开面板：显示内容根节点并拉取最新数据 */
    public show() {
        if (this.panelRoot) this.panelRoot.active = true;
        this._selectedSkillId = 0;
        this._selectedSlotType = 0;
        this._selectedSlotIndex = 0;
        this._refresh();
    }

    private _onOpen() {
        this.show();
    }

    private _onClose() {
        if (this.panelRoot) this.panelRoot.active = false;
    }

    /** 拉取技能总览（渲染在 SKILL_UPDATED 事件回调里完成） */
    private async _refresh() {
        try {
            const res = await SkillApi.list(this._characterId);
            if (this._destroyed) return;
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '技能信息加载失败');
        } catch { if (!this._destroyed) this._showToast('技能信息加载失败'); }
    }

    /** SKILL_UPDATED：用 list 全量数据渲染面板 */
    private _onInfoUpdated(info: SkillListData) {
        this._info = info;
        this._renderXiuCount();
        this._rebuildSkillList();
        this._rebuildSlotList(SlotType.Active);
        this._rebuildSlotList(SlotType.Passive);
        this._refreshSelectedInfo();
        this._refreshSlotSelectedLabel();
        this._refreshButtons();
    }

    // ═══════════════════════════════════════════
    //  渲染
    // ═══════════════════════════════════════════

    /** 修数展示（五行技解锁依据：凡术1修/灵术2修/仙术3修/道术5修） */
    private _renderXiuCount() {
        if (!this.xiuCountLabel) return;
        const count = this._info?.element_count ?? 0;
        this.xiuCountLabel.string = `当前修数：${count}修`
            + `（凡术需1修/灵术2修/仙术3修/道术5修）`;
    }

    /** 重建技能背包列表（条目动态创建，点击选中） */
    private _rebuildSkillList() {
        const content = this.skillScrollView?.content;
        if (!content) return;
        this._clearChildren(content);

        const list = this._info?.skill_list || [];
        list.forEach((item, idx) => {
            const d = item.def;
            const need = d.fuse_count || SKILL_FUSE_NEED;
            // 持有情况：五行技/普攻按"可用与否"显示，其余显示完整数或碎片进度
            let own: string;
            if (d.skill_type === SkillType.Wuxing || d.skill_type === SkillType.Normal) {
                own = item.available ? '可用' : '未解锁';
            } else {
                own = item.complete > 0 ? `完整×${item.complete}` : `碎片${item.fragments}/${need}`;
            }
            const equipped = this._findSlotBySkill(d.id) ? '[已装配]' : '';
            const text = `${d.name} ${SkillTierName[d.tier] || '?'}${SkillTypeName[d.skill_type] || '?'} ${own}${equipped}`;
            // 可用翡翠绿 / 不可用灰，选中金色高亮
            const color = d.id === this._selectedSkillId
                ? '#D4A843' : (item.available ? '#2ECC71' : '#8A8A9A');
            this._createItem(content, idx, text, color, () => {
                this._selectedSkillId = d.id;
                this._rebuildSkillList();
                this._refreshSelectedInfo();
                this._refreshButtons();
            });
        });
        this._resizeContent(content, list.length);
    }

    /** 重建技能栏列表（主动10格 / 被动4格，空栏显示"空"，点击选中栏位） */
    private _rebuildSlotList(slotType: number) {
        const scrollView = slotType === SlotType.Active ? this.activeSlotScrollView : this.passiveSlotScrollView;
        const content = scrollView?.content;
        if (!content) return;
        this._clearChildren(content);

        // 栏位数量以后端返回的上限为准，缺省用本地常量兜底
        const max = slotType === SlotType.Active
            ? (this._info?.active_slot_max || ACTIVE_SLOT_MAX)
            : (this._info?.passive_slot_max || PASSIVE_SLOT_MAX);
        const typeName = slotType === SlotType.Active ? '主动' : '被动';

        for (let index = 1; index <= max; index++) {
            const slot = this._findSlot(slotType, index);
            const skillId = slot?.skill_id ?? 0;
            const skillName = skillId > 0 ? (this._findSkill(skillId)?.def.name || `技能${skillId}`) : '空';
            const text = `${typeName}栏${index}：${skillName}`;
            const selected = this._selectedSlotType === slotType && this._selectedSlotIndex === index;
            const color = selected ? '#D4A843' : (skillId > 0 ? '#2ECC71' : '#8A8A9A');
            this._createItem(content, index - 1, text, color, () => {
                this._selectedSlotType = slotType;
                this._selectedSlotIndex = index;
                this._rebuildSlotList(SlotType.Active);
                this._rebuildSlotList(SlotType.Passive);
                this._refreshSlotSelectedLabel();
                this._refreshButtons();
            });
        }
        this._resizeContent(content, max);
    }

    /** 选中技能详情（效果/解锁条件/伤害参数/遗忘费用） */
    private _refreshSelectedInfo() {
        if (!this.selectedInfoLabel) return;

        const item = this._findSkill(this._selectedSkillId);
        if (!item) {
            this.selectedInfoLabel.string = '点击技能列表条目查看详情';
            return;
        }
        const d = item.def;
        const need = d.fuse_count || SKILL_FUSE_NEED;
        let text = `${d.name}：${SkillTierName[d.tier] || '?'} · ${SkillTypeName[d.skill_type] || '?'}`
            + ` · ${DamagePathName[d.damage_path] || '?'} · ${ElementName[d.element] || '?'}系`
            + `\n伤害：基础${d.base_damage} ×${d.multiplier}；冷却${d.cooldown_s}秒；耗灵力${d.mp_cost}`
            + `\n效果：${d.effect_desc || '无'}`
            + `\n解锁：${d.unlock_condition || '无'}`
            + `\n持有：完整${item.complete}个 / 碎片${item.fragments}/${need}`;

        // 装配可行性说明（普攻与神位技不占栏；五行技按修数解锁）
        if (d.skill_type === SkillType.Normal || d.skill_type === SkillType.Shenwei) {
            text += '\n装配：该技能不占技能栏（自动生效）';
        } else if (d.skill_type === SkillType.Wuxing) {
            const xiuNeed = WuxingXiuNeedTable[d.tier] || 1;
            const cur = this._info?.element_count ?? 0;
            text += `\n装配：主动栏；需修数≥${xiuNeed}（当前${cur}修）` + (cur >= xiuNeed ? ' ✓' : ' ✗');
        } else if (d.skill_type === SkillType.Passive) {
            text += `\n装配：被动栏（需持有完整技能）` + (item.complete > 0 ? ' ✓' : ' ✗');
        } else {
            text += `\n装配：主动栏（需持有完整技能）` + (item.complete > 0 ? ' ✓' : ' ✗');
        }

        // 遗忘费用（与功法同一张品级费用表：凡免费/灵30+2/仙80+3/道150+5）
        if (item.complete > 0) {
            const cost = ForgetCostTable[d.tier];
            if (cost) {
                const total = calcForgetTotalCost(cost);
                text += total > 0
                    ? `\n遗忘费用：灵石${cost.spirit_stone} + 孟遗汤${cost.mengyi_soup}张（约${total}灵石当量）`
                    : '\n遗忘费用：凡术免费';
            }
        }
        const slot = this._findSlotBySkill(d.id);
        if (slot) {
            const typeName = slot.slot_type === SlotType.Active ? '主动' : '被动';
            text += `\n当前已装配在：${typeName}栏${slot.slot_index}`;
        }
        this.selectedInfoLabel.string = text;
    }

    /** 已选栏位提示 */
    private _refreshSlotSelectedLabel() {
        if (!this.slotSelectedLabel) return;
        if (this._selectedSlotType <= 0 || this._selectedSlotIndex <= 0) {
            this.slotSelectedLabel.string = '未选择栏位（装配/卸下前请先点一个栏位）';
            return;
        }
        const typeName = this._selectedSlotType === SlotType.Active ? '主动' : '被动';
        const slot = this._findSlot(this._selectedSlotType, this._selectedSlotIndex);
        const skillId = slot?.skill_id ?? 0;
        const skillName = skillId > 0 ? (this._findSkill(skillId)?.def.name || `技能${skillId}`) : '空';
        this.slotSelectedLabel.string = `已选栏位：${typeName}栏${this._selectedSlotIndex}（当前：${skillName}）`;
    }

    /** 按钮可点状态（有 Button 组件时同步 interactable，点击时仍有守卫兜底） */
    private _refreshButtons() {
        const item = this._findSkill(this._selectedSkillId);
        const need = item ? (item.def.fuse_count || SKILL_FUSE_NEED) : SKILL_FUSE_NEED;
        // 学习：仅"学习技"支持碎片合成，且碎片≥9
        this._setInteractable(this.learnBtn,
            !!item && item.def.skill_type === SkillType.Learned && item.fragments >= need);
        // 遗忘：持有完整技能才可遗忘
        this._setInteractable(this.forgetBtn, !!item && item.complete > 0);

        // 装配：需选中技能 + 选中栏位（类型匹配由后端权威判定，前端也会提前提示）
        const slotPicked = this._selectedSlotType > 0 && this._selectedSlotIndex > 0;
        this._setInteractable(this.equipBtn, !!item && slotPicked);
        // 卸下：选中的栏位当前有技能
        const slot = slotPicked ? this._findSlot(this._selectedSlotType, this._selectedSlotIndex) : null;
        this._setInteractable(this.unequipBtn, !!slot && slot.skill_id > 0);
    }

    // ═══════════════════════════════════════════
    //  操作：学习 / 遗忘 / 装配 / 卸下
    // ═══════════════════════════════════════════

    /** 学习技能：9碎片合成1个完整技能（碎片不足 5020；等级/精气神不足 5004/5005） */
    private async _onLearn() {
        if (this._requesting || this._destroyed) return;
        const item = this._findSkill(this._selectedSkillId);
        if (!item) { this._showToast('请先在技能列表选择要学习的技能'); return; }
        if (item.def.skill_type !== SkillType.Learned) {
            this._showToast(`【${item.def.name}】不是学习技，无法用碎片合成学习`);
            return;
        }
        const need = item.def.fuse_count || SKILL_FUSE_NEED;
        if (item.fragments < need) {
            this._showToast(`技能碎片不足：${item.fragments}/${need}，还差${need - item.fragments}个`);
            return;
        }

        this._requesting = true;
        try {
            // 成功路径由 SKILL_LEARNED 事件回调统一处理（toast+刷新）
            const res = await SkillApi.learn(this._characterId, item.def.id);
            if (this._destroyed) return; // await 期间面板已销毁，跳过 UI 操作
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '学习失败');
        } catch { if (!this._destroyed) this._showToast('学习请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /** 遗忘技能：扣费 + 完整数-1 + 自动卸栏（未持有 5021；灵石/孟遗汤不足 5010/5011） */
    private async _onForget() {
        if (this._requesting || this._destroyed) return;
        const item = this._findSkill(this._selectedSkillId);
        if (!item) { this._showToast('请先在技能列表选择要遗忘的技能'); return; }
        if (item.complete <= 0) { this._showToast(`未持有完整的【${item.def.name}】，无法遗忘`); return; }

        this._requesting = true;
        try {
            // 遗忘接口无独立事件（见 SkillApi.forget 注释），成功后本方法自行 toast + 刷新
            const res = await SkillApi.forget(this._characterId, item.def.id);
            if (this._destroyed) return;
            if (res.code !== 0) {
                this._showToast(GongfaErrorText[res.code] || res.msg || '遗忘失败');
            } else if (res.data) {
                const total = calcForgetTotalCost(res.data.cost);
                this._showToast(total > 0
                    ? `遗忘成功：扣灵石${res.data.cost.spirit_stone}、孟遗汤${res.data.cost.mengyi_soup}张，剩余完整${res.data.complete}个`
                    : `遗忘成功：凡术免费，剩余完整${res.data.complete}个`);
                this._refresh();
            }
        } catch { if (!this._destroyed) this._showToast('遗忘请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /** 装配：把选中技能放进选中栏位（栏位非法 5022；类型不匹配 5023；修数不足 5024；重复装配 5025） */
    private async _onEquip() {
        if (this._requesting || this._destroyed) return;
        const item = this._findSkill(this._selectedSkillId);
        if (!item) { this._showToast('请先在技能列表选择要装配的技能'); return; }
        if (this._selectedSlotType <= 0 || this._selectedSlotIndex <= 0) {
            this._showToast('请先在技能栏列表点选一个栏位');
            return;
        }
        // 前端类型预检（拦截明显不合法的请求，后端仍会权威判定）
        const t = item.def.skill_type;
        if (t === SkillType.Normal || t === SkillType.Shenwei) {
            this._showToast(`【${item.def.name}】是${SkillTypeName[t]}，不占技能栏，无需装配`);
            return;
        }
        if (this._selectedSlotType === SlotType.Active && t === SkillType.Passive) {
            this._showToast('被动技只能装配到被动栏');
            return;
        }
        if (this._selectedSlotType === SlotType.Passive && t !== SkillType.Passive) {
            this._showToast('被动栏只能装配被动技');
            return;
        }

        this._requesting = true;
        try {
            // 成功路径由 SKILL_SLOT_CHANGED 事件回调统一处理（toast+刷新）
            const res = await SkillApi.slotSet(this._characterId,
                this._selectedSlotType, this._selectedSlotIndex, item.def.id);
            if (this._destroyed) return;
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '装配失败');
        } catch { if (!this._destroyed) this._showToast('装配请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /** 卸下：清空选中栏位（后端按 skill_id=0 处理） */
    private async _onUnequip() {
        if (this._requesting || this._destroyed) return;
        if (this._selectedSlotType <= 0 || this._selectedSlotIndex <= 0) {
            this._showToast('请先在技能栏列表点选一个栏位');
            return;
        }
        const slot = this._findSlot(this._selectedSlotType, this._selectedSlotIndex);
        if (!slot || slot.skill_id <= 0) { this._showToast('该栏位本来就是空的'); return; }

        this._requesting = true;
        try {
            const res = await SkillApi.slotSet(this._characterId,
                this._selectedSlotType, this._selectedSlotIndex, 0);
            if (this._destroyed) return;
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '卸下失败');
        } catch { if (!this._destroyed) this._showToast('卸下请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    // ═══════════════════════════════════════════
    //  写操作成功事件（生产者：SkillApi 封装层）
    // ═══════════════════════════════════════════

    private _onLearned(d: SkillLearnData) {
        let msg = `学习成功：【${d.skill.name}】（消耗${SKILL_FUSE_NEED}个碎片），剩余碎片${d.fragments}个`;
        // 走火入魔不阻断学习，但要明确提示玩家后果
        if (d.zouhuo) msg += `\n⚠ 触发走火入魔：72小时内有效精×0.5`;
        this._showToast(msg);
        this._refresh();
    }

    private _onSlotChanged(d: SlotSetData) {
        const typeName = d.slot_type === SlotType.Active ? '主动' : '被动';
        this._showToast(d.skill_id > 0
            ? `装配成功：${typeName}栏${d.slot_index} → 【${d.skill_name || d.skill_id}】`
            : `已卸下：${typeName}栏${d.slot_index}`);
        this._refresh();
    }

    // ═══════════════════════════════════════════
    //  工具方法
    // ═══════════════════════════════════════════

    /** 按技能ID在总览列表里找条目 */
    private _findSkill(skillId: number): SkillListItem | null {
        if (skillId <= 0) return null;
        return (this._info?.skill_list || []).find(i => i.def.id === skillId) || null;
    }

    /** 按栏位类型+序号找已装配记录（后端只返回有记录的行，找不到即空栏） */
    private _findSlot(slotType: number, slotIndex: number) {
        return (this._info?.slots || []).find(
            s => s.slot_type === slotType && s.slot_index === slotIndex) || null;
    }

    /** 按技能ID反查它装配在哪个栏位（同一技能最多占一个栏位） */
    private _findSlotBySkill(skillId: number) {
        if (skillId <= 0) return null;
        return (this._info?.slots || []).find(s => s.skill_id === skillId) || null;
    }

    /** 动态创建一个列表条目（Label 文本行，点击回调选中） */
    private _createItem(content: Node, index: number, text: string, colorHex: string, onTap: () => void) {
        const itemNode = new Node(`Item_${index}`);
        content.addChild(itemNode);
        itemNode.setPosition(0, -index * ITEM_HEIGHT - ITEM_HEIGHT / 2, 0);
        const label = itemNode.addComponent(Label);
        label.string = text;
        label.fontSize = 18;
        label.color = new Color().fromHEX(colorHex);
        itemNode.on(Node.EventType.TOUCH_END, onTap, this);
    }

    /** 清空列表内容节点的全部子节点 */
    private _clearChildren(content: Node) {
        const children = content.children.slice();
        for (const child of children) {
            child.destroy();
        }
    }

    /** 按条目数调整内容节点高度，保证 ScrollView 可滚动到底 */
    private _resizeContent(content: Node, count: number) {
        const ut = content.getComponent(UITransform);
        if (ut) {
            const width = ut.contentSize ? ut.contentSize.width : 300;
            ut.setContentSize(new Size(width, Math.max(count * ITEM_HEIGHT, ITEM_HEIGHT)));
        }
    }

    /** 设置按钮可点状态（节点上有 Button 组件时生效，无则仅靠点击守卫） */
    private _setInteractable(btnNode: Node | null, enable: boolean) {
        if (!btnNode) return;
        const btn = btnNode.getComponent(Button);
        if (btn) btn.interactable = enable;
    }

    private _showToast(msg: string) {
        // 面板销毁/节点失效后不再操作 UI（异步回调可能晚于 onDestroy 到达）
        if (this._destroyed || !this.toastLabel?.node?.isValid) return;
        this.toastLabel.string = msg;
        this.toastLabel.node.active = true;
        this.scheduleOnce(() => {
            // 延迟回调触发时节点可能已被销毁，用 isValid 再判一次
            if (this.toastLabel?.node?.isValid) this.toastLabel.node.active = false;
        }, 2);
    }
}
