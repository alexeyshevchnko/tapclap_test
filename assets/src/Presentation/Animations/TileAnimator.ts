import { BoardModel } from '../../Core/Board/BoardModel';
import { BoardService } from '../../Core/Board/BoardService';
import { ChainReactionBehavior } from '../../Core/Tiles/TileBehavior';
import { TileModel } from '../../Core/Tiles/TileModel';
import { delay } from '../../Infrastructure/Utils/AsyncUtils';
import BoardView from '../Views/BoardView';

export class TileAnimator {
    public readonly cellTime:number = .2;
    public readonly addRoketTime:number = 0.05;
    private boardModel: BoardModel;
    private boardView: BoardView;
    private boardService:BoardService;

    constructor(boardView: BoardView, boardModel: BoardModel, boardService:BoardService) {
      this.boardService = boardService;
      this.boardModel = boardModel;
      this.boardView = boardView;
    } 

    async animateGroupRemoval(tileClicked:TileModel, affectedTiles: TileModel[]){ 
      if(tileClicked.isSpecial || affectedTiles.length < 6){
          const animations = affectedTiles.map(tile => this.animateRemoval(tile));
          await Promise.all(animations);
      }else{
        await this.animateRemovalCollection(tileClicked,affectedTiles);
      }
    }

    async animateCollapse(){

      const originalPositions = new Map<cc.Node, {x: number, y: number}>();

          for (let y = 0; y < this.boardModel.rows; y++) {
              for (let x = 0; x < this.boardModel.cols; x++) {
                  const node = this.boardView.getTileNode(x, y); 
                  if (node) {
                      originalPositions.set(node, {x, y});
                  }
              }
          }

          this.boardView.updateTileNodesStructure();

          const animations: Promise<void>[] = [];
          const fallSpeed = 16;

          for (let y = 0; y < this.boardModel.rows; y++) {
              for (let x = 0; x < this.boardModel.cols; x++) {
                  const node =  this.boardView.getTileNode(x, y); 
                  if (!node) continue;
                  const originalPos = originalPositions.get(node);
                  if (originalPos && originalPos.y !== y) {
                      animations.push(this.tweenFall(node, x, originalPos.y, x, y, fallSpeed));
                  }
              }
          }

          await Promise.all(animations);
  
    }

    private tweenFall(
          node: cc.Node,
          startX: number,
          startY: number,
          endX: number,
          endY: number,
          fallSpeed: number
      ): Promise<void> {
          const cellDistance = Math.abs(startY - endY);
          const duration = cellDistance / fallSpeed;
          const endPos = this.boardView.getTilePosition(endX, endY);
          const overshoot = 5;
  
          node.position = this.boardView.getTilePosition(startX, startY);
          node.zIndex = startY;
          node.scale = 1; 

          const isBottomRow = (endY === 0); 
          const squashDelay = isBottomRow ? 0 : (cellDistance > 1 ? (cellDistance - 1) * 0.05 : 0);

          return new Promise(resolve => {
              cc.tween(node)
                  .to(duration, { position: endPos, zIndex: endY })
                  .to(0.05, { position: cc.v3(endPos.x, endPos.y - overshoot) }, { easing: 'quadOut' })
                  .to(0.08, { position: endPos }, { easing: 'bounceOut' })
                  .delay(squashDelay)
                  .to(0.05, { scaleX: 1.15, scaleY: 0.85 }, { easing: 'quadOut' })
                  .to(0.08, { scaleX: 0.95, scaleY: 1.05 }, { easing: 'quadOut' })
                  .to(0.06, { scaleX: 1, scaleY: 1 }, { easing: 'quadOut' })
                  .call(resolve)
                  .start();
          });
    }
  
    public async animateSpawn(newTiles: { tile: TileModel, fromY: number }[]): Promise<void> {
          const tilesToSpawn = newTiles.map(({ tile }) => tile);
          const spawnedNodes = this.boardView.spawnTiles(tilesToSpawn);
    
          const animations: Promise<void>[] = [];
          const fallSpeed = 16;

          for (let i = 0; i < newTiles.length; i++) {
              const { fromY } = newTiles[i];
              const tile = tilesToSpawn[i];
    
              const node = spawnedNodes[tile.y]?.[tile.x];
              if (!node) {
                  console.warn(`Node not found at position y=${tile.y}, x=${tile.x}`);
                  continue;
              }

              animations.push(
                  this.tweenFall(
                      node,
                      tile.x, // startX
                      fromY,  // startY
                      tile.x, // endX
                      tile.y, // endY
                      fallSpeed
                  )
              );
          }
    
          await Promise.all(animations);
    }

   async animateRemoval(tile: TileModel) : Promise<void>{
    if(!tile){ 
      return; 
    }

    //tile.isRemoved = true;
    const node = this.boardView.getTileNode(tile.x, tile.y);

    if (!node || !node.isValid) {  
      return;
    } 
    
    try {
        await this.runTweenAnimation(node); 
    } catch (err) { 
        console.error("Ошибка анимации удаления:", err);
    }
}

private  runTweenAnimation(node: cc.Node): Promise<void> {
    return new Promise((resolve) => {
        if (!node || !node.isValid) {
            resolve();
            console.log("ERROR");
            return;
        }

        const tween = cc.tween(node)
            .to(this.cellTime, { scale: 0, opacity: 0 })
            .call(() => { 
                resolve();  
            })
            .start(); 

        if (!tween) {
            resolve();
        }
    });
}
 

    private async animateRemovalCollection(tileClicked: TileModel, affectedTiles: TileModel[]): Promise<void> {
          const removedTiles = affectedTiles; 
          const centerX = tileClicked.x;
          const centerY = tileClicked.y;
          const centerPos = this.boardView.getTilePosition(centerX, centerY);

          const spreadFactor = 1.2; 

          const spreadAnimations = removedTiles.map(tile => {
              const node = this.boardView.getTileNode(tile.x,tile.y);
              if (!node) return Promise.resolve();

              const offsetX = tile.x - centerX;
              const offsetY = tile.y - centerY;
              
              const spreadOffsetX = offsetX * spreadFactor;
              const spreadOffsetY = offsetY * spreadFactor;
              
              const spreadPos = this.boardView.getTilePosition(
                  centerX + spreadOffsetX,
                  centerY + spreadOffsetY
              );

              node.zIndex = 1000 + Math.floor(Math.abs(offsetX) + Math.abs(offsetY));

              return new Promise<void>(resolve => {
                  cc.tween(node)
                      .to(0.1, { position: spreadPos, scale: 1.021 })
                      .call(resolve)
                      .start();
              });
          });

          await Promise.all(spreadAnimations);
          await delay(50);   

          const collapseAnimations = removedTiles.map(tile => {
              const node = this.boardView.getTileNode(tile.x,tile.y);
              if (!node) return Promise.resolve();

              node.zIndex = 0;

              return new Promise<void>(resolve => {
                  cc.tween(node)
                      .to(0.1, { position: centerPos })
                      .to(0.1, { scale: 0 })
                      .call(() => {
                          node.destroy();
                          //TODO
                          this.boardView.RemoveTileNode(tile.x, tile.y)
                          resolve();
                      })
                      .start();
              });
          });

          await Promise.all(collapseAnimations);
 
    } 

    async animateSpawnSpecialTile(startTile: TileModel){
      const specialTile = this.boardService.createRandomSpecialTile(
          startTile.x, 
          startTile.y
      );
      
      if (specialTile) {
          const tileNode = this.boardView.createTileNode(
              specialTile, 
              startTile.x, 
              startTile.y
          );
          
          // Анимация появления
          tileNode.scale = 0;
          await new Promise<void>(resolve => {
              cc.tween(tileNode)
                  .to(0.3, { scale: 1 }, { easing: 'backOut' })
                  .call(resolve)
                  .start();
          });
      } 
    }
    async animateRocketLaunch(startTile: TileModel, direction: 'vertical' | 'horizontal') {
    const startPos = this.boardView.getTilePosition(startTile.x, startTile.y);
    const prefabs = (window as any).RocketPrefabs;

    const spawnPrefab = (prefab: cc.Prefab) => {
        const node = cc.instantiate(prefab);
        node.position = startPos;
        node.parent = this.boardView.node;
        node.zIndex = 9999;
        return node;
    };

    const animations: Promise<void>[] = [];
    
    const time =this.cellTime+this.addRoketTime;
    if (direction === 'vertical') {
        const lastYTop = this.boardModel.rows - 1; // верхний ряд
        const lastYBottom = 0; // нижний ряд

        // вверх
        {
            const upNode = spawnPrefab(prefabs.up);
            const distanceCells = lastYTop - startTile.y; // сколько клеток до верхней
            const endPos = this.boardView.getTilePosition(startTile.x, lastYTop);
            animations.push(new Promise<void>(resolve => {
                cc.tween(upNode)
                    .to(distanceCells * time, { position: endPos })
                    .call(() => { upNode.destroy(); resolve(); })
                    .start();
            }));
        }

        // вниз
        {
            const downNode = spawnPrefab(prefabs.down);
            const distanceCells = startTile.y - lastYBottom; // сколько клеток до нижней
            const endPos = this.boardView.getTilePosition(startTile.x, lastYBottom);
            animations.push(new Promise<void>(resolve => {
                cc.tween(downNode)
                    .to(distanceCells * time, { position: endPos })
                    .call(() => { downNode.destroy(); resolve(); })
                    .start();
            }));
        }
    } else {
        const lastXRight = this.boardModel.cols - 1; // крайняя правая
        const lastXLeft = 0; // крайняя левая

        // вправо
        {
            const rightNode = spawnPrefab(prefabs.right);
            const distanceCells = lastXRight - startTile.x;
            const endPos = this.boardView.getTilePosition(lastXRight, startTile.y);
            animations.push(new Promise<void>(resolve => {
                cc.tween(rightNode)
                    .to(distanceCells * time, { position: endPos })
                    .call(() => { rightNode.destroy(); resolve(); })
                    .start();
            }));
        }

        // влево
        {
            const leftNode = spawnPrefab(prefabs.left);
            const distanceCells = startTile.x - lastXLeft;
            const endPos = this.boardView.getTilePosition(lastXLeft, startTile.y);
            animations.push(new Promise<void>(resolve => {
                cc.tween(leftNode)
                    .to(distanceCells * time, { position: endPos })
                    .call(() => { leftNode.destroy(); resolve(); })
                    .start();
            }));
        }
    }

    await Promise.all(animations);
}  
    public spawnFireAtTile(startTile: TileModel) {
        const startPos = this.boardView.getTilePosition(startTile.x, startTile.y);
        const firePrefab = (window as any).Fire.Fire;
       
        const fireNode = cc.instantiate(firePrefab);
        fireNode.position = startPos;
        fireNode.parent = this.boardView.node;
        fireNode.zIndex = 9994;
 
        cc.tween(fireNode)
            .to( this.cellTime*2, { opacity: 0 })  
            .call(() => {
                fireNode.destroy(); 
            })
            .start();
    }



}
