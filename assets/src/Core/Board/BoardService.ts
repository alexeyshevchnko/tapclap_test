import { BoardModel } from './BoardModel';
import { TileFactory } from '../Tiles/TileFactory';
import { TileModel } from '../Tiles/TileModel';

export class BoardService {
    constructor(private model: BoardModel, private factory: TileFactory) {
       this.cols = () => this.model.cols;
       this.rows = () => this.model.rows;
    }
    
    public cols: () => number;
    public rows: () => number;


    generateBoard(): void {
        for (let y = 0; y < this.model.rows; y++) {
            for (let x = 0; x < this.model.cols; x++) {
                this.model.setTile(x, y, this.factory.create(x, y, false)); 
            }
        }
    }

    removeTiles(tiles: TileModel[]): void {
        for (const t of tiles) {
            t.isRemoved = true; 
        }
    }

    collapse(): void {
        for (let x=0; x<this.model.cols; x++){
            for (let y=0; y<this.model.rows-1; y++){
                if (this.model.getTile(x,y)?.isRemoved) {
                    for (let yy=y + 1; yy<this.model.rows; yy++){
                        const above = this.model.getTile(x,yy);
                        if (above && !above.isRemoved) {
                            this.swap(x,y,x,yy);
                            break;
                        }
                    }
                }
            }
        }
    }

    spawnNew(): {tile: TileModel, fromY:number}[] {
        const res: {tile:TileModel, fromY:number}[] = [];
        for (let x = 0; x<this.model.cols; x++){
            const empties: number[] = [];
            for (let y = 0; y < this.model.rows; y++) if(this.model.getTile(x,y)?.isRemoved) empties.push(y);
            empties.sort((a,b)=>a-b);
            for (let i = 0; i<empties.length; i++){
                const y = empties[i];
                const newTile = this.factory.create(x, y, false);
                this.model.setTile(x,y,newTile);  
                res.push({tile:newTile, fromY:this.model.rows + i});
            }
        }
        return res;
    }

    private swap(x1:number,y1:number,x2:number,y2:number){
        const a = this.model.getTile(x1,y1); 
        const b = this.model.getTile(x2,y2); 
        this.model.setTile(x1,y1,b); 
        this.model.setTile(x2,y2,a); 
        if (a) { a.x = x2; a.y = y2; }
        if (b) { b.x = x1; b.y = y1; }
    }

    public createRandomSpecialTile(x: number, y: number): TileModel | null { 
        const specialTile = this.factory.createRandomSpecial(x, y);
        if (specialTile) {
            this.model.setTile(x, y, specialTile);
        }
        
        return specialTile;
    }

    public getRemovedTiles(): TileModel[] {
        const removed: TileModel[] = [];
        for (let y = 0; y < this.model.rows; y++) {
            for (let x = 0; x < this.model.cols; x++) {
                const tile = this.model.getTile(x,y);
                if (tile.isRemoved) {
                    removed.push(tile);
                }
            }
        }
        return removed;
    }

     public getTile(x:number,y:number): TileModel | null {
        return this.model.getTile(x, y);
    }

    public setTile(x: number, y: number, tile: TileModel | null) {
        this.model.setTile(x, y, tile);
    } 
 
}
