import { Client, Callbacks } from "@colyseus/sdk";
import { Application, Graphics } from "pixi.js";
import type { WorldState } from "../../server/src/rooms/schema/WorldState";

// const ENDPOINT = "https://solid-space-memory-xg5w7vqg7v72px4q-2567.app.github.dev";
const ENDPOINT = location.hostname.endsWith(".app.github.dev")
  ? `${location.protocol}//${location.hostname.replace("-5173.", "-2567.")}`
  : "http://localhost:2567";

async function main() {
  const app = new Application();
  await app.init({ width: 800, height: 600, background: "#101014" });
  document.body.appendChild(app.canvas);

  const sprites = new Map<string, Graphics>();

  const client = new Client(ENDPOINT);
  const room = await client.joinOrCreate<WorldState>("world");
  const $ = Callbacks.get(room);

  $.onAdd("players", (player, sessionId) => {
    const g = new Graphics().rect(-12, -12, 24, 24).fill(player.color);
    g.x = player.x;
    g.y = player.y;
    app.stage.addChild(g);
    sprites.set(sessionId, g);
    $.listen(player, "x", (v: number) => {
      g.x = v;
    });
    $.listen(player, "y", (v: number) => {
      g.y = v;
    });
  });

  $.onRemove("players", (_player: any, sessionId: string) => {
    sprites.get(sessionId)?.destroy();
    sprites.delete(sessionId);
  });

  // input → server
  const held = { up: false, down: false, left: false, right: false };
  const keymap: Record<string, keyof typeof held> = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };
  addEventListener("keydown", (e) => {
    const k = keymap[e.code];
    if (k && !held[k]) {
      held[k] = true;
      room.send("input", held);
    }
  });
  addEventListener("keyup", (e) => {
    const k = keymap[e.code];
    if (k && held[k]) {
      held[k] = false;
      room.send("input", held);
    }
  });
}

main().catch((err) => {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f66;font:14px monospace;padding:12px">${err?.message ?? err}</pre>`,
  );
  console.error(err);
});