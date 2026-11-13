---
name: studio-glsl-shaders
description: GLSL shader worlds and effects for video — raymarched surreal environments (SDF architecture, mirror seas, skies, fog), liquid/flowing gradients, noise fields, procedural skies, film tonemapping, shader transitions. Use for surreal or impossible environments, abstract backgrounds, liquid simulation looks, generative art, and any full-frame procedural visual. Runs on the GPU inside Remotion via ShaderCanvas.
---

# GLSL Shader Worlds

## Tools
- `ShaderCanvas` (`remotion/src/three/ShaderCanvas.tsx`): full-frame fragment shader. Built-ins `uTime` (s), `uRes` (px), `vUv`. Pass extra `float`/`vec2`/`vec3` uniforms per frame — animate them from the frame for deterministic camera moves.
- Chunks (`remotion/src/three/glsl.ts`): `SIMPLEX3D` (`snoise`, `fbm`), `TONEMAP` (`aces`, `finish` = ACES + gamma), `STUDIO_ENV` (`studioEnv(dir, sweep)` photo-studio reflections).
- Shaders (`remotion/src/three/shaders.ts`):
  - `SURREAL_WORLD` — infinite monolith arches over a rippled mirror sea at dusk, floating chrome orb, fog, cloud bands. Uniforms `uDolly` (travel), `uRise` (crane), `uSun` (sun height), `uOrb` (glow).
  - `LIQUID_GRADIENT` — domain-warped fbm colour flow. Uniforms `uA/uB/uC` colours, `uFlow` speed.

## Raymarching recipe (how SURREAL_WORLD works — reuse it)
1. Camera: `ro` (origin) + look-at basis → `rd = normalize(uv.x*right + uv.y*up + zoom*fwd)`. `zoom` 1.7 ≈ 35 mm.
2. `map(p)` = min of SDFs. Primitives: `sdBox`, sphere `length(p)-r`, boolean `max(a,-b)` (subtract). **Domain repetition** `p.z = mod(p.z + c/2, c) - c/2` → infinite colonnades for the cost of one.
3. March ≤ 110 steps, hit when `d < 0.0008*t`. Normal by central differences.
4. Shade: low sun behind the subject → silhouettes + rim light (`pow(1-dot(n,-rd),4)`) = cinematic. Chrome = `sky(reflect(rd,n))`.
5. Water: intersect plane `y=0` analytically, perturb normal with `snoise`, trace the reflected ray once, Fresnel-blend.
6. Exponential fog toward the sky colour; finish with `finish()` (ACES).
Exposure discipline: keep sky ≤ ~1.0 except the sun disc; dark stone albedo (~0.05). If the frame looks washed out, lower fog density and sky brightness first.

## Ideas that are cheap in shaders
Infinite architecture (repetition), floating objects, impossible scale, mirror floors, volumetric-looking fog, aurora/cloud bands from fbm, liquid gradients for backgrounds and wipes, dissolve transitions (`step(noise, progress)`), heat haze/distortion (offset uv by noise), kaleidoscopes (polar repetition), audio-reactive uniforms (feed `beatPulse()`).

## Performance (8 GB M1)
1080p raymarch at 110 steps + 1 reflection bounce renders in well under a second per frame. Keep loops ≤ ~150 steps, avoid nested raymarches beyond one reflection, prefer `fbm` with 4 octaves. Test with `--scale=0.33` stills first.
