/**
 * 寻仙 - V5 死亡三选一 UI（鬼修 / 尸修 / 轮回）
 *
 * 功能：
 *   - 死亡触发后展示三选一弹窗（数据源 POST /death/trigger 响应 options），
 *     并展示夺舍规则速览 possess_hint 与死亡自动设立的秘境信息
 *   - 尸修（V5 新增）：options 中 corpse_cultivation 项 can_possess=false，
 *     点击先弹"选尸修即放弃夺舍"的二次确认，确认后调 POST /death/corpse/enter，
 *     成功展示属性转换前后对照（神→0永久，精=原精+神×2/3，气÷3）
 *   - 鬼修：POST /death/ghost/enter（与既有 DeathChoiceUI 同一后端接口）
 *   - 轮回：POST /death/reincarnation（六道由因果值随机分配）
 *
 * 与既有 DeathChoiceUI 的关系：DeathChoiceUI 是旧版"六道详情+鬼修"面板，
 * 本组件是 V5 死亡总入口（三选一），选轮回后可再打开 DeathChoiceUI 看六道详情
 *
 * 事件：
 *   - 监听 SamsaraEvent.DEATH_OPTIONS_UPDATED（生产者 SamsaraApi.trigger，
 *     由 HallScene 死亡流程调用）渲染选项并激活本面板
 *   - 监听 SamsaraEvent.CORPSE_ENTERED（生产者 SamsaraApi）展示属性转换结果
 *   - 监听 SamsaraEvent.CORPSE_EXITED（生产者 SamsaraApi）展示"已退出尸修"提示
 *
 * 节点结构约定（编辑器搭建）：
 *   CorpseCultivationUI（挂本脚本，平时隐藏）
 *   ├─ TitleLabel        标题（Label）
 *   ├─ PossessHintLabel  夺舍规则速览（Label）
 *   ├─ RuinInfoLabel     秘境信息（Label：死亡自动设立的秘境ID/存入灵石）
 *   ├─ ReincarnationBtn  轮回按钮（Node，含子节点 DescLabel）
 *   ├─ GhostBtn          鬼修按钮（Node，含子节点 DescLabel）
 *   ├─ CorpseBtn         尸修按钮（Node，含子节点 DescLabel）
 *   ├─ ResultLabel       结果展示（Label）
 *   └─ ToastLabel        提示文字（Label，平时隐藏）
 */

import { _decorator, Component, Label, Node, Color } from 'cc';
import {
    SamsaraApi, DeathTriggerData, CorpseEnterData,
    ERR_CORPSE_GHOST_CONFLICT, ERR_CORPSE_ALREADY_IN, SamsaraErrorText,
} from '../net/SamsaraApi';
import { HttpClient } from '../net/HttpClient';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager } from '../manager/EventManager';
import { SamsaraEvent } from '../common/Constants';

const { ccclass, property } = _decorator;

@ccclass('CorpseCultivationUI')
export class CorpseCultivationUI extends Component {

    @property(Label) titleLabel: Label | null = null;
    @property(Label) possessHintLabel: Label | null = null;   // 夺舍规则速览
    @property(Label) ruinInfoLabel: Label | null = null;       // 死亡自动设立的秘境信息
    @property(Node) reincarnationBtn: Node | null = null;      // 轮回按钮
    @property(Node) ghostBtn: Node | null = null;              // 鬼修按钮
    @property(Node) corpseBtn: Node | null = null;             // 尸修按钮
    @property(Label) resultLabel: Label | null = null;
    @property(Label) toastLabel: Label | null = null;

    private _playerManager: PlayerManager = new PlayerManager();
    private _characterId: number = 0;
    // 请求防重入
    private _busy: boolean = false;
    // 尸修二次确认标记：第一次点弹警告，5秒内再点才真正执行
    private _corpseConfirming: boolean = false;

    onLoad() {
        this._characterId = this._playerManager.playerId;
        if (this.titleLabel) this.titleLabel.string = '身死道消 · 何去何从';

        this.reincarnationBtn?.on(Node.EventType.TOUCH_END, this._onReincarnation, this);
        this.ghostBtn?.on(Node.EventType.TOUCH_END, this._onGhostEnter, this);
        this.corpseBtn?.on(Node.EventType.TOUCH_END, this._onCorpseEnter, this);

        // 监听死亡三选一数据（HallScene 死亡流程调 SamsaraApi.trigger 后广播）
        EventManager.on(SamsaraEvent.DEATH_OPTIONS_UPDATED, this._onOptionsUpdated, this);
        EventManager.on(SamsaraEvent.CORPSE_ENTERED, this._onCorpseEntered, this);
        // 监听退出尸修成功（生产者 SamsaraApi.corpseExit）：展示提示，事件不再是孤儿
        EventManager.on(SamsaraEvent.CORPSE_EXITED, this._onCorpseExited, this);
    }

    onDestroy() {
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    // ═══════════════════════════════════════
    //  渲染三选一选项
    // ═══════════════════════════════════════

    /** 死亡三选一数据到达：渲染各选项说明并激活面板 */
    private _onOptionsUpdated(data: DeathTriggerData) {
        // 副本内死亡没有三选一（被踢出副本无永久惩罚），不弹本面板
        if (data.is_dungeon_death) return;

        this.node.active = true;
        this._corpseConfirming = false;

        // 夺舍规则速览（后端 possess_hint 原文展示）
        if (this.possessHintLabel) {
            this.possessHintLabel.string = data.possess_hint || '';
        }
        // 死亡自动设立的秘境信息（ruin_id=0 表示已有未掠夺秘境，不重复建）
        if (this.ruinInfoLabel) {
            this.ruinInfoLabel.string = data.ruin_id > 0
                ? `已自动设立秘境 #${data.ruin_id}，存入灵石 ×${data.ruin_stone}（原余额1/3）`
                : '已有未掠夺秘境，本次不重复设立';
        }
        // 按 key 把各选项说明写到按钮子节点 DescLabel（含尸修属性转换说明）
        for (const opt of data.options || []) {
            let btn: Node | null = null;
            if (opt.key === 'reincarnation') btn = this.reincarnationBtn;
            else if (opt.key === 'ghost_cultivation') btn = this.ghostBtn;
            else if (opt.key === 'corpse_cultivation') btn = this.corpseBtn;
            if (!btn) continue;
            const descNode = btn.getChildByName('DescLabel');
            const descLabel = descNode ? descNode.getComponent(Label) : null;
            if (descLabel) {
                // 尸修项 can_possess=false：desc 后追加放弃夺舍红字警示
                descLabel.string = opt.can_possess === false
                    ? `${opt.desc}\n【选尸修即放弃夺舍】`
                    : opt.desc;
                if (opt.can_possess === false) {
                    descLabel.color = new Color().fromHEX('#E74C3C');
                }
            }
        }
    }

    // ═══════════════════════════════════════
    //  三个选项的点击处理
    // ═══════════════════════════════════════

    /** 六道轮回（因果值随机分配，与 DeathChoiceUI 同一后端接口） */
    private async _onReincarnation() {
        if (this._busy) return;   // 防重入
        this._busy = true;
        try {
            const res = await HttpClient.post('/death/reincarnation', {
                character_id: this._characterId,
                force_beast: false,
            });
            if (res.code === 0) {
                this._showResult(`轮回到：${res.data?.reincarnation_name || '未知道途'}\n${res.msg}`, '#D4A843');
            } else {
                this._showToast(res.msg || '轮回失败');
            }
        } catch {
            this._showToast('网络错误，请重试');
        } finally {
            this._busy = false;
        }
    }

    /** 鬼修（以魂力代血条，与 DeathChoiceUI 同一后端接口） */
    private async _onGhostEnter() {
        if (this._busy) return;   // 防重入
        this._busy = true;
        try {
            const res = await HttpClient.post('/death/ghost/enter', {
                character_id: this._characterId,
            });
            if (res.code === 0) {
                this._showResult('已成为鬼修，以魂力代替血条继续修行（精=0）', '#9B59B6');
            } else {
                this._showToast(res.msg || '鬼修转换失败');
            }
        } catch {
            this._showToast('网络错误，请重试');
        } finally {
            this._busy = false;
        }
    }

    /** 尸修（V5 新增）：先二次确认"放弃夺舍"，确认后才真正转换 */
    private async _onCorpseEnter() {
        if (this._busy) return;   // 防重入

        // 第一次点击：只弹警告，5秒内再点才执行（尸修不可逆放弃夺舍，必须确认）
        if (!this._corpseConfirming) {
            this._corpseConfirming = true;
            this._showResult('【警告】尸修后神→0永久、无法夺舍！\n5秒内再点一次"尸修"确认', '#E74C3C');
            this.scheduleOnce(() => { this._corpseConfirming = false; }, 5);
            return;
        }

        this._corpseConfirming = false;
        this._busy = true;
        try {
            const res = await SamsaraApi.corpseEnter(this._characterId);
            if (res.code === 0) {
                // 成功结果经 CORPSE_ENTERED 事件回流展示
            } else if (res.code === ERR_CORPSE_GHOST_CONFLICT) {
                this._showToast(res.msg || SamsaraErrorText[ERR_CORPSE_GHOST_CONFLICT]);
            } else if (res.code === ERR_CORPSE_ALREADY_IN) {
                this._showToast(res.msg || SamsaraErrorText[ERR_CORPSE_ALREADY_IN]);
            } else {
                this._showToast(res.msg || '尸修转换失败');
            }
        } catch {
            this._showToast('网络错误，请重试');
        } finally {
            this._busy = false;
        }
    }

    /** 尸修转换成功（SamsaraApi 广播）：展示属性转换前后对照 */
    private _onCorpseEntered(data: CorpseEnterData) {
        const o = data.old_attrs;
        const n = data.new_attrs;
        this._showResult(
            `已入尸修之道！属性转换：\n` +
            `精 ${o.jing} → ${n.jing}　气 ${o.qi} → ${n.qi}　神 ${o.shen} → ${n.shen}\n` +
            (data.warning || ''),
            '#2ECC71');
    }

    /** 退出尸修成功（SamsaraApi.corpseExit 广播，无携带数据）：展示退出提示 */
    private _onCorpseExited() {
        this._showResult('已退出尸修，恢复正常修行（神已永久归零，不可夺舍）', '#D4A843');
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
