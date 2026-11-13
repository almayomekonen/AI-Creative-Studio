import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type KineticStyle = "rise" | "blur-in" | "scale-pop" | "track-in";

export type KineticTextProps = {
  text: string;
  /** Split by word or by character. */
  by?: "word" | "char";
  style?: KineticStyle;
  /** Frames between each unit's entrance. */
  stagger?: number;
  delay?: number;
  fontFamily: string;
  fontSize: number;
  color?: string;
  /** Words (case-insensitive) that get the accent color — editorial emphasis. */
  emphasize?: string[];
  accent?: string;
  letterSpacing?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  uppercase?: boolean;
  /** Frame (relative) at which units start exiting; omit to hold. */
  exitAt?: number;
};

/**
 * Dynamic typography: staggered per-word / per-character entrances with masked rise,
 * blur-in (rack focus feel), scale-pop, or tracking-in. Deterministic, seek-safe.
 */
export const KineticText: React.FC<KineticTextProps> = ({
  text,
  by = "word",
  style = "rise",
  stagger = 3,
  delay = 0,
  fontFamily,
  fontSize,
  color = "#fff",
  emphasize = [],
  accent = "#FF4D2E",
  letterSpacing = 0,
  lineHeight = 1.0,
  align = "center",
  uppercase = false,
  exitAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const units = by === "word" ? text.split(/(\s+)/) : Array.from(text);
  const emph = new Set(emphasize.map((w) => w.toLowerCase()));
  let idx = 0;

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        color,
        lineHeight,
        letterSpacing,
        textAlign: align,
        textTransform: uppercase ? "uppercase" : undefined,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
      }}
    >
      {units.map((u, i) => {
        if (/^\s+$/.test(u)) return <span key={i} style={{ whiteSpace: "pre" }}>{u}</span>;
        const myIdx = idx++;
        const start = delay + myIdx * stagger;
        const s = spring({ frame: frame - start, fps, config: { damping: 200, mass: 0.6 } });
        const pop = spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 160 } });
        const exit =
          exitAt !== undefined
            ? interpolate(frame, [exitAt + myIdx * 1.5, exitAt + myIdx * 1.5 + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : 0;
        const clean = u.replace(/[^\p{L}\p{N}']/gu, "").toLowerCase();
        const c = emph.has(clean) ? accent : color;

        let inner: React.CSSProperties = {};
        if (style === "rise") inner = { transform: `translateY(${(1 - s) * 110 - exit * 110}%)` };
        if (style === "blur-in") inner = { filter: `blur(${(1 - s) * 18 + exit * 18}px)`, opacity: s * (1 - exit), transform: `scale(${1.15 - 0.15 * s})` };
        if (style === "scale-pop") inner = { transform: `scale(${pop * (1 - exit)})`, opacity: Math.min(1, pop * 2) };
        if (style === "track-in") inner = { opacity: s * (1 - exit), letterSpacing: `${(1 - s) * 0.6}em` };

        return (
          <span key={i} style={{ display: "inline-block", overflow: style === "rise" ? "hidden" : "visible", paddingBottom: style === "rise" ? "0.06em" : 0 }}>
            <span style={{ display: "inline-block", color: c, ...inner }}>{u}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Animated number count-up for stats beats. */
export const CountUp: React.FC<{ to: number; from?: number; durationInFrames?: number; delay?: number; prefix?: string; suffix?: string; decimals?: number; style?: React.CSSProperties }> = ({
  to,
  from = 0,
  durationInFrames = 40,
  delay = 0,
  prefix = "",
  suffix = "",
  decimals = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame - delay, [0, durationInFrames], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 4),
  });
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{prefix}{v.toFixed(decimals)}{suffix}</span>;
};
