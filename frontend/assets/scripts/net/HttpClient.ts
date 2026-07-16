/**
 * 寻仙 - HTTP 客户端
 * 封装 HTTP 请求，自动携带 Token，401 自动刷新
 */

import { ServerConfig, TokenConfig } from '../common/Constants';
import { TokenManager } from '../manager/TokenManager';

export interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data?: T;
}

export class HttpClient {
    private static _baseUrl: string = ServerConfig.DEV_HTTP_URL;
    private static _tokenManager: TokenManager;

    static init(tokenManager: TokenManager) {
        HttpClient._tokenManager = tokenManager;
    }

    static setBaseUrl(url: string) {
        HttpClient._baseUrl = url;
    }

    /** GET 请求 */
    static async get<T = any>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
        let url = `${HttpClient._baseUrl}${path}`;
        if (params) {
            const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
            url += `?${qs}`;
        }
        return HttpClient._request<T>(url, 'GET');
    }

    /** POST 请求 */
    static async post<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
        const url = `${HttpClient._baseUrl}${path}`;
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
