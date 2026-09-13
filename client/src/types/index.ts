import type { Application, Container, Graphics } from "pixi.js";
import { Callbacks, type Room } from "@colyseus/sdk";
import type { WorldState } from "@/server/schema/WorldState";

// ---- shared types ----
export type Item = {
  name: string;
  icon: string;
  color: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  type: "Material" | "Tool" | "Weapon" | "Block" | "Station";
  stats?: Record<string, string | number>;
  desc: string;
};

export type RecipeArray = {
  id: string;
  name: string;
  inputs: Record<string, number>;
  station?: string | Record<string, number>;
  output:
    | {
        kind: "item";
        item: string;
        count: number;
      }
    | {
        kind: "tool";
        tool: string;
        count?: number;
      };
}[];

export type RecipeObj = {
  id: string;
  name: string;
  inputs: Record<string, number>;
  output: {
    kind: "item" | "tool";
    item?: string;
    tool?: string;
    count?: number;
  };
};

export type Placeable = {
  item: string;
  name: string;
  icon: string;
  color: number;
};

export type PlayerSprite = Graphics & {
  tx: number;
  ty: number;
};

export type GameContext = {
  room: Room<WorldState>;
  myName: string;
  myInventory: Record<string, number>;

  held: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };

  chatOpen: boolean;
  invOpen: boolean;

  app: Application;
  world: Container;
  sprites: Map<string, PlayerSprite>;

  $: ReturnType<typeof Callbacks.get<WorldState>>;

  setHp?: (hp: number, maxHp: number) => void;

  chatLog?: HTMLDivElement;
  chatInput?: HTMLInputElement;
  ctxMenu?: HTMLDivElement;

  makeItemChip?: (item: string, count: number | null) => HTMLSpanElement;

  appendSystem?: (text: string) => void;
  appendLine?: (name: string, text: string) => void;

  showLog?: () => void;
  scheduleFade?: () => void;
  openChat?: () => void;
  closeChat?: () => void;

  closeCtxMenu?: () => void;

  craftModalIsOpen?: () => boolean;
  openCrafting?: () => void;
  closeCrafting?: () => void;

  closeInv?: () => void;
  toggleInv?: () => void;
};

export type CameraContext = Pick<
  GameContext,
  "app" | "world" | "room" | "sprites"
>;

export type PlacedContext = Pick<GameContext, "world" | "room" | "$">;

export type Recipes = Record<string, RecipeObj>;
export type Items = Record<string, Item>;
export type PlaceInfo = Record<string, Placeable>;
