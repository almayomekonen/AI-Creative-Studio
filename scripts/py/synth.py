#!/usr/bin/env python3
"""Procedural music generator — original, royalty-free soundtracks from a JSON spec. No samples, no AI models.

  .venv/bin/python scripts/py/synth.py remotion/src/reel/reel-spec.json -o remotion/public/reel/music.wav

Writes the WAV plus `<out>.beats.json` with EXACT beat/downbeat/section/impact times (no detection needed),
so visuals lock to the music perfectly.

Spec keys: bpm, bars, progression [[root, quality]...], barsPerChord, sections[{name,startBar,bars,layers,energy,impact}].
Layers: pad, kick, bass, hats, hats16, clap, arp, snareroll, tick, riser@<bar> (riser that resolves at the next section).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
QUAL = {"minor": [0, 3, 7, 10], "major": [0, 4, 7, 11], "sus2": [0, 2, 7, 9]}
rng = np.random.default_rng(7)  # deterministic: same spec → same track


def midi(name: str) -> int:
    n, o = (name[:-1], int(name[-1]))
    return 12 * (o + 1) + NOTE[n]


def hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR / 2 - 100)], "band", fs=SR, output="sos"), x)


def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * f + phase) % 1.0) - 1


def env(n, a, d, s, r, sustain_len=None):
    """ADSR in seconds; total length n samples."""
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sl = max(0, n - a - d - r) if sustain_len is None else int(sustain_len * SR)
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(sl, s), np.linspace(s, 0, max(r, 1))])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def place(buf, sig, at):
    i = int(at * SR)
    if i >= buf.shape[-1]:
        return
    j = min(buf.shape[-1], i + sig.shape[-1])
    buf[..., i:j] += sig[..., : j - i]


def stereo(m, pan=0.0):
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([m * l * 1.414, m * r * 1.414])


# ---------------- instruments ----------------
def kick():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t * 300) * 0.3
    return np.tanh((body + click) * 1.6)


def clap():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 900, 5000)
    e = np.exp(-t * 18) * (1 + 0.6 * ((t < 0.012) | ((t > 0.02) & (t < 0.03))))
    return noise * e * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.25


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500) * np.exp(-t * (14 if open_ else 70)) * 0.35


def pluck(f, dur=0.25):
    n = int(dur * SR)
    x = saw(f, n) + 0.5 * saw(f * 2.003, n)
    t = np.arange(n) / SR
    cutoff = 300 + 5000 * np.exp(-t * 18)
    # time-varying lowpass approximation: blend of two static filters by envelope
    y = lp(x, 6000) * np.exp(-t * 18) + lp(x, 900) * (1 - np.exp(-t * 18))
    return y * np.exp(-t * 9) * 0.25 * (cutoff > 0)


def tick(accent=False):
    """Mechanical watch tick: two very short resonant clicks (escapement)."""
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    f = 3200 if accent else 2600
    c1 = np.sin(2 * np.pi * f * t) * np.exp(-t * 900)
    c2 = np.roll(np.sin(2 * np.pi * (f * 1.5) * t) * np.exp(-t * 1200), int(0.006 * SR)) * 0.5
    return (c1 + c2) * (0.5 if accent else 0.32)


def pad_chord(notes, dur, brightness):
    n = int(dur * SR)
    out = np.zeros((2, n))
    for k, m in enumerate(notes):
        for det, pan in ((-0.07, -0.6), (0.0, 0.0), (0.07, 0.6)):
            v = saw(hz(m + det), n, phase=rng.random())
            out += stereo(v, pan) * 0.06
    out = np.stack([lp(out[0], 500 + 3500 * brightness, 2), lp(out[1], 500 + 3500 * brightness, 2)])
    return out * env(n, 0.9, 0.5, 0.85, 1.2)


def bass_note(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.35 * lp(saw(f, n), 400)
    return x * env(n, 0.005, 0.1, 0.8, 0.06) * 0.5


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    noise = rng.standard_normal(n)
    sweep = np.zeros(n)
    # piecewise band sweep for a rising "whoosh"
    segs = 24
    for s in range(segs):
        a, b = s * n // segs, (s + 1) * n // segs
        lo = 300 * (1 + 20 * (s / segs) ** 2)
        sweep[a:b] = bp(noise[a:b], lo, lo * 2.5)
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1000 * p**2) / SR) * 0.15
    return (sweep * 0.5 + tone) * p**2.2


def impact():
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 1.6)
    crack = lp(rng.standard_normal(n), 4000) * np.exp(-t * 9) * 0.5
    return np.tanh((boom + crack) * 1.8) * 0.9


def reverb_ir(seconds=2.6):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([lp(rng.standard_normal(n), 6000), lp(rng.standard_normal(n), 6000)]) * np.exp(-t * 3.2)
    return ir / np.abs(ir).sum(axis=1, keepdims=True) * 40


# ---------------- arrangement ----------------
def render(spec: dict):
    bpm = spec["bpm"]
    beat = 60.0 / bpm
    bpb = int(spec.get("beatsPerBar", 4))
    bar = beat * bpb
    total = spec["bars"] * bar + 3.0  # tail
    N = int(total * SR)
    dry = np.zeros((2, N))   # drums (not sidechained)
    music = np.zeros((2, N))  # pad/bass/arp (sidechained)
    send = np.zeros((2, N))   # reverb send
    kicks: list[float] = []
    impacts: list[float] = []
    prog = spec["progression"]
    bpc = spec.get("barsPerChord", 1)

    def chord_at(b):
        root, q = prog[(int(b) // bpc) % len(prog)]
        r = midi(root)
        return r, [r + 12 + i for i in QUAL[q]]

    for sec in spec["sections"]:
        s0, nb, E = sec["startBar"], sec["bars"], sec["energy"]
        layers = sec["layers"]
        for b in range(s0, s0 + nb):
            t0 = b * bar
            root, notes = chord_at(b)
            if "pad" in layers and (b == s0 or b % bpc == 0):
                span = min(bpc - (b % bpc), s0 + nb - b)  # sustain across the whole chord, not retrigger per bar
                pc = pad_chord(notes, span * bar + 0.6, E)
                place(music, pc * (0.7 + 0.5 * E), t0)
                place(send, pc * 0.6, t0)
            for q in range(bpb):
                tb = t0 + q * beat
                if "kick" in layers:
                    place(dry, stereo(kick() * 0.9), tb)
                    kicks.append(tb)
                if "clap" in layers and q % 2 == 1:
                    c = stereo(clap(), 0.0)
                    place(dry, c, tb)
                    place(send, c * 0.5, tb)
                if "bass" in layers:
                    for e8 in range(2 if E < 0.95 else 2):
                        place(music, stereo(bass_note(hz(root), beat / 2 * 0.9)), tb + e8 * beat / 2)
                if "hats" in layers:
                    place(dry, stereo(hat(), 0.3), tb + beat / 2)
                if "hats16" in layers:
                    for s16 in range(4):
                        v = 0.5 + 0.5 * (s16 % 2 == 1) + 0.1 * rng.random()
                        place(dry, stereo(hat(open_=(s16 == 2 and q == 3)) * v, 0.35), tb + s16 * beat / 4)
                if "arp" in layers:
                    seq = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 24]  # 16th arpeggio
                    for s16 in range(4):
                        p = stereo(pluck(hz(seq[(q * 4 + s16) % 4]), beat / 2), -0.4 + 0.8 * (s16 % 2))
                        place(music, p * 0.8, tb + s16 * beat / 4)
                        place(send, p * 0.9, tb + s16 * beat / 4)
                if "tick" in layers:
                    place(dry, stereo(tick(accent=(q == 0)), 0.15), tb)
                    place(dry, stereo(tick() * 0.45, -0.15), tb + beat / 2)
                if "snareroll" in layers:
                    div = 2 if b == s0 else 4 if q < 2 else 8
                    for k in range(div):
                        frac = ((b - s0) * bpb + q + k / div) / (nb * bpb)
                        place(dry, stereo(clap() * (0.2 + 0.6 * frac)), tb + k * beat / div)
        for l in layers:
            if l.startswith("riser@"):
                rb = int(l.split("@")[1])
                end = (s0 + nb) * bar
                r = stereo(riser(end - rb * bar), 0.0) * 0.8
                place(music, r, rb * bar)
                place(send, r * 0.5, rb * bar)
        if sec.get("impact"):
            place(dry, stereo(impact()), s0 * bar)
            place(send, stereo(impact()) * 0.6, s0 * bar)
            impacts.append(s0 * bar)

    # sidechain: duck music on every kick
    sc = np.ones(N)
    for k in kicks:
        i = int(k * SR)
        n = int(0.28 * SR)
        j = min(N, i + n)
        sc[i:j] = np.minimum(sc[i:j], 0.35 + 0.65 * np.linspace(0, 1, n)[: j - i] ** 0.6)
    music *= sc
    wet = np.stack([fftconvolve(send[0], reverb_ir()[0])[:N], fftconvolve(send[1], reverb_ir()[1])[:N]])
    mix = dry * 0.9 + music + wet * 0.35
    mix = np.stack([hp(mix[0], 28), hp(mix[1], 28)])
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # gentle saturation / glue
    mix *= 0.89 / max(1e-9, np.abs(mix).max())  # peak −1 dBFS; loudness set at export
    # 2 s fade-out tail
    fo = int(2.0 * SR)
    mix[:, -fo:] *= np.linspace(1, 0, fo)

    beats = [round(i * beat, 4) for i in range(spec["bars"] * bpb)]
    meta = {
        "tempo": bpm,
        "beats": beats,
        "downbeats": beats[::bpb],
        "sections": [{"name": s["name"], "startSec": s["startBar"] * bar, "endSec": (s["startBar"] + s["bars"]) * bar} for s in spec["sections"]],
        "impacts": impacts,
        "kicks": sorted(set(round(k, 4) for k in kicks)),
        "duration": round(total, 3),
        "generator": "scripts/py/synth.py (procedural, royalty-free)",
    }
    return mix, meta


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec")
    ap.add_argument("-o", "--out", required=True)
    args = ap.parse_args()
    import soundfile as sf

    spec = json.loads(Path(args.spec).read_text())
    mix, meta = render(spec)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, mix.T, SR, subtype="PCM_24")
    out.with_suffix(".beats.json").write_text(json.dumps(meta, indent=1))
    print(json.dumps({"out": str(out), "duration": meta["duration"], "beats": len(meta["beats"]), "impacts": meta["impacts"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
