# Terrain Texture Download Checklist

Download PBR texture sets from the sites below. For each texture, download the **1K** resolution in **JPG** or **PNG**, then convert to **WebP** (or just rename if the site offers WebP).

Most sites give you a ZIP with multiple maps. You need: **Color/Albedo**, **Normal (OpenGL)**, and **ARM** (or separate AO + Roughness + Metallic). If no ARM file exists, use the Roughness map renamed as the ARM file.

---

## 1. Forest Floor (primary ground texture)

**Search:** "forest floor" or "forest ground" on ambientCG

**Site:** https://ambientcg.com/list?q=forest+floor

Download any forest floor texture (e.g., "Forest Floor 006" or similar). Rename files to:

| Downloaded File | Rename To |
|----------------|-----------|
| *_Color.jpg | `forest_floor_albedo.webp` |
| *_NormalGL.jpg | `forest_floor_normal.webp` |
| *_Roughness.jpg | `forest_floor_arm.webp` |

---

## 2. Grass

**Search:** "grass" on ambientCG

**Site:** https://ambientcg.com/list?q=grass

Download a natural grass texture. Rename:

| Downloaded File | Rename To |
|----------------|-----------|
| *_Color.jpg | `grass_albedo.webp` |
| *_NormalGL.jpg | `grass_normal.webp` |
| *_Roughness.jpg | `grass_arm.webp` |

---

## 3. Rock

**Search:** "rock" or "stone" on ambientCG

**Site:** https://ambientcg.com/list?q=rock

Download a dark rock texture. Rename:

| Downloaded File | Rename To |
|----------------|-----------|
| *_Color.jpg | `rock_albedo.webp` |
| *_NormalGL.jpg | `rock_normal.webp` |
| *_Roughness.jpg | `rock_arm.webp` |

---

## 4. Dirt Path

**Search:** "dirt" or "ground dirt" on ambientCG

**Site:** https://ambientcg.com/list?q=ground+dirt

Download a dirt/earth texture. Rename:

| Downloaded File | Rename To |
|----------------|-----------|
| *_Color.jpg | `dirt_albedo.webp` |
| *_NormalGL.jpg | `dirt_normal.webp` |
| *_Roughness.jpg | `dirt_arm.webp` |

---

## 5. Water Normal Map

**Search:** "water normal" on Poly Haven or use any tileable water normal map

**Site:** https://polyhaven.com/textures?s=water

You only need the **Normal map** (not the full PBR set). Rename:

| Downloaded File | Rename To |
|----------------|-----------|
| *_nor_gl_1k.png | `water_normal.webp` |

If you can't find a standalone water normal, search Google Images for "seamless water normal map" and download any 512x512 or 1024x1024 blue/purple normal map image.

---

## Converting to WebP

If the downloaded files are JPG/PNG, convert with any of these:

**macOS (built-in):**
```bash
# Install cwebp if needed: brew install webp
for f in *.jpg *.png; do cwebp -q 90 "$f" -o "${f%.*}.webp"; done
```

**Or just rename** — the code will load JPG/PNG too, but WebP is smaller and faster.

---

## Final File List

After downloading, this folder should contain:

```
textures/terrain/
  forest_floor_albedo.webp
  forest_floor_normal.webp
  forest_floor_arm.webp
  grass_albedo.webp
  grass_normal.webp
  grass_arm.webp
  rock_albedo.webp
  rock_normal.webp
  rock_arm.webp
  dirt_albedo.webp
  dirt_normal.webp
  dirt_arm.webp
  water_normal.webp
```

Total: 13 files. Each should be under 500 KB at 1K resolution in WebP.
