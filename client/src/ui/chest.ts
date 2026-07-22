// @ts-nocheck
import { ITEM_DB } from "@/data/items";

export function initChest(ctx) {
  const room = ctx.room;
  let openIndex = null;
  let chestItems = {};
  let qty = 1; // 1 | 10 | "all"

  const modal = document.createElement("div");
  modal.className = "chest-modal";
  modal.innerHTML =
    `<div class="chest-box">` +
      `<div class="chest-head"><span class="chest-title">Chest</span>` +
      `<div class="chest-qty">` +
        `<button data-q="1" class="is-selected">1</button>` +
        `<button data-q="10">10</button>` +
        `<button data-q="all">All</button>` +
      `</div>` +
      `<button class="chest-close" aria-label="Close">✕</button></div>` +
      `<div class="chest-cols">` +
        `<div class="chest-side"><div class="chest-label">Your Items ▸</div><div class="chest-list you"></div></div>` +
        `<div class="chest-side"><div class="chest-label">◂ Chest</div><div class="chest-list store"></div></div>` +
      `</div>` +
    `</div>`;
  document.body.appendChild(modal);

  const youList = modal.querySelector(".chest-list.you");
  const storeList = modal.querySelector(".chest-list.store");
  const isOpen = () => modal.classList.contains("is-open");

  modal.querySelector(".chest-close").onclick = close;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  modal.querySelectorAll(".chest-qty button").forEach((b) => {
    b.onclick = () => {
      qty = b.dataset.q === "all" ? "all" : parseInt(b.dataset.q, 10);
      modal
        .querySelectorAll(".chest-qty button")
        .forEach((x) => x.classList.toggle("is-selected", x === b));
    };
  });

  function row(item, n, dir) {
    const def = ITEM_DB[item] || { name: item, icon: "📦" };
    const el = document.createElement("button");
    el.className = "chest-row";
    el.innerHTML = `<span>${def.icon}</span><span class="chest-name">${def.name}</span><span class="chest-n">${n}</span>`;
    el.onclick = () => {
      const amt = qty === "all" ? n : Math.min(qty, n);
      if (amt < 1) return;
      room.send("chestMove", { index: openIndex, item, count: amt, dir });
    };
    return el;
  }

  function render() {
    youList.innerHTML = "";
    const ye = Object.entries(ctx.myInventory || {}).filter(([, n]) => n > 0);
    if (!ye.length) youList.innerHTML = `<div class="chest-empty">empty</div>`;
    else ye.forEach(([item, n]) => youList.append(row(item, n, "deposit")));

    storeList.innerHTML = "";
    const se = Object.entries(chestItems).filter(([, n]) => n > 0);
    if (!se.length)
      storeList.innerHTML = `<div class="chest-empty">empty</div>`;
    else se.forEach(([item, n]) => storeList.append(row(item, n, "withdraw")));
  }

  function openChest(index) {
    openIndex = index;
    chestItems = {};
    modal.classList.add("is-open");
    render();
    room.send("openChest", { index });
  }
  function close() {
    modal.classList.remove("is-open");
    openIndex = null;
  }

  room.onMessage("chestData", ({ index, items }) => {
    if (index !== openIndex) return;
    chestItems = items || {};
    render();
  });

  ctx.refreshChest = () => {
    if (isOpen()) render();
  };
  ctx.openChest = openChest;
}