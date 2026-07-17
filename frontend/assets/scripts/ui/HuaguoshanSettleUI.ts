/**
 * 寻仙 - 花果山副本结算 UI
 * 
 * 功能:
 *   1. 由副本战斗场景在副本结束时创建，接收 SettleData
 *   2. 展示：身份 / 结局 / 评级 / 时长 / 死亡描述 / 结局评语 / 奖励列表
 *   3. 特殊高亮：唯一性奖励（悟性+0.1）金色描边
 *   4. 点击"确认"关闭并返回世界地图
 * 
 * 数据源:
 *   - 通过 openWith(SettleData) 接收结算数据
 *   - 或订阅 HuaguoshanEvent.SETTLE 事件
 * 
 * 严格按照《花果山副本设计文档 V3》第11章「结算流程」实现。
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import { SettleData, RewardEntry, HgsRoleType, HgsOutcome } from '../net/DungeonApi';
import { EventManager } from '../manager/EventManager';
import { HuaguoshanEvent } from './HuaguoshanEntryUI';

const { ccclass, property } = _decorator;

/** 结局 → 中文名 */
const OutcomeName: Record<number, string> = {
    [HgsOutcome.Win]:        '完胜',
    [HgsOutcome.Hurt]:       '受伤',
    [HgsOutcome.Dead]:       '死亡',
    [HgsOutcome.Survive]:    '生存成功',
    [HgsOutcome.Observe]:    '观测完成',
    [HgsOutcome.StoryDeath]: '剧情死亡',
};

/** 评级 → 颜色（S 金 / A 蓝 / B 绿 / C 灰 / D 红） */
const GradeColor: Record<string, string> = {
    'S': '#FFD700',
    'A': '#3498DB',
    'B': '#2ECC71',
    'C': '#95A5A6',
    'D': '#E74C3C',
};

/** 物品ID → 中文名（对齐 huaguoshan_dungeon.sql 中的 dungeon_reward_item 约定） */
const ItemName: Record<number, string> = {
    10001: '普通材料',
    10002: '稀有材料',
    20001: '功法残卷',
    30001: '魔王兵器残块',
    30002: '魔王铠甲残块',
    90001: '悟性+0.1（全服限量）',
};

@ccclass('HuaguoshanSettleUI')
export class HuaguoshanSettleUI extends Component {

    @property(Label) titleLabel:    Label | null = null;
    @property(Label) roleLabel:     Label | null = null;
    @property(Label) outcomeLabel:  Label | null = null;
    @property(Label) gradeLabel:    Label | null = null;
    @property(Label) durationLabel: Label | null = null;
    @property(Label) observeLabel:  Label | null = null;
    @property(Label) deathTextLabel: Label | null = null;
    @property(Label) commentLabel:  Label | null = null;

    /** 奖励列表容器（内部动态生成子节点/或直接用Label拼接） */
    @property(Node)  rewardListRoot: Node | null = null;
    @property(Label) rewardSummaryLabel: Label | null = null;

    @property(Node)  confirmBtn: Node | null = null;
    @property(Label) toastLabel: Label | null = null;

    private _data: SettleData | null = null;

    onLoad() {
        this.confirmBtn?.on(Node.EventType.TOUCH_END, this._onConfirm, this);
        // 允许通过事件方式打开（战斗场景在收到结算响应后 emit 一次即可）
        EventManager.on(HuaguoshanEvent.SETTLE, this._onSettleEvent, this);
    }

    onDestroy() {
        EventManager.off(HuaguoshanEvent.SETTLE, this._onSettleEvent, this);
    }

    /** 外部主动打开时调用 */
    public openWith(data: SettleData) {
        this._data = data;
        this.node.active = true;
        this._render();
    }

    /** 事件回调：由战斗场景 emit(HuaguoshanEvent.SETTLE, data) 触发 */
    private _onSettleEvent(data: SettleData) {
        this.openWith(data);
    }

    /** 全量渲染结算数据 */
    private _render() {
        if (!this._data) return;
        const d = this._data;

        if (this.titleLabel) this.titleLabel.string = '花果山秘境·结算';

        // ── 身份 ──
        if (this.roleLabel) {
            this.roleLabel.string = `身份：${d.role_name}`;
            // 稀有身份用醒目金色
            const isRare = d.role_type === HgsRoleType.Wukong || d.role_type === HgsRoleType.Mowang;
            this.roleLabel.color = new Color().fromHEX(isRare ? '#FFD700' : '#F5F5F5');
        }

        // ── 结局 ──
        if (this.outcomeLabel) {
            const outName = OutcomeName[d.outcome] || '未知';
            this.outcomeLabel.string = `结局：${outName}`;
            // 死亡类结局用红字，生存/完胜用绿字
            const isDeath = d.outcome === HgsOutcome.Dead || d.outcome === HgsOutcome.StoryDeath;
            this.outcomeLabel.color = new Color().fromHEX(isDeath ? '#E74C3C' : '#2ECC71');
        }

        // ── 评级 ──
        if (this.gradeLabel) {
            this.gradeLabel.string = `评级：${d.grade}`;
            this.gradeLabel.color = new Color().fromHEX(GradeColor[d.grade] || '#F5F5F5');
        }

        // ── 存活时长 ──
        if (this.durationLabel) {
            const min = Math.floor(d.duration_sec / 60);
            const sec = d.duration_sec % 60;
            this.durationLabel.string = `存活：${min}分${sec}秒`;
        }

        // ── 观测度（仅草木石头显示） ──
        if (this.observeLabel) {
            if (d.role_type === HgsRoleType.Grass) {
                this.observeLabel.node.active = true;
                this.observeLabel.string = `观测度：${d.observe_score} / 100`;
                this.observeLabel.color = new Color().fromHEX('#2E8B57');
            } else {
                this.observeLabel.node.active = false;
            }
        }

        // ── 死亡描述 ──
        if (this.deathTextLabel) {
            if (d.death_text) {
                this.deathTextLabel.node.active = true;
                this.deathTextLabel.string = `——${d.death_text}——`;
                this.deathTextLabel.color = new Color().fromHEX('#8A8A9A');
            } else {
                this.deathTextLabel.node.active = false;
            }
        }

        // ── 结局评语（大圣战） ──
        if (this.commentLabel) {
            if (d.comment_text) {
                this.commentLabel.node.active = true;
                this.commentLabel.string = `「${d.comment_text}」`;
                this.commentLabel.color = new Color().fromHEX('#D4A843');
            } else {
                this.commentLabel.node.active = false;
            }
        }

        // ── 奖励列表 ──
        this._renderRewards(d.rewards || []);
    }

    /** 奖励列表渲染（用汇总Label简化，避免依赖UI预制体） */
    private _renderRewards(rewards: RewardEntry[]) {
        if (!this.rewardSummaryLabel) return;

        if (!rewards || rewards.length === 0) {
            this.rewardSummaryLabel.string = '奖励：无';
            this.rewardSummaryLabel.color = new Color().fromHEX('#8A8A9A');
            return;
        }

        // 多行拼接奖励；唯一性物品加★前缀
        const lines: string[] = ['获得奖励：'];
        for (const r of rewards) {
            const name = ItemName[r.item_id] || `物品ID_${r.item_id}`;
            if (r.is_unique === 1) {
                lines.push(`  ★ ${name} × ${r.quantity}（全服限量！）`);
            } else {
                lines.push(`  · ${name} × ${r.quantity}`);
            }
        }
        this.rewardSummaryLabel.string = lines.join('\n');

        // 若有唯一性物品，整段用金色
        const hasUnique = rewards.some(r => r.is_unique === 1);
        this.rewardSummaryLabel.color = new Color().fromHEX(hasUnique ? '#FFD700' : '#F5F5F5');
    }

    private _onConfirm() {
        this.node.active = false;
        // 通知外层玩家已确认结算（用于跳回世界地图/切场景）
        EventManager.emit('hgs:settle_confirmed');
    }
}
