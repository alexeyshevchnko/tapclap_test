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
    await this.playAnimation(tileStart);  
  }

  async playAnimation(tileStart: TileModel): Promise<void> { 
    await this.processBombRemoval(tileStart); 
  }

  private async processBombRemoval(tileStart: TileModel): Promise<void> {
    let currentLayer: TileModel[] = [tileStart];
    const visited = new Set<TileModel>();

    while (currentLayer.length > 0) {
      const nextLayer: TileModel[] = [];
      const bombsToAnimate: TileModel[] = [];
      const rocketsAndOthers: TileModel[] = [];

      for (const current of currentLayer) {
        if (visited.has(current)) continue;
        visited.add(current);

        if (current.behavior instanceof BombBehavior) {
          const affected = current.behavior.getAffectedTiles(current); 

          for (const t of affected) {
            if (t === current) continue;
            if (t.isRemoved || visited.has(t) || nextLayer.includes(t)) continue;
            if (t.behavior instanceof ChainReactionBehavior) {
              nextLayer.push(t);
            }
          }
        }

        if (current.behavior instanceof BombBehavior) {
          bombsToAnimate.push(current);
        } else {
          rocketsAndOthers.push(current);
        }
      }
 
      await Promise.all([
        ...bombsToAnimate.map(b => (b.behavior as BombBehavior).explodeWithoutKillingChains(b)),
        ...rocketsAndOthers.map(t => t.behavior.execute(t)),
      ]);

      if (nextLayer.length > 0) {
        await delay(50);  
      }

      currentLayer = nextLayer;
    }
  }

  private async explodeWithoutKillingChains(tileStart: TileModel): Promise<void> {
    const affected = this.getAffectedTiles(tileStart);
 
    const toRemove = affected.filter(t =>
      !(t.behavior instanceof ChainReactionBehavior) || t === tileStart
    );

    for (const t of affected) {
      this.animator.spawnFireAtTile(t);  
    }

    await this.animator.animateGroupRemoval(tileStart, toRemove);
    this.board.removeTiles(toRemove);
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
  const centerIndex = affectedTiles.findIndex(t => t === startTile);
  let left = centerIndex - 1;
  let right = centerIndex + 1;

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Удаляем саму ракету (центр)
  await this.animator.animateRemoval(startTile);

  const allStepPromises: Promise<void>[] = [];

  const stepWave = async () => {
    while (left >= 0 || right < affectedTiles.length) {
      const removalsThisStep: Promise<void>[] = [];
      const chainsThisStep: TileModel[] = [];

      if (left >= 0) {
        this.collectStep(affectedTiles[left], startTile, removalsThisStep, chainsThisStep);
        left--;
      }

      if (right < affectedTiles.length) {
        this.collectStep(affectedTiles[right], startTile, removalsThisStep, chainsThisStep);
        right++;
      }

      // Промисы для chain-тайлов этого шага
      const chainsPromises: Promise<void>[] = chainsThisStep.map(t => t.behavior.execute(t));

      // Добавляем все промисы этого шага в общий массив
      allStepPromises.push(...removalsThisStep, ...chainsPromises);

      // Задержка между «волнами» для визуала
      await delay((this.animator.cellTime + this.animator.addRoketTime) * 1000);
    }
  };

  await stepWave();

  // Ждём завершения всех промисов шагов (тайлы + цепочки)
  await Promise.all(allStepPromises);
}



/** Вместо старого handleTile — коллекционируем по шагу */
private collectStep(
  tile: TileModel,
  startTile: TileModel,
  removals: Promise<void>[],
  chains: TileModel[]
) {
  if (!tile) return;

  if (this.isChainReaction(startTile, tile)) {
    // НЕ запускаем сразу, а копим на текущий шаг
    chains.push(tile);
  } else {
    // Обычный тайл — просто удаляем
    removals.push(this.animator.animateRemoval(tile));
  }
}


  private isChainReaction(startTile: TileModel, tile: TileModel): boolean {
   // if (!tile || !tile.behavior) return false; 
    return /*!tile.isRemoved &&*/ startTile.behavior.constructor !== tile.behavior.constructor &&
        tile.behavior instanceof ChainReactionBehavior 
      
  }
}

export class RoketVBehavior extends BaseRoketBehavior {
  private lineLocks = new Map<number, boolean>();

  async execute(tileStart: TileModel): Promise<void> {
    if (tileStart.isRemoved) return;

    if(this.lineLocks.get(tileStart.x)){
      await this.animator.animateRemoval(tileStart);
      return;
    }

    this.lineLocks.set(tileStart.x, true);
    await this.playAnimation(tileStart);
    this.lineLocks.set(tileStart.x, false);
  }

  getAffectedTiles(tileStart: TileModel): TileModel[] {
    const tiles: TileModel[] = [];
    for (let y = 0; y < this.board.rows(); y++) {
      const tile = this.board.getTile(tileStart.x, y);
      if (tile) tiles.push(tile);
    }
    return tiles;
  } 
}

export class RoketHBehavior extends BaseRoketBehavior {
  private lineLocks = new Map<number, boolean>();
  async execute(tileStart: TileModel): Promise<void> { 
    if(tileStart.isRemoved) return;

    if(this.lineLocks.get(tileStart.y)){ 
      await this.animator.animateRemoval(tileStart);
      return;
    }

    this.lineLocks.set(tileStart.y, true); 
    await this.playAnimation(tileStart); 
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
