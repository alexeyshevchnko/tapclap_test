import { BombBehavior, NormalBehavior, RoketHBehavior, RoketVBehavior } from "../Core/Tiles/TileBehavior";
import { TileConfig } from "../Infrastructure/Config/TileConfig";

const { ccclass, property } = cc._decorator;

@ccclass
export default class ScriptableTileConfig extends cc.Component {
    @property(cc.Prefab) public rocketUpPrefab: cc.Prefab = null;
    @property(cc.Prefab) public rocketDownPrefab: cc.Prefab = null;
    @property(cc.Prefab) public rocketLeftPrefab: cc.Prefab = null;
    @property(cc.Prefab) public rocketRightPrefab: cc.Prefab = null;
    @property(cc.Prefab) public firePrefab: cc.Prefab = null; 

    @property(cc.SpriteFrame) public redSprite: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) public blueSprite: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) public greenSprite: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) public bombSprite: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) public purpureSprite: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) public yellowSprite: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) public roketVSprite: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) public roketHSprite: cc.SpriteFrame = null; 
    

    onLoad(){
        const configs: Record<string, TileConfig> = {
          red: { id: 'red', spriteName: 'red', behavior: new NormalBehavior() },
         blue: { id: 'blue', spriteName: 'blue', behavior: new NormalBehavior()},
          green: { id: 'green', spriteName: 'green', behavior:  new NormalBehavior()},
          purpure: { id: 'purpure', spriteName: 'purpure', behavior:  new NormalBehavior()},
          yellow: { id: 'yellow', spriteName: 'yellow', behavior:  new NormalBehavior()},
         bomb: { id: 'bomb', spriteName: 'bomb', behavior: new BombBehavior() },
         roketV: { id: 'roketV', spriteName: 'roketV', behavior: new RoketVBehavior() },
          roketH: { id: 'roketH', spriteName: 'roketH', behavior: new RoketHBehavior() }
        };

        (window as any).TileSpriteFrames = {
          red: this.redSprite,
          blue: this.blueSprite,
          green: this.greenSprite,
          bomb: this.bombSprite,
          roketV: this.roketVSprite,
          roketH: this.roketHSprite,
          yellow: this.yellowSprite,
          purpure: this.purpureSprite
        };

         (window as any).RocketPrefabs = {
          up: this.rocketUpPrefab,
          down: this.rocketDownPrefab,
          left: this.rocketLeftPrefab,
          right: this.rocketRightPrefab
        };

         (window as any).Fire = {
          Fire: this.firePrefab 
        };

        (window as any).TileConfigs = configs;
    }
}
