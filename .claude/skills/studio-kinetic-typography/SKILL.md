---
name: studio-kinetic-typography
description: Kinetic and dynamic typography for video — staggered per-character/word reveals, masked rises, blur-ins, tracking-ins, manifesto lines on the beat, title lockups, callouts with leader lines, count-ups, and full GSAP (SplitText, eases, timelines) running frame-accurately inside Remotion. Use for titles, manifestos, product callouts, lyric/beat type and end cards.
---

# Kinetic Typography

## Two engines
1. **`KineticText`** (`lib/KineticText.tsx`) — zero-dependency, spring-based: `style` = `rise` (masked) | `blur-in` | `scale-pop` | `track-in`; `by` word/char; `stagger`, `delay`, `emphasize` words in `accent`; `exitAt`. `CountUp` for numbers.
2. **GSAP via `useGsapTimeline`** (`lib/gsap.ts`) — build a paused timeline once; it is seeked to `frame/fps` every render, so any GSAP effect is deterministic:
```tsx
const ref = useGsapTimeline((tl, root) => {
  const split = SplitText.create(root.querySelector(".title")!, { type: "chars" });
  tl.fromTo(split.chars, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.022, duration: 0.5, ease: "expo.out" }, 3.0);
});
```
Use GSAP when you need its eases (`expo`, `back`, `elastic`, `steps`), SplitText lines/words/chars, or complex overlapping timelines. GSAP licence: free "Standard no-charge" (commercial OK).

## Fonts
`lib/fonts.ts` loads Google Fonts (embedded at render): `anton` (display), `instrumentSerif` (editorial), `inter` (UI). Add more with `@remotion/google-fonts/<Font>` — free, no runtime network.

## Patterns from the reel
- **Manifesto on the beat**: one line per 3 beats, chars rise in (0.5 s, expo.out), previous line exits up (0.3 s, expo.in) just before the next.
- **Callout**: thin accent leader line grows → serif title → tracked uppercase spec line; in 12 frames, out 10.
- **Lockup**: display caps (Anton, letter-spacing 10) + serif italic sub in accent colour.
- **Subtitles in the letterbox bar** (`Captions` with `y≈0.937`) — cinematic, never over the picture.

## Rules
Readability first: ≥ 0.5 s + 0.3 s/word on screen; contrast ≥ 4.5:1 (text-shadow on busy shaders); never more than two typefaces per piece; type moves on beats; key word arrives last or in accent.
