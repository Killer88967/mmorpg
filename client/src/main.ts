// @ts-nocheck
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

  const COLORS = {
    0: 0x2e7d32,
    1: 0x1565c0,
    2: 0xb08968,
    3: 0x1b3a1b,
    4: 0x6d7079,
    5: 0x9c7a3c,
    6: 0x4a9a4a,
    7: 0x55564a,
  };
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
  const myName = name;
  const offerLines = new Map();
  let openOffers = 0;

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
    if (invOpen) renderInvGrid();
  });
  room.send("ready"); // request our initial inventory

  // ---- Types ----
  type Item = {
    name: string;
    icon: string;
    color: string;
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    type: "Material" | "Tool" | "Weapon";
    stats?: Record<string, string | number>;
    desc: string;
  };

  type Items = Record<string, Item>;

  // ---- item database: what each item IS (drives chips + tooltips) ----
  const ITEM_DB: Items = {
    stick: {
      name: "Stick",
      icon: "🌿",
      color: "#a1794b",
      rarity: "common",
      type: "Material",
      desc: "A slender branch. Basic crafting fodder.",
    },
    flint: {
      name: "Flint",
      icon: "🔻",
      color: "#5b5b52",
      rarity: "common",
      type: "Material",
      desc: "A sharp shard of stone. The start of every tool.",
    },
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

  function handleChatSend(text) {
    if (text.toLowerCase().startsWith("/offer")) {
      const parsed = parseOfferCommand(text);
      if (parsed) room.send("offer", parsed);
      else appendSystem("Usage: /offer <item> <count> for <item> <count>");
      return;
    }
    room.send("chat", expandItemTokens(text));
  }

  function parseOfferCommand(text) {
    const m = text.match(
      /^\/offer\s+([a-z][a-z0-9_]*)\s+(\d+)\s+(?:for\s+)?([a-z][a-z0-9_]*)\s+(\d+)\s*$/i,
    );
    if (!m) return null;
    return {
      give: { item: m[1].toLowerCase(), count: parseInt(m[2], 10) },
      want: { item: m[3].toLowerCase(), count: parseInt(m[4], 10) },
    };
  }

  function appendSystem(text) {
    const line = document.createElement("div");
    line.className = "chat-line chat-system";
    line.textContent = text;
    chatLog.appendChild(line);
    while (chatLog.childNodes.length > 12)
      chatLog.removeChild(chatLog.firstChild);
    chatLog.scrollTop = chatLog.scrollHeight;
    showLog();
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

  const invGrid = invModal.querySelector(".inv-grid");
  let invOpen = false;

  function renderInvGrid() {
    const entries = Object.entries(myInventory).filter(([, n]) => n > 0);
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
      slot.innerHTML =
        `<span class="inv-slot-icon">${def.icon}</span>` +
        `<span class="inv-slot-count">${n}</span>` +
        `<span class="inv-slot-name">${def.name}</span>`;
      invGrid.append(slot);
    }
  }

  function openInv() {
    invOpen = true;
    renderInvGrid();
    invModal.classList.add("is-open");
  }
  function closeInv() {
    invOpen = false;
    invModal.classList.remove("is-open");
    hideTooltip();
  }
  function toggleInv() {
    invOpen ? closeInv() : openInv();
  }

  bagButton.onclick = toggleInv;
  invModal.querySelector(".inv-modal-close").onclick = closeInv;
  invModal.addEventListener("click", (e) => {
    if (e.target === invModal) closeInv(); // click the backdrop to close
  });

  // ---- slot context menu (right-click / long-press) ----
  const ctxMenu = document.createElement("div");
  ctxMenu.className = "ctx-menu";
  document.body.appendChild(ctxMenu);
  let longPressed = false;

  const SLOT_ACTIONS = [
    { id: "link", label: "🔗 Link in chat" },
    { id: "trade", label: "💰 Trade" },
    { id: "discard", label: "🗑️ Discard", danger: true },
    { id: "craft", label: "🔨 Craft", disabled: true },
  ];

  function openCtxMenu(item, x, y) {
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

  function doSlotAction(id, item) {
    const def = ITEM_DB[item] || { name: item };
    const have = myInventory[item] ?? 0;
    if (id === "link") {
      closeInv();
      openChat();
      chatInput.value += `{${item}} `;
      chatInput.focus();
    } else if (id === "trade") {
      closeInv();
      openTradeModal(item);
    } else if (id === "discard") {
      if (have > 0 && confirm(`Discard all ${have} ${def.name}?`))
        room.send("discard", { item, count: have });
    }
  }

  // ---- trade builder modal ----
  const tradeModal = document.createElement("div");
  tradeModal.className = "trade-modal";
  tradeModal.innerHTML =
    `<div class="trade-box">` +
      `<div class="trade-head"><span class="trade-title">Create Offer</span>` +
      `<button class="trade-close" aria-label="Close">✕</button></div>` +
      `<div class="trade-body">` +
        `<label class="trade-label">You give</label>` +
        `<div class="trade-row">` +
          `<select class="trade-give-item"></select>` +
          `<input class="trade-give-count" type="number" min="1" value="1">` +
        `</div>` +
        `<label class="trade-toggle"><input type="checkbox" class="trade-want-on"> Ask for something in return</label>` +
        `<div class="trade-want-fields">` +
          `<label class="trade-label">You want</label>` +
          `<div class="trade-row">` +
            `<select class="trade-want-item"></select>` +
            `<input class="trade-want-count" type="number" min="1" value="1">` +
          `</div>` +
        `</div>` +
        `<div class="trade-error"></div>` +
        `<button class="trade-post">Post Gift</button>` +
      `</div>` +
    `</div>`;
  document.body.appendChild(tradeModal);

  const tgItem = tradeModal.querySelector(".trade-give-item");
  const tgCount = tradeModal.querySelector(".trade-give-count");
  const twOn = tradeModal.querySelector(".trade-want-on");
  const twFields = tradeModal.querySelector(".trade-want-fields");
  const twItem = tradeModal.querySelector(".trade-want-item");
  const twCount = tradeModal.querySelector(".trade-want-count");
  const tErr = tradeModal.querySelector(".trade-error");
  const tPost = tradeModal.querySelector(".trade-post");

  function openTradeModal(prefillItem) {
    const owned = Object.entries(myInventory).filter(([, n]) => n > 0);
    if (!owned.length) {
      appendSystem("You have nothing to trade.");
      return;
    }
    tgItem.innerHTML = owned
      .map(([item, n]) => {
        const def = ITEM_DB[item] || { name: item };
        return `<option value="${item}">${def.name} (have ${n})</option>`;
      })
      .join("");
    if (prefillItem && (myInventory[prefillItem] ?? 0) > 0)
      tgItem.value = prefillItem;
    tgCount.value = "1";

    twItem.innerHTML = Object.keys(ITEM_DB)
      .map((item) => `<option value="${item}">${ITEM_DB[item].name}</option>`)
      .join("");
    twOn.checked = false;
    twFields.style.display = "none";
    twCount.value = "1";
    tPost.textContent = "Post Gift";
    tErr.textContent = "";
    tradeModal.classList.add("is-open");
  }
  function closeTradeModal() {
    tradeModal.classList.remove("is-open");
  }

  twOn.addEventListener("change", () => {
    twFields.style.display = twOn.checked ? "block" : "none";
    tPost.textContent = twOn.checked ? "Post Offer" : "Post Gift";
  });
  tradeModal.querySelector(".trade-close").onclick = closeTradeModal;
  tradeModal.addEventListener("click", (e) => {
    if (e.target === tradeModal) closeTradeModal();
  });

  tPost.onclick = () => {
    const giveItem = tgItem.value;
    const giveCount = Math.floor(Number(tgCount.value));
    if (!giveItem || !(giveCount >= 1)) {
      tErr.textContent = "Pick an item and amount.";
      return;
    }
    if ((myInventory[giveItem] ?? 0) < giveCount) {
      tErr.textContent = `You only have ${myInventory[giveItem] ?? 0}.`;
      return;
    }
    const payload = { give: { item: giveItem, count: giveCount } };
    if (twOn.checked) {
      const wantItem = twItem.value;
      const wantCount = Math.floor(Number(twCount.value));
      if (!wantItem || !(wantCount >= 1)) {
        tErr.textContent = "Set what you want back.";
        return;
      }
      payload.want = { item: wantItem, count: wantCount };
    }
    room.send("offer", payload);
    closeTradeModal();
  };

  // a "＋ Offer" button in the inventory modal header
  const newOfferBtn = document.createElement("button");
  newOfferBtn.className = "inv-newoffer";
  newOfferBtn.textContent = "＋ Offer";
  invModal
    .querySelector(".inv-modal-head")
    .insertBefore(newOfferBtn, invModal.querySelector(".inv-modal-close"));
  newOfferBtn.onclick = () => {
    closeInv();
    openTradeModal();
  };

  // right-click (desktop)
  invGrid.addEventListener("contextmenu", (e) => {
    const slot = e.target.closest(".inv-slot");
    if (!slot) return;
    e.preventDefault();
    openCtxMenu(slot.dataset.item, e.clientX, e.clientY);
  });

  // long-press (touch / iPad)
  let pressTimer = null;
  invGrid.addEventListener(
    "touchstart",
    (e) => {
      const slot = e.target.closest(".inv-slot");
      if (!slot) return;
      longPressed = false;
      const t = e.touches[0];
      pressTimer = setTimeout(() => {
        longPressed = true;
        openCtxMenu(slot.dataset.item, t.clientX, t.clientY);
      }, 450);
    },
    { passive: true },
  );
  invGrid.addEventListener("touchend", () => clearTimeout(pressTimer));
  invGrid.addEventListener("touchmove", () => clearTimeout(pressTimer));

  // close on outside click (and swallow the click that follows a long-press)
  document.addEventListener("click", (e) => {
    if (longPressed) {
      longPressed = false;
      return;
    }
    if (!e.target.closest(".ctx-menu")) closeCtxMenu();
  });

  // click a slot to inspect it (reuses the item tooltip)
  invGrid.addEventListener("click", (e) => {
    if (longPressed) return;
    const slot = e.target.closest(".inv-slot");
    if (!slot) return;
    fillTooltip(slot.dataset.item);
    tooltip.classList.add("is-visible");
    const r = slot.getBoundingClientRect();
    const tr = tooltip.getBoundingClientRect();
    let top = r.bottom + 8;
    if (top + tr.height > window.innerHeight - 8) top = r.top - tr.height - 8;
    tooltip.style.left =
      Math.max(8, Math.min(r.left, window.innerWidth - tr.width - 8)) + "px";
    tooltip.style.top = top + "px";
  });

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
      if (!chatOpen && openOffers === 0) chatLog.classList.remove("is-visible");
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
      if (text) handleChatSend(text); // was: room.send("chat", expandItemTokens(text));
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

  room.onMessage("offerPosted", ({ id, fromName, give, want }) => {
    const line = document.createElement("div");
    line.className = "chat-line chat-offer";
    const who = document.createElement("span");
    who.className = "chat-name";
    who.textContent = fromName + (want ? " offers " : " is giving away ");
    line.append(who, makeItemChip(give.item, give.count));
    if (want) {
      line.append(document.createTextNode(" for "));
      line.append(makeItemChip(want.item, want.count));
    }

    const btn = document.createElement("button");
    btn.className = "offer-btn";
    if (fromName === myName) {
      btn.textContent = "Cancel";
      btn.classList.add("is-cancel");
      btn.onclick = () => room.send("cancelOffer", { id });
    } else {
      btn.textContent = want ? "Accept" : "Claim";
      btn.onclick = () => room.send("accept", { id });
    }
    line.append(btn);

    chatLog.appendChild(line);
    offerLines.set(id, line);
    openOffers++;
    while (chatLog.childNodes.length > 12)
      chatLog.removeChild(chatLog.firstChild);
    chatLog.scrollTop = chatLog.scrollHeight;
    showLog();
  });

  room.onMessage("offerClosed", ({ id, status, by }) => {
    const line = offerLines.get(id);
    openOffers = Math.max(0, openOffers - 1);
    if (line) {
      line.querySelector(".offer-btn")?.remove();
      const tag = document.createElement("span");
      tag.className = "offer-status";
      tag.textContent =
        status === "completed"
          ? `  ✓ traded${by ? " with " + by : ""}`
          : status === "expired"
            ? "  — expired"
            : "  — cancelled";
      line.append(tag);
      line.classList.add("is-closed");
      offerLines.delete(id);
    }
    if (openOffers === 0) scheduleFade();
    showLog();
  });

  room.onMessage("offerError", (text) => appendSystem(text));

  room.onMessage("notice", (text) => appendSystem(text))

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
    if (e.code === "Escape" && ctxMenu.classList.contains("is-open")) {
      closeCtxMenu();
      return;
    }
    if (e.code === "Escape" && invOpen) {
      closeInv();
      return;
    }
    if (e.code === "KeyI" || e.code === "KeyB") {
      toggleInv();
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
