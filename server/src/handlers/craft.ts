import type { WorldRoom } from "@/rooms/WorldRoom.js";
import { RECIPE_BY_ID } from "@/game/recipes.js";
import { invHas, invSub } from "@/game/inventory.js";
import { nearStation } from "@/game/building.js";

export function registerCraft(room: WorldRoom) {
  room.onMessage("craft", (client, data: any) => {
    const recipe = RECIPE_BY_ID[String(data?.id ?? "")];
    if (!recipe) return;

    const player = room.state.players.get(client.sessionId);
    if (!player) return;

    const inv = room.inventories.get(client.sessionId) ?? {};
    const tools = room.tools.get(client.sessionId) ?? new Set<string>();

    // tools are permanent — can't craft one you already own
    if (recipe.output.kind === "tool" && tools.has(recipe.output.tool)) {
      client.send("notice", "You already have that tool.");
      return;
    }

    // must be standing near the required station (e.g. a placed furnace)
    if (
      recipe.station &&
      !nearStation(room.state, player.x, player.y, recipe.station)
    ) {
      client.send("notice", `You need to be near a ${recipe.station}.`);
      return;
    }

    // verify materials first
    for (const [item, count] of Object.entries(recipe.inputs)) {
      if (!invHas(inv, item, count)) {
        client.send("notice", `Not enough ${item} to craft ${recipe.name}.`);
        return;
      }
    }

    // consume, then produce (synchronous — no dupes)
    for (const [item, count] of Object.entries(recipe.inputs))
      invSub(inv, item, count);

    if (recipe.output.kind === "item") {
      inv[recipe.output.item] =
        (inv[recipe.output.item] ?? 0) + recipe.output.count;
    } else {
      tools.add(recipe.output.tool);
      room.tools.set(client.sessionId, tools);
      client.send("toolsUpdate", [...tools]);
    }

    room.inventories.set(client.sessionId, inv);
    client.send("inventory", inv);
    client.send("notice", `Crafted ${recipe.name}.`);
    room.persist(client.sessionId);
  });
}
