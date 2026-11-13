# QC Report — Social CRM — The Employee That Never Sleeps

## Automated (qc.py) — **PASS**
| Check | Result |
|---|---|
| Resolution / fps / codec | 1080×1920 · 30 fps · h264 yuv420p |
| Duration | 35.008s |
| Loudness | -14.03 LUFS · TP -1.5 dBTP · LRA 5.9 |
| Black segments | [] |
| Frozen segments | [] |
| Issues | none |

## Visual review
See `storyboard/contact-sheet.jpg` and `storyboard/mobile-safe-check.jpg`; reviewer notes are appended below by the QC pass.

## Reviewer notes (visual pass on the final 60 fps file)
- Every scene inspected at 2 fps (70 frames) + per-scene full-size frames; Hebrew RTL correct in all 3D interfaces, labels, subtitles and end card.
- Mobile safe zones: all overlay text and subtitles outside platform UI zones (`storyboard/mobile-safe-check.jpg`).
- Transitions verified: storm→phone push, convergence flash, core→interface match cut, five object-to-object transformations, collapse→phone match, night→day light change, hero→logo morph.
- Not verified: audio by ear (measurement only). Scratch VO must be replaced before publishing.
