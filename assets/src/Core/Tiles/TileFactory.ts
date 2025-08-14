import { TileModel } from './TileModel';
import { TileConfig } from '../../Infrastructure/Config/TileConfig';
import { NormalBehavior, BombBehavior, RoketHBehavior, RoketVBehavior } from './TileBehavior';

export class TileFactory {
  constructor(private configs: Record<string, TileConfig> = {}) {}
  
  logWithStack(message: string) {
      const stack = new Error().stack;
      console.log(message, "\nCall stack:", stack);
  }

  create(x: number, y: number,isSpecial:boolean, id?: string): TileModel { 
      const key = id ?? this.getRandomNormalKey();
      const cfg = this.configs[key];
      const behavior = cfg?.behavior ?? new NormalBehavior();
      return new TileModel(key, x, y, isSpecial, behavior);
  }

  private getRandomNormalKey(): string { 
      const keys = Object.keys(this.configs).filter(k => {
        const b = this.configs[k].behavior;
        return true;//!(b instanceof BombBehavior) && !(b instanceof RoketHBehavior) && !(b instanceof RoketVBehavior);
      });
      if (keys.length === 0) return Object.keys(this.configs)[0] ?? 'normal';
      return keys[Math.floor(Math.random() * keys.length)];
  }

  createRandomSpecial(x: number, y: number): TileModel | null { 
      const special = ['bomb', 'roketH', 'roketV'].filter(k => !!this.configs[k]);
      if (special.length === 0) return null;
      const key = special[Math.floor(Math.random() * special.length)];
      return this.create(x, y,true,  key);
  }
}
