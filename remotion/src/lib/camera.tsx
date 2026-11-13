import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

/**
 * A keyframe for the virtual camera. `t` is in frames relative to the parent Sequence.
 * zoom: 1 = neutral. x/y: pixels of camera travel. rotate: degrees (dutch angle).
 */
export type CameraKey = { t: number; zoom?: number; x?: number; y?: number; rotate?: number };

export type CameraRigProps = {
  keys: CameraKey[];
  /** Handheld shake amplitude in px (0 = locked-off tripod). */
  shake?: number;
  /** Shake speed — lower is a slower, "breathing" operator. */
  shakeSpeed?: number;
  /** Ease applied between every pair of keys. Default: cinematic in-out. */
  easing?: (t: number) => number;
  children: React.ReactNode;
};

const channel = (keys: CameraKey[], frame: number, k: keyof Omit<CameraKey, "t">, def: number, easing: (t: number) => number) => {
  const pts = keys.filter((key) => key[k] !== undefined);
  if (pts.length === 0) return def;
  if (pts.length === 1) return pts[0][k] as number;
  return interpolate(
    frame,
    pts.map((p) => p.t),
    pts.map((p) => p[k] as number),
    { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
};

/** Virtual camera: push-ins, pull-outs, pans, dutch tilts and organic handheld shake on any scene. */
export const CameraRig: React.FC<CameraRigProps> = ({
  keys,
  shake = 0,
  shakeSpeed = 0.02,
  easing = Easing.bezier(0.65, 0, 0.35, 1),
  children,
}) => {
  const frame = useCurrentFrame();
  const zoom = channel(keys, frame, "zoom", 1, easing);
  const x = channel(keys, frame, "x", 0, easing);
  const y = channel(keys, frame, "y", 0, easing);
  const rotate = channel(keys, frame, "rotate", 0, easing);
  const sx = shake * noise2D("cam-x", frame * shakeSpeed, 0);
  const sy = shake * noise2D("cam-y", 0, frame * shakeSpeed);
  const sr = shake * 0.02 * noise2D("cam-r", frame * shakeSpeed, frame * shakeSpeed);

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${-x + sx}px, ${-y + sy}px) scale(${zoom}) rotate(${rotate + sr}deg)`,
        transformOrigin: "50% 50%",
        willChange: "transform",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Convenience: slow cinematic push-in across the full sequence duration. */
export const SlowPush: React.FC<{ from?: number; to?: number; shake?: number; children: React.ReactNode }> = ({
  from = 1,
  to = 1.12,
  shake = 0,
  children,
}) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <CameraRig keys={[{ t: 0, zoom: from }, { t: durationInFrames, zoom: to }]} shake={shake} easing={Easing.out(Easing.quad)}>
      {children}
    </CameraRig>
  );
};
