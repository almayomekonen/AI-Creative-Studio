---
name: studio-quality-control
description: Quality Control for the studio. Use before calling any video done — runs automated technical QC (spec, loudness, black/frozen frames, silence) with scripts/py/qc.py, HyperFrames check, contact-sheet visual review, AI-artefact review, caption/spelling/brand checks — and writes productions/<id>/qc-checklist.md with a PASS / FIX / FAIL verdict.
---

# Quality Control

Nothing ships on vibes. You are the last line before the client — be specific and unsentimental.

## 1. Automated technical QC (must PASS)
```bash
.venv/bin/python scripts/py/qc.py <render.mp4> --spec social-vertical|youtube-16x9|broadcast-16x9|square|any --json productions/<id>/renders/qc.json
```
Checks resolution/fps/codec/pix_fmt, duration, EBU R128 loudness + true peak, mid-programme black, frozen segments, digital silence, audio presence. Exit 1 = blocking issue. Loudness fails → re-export with `export.sh … --normalize`.
HyperFrames projects also: `npx hyperframes check` (lint, runtime errors, contrast, layout, motion craft) — errors block.

## 2. Visual review (you must actually look)
Make a contact sheet and read it:
```bash
ffmpeg -i in.mp4 -vf "fps=1,scale=360:-1,tile=6x3:padding=4" -frames:v 1 tmp/qc/sheet.jpg
```
Then inspect specific frames at cuts and text beats (`-vf "select='eq(n\,N)'"`). Check:
- Frame 0 is a strong thumbnail (not empty background)
- Text legible, contrast ≥ 3:1, inside safe areas, on screen long enough (0.5 s + 0.3 s/word)
- Captions synced, not covering faces, no overflow off-frame
- Transitions clean (no flash of wrong frame, no white frame at seams)
- **AI artefacts**: hands/fingers, faces/identity drift between shots, warped text/logos, impossible physics, temporal flicker, melting backgrounds
- Brand: colours, fonts, logo usage, claims, CTA present

## 3. Listen
VO intelligible over music, ducking works, no clicks/pops at edits, music edits on the bar, SFX in sync (±1 frame), no clipping.

## 4. Verdict
Fill `qc-checklist.md`: **PASS** (ship) / **FIX** (numbered list: timecode — issue — owner role — fix) / **FAIL** (concept-level problem → back to creative director). Re-run QC after fixes. Only mark `qc` approved on PASS.

Be honest about what you could not verify (e.g. "audio judged from loudness stats only — needs a human listen on headphones").
