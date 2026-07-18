import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") color: string = "#ffffff";
}

export class WorldState extends Schema {
  @type("number") cols: number = 0;
  @type("number") rows: number = 0;
  @type("number") tile: number = 0;
  @type(["number"]) tiles = new ArraySchema<number>();
  @type({ map: Player }) players = new MapSchema<Player>();
}