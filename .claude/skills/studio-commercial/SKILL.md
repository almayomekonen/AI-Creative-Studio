---
name: studio-commercial
description: Produce a complete 15–30 s commercial (native 9:16 first, also 1:1/16:9) with the studio's commercial engine — one JSON spec → rendered film + storyboard, shot list, camera & lighting direction, sound design, edit timeline (EDL), mobile safe-zone check and QC report. Use for any ad, promo, product film or teaser after the concept is chosen (studio-concept-engine).
---

# Commercial Production System

## Files
- Spec: `remotion/src/commercials/<id>.json` (type `CommercialSpec`, `remotion/src/engine/types.ts`); register it in `remotion/src/commercials/index.ts` → composition `Ad-<id>`.
- Engine: `remotion/src/engine/` — `Commercial.tsx` (timeline on the beat grid, overlaps, audio), `blocks.tsx`, `transitions.tsx`, `Type.tsx`, `styles.ts`, `format.ts`.
- Pipeline: `node scripts/pipeline/commercial.mjs <assets|docs|storyboard|render|all> <id|all>`.
- Output: `productions/ad-<id>/` — `00-brief`, `01-concept`, `02-script`, `03-storyboard` (+ `storyboard/contact-sheet.jpg`, `mobile-safe-check.jpg`), `04-direction`, `shotlist.yaml`, `05-sound-design`, `06-edit-timeline`, `qc-report.md`, `renders/<id>-9x16-final.mp4`.

## Blocks (scene types)
| block | what | key props |
|---|---|---|
| `product` | 3D product on a stage | `stage`, `camera {from,to,ease}` (orbit, dist **or** fill, height, lookY, lens), `motion {spin, float, drop, dropFrames, tilt}`, `dof:"auto"`, `bloom` |
| `shader` | GLSL world | `shader: surreal|tunnel|silk|gradient`, `palette: dawn|dusk`, `c0..c2` colours, `animate {uniform:[from,to]}` |
| `particles` | GPU particles | `text` or `path`, `from {path|text}` (shape→shape), `formAt`, `explodeAt` (beats), `turbulence`, colours, `background` |
| `chrome` | liquid metal | `tint`, `amp`, `dist`, `lookY` |
| `type` | plate for kinetic type | `background`, `grid`, `bars` |
| `montage` | one cut per beat | `words`, `shapes`, `backgrounds`, `beatsPerCut`, `size` |
| `endcard` | product + logo + tagline + CTA | `logoSize`, `logoColor`, `taglineColor`, `motion`, `withProduct` |
Every scene: `beats`, `transition` (cut, flash, whip, zoom, portal, glitch, iris), `text[]` (presets: slam, rise, blur, track, stack, typewriter, split, outline, glitch, giant; `pos` center/upper/lower/top/bottom; `at`/`until` in beats), `vfx[]` (shockwave, sparks, flash), `sfx[]`, and `direction` (intent, shot, camera, lens, lighting, sound, edit). Transition whooshes/glitches are added automatically.

## Procedure
1. Concept with `studio-concept-engine` → write the spec (pick an identity from `styles.ts`).
2. `commercial.mjs assets <id>` → score (synth), VO (Piper), script-exact captions.
3. `commercial.mjs storyboard <id>` → **look at `contact-sheet.jpg` and `mobile-safe-check.jpg`** (Read them). Fix and repeat until every scene passes:
   - hook frame striking at frame 0; every scene visually distinct; text readable (contrast, size ≥ 56 px at 1080 w for body, never on same-colour product parts); no text in red UI zones; products framed (use `fill` for aspect-correct framing; macro = 85 mm at real distance, not 2 units); no blown highlights; transitions land on beats.
   - For single frames: `npx remotion still remotion/src/index.ts Ad-<id> tmp/x.jpg --frame N --scale 0.4`.
4. `commercial.mjs docs <id>` then `render <id>` → master, normalized delivery, `qc.py` (must PASS), QC report.
5. Mark stages in `productions/ad-<id>/production.yaml`.

## Lessons baked in (from VOLT / ÉTHER / TEMPO)
- 9:16 width is narrow: 85 mm at dist 2–3 shows ~0.7 units across → pull back (9–12) for macro, or use `fill`.
- Black type never over a black product part; move type to `top` or reframe with a higher `lookY`.
- Subtitles get a translucent pill (light films need it); set `subtitle:false` on VO lines already shown as type; the endcard never shows subtitles.
- Hard-lit metal near camera blows out — use the `void` stage (rims only) for metal macros.
- Montage words need a stroke in the background colour — never `mix-blend-mode: difference` for copy.
