import { ITEM_DB } from "@/data/items";
import { RECIPES } from "@/data/recipes";
import { formatAmount } from "@/util/format";
import type { Context, Recipe } from "@/types";

// crafting modal (key C or hammer button). Shared state via `ctx`.
export function initCrafting(ctx: Context.CraftingContext) {
  const room = ctx.room;
  ctx.myTools ??= [];

  const craftButton = document.createElement("button");
  craftButton.className = "craft-button";
  craftButton.textContent = "🔨";
  craftButton.title = "Crafting (C)";
  document.body.appendChild(craftButton);

  const modal = document.createElement("div");
  modal.className = "craft-modal";
  modal.innerHTML =
    `<div class="craft-box">` +
    `<div class="craft-head"><span class="craft-title">Crafting</span>` +
    `<button class="craft-close" aria-label="Close">✕</button></div>` +
    `<div class="craft-list"></div></div>`;
  document.body.appendChild(modal);

  const list = modal.querySelector<HTMLDivElement>(".craft-list");
  const closeButton = modal.querySelector<HTMLButtonElement>(".craft-close");
  if (!list || !closeButton) throw new Error("Failed to create crafting UI.");
  const l = list;
  const cB = closeButton;
  const isOpen = () => modal.classList.contains("is-open");

  function canAfford(recipe: Recipe): boolean {
    for (const [item, count] of Object.entries(recipe.inputs))
      if ((ctx.myInventory[item] ?? 0) < count) return false;
    return true;
  }

  function owned(recipe: Recipe): boolean {
    return (
      recipe.output.kind === "tool" && ctx.myTools.includes(recipe.output.tool)
    );
  }

  function outDef(recipe: Recipe) {
    const key =
      recipe.output.kind === "tool" ? recipe.output.tool : recipe.output.item;
    return ITEM_DB[key] || { name: recipe.name, icon: "📦", color: "#9fb0c3" };
  }

  function nearStation(kind: string): boolean {
    const me = room.state.players.get(room.sessionId);
    if (!me) return false;
    const T = room.state.tile || 64,
      C = room.state.cols || 32;
    const pc = Math.floor(me.x / T),
      pr = Math.floor(me.y / T);
    let found = false;
    room.state.placed.forEach((p) => {
      if (found || p.kind !== kind) return;
      const c = p.index % C,
        r = Math.floor(p.index / C);
      if (Math.abs(c - pc) <= 2 && Math.abs(r - pr) <= 2) found = true;
    });
    return found;
  }

  function render() {
    l.innerHTML = "";
    for (const recipe of RECIPES) {
      const def = outDef(recipe);
      const row = document.createElement("div");
      row.className = "craft-row";

      const head = document.createElement("div");
      head.className = "craft-row-head";
      head.innerHTML =
        `<span class="craft-out-icon">${def.icon}</span>` +
        `<span class="craft-out-name">${def.name}` +
        (recipe.output.kind === "item" && recipe.output.count > 1
          ? ` ×${recipe.output.count}`
          : "") +
        (recipe.station ? ` <span class="craft-station">🔥</span>` : "") +
        `</span>`;
      row.append(head);

      const costs = document.createElement("div");
      costs.className = "craft-costs";
      for (const [item, count] of Object.entries(recipe.inputs)) {
        const idef = ITEM_DB[item] || { name: item, icon: "📦" };
        const have = ctx.myInventory[item] ?? 0;
        const c = document.createElement("span");
        c.className = "craft-cost" + (have < count ? " is-missing" : "");
        c.innerHTML = `${idef.icon} ${idef.name} <b>${have}/${formatAmount(count)}</b>`;
        costs.append(c);
      }
      row.append(costs);

      const station =
        typeof recipe.station === "string" ? recipe.station : undefined;
      const needsStation = station !== undefined && !nearStation(station);
      const btn = document.createElement("button");
      btn.className = "craft-do";
      if (owned(recipe)) {
        btn.textContent = "Owned";
        btn.disabled = true;
      } else if (needsStation) {
        btn.textContent = "Needs 🔥 nearby";
        btn.disabled = true;
        btn.title = `Stand near a ${station}`;
      } else if (!canAfford(recipe)) {
        btn.textContent = "Craft";
        btn.disabled = true;
      } else {
        btn.textContent = "Craft";
        btn.onclick = () => room.send("craft", { id: recipe.id });
      }
      row.append(btn);
      l.append(row);
    }
  }

  let stationTimer: ReturnType<typeof setInterval> | undefined;
  function openCrafting() {
    render();
    modal.classList.add("is-open");
    clearStationTimer();
    stationTimer = setInterval(render, 500);
  }

  function closeCrafting() {
    modal.classList.remove("is-open");
    clearStationTimer();
  }

  function clearStationTimer() {
    if (stationTimer !== undefined) {
      clearInterval(stationTimer);
      stationTimer = undefined;
    }
  }

  craftButton.onclick = () => (isOpen() ? closeCrafting() : openCrafting());
  cB.onclick = closeCrafting;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeCrafting();
  });

  room.onMessage("toolsUpdate", (tools: string[]) => {
    ctx.myTools = tools;
    if (isOpen()) render();
  });

  ctx.openCrafting = openCrafting;
  ctx.closeCrafting = closeCrafting;
  ctx.craftModalIsOpen = isOpen;
  ctx.refreshCrafting = () => {
    if (isOpen()) render();
  }; // called on inventory changes
}
