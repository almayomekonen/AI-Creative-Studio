# Production pipeline

| # | Stage | Role skill | Artifact | Gate |
|---|---|---|---|---|
| 1 | Idea | studio-pipeline | `00-brief.md` | |
| 2 | Creative concept | studio-creative-director | `01-concept.md` (3 routes + pick) | **user approves route** |
| 3 | Script | studio-film-director | `02-script.md` (A/V, timed) | |
| 4 | Storyboard | studio-storyboard-artist | `03-storyboard.md`, `storyboard/` | |
| 5 | Shot list | studio-cinematographer | `shotlist.yaml` (schema-validated) | **user approves shots + cloud cost** |
| 6 | Asset generation | studio-cinematographer (+ director-video, cinematic-director) | `assets/generated/` | |
| 7 | Video production | studio-motion-designer / studio-video-editor | Remotion comp / HyperFrames project | |
| 8 | Motion graphics | studio-motion-designer | type, transitions, graphics | |
| 9 | Editing | studio-video-editor | locked cut + captions | |
| 10 | Sound design | studio-sound-designer | mix, beat sync, loudness | |
| 11 | Quality control | studio-quality-control | `qc-checklist.md`, `renders/qc.json` | **user sees QC + contact sheet** |
| 12 | Final export | studio-video-editor | `renders/*.mp4` via export presets | |

State lives in `production.yaml` (`stages:` pending → in_progress → review → approved). `studio.mjs validate` refuses out-of-order approvals.

## Capability map
| Capability | How |
|---|---|
| Cinematic AI scenes / image-to-video | cloud models (fal.ai/Replicate: Kling, Veo, Seedance, Wan…) prompted via `director-video` + `cinematic-director`; key frames first, then animate |
| Motion graphics, kinetic typography | Remotion `KineticText`, `CountUp`; HyperFrames + `motion-graphics` skill |
| 2D / 2.5D / 3D | CSS 3D (Showreel DepthScene), `Parallax`, `@remotion/three` on demand |
| Camera moves | `CameraRig` (push/pull/truck/dutch/handheld) |
| Transitions, match cuts | `zoomThrough`, `whipPan`, `flashCut`, @remotion/transitions; graphic match cut pattern in Showreel |
| Parallax & depth | `Parallax` with rack-focus blur |
| Film look | `FilmLook` grain/vignette/letterbox/flicker/tint; LUTs via ffmpeg lut3d |
| Music sync | `beats.py` → `cutPointsFromBeats`, `beatPulse` |
| Auto subtitles | `transcribe.py` (faster-whisper, offline) → `Captions` word-highlight |
| Talking-head editing | `TalkingHead` comp: punch-ins, B-roll inserts, hook title, captions, music bed |
| B-roll | `scenes.py` logging + `broll` inserts; AI-generated B-roll via cloud |
| Short-form / reframing | vertical formats, `export.sh vertical-from-16x9` |
| QC | `qc.py` (spec, EBU R128, black/freeze/silence) + `hyperframes check` + contact sheets |
| Render & export | `render-remotion.mjs`, `hyperframes render`, `export.sh` presets |

## Verified benchmarks (this machine)
| Job | Time |
|---|---|
| Showreel 12 s 1080p (Remotion, concurrency 2) | 14–41 s (first run includes bundling + Chrome download) |
| TalkingHead 6 s 1080×1920 | 13 s |
| HyperFrames 10 s 1080p | 20 s |
| Transcribe 6 s speech (whisper small, int8 CPU) | 5 s |
| Full test suite | 56 s |
