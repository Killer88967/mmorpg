# MMORPG Roadmap

This roadmap outlines the planned development of the **MMORPG** project, a multiplayer game built with **PixiJS**, **Colyseus**, and **TypeScript**.

> [!NOTE]
> This roadmap is not a strict release schedule. Features may be reordered, changed, expanded, or removed as development continues.

## Current Focus

The current priority is strengthening the multiplayer foundation, improving the client architecture, and building the core systems needed for actual gameplay.

### Foundation

- [x] TypeScript client
- [x] TypeScript server
- [x] PixiJS rendering
- [x] Colyseus multiplayer server
- [x] Shared world state
- [x] Client/server connection
- [x] Basic player synchronization
- [x] Item type foundation
- [x] Recipe type foundation
- [x] Chat UI foundation
- [ ] Clean up remaining TypeScript errors
- [ ] Improve shared client/server types
- [ ] Improve connection error handling
- [ ] Improve reconnect handling
- [ ] Organize client systems into reusable modules

## Player

- [ ] Player spawning
- [ ] Player movement
- [ ] Server-authoritative movement
- [ ] Player names
- [ ] Player appearance
- [ ] Player stats
- [ ] Health
- [ ] Mana / energy
- [ ] Experience
- [ ] Levels
- [ ] Death
- [ ] Respawning
- [ ] Player interaction
- [ ] Basic character customization

## World

- [ ] World map foundation
- [ ] Tile / terrain system
- [ ] Collision system
- [ ] Multiple map areas
- [ ] Area transitions
- [ ] Spawn points
- [ ] Interactive world objects
- [ ] Resource nodes
- [ ] Day / night cycle
- [ ] World object synchronization
- [ ] Server-controlled world state

## Multiplayer

- [x] Colyseus server foundation
- [x] Shared `WorldState`
- [ ] Player join synchronization
- [ ] Player leave synchronization
- [ ] Reliable entity synchronization
- [ ] Room lifecycle handling
- [ ] Reconnection support
- [ ] Server tick handling
- [ ] Server-side validation
- [ ] Server-authoritative gameplay actions
- [ ] Interest management for nearby entities
- [ ] Multiple game rooms / zones

## Items

- [x] Item type foundation
- [ ] Item database
- [ ] Item IDs
- [ ] Item rarities
- [ ] Item categories
- [ ] Stackable items
- [ ] Item metadata
- [ ] Item stats
- [ ] Item descriptions
- [ ] Item icons
- [ ] Dropped world items
- [ ] Item pickup
- [ ] Item dropping

## Inventory

- [ ] Player inventory
- [ ] Inventory slots
- [ ] Item stacking
- [ ] Move items between slots
- [ ] Split stacks
- [ ] Drop items
- [ ] Use items
- [ ] Inventory UI
- [ ] Inventory synchronization
- [ ] Server-side inventory validation

## Equipment

- [ ] Equipment slots
- [ ] Weapons
- [ ] Armor
- [ ] Accessories
- [ ] Equip / unequip items
- [ ] Equipment stats
- [ ] Equipment UI
- [ ] Equipment synchronization

## Crafting

- [x] Recipe type foundation
- [ ] Recipe database
- [ ] Recipe requirements
- [ ] Crafting stations
- [ ] Crafting UI
- [ ] Crafting validation
- [ ] Crafting time
- [ ] Server-authoritative crafting
- [ ] Unlockable recipes

## Combat

- [ ] Basic attacks
- [ ] Damage system
- [ ] Defense
- [ ] Critical hits
- [ ] Attack speed
- [ ] Attack range
- [ ] Combat targeting
- [ ] Player vs. enemy combat
- [ ] Player vs. player foundation
- [ ] Status effects
- [ ] Death rewards / penalties
- [ ] Server-authoritative combat

## Skills & Abilities

- [ ] Skill database
- [ ] Active abilities
- [ ] Passive abilities
- [ ] Cooldowns
- [ ] Mana / resource costs
- [ ] Skill targeting
- [ ] Area-of-effect abilities
- [ ] Status effects
- [ ] Skill hotbar
- [ ] Skill progression

## Enemies

- [ ] Enemy entity foundation
- [ ] Enemy database
- [ ] Enemy spawning
- [ ] Enemy stats
- [ ] Enemy movement
- [ ] Basic AI
- [ ] Aggro system
- [ ] Enemy attacks
- [ ] Enemy death
- [ ] Experience rewards
- [ ] Item drops
- [ ] Respawning enemies

## NPCs

- [ ] NPC entity foundation
- [ ] NPC interaction
- [ ] Dialogue system
- [ ] Shops
- [ ] Quest NPCs
- [ ] NPC names
- [ ] NPC movement
- [ ] NPC synchronization

## Quests

- [ ] Quest database
- [ ] Quest objectives
- [ ] Quest progress
- [ ] Quest rewards
- [ ] Quest prerequisites
- [ ] Quest chains
- [ ] Quest log
- [ ] NPC quest markers
- [ ] Server-side quest validation

## UI

- [x] Chat foundation
- [ ] Improve chat
- [ ] HUD
- [ ] Health bar
- [ ] Mana / resource bar
- [ ] Experience bar
- [ ] Player information
- [ ] Inventory window
- [ ] Equipment window
- [ ] Crafting window
- [ ] Character window
- [ ] Quest log
- [ ] Skill bar
- [ ] Tooltips
- [ ] Context menus
- [ ] Settings menu

## Chat & Social

- [x] Chat UI foundation
- [ ] Global chat
- [ ] Local chat
- [ ] Private messages
- [ ] System messages
- [ ] Chat commands
- [ ] Player list
- [ ] Friends
- [ ] Parties
- [ ] Party chat
- [ ] Guild foundation

## Persistence

- [ ] Player accounts
- [ ] Character persistence
- [ ] Inventory persistence
- [ ] Equipment persistence
- [ ] Quest persistence
- [ ] Skill persistence
- [ ] Player position persistence
- [ ] Database integration
- [ ] Autosaving
- [ ] Safe disconnect saving

## Security

Because the game is multiplayer, important gameplay decisions should remain authoritative on the server.

- [ ] Validate movement
- [ ] Validate inventory actions
- [ ] Validate item usage
- [ ] Validate crafting
- [ ] Validate combat
- [ ] Validate currency changes
- [ ] Rate-limit client messages
- [ ] Reject malformed messages
- [ ] Prevent duplicate item operations
- [ ] Improve server-side logging

## Developer Experience

- [x] pnpm workspace
- [x] Separate client and server packages
- [x] TypeScript type checking
- [ ] Shared TypeScript configuration
- [ ] Shared game types package
- [ ] Formatting checks
- [ ] Linting
- [ ] Unit tests
- [ ] Server tests
- [ ] Multiplayer integration tests
- [ ] CI workflow
- [ ] Development logging improvements
- [ ] Environment configuration documentation

## Performance

- [ ] Reduce unnecessary network updates
- [ ] Batch state updates where appropriate
- [ ] Optimize PixiJS rendering
- [ ] Entity culling
- [ ] Optimize large player counts
- [ ] Optimize world object synchronization
- [ ] Reduce unnecessary allocations
- [ ] Profile client performance
- [ ] Profile server performance

## Longer-Term Ideas

These are possible future systems rather than immediate priorities.

- [ ] Guilds
- [ ] Trading
- [ ] Player shops
- [ ] Auction house
- [ ] Parties
- [ ] Dungeons
- [ ] Bosses
- [ ] Raids
- [ ] PvP areas
- [ ] Professions
- [ ] Farming
- [ ] Fishing
- [ ] Housing
- [ ] Pets
- [ ] Mounts
- [ ] Achievements
- [ ] Titles
- [ ] World events
- [ ] Seasonal events
- [ ] Multiple regions / servers

## Principles

Development should continue to prioritize:

1. **Server authority** — important gameplay state should be validated and controlled by the server.
2. **Shared types** — the client and server should share strongly typed game structures wherever practical.
3. **Modular systems** — inventory, combat, crafting, quests, entities, and other systems should remain independent and reusable.
4. **Performance** — networking and rendering should scale without sending or processing unnecessary data.
5. **Maintainability** — new gameplay systems should build on clear foundations instead of accumulating tightly coupled logic.
6. **Playable progress** — prioritize systems that move the project toward a functional multiplayer gameplay loop.

---

The MMORPG is actively developed and this roadmap will evolve alongside the game.
