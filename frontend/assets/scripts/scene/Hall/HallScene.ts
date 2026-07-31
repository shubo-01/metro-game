/**
 * 寻仙 - 初始之地大厅场景
 * Cocos Creator 3.8 Component
 *
 * 功能：
 * 1. 2.5D 场景渲染（天空/山脉/地面网格/装饰物）
 * 2. 角色点击移动 + 相机跟随
 * 3. AOI 可视范围实体管理
 * 4. WebSocket 位置同步（10Hz）
 * 5. NPC 交互
 * 6. 功能入口面板
 * 7. 【V5】摇杆移动（叠加输入源）+ 移动限速校验（6013回正）+ Zone边界/空气墙
 * 8. 【V5】翻滚位移 + 受击硬直锁移动 + 采集交互（靠近弹按钮）
 * 9. 【V5】天雷懒结算（登录首查+定时轮询，配合 PublicEnemyIndicator 警告）
 */

import { _decorator, Component, Node, Vec2, Vec3, Graphics, Color, view, Camera, EventTouch, Label } from 'cc';
import { WsClient } from '../../net/WsClient';
import { HttpClient } from '../../net/HttpClient';
import { PlayerManager } from '../../manager/PlayerManager';
import { TokenManager } from '../../manager/TokenManager';
import { EventManager, GameEvent } from '../../manager/EventManager';
import { AOIConfig, SceneID, ThemeColor, MapConfig, MapEvent, BattleEvent, SamsaraEvent, TutorialEvent } from '../../common/Constants';
import {
    MapApi, ZoneInfoData, ZoneEnterData, GatherData, ZoneRect, ForbiddenArea, MoveRule,
    findNearestGatherPoint, GatherPointConfig, MapErrorText,
    ERR_MOVE_TOO_FAST, ERR_ZONE_ILLEGAL_POS, ERR_ZONE_NOT_FOUND, ERR_GATHER_IN_CD,
} from '../../net/MapApi';
import { SamsaraApi, ThunderCheckData } from '../../net/SamsaraApi';
import { TutorialSystem } from '../../manager/TutorialSystem';
import { SettingsStorage } from '../../manager/SettingsStorage';
import { TutorialUI } from '../../ui/TutorialUI';
import { HallUI } from './HallUI';
import { PlayerEntity } from './PlayerEntity';
import { NPCEntity } from './NPCEntity';

const { ccclass, property } = _decorator;

/** 世界参数 */
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 2000;
const MOVE_SPEED = 3; // 像素/帧（旧点击寻路用，保留）
const SYNC_INTERVAL = AOIConfig.SYNC_INTERVAL;
/** V5 翻滚位移距离（米）：一次翻滚瞬移3米（不超过限速判定的容忍范围） */
const ROLL_DIST_M = 3;
/** V5 天雷懒结算轮询间隔（秒） */
const THUNDER_CHECK_INTERVAL_S = 60;
/** V5 小地图位置广播/采集点检测节流间隔（秒） */
const POS_BROADCAST_INTERVAL_S = 0.5;
/** V5 空气墙提示的最小间隔（秒），防止贴墙移动时刷屏 */
const WALL_TOAST_CD_S = 2;

@ccclass('HallScene')
export class HallScene extends Component {

    // ─── UI 引用 ───

    @property(Node)
    worldNode: Node | null = null;

    @property(Node)
    cameraNode: Node | null = null;

    @property(Node)
    entityContainer: Node | null = null;

    @property(Node)
    groundLayer: Node | null = null;

    @property(HallUI)
    hallUI: HallUI | null = null;

    /** V5 采集按钮（平时隐藏，靠近采集点5米内显示；含子节点 Label 显示"采集 xx"） */
    @property(Node)
    gatherBtn: Node | null = null;

    // ─── 内部状态 ───

    private _wsClient: WsClient = new WsClient();
    private _playerManager: PlayerManager = new PlayerManager();
    private _tokenManager: TokenManager = new TokenManager();
    private _playerNode: Node | null = null;
    private _playerEntity: PlayerEntity | null = null;
    private _entities: Map<number, Node> = new Map();

    // 移动
    private _moveTarget: Vec2 | null = null;
    private _isMoving: boolean = false;

    // ─── V5 摇杆移动（叠加输入源，优先级高于点击寻路） ───
    private _joyActive: boolean = false;
    private _joyDirX: number = 0;
    private _joyDirY: number = 0;
    // 最近一次移动朝向（翻滚位移方向用，默认朝右）
    private _faceX: number = 1;
    private _faceY: number = 0;

    // ─── V5 地图数据缓存（来自 /scene/zone/info，用于本地空气墙预检） ───
    private _zones: ZoneRect[] = [];
    private _forbidden: ForbiddenArea[] = [];
    private _moveRule: MoveRule = { base_speed: 5, speed_bonus_cap: 0.5, max_speed: 7.5 };
    private _currentZoneId: number = 0;

    // ─── V5 节流计时器与防重入标记 ───
    private _validateTimer: number = 0;        // move/validate 节流
    private _validating: boolean = false;      // move/validate 请求在途
    private _posBroadcastTimer: number = 0;    // 小地图位置广播节流
    private _wallToastCd: number = 0;          // 空气墙提示防刷屏
    private _staggerRemain: number = 0;        // 受击硬直剩余秒数（>0 锁移动）
    private _nearGather: GatherPointConfig | null = null;   // 5米内最近采集点
    private _gathering: boolean = false;       // 采集读条/请求在途防重入

    // ─── V6 营地出口引导标记节点（引导第4步 camp_exit 高亮/箭头目标） ───
    private _campExitNode: Node | null = null;

    // 同步
    private _syncTimer: number = 0;
    private _moveSeq: number = 0;
    private _lastSyncTime: number = 0;

    // 相机
    private _cameraX: number = 0;
    private _cameraY: number = 0;
    private _viewWidth: number = 0;
    private _viewHeight: number = 0;

    // NPC 配置
    private readonly _npcs: Array<{ id: number; name: string; x: number; y: number; type: string }> = [
        { id: 1, name: '张真人', x: 500, y: 400, type: 'quest' },
        { id: 2, name: '药铺掌柜', x: 900, y: 350, type: 'shop' },
        { id: 3, name: '铸器师', x: 1300, y: 500, type: 'shop' },
    ];

    // ═══════════════════════════════════════
    //  生命周期
    // ═══════════════════════════════════════

    onLoad() {
        // 获取屏幕尺寸
        const visibleSize = view.getVisibleSize();
        this._viewWidth = visibleSize.width;
        this._viewHeight = visibleSize.height;

        // 进入场景
        this._enterScene();

        // 监听事件
        EventManager.on(GameEvent.ENTITY_ENTER_VIEW, this._onEntityEnter, this);
        EventManager.on(GameEvent.ENTITY_LEAVE_VIEW, this._onEntityLeave, this);
        EventManager.on(GameEvent.WS_MESSAGE, this._onWsMessage, this);
        EventManager.on(GameEvent.WS_KICK_OUT, this._onKickOut, this);
        EventManager.on(GameEvent.WS_DISCONNECTED, this._onDisconnected, this);
        EventManager.on(GameEvent.CHAT_MESSAGE, this._onChatMessage, this);

        // ─── V5 事件监听 ───
        // 摇杆输入（生产者 JoystickUI）
        EventManager.on(MapEvent.JOYSTICK_MOVE, this._onJoystickMove, this);
        EventManager.on(MapEvent.JOYSTICK_END, this._onJoystickEnd, this);
        // 分区配置到达（生产者 MapApi，缓存分区/禁区做本地空气墙预检）
        EventManager.on(MapEvent.ZONE_INFO_UPDATED, this._onZoneInfoUpdated, this);
        // 进入分区成功 / 采集完成（生产者 MapApi 封装层，成功后自动广播）：
        // 成功提示统一走事件回调，调用点只处理错误分支（生产者/消费者配对，不留孤儿事件）
        EventManager.on(MapEvent.ZONE_ENTERED, this._onZoneEntered, this);
        EventManager.on(MapEvent.MAP_GATHERED, this._onMapGathered, this);
        // 翻滚（生产者 CombatHUDUI 翻滚按钮）与受击硬直（生产者 CombatHUDUI.applyHit）
        EventManager.on(BattleEvent.BATTLE_ROLL, this._onRoll, this);
        EventManager.on(BattleEvent.BATTLE_STAGGER, this._onStagger, this);
        // 天雷懒结算结果（生产者 SamsaraApi）
        EventManager.on(SamsaraEvent.THUNDER_CHECKED, this._onThunderChecked, this);

        // 地面触摸事件
        this.groundLayer?.on(Node.EventType.TOUCH_END, this._onGroundTouch, this);

        // ─── V5 采集按钮点击 ───
        this.gatherBtn?.on(Node.EventType.TOUCH_END, this._onGatherClick, this);
        if (this.gatherBtn) this.gatherBtn.active = false;

        // ─── V5 拉取地图分区配置（结果经 ZONE_INFO_UPDATED 事件回流） ───
        MapApi.zoneInfo().catch(() => { /* 网络异常静默：边界预检暂缺，权威判定仍在后端 */ });

        // ─── V5 天雷懒结算：登录首查（补算离线积欠）+ 定时轮询 ───
        this._thunderCheck(true);
        this.schedule(() => this._thunderCheck(false), THUNDER_CHECK_INTERVAL_S);

        // ─── V6 新手引导状态机：拉状态，新角色（next_step>0）自动启动 ───
        TutorialSystem.init(this._playerManager.playerId);

        // ─── V6 设置同步：登录后拉服务端设置合并本地（本地优先策略） ───
        SettingsStorage.syncFromServer(this._playerManager.playerId)
            .catch(() => { /* 网络异常静默：用本地/默认值兜底，重登会再拉 */ });
    }

    onDestroy() {
        // V6 引导状态机停机（解绑它自己的事件监听）+ 注销引导目标节点
        TutorialSystem.shutdown();
        TutorialUI.unregisterTarget('npc_elder');
        // V6 评审修复：营地出口标记也要注销（节点随场景销毁，不手动 destroy）
        TutorialUI.unregisterTarget('camp_exit');
        this._campExitNode = null;
        EventManager.offAll(this);
        this.unscheduleAllCallbacks();
        this._wsClient.disconnect();
    }

    update(dt: number) {
        // V5 受击硬直：硬直期间锁一切移动输入（BATTLE_STAGGER 事件驱动）
        if (this._staggerRemain > 0) {
            this._staggerRemain -= dt;
        } else if (this._joyActive && this._playerNode && (this._joyDirX !== 0 || this._joyDirY !== 0)) {
            // ── V5 摇杆移动（叠加输入源，优先级高于点击寻路）──
            // 速度用服务端 move_rule.base_speed（米/秒）换算像素，
            // 保证摇杆移动不触发 6013 超速回正（权威限速在后端）
            const speedPx = this._moveRule.base_speed * MapConfig.PIXELS_PER_METER;
            const pos = this._playerNode.position;
            const nx = pos.x + this._joyDirX * speedPx * dt;
            const ny = pos.y + this._joyDirY * speedPx * dt;
            this._tryMoveTo(nx, ny);
            this._playerEntity?.setAction(1); // walk
            // 摇杆期间取消点击寻路目标（摇杆是更直接的玩家意图）
            this._moveTarget = null;
            this._isMoving = false;
        } else if (this._isMoving && this._moveTarget && this._playerNode) {
            // ── 既有点击寻路移动（保留原逻辑，叠加空气墙检测）──
            const pos = this._playerNode.position;
            const dx = this._moveTarget.x - pos.x;
            const dy = this._moveTarget.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < MOVE_SPEED) {
                // 到达目标
                this._playerNode.setPosition(this._moveTarget.x, this._moveTarget.y, 0);
                this._isMoving = false;
                this._moveTarget = null;
                this._playerEntity?.setAction(0); // idle
                this._playerManager.updatePosition(this._playerNode.position.x, this._playerNode.position.y);
            } else {
                // 移动中（记录朝向供翻滚用；撞到边界/禁区则停止寻路）
                this._faceX = dx / dist;
                this._faceY = dy / dist;
                const nx = pos.x + this._faceX * MOVE_SPEED;
                const ny = pos.y + this._faceY * MOVE_SPEED;
                if (this._tryMoveTo(nx, ny)) {
                    this._playerEntity?.setAction(1); // walk
                } else {
                    // 空气墙：停止寻路（提示已在 _tryMoveTo 里做）
                    this._isMoving = false;
                    this._moveTarget = null;
                    this._playerEntity?.setAction(0);
                }
            }
        }

        // 相机跟随
        this._updateCamera();

        // 位置同步（10Hz）
        this._syncTimer += dt * 1000;
        if (this._syncTimer >= SYNC_INTERVAL) {
            this._syncTimer = 0;
            this._syncPosition();
        }

        // V5 节流任务：位置广播/采集点检测/分区切换/移动校验
        this._v5Tick(dt);
    }

    // ═══════════════════════════════════════
    //  进入场景
    // ═══════════════════════════════════════

    private async _enterScene() {
        const playerId = this._playerManager.playerId;

        try {
            const res = await HttpClient.post('/scene/enter', {
                playerId,
                sceneId: SceneID.INITIAL_HALL,
            });

            if (res.code !== 0) {
                console.error('[HallScene] 进入场景失败:', res.msg);
                return;
            }

            // 设置玩家初始位置
            const posX = res.data.posX || 0;
            const posY = res.data.posY || 0;
            this._playerManager.updatePosition(posX, posY);

            // 创建玩家节点
            this._createPlayerNode(posX, posY);

            // 创建 NPC
            this._createNPCs();

            // 加载可见实体
            if (res.data.entities) {
                for (const entity of res.data.entities) {
                    if (entity.entityId !== playerId) {
                        this._addRemoteEntity(entity);
                    }
                }
            }

            // 连接 WebSocket
            this._wsClient.connect(
                this._tokenManager.getToken(),
                playerId,
            );

            // 更新 UI
            this.hallUI?.updatePlayerInfo(this._playerManager);

        } catch (err) {
            console.error('[HallScene] 进入场景异常:', err);
        }
    }

    // ═══════════════════════════════════════
    //  玩家节点
    // ═══════════════════════════════════════

    private _createPlayerNode(x: number, y: number) {
        if (!this.entityContainer) return;

        this._playerNode = new Node('Player');
        this._playerNode.setPosition(x, y, 0);
        this.entityContainer.addChild(this._playerNode);

        this._playerEntity = this._playerNode.addComponent(PlayerEntity);
        this._playerEntity.init({
            name: this._playerManager.name,
            gender: this._playerManager.gender,
            levelText: this._playerManager.getLevelText(),
            isSelf: true,
        });
    }

    // ═══════════════════════════════════════
    //  NPC
    // ═══════════════════════════════════════

    private _createNPCs() {
        for (const npcCfg of this._npcs) {
            const npcNode = new Node(`NPC_${npcCfg.name}`);
            npcNode.setPosition(npcCfg.x, npcCfg.y, 0);

            const npcEntity = npcNode.addComponent(NPCEntity);
            npcEntity.init({
                npcId: npcCfg.id,
                name: npcCfg.name,
                interactType: npcCfg.type,
            });

            // NPC 点击事件
            npcNode.on(Node.EventType.TOUCH_END, () => {
                this._interactNPC(npcCfg);
            }, this);

            // V6 引导第1步高亮目标：张真人(id=1)代任"营地长老"（假设值，可配）
            if (npcCfg.id === 1) {
                TutorialUI.registerTarget('npc_elder', npcNode);
            }

            this.entityContainer?.addChild(npcNode);
        }
    }

    private async _interactNPC(npcCfg: { id: number; name: string; x: number; y: number; type: string }) {
        if (!this._playerNode) return;

        const playerPos = this._playerNode.position;
        const dx = npcCfg.x - playerPos.x;
        const dy = npcCfg.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 150) {
            // 自动寻路到 NPC 附近
            this._moveTarget = new Vec2(npcCfg.x - 80, npcCfg.y);
            this._isMoving = true;
            this._showToast(`正在走向 ${npcCfg.name}...`);
            return;
        }

        try {
            const res = await HttpClient.post('/scene/interact', {
                playerId: this._playerManager.playerId,
                npcId: npcCfg.id,
                action: npcCfg.type,
            });

            if (res.code === 0) {
                this.hallUI?.showNPCDialog(npcCfg.name, res.data);
                // V6 广播 NPC 对话完成（消费者 TutorialSystem 判定第1步"和长老对话"）
                EventManager.emit(TutorialEvent.NPC_TALKED, npcCfg.id);
            }
        } catch {
            this._showToast('交互失败');
        }
    }

    // ═══════════════════════════════════════
    //  触摸移动
    // ═══════════════════════════════════════

    private _onGroundTouch(event: EventTouch) {
        const loc = event.getUILocation();
        // 将屏幕坐标转换为世界坐标
        const worldX = loc.x - this._viewWidth / 2 + this._cameraX;
        const worldY = loc.y - this._viewHeight / 2 + this._cameraY;

        // 限制在世界边界内
        const clampedX = Math.max(0, Math.min(WORLD_WIDTH, worldX));
        const clampedY = Math.max(0, Math.min(WORLD_HEIGHT, worldY));

        this._moveTarget = new Vec2(clampedX, clampedY);
        this._isMoving = true;
    }

    // ═══════════════════════════════════════
    //  相机
    // ═══════════════════════════════════════

    private _updateCamera() {
        if (!this._playerNode || !this.cameraNode) return;

        const pos = this._playerNode.position;
        const targetX = Math.max(this._viewWidth / 2, Math.min(WORLD_WIDTH - this._viewWidth / 2, pos.x));
        const targetY = Math.max(this._viewHeight / 2, Math.min(WORLD_HEIGHT - this._viewHeight / 2, pos.y));

        // 平滑跟随
        this._cameraX += (targetX - this._cameraX) * 0.1;
        this._cameraY += (targetY - this._cameraY) * 0.1;

        this.cameraNode.setPosition(this._cameraX, this._cameraY, 0);
    }

    // ═══════════════════════════════════════
    //  WebSocket 位置同步
    // ═══════════════════════════════════════

    private _syncPosition() {
        if (!this._playerNode || !this._wsClient.connected) return;

        const pos = this._playerNode.position;
        this._moveSeq++;
        this._wsClient.sendMove(pos.x, pos.y, this._moveSeq, 0);
    }

    private _onWsMessage(type: string, payload: any) {
        switch (type) {
            case 'sync_frame':
                if (payload.entities) {
                    this._processSyncFrame(payload.entities);
                }
                break;
            case 'reconnect_ack':
                console.log('[HallScene] 重连成功');
                break;
        }
    }

    private _processSyncFrame(entities: any[]) {
        for (const entity of entities) {
            if (entity.entityId === this._playerManager.playerId) continue;

            const node = this._entities.get(entity.entityId);
            if (node) {
                // 更新位置
                node.setPosition(entity.x, entity.y, 0);
            } else {
                // 新实体
                this._addRemoteEntity(entity);
            }
        }
    }

    // ═══════════════════════════════════════
    //  AOI 实体管理
    // ═══════════════════════════════════════

    private _onEntityEnter(payload: any) {
        if (payload.entity && payload.entity.entityId !== this._playerManager.playerId) {
            this._addRemoteEntity(payload.entity);
        }
    }

    private _onEntityLeave(payload: any) {
        const node = this._entities.get(payload.entityId);
        if (node) {
            node.destroy();
            this._entities.delete(payload.entityId);
        }
    }

    private _addRemoteEntity(entity: any) {
        if (!this.entityContainer) return;
        if (this._entities.has(entity.entityId)) return;

        const node = new Node(`Entity_${entity.entityId}`);
        node.setPosition(entity.x, entity.y, 0);

        if (entity.entityType === 1) {
            // 远程玩家
            const pe = node.addComponent(PlayerEntity) as PlayerEntity;
            pe.init({
                name: entity.name,
                gender: entity.gender,
                levelText: '',
                isSelf: false,
            });
        }

        this.entityContainer.addChild(node);
        this._entities.set(entity.entityId, node);
    }

    // ═══════════════════════════════════════
    //  V5 摇杆输入 / 翻滚 / 硬直
    // ═══════════════════════════════════════

    /** 摇杆拖动中（JoystickUI 广播）：记录归一化方向，update 里逐帧驱动移动 */
    private _onJoystickMove(d: { dirX: number; dirY: number; octant: number }) {
        this._joyActive = true;
        this._joyDirX = d.dirX;
        this._joyDirY = d.dirY;
        // 记录朝向供翻滚位移使用
        if (d.dirX !== 0 || d.dirY !== 0) {
            this._faceX = d.dirX;
            this._faceY = d.dirY;
        }
    }

    /** 摇杆松开（JoystickUI 广播）：停止摇杆移动并切回站立动作 */
    private _onJoystickEnd() {
        this._joyActive = false;
        this._joyDirX = 0;
        this._joyDirY = 0;
        this._playerEntity?.setAction(0); // idle
    }

    /** 分区配置到达（MapApi 广播）：缓存分区/禁区/限速规则，做本地空气墙预检 */
    private _onZoneInfoUpdated(data: ZoneInfoData) {
        this._zones = data.zones || [];
        this._forbidden = data.forbidden_areas || [];
        if (data.move_rule) this._moveRule = data.move_rule;
        // V6 评审修复：分区数据到达后创建营地出口引导标记（camp_exit 目标）
        this._ensureCampExitMarker();
    }

    /**
     * 创建营地出口引导标记节点并注册为 camp_exit（V6 评审修复）：
     * 场景里没有现成的"营地出口"节点，这里用分区数据（zone_id=1 营地矩形）
     * 在东边界中点创建一个轻量空节点当出口指示位（营地嵌在原野内，
     * 任意方向都能出去，选东边界为假设值可配）；
     * 分区数据拉不到时不创建，保持 TutorialUI "箭头自动隐藏只显文案"的降级行为
     */
    private _ensureCampExitMarker() {
        if (this._campExitNode) return;   // 已创建过（分区配置重拉不重复建）
        const camp = this._zones.find(z => z.zone_id === 1);
        if (!camp || !this.entityContainer) return;
        // 米坐标 → 像素：东边界 x_max，垂直中点 (y_min+y_max)/2
        const px = camp.x_max * MapConfig.PIXELS_PER_METER;
        const py = (camp.y_min + camp.y_max) / 2 * MapConfig.PIXELS_PER_METER;
        const marker = new Node('CampExitMarker');
        marker.setPosition(px, py, 0);
        this.entityContainer.addChild(marker);
        this._campExitNode = marker;
        // 注册为引导第4步"出营地探索"的高亮/箭头目标（销毁时在 onDestroy 注销）
        TutorialUI.registerTarget('camp_exit', marker);
    }

    /** 翻滚（CombatHUDUI 翻滚按钮广播）：按最近朝向瞬移3米（硬直期间不可翻滚） */
    private _onRoll() {
        if (this._staggerRemain > 0 || !this._playerNode) return;
        const distPx = ROLL_DIST_M * MapConfig.PIXELS_PER_METER;
        const pos = this._playerNode.position;
        this._tryMoveTo(pos.x + this._faceX * distPx, pos.y + this._faceY * distPx);
    }

    /** 受击硬直（CombatHUDUI.applyHit 广播）：硬直期间锁一切移动输入 */
    private _onStagger(staggerS: number) {
        if (!staggerS || staggerS <= 0) return;
        this._staggerRemain = staggerS;
        // 打断当前寻路（硬直结束后需玩家重新操作，符合"受击打断"手感）
        this._isMoving = false;
        this._moveTarget = null;
        this._playerEntity?.setAction(0);
    }

    // ═══════════════════════════════════════
    //  V5 移动落点检测（本地空气墙预检）
    // ═══════════════════════════════════════

    /**
     * 尝试把玩家移动到 (x,y)（像素坐标）：
     *   1. 先钳制在世界像素边界内
     *   2. 换算成米后做本地预检：不在任何分区=边界外(6001语义)，落在禁区=空气墙(6002语义)
     *   3. 预检通过才真正 setPosition；不通过则 toast 提示（带防刷屏CD）并返回 false
     * 【注意】这只是前端手感预检，权威判定仍在后端 /scene/move/validate
     */
    private _tryMoveTo(x: number, y: number): boolean {
        if (!this._playerNode) return false;
        const nx = Math.max(0, Math.min(WORLD_WIDTH, x));
        const ny = Math.max(0, Math.min(WORLD_HEIGHT, y));
        const xM = MapConfig.pxToMeter(nx);
        const yM = MapConfig.pxToMeter(ny);

        // 分区配置已到达时才做预检（没到达时放行，交给后端权威判定）
        if (this._zones.length > 0) {
            if (!this._zoneAt(xM, yM)) {
                this._wallToast(MapErrorText[ERR_ZONE_NOT_FOUND]);
                return false;
            }
            if (this._inForbidden(xM, yM)) {
                this._wallToast(MapErrorText[ERR_ZONE_ILLEGAL_POS]);
                return false;
            }
        }

        this._playerNode.setPosition(nx, ny, 0);
        this._playerManager.updatePosition(nx, ny);
        return true;
    }

    /** 空气墙提示（带防刷屏CD：贴墙持续移动时最多每2秒提示一次） */
    private _wallToast(msg: string) {
        if (this._wallToastCd > 0) return;
        this._wallToastCd = WALL_TOAST_CD_S;
        this._showToast(msg);
    }

    /** 找出米坐标 (xM,yM) 所在分区；营地(zone1)嵌在原野(zone2)内，须优先匹配 */
    private _zoneAt(xM: number, yM: number): ZoneRect | null {
        let fallback: ZoneRect | null = null;
        for (const z of this._zones) {
            if (xM >= z.x_min && xM <= z.x_max && yM >= z.y_min && yM <= z.y_max) {
                if (z.zone_id === 1) return z; // 营地优先
                if (!fallback) fallback = z;
            }
        }
        return fallback;
    }

    /** 米坐标 (xM,yM) 是否落在禁区矩形（空气墙）内 */
    private _inForbidden(xM: number, yM: number): boolean {
        for (const f of this._forbidden) {
            if (xM >= f.x_min && xM <= f.x_max && yM >= f.y_min && yM <= f.y_max) {
                return true;
            }
        }
        return false;
    }

    // ═══════════════════════════════════════
    //  V5 节流任务（update 每帧调用）
    // ═══════════════════════════════════════

    /** V5 节流总入口：空气墙提示CD递减 + 位置广播/采集检测/分区切换 + 移动校验 */
    private _v5Tick(dt: number) {
        if (this._wallToastCd > 0) this._wallToastCd -= dt;
        if (!this._playerNode) return;

        const pos = this._playerNode.position;
        const xM = MapConfig.pxToMeter(pos.x);
        const yM = MapConfig.pxToMeter(pos.y);

        // 位置广播（0.5秒节流）：小地图重画中心 + 采集按钮显隐 + 分区切换检测
        this._posBroadcastTimer += dt;
        if (this._posBroadcastTimer >= POS_BROADCAST_INTERVAL_S) {
            this._posBroadcastTimer = 0;
            EventManager.emit(MapEvent.PLAYER_POS_CHANGED, { x: xM, y: yM });
            this._updateGatherButton(xM, yM);
            this._checkZoneChange(xM, yM);
        }

        // 移动限速/出界校验（1秒节流，仅移动中上报）
        this._validateTimer += dt;
        if (this._validateTimer >= MapConfig.MOVE_VALIDATE_INTERVAL_S) {
            this._validateTimer = 0;
            if (this._isMoving || this._joyActive) {
                this._validateMove(xM, yM);
            }
        }
    }

    /**
     * 移动校验上报：6013 超速 / 6002 出界禁区时，
     * 后端 data 附回正坐标（米），前端必须把玩家节点拉回该坐标
     */
    private async _validateMove(xM: number, yM: number) {
        if (this._validating) return;   // 请求在途防重入
        this._validating = true;
        try {
            const res = await MapApi.moveValidate(this._playerManager.playerId, xM, yM, 0);
            if ((res.code === ERR_MOVE_TOO_FAST || res.code === ERR_ZONE_ILLEGAL_POS)
                && res.data && res.data.correct_x !== undefined && res.data.correct_y !== undefined) {
                // 位置回正：后端坐标是米，落回场景须换算像素
                const px = MapConfig.meterToPx(res.data.correct_x);
                const py = MapConfig.meterToPx(res.data.correct_y!);
                this._playerNode?.setPosition(px, py, 0);
                this._playerManager.updatePosition(px, py);
                this._isMoving = false;
                this._moveTarget = null;
                this._showToast(res.msg || MapErrorText[res.code]);
            }
        } catch {
            // 网络异常静默：下个节流周期会再校验
        } finally {
            this._validating = false;
        }
    }

    /** 分区切换检测：跨入新分区时调 zone/enter 登记（成功横幅走 ZONE_ENTERED 事件回调） */
    private async _checkZoneChange(xM: number, yM: number) {
        const zone = this._zoneAt(xM, yM);
        if (!zone || zone.zone_id === this._currentZoneId) return;
        this._currentZoneId = zone.zone_id;
        try {
            const res = await MapApi.zoneEnter(this._playerManager.playerId, zone.zone_id, xM, yM);
            // 成功分支不在这里处理：MapApi 成功后广播 ZONE_ENTERED，由 _onZoneEntered 弹横幅
            if (res.code === ERR_ZONE_NOT_FOUND || res.code === ERR_ZONE_ILLEGAL_POS) {
                this._showToast(res.msg || MapErrorText[res.code]);
            }
        } catch {
            // 网络异常静默：登记失败不影响移动，下次跨区会重试
            this._currentZoneId = 0;
        }
    }

    /** 进入分区成功（MapApi 广播）：分区横幅——名称 + 安全区/推荐等级提示 */
    private _onZoneEntered(data: ZoneEnterData) {
        this._showToast(`进入【${data.name}】` +
            (data.is_safe_zone ? '（安全区）' : `（推荐等级 ${data.rec_level_min}-${data.rec_level_max}）`));
    }

    // ═══════════════════════════════════════
    //  V5 采集交互
    // ═══════════════════════════════════════

    /** 采集按钮显隐：5米内有采集点且不在采集中才显示，按钮文字"采集 xx" */
    private _updateGatherButton(xM: number, yM: number) {
        this._nearGather = findNearestGatherPoint(xM, yM, MapConfig.GATHER_MAX_DISTANCE_M);
        if (!this.gatherBtn) return;   // @property 判空
        this.gatherBtn.active = !!this._nearGather && !this._gathering;
        if (this._nearGather) {
            const labelNode = this.gatherBtn.getChildByName('Label');
            const label = labelNode ? labelNode.getComponent(Label) : null;
            if (label) label.string = `采集 ${this._nearGather.item_name}`;
        }
    }

    /** 采集按钮点击：3秒读条演出后调 /scene/gather 领产出 */
    private _onGatherClick() {
        if (this._gathering) return;   // 读条/请求在途防重入
        const point = this._nearGather;
        if (!point || !this._playerNode) return;

        this._gathering = true;
        if (this.gatherBtn) this.gatherBtn.active = false;
        this._showToast(`正在采集【${point.item_name}】...（3秒）`);

        // 3秒读条结束后再调接口（后端会再做5米距离权威判定）
        this.scheduleOnce(async () => {
            try {
                const pos = this._playerNode!.position;
                const res = await MapApi.gather(
                    this._playerManager.playerId, point.point_id,
                    MapConfig.pxToMeter(pos.x), MapConfig.pxToMeter(pos.y),
                );
                if (res.code === 0 && res.data) {
                    // 成功提示不在这里处理：MapApi 成功后广播 MAP_GATHERED，由 _onMapGathered 弹 toast
                } else if (res.code === ERR_GATHER_IN_CD && res.data && res.data.remaining_seconds !== undefined) {
                    this._showToast(`该采集点冷却中，还需 ${res.data.remaining_seconds} 秒`);
                } else {
                    this._showToast(res.msg || MapErrorText[res.code] || '采集失败');
                }
            } catch {
                this._showToast('网络错误，采集失败');
            } finally {
                this._gathering = false;
            }
        }, 3);
    }

    /** 采集完成（MapApi 广播）：success=false 是碎灵矿30%概率判定失败，不算错误，照常进CD */
    private _onMapGathered(data: GatherData) {
        this._showToast(data.success
            ? `采集成功！获得【${data.item_name}】×${data.quantity}`
            : '灵气逸散，未采到东西（采集点照常进入冷却）');
    }

    // ═══════════════════════════════════════
    //  V5 天雷懒结算
    // ═══════════════════════════════════════

    /** 发起天雷检查（登录首查 is_login=true 补算离线积欠；结果经 THUNDER_CHECKED 回流） */
    private _thunderCheck(isLogin: boolean) {
        SamsaraApi.thunderCheck(this._playerManager.playerId, isLogin)
            .catch(() => { /* 网络异常静默：下个轮询周期会再查 */ });
    }

    /** 天雷检查结果（SamsaraApi 广播）：预警提示 / 落雷伤害明细 / 致死走死亡流程 */
    private _onThunderChecked(data: ThunderCheckData) {
        if (!data.is_public_enemy) return;   // 非公敌无天雷

        if (!data.triggered) {
            // 未落雷：60秒内即将落雷时弹预警（配合 PublicEnemyIndicator 常驻标记）
            if (data.remaining_seconds !== undefined && data.remaining_seconds <= 60) {
                this._showToast(`天雷将至！${data.remaining_seconds}秒后落雷，速速准备！`);
            }
            return;
        }

        // 落雷：展示伤害明细
        this._showToast(`遭【${data.element || '天'}】属性天雷！伤害 ${data.damage || 0}` +
            `（护盾吸收 ${data.shield_absorbed || 0}，扣血 ${data.hp_damage || 0}）`);

        // 致死：走 V5 死亡流程（trigger 结果经 DEATH_OPTIONS_UPDATED 弹三选一）
        if (data.is_fatal && this._playerNode) {
            const pos = this._playerNode.position;
            this._showToast('你被天雷劈死了...');
            SamsaraApi.trigger(
                this._playerManager.playerId, 2,
                MapConfig.pxToMeter(pos.x), MapConfig.pxToMeter(pos.y),
            ).catch(() => this._showToast('死亡结算失败，请重新登录'));
        }
    }

    // ═══════════════════════════════════════
    //  事件处理
    // ═══════════════════════════════════════

    private _onKickOut(reason: string) {
        this._showToast(`被踢下线: ${reason}`);
        this.scheduleOnce(() => {
            // 返回登录
            EventManager.emit(GameEvent.AUTH_TOKEN_EXPIRED);
        }, 2);
    }

    private _onDisconnected() {
        this.hallUI?.showReconnectTip('网络断开，正在重连...');
    }

    private _onChatMessage(msg: any) {
        this.hallUI?.addChatMessage(msg.senderName, msg.text);
    }

    // ═══════════════════════════════════════
    //  工具
    // ═══════════════════════════════════════

    private _showToast(msg: string) {
        this.hallUI?.showToast(msg);
    }
}
