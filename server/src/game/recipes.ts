export type Recipe = {
  id: string;
  name: string;
  inputs: Record<string, number>;
  output:
    | { kind: "item"; item: string; count: number }
    | { kind: "tool"; tool: string };
};

export const RECIPES: Recipe[] = [
  {
    id: "sticks",
    name: "Sticks",
    inputs: { wood: 1 },
    output: { kind: "item", item: "stick", count: 4 },
  },
  {
    id: "flint_hatchet",
    name: "Flint Hatchet",
    inputs: { stick: 2, flint: 2 },
    output: { kind: "tool", tool: "flint_hatchet" },
  },
  {
    id: "flint_pickaxe",
    name: "Flint Pickaxe",
    inputs: { stick: 2, flint: 3 },
    output: { kind: "tool", tool: "flint_pickaxe" },
  },
  {
    id: "stone_hatchet",
    name: "Stone Hatchet",
    inputs: { stick: 3, stone: 3 },
    output: { kind: "tool", tool: "stone_hatchet" },
  },
  {
    id: "stone_pickaxe",
    name: "Stone Pickaxe",
    inputs: { stick: 3, stone: 3 },
    output: { kind: "tool", tool: "stone_pickaxe" },
  },
];

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
);