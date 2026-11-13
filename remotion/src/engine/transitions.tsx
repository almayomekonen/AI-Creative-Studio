import React from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { SHAPES } from "../lib/Morph";
import { interpolate as flubber } from "flubber";
import type { TransitionId } from "./styles";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** Frames of overlap each transition needs (incoming scene starts this many frames before its slot). */
export const OVERLAP: Record<TransitionId, number> = { cut: 0, flash: 0, whip: 8, zoom: 10, portal: 14, glitch: 6, iris: 14 };

const IRIS_INTERP = flubber(SHAPES.circle, SHAPES.star, { maxSegmentLength: 4 });

/**
 * Wraps a scene: animates its ENTRY (first `enterOv` frames) and EXIT (last `exitOv` frames) for the chosen transitions.
 * Mask-based entries (portal, iris) reveal the incoming scene over the still-running outgoing one = true overlaps.
 */
export const SceneShell: React.FC<{ enter?: TransitionId; enterOv: number; exit?: TransitionId; exitOv: number; accent: string; accent2: string; id: string; children: React.ReactNode }> = ({ enter = "cut", enterOv, exit = "cut", exitOv, accent, accent2, id, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const ep = enterOv > 0 ? interpolate(frame, [0, enterOv], [0, 1], clamp) : 1;
  const xp = exitOv > 0 ? interpolate(frame, [durationInFrames - exitOv, durationInFrames], [0, 1], clamp) : 0;
  const e = Easing.bezier(0.65, 0, 0.35, 1);

  const style: React.CSSProperties = {};
  let clip: string | undefined;
  let overlay: React.ReactNode = null;
  const transforms: string[] = [];
  const filters: string[] = [];

  // ----- entry -----
  if (enter === "whip" && ep < 1) { transforms.push(`translateX(${(1 - e(ep)) * 100}%)`); filters.push(`blur(${Math.sin(ep * Math.PI) * 30}px)`); }
  if (enter === "zoom" && ep < 1) { transforms.push(`scale(${1.8 - 0.8 * Easing.out(Easing.cubic)(ep)})`); filters.push(`blur(${(1 - ep) * 22}px)`); style.opacity = interpolate(ep, [0, 0.45], [0, 1], clamp); }
  if (enter === "glitch" && ep < 1) {
    const j = (random(`gl${frame}`) - 0.5) * 80 * (1 - ep);
    transforms.push(`translate(${j}px, ${(random(`gly${frame}`) - 0.5) * 20 * (1 - ep)}px)`);
    filters.push(`hue-rotate(${(1 - ep) * 160}deg) saturate(${1 + (1 - ep) * 3}) contrast(${1 + (1 - ep)})`);
    overlay = (
      <AbsoluteFill style={{ mixBlendMode: "screen" }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${random(`b${frame}${i}`) * 100}%`, height: `${2 + random(`bh${frame}${i}`) * 6}%`, background: i % 2 ? accent : accent2, opacity: (1 - ep) * 0.8, transform: `translateX(${(random(`bx${frame}${i}`) - 0.5) * 40}%)` }} />
        ))}
      </AbsoluteFill>
    );
  }
  if (enter === "portal" && ep < 1) {
    const r = Math.pow(e(ep), 1.4) * Math.hypot(width, height) * 0.62;
    clip = `circle(${r}px at 50% 50%)`;
    overlay = (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: "50%", boxShadow: `0 0 ${40 + 80 * (1 - ep)}px ${10 + 20 * (1 - ep)}px ${accent}, inset 0 0 ${60 * (1 - ep)}px ${accent2}`, border: `${6 * (1 - ep) + 2}px solid ${accent}`, opacity: 1 - ep * 0.8 }} />
      </AbsoluteFill>
    );
    transforms.push(`scale(${1.25 - 0.25 * e(ep)})`);
  }
  // ----- exit -----
  if (exit === "whip" && xp > 0) { transforms.push(`translateX(${-e(xp) * 100}%)`); filters.push(`blur(${Math.sin(xp * Math.PI) * 30}px)`); }
  if (exit === "zoom" && xp > 0) { transforms.push(`scale(${1 + e(xp) * 2.2})`); filters.push(`blur(${xp * 16}px)`); style.opacity = 1 - interpolate(xp, [0.5, 1], [0, 1], clamp); }
  if (exit === "portal" && xp > 0) transforms.push(`scale(${1 + e(xp) * 0.35})`);
  if (exit === "iris" && xp > 0) transforms.push(`scale(${1 + e(xp) * 0.12})`);

  const content = (
    <AbsoluteFill style={{ ...style, transform: transforms.join(" ") || undefined, filter: filters.join(" ") || undefined, clipPath: clip, WebkitClipPath: clip }}>
      {children}
    </AbsoluteFill>
  );

  if (enter === "iris" && ep < 1) {
    // star-to-circle morphing iris: incoming scene revealed through a growing, rotating shape
    const k = e(ep);
    const s = (k * Math.hypot(width, height) * 1.25) / 200;
    const d = IRIS_INTERP(1 - k);
    const cid = `iris-${id}`;
    return (
      <AbsoluteFill>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <defs><clipPath id={cid} clipPathUnits="userSpaceOnUse"><path d={d} transform={`translate(${width / 2} ${height / 2}) rotate(${(1 - k) * 120}) scale(${s}) translate(-100 -100)`} /></clipPath></defs>
        </svg>
        <AbsoluteFill style={{ clipPath: `url(#${cid})` }}>{content}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      {content}
      {overlay}
    </AbsoluteFill>
  );
};

/** Impact flash (screen blend) peaking on a frame. */
export const FlashAt: React.FC<{ at: number; dur?: number; color?: string; peak?: number }> = ({ at, dur = 12, color = "#fff", peak = 0.95 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 2, at, at + dur], [0, peak, 0], clamp);
  return o > 0.001 ? <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen", pointerEvents: "none" }} /> : null;
};

/** Shockwave ring + light distortion (explosions, impacts, product landings). */
export const Shockwave: React.FC<{ at: number; color: string; x?: string; y?: string }> = ({ at, color, x = "50%", y = "50%" }) => {
  const f = useCurrentFrame() - at;
  const { width, height } = useVideoConfig();
  if (f < 0 || f > 24) return null;
  const p = Easing.out(Easing.cubic)(f / 24);
  const r = p * Math.hypot(width, height) * 0.6;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: "50%", border: `${(1 - p) * 30 + 2}px solid ${color}`, boxShadow: `0 0 ${60 * (1 - p)}px ${color}`, opacity: 1 - p }} />
      <div style={{ position: "absolute", left: x, top: y, width: r * 1.3, height: r * 1.3, marginLeft: -r * 0.65, marginTop: -r * 0.65, borderRadius: "50%", background: `radial-gradient(circle, ${color} 0%, transparent 60%)`, opacity: (1 - p) * 0.5 }} />
    </AbsoluteFill>
  );
};

/** Spark burst — deterministic streaks radiating from a point (hits, can-opening, sparks). */
export const Sparks: React.FC<{ at: number; color: string; count?: number }> = ({ at, color, count = 36 }) => {
  const f = useCurrentFrame() - at;
  const { width, height } = useVideoConfig();
  if (f < 0 || f > 20) return null;
  const p = f / 20;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const a = random(`sa${i}`) * Math.PI * 2;
        const sp = 0.4 + random(`sv${i}`) * 0.6;
        const r0 = p * sp * Math.min(width, height) * 0.7;
        const r1 = r0 + 60 * (1 - p) * sp;
        return <line key={i} x1={width / 2 + Math.cos(a) * r0} y1={height / 2 + Math.sin(a) * r0} x2={width / 2 + Math.cos(a) * r1} y2={height / 2 + Math.sin(a) * r1} stroke={color} strokeWidth={4 * (1 - p) + 1} strokeLinecap="round" opacity={1 - p} />;
      })}
    </svg>
  );
};
