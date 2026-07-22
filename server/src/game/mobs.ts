import type { WorldRoom } from "@/rooms/WorldRoom.js";
import { Mob } from "@/rooms/schema/WorldState.js";
import { WORLD } from "@/game/constants.js";
import { clamp } from "@/game/map.js";
import { isBlocked } from "@/game/building.js";

export const MOB_TYPES: Record<
  string,
  { maxHp: number; speed: number; wanderRadius: number }
> = {
  slime: { maxHp: 24, speed: 40, wanderRadius: 160 },
};
export const MAX_MOBS = 12;

// player-attacks-mob (used by handlers/combat.ts)
export const WEAPONS: Record<string, number> = { sword: 12 };
export const FIST_DAMAGE = 4;
export const ATTACK_RANGE = 44;
export const ATTACK_COOLDOWN = 400;
export const MOB_LOOT: Record<
  string,
  { item: string; min: number; max: number }
> = {
  slime: { item: "slime_gel", min: 1, max: 2 },
};

// mob-attacks-player
const AGGRO_RANGE = 180;
const MOB_ATTACK_RANGE = 30;
const MOB_DAMAGE = 8;
const MOB_ATTACK_COOLDOWN = 1000;
const CHASE_MULT = 1.5;

export function registerMobs(room: WorldRoom) {
  let seq = 0;
  const targets = new Map<string, { tx: number; ty: number }>();
  const lastAtk = new Map<string, number>();

  function spawnMob() {
    let x = 0,
      y = 0,
      tries = 0;
    do {
      x = Math.random() * WORLD.w;
      y = Math.random() * WORLD.h;
      tries++;
    } while (isBlocked(room.state, x, y) && tries < 50);

    const id = "m" + ++seq;
    const type = MOB_TYPES.slime;
    const mob = new Mob();
    mob.x = x;
    mob.y = y;
    mob.kind = "slime";
    mob.hp = type.maxHp;
    mob.maxHp = type.maxHp;
    room.state.mobs.set(id, mob);
    targets.set(id, { tx: x, ty: y });
  }

  for (let i = 0; i < MAX_MOBS; i++) spawnMob();

  room.clock.setInterval(() => {
    if (room.state.mobs.size < MAX_MOBS) spawnMob();
  }, 4000);

  room.clock.setInterval(() => {
    const dt = 0.1;
    const now = Date.now();
    room.state.mobs.forEach((mob, id) => {
      const type = MOB_TYPES[mob.kind] ?? MOB_TYPES.slime;

      // nearest living player in aggro range
      let tPid: string | null = null;
      let tx = 0,
        ty = 0,
        tD2 = AGGRO_RANGE * AGGRO_RANGE;
      room.state.players.forEach((p, pid) => {
        if (p.hp <= 0) return;
        const dx = p.x - mob.x,
          dy = p.y - mob.y,
          d2 = dx * dx + dy * dy;
        if (d2 < tD2) {
          tD2 = d2;
          tPid = pid;
          tx = p.x;
          ty = p.y;
        }
      });

      if (tPid) {
        const dist = Math.sqrt(tD2) || 1;
        if (dist <= MOB_ATTACK_RANGE) {
          if (now - (lastAtk.get(id) ?? 0) >= MOB_ATTACK_COOLDOWN) {
            lastAtk.set(id, now);
            room.damagePlayer(tPid, MOB_DAMAGE);
          }
        } else {
          const nx =
            mob.x + ((tx - mob.x) / dist) * type.speed * CHASE_MULT * dt;
          const ny =
            mob.y + ((ty - mob.y) / dist) * type.speed * CHASE_MULT * dt;
          if (!isBlocked(room.state, nx, mob.y)) mob.x = nx;
          if (!isBlocked(room.state, mob.x, ny)) mob.y = ny;
        }
        return;
      }

      // otherwise wander
      let t = targets.get(id);
      if (
        !t ||
        Math.hypot(t.tx - mob.x, t.ty - mob.y) < 6 ||
        Math.random() < 0.01
      ) {
        t = {
          tx: clamp(
            mob.x + (Math.random() - 0.5) * type.wanderRadius,
            0,
            WORLD.w,
          ),
          ty: clamp(
            mob.y + (Math.random() - 0.5) * type.wanderRadius,
            0,
            WORLD.h,
          ),
        };
        targets.set(id, t);
      }
      const dx = t.tx - mob.x,
        dy = t.ty - mob.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = mob.x + (dx / d) * type.speed * dt;
      const ny = mob.y + (dy / d) * type.speed * dt;
      if (!isBlocked(room.state, nx, mob.y)) mob.x = nx;
      if (!isBlocked(room.state, mob.x, ny)) mob.y = ny;
    });
  }, 100);
}