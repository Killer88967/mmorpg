import { Client } from "@colyseus/sdk";
import type { WorldState } from "@/server/schema/WorldState";

const codespacesEndpoint = location.hostname.endsWith(".app.github.dev")
  ? `${location.protocol}//${location.hostname.replace("-5173.", "-2567.")}`
  : undefined;

export const ENPOINT =
  import.meta.env.VITE_SERVER_URL ??
  codespacesEndpoint ??
  "https://localhost:2567";

export async function createRoom(name: string) {
  const client = new Client(ENPOINT);
  const room = await client.joinOrCreate<WorldState>("world", { name });

  return { client, room };
}
