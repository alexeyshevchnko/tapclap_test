const { ccclass, property } = cc._decorator;
import { TileModel } from '../../Core/Tiles/TileModel';
import GameView from './GameView';

@ccclass
export default class TileView extends cc.Component {
    @property(cc.Sprite)
    private sprite: cc.Sprite = null;
    private model: TileModel | null = null;
    private controller: GameView = null;  
 logWithStack(message: string) {
    const stack = new Error().stack;
    console.log(message, "\nCall stack:", stack);
}
    public bindModel(model: TileModel, controller: GameView, spriteFrame?: cc.SpriteFrame) {
      // this.logWithStack("bindModel");
      this.model = model;
      this.controller = controller;
      if (spriteFrame && this.sprite) this.sprite.spriteFrame = spriteFrame;
      this.node.name = `tile_${model.x}_${model.y}`;
    }

    onLoad() {
        this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
    }

    onDestroy() {
        this.node.off(cc.Node.EventType.TOUCH_END, this.onClick, this);
    }

    onClick() { 
      this.controller.onTileClicked(this.model);
    }

    public setPositionByBoard(x:number,y:number, getPos:(x:number,y:number)=>cc.Vec3) {
      this.node.position = getPos(x,y);
    }
}