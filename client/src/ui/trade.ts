// @ts-nocheck
import { ITEM_DB } from "@/data/items";

// trade-offer builder modal. Shared state via `ctx`.
export function initTrade(ctx) {
  const room = ctx.room;

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
    const owned = Object.entries(ctx.myInventory).filter(([, n]) => n > 0);
    if (!owned.length) {
      ctx.appendSystem("You have nothing to trade.");
      return;
    }
    tgItem.innerHTML = owned
      .map(([item, n]) => {
        const def = ITEM_DB[item] || { name: item };
        return `<option value="${item}">${def.name} (have ${n})</option>`;
      })
      .join("");
    if (prefillItem && (ctx.myInventory[prefillItem] ?? 0) > 0)
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
    if ((ctx.myInventory[giveItem] ?? 0) < giveCount) {
      tErr.textContent = `You only have ${ctx.myInventory[giveItem] ?? 0}.`;
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
  ctx.invModal
    .querySelector(".inv-modal-head")
    .insertBefore(newOfferBtn, ctx.invModal.querySelector(".inv-modal-close"));
  newOfferBtn.onclick = () => {
    ctx.closeInv();
    openTradeModal();
  };

  // expose the bits other modules need
  ctx.openTradeModal = openTradeModal;
  ctx.closeTradeModal = closeTradeModal;
}
