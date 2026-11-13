# Phase 3 — Advanced Creative Production (2026-11-13)

## What exists
- **Commercial engine** (`remotion/src/engine/`): one JSON spec → finished commercial. Beat-grid timeline (music and edit share one clock), real overlapping transitions, 7 scene blocks, 10 kinetic type presets, VFX, automatic transition sound design, script-exact subtitles with legibility pill.
- **Native vertical**: `useFormat()` (width-based units, platform safe zones), `fitDistance()` aspect-correct 3D framing, particle text that fits the frame width, subtitles above the 9:16 UI zone.
- **3D product library**: 5 procedural products × 5 lighting stages × keyframed cameras with lens choice, DOF, bloom, reflections.
- **VFX**: portal reveal, star-iris morph, glitch, whip, zoom-through, flash, shockwave, sparks, particle transformations (shape → shape), voltage tunnel, liquid silk, liquid chrome, glass.
- **6 visual identities** (`styles.ts`).
- **Creative direction system**: `studio-concept-engine` skill + `lint-commercial.mjs` (enforces hook, ≥4 distinct scenes, ≥2 unexpected transitions, endcard, concept score ≥24/30, full direction per shot).
- **Production docs generated from the spec** for every film: brief, concept (routes + scores), A/V script, storyboard (rendered frames), camera & lighting direction, shot list, sound design (score sections, VO, SFX cue sheet), edit timeline (EDL with text and VFX events), QC report, mobile safe-zone sheet.

## The three commercials (9:16, 1080×1920)
| Film | Identity | Product | Length | Concept | Signature moves |
|---|---|---|---|---|---|
| **VOLT — Crack the Night Open** | Acid Volt | energy can | 19.8 s | The ring-pull crack is a portal into voltage | macro hook + CRACK slam & sparks → portal → voltage tunnel → bolt melts into VOLT → beat montage → can lands like a meteor (shockwave) → spark button |
| **ÉTHER — Wear the Dream** | Ethereal Dawn | prism fragrance | 22 s | A scent is a place you can't visit — so we built it | silk hook → iris → floating bottle → portal into a dawn colonnade → bottle dissolves into the name → pearl stopper macro → portal lockup |
| **TEMPO — Every Second Has a Beat** | Swiss Precision | watch | 18.5 s | The edit is the movement | ticking-hand macro hook → "60" outline fill → one-word-per-beat life montage → iris reveal of the watch → black "Now." particle turn → white lockup |

Rebuild any: `node scripts/pipeline/commercial.mjs all <id>`. Review: `productions/ad-<id>/storyboard/*.jpg`.

## Quality loop actually run
Each film went through storyboard → visual review → fixes → re-render. Issues found and fixed included: unreadable can-top macro (rebuilt ring-pull, moved to rim-only stage, raised camera), invisible montage copy (difference blend → stroked type), pale subtitles (pill), duplicate subtitles (subtitle:false + no subtitles on endcards), stopper macro framed at 2 units in 9:16 (pulled to 10–11 units at 85 mm), claims type over a black strap (reframed + shorter straps), logo/product collisions on endcards (framing rule). 
