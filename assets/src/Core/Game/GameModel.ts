import { GameState } from './GameTypes';

export class GameModel {
  public state: GameState = 'idle';
  public moves: number = 0;
  public score: number = 0;
}
