import React, { useMemo } from "react";
import { interpolate as flubberInterpolate } from "flubber";
import { Easing, interpolate, useCurrentFrame } from "remotion";

/** Shape library in a 200×200 viewBox, centred at (100,100). */
const poly = (n: number, r: number, rot = -Math.PI / 2, inner?: number) => {
  const pts: string[] = [];
  const steps = inner ? n * 2 : n;
  for (let i = 0; i < steps; i++) {
    const rr = inner && i % 2 ? inner : r;
    const a = rot + (i / steps) * Math.PI * 2;
    pts.push(`${(100 + Math.cos(a) * rr).toFixed(2)},${(100 + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
};
const circle = (r: number) => `M${100 - r},100A${r},${r} 0 1,0 ${100 + r},100A${r},${r} 0 1,0 ${100 - r},100Z`;
const blob = () => {
  const pts: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 70 + 14 * Math.sin(a * 3) + 8 * Math.cos(a * 5);
    pts.push(`${(100 + Math.cos(a) * r).toFixed(2)},${(100 + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
};

export const SHAPES = {
  circle: circle(72),
  square: "M32,32L168,32L168,168L32,168Z",
  triangle: poly(3, 82, -Math.PI / 2),
  hexagon: poly(6, 78, 0),
  star: poly(5, 84, -Math.PI / 2, 36),
  burst: poly(12, 84, 0, 58),
  blob: blob(),
  diamond: poly(4, 84, -Math.PI / 2),
} as const;
export type ShapeName = keyof typeof SHAPES;

export type MorphShapeProps = {
  /** Sequence of shapes (names or raw SVG path d strings). */
  shapes: (ShapeName | string)[];
  /** Frames each morph takes, and frames to hold each shape. */
  morphFrames?: number;
  holdFrames?: number;
  fills?: string[];
  size: number;
  rotatePerShape?: number;
  style?: React.CSSProperties;
};

/**
 * Seamless SVG shape morphing (flubber point-matching) — circle → star → blob → logo… with colour interpolation.
 * Deterministic: progress is computed from the frame. Use for morphing transitions, logo reveals, abstract loops.
 */
export const MorphShape: React.FC<MorphShapeProps> = ({ shapes, morphFrames = 12, holdFrames = 3, fills = ["#ff4d2e"], size, rotatePerShape = 45, style }) => {
  const frame = useCurrentFrame();
  const paths = shapes.map((s) => (s in SHAPES ? SHAPES[s as ShapeName] : s));
  const interps = useMemo(() => paths.slice(1).map((p, i) => flubberInterpolate(paths[i], p, { maxSegmentLength: 3 })), [paths.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const cycle = morphFrames + holdFrames;
  const idx = Math.min(Math.floor(frame / cycle), interps.length - 1);
  const local = frame - idx * cycle;
  const t = interpolate(local, [holdFrames, cycle], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.7, 0, 0.2, 1) });
  const d = interps.length ? interps[idx](t) : paths[0];
  const fillA = fills[idx % fills.length];
  const fillB = fills[(idx + 1) % fills.length];
  const rot = (idx + t) * rotatePerShape;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible", ...style }}>
      <defs>
        <linearGradient id="morph-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={t < 0.5 ? fillA : fillB} />
          <stop offset="100%" stopColor={fillB} />
        </linearGradient>
      </defs>
      <path d={d} fill="url(#morph-grad)" transform={`rotate(${rot} 100 100)`} />
    </svg>
  );
};

/** One-shot morph between two paths driven by an explicit 0..1 progress (for match-cut transitions). */
export const MorphPath: React.FC<{ from: ShapeName | string; to: ShapeName | string; progress: number; fill: string; size: number; style?: React.CSSProperties }> = ({ from, to, progress, fill, size, style }) => {
  const a = from in SHAPES ? SHAPES[from as ShapeName] : from;
  const b = to in SHAPES ? SHAPES[to as ShapeName] : to;
  const interp = useMemo(() => flubberInterpolate(a, b, { maxSegmentLength: 3 }), [a, b]);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible", ...style }}>
      <path d={interp(Math.max(0, Math.min(1, progress)))} fill={fill} />
    </svg>
  );
};
