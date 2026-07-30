/**
 * 寻仙 - 技能系统 API 客户端
 *
 * 说明:
 *   - 严格对齐 character-service (端口 8005) 的 /skill/ 前缀 REST 接口
 *   - 涵盖：技能碎片合成学习(9碎片→1完整)、技能遗忘(扣费+卸栏)、
 *     技能总览(定义+背包+装配栏+修数)、技能装配/卸下(skill_id=0 为卸下)
 *   - HttpClient 会自动根据 /skill/ 前缀路由到角色服务 8005
 *   - 后端实现见 backend/internal/gongfa/（技能与功法同属一个后端包，共用 5xxx 错误码）
 *   - 错误码文案表复用 GongfaApi 的 GongfaErrorText（同一套 5xxx 段，不重复定义）
 *
 * 【技能栏规则】主动栏 10 个（slot_index 1-10，只收五行技/学习技）、
 *   被动栏 4 个（slot_index 1-4，只收被动技）；普攻与神位技不占栏位。
 *   五行技按"修炼五行数量"自动解锁（凡术1修/灵术2修/仙术3修/道术5修），
 *   学习技/被动技需背包持有≥1个完整技能才能装配。
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { SkillEvent } from '../common/Constants';
import { GongfaTier, TierName } from './GongfaApi';

// ═══════════════════════════════════════════
//  枚举与展示映射（与后端 model.go 保持一致）
// ═══════════════════════════════════════════

/** 技能类型（skill_def.skill_type） */
export enum SkillType {
    Wuxing  = 1,   // 五行技：按修炼五行数量自动解锁，占主动栏
    Learned = 2,   // 学习技：掉落碎片9合1学习，占主动栏
    Shenwei = 3,   // 神位技：随神位继承获得，不占栏
    Passive = 4,   // 被动技：占被动栏
    Normal  = 5,   // 普攻：默认解锁，不占栏
}

/** 技能栏类型（char_skill_slots.slot_type） */
export enum SlotType {
    Active  = 1,   // 主动栏，slot_index 1-10
    Passive = 2,   // 被动栏，slot_index 1-4
}

/** 伤害路线（skill_def.damage_path） */
export enum DamagePath {
    None = 0,   // 非伤害技能
    Fa   = 1,   // A 法修路线
    Ti   = 2,   // B 体修路线
    Hun  = 3,   // C 魂修路线
}

/** 主动技能栏数量上限（后端 ActiveSlotMax） */
export const ACTIVE_SLOT_MAX = 10;
/** 被动技能栏数量上限（后端 PassiveSlotMax） */
export const PASSIVE_SLOT_MAX = 4;
/** 9碎片合成1个完整技能（后端 FuseNeed） */
export const SKILL_FUSE_NEED = 9;

/** 技能类型 → 中文名 */
export const SkillTypeName: Record<number, string> = {
    [SkillType.Wuxing]:  '五行技',
    [SkillType.Learned]: '学习技',
    [SkillType.Shenwei]: '神位技',
    [SkillType.Passive]: '被动技',
    [SkillType.Normal]:  '普攻',
};

/** 技能品级 → 中文名（技能口径：凡术/灵术/仙术/道术） */
export const SkillTierName: Record<number, string> = {
    [GongfaTier.Fan]:  '凡术',
    [GongfaTier.Ling]: '灵术',
    [GongfaTier.Xian]: '仙术',
    [GongfaTier.Dao]:  '道术',
};

/** 伤害路线 → 中文名 */
export const DamagePathName: Record<number, string> = {
    [DamagePath.None]: '无伤害',
    [DamagePath.Fa]:   '法修',
    [DamagePath.Ti]:   '体修',
    [DamagePath.Hun]:  '魂修',
};

/** 五行元素 → 中文名（0=通用，不限五行） */
export const ElementName: Record<number, string> = {
    0: '通用',
    1: '金',
    2: '木',
    3: '水',
    4: '火',
    5: '土',
};

/**
 * 五行技解锁所需修数（后端 WuxingSkillXiuNeed 镜像）：
 * 凡术1修 / 灵术2修 / 仙术3修 / 道术5修（修数=角色修炼的五行属性种数）
 */
export const WuxingXiuNeedTable: Record<number, number> = {
    [GongfaTier.Fan]:  1,
    [GongfaTier.Ling]: 2,
    [GongfaTier.Xian]: 3,
    [GongfaTier.Dao]:  5,
};

/** 功法口径的品级名（凡法/灵法…）在技能面板偶尔也要用到，直接透出便于复用 */
export const GongfaTierName = TierName;

// ═══════════════════════════════════════════
//  接口响应数据类型（字段与后端 json tag 一一对应）
// ═══════════════════════════════════════════

/** 技能定义（skill_def 表一行） */
export interface SkillDef {
    id: number;                  // 技能ID
    name: string;                // 技能名称
    skill_type: number;          // 类型：1五行技 2学习技 3神位技 4被动技 5普攻
    tier: number;                // 品级：1凡术 2灵术 3仙术 4道术
    damage_path: number;         // 伤害路线：1法修 2体修 3魂修 0非伤害
    base_damage: number;         // 基础伤害
    multiplier: number;          // 伤害倍率
    cooldown_s: number;          // 冷却秒数
    mp_cost: number;             // 灵力消耗
    element: number;             // 五行：1金2木3水4火5土，0=通用
    is_fragment: boolean;        // 是否碎片产出（需9碎片合成）
    fuse_count: number;          // 合成所需碎片数（9）
    effect_desc: string;         // 效果说明
    unlock_condition: string;    // 解锁条件说明
}

/** 技能总览中的单条技能（定义 + 持有情况 + 是否可用） */
export interface SkillListItem {
    def: SkillDef;        // 技能定义
    fragments: number;    // 持有碎片数
    complete: number;     // 持有完整技能数
    /**
     * 是否可用（后端口径）：
     *   五行技→修数达标；学习技/被动技→持有≥1个完整；普攻→恒可用；
     *   神位技→由神位系统决定（此处按未持有处理）
     */
    available: boolean;
}

/** 技能栏一行（char_skill_slots 表一行） */
export interface SkillSlot {
    slot_type: number;    // 1=主动栏 2=被动栏
    slot_index: number;   // 主动1-10 / 被动1-4
    skill_id: number;     // 装配的技能ID（0=空栏）
}

/** 技能总览响应（GET /skill/list） */
export interface SkillListData {
    skill_list: SkillListItem[];   // 全部技能（含持有/可用状态）
    slots: SkillSlot[];            // 已装配的技能栏（只返回有记录的行）
    element_count: number;         // 当前修炼的五行数量（修数，用于五行技解锁判定）
    active_slot_max: number;       // 主动栏上限（10）
    passive_slot_max: number;      // 被动栏上限（4）
}

/** 学习技能响应（POST /skill/learn，9碎片合成1个完整技能） */
export interface SkillLearnData {
    skill: SkillDef;      // 学到的技能完整定义
    fragments: number;    // 扣除9碎片后的剩余碎片数
    complete: number;     // 合成后的完整技能持有数
    zouhuo: boolean;      // 是否触发走火入魔（true=触发，但学习依然成功）
}

/** 遗忘技能响应（POST /skill/forget） */
export interface SkillForgetData {
    skill_id: number;                                        // 被遗忘的技能ID
    cost: { spirit_stone: number; mengyi_soup: number };     // 本次实际扣的灵石与孟遗汤
    complete: number;                                        // 遗忘后剩余的完整技能数
}

/** 技能装配/卸下响应（POST /skill/slot/set） */
export interface SlotSetData {
    slot_type: number;      // 操作的栏位类型
    slot_index: number;     // 操作的栏位序号
    skill_id: number;       // 装配后的技能ID（0=已卸下）
    skill_name?: string;    // 装配的技能名称（卸下时后端不返回该字段）
}

// ═══════════════════════════════════════════
//  SkillApi
// ═══════════════════════════════════════════

export class SkillApi {

    /**
     * 技能总览：全部技能定义 + 背包碎片/完整数 + 可用状态
     *           + 已装配技能栏 + 当前修数 + 主动/被动栏上限
     * 成功后自动广播 SKILL_UPDATED 事件（携带 SkillListData 全量数据），
     * 技能面板（SkillPanel）监听后渲染，调用方无需再手动 emit
     */
    static async list(characterId: number): Promise<ApiResponse<SkillListData>> {
        const res = await HttpClient.get<SkillListData>('/skill/list', {
            character_id: String(characterId),
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(SkillEvent.SKILL_UPDATED, res.data);
        }
        return res;
    }

    /**
     * 学习技能：9个碎片合成1个完整技能（仅"学习技"支持，skill_type=2）
     * 碎片不足 5020；境界等级不足 5004；裸精气神总和不足 5005
     * 与学习功法同一套要求校验；触发走火入魔时依然学习成功（data.zouhuo=true）
     * 成功后自动广播 SKILL_LEARNED 事件（携带 SkillLearnData）
     */
    static async learn(characterId: number, skillId: number): Promise<ApiResponse<SkillLearnData>> {
        const res = await HttpClient.post<SkillLearnData>('/skill/learn', {
            character_id: characterId,
            skill_id: skillId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(SkillEvent.SKILL_LEARNED, res.data);
        }
        return res;
    }

    /**
     * 遗忘技能：按品级扣费（凡免费/灵30+2/仙80+3/道150+5），
     * 完整技能数-1（不返还碎片），并自动从所有技能栏卸下
     * 未持有该技能 5021；灵石不足 5010；孟遗汤不足 5011
     * 【事件说明】遗忘结果与总览是同一份数据视图，不单独定义事件，
     * 调用方在成功后调用 SkillApi.list() 刷新（list 会广播 SKILL_UPDATED）
     */
    static async forget(characterId: number, skillId: number): Promise<ApiResponse<SkillForgetData>> {
        return HttpClient.post<SkillForgetData>('/skill/forget', {
            character_id: characterId,
            skill_id: skillId,
        });
    }

    /**
     * 技能装配 / 卸下：skillId 传 0 表示卸下该栏位
     *   - 主动栏(slotType=1, slotIndex 1-10)只收五行技/学习技
     *   - 被动栏(slotType=2, slotIndex 1-4)只收被动技
     *   - 普攻与神位技不占栏，装配会被拒绝
     * 栏位非法 5022；类型与栏位不匹配 5023；修数不足 5024；
     * 未持有 5021；同一技能已装配在其他栏位 5025
     * 成功后自动广播 SKILL_SLOT_CHANGED 事件（携带 SlotSetData）
     */
    static async slotSet(
        characterId: number,
        slotType: number,
        slotIndex: number,
        skillId: number,
    ): Promise<ApiResponse<SlotSetData>> {
        const res = await HttpClient.post<SlotSetData>('/skill/slot/set', {
            character_id: characterId,
            slot_type: slotType,
            slot_index: slotIndex,
            skill_id: skillId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(SkillEvent.SKILL_SLOT_CHANGED, res.data);
        }
        return res;
    }
}
