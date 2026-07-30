/**
 * 寻仙 - 功法面板（功法学习·遗忘·打坐修炼）
 * 功能：
 *   1. 展示全部功法列表（品级/属性系/持有碎片x/9/完整数/是否已学/打坐速率）
 *   2. 已学功法列表（含各自加成与遗忘费用）
 *   3. 操作：学习功法（完整优先，无完整则9碎片自动合成）、遗忘功法（费用确认弹窗）
 *   4. 打坐修炼：开始 / 结算（发放完整10分钟单位的经验）/ 结束，今日额度进度展示
 *   5. 走火入魔状态展示（生效期内有效精×0.5，剩余时长倒数）
 * 数据源：GET /gongfa/list（总览） + 6个写接口（见 GongfaApi）
 *         GET /character/attributes + /character/info（学习要求前端预检用裸精气神与境界）
 *
 * 打开方式：openBtn（功法入口按钮，场景中放在常显主 UI 区域，拖入本组件属性）
 *   - 本组件挂在常驻激活节点上，面板内容根节点 panelRoot 默认隐藏
 *   - 列表条目用代码动态创建（new Node + Label，与 ShenweiPanel 同模式），不依赖预制体
 *
 * 【两套打坐体系提醒】本面板的打坐走 /gongfa/meditate/*（8005，产出精气神经验），
 *   与牢结值打坐 /fatigue/meditate/*（8007，恢复牢结值）完全独立，互不影响。
 *
 * 事件配对（生产者均为 GongfaApi 封装层，本面板只监听）：
 *   GONGFA_UPDATED     → 用 GongfaListData 全量数据渲染面板
 *   GONGFA_LEARNED     → 学习结果 toast（含走火入魔提示）+ 重新拉取 list
 *   GONGFA_FORGOTTEN   → 遗忘结果 toast（含扣费明细）+ 重新拉取 list
 *   GONGFA_MEDITATION  → 打坐状态刷新（开始/结算/结束共用）
 */

import { _decorator, Component, Label, Node, Color, ScrollView, Button, UITransform, Size } from 'cc';
import { HttpClient } from '../net/HttpClient';
import {
    GongfaApi, GongfaListData, GongfaListItem, LearnData, ForgetData, MeditateData,
    TierName, GongfaAttrTypeName, MajorStageName,
    GONGFA_FUSE_NEED, MEDITATE_DAY_CAP, SOUP_PRICE,
    LearnReqTable, calcForgetTotalCost, calcCharLevel, willTriggerZouhuo, GongfaErrorText,
} from '../net/GongfaApi';
import { GongfaEvent } from '../common/Constants';
import { EventManager } from '../manager/EventManager';
import { PlayerManager } from '../manager/PlayerManager';

const { ccclass, property } = _decorator;

// 列表条目行高（动态创建条目时的纵向排布间距）
const ITEM_HEIGHT = 36;
// 打坐自动结算间隔（秒）：面板打开且处于打坐中时，每 60 秒自动调一次 settle 领经验
const AUTO_SETTLE_INTERVAL = 60;

@ccclass('GongfaPanel')
export class GongfaPanel extends Component {

    // ─── 面板开关 ───
    @property(Node) openBtn: Node | null = null;         // 功法入口按钮（常显主 UI 区域，点击打开面板）
    @property(Node) panelRoot: Node | null = null;       // 面板内容根节点（默认隐藏，openBtn 打开）
    @property(Node) closeBtn: Node | null = null;        // 关闭按钮（隐藏面板）

    // ─── 列表区 ───
    @property(ScrollView) gongfaScrollView: ScrollView | null = null;    // 全部功法列表（条目动态创建）
    @property(ScrollView) learnedScrollView: ScrollView | null = null;   // 已学功法列表（条目动态创建）
    @property(Label) selectedInfoLabel: Label | null = null;             // 选中功法详情（含学习要求预检提示）

    // ─── 货币/道具余额 ───
    @property(Label) spiritStoneLabel: Label | null = null;   // 灵石余额
    @property(Label) soupLabel: Label | null = null;          // 孟遗汤持有数（遗忘功法消耗品）

    // ─── 走火入魔状态 ───
    @property(Label) zouhuoLabel: Label | null = null;        // 走火入魔提示（生效期内显示剩余时长）

    // ─── 打坐修炼 ───
    @property(Label) meditateStatusLabel: Label | null = null;   // 打坐状态（未打坐/打坐中 + XP速率）
    @property(Label) meditateTodayLabel: Label | null = null;    // 今日打坐进度（已用/上限4小时）
    @property(Node) meditateStartBtn: Node | null = null;        // 开始打坐按钮
    @property(Node) meditateSettleBtn: Node | null = null;       // 手动结算按钮（领取已修满的经验）
    @property(Node) meditateEndBtn: Node | null = null;          // 结束打坐按钮（先结算再归零）

    // ─── 操作按钮 ───
    @property(Node) learnBtn: Node | null = null;    // 学习按钮（有完整功法或≥9碎片可点）
    @property(Node) forgetBtn: Node | null = null;   // 遗忘按钮（已学功法可点，弹费用确认框）

    // ─── 遗忘费用确认框 ───
    @property(Node) costConfirmPanel: Node | null = null;   // 费用确认框根节点（默认隐藏）
    @property(Label) costLabel: Label | null = null;        // 费用明细文案（凡法显示免费）
    @property(Node) costConfirmBtn: Node | null = null;     // 确认遗忘按钮
    @property(Node) costCancelBtn: Node | null = null;      // 取消遗忘按钮

    // ─── Toast ───
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;

    /** 最近一次 list 全量数据（GONGFA_UPDATED 事件缓存） */
    private _info: GongfaListData | null = null;
    /** 当前选中的功法ID（0=未选中） */
    private _selectedId: number = 0;
    /** 待确认遗忘的功法ID（费用确认框上下文） */
    private _pendingForgetId: number = 0;

    /** 裸体精气神总和（学习要求前端预检用，不含神位/功法加成） */
    private _nakedSum: number = 0;
    /** 裸精/裸气/裸神（走火入魔前端预判用：品级×10 > max(三者) 触发） */
    private _nakedJing: number = 0;
    private _nakedQi: number = 0;
    private _nakedShen: number = 0;
    /** 大境界（1人阶 2真人 … 5金仙），学习要求判定用 */
    private _majorStage: number = 1;
    /** 级内等级 Lv = (小阶-1)×10 + 段格 + 1（学习要求判定用） */
    private _level: number = 1;
    /**
     * 学习要求预检上下文是否已就绪（裸精气神+境界两次请求都成功才为 true，
     * 未就绪时跳过前端预检交由后端权威判定，避免默认值误拦截合法请求）
     */
    private _reqLoaded: boolean = false;

    /** 防止重复点击：写请求进行中时忽略再次操作（与 ShenweiPanel 同模式） */
    private _requesting: boolean = false;
    /** 面板是否已销毁（异步回调可能晚于 onDestroy 到达，销毁后不再操作 UI） */
    private _destroyed: boolean = false;

    onLoad() {
        this._characterId = this._playerManager.playerId;

        // 面板开关（面板内部交互，走 TOUCH_END，与既有 UI 风格一致）
        this.openBtn?.on(Node.EventType.TOUCH_END, this._onOpen, this);
        this.closeBtn?.on(Node.EventType.TOUCH_END, this._onClose, this);

        // 学习/遗忘
        this.learnBtn?.on(Node.EventType.TOUCH_END, this._onLearn, this);
        this.forgetBtn?.on(Node.EventType.TOUCH_END, this._onForgetClick, this);

        // 遗忘费用确认框
        this.costConfirmBtn?.on(Node.EventType.TOUCH_END, this._onForgetConfirm, this);
        this.costCancelBtn?.on(Node.EventType.TOUCH_END, this._onForgetCancel, this);

        // 打坐三操作
        this.meditateStartBtn?.on(Node.EventType.TOUCH_END, this._onMeditateStart, this);
        this.meditateSettleBtn?.on(Node.EventType.TOUCH_END, this._onMeditateSettle, this);
        this.meditateEndBtn?.on(Node.EventType.TOUCH_END, this._onMeditateEnd, this);

        // 功法事件（生产者为 GongfaApi 封装层，见 Constants.GongfaEvent 配对说明）
        EventManager.on(GongfaEvent.GONGFA_UPDATED, this._onInfoUpdated, this);
        EventManager.on(GongfaEvent.GONGFA_LEARNED, this._onLearned, this);
        EventManager.on(GongfaEvent.GONGFA_FORGOTTEN, this._onForgotten, this);
        EventManager.on(GongfaEvent.GONGFA_MEDITATION, this._onMeditationUpdated, this);

        // 面板内容与确认框默认隐藏，等待 openBtn 打开
        if (this.panelRoot) this.panelRoot.active = false;
        if (this.costConfirmPanel) this.costConfirmPanel.active = false;

        // 打坐自动结算定时器：精简版 typings 无单独 unschedule，
        // 故只注册一个常驻定时器，用面板可见/打坐中/销毁标记在回调里做守卫
        this.schedule(this._autoSettleTick, AUTO_SETTLE_INTERVAL);
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
        this._selectedId = 0;
        this._refresh();
    }

    private _onOpen() {
        this.show();
    }

    private _onClose() {
        if (this.costConfirmPanel) this.costConfirmPanel.active = false;
        if (this.panelRoot) this.panelRoot.active = false;
    }

    /** 拉取功法总览 + 学习要求预检所需的裸精气神/境界 */
    private async _refresh() {
        try {
            // list 成功后 GongfaApi 会 emit GONGFA_UPDATED，渲染在事件回调里完成
            const res = await GongfaApi.list(this._characterId);
            if (this._destroyed) return;
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '功法信息加载失败');
        } catch { if (!this._destroyed) this._showToast('功法信息加载失败'); }
        this._loadLearnContext();
    }

    /**
     * 加载学习要求预检上下文：裸精气神（总和 + 三维单值）+ 大境界 + 级内等级
     * 说明：后端学习要求用"裸值总和"（防加成套娃），此处仅作前端预检提示，权威判定在后端
     */
    private async _loadLearnContext() {
        try {
            const attrRes = await HttpClient.get(`/character/attributes?character_id=${this._characterId}`);
            const infoRes = await HttpClient.get(`/character/info?character_id=${this._characterId}`);
            if (this._destroyed) return; // 面板已销毁，不再写状态/刷新 UI

            const attrOk = attrRes.code === 0 && !!attrRes.data?.base_attrs;
            const infoOk = infoRes.code === 0 && !!infoRes.data?.realm;
            if (attrOk) {
                const b = attrRes.data.base_attrs;
                this._nakedJing = b.jing || 0;
                this._nakedQi = b.qi || 0;
                this._nakedShen = b.shen || 0;
                this._nakedSum = this._nakedJing + this._nakedQi + this._nakedShen;
            }
            if (infoOk) {
                const realm = infoRes.data.realm;
                this._majorStage = Math.max(realm.major_stage, 1);
                this._level = calcCharLevel(realm.minor_stage, realm.stage_segment);
            }
            // 两次请求都成功且数据合法才认为上下文就绪；
            // 失败/异常保持 false，_onLearn 会跳过前端预检交由后端权威判定
            if (attrOk && infoOk) {
                this._reqLoaded = true;
                // 上下文就绪后主动刷新选中详情，使学习要求提示与最新裸值/境界同步
                this._refreshSelectedInfo();
            }
        } catch { /* 预检上下文加载失败保持 _reqLoaded=false，学习时由后端权威判定 */ }
    }

    /** GONGFA_UPDATED：用 list 全量数据渲染面板 */
    private _onInfoUpdated(info: GongfaListData) {
        this._info = info;
        this._renderBalance();
        this._renderZouhuo();
        this._renderMeditationStatus(info.meditation.status, info.meditation.xp_per_10min,
            info.meditation.today_seconds, info.meditation.today_remain_sec);
        this._rebuildGongfaList();
        this._rebuildLearnedList();
        this._refreshSelectedInfo();
        this._refreshButtons();
    }

    // ═══════════════════════════════════════════
    //  渲染
    // ═══════════════════════════════════════════

    /** 灵石/孟遗汤余额 */
    private _renderBalance() {
        if (this.spiritStoneLabel) this.spiritStoneLabel.string = `灵石: ${this._info?.spirit_stone ?? 0}`;
        if (this.soupLabel) {
            const price = this._info?.soup_price ?? SOUP_PRICE;
            this.soupLabel.string = `孟遗汤: ${this._info?.mengyi_soup ?? 0}（商城${price}灵石/个）`;
        }
    }

    /** 走火入魔状态：生效期内红字提示剩余时长，未走火时绿字正常 */
    private _renderZouhuo() {
        if (!this.zouhuoLabel) return;
        const z = this._info?.zouhuo;
        if (z && z.active) {
            const hours = Math.floor(z.remain_sec / 3600);
            const minutes = Math.floor((z.remain_sec % 3600) / 60);
            this.zouhuoLabel.string = `走火入魔中：有效精×0.5，剩余${hours}小时${minutes}分`;
            this.zouhuoLabel.color = new Color().fromHEX('#E74C3C');
        } else {
            this.zouhuoLabel.string = '状态正常（未走火入魔）';
            this.zouhuoLabel.color = new Color().fromHEX('#2ECC71');
        }
    }

    /** 打坐状态与今日进度（list/start/settle/end 四处共用同一渲染口径） */
    private _renderMeditationStatus(status: number, xpPer10Min: number, todaySec: number, remainSec: number) {
        if (this.meditateStatusLabel) {
            this.meditateStatusLabel.string = status === 1
                ? `打坐中：每10分钟获得${xpPer10Min}点精气神经验`
                : (xpPer10Min > 0 ? `未打坐（当前速率${xpPer10Min}XP/10分钟）` : '未打坐（需先学习一本功法）');
        }
        if (this.meditateTodayLabel) {
            const usedMin = Math.floor(todaySec / 60);
            const capMin = Math.floor(MEDITATE_DAY_CAP / 60);
            const remainMin = Math.floor(remainSec / 60);
            this.meditateTodayLabel.string = `今日打坐：${usedMin}/${capMin}分钟（剩余${remainMin}分钟额度）`;
        }
    }

    /** 重建全部功法列表（条目动态创建，点击选中） */
    private _rebuildGongfaList() {
        const content = this.gongfaScrollView?.content;
        if (!content) return;
        this._clearChildren(content);

        const list = this._info?.gongfa_list || [];
        list.forEach((item, idx) => {
            const d = item.def;
            const need = d.fuse_count || GONGFA_FUSE_NEED;
            // 已学的显示"已学"，未学的显示持有情况（完整数优先，其次碎片进度）
            const own = item.learned
                ? '已学'
                : (item.complete > 0 ? `完整×${item.complete}` : `碎片${item.fragments}/${need}`);
            const text = `${d.name} ${TierName[d.tier] || '?'} ${own}`;
            // 已学翡翠绿 / 可学（有完整或碎片够）浅蓝 / 材料不足灰，选中金色高亮
            const canLearn = !item.learned && (item.complete > 0 || item.fragments >= need);
            const color = d.id === this._selectedId
                ? '#D4A843' : (item.learned ? '#2ECC71' : (canLearn ? '#5DADE2' : '#8A8A9A'));
            this._createItem(content, idx, text, color, () => {
                this._selectedId = d.id;
                this._rebuildGongfaList();
                this._rebuildLearnedList();
                this._refreshSelectedInfo();
                this._refreshButtons();
            });
        });
        this._resizeContent(content, list.length);
    }

    /** 重建已学功法列表（展示加成与遗忘费用，点击选中） */
    private _rebuildLearnedList() {
        const content = this.learnedScrollView?.content;
        if (!content) return;
        this._clearChildren(content);

        const learned = (this._info?.gongfa_list || []).filter(i => i.learned);
        learned.forEach((item, idx) => {
            const d = item.def;
            const total = calcForgetTotalCost(item.forget_cost);
            const costText = total > 0 ? `遗忘${item.forget_cost.spirit_stone}石+${item.forget_cost.mengyi_soup}汤` : '遗忘免费';
            const text = `${d.name} 精+${d.bonus_jing} 气+${d.bonus_qi} 神+${d.bonus_shen} ${costText}`;
            const color = d.id === this._selectedId ? '#D4A843' : '#2ECC71';
            this._createItem(content, idx, text, color, () => {
                this._selectedId = d.id;
                this._rebuildGongfaList();
                this._rebuildLearnedList();
                this._refreshSelectedInfo();
                this._refreshButtons();
            });
        });
        this._resizeContent(content, learned.length);
    }

    /** 选中功法详情（学习要求预检 + 打坐速率 + 走火提示 + 遗忘费用） */
    private _refreshSelectedInfo() {
        if (!this.selectedInfoLabel) return;

        const item = this._findItem(this._selectedId);
        if (!item) {
            this.selectedInfoLabel.string = '点击列表条目查看功法详情';
            return;
        }
        const d = item.def;
        const need = d.fuse_count || GONGFA_FUSE_NEED;
        let text = `${d.name}：${TierName[d.tier] || '?'} · ${GongfaAttrTypeName[d.attr_type] || '?'}`
            + `\n加成：精+${d.bonus_jing} 气+${d.bonus_qi} 神+${d.bonus_shen}`
            + `\n打坐速率：${d.meditate_xp_per_10min}XP/10分钟；护盾恢复×${d.shield_recover_mult}`
            + `\n持有：完整${item.complete}个 / 碎片${item.fragments}/${need}`
            + `\n来源：${d.source_desc || '未知'}`;

        // 学习要求（凡法无要求；其余按品级查表，用裸值总和判定，防加成套娃）
        const req = LearnReqTable[d.tier];
        if (req && (req.major_stage > 0 || req.attr_total > 0)) {
            const stageName = MajorStageName[req.major_stage] || '?';
            if (this._reqLoaded) {
                const levelOk = this._majorStage > req.major_stage
                    || (this._majorStage === req.major_stage && this._level >= req.level);
                const attrOk = this._nakedSum >= req.attr_total;
                text += `\n学习要求：${stageName}${req.level}级（当前${MajorStageName[this._majorStage] || '?'}${this._level}级）`
                    + (levelOk ? ' ✓' : ' ✗')
                    + `；裸精气神总和≥${req.attr_total}（当前${this._nakedSum}）`
                    + (attrOk ? ' ✓' : ` ✗还差${req.attr_total - this._nakedSum}`);
            } else {
                // 上下文未就绪时不做达标判断，只展示要求数值，避免显示错误的"不达标"
                text += `\n学习要求：${stageName}${req.level}级 + 裸精气神总和≥${req.attr_total}`;
            }
        } else {
            text += '\n学习要求：凡法无要求';
        }

        // 走火入魔预判（品级×10 > max(裸精,裸气,裸神) 会触发；触发不阻断学习）
        if (!item.learned && this._reqLoaded
            && willTriggerZouhuo(d.tier, this._nakedJing, this._nakedQi, this._nakedShen)) {
            text += `\n⚠ 学习将触发走火入魔：72小时内有效精×0.5（学习仍会成功）`;
        }

        // 遗忘费用（已学功法才需要关心）
        if (item.learned) {
            const total = calcForgetTotalCost(item.forget_cost);
            text += total > 0
                ? `\n遗忘费用：灵石${item.forget_cost.spirit_stone} + 孟遗汤${item.forget_cost.mengyi_soup}张（约${total}灵石当量）`
                : '\n遗忘费用：凡法免费';
        }
        this.selectedInfoLabel.string = text;
    }

    /** 按钮可点状态（有 Button 组件时同步 interactable，点击时仍有守卫兜底） */
    private _refreshButtons() {
        const item = this._findItem(this._selectedId);
        const need = item ? (item.def.fuse_count || GONGFA_FUSE_NEED) : GONGFA_FUSE_NEED;
        // 学习：未学 且（有完整功法 或 碎片≥9可自动合成）
        this._setInteractable(this.learnBtn,
            !!item && !item.learned && (item.complete > 0 || item.fragments >= need));
        // 遗忘：仅已学功法
        this._setInteractable(this.forgetBtn, !!item && item.learned);

        // 打坐按钮：未打坐时只能"开始"，打坐中才能"结算/结束"
        const med = this._info?.meditation;
        const meditating = med?.status === 1;
        this._setInteractable(this.meditateStartBtn, !!med && !meditating && med.xp_per_10min > 0);
        this._setInteractable(this.meditateSettleBtn, meditating);
        this._setInteractable(this.meditateEndBtn, meditating);
    }

    // ═══════════════════════════════════════════
    //  操作：学习 / 遗忘
    // ═══════════════════════════════════════════

    /** 学习功法：完整优先，无完整则9碎片自动合成（功法不足 5001；已学 5002） */
    private async _onLearn() {
        if (this._requesting || this._destroyed) return;
        const item = this._findItem(this._selectedId);
        if (!item) { this._showToast('请先在功法列表选择要学习的功法'); return; }
        if (item.learned) { this._showToast(`【${item.def.name}】已经学过了，不能重复学习`); return; }

        const need = item.def.fuse_count || GONGFA_FUSE_NEED;
        if (item.complete <= 0 && item.fragments < need) {
            this._showToast(`功法不足：无完整功法，碎片${item.fragments}/${need}，还差${need - item.fragments}个`);
            return;
        }
        // 前端学习要求预检（拦截明显不足的无效请求；后端仍会权威判定）：
        // 仅在预检上下文已就绪时判定，未加载/加载失败时跳过直接交由后端判定，
        // 避免裸值/境界还是默认值时误报"要求不足"拦截合法请求
        const req = LearnReqTable[item.def.tier];
        if (req && this._reqLoaded) {
            if (req.major_stage > 0) {
                const levelOk = this._majorStage > req.major_stage
                    || (this._majorStage === req.major_stage && this._level >= req.level);
                if (!levelOk) {
                    this._showToast(`境界不足：学习需要${MajorStageName[req.major_stage] || '?'}${req.level}级`);
                    return;
                }
            }
            if (this._nakedSum < req.attr_total) {
                this._showToast(`精气神不足：需要裸值总和≥${req.attr_total}，当前${this._nakedSum}，还差${req.attr_total - this._nakedSum}`);
                return;
            }
        }

        this._requesting = true;
        try {
            // 成功路径由 GONGFA_LEARNED 事件回调统一处理（toast+刷新）
            const res = await GongfaApi.learn(this._characterId, item.def.id);
            if (this._destroyed) return; // await 期间面板已销毁，跳过 UI 操作
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '学习失败');
        } catch { if (!this._destroyed) this._showToast('学习请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /** 遗忘：凡法免费直接遗忘，其余品级先弹费用确认框（扣灵石+孟遗汤） */
    private _onForgetClick() {
        const item = this._findItem(this._selectedId);
        if (!item) { this._showToast('请先在已学列表选择要遗忘的功法'); return; }
        if (!item.learned) { this._showToast(`【${item.def.name}】尚未学习，无需遗忘`); return; }

        this._pendingForgetId = item.def.id;

        const cost = item.forget_cost;
        const total = calcForgetTotalCost(cost); // 灵石当量总成本（孟遗汤按 SOUP_PRICE 折算）

        // 凡法（总成本为0，无任何实际扣费）：按需求约定一次点击直接遗忘，不弹确认框
        if (total <= 0) {
            this._onForgetConfirm();
            return;
        }

        // 灵法/仙法/道法：有实际扣费，必须先弹确认框让玩家确认费用与加成回退
        if (this.costLabel) {
            this.costLabel.string = `遗忘【${item.def.name}】（${TierName[item.def.tier] || '?'}）\n`
                + `费用：灵石${cost.spirit_stone} + 孟遗汤${cost.mengyi_soup}张（约${total}灵石当量）\n`
                + `注意：加成回退（精-${item.def.bonus_jing} 气-${item.def.bonus_qi} 神-${item.def.bonus_shen}），功法本体不返还，确认遗忘？`;
        }
        if (this.costConfirmPanel) this.costConfirmPanel.active = true;
    }

    /** 费用确认框：确认遗忘（未学习 5003；灵石不足 5010；孟遗汤不足 5011） */
    private async _onForgetConfirm() {
        if (this._requesting || this._destroyed) return;
        // 上下文丢失（未选功法/状态被重置）：给出提示便于排查，并复位确认框
        if (this._pendingForgetId <= 0) {
            this._showToast('遗忘上下文异常，请重新选择功法再尝试');
            this._onForgetCancel();
            return;
        }
        this._requesting = true;
        try {
            const res = await GongfaApi.forget(this._characterId, this._pendingForgetId);
            if (this._destroyed) return; // await 期间面板已销毁，跳过 UI 操作
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '遗忘失败');
        } catch { if (!this._destroyed) this._showToast('遗忘请求失败'); }
        finally {
            // 面板已销毁时节点可能失效，不再复位状态/操作确认框
            if (!this._destroyed) {
                this._requesting = false;
                this._onForgetCancel(); // 无论成败都关闭确认框（结果由 toast 呈现）
            }
        }
    }

    /** 费用确认框：取消 */
    private _onForgetCancel() {
        this._pendingForgetId = 0;
        if (this.costConfirmPanel) this.costConfirmPanel.active = false;
    }

    // ═══════════════════════════════════════════
    //  操作：打坐（开始 / 结算 / 结束）
    // ═══════════════════════════════════════════

    /** 开始打坐（未学功法 5033；已在打坐 5030；今日已满4小时 5032） */
    private async _onMeditateStart() {
        if (this._requesting || this._destroyed) return;
        this._requesting = true;
        try {
            const res = await GongfaApi.meditateStart(this._characterId);
            if (this._destroyed) return;
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '开始打坐失败');
        } catch { if (!this._destroyed) this._showToast('开始打坐请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /** 手动结算打坐（未在打坐 5031；不满10分钟时 units=0 属正常情况） */
    private async _onMeditateSettle() {
        if (this._requesting || this._destroyed) return;
        this._requesting = true;
        try {
            const res = await GongfaApi.meditateSettle(this._characterId);
            if (this._destroyed) return;
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '结算失败');
        } catch { if (!this._destroyed) this._showToast('结算请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /** 结束打坐（后端先做最后一次结算再归零；未在打坐 5031） */
    private async _onMeditateEnd() {
        if (this._requesting || this._destroyed) return;
        this._requesting = true;
        try {
            const res = await GongfaApi.meditateEnd(this._characterId);
            if (this._destroyed) return;
            if (res.code !== 0) this._showToast(GongfaErrorText[res.code] || res.msg || '结束打坐失败');
        } catch { if (!this._destroyed) this._showToast('结束打坐请求失败'); }
        finally { if (!this._destroyed) this._requesting = false; }
    }

    /**
     * 打坐自动结算定时器回调（每 AUTO_SETTLE_INTERVAL 秒触发一次）：
     * 只在"面板可见 + 处于打坐中 + 无在途请求 + 未销毁"时静默调用一次结算，
     * 这样玩家挂着面板打坐时能自动领到已修满的经验，无需反复点按钮
     */
    private _autoSettleTick() {
        if (this._destroyed || this._requesting) return;
        if (!this.panelRoot?.active) return;
        if (this._info?.meditation?.status !== 1) return;
        this._onMeditateSettle();
    }

    // ═══════════════════════════════════════════
    //  写操作成功事件（生产者：GongfaApi 封装层）
    // ═══════════════════════════════════════════

    private _onLearned(d: LearnData) {
        const way = d.consumed === 'fragments' ? `消耗${GONGFA_FUSE_NEED}个碎片合成` : '消耗1本完整功法';
        let msg = `学习成功：【${d.gongfa.name}】（${way}），精+${d.bonus.jing} 气+${d.bonus.qi} 神+${d.bonus.shen}`;
        // 走火入魔不阻断学习，但要明确提示玩家后果
        if (d.zouhuo) msg += `\n⚠ 触发走火入魔：72小时内有效精×0.5`;
        this._showToast(msg);
        this._refresh();
    }

    private _onForgotten(d: ForgetData) {
        const total = calcForgetTotalCost(d.cost);
        this._showToast(total > 0
            ? `遗忘成功：扣灵石${d.cost.spirit_stone}、孟遗汤${d.cost.mengyi_soup}张，加成已回退`
            : '遗忘成功：凡法免费，加成已回退');
        this._refresh();
    }

    /** GONGFA_MEDITATION：开始/结算/结束共用，按返回字段刷新状态与提示 */
    private _onMeditationUpdated(d: MeditateData) {
        // 状态区先按最新数据渲染（避免等待下一次 list 才更新）
        this._renderMeditationStatus(d.status, d.xp_per_10min, d.today_seconds, d.today_remain_sec);
        if (this._info) {
            this._info.meditation.status = d.status;
            this._info.meditation.xp_per_10min = d.xp_per_10min;
            this._info.meditation.today_seconds = d.today_seconds;
            this._info.meditation.today_remain_sec = d.today_remain_sec;
        }
        this._refreshButtons();

        // units 字段只有结算/结束接口才返回，用它区分"开始打坐"与"结算类"提示
        if (d.units === undefined) {
            this._showToast(`开始打坐：每10分钟获得${d.xp_per_10min}点精气神经验`);
            return;
        }
        const ended = d.status === 0;
        const gained = d.xp_gained ?? 0;
        if (gained > 0) {
            const upgradeTip = d.can_upgrade ? '，可以突破了' : '';
            this._showToast(`${ended ? '已结束打坐' : '打坐结算'}：修满${d.units}个10分钟，获得${gained}点精气神经验${upgradeTip}`);
        } else if (ended) {
            this._showToast('已结束打坐：本次不满10分钟，无经验发放');
        }
        // 结算/结束后拉一次总览，同步经验、今日额度与走火状态
        this._refresh();
    }

    // ═══════════════════════════════════════════
    //  工具方法
    // ═══════════════════════════════════════════

    /** 按功法ID在总览列表里找条目 */
    private _findItem(gongfaId: number): GongfaListItem | null {
        if (gongfaId <= 0) return null;
        return (this._info?.gongfa_list || []).find(i => i.def.id === gongfaId) || null;
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
