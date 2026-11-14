# Working from the cloud (Claude Code on the web / iPad)

Cloud sessions run on a temporary Linux container (Ubuntu 24.04, x86_64, 4 CPU, ~15 GB RAM,
**no GPU**). The repository is cloned fresh at the start of every session.

## ⚠ The environment is temporary
Everything git-ignored is **lost when the session ends** and must be recreated in a new session:

| Lost | Recreated by |
|---|---|
| `node_modules/` (incl. Remotion's headless Chrome) | `bash scripts/cloud-setup.sh` (automatic if the environment setup script is configured) |
| `.venv/` | same |
| `models/piper/en_US-ryan-medium.*` (~63 MB) | `bash scripts/cloud-setup.sh --piper-voice` |
| `models/huggingface/` Whisper small (~464 MB) | on demand: first `transcribe.py` run, or `bash scripts/cloud-setup.sh --whisper` |
| renders, `tmp/`, `productions/*/renders/` | re-render. **Commit nothing heavy** — download finished files you want to keep before the session ends. |

Only committed + pushed files survive. Never commit media, models or `.env` (see `.gitignore`).

## Start a new cloud session
1. Start a session on this repository and work on your feature branch.
2. If the environment's setup script is configured (it calls `scripts/cloud-setup.sh`), Node and
   Python deps are already installed (~1 min). Otherwise run `bash scripts/cloud-setup.sh`.
3. Only if you need voiceover / the Piper test: `bash scripts/cloud-setup.sh --piper-voice`.
4. `npm run doctor`, then `FAST=1 npm test` (≈1 min) or `npm test` (≈5 min, includes renders).
   Without the Piper voice, the `piper-tts` and `transcribe` tests fail with a clear message.

Environment setup script (Claude Code environment settings → Setup script), runs from the
directory that holds the checkout:
```bash
if [ -d AI-Creative-Studio ]; then (cd AI-Creative-Studio && bash scripts/cloud-setup.sh); fi
```
It installs dependencies only — no models — so session start stays fast and no large download
happens unless a task needs it.

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
