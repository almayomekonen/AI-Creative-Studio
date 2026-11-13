import { interpolate } from "remotion";

/** Output of scripts/py/beats.py */
export type BeatMap = {
  tempo: number;
  beats: number[]; // seconds
  downbeats?: number[]; // seconds (every 4th beat estimate)
  onsets?: number[]; // seconds
  duration: number;
};

export const secondsToFrames = (s: number, fps: number) => Math.round(s * fps);

/**
 * Build cut points from a beat map: one cut every `everyN` beats, starting at `offsetBeats`.
 * Returns frame numbers — feed to <Series> durations so edits land exactly on the music.
 */
export const cutPointsFromBeats = (map: BeatMap, fps: number, everyN = 4, offsetBeats = 0): number[] =>
  map.beats.filter((_, i) => i >= offsetBeats && (i - offsetBeats) % everyN === 0).map((b) => secondsToFrames(b, fps));

/** Convert absolute cut frames into segment durations of `count` segments. */
export const durationsFromCuts = (cuts: number[], totalFrames: number): number[] => {
  const pts = [0, ...cuts.filter((c) => c > 0 && c < totalFrames), totalFrames];
  return pts.slice(1).map((p, i) => p - pts[i]).filter((d) => d > 0);
};

/** 0..1 pulse that peaks on every beat and decays — drive scale, glow or brightness with it. */
export const beatPulse = (frame: number, fps: number, beats: number[], decayFrames = 8): number => {
  const t = frame / fps;
  let last = -Infinity;
  for (const b of beats) {
    if (b <= t) last = b;
    else break;
  }
  if (last === -Infinity) return 0;
  const since = (t - last) * fps;
  return interpolate(since, [0, decayFrames], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
};
