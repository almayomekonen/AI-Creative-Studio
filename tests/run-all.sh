#!/usr/bin/env bash
# Full studio test suite: env, types, CLI, Python tools, render + QC. Usage: npm test  (or FAST=1 npm test to skip renders)
set -uo pipefail
cd "$(dirname "$0")/.."
export HF_HOME="$PWD/models/huggingface" HYPERFRAMES_NO_TELEMETRY=1 REMOTION_DISABLE_TELEMETRY=1
PY=.venv/bin/python; OUT=tmp/tests; mkdir -p $OUT
PASS=0; FAILED=()
t(){ local name="$1"; shift; if "$@" >"$OUT/$name.log" 2>&1; then echo "  ✓ $name"; PASS=$((PASS+1)); else echo "  ✗ $name (see $OUT/$name.log)"; FAILED+=("$name"); fi; }
echo "▶ studio test suite"
t doctor bash scripts/doctor.sh
t typecheck npx tsc --noEmit -p .
t cli-unit node --test tests/test_studio_cli.mjs
t skills-frontmatter bash -c 'for f in .claude/skills/*/SKILL.md; do head -5 "$f" | grep -q "^name:" && head -8 "$f" | grep -q "^description:" || { echo "bad: $f"; exit 1; }; done'
[[ -f remotion/public/test/beat120.wav ]] || bash scripts/pipeline/make-test-assets.sh >/dev/null
t beats bash -c "$PY scripts/py/beats.py remotion/public/test/beat120.wav -o $OUT/beats.json 2>/dev/null && $PY -c \"import json;d=json.load(open('$OUT/beats.json'));t=d['tempo'];assert 110<t<130 or 55<t<65 or 220<t<260, t;assert len(d['beats'])>=20\""
t transcribe bash -c "$PY scripts/py/transcribe.py remotion/public/test/voice.wav -o $OUT/voice --model small --lang en 2>/dev/null && grep -qi 'last frame' $OUT/voice.txt"
t scenes bash -c "ffmpeg -y -loglevel error -f lavfi -i color=red:s=320x240:d=1 -f lavfi -i color=blue:s=320x240:d=1 -filter_complex concat=n=2:v=1 $OUT/twoshots.mp4 && $PY scripts/py/scenes.py $OUT/twoshots.mp4 -o $OUT/shots.json 2>/dev/null && $PY -c \"import json;assert len(json.load(open('$OUT/shots.json')))==2\""
t qc-detects-silence bash -c "ffmpeg -y -loglevel error -f lavfi -i color=black:s=1080x1920:d=3:r=30 -f lavfi -i anullsrc=r=48000:cl=stereo -t 3 -c:v libx264 -pix_fmt yuv420p -c:a aac $OUT/bad.mp4 && ! $PY scripts/py/qc.py $OUT/bad.mp4 --spec social-vertical 2>/dev/null"
if [[ -z "${FAST:-}" ]]; then
  t render-still npx remotion still remotion/src/index.ts Thumbnail-16x9 $OUT/thumb.png
  t render-showreel node scripts/pipeline/render-remotion.mjs Showreel-9x16 $OUT/showreel.mp4 --props tests/props/showreel.json
  t export-normalize bash scripts/pipeline/export.sh $OUT/showreel.mp4 social-vertical $OUT/showreel.final.mp4 --normalize
  t qc-passes-final bash -c "$PY scripts/py/qc.py $OUT/showreel.final.mp4 --spec social-vertical 2>/dev/null"
  t hyperframes-render bash -c "cd hyperframes/title-card && ../../node_modules/.bin/hyperframes render --output ../../$OUT/hf.mp4 && test -s ../../$OUT/hf.mp4"
fi
echo "— $PASS passed, ${#FAILED[@]} failed ${FAILED[*]:-}"
[[ ${#FAILED[@]} -eq 0 ]]
