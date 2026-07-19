// @ts-nocheck

// keyboard: Enter opens chat, E harvests, WASD moves, I/B toggles inventory.
// Shared state via `ctx`.
export function initInput(ctx) {
  const room = ctx.room;

  // ---- input state ----
  const keymap = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };

  // ---- keyboard: Enter opens chat, E harvests, WASD moves (only when chat closed) ----
  addEventListener("keydown", (e) => {
    if (ctx.chatOpen) return;
    if (e.code === "Enter") {
      e.preventDefault();
      ctx.openChat();
      return;
    }
    if (e.code === "KeyE") {
      room.send("harvest");
      return;
    }
    if (e.code === "Escape" && ctx.ctxMenu.classList.contains("is-open")) {
      ctx.closeCtxMenu();
      return;
    }
    if (e.code === "Escape" && ctx.invOpen) {
      ctx.closeInv();
      return;
    }
    if (e.code === "KeyI" || e.code === "KeyB") {
      ctx.toggleInv();
      return;
    }
    const k = keymap[e.code];
    if (k && !ctx.held[k]) {
      ctx.held[k] = true;
      room.send("input", ctx.held);
    }
  });
  addEventListener("keyup", (e) => {
    if (ctx.chatOpen) return;
    const k = keymap[e.code];
    if (k && ctx.held[k]) {
      ctx.held[k] = false;
      room.send("input", ctx.held);
    }
  });
}
