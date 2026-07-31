/**
 * 寻仙 - V6 新手引导状态机（纯静态类，非组件）
 *
 * 引导流程（PRD 4.2 Zone1 营地极简教程4步，配置来自后端 tutorial_step_config）：
 *   1 和营地长老对话（talk npc_elder）→ 2 前往铁匠铺（reach npc_blacksmith）
 *   → 3 装备武器（equip weapon）→ 4 出营地探索（reach camp_exit）
 *
 * 职责分工：
 *   - TutorialSystem（本文件）：拉状态/推进状态机/判定完成条件/调 advance 上报
 *   - TutorialUI（ui/TutorialUI.ts）：高亮脉冲/箭头/文案/跳过按钮等表现层
 *   两者通过 TutorialEvent.TUTORIAL_STEP_CHANGED / TUTORIAL_FINISHED 解耦
 *
 * 完成条件的前端触发点（事件监听，生产者-消费者配对）：
 *   - 第1步 talk：监听 TutorialEvent.NPC_TALKED（生产者 HallScene._interactNPC）。
 *     工程 NPC 表无"营地长老"，用张真人(npcId=1)代任长老（假设值，可配 ELDER_NPC_ID）
 *   - 第2步 reach npc_blacksmith：监听 MapEvent.PLAYER_POS_CHANGED（生产者 HallScene
 *     0.5秒节流广播米坐标），离铸器师≤5米判定到达（阈值假设值，沿用采集交互半径口径）
 *   - 第3步 equip weapon：工程暂无"装备成功"事件，按任务书兜底口径用
 *     UIEvent.PANEL_OPENED(type=inventory)（点击高亮的背包按钮打开背包）视为完成
 *     （假设值，可配：待装备穿戴事件接入后改为监听真实装备成功）
 *   - 第4步 reach camp_exit：监听 MapEvent.ZONE_ENTERED（生产者 MapApi），
 *     进入非营地分区（zone_id ≠ 1）即视为走出营地
 */

import { EventManager } from './EventManager';
import { TutorialEvent, MapEvent, UIEvent } from '../common/Constants';
import { TutorialApi, TutorialStatusData, TutorialAdvanceData, TutorialStepInfo, TutorialSkipData, TutorialErrorText, ERR_TUTORIAL_ALREADY_DONE } from '../net/TutorialApi';
import { PanelType } from './PanelManager';
import { ZoneEnterData } from '../net/MapApi';

/** 长老NPC ID：工程 NPC 表无专职长老，用张真人(id=1,type=quest)代任（假设值，可配） */
const ELDER_NPC_ID = 1;
/** 铸器师NPC ID 与其米坐标（HallScene._npcs 配置 px(1300,500) ÷ 5/3 像素每米） */
const BLACKSMITH_X_M = 780;
const BLACKSMITH_Y_M = 300;
/** 第2步"到达铁匠铺"的距离阈值（米）：沿用采集交互半径口径5米（假设值，可配） */
const REACH_DISTANCE_M = 5;
/** 营地分区ID（zone1嵌在原野zone2内，见 HallScene._zoneAt 注释） */
const CAMP_ZONE_ID = 1;

export class TutorialSystem {

    private static _characterId: number = 0;
    private static _steps: TutorialStepInfo[] = [];    // 4步配置（status 接口返回）
    private static _curStepId: number = 0;             // 当前进行中的步骤（0=未运行）
    private static _running: boolean = false;          // 状态机是否运行中
    private static _requesting: boolean = false;       // advance/skip 请求在途防重入
    private static _inited: boolean = false;           // 事件只绑一次

    // ═══════════════════════════════════════
    //  启动/停止
    // ═══════════════════════════════════════

    /**
     * 初始化（HallScene.onLoad 调用）：绑事件并拉引导状态。
     * 已完成/已跳过的老角色 status 里 next_step=0，状态机不会启动
     */
    static init(characterId: number) {
        TutorialSystem._characterId = characterId;

        if (!TutorialSystem._inited) {
            TutorialSystem._inited = true;
            // Api 层广播（生产者 TutorialApi）
            EventManager.on(TutorialEvent.TUTORIAL_STATUS_UPDATED, TutorialSystem._onStatus, TutorialSystem);
            EventManager.on(TutorialEvent.TUTORIAL_ADVANCED, TutorialSystem._onAdvanced, TutorialSystem);
            EventManager.on(TutorialEvent.TUTORIAL_SKIPPED, TutorialSystem._onSkipped, TutorialSystem);
            // 完成条件触发点（生产者见文件头注释）
            EventManager.on(TutorialEvent.NPC_TALKED, TutorialSystem._onNpcTalked, TutorialSystem);
            EventManager.on(MapEvent.PLAYER_POS_CHANGED, TutorialSystem._onPosChanged, TutorialSystem);
            EventManager.on(MapEvent.ZONE_ENTERED, TutorialSystem._onZoneEntered, TutorialSystem);
            EventManager.on(UIEvent.PANEL_OPENED, TutorialSystem._onPanelOpened, TutorialSystem);
        }

        // 拉引导状态（结果经 TUTORIAL_STATUS_UPDATED 回流）
        TutorialApi.status(characterId)
            .catch(() => { /* 网络异常静默：引导拉不到不阻塞进场，重登会再拉 */ });
    }

    /** 停止状态机并解绑事件（场景销毁时 HallScene.onDestroy 调用） */
    static shutdown() {
        TutorialSystem._running = false;
        TutorialSystem._curStepId = 0;
        TutorialSystem._inited = false;
        EventManager.offAll(TutorialSystem);
    }

    /** 跳过引导（TutorialUI 跳过按钮确认后调用；不可逆、不发奖励） */
    static async skip() {
        if (TutorialSystem._requesting || !TutorialSystem._running) return;
        TutorialSystem._requesting = true;
        try {
            await TutorialApi.skip(TutorialSystem._characterId);
            // 成功分支走 TUTORIAL_SKIPPED 事件回调（配对约定）
        } catch {
            // 网络异常静默：引导继续显示，玩家可再点跳过
        } finally {
            TutorialSystem._requesting = false;
        }
    }

    /** 当前进行中的步骤配置（TutorialUI 初始渲染用；null=状态机未运行） */
    static currentStep(): TutorialStepInfo | null {
        if (!TutorialSystem._running) return null;
        return TutorialSystem._findStep(TutorialSystem._curStepId);
    }

    // ═══════════════════════════════════════
    //  Api 事件回调（状态机驱动）
    // ═══════════════════════════════════════

    /** 引导状态到达：新角色（next_step>0 且未跳过未完成）启动状态机 */
    private static _onStatus(data: TutorialStatusData) {
        TutorialSystem._steps = data.steps || [];
        if (data.is_skipped || data.is_completed || data.next_step <= 0) {
            TutorialSystem._running = false;
            return;   // 老角色/已跳过：不启动引导
        }
        TutorialSystem._running = true;
        TutorialSystem._enterStep(data.next_step);
    }

    /** 推进成功：最后一步完成发 FINISHED（带奖励）；中间步进入下一步 */
    private static _onAdvanced(data: TutorialAdvanceData) {
        if (data.is_completed) {
            TutorialSystem._running = false;
            TutorialSystem._curStepId = 0;
            EventManager.emit(TutorialEvent.TUTORIAL_FINISHED, {
                skipped: false,
                rewards: data.rewards || {},
            });
        } else if (data.next_step > 0) {
            TutorialSystem._enterStep(data.next_step);
        }
    }

    /** 跳过成功：状态机停止，FINISHED 无奖励 */
    private static _onSkipped(_data: TutorialSkipData) {
        TutorialSystem._running = false;
        TutorialSystem._curStepId = 0;
        EventManager.emit(TutorialEvent.TUTORIAL_FINISHED, { skipped: true, rewards: null });
    }

    /** 进入某一步：广播步骤配置给 TutorialUI 刷新高亮/箭头/文案 */
    private static _enterStep(stepId: number) {
        TutorialSystem._curStepId = stepId;
        const step = TutorialSystem._findStep(stepId);
        if (step) {
            EventManager.emit(TutorialEvent.TUTORIAL_STEP_CHANGED, step);
        }
    }

    private static _findStep(stepId: number): TutorialStepInfo | null {
        for (const s of TutorialSystem._steps) {
            if (s.step_id === stepId) return s;
        }
        return null;
    }

    // ═══════════════════════════════════════
    //  完成条件判定（按 complete_condition 的 type 分发）
    // ═══════════════════════════════════════

    /** 解析当前步骤的完成条件JSON（如 {"type":"talk","target":"npc_elder"}） */
    private static _curCondition(): { type: string; target: string } | null {
        const step = TutorialSystem._findStep(TutorialSystem._curStepId);
        if (!step) return null;
        try {
            return JSON.parse(step.complete_condition);
        } catch {
            return null;   // 配置损坏：该步无法自动判定（可跳过兜底）
        }
    }

    /** 第1步：NPC对话完成（HallScene 广播）——长老=张真人 npcId=1（假设值可配） */
    private static _onNpcTalked(npcId: number) {
        if (!TutorialSystem._running) return;
        const cond = TutorialSystem._curCondition();
        if (cond && cond.type === 'talk' && cond.target === 'npc_elder' && npcId === ELDER_NPC_ID) {
            TutorialSystem._advance();
        }
    }

    /** 第2步：位置广播（HallScene 0.5秒节流）——离铸器师≤5米判定到达铁匠铺 */
    private static _onPosChanged(pos: { x: number; y: number }) {
        if (!TutorialSystem._running) return;
        const cond = TutorialSystem._curCondition();
        if (!cond || cond.type !== 'reach' || cond.target !== 'npc_blacksmith') return;
        const dx = pos.x - BLACKSMITH_X_M;
        const dy = pos.y - BLACKSMITH_Y_M;
        if (Math.sqrt(dx * dx + dy * dy) <= REACH_DISTANCE_M) {
            TutorialSystem._advance();
        }
    }

    /** 第3步：打开背包（PanelManager 广播）——"装备武器"的兜底判定（假设值可配） */
    private static _onPanelOpened(info: { type: string; level: number }) {
        if (!TutorialSystem._running) return;
        const cond = TutorialSystem._curCondition();
        // 文档条件是 equip weapon，工程暂无装备成功事件：点击高亮的背包按钮
        // 打开背包面板即视为完成（假设值，可配：装备事件接入后改真实判定）
        if (cond && cond.type === 'equip' && info.type === PanelType.Inventory) {
            TutorialSystem._advance();
        }
    }

    /** 第4步：进入分区（MapApi 广播）——离开营地（zone_id≠1）即"出营地探索" */
    private static _onZoneEntered(data: ZoneEnterData) {
        if (!TutorialSystem._running) return;
        const cond = TutorialSystem._curCondition();
        if (cond && cond.type === 'reach' && cond.target === 'camp_exit'
            && data.zone_id !== CAMP_ZONE_ID) {
            TutorialSystem._advance();
        }
    }

    /** 上报当前步骤完成（顺序权威在后端：6402跳步/6403已结束时静默停机自愈） */
    private static async _advance() {
        if (TutorialSystem._requesting) return;   // 防重入（0.5秒位置广播可能连续触发）
        const stepId = TutorialSystem._curStepId;
        if (stepId <= 0) return;
        TutorialSystem._requesting = true;
        try {
            const res = await TutorialApi.advance(TutorialSystem._characterId, stepId);
            if (res.code !== 0) {
                // 业务错误文案通过 TUTORIAL_TOAST 事件反馈给玩家
                //（消费者 TutorialUI 用 toastLabel 弹 2 秒，配对约定不留孤儿事件）
                const text = TutorialErrorText[res.code];
                if (text) {
                    EventManager.emit(TutorialEvent.TUTORIAL_TOAST, text);
                }
                // 6403=已完成/已跳过（多端并发）：本地状态机直接停机自愈；
                // 注意这里必须按错误码精确判断，不能用"文案表有没有"兜底——
                // 6402 也在文案表里，旧写法会误把跳步也停机（评审修复）
                if (res.code === ERR_TUTORIAL_ALREADY_DONE) {
                    TutorialSystem._running = false;
                    EventManager.emit(TutorialEvent.TUTORIAL_FINISHED, { skipped: true, rewards: null });
                }
                // 6402 跳步：仅提示不停机，等 status 重拉纠正（下次登录自愈），
                // 本期不自动重拉防循环
            }
            // 成功分支走 TUTORIAL_ADVANCED 事件回调（配对约定）
        } catch {
            // 网络异常静默：条件事件还会再触发（如位置广播），自动重试
        } finally {
            TutorialSystem._requesting = false;
        }
    }
}
