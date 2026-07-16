/**
 * 寻仙 - 全局游戏管理器
 * 作为 Cocos Creator 常驻节点，管理全局状态和初始化流程
 * 挂载在场景 Canvas 根节点上，不随场景销毁
 */

import { _decorator, Component, director } from 'cc';
import { TokenManager } from './manager/TokenManager';
import { PlayerManager } from './manager/PlayerManager';
import { EventManager, GameEvent } from './manager/EventManager';
import { SceneManager, SceneName } from './manager/SceneManager';
import { HttpClient } from './net/HttpClient';
import { WsClient } from './net/WsClient';

const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    /** 全局单例 */
    private static _instance: GameManager | null = null;

    /** 全局管理器 */
    readonly tokenManager: TokenManager = new TokenManager();
    readonly playerManager: PlayerManager = new PlayerManager();
    readonly wsClient: WsClient = new WsClient();

    static get instance(): GameManager | null {
        return GameManager._instance;
    }

    // ═══════════════════════════════════════
    //  生命周期
    // ═══════════════════════════════════════

    onLoad() {
        // 单例保护
        if (GameManager._instance) {
            this.node.destroy();
            return;
        }
        GameManager._instance = this;

        // 使此节点不随场景切换而销毁
        director.addPersistRootNode(this.node);

        // 初始化 HTTP 客户端
        HttpClient.init(this.tokenManager);

        // 注册全局事件
        this._registerEvents();

        console.log('[GameManager] 全局管理器已初始化');
    }

    onDestroy() {
        if (GameManager._instance === this) {
            GameManager._instance = null;
            EventManager.clear();
        }
    }

    // ═══════════════════════════════════════
    //  全局事件注册
    // ═══════════════════════════════════════

    private _registerEvents() {
        // Token 过期 → 返回登录
        EventManager.on(GameEvent.AUTH_TOKEN_EXPIRED, this._onTokenExpired, this);

        // 登录成功 → 初始化 WebSocket
        EventManager.on(GameEvent.AUTH_LOGIN_SUCCESS, this._onLoginSuccess, this);

        // 角色创建 → 连接 WebSocket
        EventManager.on(GameEvent.PLAYER_CREATED, this._onPlayerCreated, this);

        // 踢下线
        EventManager.on(GameEvent.WS_KICK_OUT, this._onKickOut, this);

        // 重连失败 → 返回登录
        EventManager.on(GameEvent.WS_RECONNECT_FAILED, this._onReconnectFailed, this);
    }

    // ═══════════════════════════════════════
    //  事件处理
    // ═══════════════════════════════════════

    private _onTokenExpired() {
        this.tokenManager.clear();
        this.playerManager.reset();
        this.wsClient.disconnect();
        SceneManager.loadScene(SceneName.Login);
    }

    private _onLoginSuccess() {
        console.log('[GameManager] 登录成功');
    }

    private _onPlayerCreated(data: any) {
        console.log('[GameManager] 角色已创建:', data);
        // 连接 WebSocket
        const token = this.tokenManager.getToken();
        const playerId = this.playerManager.playerId;
        if (token && playerId) {
            this.wsClient.connect(token, playerId);
        }
    }

    private _onKickOut(reason: string) {
        console.warn('[GameManager] 被踢下线:', reason);
        this.wsClient.disconnect();
        this.scheduleOnce(() => {
            this.tokenManager.clear();
            this.playerManager.reset();
            SceneManager.loadScene(SceneName.Login);
        }, 3);
    }

    private _onReconnectFailed() {
        console.warn('[GameManager] 重连失败，返回登录');
        this.wsClient.disconnect();
        this.tokenManager.clear();
        this.playerManager.reset();
        SceneManager.loadScene(SceneName.Login);
    }

    // ═══════════════════════════════════════
    //  公开方法
    // ═══════════════════════════════════════

    /** 检查是否已登录 */
    isLoggedIn(): boolean {
        return this.tokenManager.isLoggedIn();
    }

    /** 登出 */
    logout() {
        this.tokenManager.clear();
        this.playerManager.reset();
        this.wsClient.disconnect();
        SceneManager.loadScene(SceneName.Login);
    }
}
