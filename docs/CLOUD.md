# Working from the cloud (Claude Code on the web / iPad)

Routine studio work runs in Claude Code cloud sessions, so an iPad (or any browser) is enough —
the Mac is only needed for heavy final renders if CPU rendering is too slow.

Cloud sessions run on a temporary Linux container (Ubuntu 24.04, x86_64, 4 CPU, ~15 GB RAM,
**no GPU**). The repository is cloned fresh at the start of every session.

## Personal cloud environment: `AI-Creative-Studio`
A dedicated **personal** environment (not the shared Default environment), linked to
`almayomekonen/AI-Creative-Studio`. Choose it when starting a session.

**Setup script** (runs as root before Claude starts, from the directory that holds the checkout):
```bash
if [ -f AI-Creative-Studio/scripts/cloud-setup.sh ]; then
  (cd AI-Creative-Studio && bash scripts/cloud-setup.sh --piper-voice)
else
  echo "cloud-setup.sh not on this branch - skipping studio setup"
fi
```
It runs `scripts/cloud-setup.sh --piper-voice`: `npm ci`, Remotion's headless Chrome, the
project `.venv` from `requirements.lock.txt`, and the Piper voice `en_US-ryan-medium`.
Cold run ≈ 1 min. **Whisper is not downloaded at setup** — `transcribe.py` fetches Whisper small
(~464 MB, once per session) the first time a transcription needs it.

**Network (limited allowlist).** Package registries (npm, PyPI, …) and MCP servers are allowed,
plus exactly these hosts:

| Host | Used for |
|---|---|
| `remotion.media`, `storage.googleapis.com` | Remotion's headless Chrome download |
| `huggingface.co`, `us.aws.cdn.hf.co`, `cdn-lfs.hf.co`, `cas-bridge.xethub.hf.co`, `cas-server.xethub.hf.co`, `transfer.xethub.hf.co` | Piper voice and on-demand Whisper downloads |
| `fonts.googleapis.com`, `fonts.gstatic.com` | `@remotion/google-fonts` at render time |

Everything else is blocked. If a task needs another host, it is added to the environment's
allowlist (approved by the owner) — never worked around. No API keys or secrets are stored on
the environment; the studio needs none.

## Branch behaviour
The setup script only installs anything if the session's checkout contains
`scripts/cloud-setup.sh`. A session on a branch without it starts normally but **skips** the
studio setup — run `bash scripts/cloud-setup.sh --piper-voice` by hand there, or work from a
branch that has it (all branches created from `main` once the cloud-setup PR is merged).

## ⚠ Storage is temporary
Everything git-ignored is **lost when the session ends** and is recreated in the next one:

| Lost at session end | Recreated by |
|---|---|
| `node_modules/` (incl. Remotion's headless Chrome) | environment setup script (automatic) |
| `.venv/` | environment setup script (automatic) |
| `models/piper/en_US-ryan-medium.*` (~63 MB) | environment setup script (automatic) |
| `models/huggingface/` Whisper small (~464 MB) | first `transcribe.py` run (on demand), or `bash scripts/cloud-setup.sh --whisper` |
| renders, `tmp/`, `productions/*/renders/` | re-render. **Download finished files you want to keep before the session ends.** |
| commits that were not pushed | nothing — **push before you leave** |

What persists: everything committed **and pushed**, and the environment's own settings.
Never commit media, models, `.venv`, `node_modules` or `.env` (enforced by `.gitignore`).

## Start a new session (iPad)
1. New session in Claude Code on the web → environment **AI-Creative-Studio** → repository
   `almayomekonen/AI-Creative-Studio` → a branch that contains `scripts/cloud-setup.sh`.
2. Setup runs automatically (~1 min). Then `npm run doctor`.
3. `FAST=1 npm test` (≈1 min) or `npm test` (≈5 min, includes renders).
4. Without the environment (e.g. Default), run `bash scripts/cloud-setup.sh --piper-voice` first.

`bash scripts/cloud-setup.sh --check` reports what is installed without changing anything.

## Linux differences handled in code
- **Software WebGL:** with no GPU, Chrome's `angle` renderer cannot create a WebGL context.
  `remotion.config.ts` switches to `swangle` (ANGLE on SwiftShader) on Linux without `/dev/dri`.
  Tested: all Lab-* and Ad-* stills, Showreel render. 3D is CPU-bound (~14 s per quarter-scale
  still). Override with `REMOTION_GL=<renderer>`. macOS keeps `angle`.
- **Network proxy:** Remotion launches Chrome with `--no-proxy-server`, which cannot reach the
  internet from the cloud container, so `@remotion/google-fonts` timed out. On Linux with a proxy
  configured, `remotion.config.ts` removes those flags so Chrome uses the environment's proxy like
  any other process. No proxy address is read or stored.
- **No macOS `say`:** `make-test-assets.sh` uses Piper (`en_US-ryan-medium`) instead, and exits
  non-zero with an explicit message if no voice engine is available.
- **`doctor.sh`** works on macOS and Linux (disk/memory/GPU/browser checks per platform).
- The cloud FFmpeg (6.1) includes libass/drawtext, unlike the Mac build.
