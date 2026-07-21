import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") color: string = "#ffffff";
  @type("string") name: string = "";
  @type("number") hp = 100;
  @type("number") maxHp = 100;
}

export class Mob extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("string") kind = "slime";
  @type("number") hp = 10;
  @type("number") maxHp = 10;
}

export class WorldState extends Schema {
  @type("number") cols: number = 0;
  @type("number") rows: number = 0;
  @type("number") tile: number = 0;
  @type(["number"]) tiles = new ArraySchema<number>();
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Mob }) mobs = new MapSchema<Mob>();
}