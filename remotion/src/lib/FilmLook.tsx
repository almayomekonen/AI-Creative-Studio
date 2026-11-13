import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";

export type FilmLookProps = {
  /** 0–1 grain strength. */
  grain?: number;
  /** 0–1 vignette strength. */
  vignette?: number;
  /** Letterbox to a cinematic aspect ratio, e.g. 2.39. Omit for none. */
  letterbox?: number;
  /** Subtle gate weave / exposure flicker. */
  flicker?: number;
  /** Warm/cool tint overlay, e.g. "rgba(255,140,60,0.06)". */
  tint?: string;
  children: React.ReactNode;
};

/**
 * Finishing layer that sells "shot on film": animated grain, vignette, letterbox bars,
 * exposure flicker and a color tint. Put it as the outermost wrapper of a scene or the whole edit.
 */
export const FilmLook: React.FC<FilmLookProps> = ({ grain = 0.35, vignette = 0.55, letterbox, flicker = 0.03, tint, children }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const seed = Math.floor(frame / 2); // grain on twos, like real film
  const exposure = 1 + (random(`flicker-${frame}`) - 0.5) * flicker;
  const barH = letterbox ? Math.max(0, (height - width / letterbox) / 2) : 0;
  const ox = Math.floor(random(`gx-${seed}`) * 200);
  const oy = Math.floor(random(`gy-${seed}`) * 200);

  return (
    <AbsoluteFill style={{ filter: `brightness(${exposure})` }}>
      {children}
      {tint ? <AbsoluteFill style={{ background: tint, mixBlendMode: "soft-light" }} /> : null}
      {grain > 0 ? (
        <AbsoluteFill style={{ opacity: grain, mixBlendMode: "overlay", pointerEvents: "none" }}>
          <svg width="100%" height="100%">
            <filter id={`grain-${seed}`} x="0" y="0">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect x={-ox} y={-oy} width="120%" height="120%" filter={`url(#grain-${seed})`} />
          </svg>
        </AbsoluteFill>
      ) : null}
      {vignette > 0 ? (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignette}) 100%)`, pointerEvents: "none" }} />
      ) : null}
      {barH > 0 ? (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: barH, background: "#000" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barH, background: "#000" }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
