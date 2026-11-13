#!/usr/bin/env node
// Render a Remotion composition with studio defaults tuned for an 8 GB M1.
// Usage: node scripts/pipeline/render-remotion.mjs <CompositionId> <out.mp4> [--props file.json] [--crf 18] [--codec h264|prores] [--frames 0-59] [--concurrency 2]
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [id, out, ...rest] = process.argv.slice(2);
if (!id || !out) {
  console.error("usage: render-remotion.mjs <CompositionId> <out> [--props f.json] [--crf N] [--codec h264|prores] [--frames a-b] [--concurrency N]");
  process.exit(2);
}
const opt = (k, d) => {
  const i = rest.indexOf(`--${k}`);
  return i >= 0 ? rest[i + 1] : d;
};
const codec = opt("codec", "h264");
const args = ["remotion", "render", "remotion/src/index.ts", id, resolve(out), `--codec=${codec}`, `--concurrency=${opt("concurrency", "2")}`];
if (codec === "h264") args.push(`--crf=${opt("crf", "18")}`, "--pixel-format=yuv420p", "--audio-codec=aac", "--audio-bitrate=320k");
if (codec === "prores") args.push("--prores-profile=hq");
const props = opt("props");
if (props) args.push(`--props=${resolve(props)}`);
const frames = opt("frames");
if (frames) args.push(`--frames=${frames}`);

mkdirSync(dirname(resolve(out)), { recursive: true });
console.log("▶ npx", args.join(" "));
const t0 = Date.now();
const r = spawnSync("npx", args, { stdio: "inherit", env: { ...process.env, REMOTION_DISABLE_TELEMETRY: "1" } });
if (r.status !== 0 || !existsSync(resolve(out))) process.exit(r.status || 1);
console.log(`✔ rendered ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
