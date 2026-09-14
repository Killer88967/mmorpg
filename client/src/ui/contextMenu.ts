import { ITEM_DB } from "@/data/items";
import type { Context, ContextMenuTypes } from "@/types";

// slot right-click / long-press menu + its actions. Shared state via `ctx`.
export function initContextMenu(ctx: Context.ContextMenuContext) {
  const room = ctx.room;
  const invGrid = ctx.invGrid;

  if (!invGrid) {
    throw new Error("Context menu initialized before inventory UI.");
  }

  // ---- slot context menu (right-click / long-press) ----
  const ctxMenu = document.createElement("div");
  ctxMenu.className = "ctx-menu";
  document.body.appendChild(ctxMenu);
  ctx.longPressed = false;

  const SLOT_ACTIONS: ContextMenuTypes.SlotAction[] = [
    { id: "link", label: "🔗 Link in chat" },
    { id: "trade", label: "💰 Trade" },
    { id: "craft", label: "🔨 Craft" },
    { id: "discard", label: "🗑️ Discard", danger: true },
  ];

  function openCtxMenu(item: string, x: number, y: number) {
    ctxMenu.innerHTML = "";
    for (const a of SLOT_ACTIONS) {
      const b = document.createElement("button");
      b.className =
        "ctx-item" +
        (a.danger ? " is-danger" : "") +
        (a.disabled ? " is-disabled" : "");
      b.textContent = a.label;
      if (a.disabled) b.disabled = true;
      else
        b.onclick = () => {
          closeCtxMenu();
          doSlotAction(a.id, item);
        };
      ctxMenu.append(b);
    }
    ctxMenu.classList.add("is-open");
    const mr = ctxMenu.getBoundingClientRect();
    ctxMenu.style.left =
      Math.max(8, Math.min(x, window.innerWidth - mr.width - 8)) + "px";
    ctxMenu.style.top =
      Math.max(8, Math.min(y, window.innerHeight - mr.height - 8)) + "px";
  }
  function closeCtxMenu() {
    ctxMenu.classList.remove("is-open");
  }

  function doSlotAction(id: ContextMenuTypes.SlotActionId, item: string) {
    const def = ITEM_DB[item] || { name: item };
    const have = ctx.myInventory[item] ?? 0;
    if (id === "link") {
      ctx.closeInv?.();
      ctx.openChat?.();
      if (ctx.chatInput) {
        ctx.chatInput.value += `{${item}} `;
        ctx.chatInput.focus();
      }
    } else if (id === "trade") {
      ctx.closeInv?.();
      ctx.openTradeModal?.(item);
    } else if (id === "craft") {
      ctx.closeInv?.();
      ctx.openCrafting?.();
    } else if (id === "discard") {
      if (have > 0 && confirm(`Discard all ${have} ${def.name}?`))
        room.send("discard", { item, count: have });
    }
  }

  // right-click (desktop)
  invGrid.addEventListener("contextmenu", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const slot = target?.closest<HTMLElement>(".inv-slot");
    if (!slot) return;
    const item = slot.dataset.item;
    if (!item) return;
    e.preventDefault();
    openCtxMenu(item, e.clientX, e.clientY);
  });

  // long-press (touch / iPad)
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  invGrid.addEventListener(
    "touchstart",
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const slot = target?.closest<HTMLElement>(".inv-slot");
      if (!slot) return;
      const item = slot.dataset.item;
      if (!item) return;
      ctx.longPressed = false;
      const t = e.touches[0];
      pressTimer = setTimeout(() => {
        ctx.longPressed = true;
        openCtxMenu(item, t.clientX, t.clientY);
      }, 450);
    },
    { passive: true },
  );
  invGrid.addEventListener("touchend", () => clearTimeout(pressTimer));
  invGrid.addEventListener("touchmove", () => clearTimeout(pressTimer));

  // close on outside click (and swallow the click that follows a long-press)
  document.addEventListener("click", (e) => {
    if (ctx.longPressed) {
      ctx.longPressed = false;
      return;
    }
    const target = e.target instanceof Element ? e.target : null;
    if (!target?.closest(".ctx-menu")) closeCtxMenu();
  });

  // expose the bits other modules need
  ctx.ctxMenu = ctxMenu;
  ctx.openCtxMenu = openCtxMenu;
  ctx.closeCtxMenu = closeCtxMenu;
}
