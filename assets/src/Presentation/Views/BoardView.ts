const { ccclass, property } = cc._decorator;
import Config from '../../Infrastructure/Config/GameConfig';
import { TileModel } from '../../Core/Tiles/TileModel';
import GameView from './GameView';
import { BoardModel } from '../../Core/Board/BoardModel';

@ccclass
export default class BoardView extends cc.Component {
  @property(cc.Prefab)
  private tilePrefab: cc.Prefab = null;

  @property(cc.Vec2)
  private offset: cc.Vec2 = cc.v2(0, 0);

  private tileNodes: (cc.Node | null)[][] = [];
  public boardModel: BoardModel;
  public controller: GameView;

 

  public init(controller:GameView, boardModel:BoardModel): void { 
    this.controller = controller;
    this.boardModel = boardModel;
    this.generateBoard();
  }

  private generateBoard(): void {
    this.tileNodes = [];
    this.node.removeAllChildren();

    for (let y = 0; y < this.boardModel.rows; y++) {
      this.tileNodes[y] = [];
      for (let x = 0; x < this.boardModel.cols; x++) {
        const tile = this.boardModel.getTile(x, y);
        if (tile ) {
          this.createTileNode(tile, x, y);
        }
      }
    }
  }

  public RemoveTileNode(x: number, y: number){
    this.tileNodes[y][x] = null;
  }

  public getTileNode(x: number, y: number): cc.Node | null {
      if (y < 0 || y >= this.tileNodes.length) return null;
      if (x < 0 || x >= this.tileNodes[y].length) return null; 

      return this.tileNodes[y][x] || null;
  }

  public createTileNode(tile: TileModel, x: number, y: number): cc.Node {
    const tileNode = cc.instantiate(this.tilePrefab);
    tileNode.parent = this.node;
    tileNode.position = this.getTilePosition(x, y);
    tileNode.zIndex = y;
    tileNode['_tileModel'] = tile;

    const tileView = tileNode.getComponent('TileView'); 
    
    const spriteFrame = (window as any).TileSpriteFrames[tile.id];
    tileView.bindModel(tile, this.controller, spriteFrame);
     

    this.tileNodes[y][x] = tileNode;
    return tileNode;
  }

  public getTilePosition(x: number, y: number): cc.Vec3 {
    return cc.v3(
      x * 100 + this.offset.x,
      y * 100 + this.offset.y,
      0
    );
  }

  public spawnTiles(newTiles: TileModel[]): cc.Node[][] { 
    const result: cc.Node[][] = [];

    for (const tile of newTiles) {
      const x = tile.x;
      const y = tile.y;

      if (!result[y]) {
        result[y] = [];
      }

      const node = this.createTileNode(tile, x, y); 
      result[y][x] = node;

      this.tileNodes[y][x] = node;
    }

    return result;
}


public updateTileNodesStructure(): void {
  const newNodes: cc.Node[][] = Array(this.boardModel.rows).fill(null).map(() => []);

  for (let y = 0; y < this.boardModel.rows; y++) {
    for (let x = 0; x < this.boardModel.cols; x++) {
      const tile = this.boardModel.getTile(x, y);
      if (tile ) {
        const node = this.findExistingNodeForTile(tile);
        if (node) {
          newNodes[y][x] = node;
        }
      }
    }
  }
  this.tileNodes = newNodes;
}

  private findExistingNodeForTile(tile: TileModel): cc.Node | null {
    for (let y = 0; y < this.tileNodes.length; y++) {
      for (let x = 0; x < this.tileNodes[y]?.length; x++) {
        const node = this.tileNodes[y][x];
        if (node && node['_tileModel'] === tile) {
          this.tileNodes[y][x] = null;
          return node;
        }
      }
    }
    return null;
  }
}
