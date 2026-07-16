/**
 * 寻仙 - WebSocket 客户端
 * 支持断线自动重连、心跳、消息分发
 * Cocos Creator 3.8 / 微信小游戏兼容
 */

import { ServerConfig, ReconnectConfig } from '../common/Constants';
import { EventManager, GameEvent } from '../manager/EventManager';

export class WsClient {
    private _ws: WebSocket | null = null;
    private _connected: boolean = false;
    private _reconnectCount: number = 0;
    private _reconnectTimer: any = null;
    private _heartbeatTimer: any = null;
    private _connectStartTime: number = 0;
    private _token: string = '';
    private _playerId: number = 0;
    private _lastSeq: number = 0;

    get connected(): boolean {
        return this._connected;
    }

    /** 建立连接 */
    connect(token: string, playerId: number) {
        this._token = token;
        this._playerId = playerId;
        this._connectStartTime = Date.now();
        this._doConnect();
    }

    /** 断开连接 */
    disconnect() {
        this._clearTimers();
        if (this._ws) {
            this._ws.onopen = null;
            this._ws.onmessage = null;
            this._ws.onclose = null;
            this._ws.onerror = null;
            this._ws.close();
            this._ws = null;
        }
        this._connected = false;
    }

    /** 发送 JSON 消息 */
    send(type: string, payload: any) {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
        const msg = JSON.stringify({ type, payload });
        this._ws.send(msg);
    }

    /** 发送移动请求 */
    sendMove(x: number, y: number, seq: number, dir: number) {
        this.send('move', { x, y, seq, dir });
    }

    /** 发送聊天 */
    sendChat(channel: number, text: string, targetId?: number) {
        this.send('chat', { channel, text, targetId: targetId || 0 });
    }

    /** 发送重连 */
    sendReconnect() {
        this.send('reconnect', {
            token: this._token,
            playerId: this._playerId,
            lastSeq: this._lastSeq,
        });
    }

    // ─── 内部方法 ───

    private _doConnect() {
        const url = `${ServerConfig.DEV_WS_URL}?token=${this._token}&playerId=${this._playerId}`;

        // 微信小游戏环境
        if (typeof wx !== 'undefined' && wx.connectSocket) {
            this._connectWx(url);
            return;
        }

        // Web / Cocos Creator 环境
        try {
            this._ws = new WebSocket(url);
            this._ws.onopen = () => this._onOpen();
            this._ws.onmessage = (e: MessageEvent) => this._onMessage(e.data);
            this._ws.onclose = () => this._onClose();
            this._ws.onerror = () => this._onError();
        } catch (err) {
            console.error('[WsClient] 连接失败:', err);
            this._scheduleReconnect();
        }
    }

    /** 微信 WebSocket 连接 */
    private _connectWx(url: string) {
        const socketTask = wx.connectSocket({ url, protocols: [] });
        socketTask.onOpen(() => this._onOpen());
        socketTask.onMessage((res: any) => this._onMessage(res.data));
        socketTask.onClose(() => this._onClose());
        socketTask.onError(() => this._onError());
        this._ws = {
            readyState: 0,
            send: (data: string) => socketTask.send({ data }),
            close: () => socketTask.close({}),
        } as any;
    }

    private _onOpen() {
        console.log('[WsClient] 连接成功');
        this._connected = true;
        this._reconnectCount = 0;
        if (this._ws) {
            (this._ws as any).readyState = WebSocket.OPEN;
        }
        this._startHeartbeat();
        EventManager.emit(GameEvent.WS_CONNECTED);

        // 如果 lastSeq > 0 说明是重连，发送重连请求
        if (this._lastSeq > 0) {
            this.sendReconnect();
        }
    }

    private _onMessage(raw: string) {
        try {
            const msg = JSON.parse(raw);
            this._handleMessage(msg);
        } catch (err) {
            console.error('[WsClient] 消息解析失败:', err);
        }
    }

    private _handleMessage(msg: any) {
        switch (msg.type) {
            case 'heartbeat_ack':
                // 心跳回复，无需处理
                break;
            case 'sync_frame':
                this._lastSeq = msg.payload?.serverSeq || this._lastSeq;
                EventManager.emit(GameEvent.WS_MESSAGE, msg.type, msg.payload);
                break;
            case 'enter_event':
                EventManager.emit(GameEvent.ENTITY_ENTER_VIEW, msg.payload);
                break;
            case 'leave_event':
                EventManager.emit(GameEvent.ENTITY_LEAVE_VIEW, msg.payload);
                break;
            case 'chat_message':
                EventManager.emit(GameEvent.CHAT_MESSAGE, msg.payload);
                break;
            case 'kick_out':
                EventManager.emit(GameEvent.WS_KICK_OUT, msg.payload?.reason || '被踢下线');
                break;
            case 'reconnect_ack':
                this._lastSeq = msg.payload?.serverSeq || 0;
                EventManager.emit(GameEvent.WS_MESSAGE, msg.type, msg.payload);
                break;
            default:
                EventManager.emit(GameEvent.WS_MESSAGE, msg.type, msg.payload);
                break;
        }
    }

    private _onClose() {
        console.log('[WsClient] 连接关闭');
        this._connected = false;
        this._stopHeartbeat();
        EventManager.emit(GameEvent.WS_DISCONNECTED);
        this._scheduleReconnect();
    }

    private _onError() {
        console.error('[WsClient] 连接错误');
    }

    /** 断线重连 - 递增间隔 */
    private _scheduleReconnect() {
        const intervals = ReconnectConfig.INTERVALS;
        if (this._reconnectCount >= intervals.length) {
            // 超过最大重连次数
            const elapsed = Date.now() - this._connectStartTime;
            if (elapsed > ReconnectConfig.MAX_TIMEOUT) {
                EventManager.emit(GameEvent.WS_RECONNECT_FAILED);
                return;
            }
        }

        const delay = intervals[Math.min(this._reconnectCount, intervals.length - 1)];
        this._reconnectCount++;

        console.log(`[WsClient] ${delay / 1000}s 后第 ${this._reconnectCount} 次重连`);
        EventManager.emit(GameEvent.WS_RECONNECTING, this._reconnectCount);

        this._reconnectTimer = setTimeout(() => {
            this._doConnect();
        }, delay);
    }

    /** 心跳 */
    private _startHeartbeat() {
        this._stopHeartbeat();
        this._heartbeatTimer = setInterval(() => {
            this.send('heartbeat', { timestamp: Date.now() });
        }, ReconnectConfig.HEARTBEAT_INTERVAL);
    }

    private _stopHeartbeat() {
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }

    private _clearTimers() {
        this._stopHeartbeat();
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
    }
}

declare const wx: any;
