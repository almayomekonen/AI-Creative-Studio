---
name: studio-vfx
description: Reusable visual effects for commercials — portals (circular reveal with energy ring), star-iris morph reveals, glitch transitions, whip/zoom-throughs, impact flashes, shockwaves, spark bursts, explosions, object transformations (product → particles → logo), liquid chrome, glass, voltage tunnels, liquid silk. Use when a scene needs an effect or an unexpected transition.
---

# VFX Library

| Effect | Where | Use |
|---|---|---|
| Portal reveal | `transition: "portal"` (`engine/transitions.tsx`) | next world opens from the centre inside a glowing ring (out of a can lid, a bottle, a dial) |
| Iris morph | `transition: "iris"` | incoming scene revealed through a rotating star→circle shape |
| Glitch | `transition: "glitch"` + `glitch` type preset | RGB-split jitter + colour bars; energy/tech brands |
| Whip / zoom-through | `transition: "whip" | "zoom"` | velocity cuts; whoosh SFX added automatically |
| Flash cut | `transition: "flash"` or `vfx: flash` | impacts on downbeats |
| Shockwave | `vfx: shockwave` | landings, drops, explosions |
| Sparks | `vfx: sparks` | crack/opening moments, endcard "button" |
| Explosion | `particles` block `explodeAt` + flash + shockwave + `sub_drop`/`hit` SFX | |
| Object transformation | `particles` block `from: {path}` → `text` with `turbulence` | bolt → VOLT, bottle silhouette → Éther, second hand → Now. |
| Voltage tunnel | `shader: "tunnel"` (PORTAL_TUNNEL) | warp/energy journeys; core flashes on kicks |
| Liquid silk | `shader: "silk"` | beauty/fragrance textures |
| Liquid chrome | `chrome` block | abstract hero objects |
| Glass | product `flacon`/`prism` (transmission, IOR, clearcoat) on `noir`/`dream` stages | remember: glass needs something bright behind it |

Shape paths for particle `from`/`path` are SVG paths in a 200×200 box (draw silhouettes with M/L/a commands). Effects are frame-deterministic — safe to seek and render in parallel.
