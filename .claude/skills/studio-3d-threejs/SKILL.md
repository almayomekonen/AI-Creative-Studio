---
name: studio-3d-threejs
description: Procedural 3D for video with Three.js inside Remotion — 3D product visualization (glass, metal, liquid, labels), liquid chrome, cinematic virtual cameras (orbit, push-in, crane, macro), film lighting (three-point, studio environment, rim sweeps), mirrored-floor reflections and bloom. Use for any 3D shot, product ad, packshot, abstract 3D object or camera move through a 3D scene. No downloads, no paid tools.
---

# 3D with Three.js (in Remotion)

Stack: `three@0.187` + `@react-three/fiber` + `@remotion/three` (`ThreeCanvas`). GPU rendering via ANGLE/Metal in headless Chrome — verified on this M1.

## Ready-made components (`remotion/src/three/`)
| Component | What it gives you | Key props |
|---|---|---|
| `ProductStage` | glass flacon (transmission, IOR 1.5, clearcoat), amber liquid, faceted metal cap, canvas-drawn label, glow card backdrop, three-point lights, moving rim-light sweep, mirrored product on dark glass floor, bloom | `brand`, `sub`, `spin`, `orbit`, `dist`, `height`, `lookY`, `sweep`, `sweepIntensity`, `liquid`, `cap`, `glow`, `fonts` |
| `LiquidChrome` | mercury/liquid-gold blob: simplex-noise displaced icosphere reflecting a procedural studio, thin-film iridescence, beat `pulse` | `amp`, `pulse`, `tint`, `iridescence`, `orbit`, `dist`, `lookY`, `bloom` |
| `Bloom` (`PostFX.tsx`) | UnrealBloom post-process that works frame-by-frame | `strength`, `radius`, `threshold` |
| `ShaderCanvas` | full-frame GLSL (see `studio-glsl-shaders`) | `fragment`, `uniforms` |
| `ParticleMorph` | see `studio-particles` | |
Reference use: `remotion/src/reel/Reel.tsx` (SceneProduct, SceneLiquid). Test benches: `remotion/src/three/Lab.tsx` (`Lab-*` compositions).

## Product library & stages (Phase 3)
- `ProductScene` (`three/ProductScene.tsx`): any product × any stage × keyframed camera (`from`/`to`, `ease`, `lens` mm) × motion (spin, float, drop-in with bounce, tilt) × `dof` (Bokeh, `"auto"` focuses on the camera distance) × bloom.
- Products (`three/products.tsx`): `flacon` (heavy perfume), `prism` (hex fragrance + iridescent pearl stopper), `can` (330 ml, printed wrap, ring-pull), `jar` (frosted skincare), `watch` (steel case, live Swiss-railway dial drawn per frame). Add one = builder + `PRODUCTS` entry with true `width/height` bounds.
- Stages: `noir` (glow card + mirror floor), `neon` (coloured rims + glowing grid mirror), `dream` (gradient sky dome, float), `white` (infinity cove + contact shadow), `void` (rims only — best for metal macros).
- **Aspect-correct framing**: give `fill` instead of `dist` → `fitDistance(w, h, lens, aspect, fill)`; essential for 9:16.
- Gotchas learned: nested transmission is invisible in three.js (make liquids opaque-glossy inside glass); glass on pale sets needs a sky dome/glow to refract; white/dream stages need lower exposure (`Env exposure`); canvas-texture cylinders: centre the art with `texture.offset.x = 0.5`.
- Bench: `Lab-Library-9x16` renders every product on its stage.

## Rules that keep renders correct
1. **Everything derives from `useCurrentFrame()`** — rotation, camera, uniforms. Never `useFrame` deltas, `Clock`, `Date.now()` or `Math.random()` (use `random(seed)` from remotion).
2. Set camera every render in a tiny `Rig` component (`camera.position.set(...); camera.lookAt(...)`) — see ProductStage/LiquidChrome.
3. Build geometries/materials in `useMemo`; only mutate uniforms/props per frame.
4. Async work (fonts for canvas textures, glTF) must hold the render: `delayRender()` → `continueRender()`.
5. Render with `--gl=angle` (set in `remotion.config.ts`). Concurrency ≤ 2 on 8 GB.

## Virtual cinematography
- **Lens → fov** (vertical, full-frame): `fov = 2·atan(12/f)` in degrees → 24 mm ≈ 53°, 35 mm ≈ 38°, 50 mm ≈ 27°, 85 mm ≈ 16°, 100 mm macro ≈ 14°. Product hero = 50–85 mm; macro = 100 mm close (`dist` small).
- Moves: **push-in** (animate `dist` down, ease-out), **orbit** (animate `orbit`), **crane** (`height` + `lookY` together), **macro detail** (small `dist`, high `lookY` on the detail). One move per shot; cut on downbeats.
- Low camera height (0.8–1.0 for a 2.7-unit product) = heroic, premium.

## Lighting recipes
- **Product (dark luxury)**: dark backdrop + warm radial glow card behind the product (glass refracts it — without it glass reads black), warm key spot top-right, cool fill left, hard white rim from behind, `RoomEnvironment` PMREM for reflections (`StudioEnvironment`, intensity ≈ 0.5), a moving point light for the specular "glint pass", bloom threshold ≈ 0.85.
- **Chrome/liquid metal** reflects its *environment*, not lights: richness comes from `STUDIO_ENV` (softbox strips, horizon line, floor mirror) in `glsl.ts`. Too dark → add strips; clay-looking → floor too bright.
- **Floors**: mirrored copy of the product (`scale={[1,-1,1]}`) under an unlit semi-transparent dark plane = clean studio reflection. Avoid clearcoat floors with a bright env (grazing Fresnel turns them grey).

## New products
`ProductStage` uses lathe profiles (`BOTTLE_PROFILE`). Any rotationally symmetric product = new `[radius, height]` list: can, jar, lipstick, candle, cup. Non-lathe products: compose primitives (`RoundedBox` via ExtrudeGeometry, `TubeGeometry`), or load a **free/own glTF** with `GLTFLoader` from `three/examples/jsm` (hold the render with `delayRender`). Labels/screens: draw on a Canvas 2D texture (`makeLabel`) — text, logos, UI mockups, all procedural.

## Iterate visually
`npx remotion still remotion/src/index.ts Lab-Product tmp/x.jpg --frame=60 --scale=0.5` → look → adjust → repeat. Always review stills before a full render.
