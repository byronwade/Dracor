# Ambience

Environmental ambient sound beds and weather effects. These loop continuously and layer on top of each other.

```
ambience/
  zones/       Per-zone ambient beds (forest, town, dungeon)
  weather/     Weather overlay sounds (rain, wind, thunder)
```

## Zone Ambience

Each zone has a base ambient bed that plays whenever the player is in that area:

| File | Zone | Description |
|------|------|-------------|
| `amb_ironvale_outskirts.ogg` | Ironvale Outskirts | Dark pine forest: distant birds, rustling leaves, creaking wood, faint wind |
| `amb_ironvale_town.ogg` | Ironvale Town | Distant chatter, anvil strikes, creaking signs, footsteps |
| `amb_cave.ogg` | Generic Cave | Dripping water, echoing space, distant rumbles |
| `amb_dungeon.ogg` | Generic Dungeon | Chains, distant growls, musty air, stone echoes |

## Weather

Weather sounds layer on top of zone ambience:

| File | Loop | Description |
|------|------|-------------|
| `weather_rain_light.ogg` | Yes | Light rain pattering |
| `weather_rain_heavy.ogg` | Yes | Heavy downpour |
| `weather_wind_light.ogg` | Yes | Gentle breeze |
| `weather_wind_heavy.ogg` | Yes | Strong gusts |
| `weather_thunder_01-03.ogg` | No | Thunder claps (one-shot, randomized) |
| `weather_snow.ogg` | Yes | Muffled snowfall ambience |
