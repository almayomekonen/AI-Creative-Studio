---
name: studio-particles
description: GPU particle systems for video — tens of thousands of particles that swirl in curl noise, assemble into text/logos/shapes, and explode on a beat; galaxies, dust, sparks, data-viz swarms. Use for logo reveals, "formed from particles" titles, energetic transitions and abstract motion. Deterministic, renders in Remotion via Three.js points + custom shaders.
---

# Particle Systems

## Component
`ParticleMorph` (`remotion/src/three/ParticleMorph.tsx`):
| Prop | Meaning |
|---|---|
| `text`, `font` | what the particles assemble into (font must be loaded — use the family from `lib/fonts.ts`) |
| `form` 0→1 | swirling galaxy → fully formed (per-particle staggered convergence) |
| `explode` 0→1+ | radial burst with curl-noise turbulence |
| `count` | default 24,000 (fine on M1; up to ~60k) |
| `orbit` | camera orbit angle |
| `colorA/colorB`, `size`, `fade`, `bloom` | look |

Targets are sampled from Canvas 2D text (`sampleTextPoints`) — any shape works: draw a logo/SVG/image onto the canvas instead of text and sample filled pixels.

## Choreography that reads well (from the reel)
- frames 0–8 galaxy drift → 8–78 form (ease in-out) → hold ~30 frames with a kicker line → explode over ~28 frames **landing on a music impact**, with a white flash cut into the next scene.
- Shimmer SFX (`remotion/public/sfx/shimmer.wav`) as the form completes; glitch/whoosh into the scene.
- Additive blending + bloom threshold ~0.2 gives the glowing look; reduce `size` if the formed text bleeds.

## Extending
- Other start states: replace the disc distribution in `Points` (sphere shell, grid, image pixels).
- Image → particles: draw an image on the canvas, sample colour too, pass as an `aColor` attribute.
- Determinism: all randomness uses `random(seed)`; motion is a pure function of `uTime`/`uForm`/`uExplode`.
