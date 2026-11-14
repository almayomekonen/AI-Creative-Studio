#!/usr/bin/env python3
"""Word-level transcription → Remotion `Caption[]` JSON + SRT + plain transcript.

Runs fully offline with faster-whisper (CTranslate2, int8 on CPU — fine on an 8 GB M1).
Models download once into ./models/huggingface (git-ignored) — only when a transcription
actually needs one and it is not already cached. Set STUDIO_NO_MODEL_DOWNLOAD=1 to forbid
downloads (fails with a clear message instead).

  .venv/bin/python scripts/py/transcribe.py input.wav -o out/captions --model small --lang en
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
os.environ.setdefault("HF_HOME", str(ROOT / "models" / "huggingface"))


def fmt_srt(ms: int) -> str:
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


MODEL_SIZES = {"tiny": "~75 MB", "base": "~145 MB", "small": "~464 MB", "medium": "~1.5 GB", "large-v3": "~3 GB"}


def ensure_model(name: str) -> str:
    """Return a local model path if cached; otherwise download once (unless forbidden)."""
    if Path(name).is_dir():  # explicit local model directory
        return name
    hub = Path(os.environ["HF_HOME"]) / "hub" / f"models--Systran--faster-whisper-{name}" / "snapshots"
    cached = next((d for d in hub.glob("*") if (d / "model.bin").exists()), None) if hub.is_dir() else None
    if cached:
        return str(cached)
    if os.environ.get("STUDIO_NO_MODEL_DOWNLOAD") == "1":
        raise SystemExit(f"Whisper '{name}' is not in {hub.parent.parent} and STUDIO_NO_MODEL_DOWNLOAD=1 — "
                         f"run once without it to download ({MODEL_SIZES.get(name, 'size unknown')}).")
    print(f"Whisper '{name}' not cached — downloading once into ./models/huggingface ({MODEL_SIZES.get(name, 'size unknown')}).", file=sys.stderr)
    from faster_whisper.utils import download_model
    return download_model(name, cache_dir=str(Path(os.environ["HF_HOME"]) / "hub"))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", help="audio or video file")
    ap.add_argument("-o", "--out", required=True, help="output path prefix (writes .captions.json, .srt, .txt)")
    ap.add_argument("--model", default="small", help="tiny|base|small|medium|large-v3 (small = best speed/quality on M1)")
    ap.add_argument("--lang", default=None, help="language code; auto-detect if omitted")
    ap.add_argument("--max-words-per-line", type=int, default=6)
    args = ap.parse_args()

    from faster_whisper import WhisperModel

    model = WhisperModel(ensure_model(args.model), device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        args.input,
        language=args.lang,
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
    )

    captions: list[dict] = []
    for seg in segments:
        for w in seg.words or []:
            start, end = int(w.start * 1000), int(w.end * 1000)
            # Remotion convention: leading space marks a word boundary for createTikTokStyleCaptions.
            text = w.word if w.word.startswith(" ") else " " + w.word
            captions.append({"text": text, "startMs": start, "endMs": end, "timestampMs": start, "confidence": round(w.probability, 3)})
    if captions:
        captions[0]["text"] = captions[0]["text"].lstrip()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.with_suffix(".captions.json").write_text(json.dumps(captions, indent=1, ensure_ascii=False))

    # SRT: group words into lines of N words.
    lines, buf = [], []
    for c in captions:
        buf.append(c)
        if len(buf) >= args.max_words_per_line or c["text"].rstrip().endswith((".", "?", "!")):
            lines.append(buf)
            buf = []
    if buf:
        lines.append(buf)
    srt = []
    for i, ln in enumerate(lines, 1):
        srt.append(f"{i}\n{fmt_srt(ln[0]['startMs'])} --> {fmt_srt(ln[-1]['endMs'])}\n{''.join(c['text'] for c in ln).strip()}\n")
    out.with_suffix(".srt").write_text("\n".join(srt), encoding="utf-8")
    out.with_suffix(".txt").write_text("".join(c["text"] for c in captions).strip() + "\n", encoding="utf-8")

    low = [c for c in captions if c["confidence"] < 0.5]
    print(json.dumps({
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "duration_sec": round(info.duration, 2),
        "words": len(captions),
        "low_confidence_words": [c["text"].strip() for c in low],
        "outputs": [str(out.with_suffix(s)) for s in (".captions.json", ".srt", ".txt")],
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
