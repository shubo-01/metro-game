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
 */

import { _decorator, Component, Node, Vec2, Vec3, Graphics, Color, view, Camera, EventTouch } from 'cc';
import { WsClient } from '../../net/WsClient';
import { HttpClient } from '../../net/HttpClient';
import { PlayerManager } from '../../manager/PlayerManager';
import { TokenManager } from '../../manager/TokenManager';
import { EventManager, GameEvent } from '../../manager/EventManager';
import { AOIConfig, SceneID, ThemeColor } from '../../common/Constants';
import { HallUI } from './HallUI';
import { PlayerEntity } from './PlayerEntity';
import { NPCEntity } from './NPCEntity';

const { ccclass, property } = _decorator;

/** 世界参数 */
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 2000;
const MOVE_SPEED = 3; // 像素/帧
const SYNC_INTERVAL = AOIConfig.SYNC_INTERVAL;

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

        // 地面触摸事件
        this.groundLayer?.on(Node.EventType.TOUCH_END, this._onGroundTouch, this);
    }

    onDestroy() {
        EventManager.offAll(this);
        this._wsClient.disconnect();
    }

    update(dt: number) {
        // 移动处理
        if (this._isMoving && this._moveTarget && this._playerNode) {
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
            } else {
                // 移动中
                const nx = pos.x + (dx / dist) * MOVE_SPEED;
                const ny = pos.y + (dy / dist) * MOVE_SPEED;
                this._playerNode.setPosition(nx, ny, 0);
                this._playerEntity?.setAction(1); // walk
            }

            this._playerManager.updatePosition(this._playerNode.position.x, this._playerNode.position.y);
        }

        // 相机跟随
        this._updateCamera();

        // 位置同步（10Hz）
        this._syncTimer += dt * 1000;
        if (this._syncTimer >= SYNC_INTERVAL) {
            this._syncTimer = 0;
            this._syncPosition();
        }
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

            this.entityContainer?.addChild(npcNode);
        }
    }

    private async _interactNPC(npcCfg: { id: number; name: string; type: string }) {
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
