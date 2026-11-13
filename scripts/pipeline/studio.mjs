#!/usr/bin/env node
// Studio CLI — production lifecycle.
//   node scripts/pipeline/studio.mjs new "<Title>" [--format vertical|landscape|square] [--engine remotion|hyperframes]
//   node scripts/pipeline/studio.mjs status [<id>]
//   node scripts/pipeline/studio.mjs validate <id>
//   node scripts/pipeline/studio.mjs stage <id> <stage> <pending|in_progress|review|approved>
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PROD = join(ROOT, "productions");
const TPL = join(ROOT, "studio/templates/production");
export const STAGES = ["idea", "concept", "script", "storyboard", "shotlist", "assets", "production", "motion", "edit", "sound", "qc", "export"];
const SHOT_TYPES = ["ai-video", "ai-image", "motion-graphics", "footage", "talking-head", "stock", "3d"];
const TRANSITIONS = ["cut", "match-cut", "zoom-through", "whip", "flash", "fade", "j-cut", "l-cut", "dissolve", "wipe"];
const STATUSES = ["planned", "generating", "review", "approved", "rejected"];
const QC_BY_FORMAT = { vertical: "social-vertical", landscape: "youtube-16x9", square: "square", portrait: "any" };

const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").slice(0, 48);
const arg = (args, k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const load = (id) => {
  const dir = join(PROD, id);
  if (!existsSync(join(dir, "production.yaml"))) throw new Error(`no production "${id}" in productions/`);
  return { dir, manifest: YAML.parse(readFileSync(join(dir, "production.yaml"), "utf8")) };
};

function cmdNew(args) {
  const title = args[0] && !args[0].startsWith("--") ? args[0] : undefined;
  if (!title) throw new Error('usage: new "<Title>"');
  const date = new Date().toISOString().slice(0, 10);
  const id = `${date}-${slug(title)}`;
  const dir = join(PROD, id);
  if (existsSync(dir)) throw new Error(`exists: productions/${id}`);
  cpSync(TPL, dir, { recursive: true });
  for (const sub of ["storyboard", "assets/generated", "assets/source", "assets/audio", "edit", "renders", "cache"]) mkdirSync(join(dir, sub), { recursive: true });
  const fmt = arg(args, "format", "vertical");
  const engine = arg(args, "engine", "remotion");
  for (const f of readdirSync(dir).filter((f) => /\.(md|yaml)$/.test(f))) {
    const p = join(dir, f);
    writeFileSync(p, readFileSync(p, "utf8").replaceAll("{{ID}}", id).replaceAll("{{TITLE}}", title).replaceAll("{{DATE}}", date));
  }
  const mp = join(dir, "production.yaml");
  const doc = YAML.parseDocument(readFileSync(mp, "utf8"));
  doc.set("engine", engine);
  doc.setIn(["deliverables", 0, "format"], fmt);
  doc.setIn(["deliverables", 0, "qcSpec"], QC_BY_FORMAT[fmt] ?? "any");
  writeFileSync(mp, doc.toString());
  console.log(`✔ created productions/${id}\n  next: fill 00-brief.md, then run the studio-pipeline skill (Creative Director → concept).`);
  return id;
}

function cmdStatus(args) {
  const ids = args[0] ? [args[0]] : existsSync(PROD) ? readdirSync(PROD).filter((d) => existsSync(join(PROD, d, "production.yaml"))) : [];
  if (!ids.length) return console.log("no productions yet — create one with: npm run new -- \"My Title\"");
  const icon = { pending: "·", in_progress: "◐", review: "◑", approved: "●" };
  for (const id of ids) {
    const { manifest } = load(id);
    const line = STAGES.map((s) => `${icon[manifest.stages?.[s]] ?? "?"} ${s}`).join("  ");
    const current = STAGES.find((s) => manifest.stages?.[s] !== "approved") ?? "delivered";
    console.log(`${id}  [${manifest.engine}]  → ${current}\n  ${line}`);
  }
}

export function validateShotlist(shotlist) {
  const errors = [];
  const shots = shotlist?.shots;
  if (!Array.isArray(shots) || !shots.length) return ["shotlist.shots must be a non-empty list"];
  const ids = new Set();
  shots.forEach((s, i) => {
    const at = `shot[${i}]${s?.id ? ` (${s.id})` : ""}`;
    if (!s.id || !/^S\d{2,3}[a-z]?$/.test(s.id)) errors.push(`${at}: id must look like S01`);
    if (ids.has(s.id)) errors.push(`${at}: duplicate id`);
    ids.add(s.id);
    if (!(typeof s.durationSec === "number" && s.durationSec > 0 && s.durationSec <= 30)) errors.push(`${at}: durationSec must be 0–30`);
    if (!SHOT_TYPES.includes(s.type)) errors.push(`${at}: type must be one of ${SHOT_TYPES.join("|")}`);
    if (s.transitionIn && !TRANSITIONS.includes(s.transitionIn)) errors.push(`${at}: transitionIn must be one of ${TRANSITIONS.join("|")}`);
    if (s.status && !STATUSES.includes(s.status)) errors.push(`${at}: status must be one of ${STATUSES.join("|")}`);
    if ((s.type === "ai-video" || s.type === "ai-image") && !s.prompt?.trim()) errors.push(`${at}: ${s.type} shots need a prompt`);
    if (!s.camera?.size || !s.camera?.movement) errors.push(`${at}: camera.size and camera.movement are required`);
    if (s.status === "approved" && !s.asset) errors.push(`${at}: approved shots must reference an asset`);
  });
  return errors;
}

function cmdValidate(args) {
  const { dir, manifest } = load(args[0]);
  const errors = [];
  for (const s of STAGES) if (!["pending", "in_progress", "review", "approved"].includes(manifest.stages?.[s])) errors.push(`production.yaml: stages.${s} invalid`);
  for (const [i, s] of STAGES.entries()) {
    if (manifest.stages?.[s] === "approved") {
      const prior = STAGES.slice(0, i).filter((p) => manifest.stages?.[p] !== "approved");
      if (prior.length) errors.push(`stage "${s}" approved before ${prior.join(", ")}`);
    }
  }
  const sl = join(dir, "shotlist.yaml");
  const shotlist = YAML.parse(readFileSync(sl, "utf8"));
  errors.push(...validateShotlist(shotlist).map((e) => `shotlist.yaml: ${e}`));
  const total = (shotlist?.shots ?? []).reduce((a, s) => a + (s.durationSec || 0), 0);
  const target = manifest.deliverables?.[0]?.targetDurationSec;
  if (target && Math.abs(total - target) > target * 0.2) errors.push(`shot durations sum to ${total.toFixed(1)}s, target ${target}s (±20%)`);
  if (errors.length) {
    console.error(`✘ ${args[0]}: ${errors.length} issue(s)\n  - ${errors.join("\n  - ")}`);
    process.exitCode = 1;
  } else console.log(`✔ ${args[0]} valid — ${shotlist.shots.length} shots, ${total.toFixed(1)}s`);
}

function cmdStage(args) {
  const [id, stage, state] = args;
  if (!STAGES.includes(stage)) throw new Error(`stage must be one of ${STAGES.join("|")}`);
  if (!["pending", "in_progress", "review", "approved"].includes(state)) throw new Error("state must be pending|in_progress|review|approved");
  const { dir } = load(id);
  const mp = join(dir, "production.yaml");
  const doc = YAML.parseDocument(readFileSync(mp, "utf8"));
  doc.setIn(["stages", stage], state);
  writeFileSync(mp, doc.toString());
  console.log(`✔ ${id}: ${stage} → ${state}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    ({ new: cmdNew, status: cmdStatus, validate: cmdValidate, stage: cmdStage }[cmd] ?? (() => { console.log("commands: new | status | validate | stage"); process.exitCode = 2; }))(args);
  } catch (e) {
    console.error("✘", e.message);
    process.exitCode = 1;
  }
}
