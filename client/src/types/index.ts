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

export type Recipe = {
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

export type MobSprite = Container & {
  tx: number;
  ty: number;
  _body: Graphics;
  _bar: Graphics;
  _maxHp: number;
};

export type TilePos = {
  c: number;
  r: number;
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
  invModal?: HTMLDivElement;
  invGrid?: HTMLDivElement;

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
  refreshCrafting?: () => void;

  closeInv?: () => void;
  toggleInv?: () => void;
  renderInvGrid?: () => void;
  openInv?: () => void;

  refreshBuild?: () => void;
  openChest?: (index: number) => void;
  refreshChest?: () => void;

  longPressed?: boolean;

  hideTooltip?: () => void;
  fillTooltip?: (item: string) => void;
  showTooltip?: (chip: HTMLElement) => void;
};

export type CameraContext = Pick<
  GameContext,
  "app" | "world" | "room" | "sprites"
>;

export type PlacedContext = Pick<GameContext, "world" | "room" | "$">;

export type MobContext = Pick<GameContext, "app" | "world" | "room" | "$">;

export type ChestContext = Pick<
  GameContext,
  "room" | "myInventory" | "openChest" | "refreshChest"
>;

export type InventoryContext = Pick<
  GameContext,
  | "room"
  | "myInventory"
  | "invOpen"
  | "refreshCrafting"
  | "refreshBuild"
  | "refreshChest"
  | "hideTooltip"
  | "invModal"
  | "invGrid"
  | "renderInvGrid"
  | "openInv"
  | "closeInv"
  | "toggleInv"
>;

export type TooltipContext = Pick<
  GameContext,
  | "chatLog"
  | "invGrid"
  | "longPressed"
  | "showLog"
  | "fillTooltip"
  | "showTooltip"
  | "hideTooltip"
>;

export type RecipeArray = Recipe[];
export type Recipes = Record<string, Recipe>;
export type Items = Record<string, Item>;
export type PlaceInfo = Record<string, Placeable>;

type _GameContext = GameContext;
type _CameraContext = CameraContext;
type _PlacedContext = PlacedContext;
type _MobContext = MobContext;
type _ChestContext = ChestContext;
type _InventoryContext = InventoryContext;
type _TooltipContext = TooltipContext;

export namespace Context {
  export type GameContext = _GameContext;
  export type CameraContext = _CameraContext;
  export type PlacedContext = _PlacedContext;
  export type MobContext = _MobContext;
  export type ChestContext = _ChestContext;
  export type InventoryContext = _InventoryContext;
  export type TooltipContext = _TooltipContext;
}

export namespace ChestTypes {
  export type ChestQuantity = 1 | 10 | "all";
  export type ChestDirection = "deposit" | "withdraw";
  export type ChestDataMessage = {
    index: number;
    items: Record<string, number>;
  };
}
