const { ccclass, property } = cc._decorator;
import GameView from './Views/GameView';
import BoardView from './Views/BoardView';
import UIManager from './UIManager';

@ccclass
export default class GameManager extends cc.Component {
  @property(BoardView) boardView: BoardView = null;
  @property(UIManager) uiManager: UIManager = null;

  private gameView: GameView = null;

  onLoad(){
    this.gameView = this.getComponent(GameView) || this.addComponent(GameView);

    if (this.boardView) this.gameView.boardView = this.boardView;
    if ((this as any).ui) this.gameView['uiManager'] = this.uiManager;
  }
}
