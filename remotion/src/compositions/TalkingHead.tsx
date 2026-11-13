import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { Captions } from "../lib/Captions";
import { FilmLook } from "../lib/FilmLook";
import { KineticText } from "../lib/KineticText";
import { anton, inter } from "../lib/fonts";
import { theme } from "../theme";

export type BRollInsert = {
  /** Path inside remotion/public (video or image). */
  src: string;
  startSec: number;
  durationSec: number;
  kind?: "video" | "image";
};

export type PunchIn = { atSec: number; zoom: number };

export type TalkingHeadProps = {
  /** A-roll video inside remotion/public. Omit to use audioSrc + placeholder plate. */
  videoSrc?: string;
  audioSrc?: string;
  captions: Caption[];
  durationSec: number;
  hook?: string;
  broll?: BRollInsert[];
  /** Jump-cut style punch-ins — keeps talking heads dynamic without new footage. */
  punchIns?: PunchIn[];
  musicSrc?: string;
  musicVolume?: number;
};

const ARoll: React.FC<{ videoSrc?: string; punchIns: PunchIn[] }> = ({ videoSrc, punchIns }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // Hard punch-ins (no easing) read as intentional jump cuts.
  let zoom = 1;
  for (const p of punchIns) if (t >= p.atSec) zoom = p.zoom;
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      {videoSrc ? (
        <OffthreadVideo src={staticFile(videoSrc)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, #6b5a4e 0 16%, #2a2420 17% 30%, #121012 70%)` }} />
      )}
    </AbsoluteFill>
  );
};

/**
 * Professional short-form talking-head edit: A-roll with punch-ins, B-roll cutaways,
 * a kinetic hook title, word-level captions, and ducked music bed.
 */
export const TalkingHead: React.FC<TalkingHeadProps> = ({ videoSrc, audioSrc, captions, hook, broll = [], punchIns = [], musicSrc, musicVolume = 0.12 }) => {
  const { fps, width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <FilmLook grain={0.12} vignette={0.3} flicker={0}>
        <ARoll videoSrc={videoSrc} punchIns={punchIns} />
        {broll.map((b, i) => (
          <Sequence key={i} from={Math.round(b.startSec * fps)} durationInFrames={Math.round(b.durationSec * fps)}>
            {b.kind === "image" ? (
              <AbsoluteFill style={{ backgroundImage: `url(${staticFile(b.src)})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            ) : (
              <OffthreadVideo src={staticFile(b.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </Sequence>
        ))}
      </FilmLook>
      {hook ? (
        <Sequence durationInFrames={Math.round(2.2 * fps)}>
          <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: height * 0.12 }}>
            <div style={{ background: theme.colors.paper, padding: `${14 * u}px ${28 * u}px`, borderRadius: 10 * u, maxWidth: "86%" }}>
              <KineticText text={hook} fontFamily={anton} fontSize={78 * u} uppercase style="rise" stagger={2} color={theme.colors.ink} />
            </div>
          </AbsoluteFill>
        </Sequence>
      ) : null}
      <Captions captions={captions} combineMs={700} style={{ fontFamily: inter, fontSize: 76 * u, color: "#fff", highlight: theme.colors.gold, stroke: "#000", y: 0.7, uppercase: true }} />
      {!videoSrc && audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
      {musicSrc ? <Audio src={staticFile(musicSrc)} volume={(f) => interpolate(f, [0, 15], [0, musicVolume], { extrapolateRight: "clamp" })} /> : null}
    </AbsoluteFill>
  );
};
