// @ts-nocheck
import { ITEM_DB } from "@/data/items";
import { RECIPES } from "@/data/recipes";
import { formatAmount } from "@/util/format";

// crafting modal (key C or hammer button). Shared state via `ctx`.
export function initCrafting(ctx) {
  const room = ctx.room;
  ctx.myTools = ctx.myTools ?? [];

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

  const list = modal.querySelector(".craft-list");
  const isOpen = () => modal.classList.contains("is-open");

  function canAfford(recipe) {
    for (const [item, count] of Object.entries(recipe.inputs))
      if ((ctx.myInventory[item] ?? 0) < count) return false;
    return true;
  }

  function owned(recipe) {
    return (
      recipe.output.kind === "tool" && ctx.myTools.includes(recipe.output.tool)
    );
  }

  function outDef(recipe) {
    const key =
      recipe.output.kind === "tool" ? recipe.output.tool : recipe.output.item;
    return ITEM_DB[key] || { name: recipe.name, icon: "📦", color: "#9fb0c3" };
  }

  function render() {
    list.innerHTML = "";
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

      const btn = document.createElement("button");
      btn.className = "craft-do";
      if (owned(recipe)) {
        btn.textContent = "Owned";
        btn.disabled = true;
      } else if (!canAfford(recipe)) {
        btn.textContent = "Craft";
        btn.disabled = true;
      } else {
        btn.textContent = "Craft";
        btn.onclick = () => room.send("craft", { id: recipe.id });
      }
      row.append(btn);
      list.append(row);
    }
  }

  function openCrafting() {
    render();
    modal.classList.add("is-open");
  }

  function closeCrafting() {
    modal.classList.remove("is-open");
  }

  craftButton.onclick = () => (isOpen() ? closeCrafting() : openCrafting());
  modal.querySelector(".craft-close").onclick = closeCrafting;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeCrafting();
  });

  room.onMessage("toolsUpdate", (tools) => {
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
