#!/usr/bin/env python3
"""Automated Quality Control for a rendered deliverable.

  .venv/bin/python scripts/py/qc.py renders/final.mp4 --spec social-vertical [--json out/qc.json]

Checks (all via ffprobe/ffmpeg, no extra deps):
  * container/codec/pixel format/resolution/fps vs. delivery spec
  * duration bounds
  * integrated loudness (EBU R128) + true peak vs. platform target
  * black frames, frozen frames, digital silence
  * audio present & stereo
Exit code 0 = PASS, 1 = FAIL (any blocking issue), 2 = usage error.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from fractions import Fraction

SPECS = {
    # name: (width, height, fps, lufs_target, lufs_tol, true_peak_max, max_duration)
    "social-vertical": (1080, 1920, 30, -14.0, 1.5, -1.0, 180),
    "youtube-16x9": (1920, 1080, 30, -14.0, 1.5, -1.0, None),
    "broadcast-16x9": (1920, 1080, 25, -23.0, 1.0, -1.0, None),
    "square": (1080, 1080, 30, -14.0, 1.5, -1.0, 120),
    "any": (None, None, None, -14.0, 3.0, -1.0, None),
}


def run(cmd: list[str]) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.stdout + p.stderr


def probe(path: str) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--spec", default="any", choices=SPECS.keys())
    ap.add_argument("--json", default=None)
    ap.add_argument("--allow-silent", action="store_true", help="don't fail if there is no audio")
    args = ap.parse_args()

    w, h, fps, lufs_t, lufs_tol, tp_max, max_dur = SPECS[args.spec]
    info = probe(args.input)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    dur = float(info["format"].get("duration", 0))
    issues: list[dict] = []
    checks: dict = {"file": args.input, "spec": args.spec, "duration": round(dur, 3)}

    def issue(sev: str, msg: str) -> None:
        issues.append({"severity": sev, "message": msg})

    if not v:
        issue("blocker", "no video stream")
    else:
        rfps = float(Fraction(v.get("r_frame_rate", "0/1"))) if v.get("r_frame_rate", "0/0") != "0/0" else 0.0
        checks.update(codec=v["codec_name"], pix_fmt=v.get("pix_fmt"), width=v["width"], height=v["height"], fps=round(rfps, 3))
        if w and (v["width"], v["height"]) != (w, h):
            issue("blocker", f"resolution {v['width']}x{v['height']} != {w}x{h}")
        if fps and abs(rfps - fps) > 0.01:
            issue("major", f"fps {rfps:.3f} != {fps}")
        if v["codec_name"] == "h264" and v.get("pix_fmt") != "yuv420p":
            issue("major", f"pix_fmt {v.get('pix_fmt')} — use yuv420p for platform compatibility")
    if max_dur and dur > max_dur:
        issue("major", f"duration {dur:.1f}s exceeds {max_dur}s")

    # Black frames & freezes
    bd = run(["ffmpeg", "-hide_banner", "-nostats", "-i", args.input, "-vf", "blackdetect=d=0.25:pic_th=0.98", "-an", "-f", "null", "-"])
    blacks = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", bd)
    checks["black_segments"] = [(float(s), float(e)) for s, e in blacks]
    for s, e in checks["black_segments"]:
        if s > 0.05 and e < dur - 0.05:  # mid-programme black is suspicious; head/tail black is fine
            issue("major", f"black frames {s:.2f}-{e:.2f}s mid-programme")
    fz = run(["ffmpeg", "-hide_banner", "-nostats", "-i", args.input, "-vf", "freezedetect=n=0.001:d=1.5", "-an", "-f", "null", "-"])
    freezes = re.findall(r"freeze_start: ([\d.]+)", fz)
    checks["freeze_starts"] = [float(x) for x in freezes]
    if freezes:
        issue("minor", f"{len(freezes)} frozen segment(s) ≥1.5s at {', '.join(freezes)}s — confirm intentional holds")

    # Audio
    if not a:
        if not args.allow_silent:
            issue("blocker", "no audio stream")
    else:
        checks["audio"] = {"codec": a["codec_name"], "channels": a.get("channels"), "sample_rate": a.get("sample_rate")}
        if a.get("channels", 0) < 2:
            issue("minor", "audio is mono")
        ln = run(["ffmpeg", "-hide_banner", "-nostats", "-i", args.input, "-af", "loudnorm=print_format=json", "-vn", "-f", "null", "-"])
        m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", ln, re.S)
        if m:
            L = json.loads(m.group(0))
            I, TP = float(L["input_i"]), float(L["input_tp"])
            checks["loudness"] = {"integrated_lufs": I, "true_peak_dbtp": TP, "lra": float(L["input_lra"])}
            if I < -60:
                issue("blocker", "audio track is silent")
            elif abs(I - lufs_t) > lufs_tol:
                issue("major", f"loudness {I:.1f} LUFS, target {lufs_t} ±{lufs_tol} — run export with --normalize")
            if TP > tp_max:
                issue("major", f"true peak {TP:.1f} dBTP > {tp_max}")
        sd = run(["ffmpeg", "-hide_banner", "-nostats", "-i", args.input, "-af", "silencedetect=n=-60dB:d=2", "-vn", "-f", "null", "-"])
        sil = re.findall(r"silence_start: ([\d.]+)", sd)
        if sil:
            issue("minor", f"digital silence ≥2s at {', '.join(sil)}s")

    blocking = [i for i in issues if i["severity"] in ("blocker", "major")]
    result = {"status": "FAIL" if blocking else "PASS", "checks": checks, "issues": issues}
    txt = json.dumps(result, indent=2)
    if args.json:
        with open(args.json, "w") as f:
            f.write(txt)
    print(txt)
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main())
