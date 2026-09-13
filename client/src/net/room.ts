import { Client } from "@colyseus/sdk";
import type { WorldState } from "@/server/schema/WorldState";

const codespacesEndpoint = location.hostname.endsWith(".app.github.dev")
  ? `${location.protocol}//${location.hostname.replace("-5173.", "-2567.")}`
  : undefined;

export const ENDPOINT =
  import.meta.env.VITE_SERVER_URL ??
  codespacesEndpoint ??
  "http://localhost:2567";

export async function createRoom(name: string) {
  const client = new Client(ENDPOINT);
  const room = await client.joinOrCreate<WorldState>("world", { name });

  return { client, room };
}
