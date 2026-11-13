import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";

/** `pill`: a translucent backing plate so subtitles stay legible over any picture (bright skies, white products). */
export type SubtitleStyle = { fontFamily: string; fontSize: number; color: string; highlight: string; y: number; maxWidth?: string; pill?: string; direction?: "ltr" | "rtl" };

/** Group word captions into lines: a new line starts after a pause > gapMs. */
export const groupLines = (caps: Caption[], gapMs = 600): Caption[][] => {
  const lines: Caption[][] = [];
  for (const c of caps) {
    const cur = lines[lines.length - 1];
    if (!cur || c.startMs - cur[cur.length - 1].endMs > gapMs) lines.push([c]);
    else cur.push(c);
  }
  return lines;
};

/**
 * Film-style subtitles: one spoken line at a time, visible only while it's spoken (+ holdMs),
 * with the current word subtly highlighted. Use for VO/narration; use <Captions> for social word-pop captions.
 */
export const Subtitles: React.FC<{ captions: Caption[]; style: SubtitleStyle; holdMs?: number; leadMs?: number }> = ({ captions, style, holdMs = 450, leadMs = 80 }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = (frame / fps) * 1000;
  const line = groupLines(captions).find((l) => t >= l[0].startMs - leadMs && t <= l[l.length - 1].endMs + holdMs);
  if (!line) return null;
  const fadeIn = Math.min(1, (t - (line[0].startMs - leadMs)) / 120);
  const fadeOut = Math.min(1, (line[line.length - 1].endMs + holdMs - t) / 150);
  return (
    <div style={{ position: "absolute", top: style.y * height, left: 0, right: 0, transform: "translateY(-50%)", textAlign: "center", opacity: Math.max(0, Math.min(fadeIn, fadeOut)) }}>
      <span style={{ fontFamily: style.fontFamily, fontSize: style.fontSize, maxWidth: style.maxWidth ?? "80%", display: "inline-block", letterSpacing: style.direction === "rtl" ? 0 : 0.5, direction: style.direction ?? "ltr", background: style.pill, padding: style.pill ? "0.3em 0.75em" : undefined, borderRadius: style.pill ? "0.8em" : undefined, backdropFilter: style.pill ? "blur(8px)" : undefined, lineHeight: 1.3 }}>
        {line.map((w, i) => (
          <span key={i} style={{ color: t >= w.startMs && t <= w.endMs + 60 ? style.highlight : style.color }}>
            {(i ? " " : "") + w.text.trim()}
          </span>
        ))}
      </span>
    </div>
  );
};
