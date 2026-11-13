import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);
// Deterministic rendering: never let GSAP's ticker or lag smoothing advance time on its own.
gsap.ticker.lagSmoothing(0);

/**
 * Bridge GSAP into Remotion: build a *paused* timeline once, then seek it to the current frame's time.
 * Every GSAP feature works frame-accurately (eases, staggers, SplitText, MotionPath, morphs…), and renders are seek-safe.
 *
 *   const ref = useGsapTimeline((tl, root) => {
 *     const split = SplitText.create(root.querySelector(".title"), { type: "chars" });
 *     tl.from(split.chars, { yPercent: 120, rotate: 8, stagger: 0.03, duration: 0.6, ease: "expo.out" });
 *   });
 *   return <div ref={ref}><h1 className="title">Hello</h1></div>;
 */
export const useGsapTimeline = <T extends HTMLElement = HTMLDivElement>(build: (tl: gsap.core.Timeline, root: T) => void, deps: unknown[] = []) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<T>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const root = ref.current;
    const ctx = gsap.context(() => {
      tl.current = gsap.timeline({ paused: true });
      build(tl.current, root);
    }, root);
    return () => {
      ctx.revert();
      tl.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useLayoutEffect(() => {
    tl.current?.seek(frame / fps, false);
  });
  return ref;
};

export { gsap, SplitText };
