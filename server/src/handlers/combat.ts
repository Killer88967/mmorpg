import type { WorldRoom } from "@/rooms/WorldRoom.js";
import {
  WEAPONS,
  FIST_DAMAGE,
  ATTACK_RANGE,
  ATTACK_COOLDOWN,
  MOB_LOOT,
} from "@/game/mobs.js";

export function registerCombat(room: WorldRoom) {
  const lastAttack = new Map<string, number>();

  room.onMessage("attack", (client) => {
    const player = room.state.players.get(client.sessionId);
    if (!player) return;

    // cooldown
    const now = Date.now();
    if (now - (lastAttack.get(client.sessionId) ?? 0) < ATTACK_COOLDOWN) return;
    lastAttack.set(client.sessionId, now);

    // auto-pick best weapon you're carrying
    const inv = room.inventories.get(client.sessionId) ?? {};
    let dmg = FIST_DAMAGE;
    for (const [item, d] of Object.entries(WEAPONS))
      if ((inv[item] ?? 0) > 0 && d > dmg) dmg = d;

    // nearest mob within range
    let bestId: string | null = null;
    let bestDist = ATTACK_RANGE * ATTACK_RANGE;
    room.state.mobs.forEach((mob, id) => {
      const dx = mob.x - player.x,
        dy = mob.y - player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestDist) {
        bestDist = d2;
        bestId = id;
      }
    });
    if (!bestId) return; // swung at air

    const mob = room.state.mobs.get(bestId)!;
    mob.hp -= dmg;
    room.broadcast("combatHit", { id: bestId, dmg, x: mob.x, y: mob.y });

    if (mob.hp <= 0) {
      const loot = MOB_LOOT[mob.kind];
      room.state.mobs.delete(bestId);
      room.broadcast("mobKilled", { id: bestId, x: mob.x, y: mob.y });
      if (loot) {
        const amt =
          loot.min + Math.floor(Math.random() * (loot.max - loot.min + 1));
        inv[loot.item] = (inv[loot.item] ?? 0) + amt;
        room.inventories.set(client.sessionId, inv);
        client.send("inventory", inv);
        client.send("notice", `+${amt} ${loot.item}.`);
      }
    }
  });
}
