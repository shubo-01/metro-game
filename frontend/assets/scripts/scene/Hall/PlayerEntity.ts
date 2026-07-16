/**
 * 寻仙 - 玩家实体组件
 * 渲染玩家角色：名称、境界、性别剪影、动作状态
 */

import { _decorator, Component, Label, Graphics, Color, Node } from 'cc';
import { EntityAction } from '../../common/Constants';

const { ccclass } = _decorator;

interface PlayerInitData {
    name: string;
    gender: number;       // 1=男 2=女
    levelText: string;
    isSelf: boolean;
}

@ccclass('PlayerEntity')
export class PlayerEntity extends Component {

    private _name: string = '';
    private _gender: number = 1;
    private _levelText: string = '';
    private _isSelf: boolean = false;
    private _action: number = EntityAction.Idle;
    private _graphics: Graphics | null = null;
    private _nameLabel: Label | null = null;
    private _levelLabel: Label | null = null;

    init(data: PlayerInitData) {
        this._name = data.name;
        this._gender = data.gender;
        this._levelText = data.levelText;
        this._isSelf = data.isSelf;

        this._createVisuals();
    }

    setAction(action: number) {
        if (this._action !== action) {
            this._action = action;
            this._render();
        }
    }

    private _createVisuals() {
        // 创建 Graphics 绘制角色剪影
        this._graphics = this.node.addComponent(Graphics);
        this._render();

        // 名称标签（仅自己显示）
        if (this._isSelf) {
            const nameNode = new Node('NameLabel');
            this.node.addChild(nameNode);
            nameNode.setPosition(0, 40, 0);
            this._nameLabel = nameNode.addComponent(Label);
            this._nameLabel.string = this._name;
            this._nameLabel.fontSize = 16;
            this._nameLabel.color = new Color(255, 255, 255, 255);

            const levelNode = new Node('LevelLabel');
            this.node.addChild(levelNode);
            levelNode.setPosition(0, 25, 0);
            this._levelLabel = levelNode.addComponent(Label);
            this._levelLabel.string = this._levelText;
            this._levelLabel.fontSize = 12;
            this._levelLabel.color = new Color(212, 168, 67, 255);
        }
    }

    private _render() {
        if (!this._graphics) return;
        const g = this._graphics;
        g.clear();

        // 身体颜色（男蓝女粉）
        const bodyColor = this._gender === 1
            ? new Color(70, 130, 180, 255)
            : new Color(200, 120, 150, 255);

        // 描边
        if (this._isSelf) {
            g.strokeColor = new Color(212, 168, 67, 255); // 金色描边
            g.lineWidth = 2;
            g.circle(0, 0, 22);
            g.stroke();
        }

        // 头部
        g.fillColor = new Color(240, 220, 200, 255);
        g.circle(0, 10, 8);
        g.fill();

        // 身体
        g.fillColor = bodyColor;
        g.rect(-8, -15, 16, 22);
        g.fill();

        // 动作指示
        if (this._action === EntityAction.Walk) {
            // 行走时脚部动画暗示
            g.fillColor = new Color(80, 80, 80, 200);
            g.circle(-5, -18, 3);
            g.circle(5, -15, 3);
            g.fill();
        } else {
            g.fillColor = new Color(80, 80, 80, 200);
            g.circle(-4, -18, 3);
            g.circle(4, -18, 3);
            g.fill();
        }
    }
}
