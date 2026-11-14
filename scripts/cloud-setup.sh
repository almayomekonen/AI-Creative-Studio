#!/usr/bin/env bash
# Cloud (Linux) session setup for AI Creative Studio — idempotent, free & open-source only.
#
# Cloud sessions are TEMPORARY: every new session starts from a fresh clone, so all
# git-ignored files (node_modules/, .venv/, models/, renders, tmp/) are gone and must be
# recreated. Run this at the start of a session (the cloud environment's setup script
# calls it automatically when configured — see docs/CLOUD.md).
#
#   bash scripts/cloud-setup.sh                 # Node + Python deps + Remotion browser (no models)
#   bash scripts/cloud-setup.sh --piper-voice   # + Piper en_US-ryan-medium (~63 MB) if missing
#   bash scripts/cloud-setup.sh --whisper       # + Whisper small (~464 MB) if missing
#   bash scripts/cloud-setup.sh --check         # report only, install nothing
#
# Models are never downloaded unless asked for. Whisper also downloads on demand the first
# time scripts/py/transcribe.py needs it (STUDIO_NO_MODEL_DOWNLOAD=1 forbids that).
set -euo pipefail
cd "$(dirname "$0")/.."

PIPER_VOICE="en_US-ryan-medium"   # the only approved voice — do not add others without approval
WANT_PIPER=0; WANT_WHISPER=0; CHECK=0
for a in "$@"; do
  case "$a" in
    --piper-voice) WANT_PIPER=1 ;;
    --whisper) WANT_WHISPER=1 ;;
    --check) CHECK=1 ;;
    -h|--help) sed -n 2,15p "$0"; exit 0 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done
export HF_HOME="$PWD/models/huggingface" HYPERFRAMES_NO_TELEMETRY=1 REMOTION_DISABLE_TELEMETRY=1
log(){ printf '▶ %s\n' "$*"; }
[[ "$(uname -s)" == Darwin ]] && echo "note: this script targets Linux cloud sessions; on the Mac follow README quick start." >&2

have_node(){ [[ -d node_modules/remotion && node_modules/.package-lock.json -nt package-lock.json ]]; }
have_venv(){ [[ -x .venv/bin/python ]] && .venv/bin/python -c "import faster_whisper, librosa, scenedetect, cv2, av, piper" 2>/dev/null; }
have_piper(){ [[ -f "models/piper/$PIPER_VOICE.onnx" && -f "models/piper/$PIPER_VOICE.onnx.json" ]]; }
have_whisper(){ ls models/huggingface/hub/models--Systran--faster-whisper-small/snapshots/*/model.bin >/dev/null 2>&1; }
status(){ printf '  %-16s %s\n' "$1" "$2"; }

if [[ $CHECK == 1 ]]; then
  echo "AI Creative Studio — cloud setup status"
  have_node && status node_modules ok || status node_modules "missing (run without --check)"
  have_venv && status .venv ok || status .venv "missing (run without --check)"
  have_piper && status "piper voice" "$PIPER_VOICE" || status "piper voice" "missing (--piper-voice)"
  have_whisper && status "whisper small" cached || status "whisper small" "not cached (--whisper, or downloads on first transcribe)"
  exit 0
fi

# 1. Node dependencies (exact versions from package-lock.json)
if have_node; then log "node_modules up to date"; else log "npm ci"; npm ci --no-audit --no-fund; fi

# 2. Remotion's headless Chrome (into node_modules/.remotion; a tool, not a model)
log "remotion browser ensure"; npx remotion browser ensure >/dev/null

# 3. Python venv (project-local only — never the system/Conda base env)
if have_venv; then log ".venv up to date"; else
  log "python venv + requirements.lock.txt"
  [[ -x .venv/bin/python ]] || python3 -m venv .venv
  .venv/bin/pip install -q --upgrade pip
  .venv/bin/pip install -q -r requirements.lock.txt
  # scenedetect pulls opencv-python; keep only the headless build (see docs/INSTALLED.md).
  # Uninstalling it deletes the shared cv2 package, so reinstall headless afterwards.
  if .venv/bin/pip show -q opencv-python >/dev/null 2>&1; then
    .venv/bin/pip uninstall -y -q opencv-python
    .venv/bin/pip install -q --force-reinstall --no-deps "$(grep '^opencv-python-headless==' requirements.lock.txt)"
  fi
fi

# 4. Models — only when explicitly requested and not already present
if [[ $WANT_PIPER == 1 ]]; then
  if have_piper; then log "piper voice $PIPER_VOICE present"; else
    log "download piper voice $PIPER_VOICE (~63 MB, rhasspy/piper-voices)"
    mkdir -p models/piper
    .venv/bin/python -m piper.download_voices --download-dir models/piper "$PIPER_VOICE"
  fi
fi
if [[ $WANT_WHISPER == 1 ]]; then
  if have_whisper; then log "whisper small cached"; else
    log "download whisper small (~464 MB, Systran/faster-whisper-small)"
    .venv/bin/python -c "from faster_whisper.utils import download_model as d; d('small', cache_dir='$HF_HOME/hub')" >/dev/null
  fi
fi

log "done — run: npm run doctor"
