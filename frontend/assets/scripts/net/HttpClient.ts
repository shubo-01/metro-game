/**
 * 寻仙 - HTTP 客户端
 * 封装 HTTP 请求，自动携带 Token，401 自动刷新
 * 支持多服务路由：根据请求路径前缀自动选择对应微服务地址
 */

import { ServerConfig, TokenConfig } from '../common/Constants';
import { TokenManager } from '../manager/TokenManager';

export interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data?: T;
}

export class HttpClient {
    /** 默认基础地址（认证/玩家服务） */
    private static _baseUrl: string = ServerConfig.DEV_HTTP_URL;
    private static _tokenManager: TokenManager;

    static init(tokenManager: TokenManager) {
        HttpClient._tokenManager = tokenManager;
    }

    static setBaseUrl(url: string) {
        HttpClient._baseUrl = url;
    }

    /**
     * 根据请求路径前缀自动选择对应微服务地址
     * - /character/*     → 角色服务（端口 8005）
     * - /combat/*        → 角色服务（端口 8005）V2战斗结算（技能伤害/异常状态/护盾恢复）
     * - /shenwei/*       → 角色服务（端口 8005）花果山神位系统（碎片合成/融合/继承/切换）
     *                      注意：与下方 /shard/ /inherit/（装备服务 8009 的旧神话碎片/神位继承体系）
     *                      是完全独立的两套体系，互不引用、互不影响
     * - /death/*         → 死亡服务（端口 8006）
     * - /dungeon/*       → 副本服务（端口 8007）花果山副本
     * - /fatigue/*       → 副本服务（端口 8007）牢结值系统
     * - /monster/*       → 野怪服务（端口 8008）初始之地野怪系统
     * - /capture/*       → 野怪服务（端口 8008）抓捕系统
     * - /equipment/*     → 装备服务（端口 8009）装备穿戴/升级/耐久/掉落
     * - /craft/*         → 装备服务（端口 8009）打造系统
     * - /shard/*         → 装备服务（端口 8009）神话碎片合成（旧体系，与 /shenwei/ 无关）
     * - /inherit/*       → 装备服务（端口 8009）神位继承（旧体系，与 /shenwei/ 无关）
     * - /trade/*         → 装备服务（端口 8009）交易系统
     * - /inventory/*     → 装备服务（端口 8009）背包容量（腰带扩展）
     * - 其他              → 默认认证服务（端口 8001）
     */
    private static _getServiceBaseUrl(path: string): string {
        // 花果山神位系统 /shenwei/ 与角色/战斗接口同属 character-service 8005；
        // 旧体系的 /shard/ /inherit/ 属装备服务 8009（见下），两套体系独立互不影响
        if (path.startsWith('/character/') || path.startsWith('/combat/') || path.startsWith('/shenwei/')) {
            return ServerConfig.DEV_CHARACTER_URL;
        }
        if (path.startsWith('/death/')) {
            return ServerConfig.DEV_DEATH_URL;
        }
        if (path.startsWith('/dungeon/') || path.startsWith('/fatigue/')) {
            return ServerConfig.DEV_DUNGEON_URL;
        }
        if (path.startsWith('/monster/') || path.startsWith('/capture/')) {
            return ServerConfig.DEV_MONSTER_URL;
        }
        if (path.startsWith('/equipment/') || path.startsWith('/craft/')
            || path.startsWith('/shard/') || path.startsWith('/inherit/')
            || path.startsWith('/trade/') || path.startsWith('/inventory/')) {
            return ServerConfig.DEV_EQUIPMENT_URL;
        }
        return HttpClient._baseUrl;
    }

    /** GET 请求 */
    static async get<T = any>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
        const baseUrl = HttpClient._getServiceBaseUrl(path);
        let url = `${baseUrl}${path}`;
        if (params) {
            const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
            url += `?${qs}`;
        }
        return HttpClient._request<T>(url, 'GET');
    }

    /** POST 请求 */
    static async post<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
        const baseUrl = HttpClient._getServiceBaseUrl(path);
        const url = `${baseUrl}${path}`;
        return HttpClient._request<T>(url, 'POST', body);
    }

    private static async _request<T>(url: string, method: string, body?: any): Promise<ApiResponse<T>> {
        const token = HttpClient._tokenManager?.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return new Promise((resolve, reject) => {
            const req = {
                url,
                method: method === 'GET' ? 'GET' as const : 'POST' as const,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            };

            // 微信小游戏环境
            if (typeof wx !== 'undefined' && wx.request) {
                wx.request({
                    url,
                    method: method as any,
                    header: headers,
                    data: body,
                    success: (res: any) => {
                        if (res.statusCode === 401) {
                            HttpClient._handleTokenExpired().then(() => {
                                // 重试
                                resolve(HttpClient._request<T>(url, method, body));
                            }).catch(reject);
                            return;
                        }
                        resolve(res.data as ApiResponse<T>);
                    },
                    fail: (err: any) => reject(err),
                });
            } else {
                // Web / Node 环境 fallback
                fetch(url, {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                }).then(res => {
                    if (res.status === 401) {
                        return HttpClient._handleTokenExpired().then(() => {
                            return HttpClient._request<T>(url, method, body);
                        });
                    }
                    return res.json();
                }).then(resolve).catch(reject);
            }
        });
    }

    /** 401 Token 自动刷新 */
    private static async _handleTokenExpired(): Promise<void> {
        const refreshToken = HttpClient._tokenManager?.getRefreshToken();
        if (!refreshToken) {
            throw new Error('RefreshToken 不存在，需重新登录');
        }

        const res = await HttpClient.post('/auth/refresh-token', { refreshToken });
        if (res.code === 0 && res.data) {
            HttpClient._tokenManager.save(res.data.token, res.data.refreshToken);
        } else {
            HttpClient._tokenManager.clear();
            throw new Error('Token 刷新失败');
        }
    }
}

// 微信类型声明
declare const wx: any;
