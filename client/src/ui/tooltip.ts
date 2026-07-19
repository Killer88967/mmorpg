// @ts-nocheck
import { ITEM_DB } from "@/data/items";

// item tooltip (tap to pin, hover to peek) + slot inspect. Shared state via `ctx`.
export function initTooltip(ctx) {
  const chatLog = ctx.chatLog;
  const invGrid = ctx.invGrid;

  // ---- item tooltip (tap to pin, hover to peek) ----
  const tooltip = document.createElement("div");
  tooltip.className = "item-tooltip";
  document.body.appendChild(tooltip);
  let pinnedChip = null;

  // click a slot to inspect it (reuses the item tooltip)
  invGrid.addEventListener("click", (e) => {
    if (ctx.longPressed) return;
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
    ctx.showLog();
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
    ctx.showLog();
    showTooltip(chip);
  });
  document.addEventListener("click", (e) => {
    if (pinnedChip && !e.target.closest(".chat-item")) hideTooltip();
  });

  // expose the bits other modules need
  ctx.fillTooltip = fillTooltip;
  ctx.showTooltip = showTooltip;
  ctx.hideTooltip = hideTooltip;
}
