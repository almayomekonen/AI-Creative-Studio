#!/usr/bin/env node
// Creative + technical linter for commercial specs. Enforces the studio's rules before anything renders.
//   node scripts/pipeline/lint-commercial.mjs [id|all]
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = join(ROOT, "remotion/src/commercials");
const UNEXPECTED = ["portal", "iris", "glitch", "zoom", "whip"];
const BLOCKS = ["product", "shader", "particles", "chrome", "type", "montage", "endcard"];
const PRESETS = ["slam", "rise", "blur", "track", "stack", "typewriter", "split", "outline", "glitch", "giant"];

export function lint(spec) {
  const e = [], w = [];
  const fpb = (spec.fps * 60) / spec.music.bpm;
  if (!Number.isInteger(fpb)) e.push(`bpm ${spec.music.bpm} gives ${fpb} frames/beat — pick a bpm with an integer frames/beat`);
  const beats = spec.scenes.reduce((a, s) => a + s.beats, 0);
  const secs = (beats * fpb + (spec.tailFrames ?? 0)) / spec.fps;
  if (secs < 15 || secs > 30) e.push(`duration ${secs.toFixed(1)}s outside 15–30s`);
  if (beats > spec.music.bars * 4) e.push(`scenes (${beats} beats) longer than the score (${spec.music.bars * 4} beats)`);
  if (spec.scenes.length < 4) e.push("needs ≥4 scenes");
  const distinct = new Set(spec.scenes.map((s) => s.block + (s.props?.shader ?? "") + (s.props?.stage ?? ""))).size;
  if (distinct < 4) e.push(`only ${distinct} visually distinct scene types (need ≥4)`);
  const unexpected = spec.scenes.filter((s) => UNEXPECTED.includes(s.transition)).length;
  if (unexpected < 2) e.push(`only ${unexpected} unexpected transitions (need ≥2)`);
  if (spec.scenes[0].transition && spec.scenes[0].transition !== "cut") w.push("first scene has a transition — the hook should start on frame 0");
  if (spec.scenes[0].beats * fpb > spec.fps * 3) w.push("hook scene longer than 3 s");
  if (spec.scenes.at(-1).block !== "endcard") e.push("last scene must be an endcard (memorable ending + lockup)");
  if ((spec.scenes.at(-1).beats * fpb) / spec.fps < 1.5) e.push("endcard shorter than 1.5 s");
  const c = spec.concept ?? {};
  for (const k of ["logline", "bigIdea", "hook", "progression", "ending", "chosen", "rationale"]) if (!c[k]) e.push(`concept.${k} missing`);
  if ((c.routes ?? []).length < 3) e.push("concept needs ≥3 routes considered");
  const score = Object.values(c.scores ?? {}).reduce((a, b) => a + b, 0);
  if (score < 24) e.push(`concept score ${score}/30 < 24 — rethink before building`);
  spec.scenes.forEach((s) => {
    if (!BLOCKS.includes(s.block)) e.push(`${s.id}: unknown block ${s.block}`);
    for (const k of ["intent", "shot", "camera", "lens", "lighting", "sound"]) if (!s.direction?.[k]) e.push(`${s.id}: direction.${k} missing`);
    (s.text ?? []).forEach((t) => {
      if (!PRESETS.includes(t.preset)) e.push(`${s.id}: unknown type preset ${t.preset}`);
      if ((t.size ?? 120) < 48) w.push(`${s.id}: text "${t.text}" size ${t.size} may be unreadable on a phone`);
      if (t.until !== undefined && t.at !== undefined && (t.until - t.at) * fpb / spec.fps < 0.5 + 0.3 * t.text.split(/\s+/).length * 0.5) w.push(`${s.id}: "${t.text}" may be on screen too briefly`);
    });
    if (s.block === "product" && !s.props?.camera) e.push(`${s.id}: product scene needs props.camera`);
  });
  return { errors: e, warnings: w, seconds: +secs.toFixed(2), score };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const arg = process.argv[2] ?? "all";
  const ids = arg === "all" ? readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : [arg];
  let fail = 0;
  for (const id of ids) {
    const r = lint(JSON.parse(readFileSync(join(DIR, `${id}.json`), "utf8")));
    console.log(`${r.errors.length ? "✘" : "✔"} ${id}: ${r.seconds}s, concept ${r.score}/30${r.errors.length ? "\n  - " + r.errors.join("\n  - ") : ""}${r.warnings.length ? "\n  ! " + r.warnings.join("\n  ! ") : ""}`);
    if (r.errors.length) fail = 1;
  }
  process.exit(fail);
}
