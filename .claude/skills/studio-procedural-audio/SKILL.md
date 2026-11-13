---
name: studio-procedural-audio
description: 100% local, royalty-free audio — procedural music from a JSON spec (synth.py: drums, bass, pads, arps, risers, impacts, sidechain, reverb) with exact beat maps, a procedural SFX library (whoosh, hit, riser, shimmer, glitch, tick, sub-drop), Piper TTS voiceover, script-aligned captions (Whisper timing + known script), and music-synchronised editing. Use for any soundtrack, sound design, VO, or beat-locked timing. No samples, no paid APIs.
---

# Procedural Audio & Music Sync

## Pipeline (one command for the reel: `bash scripts/pipeline/build-reel-assets.sh`)
| Step | Command | Output |
|---|---|---|
| Music | `.venv/bin/python scripts/py/synth.py spec.json -o music.wav` | WAV + `music.beats.json` with **exact** beats, downbeats, sections, impacts, kicks |
| SFX | `.venv/bin/python scripts/py/sfx.py -o remotion/public/sfx [--only whoosh --duration 0.6 --seed 3]` | whoosh, hit, riser, shimmer, glitch, tick, sub_drop |
| Voiceover | `.venv/bin/python scripts/py/tts.py "text" -o vo.wav` or `--spec spec.json -o dir/` | Piper VO (polished: HPF, presence EQ, compression, 48 k stereo) + `vo.json` durations |
| Captions | `transcribe.py` (timing) → `align_captions.py --script "…"` | words always match the script; Whisper only provides timing |

## Music spec (`remotion/src/reel/reel-spec.json` is the reference)
```json
{ "bpm": 120, "bars": 18, "progression": [["A2","minor"],["F2","major"],["C3","major"],["G2","major"]],
  "sections": [ {"name":"intro","startBar":0,"bars":4,"layers":["pad","riser@2"],"energy":0.25},
                {"name":"drop","startBar":4,"bars":3,"layers":["pad","kick","bass","hats","clap"],"energy":0.7,"impact":true} ] }
```
Layers: `pad kick bass hats hats16 clap arp snareroll riser@<bar>`; `impact: true` = boom on the section's first beat. Qualities: minor, major, sus2. Deterministic (seeded) — same spec, same track.
Design the **edit and the music from the same spec**: 120 BPM → 15 frames/beat, 60/bar @30 fps. Scene changes on section starts; flashes on impacts; motion pulses from `beatPulse(frame, fps, beatMap.kicks)`.

## Voice (Piper, GPL-3 tool — output audio is yours)
Voices in `models/piper/` (`en_US-ryan-medium` male narrator, `en_US-lessac-medium` female). More: `.venv/bin/python -m piper.download_voices --download-dir models/piper <voice>` (~60 MB each; check disk first). `--length-scale 1.4–1.6` for a deliberate trailer read.

## Mixing in Remotion
Music `<Audio volume≈0.8>` with fade-out curve; VO lines in `<Sequence from={atSec*fps}>`; SFX 2–6 frames before the visual for whooshes, on the frame for hits. Final loudness via `export.sh --normalize` (−14 LUFS social / −16 master). Verify with `qc.py`. You can't hear: check structure with a spectrogram (`ffmpeg -lavfi showspectrumpic`) and loudness with `ebur128`.

## Limits (be honest)
Synth timbres are clean electronic/cinematic — great for trailers, tech, product; not a replacement for acoustic/orchestral recordings. Piper is clear but less expressive than premium neural voices.
