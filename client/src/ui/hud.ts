// @ts-nocheck
export function initHud(ctx) {
  const room = ctx.room;

  const wrap = document.createElement("div");
  wrap.className = "hud-health";
  wrap.innerHTML = `<div class="hud-health-fill"></div><span class="hud-health-text"></span>`;
  document.body.appendChild(wrap);
  const fill = wrap.querySelector(".hud-health-fill");
  const text = wrap.querySelector(".hud-health-text");

  const flash = document.createElement("div");
  flash.className = "hurt-flash";
  document.body.appendChild(flash);

  const toast = document.createElement("div");
  toast.className = "death-toast";
  toast.textContent = "You died";
  document.body.appendChild(toast);

  ctx.setHp = (hp, maxHp) => {
    const frac = Math.max(0, Math.min(1, hp / (maxHp || 1)));
    fill.style.width = frac * 100 + "%";
    fill.style.background =
      frac > 0.5 ? "#4caf50" : frac > 0.25 ? "#e0a020" : "#e0433f";
    text.textContent = `${Math.max(0, Math.ceil(hp))} / ${maxHp}`;
  };

  room.onMessage("playerHit", () => {
    flash.classList.remove("show");
    void flash.offsetWidth; // restart the animation
    flash.classList.add("show");
  });

  room.onMessage("died", () => {
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  });
}