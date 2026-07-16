/**
 * 寻仙 - 场景管理器
 * 管理 Cocos Creator 场景加载与切换
 */

import { EventManager, GameEvent } from './EventManager';

/** 场景名称常量 */
export enum SceneName {
    Login = 'Login',
    CharacterCreate = 'CharacterCreate',
    Hall = 'Hall',
}

export class SceneManager {
    private static _currentScene: SceneName = SceneName.Login;
    private static _isLoading: boolean = false;

    static get currentScene(): SceneName {
        return SceneManager._currentScene;
    }

    /** 加载场景（Cocos Creator director API） */
    static loadScene(name: SceneName, onProgress?: (progress: number) => void, onComplete?: () => void) {
        if (SceneManager._isLoading) return;
        SceneManager._isLoading = true;

        console.log(`[SceneManager] 切换场景: ${SceneManager._currentScene} → ${name}`);

        // 显示 Loading
        EventManager.emit(GameEvent.LOADING_SHOW);

        // 使用 Cocos Creator 的 director.loadScene
        // 如果在 Cocos Creator 环境外（如纯 TS 编译检查），使用 fallback
        if (typeof cc !== 'undefined' && cc.director) {
            cc.director.loadScene(name, () => {
                SceneManager._currentScene = name;
                SceneManager._isLoading = false;
                EventManager.emit(GameEvent.LOADING_HIDE);
                EventManager.emit(GameEvent.SCENE_ENTERED, name);
                if (onComplete) onComplete();
            });
        } else {
            // Fallback：直接模拟场景切换
            setTimeout(() => {
                SceneManager._currentScene = name;
                SceneManager._isLoading = false;
                EventManager.emit(GameEvent.LOADING_HIDE);
                EventManager.emit(GameEvent.SCENE_ENTERED, name);
                if (onComplete) onComplete();
            }, 500);
        }
    }

    /** 预加载场景资源 */
    static preloadScene(name: SceneName, onProgress?: (progress: number) => void) {
        if (typeof cc !== 'undefined' && cc.director) {
            cc.director.preloadScene(name, (completedCount: number, totalCount: number) => {
                if (onProgress) onProgress(completedCount / totalCount);
            });
        }
    }
}

// Cocos Creator 类型声明（编辑器环境外使用）
declare const cc: any;
