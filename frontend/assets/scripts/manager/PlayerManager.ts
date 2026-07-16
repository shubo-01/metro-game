/**
 * 寻仙 - 玩家数据管理器
 */

import { LevelStageNames, LevelTierNames, LevelStepNames } from '../common/Constants';

export interface PlayerData {
    playerId: number;
    name: string;
    gender: number;
    race: number;
    levelStage: number;
    levelTier: number;
    levelStep: number;
    sceneId: number;
    posX: number;
    posY: number;
    attrs: PlayerAttrs;
    hiddenAttrs: HiddenAttrs;
    status: string;
}

export interface PlayerAttrs {
    jing: number;
    qiMetal: number;
    qiWood: number;
    qiWater: number;
    qiFire: number;
    qiEarth: number;
    shen: number;
    luck: number;
    savvy: number;
}

export interface HiddenAttrs {
    causality: number;
    innerDemon: number;
    daoAge: number;
    tribulationCount: number;
}

export class PlayerManager {
    private _data: PlayerData | null = null;

    get data(): PlayerData | null {
        return this._data;
    }

    get playerId(): number {
        return this._data?.playerId ?? 0;
    }

    get name(): string {
        return this._data?.name ?? '';
    }

    get gender(): number {
        return this._data?.gender ?? 0;
    }

    init(data: Partial<PlayerData>) {
        this._data = {
            playerId: data.playerId ?? 0,
            name: data.name ?? '',
            gender: data.gender ?? 1,
            race: data.race ?? 1,
            levelStage: data.levelStage ?? 1,
            levelTier: data.levelTier ?? 1,
            levelStep: data.levelStep ?? 1,
            sceneId: data.sceneId ?? 1001,
            posX: data.posX ?? 0,
            posY: data.posY ?? 0,
            attrs: data.attrs ?? { jing: 1, qiMetal: 0, qiWood: 0, qiWater: 0, qiFire: 0, qiEarth: 0, shen: 1, luck: 0, savvy: 0 },
            hiddenAttrs: data.hiddenAttrs ?? { causality: 0, innerDemon: 0, daoAge: 0, tribulationCount: 0 },
            status: data.status ?? 'normal',
        };
    }

    /** 获取境界文本（如"人一阶一段"） */
    getLevelText(): string {
        if (!this._data) return '';
        const stage = LevelStageNames[this._data.levelStage] || '';
        const tier = LevelTierNames[this._data.levelTier] || '';
        const step = LevelStepNames[this._data.levelStep] || '';
        return `${stage}${tier}${step}`;
    }

    getGenderText(): string {
        return this._data?.gender === 1 ? '男' : '女';
    }

    updatePosition(x: number, y: number) {
        if (this._data) {
            this._data.posX = x;
            this._data.posY = y;
        }
    }

    reset() {
        this._data = null;
    }
}
