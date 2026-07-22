export const SOLID = new Set([1, 3, 4, 5]); // water, tree, rock, ore

// each harvestable tile: what it drops, the capability it needs (null = hands), respawn ms
export const RESOURCES: Record<
  number,
  { drop: string; requires: string | null; respawn: number }
> = {
  3: { drop: "wood", requires: "chop", respawn: 10000 },
  4: { drop: "stone", requires: "mine", respawn: 20000 },
  5: { drop: "ore", requires: "mine2", respawn: 30000 },
  6: { drop: "stick", requires: null, respawn: 15000 },
  7: { drop: "flint", requires: null, respawn: 20000 },
};

// tools are permanent unlocks; each grants capabilities
export const TOOL_CAPS: Record<string, string[]> = {
  flint_hatchet: ["chop"],
  flint_pickaxe: ["mine"],
  stone_hatchet: ["chop"],
  stone_pickaxe: ["mine", "mine2"],
  iron_hatchet: ["chop"],
  iron_pickaxe: ["mine", "mine2"],
};

export const REQ_LABEL: Record<string, string> = {
  chop: "a hatchet",
  mine: "a pickaxe",
  mine2: "a stone pickaxe",
};
