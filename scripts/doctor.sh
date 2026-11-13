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
command -v ffmpeg >/dev/null && ok "ffmpeg" "$(ffmpeg -version | head -1 | cut -d' ' -f3)" || bad "ffmpeg" "brew install ffmpeg"
ffmpeg -hide_banner -filters 2>/dev/null | grep -q " subtitles " && ok "ffmpeg libass" "burn-in available" || warn "ffmpeg libass" "absent — captions are rendered by Remotion/HyperFrames instead"
ls models/huggingface/hub 2>/dev/null | grep -q whisper && ok "whisper model" "cached in ./models" || warn "whisper model" "downloads on first transcribe (~480MB small)"
SK=$(ls -d .claude/skills/*/ 2>/dev/null | wc -l | tr -d ' '); ok "project skills" "$SK installed"
[[ "${HYPERFRAMES_NO_TELEMETRY:-}" == "1" ]] || grep -q HYPERFRAMES_NO_TELEMETRY .claude/settings.json && ok "telemetry" "HyperFrames/Remotion telemetry disabled" || warn "telemetry" "not disabled"
[[ -f .env ]] && ok ".env" "present (keys not shown)" || warn ".env" "absent — cloud AI generation disabled (copy .env.example)"
FREE=$(df -g . | tail -1 | awk '{print $4}'); [[ $FREE -ge 10 ]] && ok "disk" "${FREE}GB free" || warn "disk" "${FREE}GB free — renders/models need space"
MEM=$(( $(sysctl -n hw.memsize) / 1073741824 )); ok "memory" "${MEM}GB (render concurrency 2)"
exit $FAIL
