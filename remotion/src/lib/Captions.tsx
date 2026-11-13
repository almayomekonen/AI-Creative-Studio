import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";

export type CaptionStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  highlight: string;
  /** Background pill behind the active word. */
  highlightBg?: string;
  stroke?: string;
  /** Vertical position as fraction of height (0 top – 1 bottom). */
  y?: number;
  uppercase?: boolean;
};

const Page: React.FC<{ page: TikTokPage; style: CaptionStyle }> = ({ page, style }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const timeMs = (frame / fps) * 1000 + page.startMs;
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: (style.y ?? 0.72) * height,
          width: "86%",
          textAlign: "center",
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          lineHeight: 1.15,
          fontWeight: 800,
          textTransform: style.uppercase ? "uppercase" : undefined,
          transform: `translateY(-50%) scale(${0.85 + 0.15 * enter})`,
          WebkitTextStroke: style.stroke ? `${Math.round(style.fontSize / 14)}px ${style.stroke}` : undefined,
          paintOrder: "stroke fill",
          textShadow: "0 6px 24px rgba(0,0,0,0.45)",
        }}
      >
        {page.tokens.map((t, i) => {
          const active = t.fromMs <= timeMs && timeMs < t.toMs;
          return (
            <React.Fragment key={t.fromMs}>
              {/* real breaking space between words so long pages wrap instead of overflowing */}
              {i > 0 && /^\s/.test(t.text) ? " " : null}
              <span
                style={{
                  color: active ? style.highlight : style.color,
                  background: active && style.highlightBg ? style.highlightBg : "transparent",
                  borderRadius: 12,
                  padding: active && style.highlightBg ? "0 0.12em" : 0,
                  whiteSpace: "nowrap",
                  display: "inline-block",
                }}
              >
                {t.text.trim()}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Word-accurate social captions. Feed it `Caption[]` produced by scripts/py/transcribe.py
 * (faster-whisper word timestamps) — pages are grouped automatically and the spoken word is highlighted.
 */
export const Captions: React.FC<{ captions: Caption[]; style: CaptionStyle; combineMs?: number; holdMs?: number }> = ({ captions, style, combineMs = 1200, holdMs = 700 }) => {
  const { fps } = useVideoConfig();
  const { pages } = useMemo(() => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: combineMs }), [captions, combineMs]);

  return (
    <AbsoluteFill>
      {pages.map((page, i) => {
        const next = pages[i + 1];
        const from = Math.round((page.startMs / 1000) * fps);
        // hold a page until the next one starts, but never more than holdMs after its last word (no stale captions in pauses)
        const lastWordEnd = page.tokens.length ? page.tokens[page.tokens.length - 1].toMs : page.startMs + page.durationMs;
        const endMs = Math.min(next ? next.startMs : Infinity, lastWordEnd + holdMs);
        const dur = Math.max(1, Math.round(((endMs - page.startMs) / 1000) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <Page page={page} style={style} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
