/**
 * 寻仙 - V5 圆形小地图 UI
 *
 * 功能：以玩家为中心的圆形小地图（Graphics 绘制）
 *   - 红点：附近怪物（数据源 GET /monster/list?zone_id=，定时刷新）
 *   - 绿点：神兽NPC 白泽/朱厌（数据源 GET /monster/divine-npc/status）
 *   - 金点：采集点（数据源 MapApi.GatherPoints 前端镜像配置表）
 *   - 线框：Zone 分区边界 + 禁区示意（数据源 GET /scene/zone/info）
 *   - 白点：玩家自身（圆心）
 *
 * 事件：
 *   - 监听 MapEvent.ZONE_INFO_UPDATED（生产者 MapApi）缓存分区/禁区数据
 *   - 监听 MapEvent.PLAYER_POS_CHANGED（生产者 HallScene 节流广播，米坐标）更新圆心
 *
 * 【坐标说明】本组件内部全部用"米"坐标运算（与后端一致），
 * 只在最终落点时按 radius/viewRangeM 比例换算成小地图像素
 *
 * 节点结构约定（编辑器搭建）：
 *   MinimapUI（挂本脚本，建议放屏幕右上角）
 *   ├─ MapGraphics  地图画布（Graphics，@property mapGraphics；
 *   │               建议同节点加 Mask(圆形) 组件裁掉圆外的边界线）
 *   └─ ZoneNameLabel 当前分区名（Label）
 */

import { _decorator, Component, Label, Color, Graphics } from 'cc';
import { ZoneInfoData, ZoneRect, ForbiddenArea, GatherPoints } from '../net/MapApi';
import { MonsterApi, MonsterEntityInfo, DivineNpcInfo } from '../net/MonsterApi';
import { EventManager } from '../manager/EventManager';
import { MapEvent } from '../common/Constants';

const { ccclass, property } = _decorator;

/** 怪物列表刷新间隔（秒） */
const MONSTER_REFRESH_S = 5;
/** 神兽NPC状态刷新间隔（秒） */
const DIVINE_REFRESH_S = 10;

@ccclass('MinimapUI')
export class MinimapUI extends Component {

    @property(Graphics) mapGraphics: Graphics | null = null;   // 地图画布
    @property(Label) zoneNameLabel: Label | null = null;        // 当前分区名

    /** 小地图半径（像素） */
    @property({}) radius: number = 140;
    /** 小地图显示范围（米）：圆边缘对应距玩家多少米 */
    @property({}) viewRangeM: number = 200;

    // ── 数据缓存 ──
    private _zones: ZoneRect[] = [];
    private _forbidden: ForbiddenArea[] = [];
    private _monsters: MonsterEntityInfo[] = [];
    private _divineNpcs: DivineNpcInfo[] = [];
    // 玩家当前位置（米），由 PLAYER_POS_CHANGED 事件驱动
    private _playerX: number = 0;
    private _playerY: number = 0;
    private _currentZoneId: number = 0;

    onLoad() {
        // 监听分区配置与玩家位置（生产者：MapApi / HallScene）
        EventManager.on(MapEvent.ZONE_INFO_UPDATED, this._onZoneInfo, this);
        EventManager.on(MapEvent.PLAYER_POS_CHANGED, this._onPlayerPos, this);

        // 分区配置不在这里主动拉取：HallScene 是唯一拉取方（onLoad 里调 MapApi.zoneInfo），
        // 本组件纯监听 ZONE_INFO_UPDATED 回流数据，避免同一接口重复请求

        // 定时刷新怪物红点与神兽绿点
        this.schedule(this._refreshMonsters, MONSTER_REFRESH_S);
        this.schedule(this._refreshDivineNpcs, DIVINE_REFRESH_S);
        this._refreshDivineNpcs();
    }

    onDestroy() {
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
    }

    // ═══════════════════════════════════════
    //  数据更新
    // ═══════════════════════════════════════

    private _onZoneInfo(data: ZoneInfoData) {
        this._zones = data.zones || [];
        this._forbidden = data.forbidden_areas || [];
        this._redraw();
    }

    /** 玩家位置变化（HallScene 节流广播，米坐标） */
    private _onPlayerPos(pos: { x: number; y: number }) {
        this._playerX = pos.x;
        this._playerY = pos.y;
        // 判定当前所在分区（用于分区名展示与怪物列表查询）
        const zone = this._findZoneAt(pos.x, pos.y);
        if (zone && zone.zone_id !== this._currentZoneId) {
            this._currentZoneId = zone.zone_id;
            if (this.zoneNameLabel) this.zoneNameLabel.string = zone.name;
            this._refreshMonsters();   // 换区立即刷一次怪
        }
        this._redraw();
    }

    /** 拉取当前分区怪物列表（红点数据源） */
    private async _refreshMonsters() {
        if (this._currentZoneId <= 0) return;
        try {
            const res = await MonsterApi.monsterListByZone(this._currentZoneId);
            if (res.code === 0 && res.data) {
                this._monsters = res.data.monsters || [];
                this._redraw();
            }
        } catch { /* 静默，下轮再试 */ }
    }

    /** 拉取神兽NPC状态（绿点数据源） */
    private async _refreshDivineNpcs() {
        try {
            const res = await MonsterApi.divineNpcStatus();
            if (res.code === 0 && res.data) {
                this._divineNpcs = res.data.divine_npcs || [];
                this._redraw();
            }
        } catch { /* 静默，下轮再试 */ }
    }

    private _findZoneAt(xM: number, yM: number): ZoneRect | null {
        for (const z of this._zones) {
            if (xM >= z.x_min && xM <= z.x_max && yM >= z.y_min && yM <= z.y_max) {
                // 营地(zone1)嵌在原野(zone2)里，小矩形优先匹配
                if (z.zone_id === 1) return z;
            }
        }
        for (const z of this._zones) {
            if (xM >= z.x_min && xM <= z.x_max && yM >= z.y_min && yM <= z.y_max) {
                return z;
            }
        }
        return null;
    }

    // ═══════════════════════════════════════
    //  绘制
    // ═══════════════════════════════════════

    /** 米坐标 → 小地图局部像素（以玩家为圆心） */
    private _toLocal(xM: number, yM: number): { x: number; y: number; dist: number } {
        const scale = this.radius / this.viewRangeM;
        const lx = (xM - this._playerX) * scale;
        const ly = (yM - this._playerY) * scale;
        return { x: lx, y: ly, dist: Math.sqrt(lx * lx + ly * ly) };
    }

    private _redraw() {
        const g = this.mapGraphics;
        if (!g) return;
        g.clear();

        // 1. 底盘：深色圆 + 金色描边
        g.fillColor = new Color(26, 26, 46, 200);
        g.circle(0, 0, this.radius);
        g.fill();
        g.strokeColor = new Color().fromHEX('#D4A843');
        g.lineWidth = 2;
        g.circle(0, 0, this.radius);
        g.stroke();

        // 2. Zone 边界线框（灰白细线；圆外部分建议编辑器加圆形 Mask 裁掉）
        g.strokeColor = new Color(200, 200, 200, 120);
        g.lineWidth = 1;
        for (const z of this._zones) {
            this._strokeRectM(g, z.x_min, z.y_min, z.x_max, z.y_max);
        }

        // 3. 禁区示意（红色细线框）
        g.strokeColor = new Color(231, 76, 60, 150);
        for (const f of this._forbidden) {
            this._strokeRectM(g, f.x_min, f.y_min, f.x_max, f.y_max);
        }

        // 4. 金点：采集点（前端镜像配置表，只画视野内的）
        g.fillColor = new Color().fromHEX('#D4A843');
        for (const p of GatherPoints) {
            const l = this._toLocal(p.x, p.y);
            if (l.dist > this.radius) continue;
            g.circle(l.x, l.y, 3);
            g.fill();
        }

        // 5. 红点：怪物（只画视野内存活的；state 3=死亡 4=已抓捕 不画）
        g.fillColor = new Color().fromHEX('#E74C3C');
        for (const m of this._monsters) {
            if (m.state === 3 || m.state === 4) continue;
            const l = this._toLocal(m.pos_x, m.pos_y);
            if (l.dist > this.radius) continue;
            g.circle(l.x, l.y, 3);
            g.fill();
        }

        // 6. 绿点：神兽NPC（白泽/朱厌，稍大一号；暴走中变亮红以示危险）
        for (const n of this._divineNpcs) {
            const l = this._toLocal(n.pos_x, n.pos_y);
            if (l.dist > this.radius) continue;
            g.fillColor = n.state === 1
                ? new Color().fromHEX('#FF3B30')   // 暴走：亮红警告
                : new Color().fromHEX('#2ECC71');  // 沉睡：绿色
            g.circle(l.x, l.y, 5);
            g.fill();
        }

        // 7. 白点：玩家自身（圆心）
        g.fillColor = Color.WHITE;
        g.circle(0, 0, 4);
        g.fill();
    }

    /** 画一个"米坐标系矩形"的边框（换算到小地图局部坐标） */
    private _strokeRectM(g: Graphics, xMin: number, yMin: number, xMax: number, yMax: number) {
        const a = this._toLocal(xMin, yMin);
        const b = this._toLocal(xMax, yMax);
        // 粗裁剪：矩形离玩家太远（四角都在两倍半径外）就不画，省性能
        const c = this._toLocal(xMin, yMax);
        const d = this._toLocal(xMax, yMin);
        const near = Math.min(a.dist, b.dist, c.dist, d.dist);
        if (near > this.radius * 4) return;
        g.rect(a.x, a.y, b.x - a.x, b.y - a.y);
        g.stroke();
    }
}
