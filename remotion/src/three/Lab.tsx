import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ShaderCanvas } from "./ShaderCanvas";
import { SURREAL_WORLD, LIQUID_GRADIENT } from "./shaders";
import { LiquidChrome } from "./LiquidChrome";
import { AbsoluteFill } from "remotion";
import { ParticleMorph } from "./ParticleMorph";
import { ProductStage } from "./ProductStage";
import { MorphShape } from "../lib/Morph";
import { useGsapTimeline, SplitText } from "../lib/gsap";
import { anton, inter } from "../lib/fonts";

// Isolated test benches for each 3D/shader capability (render stills to iterate on looks).
export const LabSurreal: React.FC = () => {
  const f = useCurrentFrame();
  return <ShaderCanvas fragment={SURREAL_WORLD} uniforms={{ uDolly: f * 0.05, uRise: 0, uSun: 0.35, uOrb: 0.6 }} />;
};
export const LabLiquid: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <LiquidChrome orbit={f / fps * 0.3} pulse={interpolate(f % 15, [0, 8], [1, 0], { extrapolateRight: "clamp" })} />;
};
export const LabGradient: React.FC = () => <ShaderCanvas fragment={LIQUID_GRADIENT} uniforms={{ uA: [0.04, 0.03, 0.08], uB: [1.0, 0.3, 0.18], uC: [0.18, 0.4, 1.0], uFlow: 1 }} />;


export const LabParticles: React.FC = () => {
  const f = useCurrentFrame();
  return <ParticleMorph text="CODE" font={anton} form={interpolate(f, [10, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} explode={interpolate(f, [100, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} orbit={f * 0.004} />;
};
export const LabProduct: React.FC = () => {
  const f = useCurrentFrame();
  return <ProductStage fonts={{ display: anton, body: inter }} spin={f * 0.01} orbit={0.5 - f * 0.004} sweep={f * 0.03} />;
};
export const LabMorph: React.FC = () => (
  <AbsoluteFill style={{ background: "#0b0b0f", justifyContent: "center", alignItems: "center" }}>
    <MorphShape shapes={["circle", "star", "blob", "hexagon", "burst", "diamond", "circle"]} fills={["#ff4d2e", "#e8c26a", "#2e6bff"]} size={600} />
  </AbsoluteFill>
);
export const LabGsap: React.FC = () => {
  const ref = useGsapTimeline((tl, root) => {
    const split = SplitText.create(root.querySelector(".t")!, { type: "chars" });
    tl.from(split.chars, { yPercent: 120, rotate: 12, opacity: 0, stagger: 0.035, duration: 0.7, ease: "expo.out" });
    tl.to(split.chars, { color: "#ff4d2e", stagger: 0.02, duration: 0.2 }, 1.2);
  });
  return (
    <AbsoluteFill ref={ref} style={{ background: "#0b0b0f", justifyContent: "center", alignItems: "center" }}>
      <div className="t" style={{ fontFamily: anton, fontSize: 220, color: "#f4f1ea", overflow: "hidden" }}>GSAP INSIDE</div>
    </AbsoluteFill>
  );
};
