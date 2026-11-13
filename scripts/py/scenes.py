#!/usr/bin/env python3
"""Shot-boundary detection for footage (B-roll logging, re-edits, match-cut hunting).

  .venv/bin/python scripts/py/scenes.py footage.mp4 -o out/scenes.json [--thumbs out/thumbs]

Writes a JSON list of shots (start/end sec + frames) and optional mid-shot thumbnails
so an editor/agent can pick B-roll and find shape/colour matches between shots.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--threshold", type=float, default=27.0, help="ContentDetector threshold (lower = more cuts)")
    ap.add_argument("--thumbs", default=None, help="directory for mid-shot JPEG thumbnails")
    args = ap.parse_args()

    from scenedetect import ContentDetector, detect

    scenes = detect(args.input, ContentDetector(threshold=args.threshold))
    shots = [
        {
            "index": i,
            "startSec": round(s.get_seconds(), 3),
            "endSec": round(e.get_seconds(), 3),
            "startFrame": s.get_frames(),
            "endFrame": e.get_frames(),
        }
        for i, (s, e) in enumerate(scenes)
    ]

    if args.thumbs and shots:
        import cv2

        Path(args.thumbs).mkdir(parents=True, exist_ok=True)
        cap = cv2.VideoCapture(args.input)
        for sh in shots:
            cap.set(cv2.CAP_PROP_POS_FRAMES, (sh["startFrame"] + sh["endFrame"]) // 2)
            ok, frame = cap.read()
            if ok:
                p = Path(args.thumbs) / f"shot_{sh['index']:03}.jpg"
                cv2.imwrite(str(p), frame)
                sh["thumb"] = str(p)
        cap.release()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(shots, indent=1))
    print(json.dumps({"shots": len(shots), "out": str(out)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
