# Voice Audio

Character voice lines for player, NPCs, and enemies.

```
voice/
  player/      Effort grunts, pain, death — no dialogue
  npcs/        Named NPC dialogue lines
  enemies/     Aggro shouts, attack grunts, death
```

## Player Voice

Non-verbal only. Short effort sounds per action:

| File | Description |
|------|-------------|
| `grunt_attack_01-03.ogg` | Attack effort |
| `grunt_heavy_01-02.ogg` | Heavy attack effort |
| `pain_light_01-03.ogg` | Taking light damage |
| `pain_heavy_01-02.ogg` | Taking heavy damage |
| `death_01-02.ogg` | Death vocalization |
| `jump_01-02.ogg` | Jump effort |
| `dodge_01-02.ogg` | Dodge effort |
| `land_heavy.ogg` | Hard landing |

## NPC Voice

Organized by NPC name. Each NPC folder contains their dialogue lines:

`npcs/{npc_name}/{line_id}.ogg`

Example: `npcs/orin_ash/greeting_01.ogg`

## Enemy Voice

| File | Description |
|------|-------------|
| `aggro_{enemy}_01-02.ogg` | Spotting the player |
| `attack_{enemy}_01-03.ogg` | During attack |
| `death_{enemy}_01-02.ogg` | Dying |
| `idle_{enemy}_01-02.ogg` | Ambient idle sounds |
