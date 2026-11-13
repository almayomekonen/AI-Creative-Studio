---
name: studio-visual-identities
description: The studio's library of complete visual identities (Noir Luxe, Acid Volt, Ethereal Dawn, Swiss Precision, Chrome Y2K, Mono Brutal) — palette, typefaces, type behaviour, 3D stage/lighting, film finish, transition vocabulary and music mood — and how to create a new one. Use when choosing or designing the look of a production, or when a brand needs its own identity.
---

# Visual Identities

Defined in `remotion/src/engine/styles.ts`. A production picks one `style` id; every block (3D stages, type presets, montage colours, subtitles, endcard, film grain) reads from it, so the same engine yields different films.

| id | Mood | Type | Stage (DP setup) | Transitions | Music |
|---|---|---|---|---|---|
| `noir-luxe` | nocturnal, sensual | Anton caps + Instrument Serif | `noir`: warm glow card, mirror floor, rim sweep | flash, zoom | 120, minor pads |
| `acid-volt` | aggressive, electric | Archivo Black + Space Grotesk | `neon`: lime/magenta rims, glowing grid floor | glitch, portal, whip | 150, 16ths |
| `ethereal-dawn` | weightless, tender | Playfair italic | `dream`: pastel sky dome, coloured rims, float | portal, iris, zoom | 90, sus2 |
| `swiss-precision` | exact, rhythmic | Space Grotesk tight | `white`: infinity cove, contact shadow | iris, whip, cut | 120, ticks |
| `chrome-y2k` | glossy futurist | Archivo Black | `void`: coloured rims only | zoom, portal, glitch | 128 |
| `mono-brutal` | stark editorial | Anton + JetBrains Mono | `void` | cut, flash, glitch | 100, sparse |

## Make a new identity
1. Start from the brand: 1 background, 1 ink, 1 paper, 2 accents, a 2-stop glow. Check accent-on-bg contrast ≥ 3:1.
2. Two typefaces max (display + serif/body) from `@remotion/google-fonts` (free, embedded).
3. Pick the stage that matches the material story (glass → noir/dream, metal → neon/void, technical → white).
4. Choose 3 signature transitions and a BPM with an integer frames-per-beat at 30 fps.
5. Add it to `STYLES`, render a test spec through `commercial.mjs storyboard`, review the contact sheet.
