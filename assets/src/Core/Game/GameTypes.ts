export type GameState = 'idle' | 'running' | 'gameover';

export interface IScoreService {
  add(points: number): void;
  getScore(): number;
}
