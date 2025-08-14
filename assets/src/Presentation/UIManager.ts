const { ccclass, property } = cc._decorator;

@ccclass
export default class UIManager extends cc.Component {
  @property(cc.Label) scoreLabel: cc.Label = null;

  public setScore(score:number){
    if (this.scoreLabel) this.scoreLabel.string = String(score);
  }
}
