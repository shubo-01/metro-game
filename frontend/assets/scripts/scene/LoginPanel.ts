/**
 * 寻仙 - 登录场景面板
 * Cocos Creator 3.8 Component
 *
 * 功能：
 * 1. 微信/抖音一键授权登录
 * 2. 手机号+验证码登录
 * 3. 手机号绑定弹窗
 * 4. 跨平台关联确认弹窗
 * 5. 服务器状态检测
 * 6. 自动判断→跳转角色创建或大厅
 */

import { _decorator, Component, Label, Node, EditBox, Sprite, Color, Tween, tween } from 'cc';
import { HttpClient } from '../net/HttpClient';
import { TokenManager } from '../manager/TokenManager';
import { PlayerManager } from '../manager/PlayerManager';
import { EventManager, GameEvent } from '../manager/EventManager';
import { SceneManager, SceneName } from '../manager/SceneManager';
import { ThemeColor } from '../common/Constants';

const { ccclass, property } = _decorator;

@ccclass('LoginPanel')
export class LoginPanel extends Component {

    // ─── UI 节点引用（在编辑器中拖拽绑定）───

    @property(Label)
    titleLabel: Label | null = null;

    @property(Label)
    sloganLabel: Label | null = null;

    @property(Label)
    versionLabel: Label | null = null;

    @property(Label)
    serverStatusLabel: Label | null = null;

    @property(Node)
    wxLoginBtn: Node | null = null;

    @property(Node)
    phoneLoginBtn: Node | null = null;

    @property(Node)
    bindPhonePanel: Node | null = null;

    @property(EditBox)
    phoneInput: EditBox | null = null;

    @property(EditBox)
    codeInput: EditBox | null = null;

    @property(Label)
    sendCodeBtnLabel: Label | null = null;

    @property(Label)
    bindConfirmLabel: Label | null = null;

    @property(Node)
    confirmBindPanel: Node | null = null;

    @property(Label)
    toastLabel: Label | null = null;

    // ─── 内部状态 ───

    private _tokenManager: TokenManager = new TokenManager();
    private _playerManager: PlayerManager = new PlayerManager();
    private _openid: string = '';
    private _platform: string = 'wechat';
    private _codeCountdown: number = 0;
    private _codeTimer: any = null;
    private _serverOnline: boolean = false;

    // ═══════════════════════════════════════
    //  生命周期
    // ═══════════════════════════════════════

    onLoad() {
        // 初始化网络层
        HttpClient.init(this._tokenManager);

        // 初始化 UI
        this._setupUI();

        // 绑定按钮事件
        this.wxLoginBtn?.on(Node.EventType.TOUCH_END, this._onWxLogin, this);
        this.phoneLoginBtn?.on(Node.EventType.TOUCH_END, this._onPhoneLogin, this);
        this.sendCodeBtnLabel?.node?.parent?.on(Node.EventType.TOUCH_END, this._onSendCode, this);

        // 绑定手机号面板的关闭按钮（通过名称查找）
        if (this.bindPhonePanel) {
            const closeBtn = this.bindPhonePanel.getChildByName('CloseBtn');
            closeBtn?.on(Node.EventType.TOUCH_END, () => {
                this.bindPhonePanel!.active = false;
            }, this);
        }

        // 隐藏弹窗
        if (this.bindPhonePanel) this.bindPhonePanel.active = false;
        if (this.confirmBindPanel) this.confirmBindPanel.active = false;

        // 检查 Token
        if (this._tokenManager.isLoggedIn()) {
            this._checkToken();
        }

        // 服务器状态检测
        this._checkServer();

        // 监听全局事件
        EventManager.on(GameEvent.AUTH_NEED_BIND_PHONE, this._showBindPhonePanel, this);
        EventManager.on(GameEvent.AUTH_NEED_CONFIRM, this._showConfirmPanel, this);
    }

    onDestroy() {
        EventManager.offAll(this);
        if (this._codeTimer) clearInterval(this._codeTimer);
    }

    // ═══════════════════════════════════════
    //  UI 初始化
    // ═══════════════════════════════════════

    private _setupUI() {
        if (this.titleLabel) {
            this.titleLabel.string = '寻仙';
            this.titleLabel.color = new Color().fromHEX(ThemeColor.GOLD);
            this.titleLabel.fontSize = 80;
        }

        if (this.sloganLabel) {
            this.sloganLabel.string = '一念成仙，万界诡谲';
            this.sloganLabel.color = new Color().fromHEX(ThemeColor.TEXT_GRAY);
            this.sloganLabel.fontSize = 24;
        }

        if (this.versionLabel) {
            this.versionLabel.string = 'v0.1.0-alpha';
            this.versionLabel.color = new Color().fromHEX(ThemeColor.TEXT_GRAY);
            this.versionLabel.fontSize = 16;
        }

        if (this.serverStatusLabel) {
            this.serverStatusLabel.string = '检测中...';
            this.serverStatusLabel.color = new Color().fromHEX(ThemeColor.TEXT_GRAY);
        }

        // 按钮文字（强制在运行时设置，确保正确显示）
        if (this.wxLoginBtn) {
            const wxLabel = this.wxLoginBtn.getComponentInChildren(Label);
            if (wxLabel) { wxLabel.string = '微信一键登录'; wxLabel.fontSize = 22; wxLabel.color = new Color(255, 255, 255, 255); }
        }
        if (this.phoneLoginBtn) {
            const phoneLabel = this.phoneLoginBtn.getComponentInChildren(Label);
            if (phoneLabel) { phoneLabel.string = '手机号登录'; phoneLabel.fontSize = 22; phoneLabel.color = new Color(255, 255, 255, 255); }
        }
        if (this.sendCodeBtnLabel) {
            this.sendCodeBtnLabel.string = '获取验证码';
            this.sendCodeBtnLabel.fontSize = 16;
            this.sendCodeBtnLabel.color = new Color(255, 255, 255, 255);
        }

        // Logo 呼吸动画
        if (this.titleLabel?.node) {
            tween(this.titleLabel.node)
                .repeatForever(
                    tween(this.titleLabel.node)
                        .to(2, { scale: { x: 1.05, y: 1.05, z: 1 } }, { easing: 'sineInOut' })
                        .to(2, { scale: { x: 1, y: 1, z: 1 } }, { easing: 'sineInOut' })
                )
                .start();
        }
    }

    // ═══════════════════════════════════════
    //  微信一键登录
    // ═══════════════════════════════════════

    private async _onWxLogin() {
        this._showToast('正在登录...');

        // 微信小游戏环境
        if (typeof wx !== 'undefined' && wx.login) {
            wx.login({
                success: async (res: any) => {
                    if (res.code) {
                        await this._doWxLogin(res.code);
                    } else {
                        this._showToast('微信授权失败');
                    }
                },
                fail: () => {
                    this._showToast('微信授权失败');
                },
            });
        } else {
            // 浏览器开发环境 — 模拟登录以便调试
            this._showToast('[开发模式] 模拟微信登录...');
            // 用模拟 token 直接进入角色创建/大厅
            this._tokenManager.save('dev_token_' + Date.now(), 'dev_refresh_' + Date.now());
            this._playerManager.init({ playerId: 1, name: '测试玩家', gender: 1 });
            this._showToast('[开发模式] 登录成功，跳转角色创建...');
            // 延迟跳转让用户看到提示
            setTimeout(() => {
                SceneManager.loadScene(SceneName.CharacterCreate);
            }, 1500);
        }
    }

    private async _doWxLogin(code: string) {
        try {
            const res = await HttpClient.post('/auth/wx-login', {
                code,
                device_id: this._getDeviceId(),
            });

            if (res.code !== 0) {
                this._showToast(res.msg || '登录失败');
                EventManager.emit(GameEvent.AUTH_LOGIN_FAIL, res.msg);
                return;
            }

            const data = res.data;

            // 保存 Token
            if (data.token) {
                this._tokenManager.save(data.token, data.refreshToken);
            }

            // 需要绑定手机号
            if (data.needBindPhone) {
                this._openid = data.openid;
                EventManager.emit(GameEvent.AUTH_NEED_BIND_PHONE);
                return;
            }

            // 需要跨平台确认
            if (data.needConfirm) {
                this._openid = data.openid;
                EventManager.emit(GameEvent.AUTH_NEED_CONFIRM);
                return;
            }

            // 登录成功
            this._onLoginSuccess(data);

        } catch (err) {
            console.error('[LoginPanel] 微信登录异常:', err);
            this._showToast('网络错误，请重试');
        }
    }

    // ═══════════════════════════════════════
    //  手机号登录
    // ═══════════════════════════════════════

    private async _onPhoneLogin() {
        // 如果绑定面板还没显示，先展示让用户输入
        if (this.bindPhonePanel && !this.bindPhonePanel.active) {
            this.bindPhonePanel.active = true;
            this._showToast('请输入手机号和验证码');
            return;
        }

        const phone = this.phoneInput?.string || '';
        const code = this.codeInput?.string || '';

        if (!phone || phone.length !== 11) {
            this._showToast('请输入正确的手机号');
            return;
        }
        if (!code || code.length !== 6) {
            this._showToast('请输入6位验证码');
            return;
        }

        this._showToast('正在登录...');

        try {
            const res = await HttpClient.post('/auth/phone-login', {
                phone,
                code,
                device_id: this._getDeviceId(),
            });

            if (res.code !== 0) {
                this._showToast(res.msg || '登录失败');
                return;
            }

            this._onLoginSuccess(res.data);

        } catch (err) {
            this._showToast('网络错误，请重试');
        }
    }

    // ═══════════════════════════════════════
    //  发送验证码
    // ═══════════════════════════════════════

    private async _onSendCode() {
        const phone = this.phoneInput?.string || '';
        if (!phone || phone.length !== 11) {
            this._showToast('请先输入手机号');
            return;
        }
        if (this._codeCountdown > 0) return;

        try {
            const res = await HttpClient.post('/auth/send-code', {
                phone,
                purpose: 'login',
            });

            if (res.code === 0) {
                this._showToast('验证码已发送');
                this._startCodeCountdown();
            } else {
                this._showToast(res.msg || '发送失败');
            }
        } catch {
            this._showToast('发送失败，请重试');
        }
    }

    private _startCodeCountdown() {
        this._codeCountdown = 60;
        if (this.sendCodeBtnLabel) {
            this.sendCodeBtnLabel.string = `${this._codeCountdown}s`;
        }
        this._codeTimer = setInterval(() => {
            this._codeCountdown--;
            if (this.sendCodeBtnLabel) {
                this.sendCodeBtnLabel.string = this._codeCountdown > 0
                    ? `${this._codeCountdown}s`
                    : '获取验证码';
            }
            if (this._codeCountdown <= 0) {
                clearInterval(this._codeTimer);
            }
        }, 1000);
    }

    // ═══════════════════════════════════════
    //  绑定手机号弹窗
    // ═══════════════════════════════════════

    private _showBindPhonePanel() {
        if (this.bindPhonePanel) this.bindPhonePanel.active = true;
        if (this.bindConfirmLabel) {
            this.bindConfirmLabel.string = '请绑定手机号以完成注册';
        }
    }

    private async _onBindPhoneConfirm() {
        const phone = this.phoneInput?.string || '';
        const code = this.codeInput?.string || '';

        if (!phone || !code) {
            this._showToast('请输入手机号和验证码');
            return;
        }

        try {
            const res = await HttpClient.post('/auth/bind-phone', {
                openid: this._openid,
                platform: this._platform,
                phone,
                code,
            });

            if (res.code !== 0) {
                this._showToast(res.msg || '绑定失败');
                return;
            }

            if (this.bindPhonePanel) this.bindPhonePanel.active = false;

            if (res.data.needConfirm) {
                EventManager.emit(GameEvent.AUTH_NEED_CONFIRM);
                return;
            }

            this._onLoginSuccess(res.data);

        } catch {
            this._showToast('绑定失败，请重试');
        }
    }

    // ═══════════════════════════════════════
    //  跨平台关联确认
    // ═══════════════════════════════════════

    private _showConfirmPanel() {
        if (this.confirmBindPanel) this.confirmBindPanel.active = true;
    }

    private async _onConfirmBind() {
        try {
            const res = await HttpClient.post('/auth/confirm-bind', {
                openid: this._openid,
                platform: this._platform,
                phone: this.phoneInput?.string || '',
            });

            if (res.code !== 0) {
                this._showToast(res.msg || '关联失败');
                return;
            }

            if (this.confirmBindPanel) this.confirmBindPanel.active = false;
            this._onLoginSuccess(res.data);

        } catch {
            this._showToast('关联失败，请重试');
        }
    }

    // ═══════════════════════════════════════
    //  登录成功处理
    // ═══════════════════════════════════════

    private _onLoginSuccess(data: any) {
        if (data.token) {
            this._tokenManager.save(data.token, data.refreshToken);
        }

        // V5 新增：记录账号ID，HttpClient 自动给敏感接口附 X-Account-ID 请求头
        const accountId = data.accountId || data.account_id || 0;
        if (accountId > 0) {
            HttpClient.setAccountId(accountId);
        }

        EventManager.emit(GameEvent.AUTH_LOGIN_SUCCESS);

        if (data.hasCharacter && data.playerInfo) {
            // 已有角色 → 进入大厅
            this._playerManager.init(data.playerInfo);
            SceneManager.loadScene(SceneName.Hall);
        } else {
            // 未创建角色 → 进入创建
            SceneManager.loadScene(SceneName.CharacterCreate);
        }
    }

    // ═══════════════════════════════════════
    //  Token 校验（自动登录）
    // ═══════════════════════════════════════

    private async _checkToken() {
        try {
            const res = await HttpClient.get('/auth/check');
            if (res.code === 0) {
                this._onLoginSuccess(res.data);
            }
        } catch {
            // Token 无效，显示登录界面
            this._tokenManager.clear();
        }
    }

    // ═══════════════════════════════════════
    //  服务器状态检测
    // ═══════════════════════════════════════

    private async _checkServer() {
        try {
            const res = await HttpClient.get('/auth/check');
            this._serverOnline = true;
            if (this.serverStatusLabel) {
                this.serverStatusLabel.string = '● 服务器正常';
                this.serverStatusLabel.color = new Color().fromHEX(ThemeColor.JADE);
            }
        } catch {
            this._serverOnline = false;
            if (this.serverStatusLabel) {
                this.serverStatusLabel.string = '○ 服务器连接中...';
                this.serverStatusLabel.color = new Color().fromHEX(ThemeColor.DANGER);
            }
        }
    }

    // ═══════════════════════════════════════
    //  工具方法
    // ═══════════════════════════════════════

    private _showToast(msg: string) {
        if (this.toastLabel) {
            this.toastLabel.string = msg;
            this.toastLabel.node.active = true;
            // 2秒后隐藏
            this.scheduleOnce(() => {
                if (this.toastLabel) this.toastLabel.node.active = false;
            }, 2);
        }
    }

    private _getDeviceId(): string {
        if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
            const info = wx.getSystemInfoSync();
            return info.deviceId || 'unknown';
        }
        return 'web_' + Date.now();
    }
}

declare const wx: any;
