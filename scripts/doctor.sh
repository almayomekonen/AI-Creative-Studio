#!/usr/bin/env bash
# Studio health check — read-only. Usage: npm run doctor
cd "$(dirname "$0")/.."
ok(){ printf "  \033[32m✓\033[0m %-22s %s\n" "$1" "$2"; }
bad(){ printf "  \033[31m✗\033[0m %-22s %s\n" "$1" "$2"; FAIL=1; }
warn(){ printf "  \033[33m!\033[0m %-22s %s\n" "$1" "$2"; }
FAIL=0
echo "AI Creative Studio — doctor"
[[ "$(basename "$PWD")" == "AI-Creative-Studio" ]] && ok "project dir" "$PWD" || bad "project dir" "$PWD"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null); [[ "${NODE_MAJOR:-0}" -ge 22 ]] && ok "node" "$(node -v)" || bad "node" "need >=22 (nvm use)"
[[ -d node_modules/remotion ]] && ok "remotion" "$(node -p 'require("./node_modules/remotion/package.json").version')" || bad "remotion" "run npm ci"
[[ -x node_modules/.bin/hyperframes ]] && ok "hyperframes cli" "$(node_modules/.bin/hyperframes --version 2>/dev/null)" || bad "hyperframes cli" "run npm ci"
[[ -x .venv/bin/python ]] && ok "python venv" "$(.venv/bin/python -V) (.venv, isolated)" || bad "python venv" "python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
.venv/bin/python -c "import faster_whisper, librosa, scenedetect, cv2, av" 2>/dev/null && ok "python libs" "faster-whisper librosa scenedetect opencv av" || bad "python libs" "pip install -r requirements.txt"
OS=$(uname -s)
if [[ $OS == Darwin ]]; then FFHINT="brew install ffmpeg"; else FFHINT="apt-get install -y ffmpeg"; fi
command -v ffmpeg >/dev/null && ok "ffmpeg" "$(ffmpeg -version | head -1 | cut -d' ' -f3)" || bad "ffmpeg" "$FFHINT"
ffmpeg -hide_banner -filters 2>/dev/null | grep -q " subtitles " && ok "ffmpeg libass" "burn-in available" || warn "ffmpeg libass" "absent — captions are rendered by Remotion/HyperFrames instead"
ls models/huggingface/hub 2>/dev/null | grep -q whisper && ok "whisper model" "cached in ./models" || warn "whisper model" "downloads on first transcribe (~480MB small)"
ls models/piper/*.onnx >/dev/null 2>&1 && ok "piper voices" "$(ls models/piper/*.onnx | wc -l | tr -d ' ') in ./models/piper" || warn "piper voices" "none — bash scripts/cloud-setup.sh --piper-voice (en_US-ryan-medium)"
SK=$(ls -d .claude/skills/*/ 2>/dev/null | wc -l | tr -d ' '); ok "project skills" "$SK installed"
[[ "${HYPERFRAMES_NO_TELEMETRY:-}" == "1" ]] || grep -q HYPERFRAMES_NO_TELEMETRY .claude/settings.json && ok "telemetry" "HyperFrames/Remotion telemetry disabled" || warn "telemetry" "not disabled"
[[ -f .env ]] && ok ".env" "present (keys not shown)" || ok ".env" "not needed — studio is 100% free/open-source"
FREE=$(( $(df -Pk . | tail -1 | awk '{print $4}') / 1048576 )); [[ $FREE -ge 10 ]] && ok "disk" "${FREE}GB free" || warn "disk" "${FREE}GB free — renders/models need space"
if [[ $OS == Darwin ]]; then MEMB=$(sysctl -n hw.memsize); else MEMB=$(( $(awk '/MemTotal/{print $2}' /proc/meminfo) * 1024 )); fi
MEM=$(( MEMB / 1073741824 )); ok "memory" "${MEM}GB (render concurrency 2)"
if [[ $OS == Linux ]]; then
  [[ -e /dev/dri || -e /dev/nvidia0 ]] && ok "gpu" "device present" || warn "gpu" "none — remotion.config.ts uses software GL (swangle); 3D renders are CPU-bound"
  [[ -x node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell ]] && ok "remotion browser" "chrome-headless-shell (node_modules/.remotion)" || warn "remotion browser" "downloads on first render (or: npx remotion browser ensure)"
fi
exit $FAIL
