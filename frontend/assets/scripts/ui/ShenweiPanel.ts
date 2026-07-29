/**
 * 寻仙 - 神位面板（花果山神位继承系统）
 * 功能：
 *   1. 展示当前激活神位（名称/品级/属性系/阶位/精气神加成）、灵石与归元符余额
 *   2. 背包列表（区分已继承/未继承）、碎片列表（含 x/7 合成进度）
 *   3. 操作：碎片合成（≥7可点）、融合（9同品级同属性系→高一阶）、
 *      继承（展示门槛并前端预检）、切换（弹费用确认，晋升场景显示免费）
 * 数据源：GET /shenwei/info（总览） + 4个写接口（见 ShenweiApi）
 *         GET /character/attributes + /character/info（继承门槛前端预检用裸精气神与等级）
 *
 * 打开方式：openBtn（神位入口按钮，场景中放在常显主 UI 区域，拖入本组件属性）
 *   - 本组件挂在常驻激活节点上，面板内容根节点 panelRoot 默认隐藏
 *   - 列表条目用代码动态创建（new Node + Label，与 PlayerEntity/NPCEntity 同模式），不依赖预制体
 *
 * 事件配对（生产者均为 ShenweiApi 封装层，本面板只监听）：
 *   SHENWEI_UPDATED      → 用 ShenweiInfo 全量数据渲染面板
 *   SHENWEI_SYNTHESIZED  → 合成结果 toast + 重新拉取 info
 *   SHENWEI_FUSED        → 融合结果 toast + 重新拉取 info
 *   SHENWEI_INHERITED    → 继承结果 toast + 重新拉取 info
 *   SHENWEI_SWITCHED     → 切换结果 toast（晋升免费/扣费明细）+ 重新拉取 info
 */

import { _decorator, Component, Label, Node, Color, ScrollView, Button, UITransform, Size } from 'cc';
import { HttpClient } from '../net/HttpClient';
import {
    ShenweiApi, ShenweiInfo, ShenweiBagItem, FragmentItem,
    SynthesizeData, FuseData, InheritData, SwitchData,
    GradeName, AttrTypeName, RankTypeName, ShenweiGrade,
    SYNTHESIZE_NEED, FUSE_NEED, TALISMAN_PRICE,
    SwitchCostTable, calcInheritThreshold, ShenweiErrorText,
} from '../net/ShenweiApi';
import { ShenweiEvent } from '../common/Constants';
import { EventManager } from '../manager/EventManager';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

// 列表条目行高（动态创建条目时的纵向排布间距）
const ITEM_HEIGHT = 36;

@ccclass('ShenweiPanel')
export class ShenweiPanel extends Component {

    // ─── 面板开关 ───
    @property(Node) openBtn: Node | null = null;         // 神位入口按钮（常显主 UI 区域，点击打开面板）
    @property(Node) panelRoot: Node | null = null;       // 面板内容根节点（默认隐藏，openBtn 打开）
    @property(Node) closeBtn: Node | null = null;        // 关闭按钮（隐藏面板）

    // ─── 当前激活神位 ───
    @property(Label) currentNameLabel: Label | null = null;   // 当前神位名称（未激活显示"未激活神位"）
    @property(Label) currentMetaLabel: Label | null = null;   // 品级·属性系·阶位
    @property(Label) currentBonusLabel: Label | null = null;  // 精气神加成（精+X 气+X 神+X）

    // ─── 货币余额 ───
    @property(Label) spiritStoneLabel: Label | null = null;   // 灵石余额
    @property(Label) talismanLabel: Label | null = null;      // 归元符持有数

    // ─── 背包/碎片列表 ───
    @property(ScrollView) bagScrollView: ScrollView | null = null;       // 背包列表（条目动态创建）
    @property(ScrollView) fragmentScrollView: ScrollView | null = null;  // 碎片列表（条目动态创建）
    @property(Label) selectedInfoLabel: Label | null = null;  // 选中条目详情（含继承门槛预检提示）

    // ─── 操作按钮 ───
    @property(Node) synthesizeBtn: Node | null = null;   // 合成按钮（选中碎片≥7可点）
    @property(Node) fuseBtn: Node | null = null;         // 融合按钮（选中背包神位≥9可点）
    @property(Node) inheritBtn: Node | null = null;      // 继承按钮（前端预检门槛后提交）
    @property(Node) switchBtn: Node | null = null;       // 切换按钮（弹费用确认框）

    // ─── 切换费用确认框 ───
    @property(Node) costConfirmPanel: Node | null = null;   // 费用确认框根节点（默认隐藏）
    @property(Label) costLabel: Label | null = null;        // 费用明细文案（晋升显示免费）
    @property(Node) costConfirmBtn: Node | null = null;     // 确认切换按钮
    @property(Node) costCancelBtn: Node | null = null;      // 取消切换按钮

    // ─── Toast ───
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    /** 最近一次 info 全量数据（SHENWEI_UPDATED 事件缓存） */
    private _info: ShenweiInfo | null = null;
    /** 当前选中的背包神位ID（0=未选中） */
    private _selectedBagId: number = 0;
    /** 当前选中的碎片目标神位ID（0=未选中） */
    private _selectedFragId: number = 0;
    /** 裸体精气神总和（继承门槛前端预检用，不含神位加成） */
    private _nakedSum: number = 0;
    /** 角色等级 Lv = (minor_stage-1)×10 + stage_segment + 1（门槛公式用） */
    private _level: number = 1;
    /** 待确认切换的目标神位ID（费用确认框上下文） */
    private _pendingSwitchId: number = 0;

    /** 防止重复点击：写请求进行中时忽略再次操作（与 WashPointUI 同模式） */
    private _requesting: boolean = false;
    /** 继承门槛预检上下文是否已就绪（裸精气神+等级两次请求都成功才为 true，
     *  未就绪时跳过前端预检交由后端权威判定，避免默认值误拦截合法请求） */
    private _thresholdLoaded: boolean = false;
    /** 面板是否已销毁（异步回调可能晚于 onDestroy 到达，销毁后不再操作 UI） */
    private _destroyed: boolean = false;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        // 面板开关（面板内部交互，走 TOUCH_END，与既有 UI 风格一致）
        this.openBtn?.on(Node.EventType.TOUCH_END, this._onOpen, this);
        this.closeBtn?.on(Node.EventType.TOUCH_END, this._onClose, this);

        // 操作按钮
        this.synthesizeBtn?.on(Node.EventType.TOUCH_END, this._onSynthesize, this);
        this.fuseBtn?.on(Node.EventType.TOUCH_END, this._onFuse, this);
        this.inheritBtn?.on(Node.EventType.TOUCH_END, this._onInherit, this);
        this.switchBtn?.on(Node.EventType.TOUCH_END, this._onSwitchClick, this);

        // 切换费用确认框
        this.costConfirmBtn?.on(Node.EventType.TOUCH_END, this._onSwitchConfirm, this);
        this.costCancelBtn?.on(Node.EventType.TOUCH_END, this._onSwitchCancel, this);

        // 神位事件（生产者为 ShenweiApi 封装层，见 Constants.ShenweiEvent 配对说明）
        EventManager.on(ShenweiEvent.SHENWEI_UPDATED, this._onInfoUpdated, this);
        EventManager.on(ShenweiEvent.SHENWEI_SYNTHESIZED, this._onSynthesized, this);
        EventManager.on(ShenweiEvent.SHENWEI_FUSED, this._onFused, this);
        EventManager.on(ShenweiEvent.SHENWEI_INHERITED, this._onInherited, this);
        EventManager.on(ShenweiEvent.SHENWEI_SWITCHED, this._onSwitched, this);

        // 面板内容与确认框默认隐藏，等待 openBtn 打开
        if (this.panelRoot) this.panelRoot.active = false;
        if (this.costConfirmPanel) this.costConfirmPanel.active = false;
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
        this._selectedBagId = 0;
        this._selectedFragId = 0;
        this._refresh();
    }

    private _onOpen() {
        this.show();
    }

    private _onClose() {
        if (this.costConfirmPanel) this.costConfirmPanel.active = false;
        if (this.panelRoot) this.panelRoot.active = false;
    }

    /** 拉取神位总览 + 门槛预检所需的裸精气神/等级 */
    private async _refresh() {
        try {
            // getInfo 成功后 ShenweiApi 会 emit SHENWEI_UPDATED，渲染在事件回调里完成
            const res = await ShenweiApi.getInfo(this._characterId);
            if (res.code !== 0) this._showToast(ShenweiErrorText[res.code] || res.msg || '神位信息加载失败');
        } catch { this._showToast('神位信息加载失败'); }
        this._loadThresholdContext();
    }

    /**
     * 加载继承门槛预检上下文：裸体精气神总和 + 角色等级
     * 说明：后端门槛判定用"裸值总和"（不含神位加成），此处仅作前端预检提示，权威判定在后端
     */
    private async _loadThresholdContext() {
        try {
            const attrRes = await HttpClient.get(`/character/attributes?character_id=${this._characterId}`);
            const infoRes = await HttpClient.get(`/character/info?character_id=${this._characterId}`);
            if (this._destroyed) return; // 面板已销毁，不再写状态/刷新 UI

            const attrOk = attrRes.code === 0 && !!attrRes.data?.base_attrs;
            const infoOk = infoRes.code === 0 && !!infoRes.data?.realm;
            if (attrOk) {
                const b = attrRes.data.base_attrs;
                this._nakedSum = (b.jing || 0) + (b.qi || 0) + (b.shen || 0);
            }
            if (infoOk) {
                const realm = infoRes.data.realm;
                // Lv = (minor_stage-1)×10 + stage_segment + 1，与后端 CharacterLevel 同公式
                this._level = (Math.max(realm.minor_stage, 1) - 1) * 10 + Math.max(realm.stage_segment, 0) + 1;
            }
            // 两次请求都成功且数据合法才认为上下文就绪；
            // 失败/异常保持 false，_onInherit 会跳过前端预检交由后端权威判定
            if (attrOk && infoOk) {
                this._thresholdLoaded = true;
                // 上下文就绪后主动刷新选中详情，使门槛提示与最新裸值/等级同步
                this._refreshSelectedInfo();
            }
        } catch { /* 预检上下文加载失败保持 _thresholdLoaded=false，继承时由后端权威判定 */ }
    }

    /** SHENWEI_UPDATED：用 info 全量数据渲染面板 */
    private _onInfoUpdated(info: ShenweiInfo) {
        this._info = info;
        this._renderCurrent();
        this._renderBalance();
        this._rebuildBagList();
        this._rebuildFragmentList();
        this._refreshSelectedInfo();
        this._refreshButtons();
    }

    // ═══════════════════════════════════════════
    //  渲染
    // ═══════════════════════════════════════════

    /** 当前激活神位区域 */
    private _renderCurrent() {
        const cur = this._info?.current;
        if (this.currentNameLabel) {
            this.currentNameLabel.string = cur ? cur.name : '未激活神位';
        }
        if (this.currentMetaLabel) {
            if (cur) {
                const rank = RankTypeName[cur.rank_type] ? ` · ${RankTypeName[cur.rank_type]}阶` : '';
                this.currentMetaLabel.string = `${GradeName[cur.grade] || '?'} · ${AttrTypeName[cur.attr_type] || '?'}${rank}`;
            } else {
                this.currentMetaLabel.string = '请先继承一个神位';
            }
        }
        if (this.currentBonusLabel) {
            this.currentBonusLabel.string = cur
                ? `加成：精+${cur.bonus_jing} 气+${cur.bonus_qi} 神+${cur.bonus_shen}`
                : '';
        }
    }

    /** 灵石/归元符余额 */
    private _renderBalance() {
        if (this.spiritStoneLabel) this.spiritStoneLabel.string = `灵石: ${this._info?.spirit_stone ?? 0}`;
        if (this.talismanLabel) this.talismanLabel.string = `归元符: ${this._info?.talisman_count ?? 0}`;
    }

    /** 重建背包列表（条目动态创建，点击选中） */
    private _rebuildBagList() {
        const content = this.bagScrollView?.content;
        if (!content) return;
        this._clearChildren(content);

        const bag = this._info?.bag || [];
        bag.forEach((item, idx) => {
            const inheritedTag = item.inherited ? '[已继承]' : '[未继承]';
            const text = `${item.name} ×${item.count} ${GradeName[item.grade] || '?'} ${inheritedTag}`;
            // 已继承翡翠绿 / 未继承灰，选中金色高亮
            const color = item.shenwei_id === this._selectedBagId
                ? '#D4A843' : (item.inherited ? '#2ECC71' : '#8A8A9A');
            this._createItem(content, idx, text, color, () => {
                this._selectedBagId = item.shenwei_id;
                this._selectedFragId = 0;
                this._rebuildBagList();
                this._rebuildFragmentList();
                this._refreshSelectedInfo();
                this._refreshButtons();
            });
        });
        this._resizeContent(content, bag.length);
    }

    /** 重建碎片列表（含 x/7 合成进度，点击选中） */
    private _rebuildFragmentList() {
        const content = this.fragmentScrollView?.content;
        if (!content) return;
        this._clearChildren(content);

        const fragments = this._info?.fragments || [];
        fragments.forEach((item, idx) => {
            const need = item.need || SYNTHESIZE_NEED;
            const text = `${item.name}碎片 ${item.count}/${need}`;
            // 够合成翡翠绿 / 不够灰，选中金色高亮
            const color = item.shenwei_id === this._selectedFragId
                ? '#D4A843' : (item.count >= need ? '#2ECC71' : '#8A8A9A');
            this._createItem(content, idx, text, color, () => {
                this._selectedFragId = item.shenwei_id;
                this._selectedBagId = 0;
                this._rebuildBagList();
                this._rebuildFragmentList();
                this._refreshSelectedInfo();
                this._refreshButtons();
            });
        });
        this._resizeContent(content, fragments.length);
    }

    /** 选中条目详情（含继承门槛与前端预检提示） */
    private _refreshSelectedInfo() {
        if (!this.selectedInfoLabel) return;

        const bagItem = this._findBagItem(this._selectedBagId);
        if (bagItem) {
            let text = `${bagItem.name}：${GradeName[bagItem.grade] || '?'} · ${AttrTypeName[bagItem.attr_type] || '?'} · 持有${bagItem.count}个`
                + `\n${bagItem.inherited ? '已继承（可付费切换激活）' : '未继承'}`;
            // 继承门槛展示与预检（凡品无门槛；门槛=base+perLevel×(Lv-1)，裸精气神总和达标）
            if (bagItem.grade > ShenweiGrade.Fan) {
                const threshold = calcInheritThreshold(bagItem.grade, this._level);
                const ok = this._nakedSum >= threshold;
                text += `\n继承门槛：裸精气神总和≥${threshold}（Lv${this._level}），当前${this._nakedSum}`
                    + (ok ? ' ✓已达标' : ` ✗还差${threshold - this._nakedSum}`);
            } else {
                text += '\n继承门槛：凡品无要求';
            }
            this.selectedInfoLabel.string = text;
            return;
        }

        const fragItem = this._findFragment(this._selectedFragId);
        if (fragItem) {
            const need = fragItem.need || SYNTHESIZE_NEED;
            this.selectedInfoLabel.string = `${fragItem.name}碎片：${fragItem.count}/${need}`
                + (fragItem.count >= need ? '，可合成' : `，还差${need - fragItem.count}个`);
            return;
        }
        this.selectedInfoLabel.string = '点击列表条目查看详情';
    }

    /** 按钮可点状态（有 Button 组件时同步 interactable，点击时仍有守卫兜底） */
    private _refreshButtons() {
        const frag = this._findFragment(this._selectedFragId);
        this._setInteractable(this.synthesizeBtn, !!frag && frag.count >= (frag.need || SYNTHESIZE_NEED));

        const bagItem = this._findBagItem(this._selectedBagId);
        this._setInteractable(this.fuseBtn, !!bagItem && bagItem.count >= FUSE_NEED);
        this._setInteractable(this.inheritBtn, !!bagItem && bagItem.count >= 1);
        this._setInteractable(this.switchBtn, !!bagItem && bagItem.inherited);
    }

    // ═══════════════════════════════════════════
    //  操作：合成 / 融合 / 继承 / 切换
    // ═══════════════════════════════════════════

    /** 合成：7碎片 → 1完整神位（碎片不足 4001） */
    private async _onSynthesize() {
        if (this._requesting || this._destroyed) return;
        const frag = this._findFragment(this._selectedFragId);
        if (!frag) { this._showToast('请先在碎片列表选择要合成的神位碎片'); return; }
        const need = frag.need || SYNTHESIZE_NEED;
        if (frag.count < need) {
            this._showToast(`碎片不足：${frag.count}/${need}，还差${need - frag.count}个`);
            return;
        }
        this._requesting = true;
        try {
            // 成功路径由 SHENWEI_SYNTHESIZED 事件回调统一处理（toast+刷新）
            const res = await ShenweiApi.synthesize(this._characterId, frag.shenwei_id);
            if (this._destroyed) return; // await 期间面板已销毁，跳过 UI 操作
            if (res.code !== 0) this._showToast(ShenweiErrorText[res.code] || res.msg || '合成失败');
        } catch { if (!this._destroyed) this._showToast('合成请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /** 融合：9同品级同属性系 → 高一阶（材料不足 4002；已最高阶 4003） */
    private async _onFuse() {
        if (this._requesting || this._destroyed) return;
        const bagItem = this._findBagItem(this._selectedBagId);
        if (!bagItem) { this._showToast('请先在背包列表选择融合材料神位'); return; }
        if (bagItem.count < FUSE_NEED) {
            this._showToast(`融合材料不足：需要${FUSE_NEED}个【${bagItem.name}】，当前${bagItem.count}个`);
            return;
        }
        this._requesting = true;
        try {
            const res = await ShenweiApi.fuse(this._characterId, bagItem.shenwei_id);
            if (this._destroyed) return; // await 期间面板已销毁，跳过 UI 操作
            if (res.code !== 0) this._showToast(ShenweiErrorText[res.code] || res.msg || '融合失败');
        } catch { if (!this._destroyed) this._showToast('融合请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /** 继承：消耗1完整神位，永久解锁+激活（门槛不足 4010；需先继承下属 4012） */
    private async _onInherit() {
        if (this._requesting || this._destroyed) return;
        const bagItem = this._findBagItem(this._selectedBagId);
        if (!bagItem) { this._showToast('请先在背包列表选择要继承的神位'); return; }
        if (bagItem.count < 1) { this._showToast(`背包中没有完整的【${bagItem.name}】`); return; }
        // 前端门槛预检（拦截明显不足的无效请求；后端仍会权威判定）：
        // 仅在门槛上下文已就绪时预检，未加载/加载失败时跳过直接交由后端判定，
        // 避免 _nakedSum/_level 还是默认值时误报"精气神不足"拦截合法请求
        if (bagItem.grade > ShenweiGrade.Fan && this._thresholdLoaded) {
            const threshold = calcInheritThreshold(bagItem.grade, this._level);
            if (this._nakedSum < threshold) {
                this._showToast(`精气神不足：继承需要裸精气神总和≥${threshold}，当前${this._nakedSum}，还差${threshold - this._nakedSum}`);
                return;
            }
        }
        this._requesting = true;
        try {
            const res = await ShenweiApi.inherit(this._characterId, bagItem.shenwei_id);
            if (this._destroyed) return; // await 期间面板已销毁，跳过 UI 操作
            if (res.code !== 0) this._showToast(ShenweiErrorText[res.code] || res.msg || '继承失败');
        } catch { if (!this._destroyed) this._showToast('继承请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /** 切换：先弹费用确认框（晋升免费/普通切换按旧神位品级扣费） */
    private _onSwitchClick() {
        const bagItem = this._findBagItem(this._selectedBagId);
        if (!bagItem) { this._showToast('请先在背包列表选择要切换的神位'); return; }
        if (!bagItem.inherited) { this._showToast(`【${bagItem.name}】尚未继承，请先继承后再切换`); return; }
        const cur = this._info?.current;
        if (!cur) { this._showToast('当前未激活任何神位，请先通过继承激活首个神位'); return; }
        if (cur.id === bagItem.shenwei_id) { this._showToast('该神位已是当前激活神位'); return; }

        this._pendingSwitchId = bagItem.shenwei_id;
        // 费用预估：目标是当前神位的上位 → 晋升免费；否则按旧(当前)神位品级扣费。
        // 前端只做单步上位判断用于展示（当前数据仅美猴王→齐天大圣一条链），权威判定在后端
        if (this.costLabel) {
            if (cur.superior_id === bagItem.shenwei_id) {
                this.costLabel.string = `晋升【${bagItem.name}】：上位链晋升，免费！`;
            } else {
                const cost = SwitchCostTable[cur.grade] || { spiritStone: 0, talismanCount: 0 };
                const total = cost.spiritStone + cost.talismanCount * TALISMAN_PRICE;
                this.costLabel.string = `切换到【${bagItem.name}】\n`
                    + `费用（按当前${GradeName[cur.grade] || '?'}神位）：灵石${cost.spiritStone} + 归元符${cost.talismanCount}张\n`
                    + `总成本约${total}灵石当量，确认切换？`;
            }
        }
        if (this.costConfirmPanel) this.costConfirmPanel.active = true;
    }

    /** 费用确认框：确认切换（灵石不足 4020；归元符不足 4021） */
    private async _onSwitchConfirm() {
        if (this._requesting || this._destroyed) return;
        if (this._pendingSwitchId <= 0) { this._onSwitchCancel(); return; }
        this._requesting = true;
        try {
            const res = await ShenweiApi.switchTo(this._characterId, this._pendingSwitchId);
            if (this._destroyed) return; // await 期间面板已销毁，跳过 UI 操作
            if (res.code !== 0) this._showToast(ShenweiErrorText[res.code] || res.msg || '切换失败');
        } catch { if (!this._destroyed) this._showToast('切换请求失败'); }
        finally {
            // 面板已销毁时节点可能失效，不再复位状态/操作确认框
            if (!this._destroyed) {
                this._requesting = false;
                this._onSwitchCancel(); // 无论成败都关闭确认框（结果由 toast 呈现）
            }
        }
    }

    /** 费用确认框：取消 */
    private _onSwitchCancel() {
        this._pendingSwitchId = 0;
        if (this.costConfirmPanel) this.costConfirmPanel.active = false;
    }

    // ═══════════════════════════════════════════
    //  写操作成功事件（生产者：ShenweiApi 封装层）
    // ═══════════════════════════════════════════

    private _onSynthesized(d: SynthesizeData) {
        this._showToast(`合成成功：获得【${d.shenwei_name}】×1，剩余碎片${d.fragments_left}个`);
        this._refresh();
    }

    private _onFused(d: FuseData) {
        this._showToast(`融合成功：${d.material_consumed}个【${d.material_name}】→【${d.product_name}】(${GradeName[d.product_grade] || '?'})`);
        this._refresh();
    }

    private _onInherited(d: InheritData) {
        this._showToast(`继承成功：【${d.shenwei_name}】已激活（精+${d.bonus.jing} 气+${d.bonus.qi} 神+${d.bonus.shen}）`);
        this._refresh();
    }

    private _onSwitched(d: SwitchData) {
        if (d.is_promotion) {
            this._showToast(`晋升成功：已切换至【${d.new_name}】，上位链晋升免费`);
        } else {
            this._showToast(`切换成功：已激活【${d.new_name}】，扣灵石${d.spirit_stone}、归元符${d.talisman_count}张`);
        }
        this._refresh();
    }

    // ═══════════════════════════════════════════
    //  工具方法
    // ═══════════════════════════════════════════

    private _findBagItem(shenweiId: number): ShenweiBagItem | null {
        if (shenweiId <= 0) return null;
        return (this._info?.bag || []).find(i => i.shenwei_id === shenweiId) || null;
    }

    private _findFragment(shenweiId: number): FragmentItem | null {
        if (shenweiId <= 0) return null;
        return (this._info?.fragments || []).find(i => i.shenwei_id === shenweiId) || null;
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
