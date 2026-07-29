/**
 * 寻仙 - 花果山神位系统 API 客户端
 *
 * 说明:
 *   - 严格对齐 character-service (端口 8005) 的 /shenwei/ 前缀 REST 接口
 *   - 涵盖：神位总览查询、碎片合成(7→1)、神位融合(9同品级同属性系→高一阶)、
 *     神位继承(永久解锁+激活)、神位切换(晋升免费/普通切换按旧神位品级扣费)
 *   - HttpClient 会自动根据 /shenwei/ 前缀路由到角色服务 8005
 *   - 后端实现见 backend/internal/shenwei/（handler.go / service.go / model.go）
 *   - 每个接口成功（code===0 且有 data）后由本封装层自动广播对应 ShenweiEvent
 *     事件并携带响应 data，UI 面板只需监听、无需自行 emit
 *   - /shenwei/grant 为后端内部发放接口（副本掉落回调专用），前端不封装
 *
 * 【隔离说明】本文件对接的是"花果山神位继承系统"（PRD 神位系统 V2.0），
 * 与装备服务 8009 的 /shard/（神话碎片）、/inherit/（旧神位继承）是
 * 完全独立的两套体系，互不引用、互不影响。
 */

import { HttpClient, ApiResponse } from '../net/HttpClient';
import { EventManager } from '../manager/EventManager';
import { ShenweiEvent } from '../common/Constants';
import { DerivedAttrsV2 } from './CharacterApi';

// ═══════════════════════════════════════════
//  枚举与展示映射（与后端 model.go 保持一致）
// ═══════════════════════════════════════════

/** 神位品级（shenwei_def.grade） */
export enum ShenweiGrade {
    Fan      = 1,   // 凡品：无继承门槛，副本直接掉落
    Zhen     = 2,   // 珍品：门槛 200+3(Lv-1)
    Ling     = 3,   // 灵品：门槛 500+7(Lv-1)
    Xian     = 4,   // 仙品：门槛 1200+15(Lv-1)
    Shenhua  = 5,   // 神话：门槛 3000+30(Lv-1)
    Xiantian = 6,   // 先天：门槛 7000+50(Lv-1)
}

/** 属性系（shenwei_def.attr_type）：决定神位主加哪一维 */
export enum ShenweiAttrType {
    Yao = 1,   // 妖属：主加精
    Mo  = 2,   // 魔属：主加气
    Dao = 3,   // 道属：主加神
}

/** 阶位（shenwei_def.rank_type，融合线专用） */
export enum ShenweiRankType {
    None  = 0,   // 非融合线（碎片合成/副本产出神位）
    Bing  = 1,   // 兵：副本直接掉落
    Jiang = 2,   // 将：9兵融合
    Shuai = 3,   // 帅：9将融合（当前最高阶）
}

/** 品级 → 中文名 */
export const GradeName: Record<number, string> = {
    [ShenweiGrade.Fan]:      '凡品',
    [ShenweiGrade.Zhen]:     '珍品',
    [ShenweiGrade.Ling]:     '灵品',
    [ShenweiGrade.Xian]:     '仙品',
    [ShenweiGrade.Shenhua]:  '神话',
    [ShenweiGrade.Xiantian]: '先天',
};

/** 属性系 → 中文名（含主加维度提示） */
export const AttrTypeName: Record<number, string> = {
    [ShenweiAttrType.Yao]: '妖属(加精)',
    [ShenweiAttrType.Mo]:  '魔属(加气)',
    [ShenweiAttrType.Dao]: '道属(加神)',
};

/** 阶位 → 中文名 */
export const RankTypeName: Record<number, string> = {
    [ShenweiRankType.None]:  '',
    [ShenweiRankType.Bing]:  '兵',
    [ShenweiRankType.Jiang]: '将',
    [ShenweiRankType.Shuai]: '帅',
};

// ═══════════════════════════════════════════
//  业务数值常量（UI 展示/前端预检用，权威判定以后端为准）
// ═══════════════════════════════════════════

/** 碎片合成所需数量（7碎片 → 1完整神位） */
export const SYNTHESIZE_NEED = 7;
/** 融合所需数量（9同品级同属性系 → 1高一阶） */
export const FUSE_NEED = 9;
/** 归元符商城单价（灵石），切换总成本 = 灵石 + 归元符数×99 */
export const TALISMAN_PRICE = 99;

/** 继承门槛参数：门槛 = base + perLevel × (Lv - 1)，裸体精气神总和需达标 */
export const InheritReqTable: Record<number, { base: number; perLevel: number }> = {
    [ShenweiGrade.Fan]:      { base: 0,    perLevel: 0 },   // 凡品无门槛
    [ShenweiGrade.Zhen]:     { base: 200,  perLevel: 3 },
    [ShenweiGrade.Ling]:     { base: 500,  perLevel: 7 },
    [ShenweiGrade.Xian]:     { base: 1200, perLevel: 15 },
    [ShenweiGrade.Shenhua]:  { base: 3000, perLevel: 30 },
    [ShenweiGrade.Xiantian]: { base: 7000, perLevel: 50 },
};

/** 切换费用表（按旧神位品级扣费）：总成本 凡109/珍228/灵278/仙447/神话696/先天995 */
export const SwitchCostTable: Record<number, { spiritStone: number; talismanCount: number }> = {
    [ShenweiGrade.Fan]:      { spiritStone: 10,  talismanCount: 1 },
    [ShenweiGrade.Zhen]:     { spiritStone: 30,  talismanCount: 2 },
    [ShenweiGrade.Ling]:     { spiritStone: 80,  talismanCount: 2 },
    [ShenweiGrade.Xian]:     { spiritStone: 150, talismanCount: 3 },
    [ShenweiGrade.Shenhua]:  { spiritStone: 300, talismanCount: 4 },
    [ShenweiGrade.Xiantian]: { spiritStone: 500, talismanCount: 5 },
};

/**
 * 计算继承精气神门槛：门槛 = base + perLevel × (Lv - 1)
 * 与后端 CalcInheritThreshold 同公式，仅作前端预检提示；权威判定在后端
 */
export function calcInheritThreshold(grade: number, level: number): number {
    const req = InheritReqTable[grade];
    if (!req) return 0;
    const lv = level < 1 ? 1 : level;
    return req.base + req.perLevel * (lv - 1);
}

/**
 * 神位业务错误码 → 中文提示文案
 * 后端 msg 已是中文详细描述，此表提供兜底短文案（msg 为空或异常时展示）
 */
export const ShenweiErrorText: Record<number, string> = {
    4001: '神位碎片不足，合成需要7个碎片',
    4002: '融合材料不足，需要9个同品级同属性系神位',
    4003: '该神位已是最高阶，无法继续融合',
    4010: '精气神不足，未达到继承门槛（可通过副本自由属性点补足）',
    4012: '需先继承下属神位，才能继承上位神位',
    4020: '灵石不足，无法完成切换',
    4021: '归元符不足（副本3%掉率或商城99灵石/个）',
};

// ═══════════════════════════════════════════
//  接口响应数据类型（字段与后端 json tag 一一对应）
// ═══════════════════════════════════════════

/** 神位定义（shenwei_def 表一行，info 接口 current 字段返回完整定义） */
export interface ShenweiDef {
    id: number;              // 神位ID（1-12）
    name: string;            // 神位名称
    attr_type: number;       // 属性系：1妖 2魔 3道
    grade: number;           // 品级：1凡 2珍 3灵 4仙 5神话 6先天
    rank_type: number;       // 阶位：0非融合线 1兵 2将 3帅
    bonus_jing: number;      // 精加成
    bonus_qi: number;        // 气加成
    bonus_shen: number;      // 神加成
    skill_id: number;        // 专属技能ID
    skill_tier: number;      // 技能档位：1凡术 2灵术 3仙术 4道术
    superior_id: number;     // 上位神位ID（0=无上位；如美猴王→齐天大圣）
    fuse_from_id: number;    // 融合材料神位ID（0=非融合产物）
    acquire_method: string;  // 获取方式 drop/fuse/fragment/future
}

/** 背包神位条目（含 inherited 永久解锁标记） */
export interface ShenweiBagItem {
    shenwei_id: number;      // 神位ID
    name: string;            // 神位名称
    grade: number;           // 品级
    attr_type: number;       // 属性系
    count: number;           // 完整神位持有数
    inherited: boolean;      // 是否已继承（永久解锁，可付费切换回来）
    obtained_at: string;     // 首次获得时间
}

/** 碎片条目（含合成所需数，固定7） */
export interface FragmentItem {
    shenwei_id: number;      // 碎片对应的目标神位ID
    name: string;            // 目标神位名称
    count: number;           // 当前碎片数
    need: number;            // 合成所需数（固定7）
}

/** 神位总览响应（GET /shenwei/info） */
export interface ShenweiInfo {
    current: ShenweiDef | null;   // 当前激活神位完整定义（null=未激活）
    bag: ShenweiBagItem[];        // 已获得神位背包（含 inherited 标记）
    fragments: FragmentItem[];    // 碎片列表（含合成所需数7）
    talisman_count: number;       // 归元符持有数
    spirit_stone: number;         // 灵石余额
}

/** 碎片合成响应（POST /shenwei/synthesize） */
export interface SynthesizeData {
    shenwei_id: number;           // 合成得到的神位ID
    shenwei_name: string;         // 神位名称
    fragments_consumed: number;   // 本次消耗碎片数（固定7）
    fragments_left: number;       // 剩余碎片数
}

/** 神位融合响应（POST /shenwei/fuse） */
export interface FuseData {
    material_shenwei_id: number;  // 材料神位ID
    material_name: string;        // 材料神位名称
    material_consumed: number;    // 本次消耗材料数（固定9）
    product_shenwei_id: number;   // 融合产物神位ID
    product_name: string;         // 产物名称
    product_grade: number;        // 产物品级
}

/** 神位精气神加成（继承/切换响应中的 bonus 字段） */
export interface ShenweiBonus {
    jing: number;   // 精加成
    qi: number;     // 气加成
    shen: number;   // 神加成
}

/** 神位继承响应（POST /shenwei/inherit，继承即激活并重算衍生值） */
export interface InheritData {
    shenwei_id: number;           // 继承的神位ID
    shenwei_name: string;         // 神位名称
    bonus: ShenweiBonus;          // 精气神加成
    skill_id: number;             // 解锁的专属技能ID
    skill_tier: number;           // 技能档位
    derived: DerivedAttrsV2;      // 重算后的最新衍生属性
}

/** 神位切换响应（POST /shenwei/switch，晋升免费时费用字段为0） */
export interface SwitchData {
    old_shenwei_id: number;       // 切换前的神位ID
    new_shenwei_id: number;       // 切换后的神位ID
    new_name: string;             // 新神位名称
    is_promotion: boolean;        // 是否晋升（目标在上位链上，免费）
    spirit_stone: number;         // 本次扣的灵石（晋升时为0）
    talisman_count: number;       // 本次扣的归元符（晋升时为0）
    total_cost: number;           // 总成本灵石当量 = 灵石 + 归元符×99
    bonus: ShenweiBonus;          // 新神位精气神加成
    derived: DerivedAttrsV2;      // 重算后的最新衍生属性
}

// ═══════════════════════════════════════════
//  ShenweiApi
// ═══════════════════════════════════════════

export class ShenweiApi {

    /**
     * 神位总览：当前激活神位 + 背包 + 碎片 + 归元符数 + 灵石余额
     * 成功后自动广播 SHENWEI_UPDATED 事件（携带 ShenweiInfo 全量数据），
     * 神位面板（ShenweiPanel）监听后渲染，调用方无需再手动 emit
     */
    static async getInfo(characterId: number): Promise<ApiResponse<ShenweiInfo>> {
        const res = await HttpClient.get<ShenweiInfo>('/shenwei/info', {
            character_id: String(characterId),
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(ShenweiEvent.SHENWEI_UPDATED, res.data);
        }
        return res;
    }

    /**
     * 碎片合成：7个碎片 → 1个完整神位入背包
     * 碎片不足返回业务码 4001（HTTP 200，res.code !== 0）
     * 成功后自动广播 SHENWEI_SYNTHESIZED 事件（携带 SynthesizeData）
     */
    static async synthesize(characterId: number, shenweiId: number): Promise<ApiResponse<SynthesizeData>> {
        const res = await HttpClient.post<SynthesizeData>('/shenwei/synthesize', {
            character_id: characterId,
            shenwei_id: shenweiId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(ShenweiEvent.SHENWEI_SYNTHESIZED, res.data);
        }
        return res;
    }

    /**
     * 神位融合：9个同品级同属性系完整神位 → 1个高一阶神位（兵→将→帅）
     * shenweiId 为材料神位ID（如传妖兵ID，9妖兵→1妖将）
     * 材料不足 4002；已是最高阶（帅级/碎片线神位）4003
     * 成功后自动广播 SHENWEI_FUSED 事件（携带 FuseData）
     */
    static async fuse(characterId: number, shenweiId: number): Promise<ApiResponse<FuseData>> {
        const res = await HttpClient.post<FuseData>('/shenwei/fuse', {
            character_id: characterId,
            shenwei_id: shenweiId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(ShenweiEvent.SHENWEI_FUSED, res.data);
        }
        return res;
    }

    /**
     * 神位继承：消耗1个背包完整神位，永久解锁（inherited 标记）+立即激活
     * 门槛用"裸体精气神总和"判定（不含神位加成）：base + perLevel×(Lv-1)
     * 精气神门槛不足 4010；有下属且下属未继承 4012（如齐天大圣需先继承美猴王）
     * 成功后自动广播 SHENWEI_INHERITED 事件（携带 InheritData，含重算衍生值）
     */
    static async inherit(characterId: number, shenweiId: number): Promise<ApiResponse<InheritData>> {
        const res = await HttpClient.post<InheritData>('/shenwei/inherit', {
            character_id: characterId,
            shenwei_id: shenweiId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(ShenweiEvent.SHENWEI_INHERITED, res.data);
        }
        return res;
    }

    /**
     * 神位切换：在"已继承"的神位之间切换激活
     * 目标在当前神位上位链上 → 晋升免费；普通切换按旧(当前激活)神位品级
     * 扣 灵石+归元符（总成本 凡109/珍228/灵278/仙447/神话696/先天995）
     * 灵石不足 4020；归元符不足 4021
     * 成功后自动广播 SHENWEI_SWITCHED 事件（携带 SwitchData，含 is_promotion）
     */
    static async switchTo(characterId: number, shenweiId: number): Promise<ApiResponse<SwitchData>> {
        const res = await HttpClient.post<SwitchData>('/shenwei/switch', {
            character_id: characterId,
            shenwei_id: shenweiId,
        });
        if (res.code === 0 && res.data) {
            EventManager.emit(ShenweiEvent.SHENWEI_SWITCHED, res.data);
        }
        return res;
    }
}
