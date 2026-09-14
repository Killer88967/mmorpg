import { ITEM_DB } from "@/data/items";
import type { Context, ChestTypes } from "@/types";

export function initChest(ctx: Context.ChestContext) {
  const room = ctx.room;

  let openIndex: number | null = null;
  let chestItems: Record<string, number> = {};
  let qty: ChestTypes.ChestQuantity = 1;

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

  const youList = modal.querySelector<HTMLDivElement>(".chest-list.you");
  const storeList = modal.querySelector<HTMLDivElement>(".chest-list.store");
  const closeButton = modal.querySelector<HTMLButtonElement>(".chest-close");

  if (!youList || !storeList || !closeButton) {
    throw new Error("Failed to create chest UI.");
  }

  const isOpen = () => modal.classList.contains("is-open");

  closeButton.onclick = close;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      close();
    }
  });

  modal
    .querySelectorAll<HTMLButtonElement>(".chest-qty button")
    .forEach((button) => {
      button.onclick = () => {
        const value = button.dataset.q;

        if (value === "all") {
          qty = "all";
        } else if (value === "1" || value === "10") {
          qty = Number(value) as 1 | 10;
        }

        modal
          .querySelectorAll<HTMLButtonElement>(".chest-qty button")
          .forEach((other) => {
            other.classList.toggle("is-selected", other === button);
          });
      };
    });

  function row(
    item: string,
    n: number,
    dir: ChestTypes.ChestDirection,
  ): HTMLButtonElement {
    const def = ITEM_DB[item] || {
      name: item,
      icon: "📦",
    };

    const el = document.createElement("button");
    el.className = "chest-row";
    el.innerHTML =
      `<span>${def.icon}</span>` +
      `<span class="chest-name">${def.name}</span>` +
      `<span class="chest-n">${n}</span>`;

    el.onclick = () => {
      if (openIndex === null) {
        return;
      }

      const amt = qty === "all" ? n : Math.min(qty, n);

      if (amt < 1) {
        return;
      }

      room.send("chestMove", {
        index: openIndex,
        item,
        count: amt,
        dir,
      });
    };

    return el;
  }

  function render() {
    if (!youList || !storeList) {
      throw new Error("Failed to find UI.");
    }

    youList.innerHTML = "";

    const playerEntries = Object.entries(ctx.myInventory).filter(
      ([, n]) => n > 0,
    );

    if (!playerEntries.length) {
      youList.innerHTML = `<div class="chest-empty">empty</div>`;
    } else {
      playerEntries.forEach(([item, n]) => {
        youList.append(row(item, n, "deposit"));
      });
    }

    storeList.innerHTML = "";

    const chestEntries = Object.entries(chestItems).filter(([, n]) => n > 0);

    if (!chestEntries.length) {
      storeList.innerHTML = `<div class="chest-empty">empty</div>`;
    } else {
      chestEntries.forEach(([item, n]) => {
        storeList.append(row(item, n, "withdraw"));
      });
    }
  }

  function openChest(index: number) {
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

  room.onMessage(
    "chestData",
    ({ index, items }: ChestTypes.ChestDataMessage) => {
      if (index !== openIndex) {
        return;
      }

      chestItems = items ?? {};
      render();
    },
  );

  ctx.refreshChest = () => {
    if (isOpen()) {
      render();
    }
  };

  ctx.openChest = openChest;
}
