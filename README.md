# AI Creative Studio

A code-driven, AI-assisted video production studio: cinematic motion graphics, AI-generated scenes, talking-head and short-form editing, captions, music sync, automated QC and delivery.

```
IDEA → CONCEPT → SCRIPT → STORYBOARD → SHOT LIST → ASSETS → PRODUCTION
     → MOTION GRAPHICS → EDITING → SOUND DESIGN → QUALITY CONTROL → FINAL EXPORT
```

## Quick start
```bash
nvm use                 # Node 22
npm ci                  # Remotion 4 + HyperFrames CLI (pinned)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env    # optional: cloud AI keys
npm run doctor && npm test
npm run new -- "My First Film" --format vertical
```
Then ask Claude: *"run the studio pipeline on productions/<id>"*.

## Layout
| Path | What |
|---|---|
| `.claude/skills/` | 9 studio role skills + 4 vetted third-party skills |
| `remotion/src/lib/` | reusable motion library (camera, parallax, kinetic type, film look, captions, beat sync, transitions) |
| `remotion/src/compositions/` | `Showreel` (capability demo), `TalkingHead` (short-form edit template) |
| `hyperframes/` | HyperFrames (HTML/GSAP) projects |
| `scripts/py/` | transcribe (faster-whisper), beats (librosa), scenes (PySceneDetect), qc (ffprobe/EBU R128) |
| `scripts/pipeline/` | studio CLI, renderer, export presets, test-asset generator |
| `studio/` | brand kits, production templates, LUTs, fonts |
| `productions/` | one folder per job |
| `docs/` | installed tools & security notes, pipeline, roadmap |

See `docs/INSTALLED.md`, `docs/PIPELINE.md`, `docs/ROADMAP.md`.
