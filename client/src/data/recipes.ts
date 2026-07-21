import type { RecipeArray } from "@/types";

// @ts-nocheck
export const RECIPES: RecipeArray = [
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
  {
    id: "furnace",
    name: "Furnace",
    inputs: { stone: 8 },
    output: { kind: "tool", tool: "furnace" },
  },
  {
    id: "iron_bar",
    name: "Iron Bar",
    inputs: { ore: 1 },
    station: "furnace",
    output: { kind: "item", item: "iron_bar", count: 1 },
  },
  {
    id: "iron_hatchet",
    name: "Iron Hatchet",
    inputs: { stick: 2, iron_bar: 3 },
    station: "furnace",
    output: { kind: "tool", tool: "iron_hatchet" },
  },
  {
    id: "iron_pickaxe",
    name: "Iron Pickaxe",
    inputs: { stick: 2, iron_bar: 3 },
    station: "furnace",
    output: { kind: "tool", tool: "iron_pickaxe" },
  },
  {
    id: "iron_sword",
    name: "Iron Sword",
    inputs: { stick: 1, iron_bar: 2 },
    station: "furnace",
    output: { kind: "item", item: "iron_sword", count: 1 },
  },
];