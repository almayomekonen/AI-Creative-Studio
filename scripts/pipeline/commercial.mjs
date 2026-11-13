#!/usr/bin/env node
// Commercial production pipeline — everything derives from remotion/src/commercials/<id>.json.
//   node scripts/pipeline/commercial.mjs assets <id>      music (synth), VO (Piper), script-aligned captions
//   node scripts/pipeline/commercial.mjs docs <id>        brief, concept, script, direction, shot list, sound design, edit timeline
//   node scripts/pipeline/commercial.mjs storyboard <id>  low-res preview render → storyboard frames + contact sheet + 9:16 mobile safe-zone sheet
//   node scripts/pipeline/commercial.mjs render <id>      master render → normalized delivery → automated QC (+ QC report)
//   node scripts/pipeline/commercial.mjs all <id>
//   node scripts/pipeline/commercial.mjs check-vo <id>    validate human VO recordings (presence, length vs. window, clipping)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PY = join(ROOT, ".venv/bin/python");
const sh = (cmd, args, opts = {}) => (execFileSync(cmd, args, { cwd: ROOT, stdio: opts.quiet ? "pipe" : "inherit", env: { ...process.env, HF_HOME: join(ROOT, "models/huggingface"), REMOTION_DISABLE_TELEMETRY: "1" }, ...opts }) ?? "").toString();

// Must mirror remotion/src/engine/transitions.tsx OVERLAP
const OVERLAP = { cut: 0, flash: 0, whip: 8, zoom: 10, portal: 14, glitch: 6, iris: 14 };
const BLOCK_TYPE = { product: "3d", shader: "shader", particles: "particles", chrome: "3d", type: "typography", montage: "motion-graphics", endcard: "3d", custom: "procedural" };

const load = (id) => JSON.parse(readFileSync(join(ROOT, `remotion/src/commercials/${id}.json`), "utf8"));
const prodDir = (id) => join(ROOT, "productions", `ad-${id}`);
const pubDir = (id) => join(ROOT, "remotion/public/commercials", id);

const timeline = (spec) => {
  const fpb = (spec.fps * 60) / spec.music.bpm;
  let beat = 0;
  const tl = spec.scenes.map((s, i) => {
    const start = Math.round(beat * fpb); beat += s.beats; const end = Math.round(beat * fpb);
    return { s, i, start, end, dur: end - start, ov: i === 0 ? 0 : OVERLAP[s.transition ?? "cut"] };
  });
  const total = tl[tl.length - 1].end + (spec.tailFrames ?? 0);
  return { tl, fpb, total };
};
const tc = (frames, fps) => {
  const s = Math.floor(frames / fps), ff = Math.round(frames % fps);
  return `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
};
const sec = (frames, fps) => (frames / fps).toFixed(2) + "s";

// ---------------- assets ----------------
function assets(id) {
  const spec = load(id);
  const out = pubDir(id);
  mkdirSync(join(out, "vo"), { recursive: true });
  const music = { bpm: spec.music.bpm, bars: spec.music.bars, beatsPerBar: spec.music.beatsPerBar ?? 4, progression: spec.music.progression, barsPerChord: spec.music.barsPerChord ?? 1, sections: spec.music.sections };
  writeFileSync(join(out, "music.spec.json"), JSON.stringify(music, null, 1));
  sh(PY, ["scripts/py/synth.py", join(out, "music.spec.json"), "-o", join(out, "music.wav")], { quiet: true });
  const spb = 60 / spec.music.bpm;
  const lines = [];
  for (const v of spec.voiceover ?? []) {
    const wav = join(out, "vo", `${v.id}.wav`);
    // A real recording in productions/ad-<id>/vo-final/<voId>.wav always wins over TTS (scratch → final swap).
    const finalVo = join(prodDir(id), "vo-final", `${v.id}.wav`);
    let r;
    if (existsSync(finalVo)) {
      sh("ffmpeg", ["-y", "-loglevel", "error", "-i", finalVo, "-af", "highpass=f=70,aformat=sample_rates=48000:channel_layouts=stereo", wav]);
      r = { durationSec: +sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav], { quiet: true }).trim() };
    } else {
      r = JSON.parse(sh(PY, ["scripts/py/tts.py", v.tts ?? v.text, "-o", wav, "--voice", spec.voice ?? "en_US-ryan-medium", "--engine", spec.voiceEngine ?? "piper", "--length-scale", String(spec.voiceLengthScale ?? 1.35)], { quiet: true }));
    }
    sh(PY, ["scripts/py/transcribe.py", wav, "-o", wav.replace(/\.wav$/, ""), "--model", "small", "--lang", spec.language ?? "en"], { quiet: true });
    lines.push({ id: v.id, file: `${v.id}.wav`, atSec: +(v.atBeat * spb).toFixed(3), durationSec: r.durationSec, text: v.text });
  }
  writeFileSync(join(out, "vo", "vo.json"), JSON.stringify(lines, null, 1));
  sh(PY, ["-c", `
import json, sys, pathlib
sys.path.insert(0, "scripts/py")
from align_captions import align
out = pathlib.Path(${JSON.stringify(out)}); caps = []
for l in json.loads((out/"vo"/"vo.json").read_text()):
    words = json.loads((out/"vo"/(l["id"] + ".captions.json")).read_text())
    off = int(l["atSec"]*1000)
    for c in align(l["text"], words):
        caps.append({**c, "text": " " + c["text"].strip(), "startMs": c["startMs"]+off, "endMs": c["endMs"]+off, "timestampMs": c["startMs"]+off})
(out/"captions.json").write_text(json.dumps(caps, indent=1))
`], { quiet: true });
  if (!existsSync(join(ROOT, "remotion/public/sfx/whoosh.wav"))) sh(PY, ["scripts/py/sfx.py", "-o", "remotion/public/sfx"], { quiet: true });
  console.log(`✔ assets: music ${spec.music.bpm} BPM × ${spec.music.bars} bars, ${lines.length} VO line(s), captions`);
}

// ---------------- docs ----------------
function docs(id) {
  const spec = load(id);
  const { tl, fpb, total } = timeline(spec);
  const fps = spec.fps;
  const d = prodDir(id);
  mkdirSync(join(d, "storyboard"), { recursive: true });
  mkdirSync(join(d, "renders"), { recursive: true });
  const c = spec.concept;
  const voAt = (v) => Math.round(v.atBeat * fpb);
  const sceneOf = (frame) => tl.find((t) => frame >= t.start && frame < t.end)?.s.id ?? "end";
  const manifestPath = join(d, "production.yaml");
  const prev = existsSync(manifestPath) ? YAML.parse(readFileSync(manifestPath, "utf8")) : null;
  const stages = prev?.stages ?? Object.fromEntries(["idea", "concept", "script", "storyboard", "shotlist", "assets", "production", "motion", "edit", "sound", "qc", "export"].map((s) => [s, "pending"]));
  writeFileSync(manifestPath, YAML.stringify({
    id: `ad-${id}`, title: spec.title, created: prev?.created ?? new Date().toISOString().slice(0, 10), engine: "remotion (commercial engine)",
    spec: `remotion/src/commercials/${id}.json`, composition: `Ad-${id}`, style: spec.style,
    deliverables: [{ name: "main", format: spec.format, fps, durationSec: +(total / fps).toFixed(2), qcSpec: spec.format === "vertical" ? "social-vertical" : "youtube-16x9" }],
    stages, approvals: prev?.approvals ?? [],
  }));

  writeFileSync(join(d, "00-brief.md"), `# Brief — ${spec.title}

| | |
|---|---|
| Product | ${spec.brand.name} — ${spec.brand.sub ?? ""} (${spec.product}) |
| Format | ${spec.format} ${spec.format === "vertical" ? "1080×1920 (9:16)" : ""}, ${fps} fps, ${(total / fps).toFixed(1)} s |
| Audience | ${c.audience} |
| Visual identity | \`${spec.style}\` (see remotion/src/engine/styles.ts) |
| Tagline / CTA | ${spec.brand.tagline} / ${spec.brand.cta ?? "—"} |
| Constraints | 100% procedural free stack — no footage, no stock, no paid AI |
`);

  writeFileSync(join(d, "01-concept.md"), `# Creative Concept — ${spec.title}
> Generated with the \`studio-concept-engine\` method.

**Logline:** ${c.logline}

**Big idea:** ${c.bigIdea}

## Routes considered
| Route | Idea | Why | Risk / verdict |
|---|---|---|---|
${c.routes.map((r) => `| **${r.name}** | ${r.idea} | ${r.why} | ${r.risk} |`).join("\n")}

**Chosen:** ${c.chosen} — ${c.rationale}

## Structure
- **Hook (first 1.5 s):** ${c.hook}
- **Progression:** ${c.progression}
- **Ending:** ${c.ending}

## Scores (1–5)
${Object.entries(c.scores ?? {}).map(([k, v]) => `- ${k}: ${"●".repeat(v)}${"○".repeat(5 - v)} ${v}`).join("\n")}
- **Total: ${Object.values(c.scores ?? {}).reduce((a, b) => a + b, 0)}/30**
`);

  writeFileSync(join(d, "02-script.md"), `# Script — ${spec.title}
Two-column A/V script. ${spec.music.bpm} BPM → ${fpb} frames/beat.

| # | Time | VISUAL | AUDIO |
|---|---|---|---|
${tl.map((t) => {
    const s = t.s;
    const texts = (s.text ?? []).map((o) => `on-screen: “${o.text.replace(/\n/g, " / ")}” (${o.preset})`).join("<br>");
    const vos = (spec.voiceover ?? []).filter((v) => voAt(v) >= t.start && voAt(v) < t.end).map((v) => `VO: “${v.text}”`).join("<br>");
    const sfx = (s.sfx ?? []).map((x) => x.name).join(", ");
    return `| ${s.id} | ${sec(t.start, fps)}–${sec(t.end, fps)} | ${s.direction.shot}. ${s.direction.intent}${texts ? "<br>" + texts : ""} | ${s.direction.sound}${vos ? "<br>" + vos : ""}${sfx ? "<br>SFX: " + sfx : ""} |`;
  }).join("\n")}
`);

  writeFileSync(join(d, "04-direction.md"), `# Camera & Lighting Direction — ${spec.title}

| Shot | Camera | Lens | Lighting | Intent |
|---|---|---|---|---|
${tl.map((t) => `| ${t.s.id} (${t.s.direction.shot}) | ${t.s.direction.camera} | ${t.s.direction.lens} | ${t.s.direction.lighting} | ${t.s.direction.intent} |`).join("\n")}

Camera data (orbit rad / dist or fill / height / lookY / lens mm) lives in each scene's \`props.camera\` in the spec; product framing uses \`fitDistance\` so the same shot frames correctly at any aspect.
`);

  const shotlist = { shots: tl.map((t) => ({
    id: t.s.id.replace(/^S/, "S"), scene: t.i + 1, durationSec: +(t.dur / fps).toFixed(2), type: BLOCK_TYPE[t.s.block],
    intent: t.s.direction.intent, description: t.s.direction.shot,
    camera: { size: t.s.direction.shot.split(" ")[0], angle: "eye", movement: t.s.direction.camera, lens: t.s.direction.lens },
    lighting: t.s.direction.lighting, build: `${t.s.block} block — ${JSON.stringify(t.s.props ?? {}).slice(0, 160)}`,
    reference: `storyboard/${t.s.id}.jpg`, transitionIn: { cut: "cut", flash: "flash", whip: "whip", zoom: "zoom-through", portal: "zoom-through", glitch: "cut", iris: "match-cut" }[t.s.transition ?? "cut"],
    audio: t.s.direction.sound, asset: `Ad-${id} (procedural)`, status: "approved",
  })) };
  writeFileSync(join(d, "shotlist.yaml"), "# Generated from the spec — edit the spec, not this file.\n" + YAML.stringify(shotlist));

  const spb = 60 / spec.music.bpm;
  const sfxRows = [];
  tl.forEach((t) => (t.s.sfx ?? []).forEach((x) => sfxRows.push([t.start + Math.round(x.atBeat * fpb), x.name, t.s.id, "scripted"])));
  tl.slice(1).forEach((t) => {
    const tr = t.s.transition ?? "cut";
    if (["whip", "zoom", "portal", "iris"].includes(tr)) sfxRows.push([t.start - t.ov - 4, "whoosh", t.s.id, `auto (${tr})`]);
    if (tr === "glitch") sfxRows.push([t.start - t.ov, "glitch", t.s.id, "auto (glitch)"]);
  });
  sfxRows.sort((a, b) => a[0] - b[0]);
  writeFileSync(join(d, "05-sound-design.md"), `# Sound Design — ${spec.title}
All audio is generated locally: \`synth.py\` (score), \`sfx.py\` (effects), Piper (\`${spec.voice}\`) VO, Whisper-timed script-exact subtitles.

## Score
${spec.music.bpm} BPM · ${spec.music.bars} bars · progression ${spec.music.progression.map((p) => p.join(" ")).join(" → ")}

| Section | Time | Layers | Energy | Impact |
|---|---|---|---|---|
${spec.music.sections.map((s) => `| ${s.name} | ${(s.startBar * 4 * spb).toFixed(2)}–${((s.startBar + s.bars) * 4 * spb).toFixed(2)}s | ${s.layers.join(", ")} | ${s.energy} | ${s.impact ? "yes (on downbeat)" : ""} |`).join("\n")}

## Voiceover
| Time | Line | Scene |
|---|---|---|
${(spec.voiceover ?? []).map((v) => `| ${(v.atBeat * spb).toFixed(2)}s | “${v.text}” | ${sceneOf(voAt(v))} |`).join("\n")}

## SFX cue sheet
| TC | SFX | Scene | Source |
|---|---|---|---|
${sfxRows.map((r) => `| ${tc(r[0], fps)} | ${r[1]} | ${r[2]} | ${r[3]} |`).join("\n")}

## Mix
Music 0.8 under VO (sidechained to kick inside the score), SFX 0.3–0.8, final delivery normalised to −14 LUFS / −1.5 dBTP (export.sh) and verified by qc.py.
`);

  writeFileSync(join(d, "06-edit-timeline.md"), `# Edit Timeline (EDL) — ${spec.title}
${fps} fps · ${total} frames (${(total / fps).toFixed(2)} s) · ${fpb} frames/beat

| # | Scene | Block | In | Out | Dur | Transition in | Overlap | Beats |
|---|---|---|---|---|---|---|---|---|
${tl.map((t) => `| ${t.i + 1} | ${t.s.id} | ${t.s.block} | ${tc(t.start, fps)} | ${tc(t.end, fps)} | ${t.dur}f | ${t.s.transition ?? "cut"} | ${t.ov}f | ${t.s.beats} |`).join("\n")}

## Text events
| TC in | TC out | Scene | Preset | Text |
|---|---|---|---|---|
${tl.flatMap((t) => (t.s.text ?? []).map((o) => `| ${tc(t.start + Math.round((o.at ?? 0) * fpb), fps)} | ${tc(o.until !== undefined ? t.start + Math.round(o.until * fpb) : t.end, fps)} | ${t.s.id} | ${o.preset} | ${o.text.replace(/\n/g, " / ")} |`)).join("\n")}

## VFX events
| TC | Scene | Effect |
|---|---|---|
${tl.flatMap((t) => (t.s.vfx ?? []).map((v) => `| ${tc(t.start + Math.round(v.atBeat * fpb), fps)} | ${t.s.id} | ${v.kind} |`)).join("\n")}
`);
  console.log(`✔ docs: productions/ad-${id}/ (brief, concept, script, direction, shotlist, sound design, edit timeline)`);
}

// ---------------- storyboard + mobile check ----------------
function storyboard(id) {
  const spec = load(id);
  const { tl } = timeline(spec);
  const d = prodDir(id);
  const sb = join(d, "storyboard");
  mkdirSync(sb, { recursive: true });
  const preview = join(ROOT, "tmp", `preview-${id}.mp4`);
  mkdirSync(join(ROOT, "tmp"), { recursive: true });
  if (!process.env.REUSE_PREVIEW || !existsSync(preview)) sh("npx", ["remotion", "render", "remotion/src/index.ts", `Ad-${id}`, preview, "--scale=0.5", "--concurrency=2", "--crf=24", "--log=error"]);
  const frames = [];
  tl.forEach((t) => {
    const pick = { a: t.start + Math.round(t.dur * 0.2), b: t.start + Math.round(t.dur * 0.7) };
    for (const [k, fr] of Object.entries(pick)) {
      const out = join(sb, `${t.s.id}${k === "a" ? "" : "-b"}.jpg`);
      sh("ffmpeg", ["-y", "-loglevel", "error", "-i", preview, "-vf", `select=eq(n\\,${fr})`, "-frames:v", "1", "-q:v", "3", out]);
      frames.push(out);
    }
  });
  const cols = Math.min(6, frames.length);
  sh("ffmpeg", ["-y", "-loglevel", "error", ...frames.flatMap((f) => ["-i", f]), "-filter_complex", `${frames.map((_, i) => `[${i}]`).join("")}xstack=inputs=${frames.length}:layout=${frames.map((_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => "w0").join("+") : "0"}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => "h0").join("+") : "0"}`).join("|")}:fill=black`, join(sb, "contact-sheet.jpg")]);
  // 9:16 mobile check: shade the platform UI zones (top 11%, bottom 20%, right 14%) — text must stay out of red
  const mob = frames.filter((_, i) => i % 2 === 0).map((f) => {
    const o = f.replace(/\.jpg$/, "-mobile.jpg");
    sh("ffmpeg", ["-y", "-loglevel", "error", "-i", f, "-vf", "drawbox=x=0:y=0:w=iw:h=ih*0.11:color=red@0.35:t=fill,drawbox=x=0:y=ih*0.8:w=iw:h=ih*0.2:color=red@0.35:t=fill,drawbox=x=iw*0.86:y=ih*0.45:w=iw*0.14:h=ih*0.35:color=red@0.35:t=fill", o]);
    return o;
  });
  sh("ffmpeg", ["-y", "-loglevel", "error", ...mob.flatMap((f) => ["-i", f]), "-filter_complex", `${mob.map((_, i) => `[${i}]`).join("")}hstack=inputs=${mob.length}`, join(sb, "mobile-safe-check.jpg")]);
  mob.forEach((f) => rmSync(f));
  writeFileSync(join(d, "03-storyboard.md"), `# Storyboard — ${spec.title}
Frames rendered from the real production (previs = the film). Contact sheet: \`storyboard/contact-sheet.jpg\` · 9:16 safe-zone check: \`storyboard/mobile-safe-check.jpg\` (red = platform UI; no text may sit there).

${tl.map((t) => `## ${t.s.id} — ${t.s.direction.shot} (${t.s.beats} beats, ${(t.dur / spec.fps).toFixed(2)} s, in: ${t.s.transition ?? "cut"})
<img src="storyboard/${t.s.id}.jpg" width="220"> <img src="storyboard/${t.s.id}-b.jpg" width="220">

- **Intent:** ${t.s.direction.intent}
- **Camera:** ${t.s.direction.camera} · ${t.s.direction.lens}
- **Light:** ${t.s.direction.lighting}
- **Sound:** ${t.s.direction.sound}
- **Edit:** ${t.s.direction.edit ?? "—"}
`).join("\n")}`);
  console.log(`✔ storyboard: ${frames.length} frames, contact sheet, mobile safe-zone sheet → productions/ad-${id}/storyboard/`);
}

// ---------------- render + QC ----------------
function render(id) {
  const spec = load(id);
  const d = prodDir(id);
  mkdirSync(join(d, "renders"), { recursive: true });
  const master = join(d, "renders", `${id}-master.mp4`);
  const final = join(d, "renders", `${id}-9x16-final.mp4`);
  sh("node", ["scripts/pipeline/render-remotion.mjs", `Ad-${id}`, master, "--crf", "16"]);
  // delivery preset follows the spec's frame rate — never silently drop 60 fps to 30
  const vert60 = spec.format === "vertical" && spec.fps === 60;
  sh("bash", ["scripts/pipeline/export.sh", master, vert60 ? "social-vertical-60" : spec.format === "vertical" ? "social-vertical" : "youtube", final, "--normalize"]);
  let qc;
  try { qc = sh(PY, ["scripts/py/qc.py", final, "--spec", vert60 ? "social-vertical-60" : spec.format === "vertical" ? "social-vertical" : "youtube-16x9", "--json", join(d, "renders", "qc.json")], { quiet: true }); } catch (e) { qc = e.stdout?.toString() ?? ""; }
  const r = JSON.parse(readFileSync(join(d, "renders", "qc.json"), "utf8"));
  writeFileSync(join(d, "qc-report.md"), `# QC Report — ${spec.title}

## Automated (qc.py) — **${r.status}**
| Check | Result |
|---|---|
| Resolution / fps / codec | ${r.checks.width}×${r.checks.height} · ${r.checks.fps} fps · ${r.checks.codec} ${r.checks.pix_fmt} |
| Duration | ${r.checks.duration}s |
| Loudness | ${r.checks.loudness?.integrated_lufs} LUFS · TP ${r.checks.loudness?.true_peak_dbtp} dBTP · LRA ${r.checks.loudness?.lra} |
| Black segments | ${JSON.stringify(r.checks.black_segments)} |
| Frozen segments | ${JSON.stringify(r.checks.freeze_starts)} |
| Issues | ${r.issues.length ? r.issues.map((i) => `${i.severity}: ${i.message}`).join("<br>") : "none"} |

## Visual review
See \`storyboard/contact-sheet.jpg\` and \`storyboard/mobile-safe-check.jpg\`; reviewer notes are appended below by the QC pass.
`);
  console.log(`✔ render: ${final}  QC ${r.status}`);
}

// ---------------- check-vo: validate a human recording before rebuilding ----------------
function checkVo(id) {
  const spec = load(id);
  const spb = 60 / spec.music.bpm;
  const { total } = timeline(spec);
  const end = total / spec.fps;
  const lines = spec.voiceover ?? [];
  let bad = 0;
  console.log(`VO check for ${id} — files in productions/ad-${id}/vo-final/`);
  lines.forEach((v, i) => {
    const f = join(prodDir(id), "vo-final", `${v.id}.wav`);
    const start = v.atBeat * spb;
    const next = lines[i + 1] ? lines[i + 1].atBeat * spb : end;
    const win = +(next - start - 0.15).toFixed(2);
    if (!existsSync(f)) { console.log(`  ✘ ${v.id}  missing  (“${v.text}”, max ${win}s)`); bad++; return; }
    const dur = +sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { quiet: true }).trim();
    const vol = sh("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-af", "volumedetect", "-f", "null", "-"], { quiet: true, stdio: ["ignore", "pipe", "pipe"] });
    const peak = +(vol.match(/max_volume: (-?[\d.]+)/)?.[1] ?? 0);
    const issues = [];
    if (dur > win) issues.push(`too long by ${(dur - win).toFixed(2)}s — trim silence or read faster`);
    if (peak >= -0.5) issues.push(`peak ${peak} dB — likely clipping, re-record lower`);
    if (peak < -20) issues.push(`peak ${peak} dB — very quiet, record closer/louder`);
    console.log(`  ${issues.length ? "✘" : "✔"} ${v.id}  ${dur.toFixed(2)}s / max ${win}s  peak ${peak} dB${issues.length ? "  → " + issues.join("; ") : ""}`);
    if (issues.length) bad++;
  });
  console.log(bad ? `\n${bad} line(s) need attention.` : "\nAll lines OK — run: node scripts/pipeline/commercial.mjs assets " + id + " && node scripts/pipeline/commercial.mjs render " + id);
  if (bad) process.exitCode = 1;
}

const [cmd, id] = process.argv.slice(2);
const ids = id === "all" ? readdirSync(join(ROOT, "remotion/src/commercials")).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", "")) : [id];
if (!cmd || !id) { console.log("usage: commercial.mjs <assets|docs|storyboard|render|all> <id|all>"); process.exit(2); }
for (const i of ids) {
  if (cmd === "assets" || cmd === "all") assets(i);
  if (cmd === "docs" || cmd === "all") docs(i);
  if (cmd === "storyboard" || cmd === "all") storyboard(i);
  if (cmd === "render" || cmd === "all") render(i);
  if (cmd === "check-vo") checkVo(i);
}
