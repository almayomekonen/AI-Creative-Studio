# Roadmap & known gaps

## Decisions for the user
1. **Blender** (optional, ~1.2 GB, installs to /Applications — outside the project): adds real fluid/cloth/rigid-body simulation and Cycles path tracing, driven headless from Python (`blender -b -P script.py`). Three.js covers current needs.
2. **HyperFrames global skills update** (`npx hyperframes skills update`) — modifies `~/.claude/skills`.
3. **Remotion licence** only if the studio becomes a company of more than 3 people.

## Next capabilities (free/procedural)
- glTF product pipeline: load client CAD/glTF models into ProductStage-style lighting.
- More shader worlds: desert monoliths, underwater caustics, neon city (SDF repetition), volumetric clouds.
- Image-to-particles and image-based 2.5D (depth from luminance) for client stills.
- Synth: more genres (orchestral-ish pads, lo-fi), stems export, automatic VO ducking.
- Kokoro TTS as a more expressive voice option (Apache-2.0, ~90 MB quantized) — evaluate quality vs Piper.
- Visual regression tests: golden frames for each Lab composition.
- 9:16 cut of the reel (reframe layouts for vertical).
