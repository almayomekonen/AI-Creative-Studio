# AI Creative Studio — agent guide

Independent professional AI video production studio. **Unrelated to any other project (e.g. Social CRM) — never read or modify files outside this folder without asking.**

## How to work here
- Making a video? Use the **`studio-pipeline`** skill. It runs IDEA → CONCEPT → SCRIPT → STORYBOARD → SHOT LIST → ASSETS → PRODUCTION → MOTION → EDIT → SOUND → QC → EXPORT and routes to role skills:
  `studio-creative-director`, `studio-film-director`, `studio-storyboard-artist`, `studio-cinematographer`, `studio-motion-designer`, `studio-video-editor`, `studio-sound-designer`, `studio-quality-control`.
- Capability skills (procedural, all verified): `studio-3d-threejs`, `studio-glsl-shaders`, `studio-particles`, `studio-morph-transitions`, `studio-kinetic-typography`, `studio-procedural-audio`.
- Vetted third-party skills: `cinematic-director` (film language), `remotion-best-practices`, `ffmpeg-skill`. HyperFrames skills are global.
- **Commercials (Phase 3):** `studio-concept-engine` (ideas) → `studio-commercial` (spec → film + all production docs). Also `studio-visual-identities`, `studio-vfx`. Engine in `remotion/src/engine/`, specs in `remotion/src/commercials/*.json`, pipeline `node scripts/pipeline/commercial.mjs <assets|docs|storyboard|render|all> <id>`, outputs in `productions/ad-<id>/`.
- Reference production: `remotion/src/reel/Reel.tsx` — "Written in Light" demo reel (assets: `bash scripts/pipeline/build-reel-assets.sh`).
- Productions live in `productions/<date-slug>/` — `npm run new -- "Title"`, `npm run status`, `npm run validate -- <id>`.

## Commands
| | |
|---|---|
| `npm run doctor` | environment health |
| `npm test` (`FAST=1 npm test`) | full suite incl. renders (~1 min) |
| `npm run studio` | Remotion Studio preview |
| `node scripts/pipeline/render-remotion.mjs <Comp> <out> [--props f.json]` | render |
| `bash scripts/pipeline/export.sh <in> <preset> <out> --normalize` | deliver |
| `.venv/bin/python scripts/py/{transcribe,beats,scenes,qc}.py` | captions, beat map, shot detection, QC |
| `.venv/bin/python scripts/py/{synth,sfx,tts,align_captions}.py` | procedural music, SFX, Piper VO, script-aligned captions |
| `npx remotion still remotion/src/index.ts Lab-<X> tmp/x.jpg --frame N --scale 0.5` | iterate on a 3D/shader look (Lab-Surreal, Lab-Liquid, Lab-Particles, Lab-Product, Lab-Morph, Lab-Gsap, Lab-Gradient) |

## Hard rules
- Python: only `.venv/bin/python` / `.venv/bin/pip`. **Never install into the Conda base env.**
- Secrets only in `.env` (git-ignored, read-denied for agents). Never print, hardcode or commit keys.
- **Strategy: free & open-source only.** No paid AI generation (Kling, Runway, Veo, Replicate, fal, ElevenLabs, HeyGen…), no subscriptions, no spending. Build visuals procedurally (Three.js, GLSL, particles, SVG, GSAP, Remotion/HyperFrames) and audio procedurally (synth.py, sfx.py, Piper tts.py).
- No heavyweight local AI models (no torch/diffusion). Small tools only: Whisper small (~460 MB), Piper voices (~60 MB each).
- Third-party skills/tools: inspect source, licence and install scripts before installing; record them in `docs/INSTALLED.md`.
- Machine is an 8 GB M1 with limited disk: render concurrency ≤ 2, no local diffusion/torch models, keep media out of git.
- Remotion code must be deterministic (frame-driven, `random(seed)`, no CSS transitions). Always look at a contact sheet of a render before calling it done; always run `qc.py`.
