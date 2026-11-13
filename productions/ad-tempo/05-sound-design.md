# Sound Design — TEMPO — Every Second Has a Beat
All audio is generated locally: `synth.py` (score), `sfx.py` (effects), Piper (`en_US-ryan-medium`) VO, Whisper-timed script-exact subtitles.

## Score
120 BPM · 9 bars · progression A2 minor → A2 minor → F2 major → G2 major

| Section | Time | Layers | Energy | Impact |
|---|---|---|---|---|
| tick | 0.00–2.00s | tick | 0.3 |  |
| pulse | 2.00–4.00s | tick, kick, bass | 0.6 |  |
| run | 4.00–8.00s | tick, kick, bass, clap, hats16, arp | 0.9 | yes (on downbeat) |
| hero | 8.00–12.00s | tick, kick, bass, pad, clap | 0.8 |  |
| now | 12.00–14.00s | pad, riser@6 | 0.4 |  |
| lockup | 14.00–18.00s | pad, tick | 0.3 | yes (on downbeat) |

## Voiceover
| Time | Line | Scene |
|---|---|---|
| 0.20s | “Every second has a beat.” | S01 |
| 14.20s | “Tempo. Keep your own time.” | S06 |

## SFX cue sheet
| TC | SFX | Scene | Source |
|---|---|---|---|
| 00:00:03:18 | whoosh | S03 | auto (whip) |
| 00:00:07:12 | whoosh | S04 | auto (iris) |
| 00:00:13:08 | shimmer | S05 | scripted |
| 00:00:13:16 | whoosh | S06 | auto (zoom) |

## Mix
Music 0.8 under VO (sidechained to kick inside the score), SFX 0.3–0.8, final delivery normalised to −14 LUFS / −1.5 dBTP (export.sh) and verified by qc.py.
