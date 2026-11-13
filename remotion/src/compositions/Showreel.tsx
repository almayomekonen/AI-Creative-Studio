import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import type { Caption } from "@remotion/captions";
import { CameraRig } from "../lib/camera";
import { Parallax } from "../lib/Parallax";
import { KineticText, CountUp } from "../lib/KineticText";
import { FilmLook } from "../lib/FilmLook";
import { Captions } from "../lib/Captions";
import { zoomThrough, whipPan, flashCut } from "../lib/transitions";
import { beatPulse, type BeatMap } from "../lib/beats";
import { anton, inter, instrumentSerif } from "../lib/fonts";
import { theme } from "../theme";

export type ShowreelProps = {
  title: string;
  tagline: string;
  musicSrc?: string; // path inside remotion/public
  beatMap?: BeatMap;
  accent?: string;
};

/** Scene lengths in frames @30fps (4 beats @120bpm = 60f). Transition overlaps are subtracted. */
export const SCENES = [75, 60, 75, 60, 75, 75];
export const TRANSITIONS = [14, 10, 12, 10, 14];
export const showreelDuration = SCENES.reduce((a, b) => a + b, 0) - TRANSITIONS.reduce((a, b) => a + b, 0);

const useUnit = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080; // 1 at 1080p short side
};

// ---------- Scene 1: parallax world + kinetic title ----------
const Orb: React.FC<{ x: string; y: string; size: number; color: string; blur?: number }> = ({ x, y, size, color, blur = 0 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: "50%", background: color, filter: blur ? `blur(${blur}px)` : undefined, transform: "translate(-50%,-50%)" }} />
);

const OpeningScene: React.FC<{ title: string; accent: string }> = ({ title, accent }) => {
  const u = useUnit();
  return (
    <CameraRig keys={[{ t: 0, zoom: 1.0 }, { t: 75, zoom: 1.08, y: -10 }]} shake={3}>
      <Parallax
        travelX={260 * u}
        dolly={0.06}
        layers={[
          { depth: 0.05, content: <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 110%, #3a1208 0%, ${theme.colors.ink} 60%)` }} /> },
          { depth: 0.4, blur: 30, content: <><Orb x="22%" y="30%" size={420 * u} color={accent} /><Orb x="80%" y="65%" size={300 * u} color={theme.colors.accent2} /></> },
          { depth: 1, content: <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 * u }}><KineticText text={title} fontFamily={anton} fontSize={190 * u} uppercase stagger={4} delay={6} style="rise" color={theme.colors.paper} emphasize={["worlds"]} accent={accent} lineHeight={0.95} /></AbsoluteFill> },
          { depth: 1.6, blur: 6, blurTo: 14, content: <><Orb x="10%" y="85%" size={60 * u} color={theme.colors.gold} /><Orb x="88%" y="18%" size={36 * u} color={theme.colors.paper} /></> },
        ]}
      />
    </CameraRig>
  );
};

// ---------- Scene 2: match cut — the sun becomes a record light ----------
const MATCH = { x: "50%", y: "46%" };
const SunScene: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const u = useUnit();
  const size = interpolate(frame, [0, 60], [240 * u, 300 * u], { easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #ffb36b 0%, ${accent} 48%, #2a0d06 49%, #120604 100%)` }}>
      <Orb x={MATCH.x} y={MATCH.y} size={size} color="#fff3d6" />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 140 * u }}>
        <KineticText text="every frame" fontFamily={instrumentSerif} fontSize={110 * u} style="blur-in" stagger={5} color={theme.colors.paper} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
const RecordScene: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const u = useUnit();
  const blink = Math.floor(frame / 12) % 2 === 0 ? 1 : 0.35;
  return (
    <AbsoluteFill style={{ background: theme.colors.ink }}>
      {/* identical position + size as the sun at the cut point = graphic match cut */}
      <Orb x={MATCH.x} y={MATCH.y} size={300 * u} color={accent} />
      <div style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-50%)", fontFamily: inter, fontWeight: 800, fontSize: 64 * u, color: "#fff", opacity: blink, letterSpacing: 8 }}>REC</div>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 140 * u }}>
        <KineticText text="is a decision" fontFamily={instrumentSerif} fontSize={110 * u} style="blur-in" stagger={5} color={theme.colors.paper} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
const MatchCutScene: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  return frame < 30 ? <SunScene accent={accent} /> : <RecordScene accent={accent} />;
};

// ---------- Scene 3: 3D space — camera orbits a field of cards ----------
const DepthScene: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const u = useUnit();
  const orbit = interpolate(frame, [0, 75], [-28, 22], { easing: Easing.inOut(Easing.cubic) });
  const tilt = interpolate(frame, [0, 75], [18, 8]);
  const cards = Array.from({ length: 15 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, #1b1d33, ${theme.colors.ink})`, perspective: 1400 * u }}>
      <AbsoluteFill style={{ transformStyle: "preserve-3d", transform: `rotateX(${tilt}deg) rotateY(${orbit}deg)` }}>
        {cards.map((i) => {
          const col = (i % 5) - 2;
          const row = Math.floor(i / 5) - 1;
          const z = ((i * 137) % 5) * -180 * u;
          const hue = i % 3 === 0 ? accent : i % 3 === 1 ? theme.colors.accent2 : theme.colors.gold;
          return (
            <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 220 * u, height: 300 * u, marginLeft: -110 * u, marginTop: -150 * u, borderRadius: 18 * u, background: `linear-gradient(160deg, ${hue}, #000)`, boxShadow: "0 30px 60px rgba(0,0,0,0.5)", transform: `translate3d(${col * 280 * u}px, ${row * 360 * u}px, ${z}px)`, opacity: 0.92 }} />
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <KineticText text="2D · 2.5D · 3D" fontFamily={anton} fontSize={150 * u} style="scale-pop" stagger={3} color="#fff" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Scene 4: stats with count-ups pulsing to the beat ----------
const StatsScene: React.FC<{ accent: string; beats: number[] }> = ({ accent, beats }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = useUnit();
  const pulse = beatPulse(frame, fps, beats.map((b) => b - 0)); // relative beats already offset by caller
  const vertical = height > width;
  const stat = (to: number, suffix: string, label: string, delay: number) => (
    <div style={{ textAlign: "center", margin: 30 * u }}>
      <CountUp to={to} suffix={suffix} delay={delay} style={{ fontFamily: anton, fontSize: 200 * u, color: "#fff", display: "block", transform: `scale(${1 + pulse * 0.04})` }} />
      <div style={{ fontFamily: inter, fontWeight: 600, fontSize: 34 * u, color: theme.colors.ink, opacity: 0.8, letterSpacing: 6, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: accent, justifyContent: "center", alignItems: "center", flexDirection: vertical ? "column" : "row" }}>
      {stat(60, "fps", "frame rate", 0)}
      {stat(4, "K", "resolution", 8)}
      {stat(100, "%", "code-driven", 16)}
    </AbsoluteFill>
  );
};

// ---------- Scene 5: captions demo ----------
const DEMO_CAPTIONS: Caption[] = [
  ["Every", 0, 280], [" word", 280, 560], [" lands", 560, 900], [" exactly", 900, 1300], [" on", 1300, 1450], [" time.", 1450, 2100],
].map(([text, s, e]) => ({ text: text as string, startMs: s as number, endMs: e as number, timestampMs: s as number, confidence: 1 }));

const CaptionScene: React.FC<{ accent: string }> = ({ accent }) => {
  const u = useUnit();
  return (
    <FilmLook grain={0.25} vignette={0.6}>
      <CameraRig keys={[{ t: 0, zoom: 1.15, x: 40 }, { t: 75, zoom: 1.0, x: -40 }]} shake={4}>
        <AbsoluteFill style={{ background: `linear-gradient(135deg, #222 0%, #3b2f2a 50%, #111 100%)` }} />
        <Orb x="50%" y="40%" size={360 * u} color="#d9b9a0" blur={4} />
      </CameraRig>
      <Captions captions={DEMO_CAPTIONS} style={{ fontFamily: inter, fontSize: 84 * u, color: "#fff", highlight: theme.colors.ink, highlightBg: theme.colors.gold, stroke: "#000", y: 0.74, uppercase: true }} />
      <AbsoluteFill style={{ padding: 60 * u }}>
        <div style={{ fontFamily: inter, fontWeight: 600, fontSize: 26 * u, color: accent, letterSpacing: 4 }}>● AUTO-CAPTIONS · WORD-LEVEL</div>
      </AbsoluteFill>
    </FilmLook>
  );
};

// ---------- Scene 6: end card ----------
const EndCard: React.FC<{ title: string; tagline: string; accent: string }> = ({ title, tagline, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const line = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: theme.colors.ink, justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
      <KineticText text={title} fontFamily={anton} fontSize={150 * u} style="track-in" by="char" stagger={1.5} uppercase color={theme.colors.paper} />
      <div style={{ height: 6 * u, width: 520 * u * line, background: accent, margin: `${30 * u}px 0` }} />
      <KineticText text={tagline} fontFamily={instrumentSerif} fontSize={64 * u} style="blur-in" delay={18} stagger={3} color={theme.colors.muted} />
    </AbsoluteFill>
  );
};

export const Showreel: React.FC<ShowreelProps> = ({ title, tagline, musicSrc, beatMap, accent = theme.colors.accent }) => {
  const { fps } = useVideoConfig();
  // Beats relative to the stats scene start, so its pulse locks to the music.
  const statsStart = (SCENES.slice(0, 3).reduce((a, b) => a + b, 0) - TRANSITIONS.slice(0, 3).reduce((a, b) => a + b, 0)) / fps;
  const statsBeats = (beatMap?.beats ?? []).map((b) => b - statsStart).filter((b) => b >= 0);

  const scenes = [
    <OpeningScene title="We build worlds" accent={accent} />,
    <MatchCutScene accent={accent} />,
    <DepthScene accent={accent} />,
    <StatsScene accent={accent} beats={statsBeats} />,
    <CaptionScene accent={accent} />,
    <EndCard title={title} tagline={tagline} accent={accent} />,
  ];
  const transitions = [zoomThrough(), whipPan({ direction: "left" }), flashCut({ color: accent }), whipPan({ direction: "up" }), fade()];

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <FilmLook grain={0.18} vignette={0.35} flicker={0.02}>
        <TransitionSeries>
          {scenes.flatMap((scene, i) => {
            const items = [
              <TransitionSeries.Sequence key={`s${i}`} durationInFrames={SCENES[i]}>
                {scene}
              </TransitionSeries.Sequence>,
            ];
            if (i < transitions.length) {
              items.push(<TransitionSeries.Transition key={`t${i}`} presentation={transitions[i] as never} timing={linearTiming({ durationInFrames: TRANSITIONS[i] })} />);
            }
            return items;
          })}
        </TransitionSeries>
      </FilmLook>
      {musicSrc ? <Audio src={staticFile(musicSrc)} volume={(f) => interpolate(f, [0, 10, showreelDuration - 30, showreelDuration], [0, 0.9, 0.9, 0], { extrapolateRight: "clamp" })} /> : null}
    </AbsoluteFill>
  );
};
