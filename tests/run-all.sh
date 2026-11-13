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
t synth-music bash -c "$PY scripts/py/synth.py remotion/src/reel/reel-spec.json -o $OUT/music.wav 2>/dev/null && $PY -c \"import json;d=json.load(open('$OUT/music.beats.json'));assert d['tempo']==120 and len(d['beats'])==72 and d['impacts']==[8.0,18.0,30.0], d['impacts']\""
t sfx-library bash -c "$PY scripts/py/sfx.py -o $OUT/sfx 2>/dev/null && test \$(ls $OUT/sfx/*.wav | wc -l) -eq 7"
t piper-tts bash -c "$PY scripts/py/tts.py 'Testing the studio voice.' -o $OUT/tts.wav 2>/dev/null && $PY scripts/py/transcribe.py $OUT/tts.wav -o $OUT/tts --model small --lang en 2>/dev/null && grep -qi 'studio voice' $OUT/tts.txt"
t align-captions bash -c "$PY -c \"import sys;sys.path.insert(0,'scripts/py');from align_captions import align;w=[{'text':'Alas,','startMs':0,'endMs':300},{'text':' all','startMs':400,'endMs':600},{'text':' simulated.','startMs':650,'endMs':1200}];r=align('Light. Glass. All simulated.',w);assert [x['text'].strip() for x in r]==['Light.','Glass.','All','simulated.'];assert r[-1]['endMs']==1200\""
if [[ -z "${FAST:-}" ]]; then
  for lab in Lab-Surreal Lab-Liquid Lab-Particles Lab-Product Lab-Morph Lab-Gsap; do t "still-$lab" npx remotion still remotion/src/index.ts $lab $OUT/$lab.jpg --frame=60 --scale=0.25; done
  t render-still npx remotion still remotion/src/index.ts Thumbnail-16x9 $OUT/thumb.png
  t render-showreel node scripts/pipeline/render-remotion.mjs Showreel-9x16 $OUT/showreel.mp4 --props tests/props/showreel.json
  t export-normalize bash scripts/pipeline/export.sh $OUT/showreel.mp4 social-vertical $OUT/showreel.final.mp4 --normalize
  t qc-passes-final bash -c "$PY scripts/py/qc.py $OUT/showreel.final.mp4 --spec social-vertical 2>/dev/null"
  t hyperframes-render bash -c "cd hyperframes/title-card && ../../node_modules/.bin/hyperframes render --output ../../$OUT/hf.mp4 && test -s ../../$OUT/hf.mp4"
fi
echo "— $PASS passed, ${#FAILED[@]} failed ${FAILED[*]:-}"
[[ ${#FAILED[@]} -eq 0 ]]
