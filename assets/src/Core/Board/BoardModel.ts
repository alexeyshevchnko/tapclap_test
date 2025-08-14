import { TileModel } from '../Tiles/TileModel';

export class BoardModel {
    private tiles: (TileModel | null)[][] = []; 
    
    constructor(
      public readonly rows: number,
      public readonly cols: number) { 
        this.tiles = [];
        for (let y = 0; y < this.rows; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.tiles[y][x] = null;
            }
        }
    }

    public getTile(x:number,y:number): TileModel | null {
        if (y<0||y>=this.rows||x<0||x>=this.cols) return null;
        return this.tiles[y]?.[x] ?? null;
    }

    public setTile(x: number, y: number, tile: TileModel | null) {
        if (y < 0 || y >= this.rows || x < 0 || x >= this.cols) return;
        
        if (!this.tiles[y]) {
            this.tiles[y] = new Array(this.cols).fill(null);
        }
        
        this.tiles[y][x] = tile;
    } 
}
