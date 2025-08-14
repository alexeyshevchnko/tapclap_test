import { ITileBehavior } from "./TileBehavior";

export type TileId = string;

export class TileModel {
  public isRemoved: boolean = false;
  constructor(
    public id: TileId,
    public x: number,
    public y: number,
    public readonly isSpecial:boolean,
    public behavior: ITileBehavior | null = null
  ) {}
}
