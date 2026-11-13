#!/usr/bin/env python3
"""Script-aligned captions: the KNOWN script supplies the words, Whisper supplies only the timing.

When you wrote the VO, the transcript must never "mishear" it. This aligns script words to Whisper word
timestamps with a sequence matcher; unmatched script words are interpolated across the gaps by character length.

  .venv/bin/python scripts/py/align_captions.py --script "Light. Glass. Liquid." --whisper vo3.captions.json -o vo3.aligned.json [--offset-ms 18500]
"""
from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path


def norm(w: str) -> str:
    return re.sub(r"[^\w']", "", w.lower())


def align(script: str, whisper: list[dict]) -> list[dict]:
    words = script.split()
    if not whisper:
        return []
    span0, span1 = whisper[0]["startMs"], whisper[-1]["endMs"]
    times: list[tuple[int, int] | None] = [None] * len(words)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in words], b=[norm(w["text"]) for w in whisper], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            times[a + k] = (whisper[b + k]["startMs"], whisper[b + k]["endMs"])
    # fill gaps: distribute unmatched runs between known neighbours, weighted by word length
    i = 0
    while i < len(words):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(words) and times[j] is None:
            j += 1
        start = times[i - 1][1] if i > 0 else span0
        end = times[j][0] if j < len(words) else span1
        if end <= start:
            end = start + 120 * (j - i)
        weights = [max(2, len(norm(w))) for w in words[i:j]]
        total, t = sum(weights), start
        for k, wt in enumerate(weights):
            d = (end - start) * wt / total
            times[i + k] = (int(t), int(t + d))
            t += d
        i = j
    return [{"text": (" " if k else "") + w, "startMs": s, "endMs": e, "timestampMs": s, "confidence": 1.0} for k, (w, (s, e)) in enumerate(zip(words, times))]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--script", required=True)
    ap.add_argument("--whisper", required=True, help="*.captions.json from transcribe.py")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--offset-ms", type=int, default=0)
    args = ap.parse_args()
    caps = align(args.script, json.loads(Path(args.whisper).read_text()))
    for c in caps:
        for k in ("startMs", "endMs", "timestampMs"):
            c[k] += args.offset_ms
    Path(args.out).write_text(json.dumps(caps, indent=1))
    print(json.dumps({"words": len(caps), "out": args.out}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
