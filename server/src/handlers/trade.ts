import type { WorldRoom } from "@/rooms/WorldRoom.js";
import { invHas, invAdd, invSub, normItem } from "@/game/inventory.js";

export function registerTrade(room: WorldRoom) {
  // post a trade offer to the whole server
  room.onMessage("offer", (client, data: any) => {
    const player = room.state.players.get(client.sessionId);
    if (!player) return;
    const give = normItem(data?.give);
    const want = data?.want ? normItem(data?.want) : null; // no want = free gift
    if (!give) return;
    if (data?.want && !want) return; // want was specified but invalid

    const inv = room.inventories.get(client.sessionId) ?? {};
    if (!invHas(inv, give.item, give.count)) {
      client.send("offerError", `You don't have ${give.count} ${give.item}.`);
      return;
    }

    const id = "o" + ++room.offerSeq;
    room.offers.set(id, {
      id,
      fromId: client.sessionId,
      fromName: player.name,
      give,
      want,
    });
    room.broadcast("offerPosted", { id, fromName: player.name, give, want });

    room.clock.setTimeout(() => {
      if (room.offers.delete(id))
        room.broadcast("offerClosed", { id, status: "expired" });
    }, 120000);
  });

  // accept someone's offer — re-validates BOTH sides, then swaps atomically
  room.onMessage("accept", (client, data) => {
    const offer = room.offers.get(data?.id);
    if (!offer) {
      client.send("offerError", "That offer is no longer available.");
      return;
    }
    if (offer.fromId === client.sessionId) return;

    const sellerInv = room.inventories.get(offer.fromId);
    const buyerInv = room.inventories.get(client.sessionId);
    if (!sellerInv || !buyerInv) {
      room.offers.delete(offer.id);
      room.broadcast("offerClosed", { id: offer.id, status: "cancelled" });
      client.send("offerError", "That offer is no longer available.");
      return;
    }
    if (!invHas(sellerInv, offer.give.item, offer.give.count)) {
      room.offers.delete(offer.id);
      room.broadcast("offerClosed", { id: offer.id, status: "cancelled" });
      client.send("offerError", "The offerer no longer has the goods.");
      return;
    }
    if (offer.want && !invHas(buyerInv, offer.want.item, offer.want.count)) {
      client.send(
        "offerError",
        `You don't have ${offer.want.count} ${offer.want.item}.`,
      );
      return;
    }

    // atomic swap (synchronous — no await between check and mutation)
    invSub(sellerInv, offer.give.item, offer.give.count);
    invAdd(buyerInv, offer.give.item, offer.give.count);
    if (offer.want) {
      invSub(buyerInv, offer.want.item, offer.want.count);
      invAdd(sellerInv, offer.want.item, offer.want.count);
    }
    room.offers.delete(offer.id);

    const buyerName =
      room.state.players.get(client.sessionId)?.name ?? "someone";
    client.send("inventory", buyerInv);
    room.clients
      .find((c) => c.sessionId === offer.fromId)
      ?.send("inventory", sellerInv);
    room.broadcast("offerClosed", {
      id: offer.id,
      status: "completed",
      by: buyerName,
    });

    room.saveOne(offer.fromName, sellerInv);
    room.saveOne(buyerName, buyerInv);
  });

  // cancel your own offer
  room.onMessage("cancelOffer", (client, data) => {
    const offer = room.offers.get(data?.id);
    if (!offer || offer.fromId !== client.sessionId) return;
    room.offers.delete(offer.id);
    room.broadcast("offerClosed", { id: offer.id, status: "cancelled" });
  });
}