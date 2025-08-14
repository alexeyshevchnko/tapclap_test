import { TileModel } from './TileModel'; 
import { BoardService } from '../Board/BoardService';
import { delay } from '../../Infrastructure/Utils/AsyncUtils';
import { TileAnimator } from '../../Presentation/Animations/TileAnimator';

export interface ITileBehavior {
  init(boardService: BoardService, animator :TileAnimator);
  execute(tileStart: TileModel): Promise<void>;
  getAffectedTiles(tileStart: TileModel): TileModel[];
  playAnimation(tileStart: TileModel): Promise<void>;
}

export abstract class BaseTileBehavior  implements ITileBehavior{
  abstract execute(tileStart: TileModel): Promise<void>;
  abstract getAffectedTiles(tileStart: TileModel): TileModel[];
  abstract playAnimation(tileStart: TileModel): Promise<void>;

  protected board: BoardService;
  protected animator :TileAnimator;

  init(boardService: BoardService, animator :TileAnimator){
    this.board = boardService;
    this.animator = animator;
  }  
}

export abstract class ChainReactionBehavior extends BaseTileBehavior {  

}

export class NormalBehavior extends BaseTileBehavior {
  async execute(tileStart: TileModel): Promise<void> {
       const affectedTiles = this.getAffectedTiles(tileStart);

        if (affectedTiles.length > 1) {
            //this.board.removeTiles(affectedTiles);
            //controller.addScore(connectedTiles.length * 2);
            //controller.useMove();
 
            await this.playAnimation(tileStart);
        }
    }
  

  getAffectedTiles(start: TileModel): TileModel[] {
     const visited = new Set<TileModel>();
        const stack = [start];
        const id = start.id;
        while (stack.length) {
            const cur = stack.pop()!;
            if (visited.has(cur) /*|| cur.isRemoved*/) continue;
            visited.add(cur);
            const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
            for (const [dx, dy] of dirs) {
                const nb = this.board.getTile(cur.x + dx, cur.y + dy);
                if (nb && /*!nb.isRemoved &&*/ nb.id === id && !visited.has(nb)) stack.push(nb);
            }
        }
        return Array.from(visited).length >= 2 ? Array.from(visited) : [];
  }

  async playAnimation(tileStart: TileModel): Promise<void> {
    const affectedTiles = this.getAffectedTiles(tileStart);
    
    await this.animator.animateGroupRemoval(tileStart, affectedTiles); 
    this.board.removeTiles(affectedTiles);
    await this.animator.animateSpawnSpecialTile(tileStart); 
  }
}

export class BombBehavior extends ChainReactionBehavior {

async execute(tileStart: TileModel): Promise<void> {
  if(tileStart.isRemoved) return;
        let currentLayer: TileModel[] = [tileStart];
        const removed = new Set<TileModel>();

        while (currentLayer.length > 0) {
            const nextLayer: TileModel[] = [];
            const bombsToAnimate: TileModel[] = [];
            const rocketsAndOthers: Promise<void>[] = [];

            for (const current of currentLayer) {
                if (removed.has(current)) continue;
                removed.add(current);

                if (current.id === "bomb") {
                    const affected = current.behavior.getAffectedTiles(current);
                    for (const t of affected) {
                       // if (!t.isRemoved) this.animator.spawnFireAtTile(t);

                        if (t.isRemoved || removed.has(t) || nextLayer.includes(t)) continue;
                        if (t.behavior instanceof ChainReactionBehavior) {
                            nextLayer.push(t);
                        }
                    }
                }

                if (current.behavior instanceof ChainReactionBehavior) {
                  console.log("1 add "+ current.id+"  " +current.isRemoved);
                    bombsToAnimate.push(current);
                } else {
                  console.log("2 add "+ current.id+"  " +current.isRemoved);
                    rocketsAndOthers.push(current.behavior.execute(current));
                }
            }

            // Сначала выполняем ракеты и прочие сразу
            await Promise.all(rocketsAndOthers); 
            // Теперь все бомбы одного слоя одновременно
            await Promise.all(
                bombsToAnimate.map(async (b) => {
                    await b.behavior.playAnimation(b);
                })
            );

            // Задержка между слоями (для цепной реакции)
            if (nextLayer.length > 0) {
                await delay(100);
            }

            currentLayer = nextLayer;
        }

         //const affectedTiles = this.getAffectedTiles(tileStart);
         //this.board.removeTiles(affectedTiles);
    }

    private async processBombRemoval(startTile: TileModel): Promise<void> { 

    }

  getAffectedTiles(tileStart: TileModel): TileModel[] {
    const neighbors: TileModel[] = [];
    const cx = tileStart.x;
    const cy = tileStart.y;
    const radius = 1;
    const r2 = radius * radius;

    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x === cx && y === cy) continue;
        if (x >= 0 && x < this.board.cols() && y >= 0 && y < this.board.rows()) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= r2) {
            neighbors.push(this.board.getTile(x, y)!);
          }
        }
      }
    }
    neighbors.push(tileStart);
    return neighbors;
  }

  async playAnimation(tileStart: TileModel): Promise<void> { 
    const affectedTiles = this.getAffectedTiles(tileStart);
    for (const t of affectedTiles) {
      //if (!t.isRemoved) 
        this.animator.spawnFireAtTile(t);
    }
    await this.animator.animateGroupRemoval(tileStart,affectedTiles); 
    this.board.removeTiles(affectedTiles);
  }
}

export abstract class BaseRoketBehavior extends ChainReactionBehavior {
  abstract getAffectedTiles(tileStart: TileModel): TileModel[];

  async playAnimation(tileStart: TileModel): Promise<void>{ 
    const affectedTiles = this.getAffectedTiles(tileStart);

    let direction: 'vertical' | 'horizontal' = 'vertical';
    if (this instanceof RoketHBehavior) {
        direction = 'horizontal';
    }

   await Promise.all([
        this.animator.animateRocketLaunch(tileStart, direction),
        this.processRocketRemoval(tileStart, affectedTiles)
    ]);
    this.board.removeTiles(affectedTiles);
  }

  private async processRocketRemoval(
      startTile: TileModel,
      affectedTiles: TileModel[]
  ): Promise<void> { 
console.log("processRocketRemoval");
    const centerIndex = affectedTiles.findIndex(t => t === startTile);
    let left = centerIndex - 1;
    let right = centerIndex + 1; 

    await this.animator.animateRemoval(startTile);

    const chainPromises: Promise<void>[] = [];

    while (left >= 0 || right < affectedTiles.length) {
      const promises: Promise<void>[] = [];

      if (left >= 0) {
        this.handleTile(affectedTiles[left], startTile, promises, chainPromises);
        left--;
      }

      if (right < affectedTiles.length) {
        this.handleTile(affectedTiles[right], startTile, promises, chainPromises);
        right++;
      }

      await Promise.all(promises);
    }

    if (chainPromises.length > 0) {
      await Promise.all(chainPromises).catch(e => console.error("error", e));
    }
  }

  private handleTile(
      tile: TileModel,
      startTile: TileModel,
      promises: Promise<void>[],
      chainPromises: Promise<void>[]
  ) {
    if (this.isChainReaction(startTile, tile)) {
        chainPromises.push(
          (async () => {
              
            await tile.behavior.execute(tile);
            await this.animator.animateRemoval(tile);
          })()
        );
    } else {
      promises.push(this.animator.animateRemoval(tile));
    }
  }

  private isChainReaction(tileClicked: TileModel, tile: TileModel): boolean {
   // if (!tile || !tile.behavior) return false; 
    return /*!tile.isRemoved &&*/ tileClicked.behavior.constructor !== tile.behavior.constructor &&
        tile.behavior instanceof ChainReactionBehavior 
      
  }
}

export class RoketVBehavior extends BaseRoketBehavior {
  private lineLocks = new Map<number, boolean>();

  async execute(tileStart: TileModel): Promise<void> {
    if (tileStart.isRemoved) return;

    if(this.lineLocks.get(tileStart.x)){
      return;
    }

    this.lineLocks.set(tileStart.x, true);
    await this.playAnimation(tileStart);
    this.lineLocks.set(tileStart.x, false);
  }

  getAffectedTiles(tileStart: TileModel): TileModel[] {
    const tiles: TileModel[] = [];
    for (let y = 0; y < this.board.cols(); y++) {
      const tile = this.board.getTile(tileStart.x, y);
      if (tile) tiles.push(tile);
    }
    return tiles;
  } 
}

export class RoketHBehavior extends BaseRoketBehavior {
  private lineLocks = new Map<number, boolean>();
  async execute(tileStart: TileModel): Promise<void> {
    console.log("start");
    if(tileStart.isRemoved) return;

    if(this.lineLocks.get(tileStart.y)){
      console.log("fail");
      return;
    }

    this.lineLocks.set(tileStart.y, true);
    console.log("lock");
    await this.playAnimation(tileStart);
    console.log("unlock");
    this.lineLocks.set(tileStart.y, false);
  }

  getAffectedTiles(tileStart: TileModel): TileModel[] {
    const tiles:TileModel[] = [];

    for (let x = 0; x < this.board.cols(); x++) {
      const tile = this.board.getTile(x, tileStart.y);
      if (tile) {
        tiles.push(tile);
      }
    }

    return tiles;
  } 
}
