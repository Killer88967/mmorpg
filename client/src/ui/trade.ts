import { ITEM_DB } from "@/data/items";
import type { Context, TradeTypes } from "@/types";

// trade-offer builder modal. Shared state via `ctx`.
export function initTrade(ctx: Context.TradeContext) {
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

  const tgItem =
    tradeModal.querySelector<HTMLSelectElement>(".trade-give-item");
  const tgCount =
    tradeModal.querySelector<HTMLInputElement>(".trade-give-count");
  const twOn = tradeModal.querySelector<HTMLInputElement>(".trade-want-on");
  const twFields =
    tradeModal.querySelector<HTMLDivElement>(".trade-want-fields");
  const twItem =
    tradeModal.querySelector<HTMLSelectElement>(".trade-want-item");
  const twCount =
    tradeModal.querySelector<HTMLInputElement>(".trade-want-count");
  const tErr = tradeModal.querySelector<HTMLDivElement>(".trade-error");
  const tPost = tradeModal.querySelector<HTMLButtonElement>(".trade-post");
  const closeButton =
    tradeModal.querySelector<HTMLButtonElement>(".trade-close");

  if (
    !tgItem ||
    !tgCount ||
    !twOn ||
    !twFields ||
    !twItem ||
    !twCount ||
    !tErr ||
    !tPost ||
    !closeButton
  ) {
    throw new Error("Failed to create trade UI.");
  }

  const giveItemSelect = tgItem;
  const giveCountInput = tgCount;
  const wantToggle = twOn;
  const wantFields = twFields;
  const wantItemSelect = twItem;
  const wantCountInput = twCount;
  const errorText = tErr;
  const postButton = tPost;
  const tradeCloseButton = closeButton;

  function openTradeModal(prefillItem?: string) {
    const owned = Object.entries(ctx.myInventory).filter(([, n]) => n > 0);
    if (!owned.length) {
      ctx.appendSystem?.("You have nothing to trade.");
      return;
    }
    giveItemSelect.innerHTML = owned
      .map(([item, n]) => {
        const def = ITEM_DB[item];
        return `<option value="${item}">${def?.name ?? item} (have ${n})</option>`;
      })
      .join(" ");
    if (prefillItem && (ctx.myInventory[prefillItem] ?? 0) > 0)
      giveItemSelect.value = prefillItem;
    giveCountInput.value = "1";
    wantItemSelect.innerHTML = Object.keys(ITEM_DB)
      .map((item) => {
        const def = ITEM_DB[item];
        return `<option value="${item}">${def?.name ?? item}</option>`;
      })
      .join(" ");
    wantToggle.checked = false;
    wantFields.style.display = "none";
    wantCountInput.value = "1";
    postButton.textContent = "Post Gift";
    errorText.textContent = "";
    tradeModal.classList.add("is-open");
  }
  function closeTradeModal() {
    tradeModal.classList.remove("is-open");
  }

  wantToggle.addEventListener("change", () => {
    wantFields.style.display = wantToggle.checked ? "block" : "none";
    postButton.textContent = wantToggle.checked ? "Post Offer" : "Post Gift";
  });
  tradeCloseButton.onclick = closeTradeModal;
  tradeModal.addEventListener("click", (e) => {
    if (e.target === tradeModal) closeTradeModal();
  });

  postButton.onclick = () => {
    const giveItem = giveItemSelect.value;
    const giveCount = Math.floor(Number(giveCountInput.value));
    if (!giveItem || !(giveCount >= 1)) {
      errorText.textContent = "Pick an item and amount.";
      return;
    }
    if ((ctx.myInventory[giveItem] ?? 0) < giveCount) {
      errorText.textContent = `You only have ${ctx.myInventory[giveItem] ?? 0}.`;
      return;
    }
    const payload: TradeTypes.OfferPayload = {
      give: {
        item: giveItem,
        count: giveCount,
      },
    };
    if (wantToggle.checked) {
      const wantItem = wantItemSelect.value;
      const wantCount = Math.floor(Number(wantCountInput.value));
      if (!wantItem || !(wantCount >= 1)) {
        errorText.textContent = "Set what you want back.";
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
  const invModal = ctx.invModal;
  if (!invModal) throw new Error("Trade initialized before inventory UI.");
  const invHead = invModal.querySelector<HTMLDivElement>(".inv-modal-head");
  const invClose =
    invModal.querySelector<HTMLButtonElement>(".inv-modal-close");
  if (!invHead || !invClose)
    throw new Error("Failed to find inventory header UI.");
  invHead.insertBefore(newOfferBtn, invClose);
  newOfferBtn.onclick = () => {
    ctx.closeInv?.();
    openTradeModal();
  };

  // expose the bits other modules need
  ctx.openTradeModal = openTradeModal;
  ctx.closeTradeModal = closeTradeModal;
}
