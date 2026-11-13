# AI Creative Studio — agent guide

Independent professional AI video production studio. **Unrelated to any other project (e.g. Social CRM) — never read or modify files outside this folder without asking.**

## How to work here
- Making a video? Use the **`studio-pipeline`** skill. It runs IDEA → CONCEPT → SCRIPT → STORYBOARD → SHOT LIST → ASSETS → PRODUCTION → MOTION → EDIT → SOUND → QC → EXPORT and routes to role skills:
  `studio-creative-director`, `studio-film-director`, `studio-storyboard-artist`, `studio-cinematographer`, `studio-motion-designer`, `studio-video-editor`, `studio-sound-designer`, `studio-quality-control`.
- Specialist skills (vetted, project-scoped): `cinematic-director`, `director-video` (AI video prompting), `remotion-best-practices`, `ffmpeg-skill`. HyperFrames skills are installed globally (`hyperframes`, `motion-graphics`, `embedded-captions`, …).
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

## Hard rules
- Python: only `.venv/bin/python` / `.venv/bin/pip`. **Never install into the Conda base env.**
- Secrets only in `.env` (git-ignored, read-denied for agents). Never print, hardcode or commit keys.
- **Never spend cloud credits** (fal, Replicate, ElevenLabs, HeyGen, OpenAI) without the user approving the shot list + cost estimate.
- Third-party skills/tools: inspect source, licence and install scripts before installing; record them in `docs/INSTALLED.md`.
- Machine is an 8 GB M1 with limited disk: render concurrency ≤ 2, no local diffusion/torch models, keep media out of git.
- Remotion code must be deterministic (frame-driven, `random(seed)`, no CSS transitions). Always look at a contact sheet of a render before calling it done; always run `qc.py`.
