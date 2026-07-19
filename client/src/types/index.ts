// ---- shared types ----
export type Item = {
  name: string;
  icon: string;
  color: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  type: "Material" | "Tool" | "Weapon";
  stats?: Record<string, string | number>;
  desc: string;
};

export type RecipeArray = {
  id: string;
  name: string;
  inputs: Record<string, number>;
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

export type Recipes = Record<string, RecipeObj>;
export type Items = Record<string, Item>;