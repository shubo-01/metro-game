/**
 * 寻仙 - 装备系统 API 客户端
 *
 * 说明:
 *   - 严格对齐 equipment-service (端口 8009) 的 REST 接口
 *   - 严格按照《寻仙·装备系统 PRD+技术方案》定义
 *   - HttpClient 会自动根据 /equipment/* /craft/* /shard/* /inherit/* /trade/* /inventory/* 前缀路由到装备服务
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';

// ═══════════════════════════════════════════
//  枚举定义（与后端保持一致）
// ═══════════════════════════════════════════

/** 装备品质（9品质体系，PRD 第三章） */
export enum EquipQuality {
    Fan    = 1,   // 凡品 ×1
    Zhen   = 2,   // 珍品 ×2
    Shard  = 3,   // 神话碎片 ×2.5（不可穿戴，3片合成完整神话）
    Ling   = 4,   // 灵宝 ×3
    Xian   = 5,   // 仙宝 ×5
    Myth   = 6,   // 神话 ×7
    Dao    = 7,   // 道宝 ×9（宗师合成产出）
    Innate = 8,   // 先天灵宝 ×12
    Gongde = 9,   // 功德灵宝 ×12（前期不出）
}

/** 装备槽位（PRD 第二章） */
export enum EquipSlot {
    Head       = 1,    // 头甲
    Face       = 2,    // 面甲
    Body       = 3,    // 躯甲
    Crotch     = 4,    // 裆甲
    Leg        = 5,    // 腿甲
    Foot       = 6,    // 足甲
    Arm        = 7,    // 臂甲
    Belt       = 8,    // 腰带（背包扩展）
    Bracelet   = 11,   // 手镯
    Ring       = 12,   // 戒指
    Earring    = 13,   // 耳环
    Necklace   = 14,   // 项链
    MainWeapon = 21,   // 主武器
    SubWeapon  = 22,   // 副武器（1~8件）
}

/** 基础加成属性 */
export enum EquipBaseAttr {
    Jing = 1,   // 精（甲类）
    Shen = 2,   // 神（首饰）
    Qi   = 3,   // 气（武器）
}

/** 武器类型（决定攻击形状，PRD 第八章） */
export enum WeaponType {
    None     = 0,   // 非武器
    Sword    = 1,   // 刀/剑（前方扇形）
    Spear    = 2,   // 枪/戟（前方直线）
    Hammer   = 3,   // 锤/斧（自身圆形）
    Bow      = 4,   // 弓/弩（远程单体）
    Fan      = 5,   // 扇/笛（扇形+弹道）
    Staff    = 6,   // 法杖（远程范围）
}

/** 打造品级（PRD 10.1） */
export enum CraftLevel {
    Apprentice = 1,   // 学徒（凡30%）
    Craftsman  = 2,   // 匠人（凡70% 珍30%）
    Artisan    = 3,   // 巧匠（凡90% 珍60% 灵10%）
    Master     = 4,   // 大师（凡100% 珍80% 灵50%）
    Grand      = 5,   // 宗师（凡100% 珍80% 灵70% 仙50%）
}

/** 品质 → 中文名 */
export const EquipQualityName: Record<number, string> = {
    [EquipQuality.Fan]:    '凡品',
    [EquipQuality.Zhen]:   '珍品',
    [EquipQuality.Shard]:  '神话碎片',
    [EquipQuality.Ling]:   '灵宝',
    [EquipQuality.Xian]:   '仙宝',
    [EquipQuality.Myth]:   '神话',
    [EquipQuality.Dao]:    '道宝',
    [EquipQuality.Innate]: '先天灵宝',
    [EquipQuality.Gongde]: '功德灵宝',
};

/** 打造品级 → 中文名 */
export const CraftLevelName: Record<number, string> = {
    [CraftLevel.Apprentice]: '学徒',
    [CraftLevel.Craftsman]:  '匠人',
    [CraftLevel.Artisan]:    '巧匠',
    [CraftLevel.Master]:     '大师',
    [CraftLevel.Grand]:      '宗师',
};

// ═══════════════════════════════════════════
//  接口响应数据类型
// ═══════════════════════════════════════════

/** 装备附加属性 */
export interface EquipExtraAttr {
    attr_type: number;    // 1-16（暴击率/闪避率/…/冷却缩减）
    attr_name: string;
    value: number;        // 1级基准值，实际值随装备等级提升
    category: number;     // 1百分比 2元素 3特殊效果 4功能
}

/** 装备实例信息 */
export interface EquipmentInfo {
    equipment_id: number;
    owner_id: number;
    quality: number;
    quality_name: string;
    slot_type: number;
    weapon_type: number;
    level: number;          // 1~10级，10级加成翻倍
    durability: number;     // 耐久（上限300，归零碎裂）
    base_attr_type: number; // 1精 2神 3气
    base_attr_share: number;
    is_equipped: boolean;
    source: string;
    extra_attrs: EquipExtraAttr[];
}

/** 套装效果信息（PRD 第六章） */
export interface SetBonusInfo {
    is_active: boolean;
    quality: number;
    float_value: number;   // 锁定的浮动值 0~0.8
    float_attr: number;    // 浮动加成分配属性：1精 2神 3气
    bonus: number;         // 浮动加成数值
}

/** 加成汇总响应 */
export interface EquipBonusData {
    jing_bonus: number;
    shen_bonus: number;
    qi_bonus: number;
    sub_weapon_count: number;
    weapon_share: number;
    extra_attrs: { attr_type: number; attr_name: string; category: number; total: number }[];
    set_bonus: SetBonusInfo;
}

/** 升级结果 */
export interface UpgradeData {
    success: boolean;
    result_level: number;
    is_broken: boolean;     // 是否碎裂（5-9级失败惩罚）
    success_rate: number;
}

/** 耐久消耗结果 */
export interface DurabilityData {
    durability: number;
    is_warning: boolean;    // 耐久<10 警告
    is_broken: boolean;     // 耐久归零碎裂消失
}

/** 掉落判定结果 */
export interface DropRollData {
    drops: EquipmentInfo[];
    shard_gained: number;   // 本次获得碎片数（神话50%转3碎片）
    shard_total: number;
    luck: number;
    roll_times: number;
}

/** 打造品级信息 */
export interface CraftLevelData {
    craft_level: number;
    success_count_fan: number;
    success_count_zhen: number;
    success_count_ling: number;
    success_count_xian: number;
    npc_certified: boolean;
    daobao_unlocked: boolean;   // 宗师+仙宝1000 解锁道宝合成
}

/** 背包容量信息（腰带扩展，PRD 第十三章） */
export interface InventoryCapacityData {
    base_slots: number;
    belt_extra_slots: number;
    belt_quick_slots: number;
    total_slots: number;
    warehouse_used: number;
}

// ═══════════════════════════════════════════
//  API 客户端
// ═══════════════════════════════════════════

export class EquipmentApi {
    // ── 查询 ──

    /** 玩家全部装备列表（背包+已穿戴） */
    static list(playerId: number): Promise<ApiResponse<{ equipments: EquipmentInfo[]; total: number }>> {
        return HttpClient.get('/equipment/list', { player_id: String(playerId) });
    }

    /** 已穿戴装备列表 */
    static equipped(playerId: number): Promise<ApiResponse<{ equipments: EquipmentInfo[]; total: number }>> {
        return HttpClient.get('/equipment/equipped', { player_id: String(playerId) });
    }

    /** 加成汇总（精/神/气三围 + 附加属性 + 套装，供人物面板展示） */
    static bonus(playerId: number): Promise<ApiResponse<EquipBonusData>> {
        return HttpClient.get('/equipment/bonus', { player_id: String(playerId) });
    }

    // ── 穿戴 ──

    /**
     * 穿戴装备（服务端校验境界要求与槽位冲突）
     * @param subWeaponLimit 副武器档位上限：1常规 5三头六臂 8特殊（缺省1）
     */
    static equip(playerId: number, equipmentId: number, subWeaponLimit?: number): Promise<ApiResponse<{ equipment: EquipmentInfo; set_bonus: SetBonusInfo }>> {
        return HttpClient.post('/equipment/equip', {
            player_id: playerId, equipment_id: equipmentId, sub_weapon_limit: subWeaponLimit,
        });
    }

    /** 卸下装备（甲/首饰卸下将解除套装效果） */
    static unequip(playerId: number, equipmentId: number): Promise<ApiResponse<{ equipment: EquipmentInfo; set_bonus: SetBonusInfo }>> {
        return HttpClient.post('/equipment/unequip', { player_id: playerId, equipment_id: equipmentId });
    }

    // ── 升级 / 耐久 / 修理 ──

    /** 装备升级（成功率=升级表+气运加成；失败按等级分段惩罚） */
    static upgrade(playerId: number, equipmentId: number, materialIds?: number[]): Promise<ApiResponse<UpgradeData>> {
        return HttpClient.post('/equipment/upgrade', {
            player_id: playerId, equipment_id: equipmentId, material_ids: materialIds,
        });
    }

    /** 装备修理（耐久恢复至300，材料按品质对应） */
    static repair(playerId: number, equipmentId: number): Promise<ApiResponse<any>> {
        return HttpClient.post('/equipment/repair', { player_id: playerId, equipment_id: equipmentId });
    }

    /** 耐久消耗（战斗系统每次攻击/受击调用，缺省扣1点） */
    static durabilityConsume(playerId: number, equipmentId: number, amount?: number): Promise<ApiResponse<DurabilityData>> {
        return HttpClient.post('/equipment/durability/consume', {
            player_id: playerId, equipment_id: equipmentId, amount,
        });
    }

    // ── 掉落 ──

    /** 击杀怪物装备掉落判定（monsterType: 1普通 2精英 3Boss 4妖 5神兽） */
    static dropRoll(playerId: number, monsterType: number): Promise<ApiResponse<DropRollData>> {
        return HttpClient.post('/equipment/drop/roll', { player_id: playerId, monster_type: monsterType });
    }

    // ── 打造 ──

    /** 执行打造（品级×品质成功率矩阵+气运加成，失败材料照扣） */
    static craftDo(playerId: number, recipeId: number, materialIds?: number[]): Promise<ApiResponse<any>> {
        return HttpClient.post('/craft/do', {
            player_id: playerId, recipe_id: recipeId, material_ids: materialIds,
        });
    }

    /** 查询打造品级信息 */
    static craftLevel(playerId: number): Promise<ApiResponse<CraftLevelData>> {
        return HttpClient.get('/craft/level', { player_id: String(playerId) });
    }

    /** 道宝合成（宗师满级专属，10件仙宝→50%+气运；失败5粉碎+5破损） */
    static daobaoCombine(playerId: number, equipmentIds: number[]): Promise<ApiResponse<any>> {
        return HttpClient.post('/craft/daobao', { player_id: playerId, equipment_ids: equipmentIds });
    }

    // ── 神话碎片 / 神位继承 ──

    /** 神话碎片合成完整神话（3片合1，附加属性合成时生成） */
    static shardCombine(playerId: number): Promise<ApiResponse<{ equipment: EquipmentInfo; shard_left: number }>> {
        return HttpClient.post('/shard/combine', { player_id: playerId });
    }

    /** 激活神位继承（拥有碎片即获资格，绑定人物不可转移） */
    static inheritActivate(playerId: number, skillId: number): Promise<ApiResponse<any>> {
        return HttpClient.post('/inherit/activate', { player_id: playerId, skill_id: skillId });
    }

    /** 大道争锋失败结算（碎片转胜者+技能灰化，由PVP系统回调） */
    static inheritDuelLost(loserId: number, winnerId: number): Promise<ApiResponse<any>> {
        return HttpClient.post('/inherit/duel-lost', { loser_id: loserId, winner_id: winnerId });
    }

    // ── 交易 ──

    /** 创建交易挂单（装备完全自由交易不绑定） */
    static tradeCreate(playerId: number, equipmentId: number, price: number): Promise<ApiResponse<any>> {
        return HttpClient.post('/trade/create', {
            player_id: playerId, equipment_id: equipmentId, price,
        });
    }

    /** 执行交易成交（所有权转移，穿戴中自动卸下） */
    static tradeExecute(orderId: number, playerId: number): Promise<ApiResponse<any>> {
        return HttpClient.post('/trade/execute', { order_id: orderId, player_id: playerId });
    }

    // ── 背包容量 ──

    /** 查询背包容量（基础20格+腰带品质扩展） */
    static inventoryCapacity(playerId: number): Promise<ApiResponse<InventoryCapacityData>> {
        return HttpClient.get('/inventory/capacity', { player_id: String(playerId) });
    }
}
