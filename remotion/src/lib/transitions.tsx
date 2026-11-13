import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";

/**
 * Studio transitions — pure CSS (no WebGL), so they render reliably in headless Chrome on any machine.
 * Use with <TransitionSeries.Transition presentation={zoomThrough()} timing={linearTiming({durationInFrames: 14})} />
 */

type ZoomThroughProps = { blur: number; scale: number };

/** Velocity-matched zoom-through: outgoing scene rushes toward camera, incoming arrives from behind. */
const ZoomThroughComp: React.FC<TransitionPresentationComponentProps<ZoomThroughProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const p = presentationProgress;
  const ease = Easing.bezier(0.7, 0, 0.3, 1)(p);
  const exiting = presentationDirection === "exiting";
  const scale = exiting ? interpolate(ease, [0, 1], [1, passedProps.scale]) : interpolate(ease, [0, 1], [1 / passedProps.scale, 1]);
  const blurAmt = Math.sin(p * Math.PI) * passedProps.blur;
  const opacity = exiting ? interpolate(p, [0.45, 0.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : interpolate(p, [0.4, 0.55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ transform: `scale(${scale})`, filter: `blur(${blurAmt}px)`, opacity }}>{children}</AbsoluteFill>;
};

export const zoomThrough = (props: Partial<ZoomThroughProps> = {}): TransitionPresentation<ZoomThroughProps> => ({
  component: ZoomThroughComp,
  props: { blur: props.blur ?? 18, scale: props.scale ?? 3 },
});

type WhipProps = { direction: "left" | "right" | "up" | "down"; blur: number };

/** Whip pan: both shots slide with heavy directional motion blur — the classic energetic cut. */
const WhipComp: React.FC<TransitionPresentationComponentProps<WhipProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = Easing.bezier(0.8, 0, 0.2, 1)(presentationProgress);
  const sign = passedProps.direction === "left" || passedProps.direction === "up" ? -1 : 1;
  const horizontal = passedProps.direction === "left" || passedProps.direction === "right";
  const offset = presentationDirection === "exiting" ? p * 100 * sign : (p - 1) * 100 * sign;
  const blurAmt = Math.sin(presentationProgress * Math.PI) * passedProps.blur;
  const t = horizontal ? `translateX(${offset}%)` : `translateY(${offset}%)`;
  return <AbsoluteFill style={{ transform: t, filter: `blur(${blurAmt}px)` }}>{children}</AbsoluteFill>;
};

export const whipPan = (props: Partial<WhipProps> = {}): TransitionPresentation<WhipProps> => ({
  component: WhipComp,
  props: { direction: props.direction ?? "left", blur: props.blur ?? 24 },
});

type FlashProps = { color: string };

/** Exposure flash cut: blows out to a color at the midpoint (great on a beat drop). */
const FlashComp: React.FC<TransitionPresentationComponentProps<FlashProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;
  const visible = presentationDirection === "exiting" ? p < 0.5 : p >= 0.5;
  const flash = 1 - Math.abs(p - 0.5) * 2;
  return (
    <AbsoluteFill style={{ opacity: visible ? 1 : 0 }}>
      <AbsoluteFill style={{ filter: `brightness(${1 + flash * 3})` }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ background: passedProps.color, opacity: flash * 0.85 }} />
    </AbsoluteFill>
  );
};

export const flashCut = (props: Partial<FlashProps> = {}): TransitionPresentation<FlashProps> => ({
  component: FlashComp,
  props: { color: props.color ?? "#ffffff" },
});
