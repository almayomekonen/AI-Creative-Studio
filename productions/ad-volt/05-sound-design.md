# Sound Design — VOLT — Crack the Night Open
All audio is generated locally: `synth.py` (score), `sfx.py` (effects), Piper (`en_US-ryan-medium`) VO, Whisper-timed script-exact subtitles.

## Score
150 BPM · 12 bars · progression E2 minor → C2 major → G2 major → D2 major

| Section | Time | Layers | Energy | Impact |
|---|---|---|---|---|
| hook | 0.00–1.60s | pad, riser@0 | 0.3 |  |
| tunnel | 1.60–4.80s | kick, bass, hats16, clap, arp | 0.9 | yes (on downbeat) |
| build | 4.80–8.00s | pad, arp, snareroll, riser@3 | 0.6 |  |
| drop | 8.00–16.00s | pad, kick, bass, hats16, clap, arp | 1 | yes (on downbeat) |
| outro | 16.00–19.20s | pad | 0.3 | yes (on downbeat) |

## Voiceover
| Time | Line | Scene |
|---|---|---|
| 16.40s | “Crack the night open.” | S06 |

## SFX cue sheet
| TC | SFX | Scene | Source |
|---|---|---|---|
| 00:00:00:18 | hit | S01 | scripted |
| 00:00:00:18 | glitch | S01 | scripted |
| 00:00:01:00 | whoosh | S02 | auto (portal) |
| 00:00:04:18 | glitch | S03 | auto (glitch) |
| 00:00:06:24 | shimmer | S03 | scripted |
| 00:00:07:18 | sub_drop | S03 | scripted |
| 00:00:10:22 | whoosh | S05 | auto (zoom) |
| 00:00:11:19 | sub_drop | S05 | scripted |
| 00:00:11:20 | hit | S05 | scripted |
| 00:00:18:18 | hit | S06 | scripted |

## Mix
Music 0.8 under VO (sidechained to kick inside the score), SFX 0.3–0.8, final delivery normalised to −14 LUFS / −1.5 dBTP (export.sh) and verified by qc.py.
