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

export type Items = Record<string, Item>;
