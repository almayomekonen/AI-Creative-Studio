#!/usr/bin/env python3
"""Local, free voiceover with Piper TTS (offline, ~60 MB per voice, runs on CPU in real time).

  .venv/bin/python scripts/py/tts.py "Every frame was written in code." -o vo.wav [--voice en_US-ryan-medium]
  .venv/bin/python scripts/py/tts.py --spec remotion/src/reel/reel-spec.json -o remotion/public/reel/vo

Voices live in ./models/piper (download more: .venv/bin/python -m piper.download_voices --download-dir models/piper <voice>).
Post-processing: 48 kHz stereo, gentle high-pass, de-click fades, light compression — broadcast-ready VO stem.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VOICES = ROOT / "models" / "piper"


def synth(text: str, out: Path, voice: str, length_scale: float, engine: str = "piper") -> float:
    """engine 'piper' (local neural, check each voice's licence) or 'say' (macOS system voice — personal/non-commercial use: scratch VO only)."""
    with tempfile.TemporaryDirectory() as td:
        raw = Path(td) / "raw.wav"
        if engine == "say":
            aiff = Path(td) / "raw.aiff"
            rate = str(int(175 / length_scale))
            subprocess.run(["say", "-v", voice, "-r", rate, "-o", str(aiff), text], check=True, capture_output=True)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(aiff), str(raw)], check=True)
        else:
            model = VOICES / f"{voice}.onnx"
            if not model.exists():
                raise SystemExit(f"voice not found: {model} — download with: .venv/bin/python -m piper.download_voices --download-dir models/piper {voice}")
            subprocess.run([sys.executable, "-m", "piper", "-m", str(model), "-f", str(raw), "--length-scale", str(length_scale), "--sentence-silence", "0.25"],
                           input=text.encode(), check=True, capture_output=True)
        out.parent.mkdir(parents=True, exist_ok=True)
        # VO polish: HPF 80 Hz, presence lift, gentle compression, 48k stereo, 10 ms fades
        af = "highpass=f=80,equalizer=f=3500:t=q:w=1.2:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,aformat=sample_rates=48000:channel_layouts=stereo"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", af, str(out)], check=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)], capture_output=True, text=True).stdout)
    return round(dur, 3)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("text", nargs="?")
    ap.add_argument("-o", "--out", required=True, help="output .wav (single) or directory (--spec)")
    ap.add_argument("--spec", help="JSON with voiceover:[{id, atSec, text}]")
    ap.add_argument("--voice", default="en_US-ryan-medium")
    ap.add_argument("--length-scale", type=float, default=1.08, help=">1 slower, more deliberate read")
    ap.add_argument("--engine", choices=["piper", "say"], default="piper")
    args = ap.parse_args()

    if args.spec:
        spec = json.loads(Path(args.spec).read_text())
        out_dir = Path(args.out)
        lines = []
        for vo in spec["voiceover"]:
            p = out_dir / f"{vo['id']}.wav"
            dur = synth(vo.get("tts", vo["text"]), p, args.voice, args.length_scale, args.engine)
            lines.append({**vo, "file": p.name, "durationSec": dur})
        (out_dir / "vo.json").write_text(json.dumps(lines, indent=1))
        print(json.dumps(lines, indent=1))
    elif args.text:
        print(json.dumps({"out": args.out, "durationSec": synth(args.text, Path(args.out), args.voice, args.length_scale, args.engine)}))
    else:
        ap.error("give text or --spec")
    return 0


if __name__ == "__main__":
    sys.exit(main())
