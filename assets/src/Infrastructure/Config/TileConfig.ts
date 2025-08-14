import { ITileBehavior } from '../../Core/Tiles/TileBehavior';

export interface TileConfig {
  id: string;
  spriteName?: string;
  behavior?: ITileBehavior;
}
