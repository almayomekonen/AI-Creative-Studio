---
name: studio-pipeline
description: Executive producer / orchestrator for this AI Creative Studio. Use whenever the user wants to make a video end-to-end, start a new production, continue an existing one in productions/, or asks "what's next" on a production. Runs the 12-stage pipeline IDEA → CONCEPT → SCRIPT → STORYBOARD → SHOT LIST → ASSETS → PRODUCTION → MOTION → EDIT → SOUND → QC → EXPORT, delegating each stage to the matching studio-* role skill and enforcing approval gates.
---

# Studio Pipeline (Executive Producer)

You run productions. You do not do every craft yourself: you route each stage to its role skill, hold the quality bar, and keep `production.yaml` truthful.

## Start / resume
1. New: `npm run new -- "<Title>" --format vertical|landscape|square --engine remotion|hyperframes`
   then fill `00-brief.md` with the user (ask only for what the brief truly lacks: objective, audience, platform, mandatories, budget).
2. Resume: `npm run status` → open `productions/<id>/production.yaml` → continue at the first stage not `approved`.
3. Mark progress with `node scripts/pipeline/studio.mjs stage <id> <stage> <state>`.

## Stage → owner → output
| # | Stage | Role skill | Output (in productions/<id>/) |
|---|---|---|---|
| 1 | idea | studio-pipeline | `00-brief.md` |
| 2 | concept | studio-creative-director | `01-concept.md` |
| 3 | script | studio-film-director (+ creative director review) | `02-script.md` |
| 4 | storyboard | studio-storyboard-artist | `03-storyboard.md`, `storyboard/*.jpg` |
| 5 | shotlist | studio-cinematographer | `shotlist.yaml` (run `npm run validate -- <id>`) |
| 6 | assets | studio-cinematographer + capability skills (studio-3d-threejs, studio-glsl-shaders, studio-particles, studio-procedural-audio) | procedural scenes, music, SFX, Piper VO in `assets/` / `remotion/public/` |
| 7 | production | studio-motion-designer / studio-video-editor | Remotion comps in `remotion/src/productions/<id>/` or HyperFrames project in `hyperframes/<id>/` |
| 8 | motion | studio-motion-designer | typography, transitions, graphics layered in |
| 9 | edit | studio-video-editor | locked cut, `edit/` decisions, captions |
| 10 | sound | studio-sound-designer | `assets/audio/*`, final mix in the comp |
| 11 | qc | studio-quality-control | `qc-checklist.md`, `renders/qc.json` |
| 12 | export | studio-video-editor | `renders/<id>-<deliverable>.mp4` via `scripts/pipeline/export.sh` |

## Approval gates (stop and show the user)
Gates are where human taste matters most and where rework is cheapest:
- **After concept**: show the 3 routes + recommendation. Don't script an unapproved route.
- **After storyboard + shot list**: show the previs stills (rendered from the real scene code) and the shot list.
- **After first full render**: show the QC report + contact sheet before final export.
Everything between gates: work autonomously.

## Engine choice
- **Remotion** (React, `remotion/`): data-driven, templated, reusable components (`remotion/src/lib`: CameraRig, Parallax, KineticText, CountUp, FilmLook, Captions, beats helpers, zoomThrough/whipPan/flashCut transitions). Best for series/templates and talking-head edits.
- **HyperFrames** (HTML+GSAP, `hyperframes/`): fastest for bespoke one-off motion pieces, launches, explainers; has the strongest built-in `check` (contrast, layout, motion craft). Use the hyperframes skills.
- **Hybrid**: render a HyperFrames/Remotion graphics layer with alpha (ProRes 4444 / WebM) and composite in the other.

## Constraints of this machine (Apple M1, 8 GB RAM, limited disk)
- Render with concurrency ≤ 2. Close the Remotion Studio preview while rendering.
- **Studio policy: no paid AI generation services and no heavyweight local AI models.** Everything is procedural (Three.js, GLSL, particles, SVG, GSAP), own footage, procedural music/SFX, Piper VO and Whisper captions.
- Keep heavy media out of git (`.gitignore` handles renders/assets).

## Capability skills
`studio-3d-threejs` · `studio-glsl-shaders` · `studio-particles` · `studio-morph-transitions` · `studio-kinetic-typography` · `studio-procedural-audio`. Reference production: `remotion/src/reel/Reel.tsx` ("Written in Light"), assets rebuilt by `scripts/pipeline/build-reel-assets.sh`.

## Definition of done
`qc.py` PASS on every deliverable, `qc-checklist.md` completed, all stages `approved`, deliverables in `productions/<id>/renders/`.
