import React from "react";
import { Composition, Folder, Still } from "remotion";
import { Showreel, showreelDuration, type ShowreelProps } from "./compositions/Showreel";
import { TalkingHead, type TalkingHeadProps } from "./compositions/TalkingHead";
import { KineticText } from "./lib/KineticText";
import { anton } from "./lib/fonts";
import { FORMATS, theme } from "./theme";
import { Reel, REEL_DURATION } from "./reel/Reel";
import { LabSurreal, LabLiquid, LabGradient, LabParticles, LabProduct, LabMorph, LabGsap } from "./three/Lab";

const showreelDefaults: ShowreelProps = {
  title: "Creative Studio",
  tagline: "cinema, written in code",
  musicSrc: undefined,
  accent: theme.colors.accent,
};

const talkingDefaults: TalkingHeadProps = {
  captions: [],
  durationSec: 6,
  hook: "Watch this",
  punchIns: [],
  broll: [],
};

const Thumbnail: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ width: "100%", height: "100%", background: theme.colors.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
    <KineticText text={text} fontFamily={anton} fontSize={180} uppercase delay={-100} color={theme.colors.paper} />
  </div>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Showreel">
      <Composition id="Showreel-16x9" component={Showreel} durationInFrames={showreelDuration} fps={theme.fps} {...FORMATS.landscape} defaultProps={showreelDefaults} />
      <Composition id="Showreel-9x16" component={Showreel} durationInFrames={showreelDuration} fps={theme.fps} {...FORMATS.vertical} defaultProps={showreelDefaults} />
    </Folder>
    <Folder name="ShortForm">
      <Composition
        id="TalkingHead-9x16"
        component={TalkingHead}
        fps={theme.fps}
        {...FORMATS.vertical}
        durationInFrames={180}
        defaultProps={talkingDefaults}
        calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.round(props.durationSec * theme.fps)) })}
      />
    </Folder>
    <Folder name="Reel">
      <Composition id="Reel-WrittenInLight" component={Reel} durationInFrames={REEL_DURATION} fps={30} {...FORMATS.landscape} />
    </Folder>
    <Folder name="Lab">
      <Composition id="Lab-Surreal" component={LabSurreal} durationInFrames={240} fps={30} {...FORMATS.landscape} />
      <Composition id="Lab-Liquid" component={LabLiquid} durationInFrames={180} fps={30} {...FORMATS.landscape} />
      <Composition id="Lab-Gradient" component={LabGradient} durationInFrames={180} fps={30} {...FORMATS.landscape} />
      <Composition id="Lab-Particles" component={LabParticles} durationInFrames={150} fps={30} {...FORMATS.landscape} />
      <Composition id="Lab-Product" component={LabProduct} durationInFrames={180} fps={30} {...FORMATS.landscape} />
      <Composition id="Lab-Morph" component={LabMorph} durationInFrames={110} fps={30} {...FORMATS.landscape} />
      <Composition id="Lab-Gsap" component={LabGsap} durationInFrames={90} fps={30} {...FORMATS.landscape} />
    </Folder>
    <Still id="Thumbnail-16x9" component={Thumbnail} {...FORMATS.landscape} defaultProps={{ text: "Creative Studio" }} />
  </>
);
