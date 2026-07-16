/**
 * 寻仙 - NPC 实体组件
 * 渲染 NPC：圆形标识 + 图标 + 名称 + 交互提示
 */

import { _decorator, Component, Label, Graphics, Color, Node } from 'cc';

const { ccclass } = _decorator;

interface NPCInitData {
    npcId: number;
    name: string;
    interactType: string;  // 'shop' | 'quest' | 'talk'
}

@ccclass('NPCEntity')
export class NPCEntity extends Component {

    private _npcId: number = 0;
    private _name: string = '';
    private _interactType: string = 'talk';
    private _graphics: Graphics | null = null;

    get npcId(): number { return this._npcId; }
    get interactType(): string { return this._interactType; }

    init(data: NPCInitData) {
        this._npcId = data.npcId;
        this._name = data.name;
        this._interactType = data.interactType;
        this._createVisuals();
    }

    private _createVisuals() {
        this._graphics = this.node.addComponent(Graphics);
        const g = this._graphics;

        // NPC 外圈（翠绿色标识）
        g.fillColor = new Color(46, 204, 113, 60);
        g.circle(0, 0, 30);
        g.fill();

        g.strokeColor = new Color(46, 204, 113, 200);
        g.lineWidth = 2;
        g.circle(0, 0, 30);
        g.stroke();

        // 内圈
        g.fillColor = new Color(22, 33, 62, 200);
        g.circle(0, 0, 20);
        g.fill();

        // NPC 图标
        const iconText = this._getIcon();
        const iconNode = new Node('Icon');
        this.node.addChild(iconNode);
        iconNode.setPosition(0, 2, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = iconText;
        iconLabel.fontSize = 20;

        // 名称标签
        const nameNode = new Node('Name');
        this.node.addChild(nameNode);
        nameNode.setPosition(0, -38, 0);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = this._name;
        nameLabel.fontSize = 14;
        nameLabel.color = new Color(46, 204, 113, 255);

        // 类型标签
        const typeNode = new Node('Type');
        this.node.addChild(typeNode);
        typeNode.setPosition(0, -52, 0);
        const typeLabel = typeNode.addComponent(Label);
        typeLabel.string = this._getTypeText();
        typeLabel.fontSize = 10;
        typeLabel.color = new Color(138, 138, 154, 200);
    }

    private _getIcon(): string {
        switch (this._interactType) {
            case 'quest': return '📜';
            case 'shop': return '🏪';
            default: return '💬';
        }
    }

    private _getTypeText(): string {
        switch (this._interactType) {
            case 'quest': return '[任务]';
            case 'shop': return '[商铺]';
            default: return '[对话]';
        }
    }
}
