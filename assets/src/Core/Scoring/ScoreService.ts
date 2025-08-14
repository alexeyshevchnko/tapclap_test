import { ScoreModel } from './ScoreModel';

export class ScoreService {
  constructor(private model: ScoreModel) {}
  add(points:number){ this.model.score += points; }
  getScore(){ return this.model.score; }
}
