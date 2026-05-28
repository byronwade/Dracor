# Audio

All game audio in OGG Vorbis format. The game uses Howler.js for playback.

```
audio/
  music/           Background music tracks
    exploration/   Open-world zone music
    combat/        Battle encounter music
    town/          Safe zone / town music
    menu/          Main menu, character select
  sfx/             Sound effects
    combat/        Weapon swings, impacts, spells
    footsteps/     Per-terrain-type footstep sets
    ui/            Button clicks, notifications, transitions
    items/         Pickup, drop, equip, consume sounds
    abilities/     Skill activation, cooldown, Dragon Memory
  ambience/        Environmental ambient loops
    zones/         Per-zone ambient beds
    weather/       Rain, wind, thunder, snow
  voice/           Character voice lines
    player/        Grunts, effort, pain, death
    npcs/          NPC dialogue lines
    enemies/       Enemy aggro, attack, death sounds
```

## Format Requirements

| Type | Format | Channels | Bitrate | Max Size |
|------|--------|----------|---------|----------|
| Music | OGG | Stereo | 128-192 kbps | 3 MB |
| SFX | OGG | Mono | 96-128 kbps | 200 KB |
| Ambience | OGG | Stereo | 128 kbps | 5 MB |
| Voice | OGG | Mono | 96 kbps | 500 KB |

## Naming Convention

`{category}_{description}_{variant}.ogg`

Examples: `swing_sword_01.ogg`, `footstep_stone_03.ogg`, `music_ironvale_explore.ogg`

## Looping

Music and ambience tracks must loop seamlessly. Ensure the start and end waveforms match to avoid pops/clicks. Mark loop points with metadata if supported.
