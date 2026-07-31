/**
 * 寻仙 - V5 虚拟摇杆 UI（纯前端组件，不调任何后端接口）
 *
 * 功能：8方向虚拟摇杆
 *   - 触摸开始：拇指杆归位到触摸点方向
 *   - 触摸移动：输出归一化方向向量(dirX,dirY) + 8方向档位 octant(0-7)
 *   - 触摸结束/取消：拇指杆回中，广播摇杆松开
 *
 * 事件（生产者为本组件，消费者为 HallScene）：
 *   - MapEvent.JOYSTICK_MOVE：拖动中每帧广播 { dirX, dirY, octant }
 *   - MapEvent.JOYSTICK_END：松开时广播（无参数），HallScene 收到后停止摇杆移动
 *
 * 【8方向档位约定】octant = 0右 1右上 2上 3左上 4左 5左下 6下 7右下
 * （按方向角每45°一档，供动画朝向/像素风格移动使用；
 *  精细移动直接用归一化向量 dirX/dirY 即可）
 *
 * 节点结构约定（编辑器搭建）：
 *   JoystickUI（挂本脚本，节点尺寸=触摸响应区域，建议放屏幕左下角 300×300）
 *   ├─ Base   摇杆底盘（圆形底图，@property joystickBase）
 *   │   └─ Thumb  拇指杆（圆形按钮图，Base 的子节点，@property joystickThumb）
 */

import { _decorator, Component, Node, Vec2, EventTouch } from 'cc';
import { EventManager } from '../manager/EventManager';
import { MapEvent } from '../common/Constants';
import { TutorialUI } from './TutorialUI';

const { ccclass, property } = _decorator;

@ccclass('JoystickUI')
export class JoystickUI extends Component {

    @property(Node) joystickBase: Node | null = null;    // 摇杆底盘节点
    @property(Node) joystickThumb: Node | null = null;   // 拇指杆节点（底盘子节点）

    /** 拇指杆最大偏移半径（像素），超过后钳制在圆周上 */
    @property({}) maxRadius: number = 80;
    /** 死区半径（像素）：偏移小于该值不输出方向（防手抖） */
    @property({}) deadZone: number = 10;

    /** 是否正在拖动摇杆 */
    private _dragging: boolean = false;
    /** 触摸起点（UI坐标，按下位置即摇杆逻辑中心：浮动摇杆手感） */
    private _startPos: Vec2 = new Vec2(0, 0);
    /** 当前归一化方向（松开时归零） */
    private _dir: Vec2 = new Vec2(0, 0);
    /** 当前8方向档位（-1=无输入） */
    private _octant: number = -1;
    /** 当前活跃触点 ID（-1=无触点）：多点触控时只认第一根手指，其他手指的事件一律忽略 */
    private _activeTouchId: number = -1;

    onLoad() {
        // 在本节点整个区域监听触摸（节点尺寸就是摇杆响应区）
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
        // V6 评审修复：注册为引导第2步高亮目标 joystick（仅注册，不动摇杆逻辑）
        TutorialUI.registerTarget('joystick', this.node);
    }

    onDestroy() {
        // V6 评审修复：销毁时注销引导目标，防 TutorialUI 持有失效节点
        TutorialUI.unregisterTarget('joystick');
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    /** 外部读取：当前归一化方向向量（无输入时为(0,0)） */
    get direction(): Vec2 {
        return this._dir.clone();
    }

    /** 外部读取：当前8方向档位（0-7，-1=无输入） */
    get octant(): number {
        return this._octant;
    }

    /** 外部读取：是否正在拖动 */
    get isDragging(): boolean {
        return this._dragging;
    }

    // ═══════════════════════════════════════
    //  触摸处理
    // ═══════════════════════════════════════

    private _onTouchStart(event: EventTouch) {
        // 已有活跃触点时忽略第二根手指（多点触控防抖）
        if (this._activeTouchId !== -1) return;
        this._activeTouchId = event.getID();
        this._dragging = true;
        // 按下点作为本次拖动的逻辑中心（浮动摇杆手感）
        const loc = event.getUILocation();
        this._startPos.set(loc.x, loc.y);
        this._updateDir(loc.x, loc.y);
    }

    private _onTouchMove(event: EventTouch) {
        if (!this._dragging) return;
        // 只接受同一触点的 MOVE：其他手指划过摇杆区不干扰方向
        if (event.getID() !== this._activeTouchId) return;
        const loc = event.getUILocation();
        this._updateDir(loc.x, loc.y);
    }

    private _onTouchEnd(event: EventTouch) {
        if (!this._dragging) return;
        // 只接受同一触点的 END/CANCEL：其他手指抬起不打断摇杆
        if (event.getID() !== this._activeTouchId) return;
        this._activeTouchId = -1;
        this._dragging = false;
        this._dir.set(0, 0);
        this._octant = -1;
        // 拇指杆回中
        if (this.joystickThumb) {
            this.joystickThumb.setPosition(0, 0, 0);
        }
        // 广播摇杆松开（HallScene 停止摇杆移动）
        EventManager.emit(MapEvent.JOYSTICK_END);
    }

    /** 按当前触摸点计算方向向量+8方向档位，并更新拇指杆位置 */
    private _updateDir(x: number, y: number) {
        let dx = x - this._startPos.x;
        let dy = y - this._startPos.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        // 死区内：无方向输出，拇指杆回中
        if (len < this.deadZone) {
            this._dir.set(0, 0);
            this._octant = -1;
            if (this.joystickThumb) {
                this.joystickThumb.setPosition(0, 0, 0);
            }
            return;
        }

        // 归一化方向
        const nx = dx / len;
        const ny = dy / len;
        this._dir.set(nx, ny);

        // 8方向档位：按方向角每45°一档（0右 1右上 2上 3左上 4左 5左下 6下 7右下）
        // atan2 结果 -π~π，先转 0~2π，再加半档偏移后除以45°取整
        let angle = Math.atan2(ny, nx);
        if (angle < 0) angle += Math.PI * 2;
        this._octant = Math.round(angle / (Math.PI / 4)) % 8;

        // 拇指杆位置：偏移钳制在最大半径内
        const clampedLen = Math.min(len, this.maxRadius);
        if (this.joystickThumb) {
            this.joystickThumb.setPosition(nx * clampedLen, ny * clampedLen, 0);
        }

        // 广播摇杆方向（HallScene 消费，作为叠加移动输入源）
        EventManager.emit(MapEvent.JOYSTICK_MOVE, {
            dirX: nx,
            dirY: ny,
            octant: this._octant,
        });
    }
}
