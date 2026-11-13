#!/usr/bin/env bash
# Regenerates every audio asset + caption track for the demo reel from remotion/src/reel/reel-spec.json.
# 100% local & free: procedural music (synth.py), procedural SFX (sfx.py), Piper VO (tts.py), Whisper captions (transcribe.py).
set -euo pipefail
cd "$(dirname "$0")/../.."
export HF_HOME="$PWD/models/huggingface"
PY=.venv/bin/python; SPEC=remotion/src/reel/reel-spec.json; OUT=remotion/public/reel
mkdir -p $OUT/vo
$PY scripts/py/synth.py $SPEC -o $OUT/music.wav 2>/dev/null
$PY scripts/py/sfx.py -o remotion/public/sfx 2>/dev/null >/dev/null
$PY scripts/py/tts.py --spec $SPEC -o $OUT/vo --voice en_US-ryan-medium --length-scale 1.55 2>/dev/null >/dev/null
for f in $OUT/vo/vo*.wav; do $PY scripts/py/transcribe.py "$f" -o "${f%.wav}" --model small --lang en 2>/dev/null >/dev/null; done
# script-aligned captions: script text + Whisper timing, merged into one absolute-time track
$PY - "$OUT" <<'PYEOF'
import json, sys, pathlib
sys.path.insert(0, "scripts/py")
from align_captions import align
out = pathlib.Path(sys.argv[1]); lines = json.loads((out/"vo"/"vo.json").read_text()); caps = []
for l in lines:
    words = json.loads((out/"vo"/(pathlib.Path(l["file"]).stem + ".captions.json")).read_text())
    for i, c in enumerate(align(l["text"], words)):
        off = int(l["atSec"]*1000)
        caps.append({**c, "text": " " + c["text"].strip(), "startMs": c["startMs"]+off, "endMs": c["endMs"]+off, "timestampMs": c["startMs"]+off})
(out/"captions.json").write_text(json.dumps(caps, indent=1))
print(f"reel assets ready: {len(lines)} VO lines, {len(caps)} caption words (script-aligned)")
PYEOF
