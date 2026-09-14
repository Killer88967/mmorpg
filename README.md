# MMORPG

[![CI](https://img.shields.io/github/actions/workflow/status/Killer88967/mmorpg/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white&style=flat-square)](https://github.com/Killer88967/mmorpg/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2F6-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![Colyseus](https://img.shields.io/badge/Colyseus-0.17-6E40C9?style=flat-square)](https://colyseus.io/)
[![PixiJS](https://img.shields.io/badge/PixiJS-8-E91E63?style=flat-square)](https://pixijs.com/)
[![License](https://img.shields.io/github/license/Killer88967/mmorpg?logo=opensourceinitiative&logoColor=white&style=flat-square)](LICENSE)

A browser-based multiplayer RPG sandbox built around a persistent, server-authoritative world.

Players can explore together, gather resources, craft tools and equipment, build structures, store items, trade with other players, fight hostile mobs, and progress from primitive tools to iron equipment.

The game uses [Colyseus](https://colyseus.io/) for authoritative multiplayer simulation and state synchronization, with a [PixiJS](https://pixijs.com/) client rendering the world in the browser.

> [!WARNING]
> MMORPG is actively under development. Gameplay systems, networking, persistence, balancing, and project structure may change as development continues.

## Features

### Multiplayer

- **Real-time multiplayer** with server-authoritative movement and collision
- Up to **32 players per world room**
- Colyseus state synchronization between the server and connected clients
- Shared persistent world state
- World-wide multiplayer chat

### Persistent Characters

Character data is stored in SQLite through Prisma.

Persistent data includes:

- Position
- Inventory
- Unlocked tools
- Character identity
- Character appearance data

Returning players can continue using their existing character.

### Gathering

Harvest resources directly from the world, including:

- Wood
- Sticks
- Flint
- Stone
- Ore

Resource nodes respawn after harvesting, while more valuable materials require progressively stronger tools.

Tool capabilities currently include:

- Bare hands
- `chop`
- `mine`
- `mine2`

### Crafting

Gathered materials can be turned into increasingly powerful equipment and structures.

Current crafting progression includes:

- Sticks
- Flint tools
- Stone tools
- Stone walls
- Chests
- Furnaces
- Iron bars
- Iron tools
- Iron sword

Some recipes require a nearby crafting station such as a furnace.

### Inventory & Storage

Players have persistent inventories and can manage items through the in-game inventory UI.

Player-built **chests** provide additional persistent storage.

Chest owners can:

- Open nearby chests
- Deposit items
- Withdraw items
- Store resources independently from their character inventory

Chest contents are persisted as part of the world state.

### Building

Craft placeable blocks and structures, then build directly inside the shared world.

The building system currently supports:

- Build hotbar
- Placement ghost previews
- Placement range validation
- Server-side placement validation
- Collision with players and mobs
- Ownership of placed structures
- Breaking owned structures to reclaim them

Placed structures are persisted between server restarts.

### Trading

Players can exchange items without dropping them into the world.

The trading system supports sending and accepting trade interactions with other players in the same world.

### Combat

Players can attack nearby hostile mobs.

Combat currently includes:

- Server-authoritative attacks
- Attack cooldowns
- Automatic weapon selection
- Player health
- Mob health
- Damage feedback
- Death and respawning
- Out-of-combat health regeneration
- Mob loot drops

### Mobs

Slimes currently inhabit the world.

They:

- Wander when idle
- Detect nearby players
- Chase players inside their aggro range
- Attack when close enough
- Collide with world structures
- Drop loot when killed

## Tech Stack

| Layer           | Technology                            |
| --------------- | ------------------------------------- |
| Language        | TypeScript                            |
| Client          | Vite, PixiJS                          |
| Networking      | Colyseus / `@colyseus/sdk`            |
| Server          | Colyseus, Express, `@colyseus/schema` |
| Database        | SQLite                                |
| ORM             | Prisma                                |
| SQLite Adapter  | `better-sqlite3`                      |
| Package Manager | pnpm                                  |
| Runtime         | Node.js                               |
| CI              | GitHub Actions                        |

## Architecture

MMORPG uses a **server-authoritative architecture**.

The client primarily handles:

- Rendering
- Input
- UI
- Local presentation

The server is responsible for validating and simulating game state such as:

- Player movement
- Collision
- Harvesting
- Crafting
- Combat
- Trading
- Building
- Chest interactions
- Mob behavior
- Persistence

This keeps important gameplay state controlled by the server rather than trusting the browser client.

## Project Structure

```text
.
├── .devcontainer/            # Development container configuration
├── .github/
│   └── workflows/            # GitHub Actions CI
│
├── client/                   # Vite + PixiJS browser client
│   ├── public/
│   └── src/
│       ├── data/             # Items, recipes, mobs and placeables
│       ├── net/              # Colyseus connection
│       ├── types/            # Shared client-side TypeScript types
│       ├── ui/
│       │   ├── build.ts
│       │   ├── chat.ts
│       │   ├── chest.ts
│       │   ├── contextMenu.ts
│       │   ├── crafting.ts
│       │   ├── hud.ts
│       │   ├── inventory.ts
│       │   └── tooltip.ts
│       ├── world/            # World, player, mob and structure rendering
│       ├── input.ts          # Keyboard input
│       └── main.ts           # Client entry point
│
├── server/
│   ├── prisma/
│   │   └── schema.prisma     # Character + world persistence
│   └── src/
│       ├── game/
│       │   ├── building.ts
│       │   ├── constants.ts
│       │   ├── inventory.ts
│       │   ├── map.ts
│       │   ├── mobs.ts
│       │   ├── recipes.ts
│       │   └── resources.ts
│       ├── handlers/
│       │   ├── building.ts
│       │   ├── chest.ts
│       │   ├── combat.ts
│       │   ├── craft.ts
│       │   ├── discard.ts
│       │   ├── harvest.ts
│       │   └── trade.ts
│       ├── rooms/            # World room + synchronized schemas
│       ├── app.config.ts
│       ├── db.ts
│       └── index.ts
│
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

You will need:

- **Node.js 20.9+**
- **pnpm**

Check your installed versions:

```bash
node --version
pnpm --version
```

### Clone

```bash
git clone https://github.com/Killer88967/mmorpg.git
cd mmorpg
```

### Install Dependencies

Install the entire workspace from the repository root:

```bash
pnpm install
```

This installs dependencies for both the `client` and `server` workspaces.

### Generate Prisma Client

```bash
pnpm db:gen
```

### Set Up the Database

From the server workspace:

```bash
cd server
pnpm prisma migrate dev
cd ..
```

### Start Development

Run both the client and server:

```bash
pnpm dev
```

Or start them independently:

```bash
pnpm client
```

```bash
pnpm server
```

The Vite development server will print the client URL in the terminal, typically:

```text
http://localhost:5173
```

## Development Commands

Run these commands from the repository root.

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Start the client and server together |
| `pnpm client`    | Start the Vite client                |
| `pnpm server`    | Start the Colyseus server            |
| `pnpm build`     | Build all workspaces                 |
| `pnpm typecheck` | Type-check all workspaces            |
| `pnpm db:gen`    | Generate the Prisma client           |

The server also includes a Colyseus load-testing script:

```bash
pnpm --filter server loadtest
```

## Controls

| Input           | Action                 |
| --------------- | ---------------------- |
| `W` `A` `S` `D` | Move                   |
| Arrow keys      | Move                   |
| `E`             | Harvest                |
| `Space`         | Attack                 |
| `C`             | Open / close crafting  |
| `I` or `B`      | Open / close inventory |
| `Enter`         | Open chat              |
| `Esc`           | Close the active menu  |

Building and several world interactions are mouse-driven.

Select a placeable block from the build hotbar and click a valid nearby tile to place it. A ghost preview indicates the target position.

## World & Progression

The world is currently a **32×32 tile map** containing terrain and resource nodes such as:

- Grass
- Water
- Paths
- Trees
- Rocks
- Ore
- Bushes
- Flint

The general progression loop is:

1. Gather **wood** and **flint** by hand.
2. Craft **sticks** and basic flint tools.
3. Use improved tools to gather **stone**.
4. Craft stone tools, walls, storage, and a furnace.
5. Mine ore and smelt it into **iron bars**.
6. Craft stronger iron tools and weapons.
7. Fight slimes and collect their drops.
8. Build and expand your own structures in the persistent shared world.
9. Trade resources and equipment with other players.

## Persistence

MMORPG currently persists both character and world information.

### Character Data

Stored per character:

- Character ID
- Name
- Position
- Color
- Inventory
- Tools

### World Data

Stored globally:

- Placed structures
- Chest inventories

SQLite is used locally through Prisma and the `better-sqlite3` adapter.

## Development Status

The project is experimental and under active development.

Some areas that may continue to evolve include:

- World generation
- Combat
- Mob variety
- Crafting progression
- Building
- Storage
- Character progression
- Multiplayer interaction
- UI/UX
- Persistence
- Server scalability

## License

This project is licensed under the [MIT License](LICENSE).
