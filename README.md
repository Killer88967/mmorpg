# MMORPG

A tiny browser-based multiplayer RPG sandbox. Players share a persistent tile world where they can walk around, chat, gather resources, craft tools, trade with each other, and fight roaming slimes.

Built with an authoritative [Colyseus](https://colyseus.io/) server (state is simulated server-side and synced to clients) and a [PixiJS](https://pixijs.com/) client rendered on the web.

## Features

- **Real-time multiplayer** — up to 32 players per world room, with server-authoritative movement and collision.
- **Persistent characters** — position, inventory, and unlocked tools are saved to SQLite (via Prisma) and restored when you rejoin under the same name.
- **Gathering** — chop trees, mine rocks and ore, and pick up sticks and flint. Harvesting nodes respawn on a timer, and higher-tier nodes require the right tool.
- **Crafting** — turn raw materials into sticks, hatchets, pickaxes, a furnace, iron bars, and an iron sword. Some recipes require a crafting station (the furnace).
- **Tool gating** — resources are locked behind tool capabilities: bare hands, a hatchet (`chop`), a basic pickaxe (`mine`), or a stone/iron pickaxe (`mine2`).
- **Player-to-player trading** — send and accept trade offers with other players in the world.
- **Chat** — world-wide text chat.
- **Building** — craft stone walls and place them in the world from a build hotbar (with a ghost preview and placement range). Walls block players and mobs alike, and only the owner can break them to get the block back.
- **Combat** — attack nearby mobs (auto-picking the best weapon you're carrying, on a swing cooldown). Kills drop loot such as slime gel.
- **Mobs that fight back** — slimes wander until a player enters their aggro range, then chase and hit for damage. Players have a health bar; taking a hit flashes the screen, and dying respawns you at a random spot. Health regenerates after a few seconds out of combat.

## Tech Stack

| Layer  | Tech                                              |
| ------ | ------------------------------------------------- |
| Client | TypeScript, Vite, PixiJS, `@colyseus/sdk`         |
| Server | TypeScript, Colyseus, Express, `@colyseus/schema` |
| Data   | SQLite via Prisma (`better-sqlite3` adapter)      |

## Project Structure

```
.
├── client/                 # Vite + PixiJS front end
│   └── src/
│       ├── main.ts         # bootstraps the game
│       ├── input.ts        # keyboard handling
│       ├── net/            # Colyseus room connection
│       ├── world/          # camera, map, mob + placed-block rendering
│       ├── ui/             # chat, inventory, crafting, trade, build bar, HUD
│       └── data/           # client-side item/recipe/mob definitions
├── server/                 # Colyseus game server
│   ├── prisma/             # schema + migrations
│   └── src/
│       ├── index.ts        # server entry point
│       ├── rooms/          # WorldRoom + synced schema (WorldState)
│       ├── game/           # map generation, resources, recipes, mobs, building
│       └── handlers/       # harvest, craft, trade, discard, combat, building
└── package.json            # root scripts (run client + server together)
```

## Getting Started

### Prerequisites

- Node.js **20.9+**

### Install

Dependencies live in each workspace, so install both:

```bash
cd server && npm install
cd ../client && npm install
```

### Set up the database

The server uses SQLite via Prisma. From the `server/` directory, apply the migrations:

```bash
cd server
npx prisma migrate dev
```

### Run

From the repo root, start the client and server together:

```bash
npm run dev
```

Or run them individually:

```bash
npm run server   # Colyseus server (tsx watch)
npm run client   # Vite dev server
```

Then open the URL printed by Vite (typically http://localhost:5173) in your browser.

## Controls

| Key                      | Action                     |
| ------------------------ | -------------------------- |
| `W` `A` `S` `D` / arrows | Move                       |
| `E`                      | Harvest the tile you're on |
| `Space`                  | Attack the nearest mob     |
| `C`                      | Open / close crafting      |
| `I` or `B`               | Open / close inventory     |
| `Enter`                  | Open chat                  |
| `Esc`                    | Close the active menu      |

**Building** is mouse-driven: select a block in the build bar, then click a tile within range to place it (a ghost preview shows valid spots). With nothing selected, click one of your own placed blocks to break it and get the block back.

## World & Progression

The map is a 32×32 tile grid containing grass, a lake, crossroad paths, trees, rocks, ore, bushes (sticks), and flint. A rough progression loop:

1. Gather **wood** (trees) and **flint** by hand.
2. Craft **sticks**, then a **flint hatchet** and **flint pickaxe**.
3. Mine **stone**, craft **stone tools**, **stone walls**, and a **furnace**.
4. Smelt **ore** into **iron bars**, then craft **iron tools** and an **iron sword**.
5. Wield the **sword** to kill slimes faster and farm **slime gel**, and wall off a base of your own.

## License

See [LICENSE](LICENSE).