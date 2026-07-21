// @ts-nocheck
import { Graphics, Container, Text } from "pixi.js";
import { MOB_COLORS } from "@/data/mobs";

export function initMobs({ app, world, room, $ }) {
  const mobSprites = new Map();

  function floatText(x, y, str, color) {
    const t = new Text({
      text: str,
      style: {
        fill: color,
        fontSize: 14,
        fontFamily: "monospace",
        fontWeight: "700",
      },
    });
    t.anchor.set(0.5);
    t.x = x;
    t.y = y;
    world.addChild(t);
    let life = 0;
    const tick = (ticker) => {
      const dt = ticker.deltaMS ?? 16;
      life += dt;
      t.y -= dt * 0.03;
      t.alpha = Math.max(0, 1 - life / 700);
      if (life >= 700) {
        app.ticker.remove(tick);
        t.destroy();
      }
    };
    app.ticker.add(tick);
  }

  $.onAdd("mobs", (mob, id) => {
    const c = new Container();
    c.x = mob.x;
    c.y = mob.y;
    c.tx = mob.x;
    c.ty = mob.y;

    const body = new Graphics()
      .circle(0, 0, 11)
      .fill(MOB_COLORS[mob.kind] ?? 0x5fbf5f);
    body.stroke({ width: 2, color: 0x000000, alpha: 0.3 });
    c.addChild(body);
    c._body = body;

    const barBg = new Graphics()
      .rect(-12, -20, 24, 4)
      .fill({ color: 0x000000, alpha: 0.6 });
    const bar = new Graphics().rect(-12, -20, 24, 4).fill(0x4caf50);
    c.addChild(barBg, bar);
    c._bar = bar;
    c._maxHp = mob.maxHp || 1;

    world.addChild(c);
    mobSprites.set(id, c);

    $.listen(mob, "x", (v) => (c.tx = v));
    $.listen(mob, "y", (v) => (c.ty = v));
    $.listen(mob, "hp", (v) => {
      const frac = Math.max(0, Math.min(1, v / c._maxHp));
      c._bar
        .clear()
        .rect(-12, -20, 24 * frac, 4)
        .fill(frac > 0.3 ? 0x4caf50 : 0xe05353);
    });
  });

  $.onRemove("mobs", (_mob, id) => {
    mobSprites.get(id)?.destroy();
    mobSprites.delete(id);
  });

  room.onMessage("combatHit", ({ id, dmg, x, y }) => {
    const c = mobSprites.get(id);
    if (c && c._body) {
      c._body.tint = 0xff6666;
      setTimeout(() => {
        if (c._body) c._body.tint = 0xffffff;
      }, 90);
    }
    floatText(x, y - 20, "-" + dmg, 0xff5353);
  });

  room.onMessage("mobKilled", ({ x, y }) => {
    floatText(x, y - 10, "💀", 0xffffff);
  });

  app.ticker.add(() => {
    mobSprites.forEach((c) => {
      c.x += (c.tx - c.x) * 0.2;
      c.y += (c.ty - c.y) * 0.2;
    });
  });
}
