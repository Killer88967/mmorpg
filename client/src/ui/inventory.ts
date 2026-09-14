import { ITEM_DB } from "@/data/items";
import { formatAmount } from "@/util/format";
import type { Context } from "@/types";

// inventory side-panel + full-screen bag modal. Shared state via `ctx`.
export function initInventory(ctx: Context.InventoryContext) {
  const room = ctx.room;

  // ---- inventory panel (your own only) ----
  const invPanel = document.createElement("div");
  invPanel.className = "inv-panel";
  document.body.appendChild(invPanel);

  function renderInventory(inv: Record<string, number>) {
    const entries = Object.entries(inv).filter(([, n]) => n > 0);
    invPanel.innerHTML =
      `<div class="inv-title">Inventory</div>` +
      (entries.length
        ? entries
            .map(
              ([item, n]) =>
                `<div class="inv-item" title="${n.toLocaleString("es-US")}"><span class="inv-name">${ITEM_DB[item]?.name ?? item}</span><span class="inv-count">${formatAmount(n)}</span></div>`,
            )
            .join("")
        : `<div class="inv-empty">empty</div>`);
  }
  renderInventory({});
  room.onMessage("inventory", (inv: Record<string, number>) => {
    ctx.myInventory = inv;
    renderInventory(inv);
    if (ctx.invOpen) renderInvGrid();
    ctx.refreshCrafting?.();
    ctx.refreshBuild?.();
    ctx.refreshChest?.();
  });
  room.send("ready"); // request our initial inventory

  // ---- full inventory popup (key I/B or bag button) ----
  const bagButton = document.createElement("button");
  bagButton.className = "bag-button";
  bagButton.textContent = "🎒";
  bagButton.title = "Inventory (I)";
  document.body.appendChild(bagButton);

  const invModal = document.createElement("div");
  invModal.className = "inv-modal";
  invModal.innerHTML =
    `<div class="inv-modal-box">` +
    `<div class="inv-modal-head">` +
    `<span class="inv-modal-title">Inventory</span>` +
    `<button class="inv-modal-close" aria-label="Close">✕</button>` +
    `</div><div class="inv-grid"></div></div>`;
  document.body.appendChild(invModal);

  const invGrid = invModal.querySelector<HTMLDivElement>(".inv-grid");
  const closeButton =
    invModal.querySelector<HTMLButtonElement>(".inv-modal-close");

  if (!invGrid || !closeButton) {
    throw new Error("Failed to craete inventory UI.");
  }

  function renderInvGrid() {
    if (!invGrid) {
      throw new Error("Failed to find the UI components.");
    }
    const entries = Object.entries(ctx.myInventory).filter(([, n]) => n > 0);
    invGrid.innerHTML = "";
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "inv-grid-empty";
      empty.textContent = "Your bag is empty. Go chop some trees!";
      invGrid.append(empty);
      return;
    }
    for (const [item, n] of entries) {
      const def = ITEM_DB[item] || { name: item, icon: "📦", color: "#9fb0c3" };
      const slot = document.createElement("button");
      slot.className = "inv-slot";
      slot.dataset.item = item;
      slot.style.setProperty("--item-color", def.color);
      slot.title = `${def.name} — ${n.toLocaleString("en-US")}`;
      slot.innerHTML =
        `<span class="inv-slot-icon">${def.icon}</span>` +
        `<span class="inv-slot-count">${formatAmount(n)}</span>` +
        `<span class="inv-slot-name">${def.name}</span>`;
      invGrid.append(slot);
    }
  }

  function openInv() {
    ctx.invOpen = true;
    renderInvGrid();
    invModal.classList.add("is-open");
  }
  function closeInv() {
    ctx.invOpen = false;
    invModal.classList.remove("is-open");
    ctx.hideTooltip?.();
  }
  function toggleInv() {
    ctx.invOpen ? closeInv() : openInv();
  }

  bagButton.onclick = toggleInv;
  closeButton.onclick = closeInv;
  invModal.addEventListener("click", (e) => {
    if (e.target === invModal) closeInv(); // click the backdrop to close
  });

  // expose the bits other modules need
  ctx.invModal = invModal;
  ctx.invGrid = invGrid;
  ctx.renderInvGrid = renderInvGrid;
  ctx.openInv = openInv;
  ctx.closeInv = closeInv;
  ctx.toggleInv = toggleInv;
}
