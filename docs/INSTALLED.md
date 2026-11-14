# Installed tools, skills & security notes
_Last updated: 2026-11-14 (cloud/Linux setup — see CLOUD.md; previously 2026-11-13 strategy change: free & open-source only — see STRATEGY.md). Update this file whenever anything is installed, upgraded or removed._

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
**3D/animation (added):** three **0.187.0**, @react-three/fiber **9.8.2**, @remotion/three **4.0.543**, gsap **3.15.1** (Standard no-charge licence), flubber **0.4.2**, @types/three. None have install scripts.
Checked: none of these packages declare install/postinstall scripts.
**Licence note:** Remotion is free for individuals and companies of ≤3 people; larger companies need a paid Remotion company licence.

## Python (`.venv`, isolated)
faster-whisper 1.2 (CTranslate2, no torch), **piper-tts 1.8.0** (GPL-3.0 tool; deps onnxruntime + pathvalidate — now pinned in both `requirements.txt` and `requirements.lock.txt`), librosa, numpy, soundfile, opencv-python-headless, scenedetect, Pillow, python-dotenv, requests, pyyaml, jsonschema, pytest. Exact pins: `requirements.lock.txt`.
- `av` pinned `<16` — PyAV 16+ breaks faster-whisper 1.2 (`metadata_errors` kwarg).
- `pydub` removed — broken on Python 3.13 (no `audioop`).
- scenedetect pulls `opencv-python`; it was removed in favour of `opencv-python-headless` to avoid duplicate cv2/FFmpeg dylibs.
- Whisper model `small` cached in `./models/huggingface` (git-ignored, ~464 MB).
- Piper voices `en_US-ryan-medium`, `en_US-lessac-medium` in `./models/piper` (~63 MB each) from the official rhasspy/piper-voices repo via `piper.download_voices`.

## Cloud sessions (Linux, temporary) — added 2026-11-14
Claude Code cloud container: Ubuntu 24.04 x86_64, 4 CPU, ~15 GB RAM, no GPU. **Temporary:** every new session is a fresh clone, so `node_modules/`, `.venv/`, `models/` and renders must be recreated — `bash scripts/cloud-setup.sh` (see `docs/CLOUD.md`).
| Item | Version / source | Notes |
|---|---|---|
| System (pre-installed, not modified) | Node 22.23 / npm 10.9, Python 3.13, FFmpeg 6.1.1 (Ubuntu, **has libass/drawtext**), git-lfs, ImageMagick 6, Chrome for Testing in `/opt/pw-browsers` | No sox/Blender/yt-dlp (not needed, not installed) |
| Node deps | `npm ci` from `package-lock.json` | identical to Mac |
| Remotion headless Chrome | `npx remotion browser ensure` → `node_modules/.remotion` (from remotion.dev) | |
| `.venv` | `requirements.lock.txt`, then `opencv-python` (pulled by scenedetect) removed and `opencv-python-headless` force-reinstalled — same as Mac | `pip freeze` == lockfile |
| Piper voice | **`en_US-ryan-medium` only** (~63 MB, rhasspy/piper-voices via `piper.download_voices`) | `cloud-setup.sh --piper-voice`; no other voices without approval |
| Whisper small | Systran/faster-whisper-small (~464 MB) | not downloaded at startup; `transcribe.py` downloads once on demand if not cached (`STUDIO_NO_MODEL_DOWNLOAD=1` forbids) |
| Remotion GL | `swangle` on GPU-less Linux (`remotion.config.ts`) | `angle` and `swiftshader` fail to create WebGL contexts there |

**Fixed lockfile bug (2026-11-14):** `requirements.lock.txt` pinned `av==19.0.2`, contradicting `requirements.txt` (`av<16`). With 19.0.2 every transcription failed (`av.open() got an unexpected keyword argument 'metadata_errors'`), which broke the `transcribe` and `piper-tts` tests on a clean install. The lock now pins `av==15.1.0` (newest <16); both tests pass. `pip check` reports `scenedetect requires opencv-python` — expected, since only the headless build is kept.

## Claude Code skills — project-scoped (`.claude/skills/`)
| Skill | Source @ commit | Licence | Review verdict |
|---|---|---|---|
| `remotion-best-practices` (+13 sub-skills) | remotion-dev/skills @ 7e541aa | Remotion licence | Markdown only; `agents/openai.yaml` stubs removed. Docs sub-skill fetches remotion.dev. |
| `cinematic-director` | wuwangzhang1216/DirectorSKILL @ c65ae0d | MIT | Markdown only, no network/code. Small maintainer. |
| `ffmpeg-skill` | kajisho5/ffmpeg-skill @ b448ebc | MIT | 47 stdlib-only Python scripts; grep found no network calls, `shell=True` or eval. Its MCP server, installer (`bin/install.js` → ~/.claude) and repo `.claude/settings.json` were **not** copied. Star count looks inflated; code quality is good. Broad trigger may compete with HyperFrames `media-use`. |
| `studio-*` role skills (9) | in-house | — | see `docs/PIPELINE.md` |
| `studio-*` capability skills (6): 3d-threejs, glsl-shaders, particles, morph-transitions, kinetic-typography, procedural-audio | in-house | — | see `docs/STRATEGY.md` |

**Removed:** `director-video` (smixs/visual-skills) — it exists to prompt paid AI video generators, which the studio no longer uses.

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
| Local AI video/music models (Wan, Hunyuan, MusicGen, torch) | 8 GB RAM / disk. Replaced by procedural generation. |
| Paid generation (Kling, Runway, Veo, Replicate, fal, ElevenLabs, HeyGen cloud) | Studio policy since 2026-11-13: no paid AI generation. |
