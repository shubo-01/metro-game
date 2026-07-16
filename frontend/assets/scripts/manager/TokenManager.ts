/**
 * 寻仙 - Token 管理器
 * 持久化存储 AccessToken 和 RefreshToken
 */

import { TokenConfig } from '../common/Constants';

export class TokenManager {
    private _token: string = '';
    private _refreshToken: string = '';

    constructor() {
        this._token = this._load(TokenConfig.ACCESS_TOKEN_KEY);
        this._refreshToken = this._load(TokenConfig.REFRESH_TOKEN_KEY);
    }

    /** 保存双 Token */
    save(token: string, refreshToken: string) {
        this._token = token;
        this._refreshToken = refreshToken;
        this._persist(TokenConfig.ACCESS_TOKEN_KEY, token);
        this._persist(TokenConfig.REFRESH_TOKEN_KEY, refreshToken);
    }

    getToken(): string {
        return this._token;
    }

    getRefreshToken(): string {
        return this._refreshToken;
    }

    isLoggedIn(): boolean {
        return !!this._token;
    }

    clear() {
        this._token = '';
        this._refreshToken = '';
        this._remove(TokenConfig.ACCESS_TOKEN_KEY);
        this._remove(TokenConfig.REFRESH_TOKEN_KEY);
    }

    private _load(key: string): string {
        try {
            if (typeof wx !== 'undefined' && wx.getStorageSync) {
                return wx.getStorageSync(key) || '';
            }
            return localStorage.getItem(key) || '';
        } catch {
            return '';
        }
    }

    private _persist(key: string, value: string) {
        try {
            if (typeof wx !== 'undefined' && wx.setStorageSync) {
                wx.setStorageSync(key, value);
                return;
            }
            localStorage.setItem(key, value);
        } catch { /* ignore */ }
    }

    private _remove(key: string) {
        try {
            if (typeof wx !== 'undefined' && wx.removeStorageSync) {
                wx.removeStorageSync(key);
                return;
            }
            localStorage.removeItem(key);
        } catch { /* ignore */ }
    }
}

declare const wx: any;
