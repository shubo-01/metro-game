/**
 * 寻仙 - 全局事件管理器
 * 基于发布/订阅模式，用于场景间、组件间通信
 */

type EventCallback = (...args: any[]) => void;

interface EventEntry {
    callback: EventCallback;
    target: any;
    once: boolean;
}

/** 全局事件名称常量 */
export enum GameEvent {
    // 网络
    WS_CONNECTED = 'ws:connected',
    WS_DISCONNECTED = 'ws:disconnected',
    WS_MESSAGE = 'ws:message',
    WS_KICK_OUT = 'ws:kick_out',
    WS_RECONNECTING = 'ws:reconnecting',
    WS_RECONNECT_FAILED = 'ws:reconnect_failed',

    // 认证
    AUTH_LOGIN_SUCCESS = 'auth:login_success',
    AUTH_LOGIN_FAIL = 'auth:login_fail',
    AUTH_NEED_BIND_PHONE = 'auth:need_bind_phone',
    AUTH_NEED_CONFIRM = 'auth:need_confirm',
    AUTH_TOKEN_EXPIRED = 'auth:token_expired',

    // 角色
    PLAYER_CREATED = 'player:created',
    PLAYER_DATA_UPDATED = 'player:data_updated',

    // 场景
    SCENE_ENTERED = 'scene:entered',
    SCENE_LEFT = 'scene:left',
    ENTITY_ENTER_VIEW = 'entity:enter_view',
    ENTITY_LEAVE_VIEW = 'entity:leave_view',
    ENTITY_MOVE = 'entity:move',

    // UI
    TOAST_SHOW = 'ui:toast_show',
    MODAL_SHOW = 'ui:modal_show',
    MODAL_CLOSE = 'ui:modal_close',
    LOADING_SHOW = 'ui:loading_show',
    LOADING_HIDE = 'ui:loading_hide',

    // 聊天
    CHAT_MESSAGE = 'chat:message',
}

export class EventManager {
    private static _events: Map<string, EventEntry[]> = new Map();

    /** 监听事件 */
    static on(event: string, callback: EventCallback, target?: any) {
        this._addListener(event, callback, target, false);
    }

    /** 一次性监听 */
    static once(event: string, callback: EventCallback, target?: any) {
        this._addListener(event, callback, target, true);
    }

    /** 取消监听 */
    static off(event: string, callback: EventCallback, target?: any) {
        const entries = this._events.get(event);
        if (!entries) return;
        for (let i = entries.length - 1; i >= 0; i--) {
            const e = entries[i];
            if (e.callback === callback && e.target === target) {
                entries.splice(i, 1);
                break;
            }
        }
        if (entries.length === 0) {
            this._events.delete(event);
        }
    }

    /** 取消目标对象的所有监听 */
    static offAll(target: any) {
        this._events.forEach((entries, event) => {
            for (let i = entries.length - 1; i >= 0; i--) {
                if (entries[i].target === target) {
                    entries.splice(i, 1);
                }
            }
            if (entries.length === 0) {
                this._events.delete(event);
            }
        });
    }

    /** 触发事件 */
    static emit(event: string, ...args: any[]) {
        const entries = this._events.get(event);
        if (!entries) return;
        const toRemove: number[] = [];
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            e.callback.apply(e.target, args);
            if (e.once) {
                toRemove.push(i);
            }
        }
        for (let i = toRemove.length - 1; i >= 0; i--) {
            entries.splice(toRemove[i], 1);
        }
        if (entries.length === 0) {
            this._events.delete(event);
        }
    }

    /** 清空所有事件 */
    static clear() {
        this._events.clear();
    }

    private static _addListener(event: string, callback: EventCallback, target: any, once: boolean) {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event)!.push({ callback, target, once });
    }
}
