import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import type { CommercialProps } from "../../engine/Commercial";
import { FilmLook } from "../../lib/FilmLook";
import { Subtitles } from "../../lib/Subtitles";
import { FlashAt } from "../../engine/transitions";
import { useFormat } from "../../engine/format";
import { SceneOpen } from "./SceneOpen";
import { SceneWork } from "./SceneWork";
import { ScenePayoff, SceneBrand } from "./SceneEnd";
import { C, frank, heebo, inter } from "./theme";

const FPS = 60;
const s = (sec: number) => Math.round(sec * FPS);
const cl = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** Linear-style capability label: index, hairline, Hebrew title, descriptor. RTL, top safe zone. */
const CapLabel: React.FC<{ idx: string; title: string; desc: string; dur: number }> = ({ idx, title, desc, dur }) => {
  const f = useCurrentFrame();
  const fmt = useFormat();
  const inP = interpolate(f, [0, 14], [0, 1], { ...cl, easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [dur - 10, dur], [0, 1], cl);
  const line = interpolate(f, [4, 22], [0, 1], { ...cl, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ direction: "rtl", paddingTop: fmt.safe.top + 10 * fmt.u, paddingRight: 70 * fmt.u, paddingLeft: 70 * fmt.u, opacity: 1 - out }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 * fmt.u, transform: `translateY(${(1 - inP) * -16}px)`, opacity: inP }}>
        <span style={{ fontFamily: inter, fontWeight: 500, fontSize: 30 * fmt.u, color: C.emeraldGlow, letterSpacing: 2, direction: "ltr" }}>{idx}</span>
        <span style={{ height: 2, width: 90 * fmt.u * line, background: `linear-gradient(to left, ${C.emeraldGlow}, transparent)` }} />
      </div>
      <div style={{ fontFamily: heebo, fontWeight: 800, fontSize: 92 * fmt.u, color: "#f5f7f6", lineHeight: 1.05, marginTop: 14 * fmt.u, letterSpacing: -1, opacity: inP, transform: `translateY(${(1 - inP) * 24}px)`, textShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>{title}</div>
      <div style={{ fontFamily: heebo, fontWeight: 400, fontSize: 40 * fmt.u, color: "rgba(245,247,246,0.72)", marginTop: 10 * fmt.u, opacity: interpolate(f, [8, 22], [0, 1], cl) }}>{desc}</div>
    </AbsoluteFill>
  );
};

const PayoffLine: React.FC = () => {
  const f = useCurrentFrame();
  const fmt = useFormat();
  const words = ["את", "הזמן", "שלכם", "בחזרה."];
  return (
    <AbsoluteFill style={{ direction: "rtl", justifyContent: "flex-start", alignItems: "center", paddingTop: fmt.safe.top + 60 * fmt.u, background: `linear-gradient(to bottom, rgba(20,12,4,${0.42 * interpolate(f, [0, 20], [0, 1], cl)}) 0%, rgba(20,12,4,0) 38%)` }}>
      <div style={{ display: "flex", gap: 22 * fmt.u, flexWrap: "wrap", justifyContent: "center", padding: `0 ${70 * fmt.u}px` }}>
        {words.map((w, i) => {
          const p = interpolate(f, [i * 9, i * 9 + 22], [0, 1], { ...cl, easing: Easing.out(Easing.cubic) });
          return <span key={i} style={{ fontFamily: frank, fontWeight: 500, fontSize: 118 * fmt.u, color: w === "הזמן" ? "#ffb35c" : "#fff7ea", textShadow: "0 6px 30px rgba(0,0,0,0.45)", opacity: p, filter: `blur(${(1 - p) * 10}px)`, transform: `translateY(${(1 - p) * 18}px)` }}>{w}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const BrandType: React.FC = () => {
  const f = useCurrentFrame();
  const fmt = useFormat();
  const p = (a: number, b = a + 18) => interpolate(f, [a, b], [0, 1], { ...cl, easing: Easing.out(Easing.cubic) });
  const word = "SocialCRM";
  const typed = Math.round(interpolate(f, [s(2.6), s(3.15)], [0, word.length], cl));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: fmt.height * 0.535 }}>
      <div style={{ fontFamily: inter, fontWeight: 600, fontSize: 112 * fmt.u, color: "#f8fafc", letterSpacing: -2, direction: "ltr", height: 140 * fmt.u }}>{word.slice(0, typed)}<span style={{ opacity: f > s(2.5) && typed < word.length && Math.floor(f / 8) % 2 ? 1 : 0, color: C.emeraldGlow }}>|</span></div>
      <div style={{ direction: "rtl", fontFamily: heebo, fontWeight: 400, fontSize: 46 * fmt.u, color: "rgba(248,250,252,0.78)", marginTop: 18 * fmt.u, opacity: p(s(3.15)) }}>העובד החדש שלכם · ישירות בוואטסאפ</div>
      <div style={{ height: 2, width: 260 * fmt.u * p(s(3.35)), background: C.emerald, margin: `${36 * fmt.u}px 0` }} />
      <div style={{ direction: "rtl", fontFamily: heebo, fontWeight: 800, fontSize: 84 * fmt.u, color: C.emeraldGlow, opacity: p(s(3.45)), transform: `scale(${0.94 + 0.06 * p(s(3.45))})`, textShadow: `0 0 40px ${C.emerald}55`, textAlign: "center", lineHeight: 1.15 }}>פחות להתעסק.<br />יותר להצמיח.</div>
    </AbsoluteFill>
  );
};

const Sfx: React.FC<{ at: number; name: string; vol?: number }> = ({ at, name, vol = 0.5 }) => (
  <Sequence from={s(at)} durationInFrames={s(3)}><Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} /></Sequence>
);

/** "The Employee That Never Sleeps" — 35 s, 1080×1920, 60 fps. */
export const SocialCrmAd: React.FC<CommercialProps> = ({ spec, assets }) => {
  const { durationInFrames } = useVideoConfig();
  const fmt = useFormat();
  const spb = 60 / spec.music.bpm;
  const muted = (spec.voiceover ?? []).filter((v) => v.subtitle === false || v.id.startsWith("vo3")).map((v) => {
    const a = assets?.vo.find((x) => x.id === v.id);
    return [v.atBeat * spb * 1000 - 50, (v.atBeat * spb + (a?.durationSec ?? 3)) * 1000 + 50];
  });
  const subs = (assets?.captions ?? []).filter((c: Caption) => !muted.some(([a, b]) => c.startMs >= a && c.startMs <= b));
  const caps: [string, string, string, number, number][] = [
    ["01", "שיחות עם לידים", "עונה לכל פנייה בוואטסאפ", 10.15, 12.35],
    ["02", "הצעות מחיר", "רק אחרי האישור שלכם", 13.05, 14.85],
    ["03", "פגישות", "קובע ומאשר ביומן", 15.55, 17.35],
    ["04", "קבלות", "מפיק ושולח ללקוח", 18.05, 19.85],
    ["05", "הזדמנויות", "מזהה מה כדאי לעשות עכשיו", 20.6, 22.6],
  ];
  return (
    <AbsoluteFill style={{ background: C.void }}>
      <FilmLook grain={0.07} vignette={0.28} flicker={0}>
        <Sequence durationInFrames={s(10)} name="S01-S02 chaos→arrival"><SceneOpen hook="swarm" /></Sequence>
        <Sequence from={s(10)} durationInFrames={s(13)} name="S03 power"><SceneWork /></Sequence>
        <Sequence from={s(23)} durationInFrames={s(7)} name="S04 payoff"><ScenePayoff /></Sequence>
        <Sequence from={s(30)} durationInFrames={s(5)} name="S05 brand"><SceneBrand /></Sequence>
        {caps.map(([idx, title, desc, a, b]) => (
          <Sequence key={idx} from={s(a)} durationInFrames={s(b - a)}><CapLabel idx={idx} title={title} desc={desc} dur={s(b - a)} /></Sequence>
        ))}
        <Sequence from={s(26.6)} durationInFrames={s(3.4)}><PayoffLine /></Sequence>
        <Sequence from={s(30)} durationInFrames={s(5)}><BrandType /></Sequence>
        {/* impacts */}
        <FlashAt at={s(6.0)} dur={22} color={C.emeraldGlow} peak={0.85} />
        <FlashAt at={s(30)} dur={26} color={C.emerald} peak={0.9} />
      </FilmLook>
      {/* Hebrew RTL subtitles above the 9:16 UI zone */}
      <Subtitles captions={subs} style={{ fontFamily: heebo, fontSize: 44 * fmt.u, color: "rgba(255,255,255,0.8)", highlight: "#ffffff", y: 1 - fmt.safe.bottom / fmt.height - 0.035, maxWidth: "84%", pill: "rgba(4,8,6,0.5)", direction: "rtl" }} />
      {/* ---------------- sound ---------------- */}
      {assets?.hasMusic ? <Audio src={staticFile(`commercials/${spec.id}/music.wav`)} volume={(f) => 0.72 * interpolate(f, [durationInFrames - s(0.6), durationInFrames], [1, 0], cl)} /> : null}
      {(assets?.vo ?? []).map((l) => (
        <Sequence key={l.id} from={s(l.atSec)} durationInFrames={s(l.durationSec) + 20}><Audio src={staticFile(`commercials/${spec.id}/vo/${l.file}`)} volume={1} /></Sequence>
      ))}
      {/* chaos: notifications accelerate */}
      {[0.05, 0.42, 0.7, 0.92, 1.1, 1.26, 1.4, 1.52, 1.63, 1.74, 1.84, 1.93, 2.02, 2.1, 2.5, 2.8, 3.05, 3.3, 3.5, 3.7, 3.88, 4.05, 4.2, 4.34, 4.47, 4.58, 4.68, 4.77].map((a, i) => <Sfx key={i} at={a} name="ping" vol={0.18 + Math.min(0.25, i * 0.012)} />)}
      <Sfx at={0.95} name="whoosh" vol={0.5} />
      <Sfx at={5.0} name="riser" vol={0.35} />
      <Sfx at={6.0} name="hit" vol={0.7} /><Sfx at={6.0} name="shimmer" vol={0.55} />
      <Sfx at={9.2} name="whoosh" vol={0.35} />
      {/* power: every story beat has a sound */}
      <Sfx at={10.32} name="ping" vol={0.5} /><Sfx at={10.95} name="typing" vol={0.5} /><Sfx at={11.45} name="ping" vol={0.45} />
      <Sfx at={12.3} name="whoosh" vol={0.4} /><Sfx at={12.65} name="paper" vol={0.5} /><Sfx at={14.3} name="confirm" vol={0.6} />
      <Sfx at={14.8} name="whoosh" vol={0.4} /><Sfx at={15.45} name="tick" vol={0.6} /><Sfx at={16.7} name="confirm" vol={0.6} />
      <Sfx at={17.3} name="whoosh" vol={0.4} /><Sfx at={17.85} name="paper" vol={0.55} /><Sfx at={19.15} name="confirm" vol={0.6} />
      <Sfx at={19.8} name="whoosh" vol={0.4} /><Sfx at={20.9} name="shimmer" vol={0.5} /><Sfx at={22.0} name="confirm" vol={0.45} />
      <Sfx at={22.55} name="sub_drop" vol={0.6} />
      {/* payoff: near silence, one soft tone as the light turns warm */}
      <Sfx at={24.6} name="shimmer" vol={0.18} />
      {/* brand */}
      <Sfx at={30.0} name="hit" vol={0.65} /><Sfx at={31.0} name="shimmer" vol={0.45} /><Sfx at={33.45} name="hit" vol={0.45} />
    </AbsoluteFill>
  );
};
