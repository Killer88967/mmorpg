// @ts-nocheck
import "./style.css";
import { Callbacks } from "@colyseus/sdk";
import { Application, Graphics, Container, Text } from "pixi.js";
import { createRoom } from "@/net/room";
import { createMap } from "@/world/map";
import { startCamera } from "@/world/camera";
import { initChat } from "@/ui/chat";
import { initInventory } from "@/ui/inventory";
import { initTrade } from "@/ui/trade";
import { initContextMenu } from "@/ui/contextMenu";
import { initTooltip } from "@/ui/tooltip";
import { initInput } from "@/input";
import { initCrafting } from "@/ui/crafting";

async function main() {
  const app = new Application();
  await app.init({ resizeTo: window, background: "#0d0f14" });
  document.body.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);

  const sprites = new Map();

  const name = (prompt("Pick a name") || "Anon").slice(0, 16);
  const { room } = await createRoom(name);
  const $ = Callbacks.get(room);

  // shared UI context — mutable state + cross-module handles live here
  const ctx = {
    room,
    myName: name,
    myInventory: {},
    held: { up: false, down: false, left: false, right: false },
    chatOpen: false,
    invOpen: false,
  };

  // ---- world map (tiles + live tile updates) ----
  const map = createMap(world);
  room.onStateChange(() => map.onStateChange(room.state));
  room.onMessage("tileUpdate", map.onTileUpdate);

  // ---- UI (order matters: later modules reference earlier ones' DOM) ----
  initChat(ctx);
  initInventory(ctx);
  initCrafting(ctx)
  initTrade(ctx);
  initContextMenu(ctx);
  initTooltip(ctx);
  initInput(ctx);

  // ---- players ----
  $.onAdd("players", (player, sessionId) => {
    const g = new Graphics().rect(-12, -12, 24, 24).fill(player.color);
    g.x = player.x;
    g.y = player.y;
    g.tx = player.x; // interpolation targets
    g.ty = player.y;

    const label = new Text({
      text: player.name,
      style: { fill: 0xffffff, fontSize: 12, fontFamily: "monospace" },
    });
    label.anchor.set(0.5);
    label.y = -22;
    g.addChild(label);

    world.addChild(g);
    sprites.set(sessionId, g);

    $.listen(player, "x", (v) => (g.tx = v));
    $.listen(player, "y", (v) => (g.ty = v));
    $.listen(player, "name", (v) => (label.text = v));
  });

  $.onRemove("players", (_player, sessionId) => {
    sprites.get(sessionId)?.destroy();
    sprites.delete(sessionId);
  });

  // ---- camera follow + interpolation ----
  startCamera({ app, world, room, sprites });
}

main().catch((err) => {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f66;font:14px monospace;padding:12px">${err?.message ?? err}</pre>`,
  );
  console.error(err);
});
