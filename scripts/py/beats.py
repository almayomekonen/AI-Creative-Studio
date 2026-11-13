#!/usr/bin/env python3
"""Music analysis for edit sync → BeatMap JSON (tempo, beats, downbeats, onsets, sections).

  .venv/bin/python scripts/py/beats.py music.wav -o remotion/public/beats.json

Feed the JSON to Remotion (`cutPointsFromBeats`, `beatPulse`) or HyperFrames so cuts and
motion hits land on the music.
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
    ap.add_argument("--beats-per-bar", type=int, default=4)
    args = ap.parse_args()

    import librosa
    import numpy as np

    y, sr = librosa.load(args.input, sr=22050, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
    beats = librosa.frames_to_time(beat_frames, sr=sr).tolist()
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units="time").tolist()

    # Downbeat estimate: the bar phase whose beats carry the most onset energy.
    downbeats: list[float] = []
    if len(beat_frames) >= args.beats_per_bar:
        strengths = onset_env[np.clip(beat_frames, 0, len(onset_env) - 1)]
        phase = int(np.argmax([strengths[p :: args.beats_per_bar].mean() for p in range(args.beats_per_bar)]))
        downbeats = beats[phase :: args.beats_per_bar]

    # Coarse sections from RMS energy changes (for drop / build detection).
    rms = librosa.feature.rms(y=y)[0]
    rms_t = librosa.times_like(rms, sr=sr)
    peak_t = float(rms_t[int(np.argmax(rms))]) if len(rms) else 0.0

    data = {
        "tempo": round(float(np.atleast_1d(tempo)[0]), 2),
        "beats": [round(b, 4) for b in beats],
        "downbeats": [round(b, 4) for b in downbeats],
        "onsets": [round(o, 4) for o in onsets],
        "energyPeakSec": round(peak_t, 3),
        "duration": round(duration, 3),
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=1))
    print(json.dumps({k: (v if not isinstance(v, list) else f"{len(v)} items") for k, v in data.items()}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
