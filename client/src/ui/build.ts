// @ts-nocheck
import { Graphics } from "pixi.js";
import { PLACE_INFO } from "@/data/placeables";

export function initBuild(ctx) {
  const { app, world, room } = ctx;
  let selected = null;
  let breakMode = false;
  let hover = null;

  const bar = document.createElement("div");
  bar.className = "build-bar";
  document.body.appendChild(bar);

  function renderBar() {
    bar.innerHTML = "";
    for (const kind of Object.keys(PLACE_INFO)) {
      const info = PLACE_INFO[kind];
      const have = ctx.myInventory[info.item] ?? 0;
      const btn = document.createElement("button");
      btn.className =
        "build-slot" +
        (selected === kind ? " is-selected" : "") +
        (have <= 0 ? " is-empty" : "");
      btn.innerHTML = `<span>${info.icon}</span><span class="build-count">${have}</span>`;
      btn.title = info.name;
      btn.onclick = () => {
        breakMode = false;
        selected = selected === kind ? null : have > 0 ? kind : null;
        renderBar();
        drawGhost();
      };
      bar.append(btn);
    }
    const brk = document.createElement("button");
    brk.className =
      "build-slot build-break" + (breakMode ? " is-selected" : "");
    brk.innerHTML = `<span>⛏️</span>`;
    brk.title = "Break mode";
    brk.onclick = () => {
      breakMode = !breakMode;
      selected = null;
      renderBar();
      drawGhost();
    };
    bar.append(brk);
  }
  ctx.refreshBuild = renderBar;
  renderBar();

  const ghost = new Graphics();
  ghost.visible = false;
  world.addChild(ghost);

  const T = () => room.state.tile || 64;
  const C = () => room.state.cols || 32;

  function tileFromEvent(e) {
    const rect = app.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left,
      sy = e.clientY - rect.top;
    return {
      c: Math.floor((sx - world.x) / T()),
      r: Math.floor((sy - world.y) / T()),
    };
  }
  function playerTile() {
    const p = room.state.players.get(room.sessionId);
    return p ? { c: Math.floor(p.x / T()), r: Math.floor(p.y / T()) } : null;
  }
  function inRange(t) {
    const pt = playerTile();
    return pt && Math.abs(t.c - pt.c) <= 3 && Math.abs(t.r - pt.r) <= 3;
  }
  function drawGhost() {
    if (!selected || !hover) {
      ghost.visible = false;
      return;
    }
    ghost.visible = true;
    ghost
      .clear()
      .rect(hover.c * T(), hover.r * T(), T(), T())
      .fill({ color: inRange(hover) ? 0x7fd1ff : 0xff5353, alpha: 0.35 });
  }

  app.canvas.addEventListener("pointermove", (e) => {
    if (!selected) return;
    hover = tileFromEvent(e);
    drawGhost();
  });
  app.canvas.addEventListener("pointerdown", (e) => {
    const t = tileFromEvent(e);
    const index = t.r * C() + t.c;
    if (selected) {
      room.send("place", { kind: selected, index });
      return;
    }
    const p = room.state.placed?.get(String(index));
    if (!p || p.owner !== ctx.myName) return;
    if (breakMode) {
      room.send("break", { index });
    } else if (p.kind === "chest") {
      ctx.openChest?.(index);
    }
  });
}