// @ts-nocheck
import { Client } from "@colyseus/sdk";
import type { WorldState } from "@/server/schema/WorldState";

export const ENDPOINT = location.hostname.endsWith(".app.github.dev")
  ? `${location.protocol}//${location.hostname.replace("-5173.", "-2567.")}`
  : "http://localhost:2567";

export async function createRoom(name) {
  const client = new Client(ENDPOINT);
  const room = await client.joinOrCreate<WorldState>("world", { name });
  return { client, room };
}
