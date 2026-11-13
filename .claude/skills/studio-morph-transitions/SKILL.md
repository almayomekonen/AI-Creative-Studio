---
name: studio-morph-transitions
description: Morphing and transitions — SVG shape morphing (circle→star→blob→logo), graphic match cuts, zoom-throughs, whip pans, flash cuts on music impacts, liquid-gradient and blur entries, beat-cut montages. Use when designing how one shot becomes the next, logo reveals by morph, or fast rhythmic montages.
---

# Morphing & Transitions

## Toolbox
| Need | Use |
|---|---|
| Shape morph sequence | `MorphShape` (`lib/Morph.tsx`) — `shapes` (names from `SHAPES` or raw SVG `d`), `morphFrames`, `holdFrames`, `fills`, `rotatePerShape`. flubber point-matching = no ugly vertex popping. |
| One-off morph with explicit progress | `MorphPath from to progress` — drive `progress` from the frame for match-cut morphs (e.g. a circle becomes the logo). |
| Zoom-through / whip pan / flash | `zoomThrough()`, `whipPan()`, `flashCut()` (`lib/transitions.tsx`) inside `TransitionSeries`, plus all `@remotion/transitions` (fade, slide, wipe, iris, clockWipe…). CSS-only = render-safe. |
| Impact flash over hard cuts | `Flash` pattern in `reel/Reel.tsx` (screen-blend white/colour peak on the cut frame). |
| Scale+blur entry ("arrival") | scale 1.35→1 and blur 16→0 over 10 frames (SceneMorph in the reel). |
| GSAP-native morphs | `gsap` is installed and free (MorphSVG/SplitText included) — use via `useGsapTimeline` (`studio-kinetic-typography`). |

## Graphic match cut (signature move)
Outgoing and incoming shots share an element with **identical position, size and colour on the cut frame** (Showreel: sun → REC light at 50%/46%, Ø300). Or morph it: `MorphPath` from the outgoing shape to the incoming shape across 6–10 frames while the background cuts.

## Montage on the beat
Cut every beat (15 frames @120 BPM), change one variable per cut (word, palette, shape), keep one constant (centre composition) so it reads as rhythm, not chaos. Ticks/hits on each cut; whoosh 4–6 frames before the first.

## Rules
Velocity-match across cuts (motion continues in the same direction). Transitions on downbeats or impacts only. Max one "showy" transition per 4 bars; hard cuts do most of the work.
