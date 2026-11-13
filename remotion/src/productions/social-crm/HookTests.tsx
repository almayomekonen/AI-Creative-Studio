import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneOpen, type HookVariant } from "./SceneOpen";

/** Hook iterations rendered side by side for selection (first 10 s of the film). */
export const HookTest: React.FC<{ hook: HookVariant }> = ({ hook }) => (
  <AbsoluteFill style={{ background: "#04060a" }}>
    <SceneOpen hook={hook} />
  </AbsoluteFill>
);
