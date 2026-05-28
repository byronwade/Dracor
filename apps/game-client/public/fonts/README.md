# Fonts

Game UI fonts in WOFF2 format. These are loaded by the game's DOM-based HUD overlays.

## Needed Fonts

| Usage | Style | Examples |
|-------|-------|---------|
| Display / Headers | Fantasy serif, medieval feel | Cinzel, MedievalSharp, Almendra |
| Body text / Chat | Clean sans-serif, highly readable | Inter, Source Sans Pro |
| Numbers / Stats | Monospace or tabular figures | JetBrains Mono, IBM Plex Mono |
| Damage numbers | Bold, impact-style | Oswald, Anton |

## Guidelines

- WOFF2 only (best compression for web)
- Subset to ASCII + common Latin characters to reduce file size
- Keep each font file under 200 KB
- Name files: `{font_name}_{weight}.woff2` — e.g., `cinzel_bold.woff2`, `inter_regular.woff2`
