# Installed tools, skills & security notes
_Last updated: 2026-11-13. Update this file whenever anything is installed, upgraded or removed._

## System (pre-existing, not modified)
| Tool | Version | Source |
|---|---|---|
| macOS | 26.6.2, Apple M1, 8 GB RAM | — |
| Node / npm | 22.22.2 / 10.9.7 | nvm (pinned via `.nvmrc`) |
| Python (base for venv) | 3.13.13 | Miniconda — **base env untouched** |
| FFmpeg / ffprobe | 9.0.1 | Homebrew. Has x264/x265/VideoToolbox/ProRes/VP9/SVT-AV1, loudnorm, lut3d. **Lacks libass/drawtext** → captions are rendered in Remotion/HyperFrames. |
| whisper-cpp | system | Homebrew (used by HyperFrames) |
| Chrome Headless Shell | 158.0.8127.2 | auto-downloaded by Remotion from remotion.dev into node_modules cache |

## Node (project-local, exact versions in package.json / package-lock.json)
remotion + @remotion/{cli,renderer,bundler,captions,transitions,media-utils,google-fonts,motion-blur,noise,paths,shapes,layout-utils,media} **4.0.543**, react/react-dom 19, hyperframes **0.9.41** (Apache-2.0), typescript 5, yaml 2.
Checked: none of these packages declare install/postinstall scripts.
**Licence note:** Remotion is free for individuals and companies of ≤3 people; larger companies need a paid Remotion company licence.

## Python (`.venv`, isolated)
faster-whisper 1.2 (CTranslate2, no torch), librosa, numpy, soundfile, opencv-python-headless, scenedetect, Pillow, python-dotenv, requests, pyyaml, jsonschema, pytest. Exact pins: `requirements.lock.txt`.
- `av` pinned `<16` — PyAV 16+ breaks faster-whisper 1.2 (`metadata_errors` kwarg).
- `pydub` removed — broken on Python 3.13 (no `audioop`).
- scenedetect pulls `opencv-python`; it was removed in favour of `opencv-python-headless` to avoid duplicate cv2/FFmpeg dylibs.
- Whisper model `small` cached in `./models/huggingface` (git-ignored, ~464 MB).

## Claude Code skills — project-scoped (`.claude/skills/`)
| Skill | Source @ commit | Licence | Review verdict |
|---|---|---|---|
| `remotion-best-practices` (+13 sub-skills) | remotion-dev/skills @ 7e541aa | Remotion licence | Markdown only; `agents/openai.yaml` stubs removed. Docs sub-skill fetches remotion.dev. |
| `cinematic-director` | wuwangzhang1216/DirectorSKILL @ c65ae0d | MIT | Markdown only, no network/code. Small maintainer. |
| `director-video` (renamed from `video`) | smixs/visual-skills @ 61a60d3 | **CC-BY-4.0 — attribution: Serge Shima** (NOTICE kept) | Markdown only. |
| `ffmpeg-skill` | kajisho5/ffmpeg-skill @ b448ebc | MIT | 47 stdlib-only Python scripts; grep found no network calls, `shell=True` or eval. Its MCP server, installer (`bin/install.js` → ~/.claude) and repo `.claude/settings.json` were **not** copied. Star count looks inflated; code quality is good. Broad trigger may compete with HyperFrames `media-use`. |
| `studio-*` (9) | written in-house | — | see `docs/PIPELINE.md` |

## Global skills (pre-existing in `~/.claude/skills`, not modified)
HyperFrames family (hyperframes, hyperframes-cli, -core, -animation, -creative, -keyframes, -registry, media-use, motion-graphics, embedded-captions, talking-head-recut, …) plus house-style motion skills (motion-doctrine, cut-the-curve, seam-craft, captions-overlay, oversized-cursor).
**Out of date** vs heygen-com/hyperframes @ f01209d (repo consolidated to 9 skills; `npx hyperframes check` reports 2 skills out of date). Upgrading touches `~/.claude` → requires user approval. Current repo skills call `npx hyperframes events` (telemetry) — disabled here via `HYPERFRAMES_NO_TELEMETRY=1` in `.claude/settings.json`.

## Evaluated and rejected
| Candidate | Why skipped |
|---|---|
| Melvynx/video-agent-skills (MIT) | `studio-setup` runs `curl … treg.to/install.sh \| sh`; ships ad-hoc-signed Mach-O binaries; writes to `~/video-editing`, `~/.cache`, `~/Library/Caches`; ~0.6 GB deps; overlaps HyperFrames. |
| jianshuo/claude-skills | personal grab-bag with cron scripts; subtitles covered elsewhere. |
| geegl/directorskills, Toni-xie/DirectorSkill | stale / no licence. |
| Sound-design skills found | none met the bar (UI-sound only, or tied to a paid service). Covered by in-house `studio-sound-designer`. |
| Local AI video/TTS/music models (Wan, Hunyuan, MusicGen, torch) | 8 GB RAM / disk — use cloud APIs instead. |
