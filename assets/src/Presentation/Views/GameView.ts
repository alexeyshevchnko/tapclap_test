const { ccclass, property } = cc._decorator;
import BoardView from './BoardView';
import { BoardModel } from '../../Core/Board/BoardModel';
import { BoardService } from '../../Core/Board/BoardService';
import { TileFactory } from '../../Core/Tiles/TileFactory';
import { TileAnimator } from '../Animations/TileAnimator';
import { GameModel } from '../../Core/Game/GameModel';
import { GameService } from '../../Core/Game/GameService';
import { ScoreService } from '../../Core/Scoring/ScoreService';
import { ScoreModel } from '../../Core/Scoring/ScoreModel';
import { TileConfig } from '../../Infrastructure/Config/TileConfig';
import Config from '../../Infrastructure/Config/GameConfig';
import { TileModel } from '../../Core/Tiles/TileModel';

@ccclass
export default class GameView extends cc.Component {
  @property(BoardView) boardView: BoardView = null;

  private boardModel: BoardModel;
  private boardService: BoardService;
  private tileFactory: TileFactory;
  private animator: TileAnimator;

  private gameModel: GameModel;
  private scoreService: ScoreService;
  private gameService: GameService;

  onLoad(){
    const tileConfigs: Record<string, TileConfig> = (window as any).TileConfigs || {};

    this.tileFactory = new TileFactory(tileConfigs);
    this.boardModel = new BoardModel(Config.rows, Config.cols);
    
    this.boardService = new BoardService(this.boardModel, this.tileFactory);

    this.boardService.generateBoard();

    this.boardView.init(this, this.boardModel);
    this.animator = new TileAnimator(this.boardView, this.boardModel, this.boardService);

    this.initAllBehaviors(this.boardService,this.animator);
     
    this.gameModel = new GameModel();
    const scoreModel = new ScoreModel();
    this.scoreService = new ScoreService(scoreModel);
    this.gameService = new GameService(this.gameModel, this.scoreService);

    this.gameService.start();
  }

  initAllBehaviors(boardService: BoardService, animator: TileAnimator) {
    const tileConfigs: Record<string, TileConfig> = (window as any).TileConfigs || {};
    
    for (const [tileId, config] of Object.entries(tileConfigs)) {
      if (config.behavior && typeof config.behavior.init === 'function') {
        try {
          console.log(`Initializing behavior for tile: ${tileId}`);
          config.behavior.init(boardService, animator);
        } catch (error) {
          console.error(`Error initializing behavior for tile ${tileId}:`, error);
        }
      }
    }
  }

  public async onTileClicked(tile:TileModel){
     try {
    //const affectedTiles = this.boardService.getAffectedTiles(tile);
   // if (affectedTiles.length === 0) return;

   // this.boardService.removeTiles(affectedTiles);
   // await this.animator.animateGroupRemoval(tile, affectedTiles);
    console.log("A1")
    await tile.behavior.execute(tile);
    console.log("A2")
    this.boardService.collapse();
    await this.animator.animateCollapse();

    const newTiles = this.boardService.spawnNew();
    await this.animator.animateSpawn(newTiles);

    //this.gameService.addScore(affectedTiles.length * 10);
    //this.gameService.useMove();
    } catch (error) {
      console.error("Error in tile chain reaction:", error);
      if (error instanceof Error) {
          console.error("Stack trace:", error.stack);
      }
    }
  }
}
