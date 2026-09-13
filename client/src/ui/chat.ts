// @ts-nocheck
import { ITEM_DB } from "@/data/items";
import type { GameContext } from "@/types";
import { formatAmount } from "@/util/format";

// wires up chat + offer messages. Shares mutable state through `ctx`.
export function initChat(ctx: GameContext) {
  const room = ctx.room;

  const offerLines = new Map();
  ctx.openOffers = 0;

  const ITEM_RE = /\{([a-zA-Z][a-zA-Z0-9_]*)(?:::(\d+))?\}/g;
  const CHAT_TOKEN_RE =
    /(\{[a-zA-Z][a-zA-Z0-9_]*(?:::\d+)?\}|@[a-zA-Z0-9_]+|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const ITEM_TOKEN_RE = /^\{([a-zA-Z][a-zA-Z0-9_]*)(?:::(\d+))?\}$/;
  const MENTION_RE = /^@([a-zA-Z0-9_]+)$/;

  function makeItemChip(item: string, count: number) {
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
      amt.textContent = "×" + formatAmount(count);
      chip.append(amt);
    }
    return chip;
  }

  function appendText(line: HTMLElement, text: string) {
    let last: number = 0;

    for (const match of text.matchAll(CHAT_TOKEN_RE)) {
      const token = match[0];
      const index = match.index ?? 0;

      if (index > last) {
        line.appendChild(document.createTextNode(text.slice(last, index)));
      }

      const itemMatch = token.match(ITEM_TOKEN_RE);

      if (itemMatch) {
        line.appendChild(
          makeItemChip(
            itemMatch[1].toLowerCase(),
            itemMatch[2] !== undefined ? parseInt(itemMatch[2], 10) : null,
          ),
        );

        last = index + token.length;
        continue;
      }

      const mentionMatch = token.match(MENTION_RE);

      if (mentionMatch) {
        const mention = document.createElement("span");

        mention.className =
          mentionMatch[1].toLowerCase() === ctx.myName.toLowerCase()
            ? "chat-mention is-self"
            : "chat-mention";

        mention.textContent = token;

        line.appendChild(mention);

        last = index + token.length;
        continue;
      }

      if (token.startsWith("**")) {
        const bold = document.createElement("strong");
        bold.className = "chat-bold";
        bold.textContent = token.slice(2, -2);

        line.appendChild(bold);

        last = index + token.length;
        continue;
      }

      if (token.startsWith("*")) {
        const italic = document.createElement("em");
        italic.className = "chat-italic";
        italic.textContent = token.slice(1, -1);

        line.appendChild(italic);

        last = index + token.length;
        continue;
      }

      if (token.startsWith("`")) {
        const code = document.createElement("code");
        code.className = "chat-code";
        code.textContent = token.slice(1, -1);

        line.appendChild(code);

        last = index + token.length;
        continue;
      }
    }

    if (last < text.length) {
      line.appendChild(document.createTextNode(text.slice(last)));
    }
  }

  function expandItemTokens(text: string) {
    return text.replace(
      /\{([a-zA-Z][a-zA-Z0-9_]*)(?:::(\d+))?\}/g,
      (full, item, count) =>
        count !== undefined
          ? full
          : `{${item}::${ctx.myInventory[item.toLowerCase()] ?? 0}}`,
    );
  }

  function handleChatSend(text: string) {
    if (text.startsWith("/") && handleCommand(text)) {
      return;
    }
    room.send("chat", expandItemTokens(text));
  }

  function handleCommand(text: string) {
    const [rawCommand] = text.slice(1).trim().split(/\s+/);
    const command = rawCommand?.toLowerCase();

    switch (command) {
      case "help": {
        appendSystem("Chat commands:");
        appendSystem("/me <action> — perform an action");
        appendSystem("/w <name> <message> — whisper to a player");
        appendSystem("/whisper <name> <message> — same as /w");
        appendSystem("/players — list connected players");
        appendSystem(
          "/offer <item> <count> for <item> <count> — create a trade offer",
        );
        return true;
      }

      case "offer": {
        const parsed = parseOfferCommand(text);

        if (parsed) {
          room.send("offer", parsed);
        } else {
          appendSystem("Usage: /offer <item> <count> for <item> <count>");
        }

        return true;
      }

      case "me":
      case "w":
      case "whisper":
      case "players": {
        room.send("chat", text);
        return true;
      }

      default: {
        appendSystem(`Unknown command: /${command || ""}. Try /help.`);
        return true;
      }
    }
  }

  function parseOfferCommand(text: string) {
    const m = text.match(
      /^\/offer\s+([a-z][a-z0-9_]*)\s+(\d+)\s+(?:for\s+)?([a-z][a-z0-9_]*)\s+(\d+)\s*$/i,
    );
    if (!m) return null;
    return {
      give: { item: m[1].toLowerCase(), count: parseInt(m[2], 10) },
      want: { item: m[3].toLowerCase(), count: parseInt(m[4], 10) },
    };
  }

  function appendSystem(text: string) {
    const line = document.createElement("div");
    line.className = "chat-line chat-system";
    line.textContent = text;
    chatLog.appendChild(line);
    while (chatLog.childNodes.length > 12)
      chatLog.removeChild(chatLog.firstChild);
    chatLog.scrollTop = chatLog.scrollHeight;
    showLog();
  }

  // ---- chat: hidden until toggled, fades when idle ----
  const chatLog = document.createElement("div");
  chatLog.className = "chat-log";
  document.body.appendChild(chatLog);

  const chatInput = document.createElement("input");
  chatInput.className = "chat-input";
  chatInput.maxLength = 200;
  chatInput.placeholder = "Say something…";
  document.body.appendChild(chatInput);

  let fadeTimer;

  function showLog() {
    clearTimeout(fadeTimer);
    chatLog.classList.add("is-visible");
  }

  function scheduleFade() {
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      if (!ctx.chatOpen && ctx.openOffers === 0)
        chatLog.classList.remove("is-visible");
    }, 5000);
  }

  function openChat() {
    ctx.chatOpen = true;
    for (const k in ctx.held) ctx.held[k] = false; // stop walking while typing
    room.send("input", ctx.held);
    chatInput.classList.add("is-open");
    chatInput.focus();
    showLog();
  }
  function closeChat() {
    ctx.chatOpen = false;
    chatInput.value = "";
    chatInput.blur();
    chatInput.classList.remove("is-open");
    scheduleFade();
  }

  function appendLine(name: string, text: string) {
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
    if (!ctx.chatOpen) scheduleFade();
  });

  room.onMessage("chatAction", ({ name, text }) => {
    appendSystem(`* ${name} ${text}`);
  });

  room.onMessage("whisper", ({ from, to, text }) => {
    const label = from === ctx.myName ? `To ${to}` : `From ${from}`;
    appendSystem(`[whisper] ${label}: ${text}`);
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
    if (fromName === ctx.myName) {
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
    ctx.openOffers++;
    while (chatLog.childNodes.length > 12)
      chatLog.removeChild(chatLog.firstChild);
    chatLog.scrollTop = chatLog.scrollHeight;
    showLog();
  });

  room.onMessage("offerClosed", ({ id, status, by }) => {
    const line = offerLines.get(id);
    ctx.openOffers = Math.max(0, ctx.openOffers - 1);
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
    if (ctx.openOffers === 0) scheduleFade();
    showLog();
  });

  room.onMessage("offerError", (text) => appendSystem(text));

  room.onMessage("notice", (text) => appendSystem(text));

  // expose the bits other modules need
  ctx.chatLog = chatLog;
  ctx.chatInput = chatInput;
  ctx.makeItemChip = makeItemChip;
  ctx.appendSystem = appendSystem;
  ctx.appendLine = appendLine;
  ctx.showLog = showLog;
  ctx.scheduleFade = scheduleFade;
  ctx.openChat = openChat;
  ctx.closeChat = closeChat;
}
