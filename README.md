# AI Creative Studio

A code-driven video production studio built entirely on free & open-source technology: procedural 3D (Three.js), GLSL shader worlds, GPU particles, morphing, kinetic typography (GSAP), procedural music & SFX, local TTS (Piper), Whisper captions, automated QC and delivery. No paid AI generation.

**Demo reel:** `remotion/src/reel/Reel.tsx` → `npx remotion render remotion/src/index.ts Reel-WrittenInLight out.mp4` (after `bash scripts/pipeline/build-reel-assets.sh`).

```
IDEA → CONCEPT → SCRIPT → STORYBOARD → SHOT LIST → ASSETS → PRODUCTION
     → MOTION GRAPHICS → EDITING → SOUND DESIGN → QUALITY CONTROL → FINAL EXPORT
```

## Quick start
```bash
nvm use                 # Node 22
npm ci                  # Remotion 4 + HyperFrames CLI (pinned)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
npm run doctor && npm test
npm run new -- "My First Film" --format vertical
```
Then ask Claude: *"run the studio pipeline on productions/<id>"*.

## Layout
| Path | What |
|---|---|
| `.claude/skills/` | 9 studio role skills + 6 capability skills + 3 vetted third-party skills |
| `remotion/src/three/` | Three.js + GLSL: ProductStage, LiquidChrome, ParticleMorph, ShaderCanvas (SURREAL_WORLD, LIQUID_GRADIENT), Bloom, Lab benches |
| `remotion/src/reel/` | "Written in Light" demo reel + its timing/music spec |
| `remotion/src/lib/` | reusable motion library (camera, parallax, kinetic type, film look, captions, beat sync, transitions) |
| `remotion/src/compositions/` | `Showreel` (capability demo), `TalkingHead` (short-form edit template) |
| `hyperframes/` | HyperFrames (HTML/GSAP) projects |
| `scripts/py/` | synth (procedural music), sfx, tts (Piper), align_captions, transcribe (faster-whisper), beats (librosa), scenes (PySceneDetect), qc (ffprobe/EBU R128) |
| `scripts/pipeline/` | studio CLI, renderer, export presets, test-asset generator |
| `studio/` | brand kits, production templates, LUTs, fonts |
| `productions/` | one folder per job |
| `docs/` | installed tools & security notes, pipeline, roadmap |

See `docs/INSTALLED.md`, `docs/PIPELINE.md`, `docs/ROADMAP.md`.
