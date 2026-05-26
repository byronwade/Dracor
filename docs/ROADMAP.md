# Roadmap

## Milestone 0 — Foundation (Current)

**Status:** In progress

- Project scaffold with Turborepo monorepo
- Supabase auth integration (sign up, log in)
- Character creation flow (name, weapon, memory selection)
- Colyseus game server with WorldRoom
- Basic 3D scene with Babylon.js (ground plane, environment)
- Multiplayer movement synchronization
- Real-time chat between connected players
- Server-authoritative position validation

**Done when:** Two players can connect, see each other move, and chat in a shared 3D world.

## Milestone 1 — Contracts and NPCs

- Contract board UI in the game client
- Contract data persisted to Supabase (accepted, in-progress, completed)
- Starter NPCs visible as static meshes in town zone
- Simple interaction prompts (walk near NPC, press key to interact)
- Mara Vale offers "Clear the Old Road" contract
- Orin Ash offers "Ironbark for the Forge" contract
- Renn offers "The Surveyor's Tools" contract

**Done when:** A player can walk to the town hall, accept a contract, and see its progress tracked.

## Milestone 2 — Basic Combat

- Enemy spawn system (wolves on the Old Road)
- Health and damage system (player HP, enemy HP)
- Basic attack action (weapon-dependent animation and hitbox)
- Enemy AI: idle, aggro on proximity, chase, attack, return to patrol
- Death and respawn (player returns to town on death, enemies respawn after a timer)
- Combat feedback (damage numbers, hit effects, health bar UI)

**Done when:** A player can fight wolves on the Old Road, take damage, and kill or be killed.

## Milestone 3 — Loot and Progression

- Loot drops from enemies (items added to inventory on kill)
- Inventory system (view items, equip gear, manage storage)
- Item rewards from contract completion
- XP gain from kills and contract completion
- Level progression (XP thresholds, stat increases per level)
- Level-gated contract tiers unlock as player advances

**Done when:** Completing "Clear the Old Road" gives XP, a loot item, and brings the player closer to level 2.

## Milestone 4 — First Public Event

- Timed server-wide event: "Defend Ironvale's East Gate"
- Wave-based enemy spawns at the eastern gate
- All connected players can participate
- Cooperative — no competition between players
- Rewards based on participation (damage dealt, time spent, healing done)
- Event has lore significance (bandits testing Ironvale's defenses)

**Done when:** Multiple players fight waves of enemies together and receive participation rewards.

## Milestone 5 — Reputation and Deeds

- Reputation system (earn rep with Ironvale by completing contracts and events)
- Reputation tiers unlock new vendor items and dialogue
- Player deeds: public achievements recorded permanently
- Deed board in town shows recent accomplishments by all players
- "First to complete" deeds for unique contracts
- Deeds visible on player inspection

**Done when:** The deed board in town shows "Cleared the Old Road — Ashara" and players can inspect each other's deeds.

## Milestone 6 — Housing and Social Expression

- Personal player space (instanced room accessible from town)
- Cosmetic furnishing system (place items in your room)
- Furniture earned from contracts, events, and vendors
- Visitors can enter your space (opt-in)
- Social emotes and expressions in the overworld
- Character customization options (cosmetic armor skins)

**Done when:** A player can enter their personal space, place furniture, and invite another player to visit.
