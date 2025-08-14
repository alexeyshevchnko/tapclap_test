import { GameModel } from './GameModel';
import { IScoreService } from './GameTypes';

export class GameService {
  constructor(private model: GameModel, private scoreService: IScoreService) {}

  start(): void {
    this.model.state = 'running';
  }

  useMove(): void {
    if (this.model.state !== 'running') return;
    this.model.moves--;
    if (this.model.moves <= 0) this.model.state = 'gameover';
  }

  addScore(points: number): void {
    this.scoreService.add(points);
    this.model.score = this.scoreService.getScore();
  }
}
