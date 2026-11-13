---
name: studio-concept-engine
description: Creative direction system that generates genuinely original commercial concepts (15–30 s, any aspect, 9:16 first) — mechanism catalogue, hook bank, progression arcs, ending types, transition vocabulary, originality rules and a scoring rubric — and turns the winning concept into a CommercialSpec JSON the engine renders. Use whenever a new ad/commercial/promo/teaser is needed, before any scene is built.
---

# Concept Engine

Technique is cheap; ideas are not. This is the method that turns a brief into an idea worth rendering. Output: `remotion/src/commercials/<id>.json` (a `CommercialSpec`) whose `concept` block records the thinking.

## 1. Find the product truth (one sentence)
What does it *do* to a person? (VOLT: the moment of opening = a jolt. ÉTHER: a scent is a place you can't visit. TEMPO: precision = rhythm.) Every scene must dramatise this truth, never just display the product.

## 2. Generate ≥3 routes from different mechanisms
| Mechanism | Shape of the idea |
|---|---|
| Transformation | A becomes B becomes C (product → particles → word) |
| Portal / journey | go *through* something (the opening, the glass, the dial) into another world |
| Scale shift | macro detail becomes a landscape, or a world becomes a product |
| Material metaphor | the product's material *is* the world (silk, liquid chrome, voltage, glass) |
| Sensory translation | sound becomes image (a crack, a tick, a breath) |
| Ritual close-up | elevate a 1-second gesture (opening, spraying, clasping) into the whole film |
| Reversal / contrast | white world → black moment; silence → explosion |
| Count / clock | the edit *is* a counter: beats, seconds, steps |
| Assembly | parts converge into the whole on the downbeat |
| Callback loop | the last image returns to the first, transformed |
Kill routes that only "show the product nicely". Record killed routes and why in `concept.routes`.

## 3. Hook bank (first 1.5 s, sound OFF must still work)
Extreme macro mystery · impossible image · a single loud word slammed on the first beat · motion already in progress (never fade from black) · a sound-led cut (crack, tick, breath) with a visual equal · pattern interrupt (frame breaks, glitch, portal opening). **Frame 0 must already be striking — it's the thumbnail.**

## 4. Progression arc (pick one, make it visible)
Escalation (small → vast) · Journey (outside → inside → beyond) · Assembly (parts → whole) · Reveal (mystery → product) · Transformation chain. Each scene must change ≥2 of: palette, scale, block type, camera move, light. Require ≥4 visually distinct scenes and ≥2 *unexpected* transitions (portal, iris morph, glitch, particles-from-shape, zoom-through) — hard cuts and flashes for the rest.

## 5. Ending (make it memorable)
Product truth lockup + line · Callback (hook image returns transformed) · Button (one last surprise after the logo: a spark, a tick, a wink) · Loop (last frame = first frame) · World-is-the-product reveal. Hold the logo ≥1.5 s; CTA inside the safe zone.

## 6. Score before building (1–5 each; build only if total ≥ 24/30)
`hook` · `originality` · `progression` · `transitions` · `ending` · `producibility` (with our stack: product/shader/particles/chrome/type/montage/endcard blocks, Piper VO, synth music). Write scores into `concept.scores`.

## 7. Write the spec
Use the identity system (`remotion/src/engine/styles.ts`: noir-luxe, acid-volt, ethereal-dawn, swiss-precision, chrome-y2k, mono-brutal) — one identity per film. Design music and edit on one clock: choose `bpm` so frames/beat is an integer at 30 fps (90→20, 100→18, 120→15, 150→12); scenes are measured in beats; section changes = scene changes; impacts = transitions. Every scene needs `direction` (intent, shot, camera, lens, lighting, sound, edit). Then run the production pipeline (`studio-commercial` skill).

Reference concepts: `remotion/src/commercials/{volt,ether,tempo}.json`.
