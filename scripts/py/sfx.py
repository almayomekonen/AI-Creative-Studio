#!/usr/bin/env python3
"""Procedural sound-effects library — whooshes, hits, risers, shimmers, glitches, ticks. Royalty-free, deterministic.

  .venv/bin/python scripts/py/sfx.py -o remotion/public/sfx          # full library
  .venv/bin/python scripts/py/sfx.py -o out --only whoosh --duration 0.6 --seed 3

Pair with transitions: start a whoosh 2–4 frames BEFORE a whip/zoom-through; hit on the cut frame.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, min(hi, SR / 2 - 100)], "band", fs=SR, output="sos"), x)


def lp(x, fc):
    return sosfilt(butter(2, fc, "low", fs=SR, output="sos"), x)


def pan(m, p):
    return np.stack([m * np.cos((p + 1) * np.pi / 4), m * np.sin((p + 1) * np.pi / 4)]) * 1.414


def whoosh(d, rng):
    n = int(d * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    segs = 32
    for s in range(segs):
        a, b = s * n // segs, (s + 1) * n // segs
        c = 400 + 3500 * np.sin(np.pi * (s + 0.5) / segs) ** 2
        out[a:b] = bp(noise[a:b], c * 0.6, c * 1.6)
    amp = np.sin(np.pi * t) ** 1.5
    l = out * amp * np.clip(1.2 - t, 0, 1)
    r = out * amp * np.clip(0.2 + t, 0, 1)
    return np.stack([l, r]) * 0.9


def hit(d, rng):
    n = int(d * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(50 + 120 * np.exp(-t * 25)) / SR) * np.exp(-t * 6)
    snap = bp(rng.standard_normal(n), 1500, 9000) * np.exp(-t * 40) * 0.6
    return pan(np.tanh((body + snap) * 2), 0) * 0.8


def riser(d, rng):
    n = int(d * SR)
    t = np.linspace(0, 1, n)
    f = 150 + 1800 * t**2
    tone = sum(np.sin(2 * np.pi * np.cumsum(f * k) / SR) / k for k in (1, 2, 3))
    noise = bp(rng.standard_normal(n), 2000, 9000) * t**2
    return pan((tone * 0.25 + noise * 0.4) * t**1.8, 0)


def shimmer(d, rng):
    n = int(d * SR)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for k, f in enumerate([1318.5, 1760, 2093, 2637, 3520]):
        start = int(k * 0.04 * SR)
        e = np.exp(-(t[: n - start]) * 3.5)
        tone = np.sin(2 * np.pi * f * t[: n - start]) * e * 0.12
        out[:, start:] += pan(tone, (k % 2) * 1.2 - 0.6)
    return out


def glitch(d, rng):
    n = int(d * SR)
    out = np.zeros(n)
    i = 0
    while i < n:
        seg = int(rng.uniform(0.008, 0.04) * SR)
        f = rng.choice([80, 160, 1200, 3000, 6000])
        tt = np.arange(min(seg, n - i)) / SR
        out[i : i + len(tt)] = np.sign(np.sin(2 * np.pi * f * tt)) * rng.uniform(0.1, 0.4)
        i += seg + int(rng.uniform(0, 0.02) * SR)
    return pan(lp(out, 9000), 0)


def tick(d, rng):
    n = int(max(d, 0.05) * SR)
    t = np.arange(n) / SR
    return pan(np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 120) * 0.5, 0)


def sub_drop(d, rng):
    n = int(d * SR)
    t = np.arange(n) / SR
    return pan(np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 1.2) + 25) / SR) * np.exp(-t * 1.5) * 0.9, 0)


LIB = {"whoosh": (whoosh, 0.7), "hit": (hit, 1.2), "riser": (riser, 3.0), "shimmer": (shimmer, 2.0), "glitch": (glitch, 0.5), "tick": (tick, 0.08), "sub_drop": (sub_drop, 2.5)}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--only", choices=LIB.keys())
    ap.add_argument("--duration", type=float)
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()
    import soundfile as sf

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    made = []
    for name, (fn, d) in LIB.items():
        if args.only and name != args.only:
            continue
        rng = np.random.default_rng(args.seed)
        sig = fn(args.duration or d, rng)
        sig = sig / max(1e-9, np.abs(sig).max()) * 0.89
        p = out / f"{name}.wav"
        sf.write(p, sig.T, SR, subtype="PCM_24")
        made.append(str(p))
    print(json.dumps({"made": made}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
