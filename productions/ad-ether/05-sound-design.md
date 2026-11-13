# Sound Design — ÉTHER — Wear the Dream
All audio is generated locally: `synth.py` (score), `sfx.py` (effects), Piper (`en_US-lessac-medium`) VO, Whisper-timed script-exact subtitles.

## Score
90 BPM · 8 bars · progression D3 sus2 → B2 minor → G2 major → A2 sus2

| Section | Time | Layers | Energy | Impact |
|---|---|---|---|---|
| breath | 0.00–5.33s | pad | 0.3 |  |
| dream | 5.33–16.00s | pad, arp, riser@5 | 0.5 | yes (on downbeat) |
| wake | 16.00–21.33s | pad, arp | 0.35 | yes (on downbeat) |

## Voiceover
| Time | Line | Scene |
|---|---|---|
| 3.00s | “There is a place between waking and dreaming.” | S02 |
| 9.67s | “You can't visit it.” | S03 |
| 17.67s | “But you can wear it.” | S06 |

## SFX cue sheet
| TC | SFX | Scene | Source |
|---|---|---|---|
| 00:00:02:02 | whoosh | S02 | auto (iris) |
| 00:00:06:02 | whoosh | S03 | auto (portal) |
| 00:00:10:06 | whoosh | S04 | auto (zoom) |
| 00:00:13:00 | shimmer | S04 | scripted |
| 00:00:14:02 | whoosh | S05 | auto (iris) |
| 00:00:16:22 | whoosh | S06 | auto (portal) |

## Mix
Music 0.8 under VO (sidechained to kick inside the score), SFX 0.3–0.8, final delivery normalised to −14 LUFS / −1.5 dBTP (export.sh) and verified by qc.py.
