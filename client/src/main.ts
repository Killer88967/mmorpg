//@ts-nocheck
import "./style.css";
import { Client, Callbacks } from "@colyseus/sdk";
import { Application, Graphics, Container, Text } from "pixi.js";
import type { WorldState } from "../../server/src/rooms/schema/WorldState";

const ENDPOINT = location.hostname.endsWith(".app.github.dev")
  ? `${location.protocol}//${location.hostname.replace("-5173.", "-2567.")}`
  : "http://localhost:2567";

async function main() {
  const app = new Application();
  await app.init({ resizeTo: window, background: "#0d0f14" });
  document.body.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);

  const COLORS = { 0: 0x2e7d32, 1: 0x1565c0, 2: 0xb08968, 3: 0x1b3a1b };
  let localTiles = [];
  let mapMeta = { cols: 0, rows: 0, tile: 0 };
  let groundGfx = null;

  function buildMap() {
    if (groundGfx) groundGfx.destroy();
    const g = new Graphics();
    const t = mapMeta.tile;
    for (let r = 0; r < mapMeta.rows; r++)
      for (let c = 0; c < mapMeta.cols; c++)
        g.rect(c * t, r * t, t, t).fill(
          COLORS[localTiles[r * mapMeta.cols + c]] ?? 0x000000,
        );
    world.addChildAt(g, 0);
    groundGfx = g;
  }

  const sprites = new Map();

  const name = (prompt("Pick a name") || "Anon").slice(0, 16);
  const client = new Client(ENDPOINT);
  const room = await client.joinOrCreate<WorldState>("world", { name });
  const $ = Callbacks.get(room);

  let mapBuilt = false;
  room.onStateChange(() => {
    if (mapBuilt || room.state.tiles.length === 0) return;
    mapBuilt = true;
    mapMeta = {
      cols: room.state.cols,
      rows: room.state.rows,
      tile: room.state.tile,
    };
    localTiles = Array.from(room.state.tiles);
    buildMap();
  });

  // live tile changes (harvested / respawned trees)
  room.onMessage("tileUpdate", ({ index, type }) => {
    localTiles[index] = type;
    buildMap();
  });

  // ---- inventory panel (your own only) ----
  let myInventory = {};

  const invPanel = document.createElement("div");
  invPanel.className = "inv-panel";
  document.body.appendChild(invPanel);

  function renderInventory(inv) {
    const entries = Object.entries(inv).filter(([, n]) => n > 0);
    invPanel.innerHTML =
      `<div class="inv-title">Inventory</div>` +
      (entries.length
        ? entries
            .map(
              ([item, n]) =>
                `<div class="inv-item"><span class="inv-name">${item}</span><span class="inv-count">${n}</span></div>`,
            )
            .join("")
        : `<div class="inv-empty">empty</div>`);
  }
  renderInventory({});
  room.onMessage("inventory", (inv) => {
    myInventory = inv;
    renderInventory(inv);
  });
  room.send("ready"); // request our initial inventory

  // ---- item links in chat ({wood} or {wood::10}) ----
  const ITEM_STYLE = {
    wood: { color: "#b08968", icon: "🪵" },
    stone: { color: "#9aa3ad", icon: "🪨" },
    ore: { color: "#e0a458", icon: "⛏" },
  };
  const ITEM_RE = /\{([a-zA-Z][a-zA-Z0-9_]*)(?:::(\d+))?\}/g;

  function makeItemChip(item, count) {
    const style = ITEM_STYLE[item] || { color: "#9fb0c3", icon: "📦" };
    const chip = document.createElement("span");
    chip.className = "chat-item";
    chip.style.setProperty("--item-color", style.color);
    const icon = document.createElement("span");
    icon.textContent = style.icon;
    const label = document.createElement("span");
    label.textContent = item;
    chip.append(icon, label);
    if (count != null) {
      const amt = document.createElement("span");
      amt.className = "chat-item-amt";
      amt.textContent = "×" + count;
      chip.append(amt);
    }
    return chip;
  }

  function appendText(line, text) {
    let last = 0,
      m;
    ITEM_RE.lastIndex = 0;
    while ((m = ITEM_RE.exec(text))) {
      if (m.index > last)
        line.appendChild(document.createTextNode(text.slice(last, m.index)));
      line.appendChild(
        makeItemChip(
          m[1].toLowerCase(),
          m[2] !== undefined ? parseInt(m[2], 10) : null,
        ),
      );
      last = m.index + m[0].length;
    }
    if (last < text.length)
      line.appendChild(document.createTextNode(text.slice(last)));
  }

  function expandItemTokens(text) {
    return text.replace(
      /\{([a-zA-Z][a-zA-Z0-9_]*)(?:::(\d+))?\}/g,
      (full, item, count) =>
        count !== undefined
          ? full
          : `{${item}::${myInventory[item.toLowerCase()] ?? 0}}`,
    );
  }

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

  // render loop: smooth movement (interpolation) + camera follow
  app.ticker.add(() => {
    sprites.forEach((g) => {
      g.x += (g.tx - g.x) * 0.2;
      g.y += (g.ty - g.y) * 0.2;
    });
    const me = sprites.get(room.sessionId);
    if (!me) return;
    world.x = app.screen.width / 2 - me.x;
    world.y = app.screen.height / 2 - me.y;
  });

  // ---- input state ----
  const held = { up: false, down: false, left: false, right: false };
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

  // ---- chat: hidden until toggled, fades when idle ----
  const chatLog = document.createElement("div");
  chatLog.className = "chat-log";
  document.body.appendChild(chatLog);

  const chatInput = document.createElement("input");
  chatInput.className = "chat-input";
  chatInput.maxLength = 200;
  chatInput.placeholder = "Say something…";
  document.body.appendChild(chatInput);

  let chatOpen = false;
  let fadeTimer;

  function showLog() {
    clearTimeout(fadeTimer);
    chatLog.classList.add("is-visible");
  }
  function scheduleFade() {
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      if (!chatOpen) chatLog.classList.remove("is-visible");
    }, 5000);
  }

  function openChat() {
    chatOpen = true;
    for (const k in held) held[k] = false; // stop walking while typing
    room.send("input", held);
    chatInput.classList.add("is-open");
    chatInput.focus();
    showLog();
  }
  function closeChat() {
    chatOpen = false;
    chatInput.value = "";
    chatInput.blur();
    chatInput.classList.remove("is-open");
    scheduleFade();
  }

  function appendLine(name, text) {
    const line = document.createElement("div");
    line.className = "chat-line";
    const who = document.createElement("span");
    who.className = "chat-name";
    who.textContent = name + ": ";
    line.appendChild(who);
    appendText(line, text);
    chatLog.appendChild(line);
    while (chatLog.childNodes.length > 12)
      chatLog.removeChild(chatLog.firstChild);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  chatInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      const text = chatInput.value.trim();
      if (text) room.send("chat", expandItemTokens(text));
      closeChat();
    } else if (e.key === "Escape") {
      closeChat();
    }
  });

  room.onMessage("chat", (msg) => {
    appendLine(msg.name, msg.text);
    showLog();
    if (!chatOpen) scheduleFade();
  });

  // ---- keyboard: Enter opens chat, E harvests, WASD moves (only when chat closed) ----
  addEventListener("keydown", (e) => {
    if (chatOpen) return;
    if (e.code === "Enter") {
      e.preventDefault();
      openChat();
      return;
    }
    if (e.code === "KeyE") {
      room.send("harvest");
      return;
    }
    const k = keymap[e.code];
    if (k && !held[k]) {
      held[k] = true;
      room.send("input", held);
    }
  });
  addEventListener("keyup", (e) => {
    if (chatOpen) return;
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