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

  // ---- item database: what each item IS (drives chips + tooltips) ----
  const ITEM_DB = {
    wood: {
      name: "Wood",
      icon: "🪵",
      color: "#b08968",
      rarity: "common",
      type: "Material",
      desc: "A sturdy log. Useful for building and crafting.",
    },
    stone: {
      name: "Stone",
      icon: "🪨",
      color: "#9aa3ad",
      rarity: "common",
      type: "Material",
      desc: "Rough rock — the backbone of any structure.",
    },
    ore: {
      name: "Iron Ore",
      icon: "⛏️",
      color: "#e0a458",
      rarity: "uncommon",
      type: "Material",
      desc: "Raw iron, ready to be smelted.",
    },
    sword: {
      name: "Iron Sword",
      icon: "🗡️",
      color: "#cfd8e3",
      rarity: "uncommon",
      type: "Weapon",
      stats: { Damage: 12, "Attack Speed": "1.4/s", Reach: "1 tile" },
      desc: "A dependable blade. Nothing fancy, but it gets the job done.",
    },
  };
  const ITEM_RE = /\{([a-zA-Z][a-zA-Z0-9_]*)(?:::(\d+))?\}/g;

  function makeItemChip(item, count) {
    const def = ITEM_DB[item] || { name: item, color: "#9fb0c3", icon: "📦" };
    const chip = document.createElement("span");
    chip.className = "chat-item";
    chip.dataset.item = item;
    chip.style.setProperty("--item-color", def.color);
    const icon = document.createElement("span");
    icon.textContent = def.icon;
    const label = document.createElement("span");
    label.textContent = def.name;
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

  // ---- item tooltip (tap to pin, hover to peek) ----
  const tooltip = document.createElement("div");
  tooltip.className = "item-tooltip";
  document.body.appendChild(tooltip);
  let pinnedChip = null;

  function fillTooltip(item) {
    const def = ITEM_DB[item] || {
      name: item,
      icon: "📦",
      rarity: "common",
      type: "Unknown",
      desc: "You've never seen one of these.",
    };
    const rarity = def.rarity || "common";
    let html =
      `<div class="tt-head"><span class="tt-icon">${def.icon}</span>` +
      `<span class="tt-name tt-${rarity}">${def.name}</span></div>` +
      `<div class="tt-type">${def.type}${rarity !== "common" ? " · " + rarity : ""}</div>`;
    if (def.stats)
      html +=
        `<div class="tt-stats">` +
        Object.entries(def.stats)
          .map(
            ([k, v]) =>
              `<div class="tt-stat"><span>${k}</span><span>${v}</span></div>`,
          )
          .join("") +
        `</div>`;
    if (def.desc) html += `<div class="tt-desc">${def.desc}</div>`;
    tooltip.innerHTML = html;
  }

  function showTooltip(chip) {
    fillTooltip(chip.dataset.item);
    tooltip.classList.add("is-visible");
    const r = chip.getBoundingClientRect();
    const tr = tooltip.getBoundingClientRect();
    let top = r.top - tr.height - 8;
    if (top < 8) top = r.bottom + 8; // flip below if no room above
    const left = Math.max(
      8,
      Math.min(r.left, window.innerWidth - tr.width - 8),
    );
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip() {
    tooltip.classList.remove("is-visible");
    pinnedChip = null;
  }

  chatLog.addEventListener("mouseover", (e) => {
    const chip = e.target.closest(".chat-item");
    if (!chip || pinnedChip) return;
    showLog();
    showTooltip(chip);
  });
  chatLog.addEventListener("mouseout", (e) => {
    if (pinnedChip) return;
    if (e.target.closest(".chat-item")) hideTooltip();
  });
  chatLog.addEventListener("click", (e) => {
    const chip = e.target.closest(".chat-item");
    if (!chip) return;
    if (pinnedChip === chip) return hideTooltip();
    pinnedChip = chip;
    showLog();
    showTooltip(chip);
  });
  document.addEventListener("click", (e) => {
    if (pinnedChip && !e.target.closest(".chat-item")) hideTooltip();
  });

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
