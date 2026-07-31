/**
 * Cocos Creator 3.8 类型桩（编辑期辅助）
 * 实际运行时由 Cocos Creator 引擎提供完整的 cc 模块
 * 此文件仅用于编辑器外 IDE 的 TypeScript 类型检查
 */

declare module 'cc' {
    export const _decorator: {
        ccclass: (name?: string) => ClassDecorator;
        property: (options?: any) => PropertyDecorator;
        executeInEditMode: ClassDecorator;
        menu: (path: string) => ClassDecorator;
    };

    export class Vec2 {
        x: number;
        y: number;
        constructor(x?: number, y?: number);
        set(x: number, y: number): this;
        clone(): Vec2;
        subtract(other: Vec2): this;
        length(): number;
        normalize(): this;
        lerp(to: Vec2, ratio: number): this;
    }

    export class Vec3 {
        x: number;
        y: number;
        z: number;
        constructor(x?: number, y?: number, z?: number);
        set(x: number, y: number, z: number): this;
        clone(): Vec3;
    }

    export class Color {
        r: number;
        g: number;
        b: number;
        a: number;
        constructor(r?: number, g?: number, b?: number, a?: number);
        fromHEX(hex: string): this;
        set(r: number, g: number, b: number, a?: number): this;
        static WHITE: Color;
        static BLACK: Color;
        static RED: Color;
        static GREEN: Color;
        static BLUE: Color;
    }

    export class Size {
        width: number;
        height: number;
        constructor(width?: number, height?: number);
    }

    export class Node {
        name: string;
        active: boolean;
        /** 节点是否有效（未被销毁），继承自 CCObject；销毁后访问节点前应先判断 */
        readonly isValid: boolean;
        position: Vec3;
        scale: Vec3;
        parent: Node | null;
        children: Node[];
        constructor(name?: string);
        addChild(child: Node): void;
        on(type: string, callback: Function, target?: any): void;
        off(type: string, callback: Function, target?: any): void;
        once(type: string, callback: Function, target?: any): void;
        emit(type: string, ...args: any[]): void;
        getChildByName(name: string): Node | null;
        getComponent<T>(classConstructor: new (...args: any[]) => T): T | null;
        getComponentInChildren<T>(classConstructor: new (...args: any[]) => T): T | null;
        addComponent<T>(classConstructor: new (...args: any[]) => T): T;
        destroy(): boolean;
        removeFromParent(): void;
        setPosition(x: number, y: number, z?: number): void;
        setScale(x: number, y: number, z?: number): void;
        static EventType: { TOUCH_END: string; TOUCH_START: string; TOUCH_MOVE: string; TOUCH_CANCEL: string; };
    }

    export class Component {
        node: Node;
        enabled: boolean;
        schedule(callback: Function, interval?: number, repeat?: number, delay?: number): void;
        scheduleOnce(callback: Function, delay?: number): void;
        unscheduleAllCallbacks(): void;
        getComponent<T>(classConstructor: new (...args: any[]) => T): T | null;
    }

    export class Label extends Component {
        string: string;
        fontSize: number;
        color: Color;
        lineHeight: number;
        overflow: number;
        horizontalAlign: number;
        verticalAlign: number;
    }

    export class Sprite extends Component {
        color: Color;
        spriteFrame: any;
        sizeMode: number;
    }

    export class EditBox extends Component {
        string: string;
        placeholder: string;
        maxLength: number;
        inputMode: number;
        inputFlag: number;
    }

    export class Graphics extends Component {
        strokeColor: Color;
        fillColor: Color;
        lineWidth: number;
        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
        rect(x: number, y: number, w: number, h: number): void;
        circle(x: number, y: number, r: number): void;
        arc(x: number, y: number, r: number, startAngle: number, endAngle: number, counterClockwise?: boolean): void;
        stroke(): void;
        fill(): void;
        clear(): void;
    }

    export class UITransform extends Component {
        contentSize: Size;
        anchorPoint: Vec2;
        setContentSize(size: Size): void;
        setAnchorPoint(point: Vec2): void;
    }

    export class ScrollView extends Component {
        content: Node | null;
        scrollToBottom(timeInSecond?: number, attenuated?: boolean): void;
    }

    export class Toggle extends Component {
        isChecked: boolean;
    }

    export class Button extends Component {
        interactable: boolean;
    }

    export class Tween<T> {
        to(duration: number, props: any, opts?: any): Tween<T>;
        by(duration: number, props: any, opts?: any): Tween<T>;
        delay(duration: number): Tween<T>;
        call(callback: Function): Tween<T>;
        repeat(repeatTimes: number, embedTween?: Tween<T>): Tween<T>;
        repeatForever(embedTween: Tween<T>): Tween<T>;
        sequence(...actions: Tween<T>[]): Tween<T>;
        start(): Tween<T>;
        stop(): Tween<T>;
    }

    export function tween<T>(target: T): Tween<T>;

    export class EventTouch {
        getID(): number;
        getLocationX(): number;
        getLocationY(): number;
        getLocation(): Vec2;
        getUILocation(): Vec2;
        propagationStopped: boolean;
        stopPropagation(): void;
        stopPropagationImmediate(): void;
    }

    export class view {
        static getVisibleSize(): Size;
        static getDesignResolutionSize(): Size;
    }

    export class screen {
        static windowSize: Size;
    }

    export class director {
        static loadScene(sceneName: string, onLaunched?: Function): void;
        static preloadScene(sceneName: string, onProgress?: Function, onComplete?: Function): void;
        static getScene(): any;
        static addPersistRootNode(node: Node): void;
        static removePersistRootNode(node: Node): void;
    }

    export class resources {
        static load<T>(path: string, type: new (...args: any[]) => T, onComplete: (err: Error | null, asset: T) => void): void;
    }

    export class assetManager {
        static loadBundle(nameOrUrl: string, onComplete: (err: Error | null, bundle: any) => void): void;
    }

    export class AudioSource extends Component {
        clip: any;
        volume: number;
        loop: boolean;
        playing: boolean;
        play(): void;
        stop(): void;
        pause(): void;
    }

    export class Camera extends Component {
        screenPointToRay(x: number, y: number): any;
    }

    export class PhysicsSystem {
        static instance: PhysicsSystem;
        raycastClosest(ray: any, options?: any, result?: any): boolean;
    }

    export class geometry {
        static Ray: any;
    }
}

declare module 'cc/env' {
    export const EDITOR: boolean;
    export const PREVIEW: boolean;
    export const BUILD: boolean;
    export const DEBUG: boolean;
    export const DEV: boolean;
    export const NATIVE: boolean;
    export const MINIGAME: boolean;
    export const RUNTIME_BASED: boolean;
}
