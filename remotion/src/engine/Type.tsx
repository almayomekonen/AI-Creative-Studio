import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Style } from "./styles";
import type { TextOverlay, TextPos } from "./types";
import { useFormat } from "./format";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/**
 * Kinetic type presets — frame-driven, deterministic, format-aware (sizes scale with width, positions respect 9:16 safe zones).
 * slam · rise · blur · track · stack · typewriter · split · outline · glitch · giant
 */
export const KineticType: React.FC<{ o: TextOverlay; style: Style; durationFrames: number }> = ({ o, style, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = useFormat();
  const fontFamily = o.font === "serif" ? style.fonts.serif : o.font === "body" ? style.fonts.body : o.font === "mono" ? style.fonts.mono : style.fonts.display;
  const upper = (o.font ?? "display") === "display" && style.type.displayCase === "upper";
  const size = (o.size ?? 120) * f.u;
  const color = o.color ?? style.palette.paper;
  const accent = o.accent ?? style.palette.accent;
  const emph = new Set((o.emphasize ?? []).map((w) => w.toLowerCase()));
  const exit = interpolate(frame, [durationFrames - 7, durationFrames], [0, 1], clamp);
  const lines = o.text.split("\n");

  const posStyle: Record<TextPos, React.CSSProperties> = {
    center: { justifyContent: "center" },
    upper: { justifyContent: "flex-start", paddingTop: f.safe.top + f.height * 0.06 },
    top: { justifyContent: "flex-start", paddingTop: f.safe.top },
    lower: { justifyContent: "flex-end", paddingBottom: f.safe.bottom + f.height * 0.05 },
    bottom: { justifyContent: "flex-end", paddingBottom: f.safe.bottom },
  };
  const wrap: React.CSSProperties = {
    ...posStyle[o.pos ?? "center"],
    alignItems: "center", flexDirection: "column", paddingLeft: f.safe.left, paddingRight: f.vertical ? f.safe.left : f.safe.right,
  };
  const base: React.CSSProperties = {
    fontFamily, fontSize: size, color, lineHeight: o.font === "serif" ? 1.05 : 0.95, letterSpacing: (o.font ?? "display") === "display" ? style.type.tracking : 0,
    textTransform: upper ? "uppercase" : undefined, textAlign: "center", textShadow: "0 8px 40px rgba(0,0,0,0.35)", whiteSpace: "pre-wrap",
  };
  const wordColor = (w: string) => (emph.has(w.replace(/[^\p{L}\p{N}']/gu, "").toLowerCase()) ? accent : color);
  let idx = 0;

  const perUnit = (render: (unit: string, i: number, key: string) => React.ReactNode, by: "char" | "word") =>
    lines.map((line, li) => (
      <div key={li} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
        {(by === "word" ? line.split(/(\s+)/) : Array.from(line)).map((u, ui) => (/^\s+$/.test(u) ? <span key={ui} style={{ whiteSpace: "pre" }}>{u}</span> : render(u, idx++, `${li}-${ui}`)))}
      </div>
    ));

  let body: React.ReactNode;
  switch (o.preset) {
    case "slam": {
      body = perUnit((w, i, k) => {
        const s = spring({ frame: frame - i * 3, fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
        const sc = interpolate(s, [0, 1], [2.4, 1]);
        const shake = frame - i * 3 > 0 && frame - i * 3 < 6 ? (random(`sh${frame}${i}`) - 0.5) * 10 * f.u : 0;
        return <span key={k} style={{ display: "inline-block", transform: `translate(${shake}px,${shake * 0.6}px) scale(${sc * (1 - exit * 0.2)})`, opacity: Math.min(1, s * 3) * (1 - exit), filter: `blur(${(1 - s) * 12 + exit * 10}px)`, color: wordColor(w) }}>{w}</span>;
      }, "word");
      break;
    }
    case "rise": {
      body = perUnit((c, i, k) => {
        const s = spring({ frame: frame - i * 1.4, fps, config: { damping: 200, mass: 0.5 } });
        return <span key={k} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.08em" }}><span style={{ display: "inline-block", transform: `translateY(${(1 - s) * 110 - exit * 110}%)` }}>{c}</span></span>;
      }, "char");
      break;
    }
    case "blur": {
      body = perUnit((w, i, k) => {
        const s = spring({ frame: frame - i * 4, fps, config: { damping: 200 } });
        return <span key={k} style={{ display: "inline-block", filter: `blur(${(1 - s) * 20 + exit * 14}px)`, opacity: s * (1 - exit), transform: `scale(${1.12 - 0.12 * s})`, color: wordColor(w) }}>{w}</span>;
      }, "word");
      break;
    }
    case "track": {
      const s = spring({ frame, fps, config: { damping: 200, mass: 1.2 } });
      body = <div style={{ letterSpacing: `${(1 - s) * 0.5 + (style.type.tracking / 100)}em`, opacity: s * (1 - exit), filter: `blur(${(1 - s) * 6}px)` }}>{lines.map((l, i) => <div key={i}>{l}</div>)}</div>;
      break;
    }
    case "stack": {
      const per = Math.max(4, Math.round(durationFrames / (lines.length + 1.5)));
      body = lines.map((l, i) => {
        const s = spring({ frame: frame - i * per, fps, config: { damping: 18, stiffness: 180 } });
        return <div key={i} style={{ transform: `translateY(${(1 - s) * 60 * f.u}px)`, opacity: Math.min(1, s * 1.5) * (1 - exit), color: i === lines.length - 1 ? accent : color }}>{l}</div>;
      });
      break;
    }
    case "typewriter": {
      const total = o.text.length;
      const n = Math.floor(interpolate(frame, [0, Math.min(durationFrames * 0.6, total * 1.6)], [0, total], clamp));
      const cursor = Math.floor(frame / 8) % 2 === 0;
      body = <div style={{ fontFamily: style.fonts.mono, textTransform: "none", opacity: 1 - exit }}>{o.text.slice(0, n)}<span style={{ opacity: cursor ? 1 : 0, color: accent }}>▍</span></div>;
      break;
    }
    case "split": {
      const s = spring({ frame, fps, config: { damping: 20, stiffness: 140 } });
      const half = Math.ceil(lines.length / 2);
      const a = lines.slice(0, half), b = lines.slice(half);
      body = (
        <div style={{ opacity: 1 - exit }}>
          {a.map((l, i) => <div key={`a${i}`} style={{ transform: `translateX(${-(1 - s) * f.width}px)` }}>{l}</div>)}
          {b.map((l, i) => <div key={`b${i}`} style={{ transform: `translateX(${(1 - s) * f.width}px)`, color: accent }}>{l}</div>)}
        </div>
      );
      break;
    }
    case "outline": {
      const fill = interpolate(frame, [Math.round(durationFrames * 0.35), Math.round(durationFrames * 0.35) + 6], [0, 1], clamp);
      const s = spring({ frame, fps, config: { damping: 200 } });
      body = <div style={{ color: fill > 0.5 ? color : "transparent", WebkitTextStroke: `${Math.max(2, 3 * f.u)}px ${color}`, transform: `scale(${0.92 + 0.08 * s + fill * 0.03})`, opacity: s * (1 - exit), textShadow: "none" }}>{lines.map((l, i) => <div key={i}>{l}</div>)}</div>;
      break;
    }
    case "glitch": {
      const settle = interpolate(frame, [0, 14], [1, 0], clamp);
      const glyphs = "#$%&@!?/<>[]{}=+*";
      const txt = lines.map((l) => Array.from(l).map((c, i) => (c !== " " && random(`g${frame}${i}`) < settle * 0.7 ? glyphs[Math.floor(random(`gc${frame}${i}`) * glyphs.length)] : c)).join("")).join("\n");
      const jx = (random(`jx${frame}`) - 0.5) * 30 * settle * f.u;
      body = <div style={{ transform: `translateX(${jx}px) skewX(${settle * (random(`sk${frame}`) - 0.5) * 20}deg)`, textShadow: `${6 * f.u * (settle + 0.15)}px 0 ${style.palette.accent2}, ${-6 * f.u * (settle + 0.15)}px 0 ${style.palette.accent}`, opacity: 1 - exit, whiteSpace: "pre" }}>{txt}</div>;
      break;
    }
    case "giant": {
      const s = interpolate(frame, [0, durationFrames], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
      body = <div style={{ transform: `scale(${1.6 - 0.6 * s})`, opacity: interpolate(frame, [0, 4], [0, 1], clamp) * (1 - exit), lineHeight: 0.82 }}>{lines.map((l, i) => <div key={i} style={{ color: i % 2 ? accent : color }}>{l}</div>)}</div>;
      break;
    }
  }
  const kickerS = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={wrap}>
      {o.kicker ? <div style={{ fontFamily: style.fonts.body, fontSize: 26 * f.u, letterSpacing: 6 * f.u, textTransform: "uppercase", color: accent, marginBottom: 18 * f.u, opacity: kickerS * (1 - exit) }}>{o.kicker}</div> : null}
      <div style={base}>{body}</div>
    </AbsoluteFill>
  );
};
