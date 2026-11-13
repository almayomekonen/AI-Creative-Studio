import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type ParallaxLayer = {
  /** 0 = infinitely far (static), 1 = at the focal plane, >1 = foreground (moves faster than camera). */
  depth: number;
  content: React.ReactNode;
  /** Depth-of-field: blur in px applied to this layer (rack focus can animate it via `blurTo`). */
  blur?: number;
  blurTo?: number;
};

export type ParallaxProps = {
  layers: ParallaxLayer[];
  /** Total camera travel in px over the sequence (truck/dolly move). */
  travelX?: number;
  travelY?: number;
  /** Dolly-in amount: extra scale applied proportionally to depth. */
  dolly?: number;
};

/**
 * 2.5D parallax: each layer moves proportionally to its depth, producing a real sense of camera
 * movement through a flat composite (classic "2.5D photo animation" / multiplane look).
 * Layers render back-to-front in array order.
 */
export const Parallax: React.FC<ParallaxProps> = ({ layers, travelX = 240, travelY = 0, dolly = 0.08 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: Easing.bezier(0.33, 0, 0.2, 1),
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {layers.map((layer, i) => {
        const tx = -travelX * layer.depth * (p - 0.5);
        const ty = -travelY * layer.depth * (p - 0.5);
        const scale = 1 + dolly * layer.depth * p;
        const blur = layer.blurTo !== undefined ? interpolate(p, [0, 1], [layer.blur ?? 0, layer.blurTo]) : (layer.blur ?? 0);
        return (
          <AbsoluteFill
            key={i}
            style={{
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
              filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
            }}
          >
            {layer.content}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
