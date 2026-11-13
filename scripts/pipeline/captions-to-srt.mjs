#!/usr/bin/env node
// Word captions (script-aligned JSON) → SRT. One cue per spoken line (pause > gap ms starts a new cue).
// Hebrew/Arabic: --rtl wraps each cue in RLE…PDF so LTR-default players keep punctuation on the correct side.
//   node scripts/pipeline/captions-to-srt.mjs <captions.json> <out.srt> [--rtl] [--gap 600] [--max-chars 42]
import { readFileSync, writeFileSync } from "node:fs";

const [inp, out, ...rest] = process.argv.slice(2);
if (!inp || !out) { console.error("usage: captions-to-srt.mjs <captions.json> <out.srt> [--rtl] [--gap 600] [--max-chars 42]"); process.exit(2); }
const opt = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d; };
const rtl = rest.includes("--rtl");
const gap = +opt("gap", 600), maxChars = +opt("max-chars", 42);
const words = JSON.parse(readFileSync(inp, "utf8"));
const cues = [];
for (const w of words) {
  const cur = cues[cues.length - 1];
  const text = w.text.trim();
  if (!cur || w.startMs - cur.end > gap || (cur.text + " " + text).length > maxChars * 2) cues.push({ start: w.startMs, end: w.endMs, text });
  else { cur.text += " " + text; cur.end = w.endMs; }
}
// split long cues into two balanced lines
const lines = (t) => {
  if (t.length <= maxChars) return t;
  const ws = t.split(" ");
  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < ws.length; i++) { const d = Math.abs(ws.slice(0, i).join(" ").length - ws.slice(i).join(" ").length); if (d < bestDiff) { bestDiff = d; best = i; } }
  return ws.slice(0, best).join(" ") + "\n" + ws.slice(best).join(" ");
};
const ts = (ms) => { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), r = Math.round(ms % 1000); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(r).padStart(3, "0")}`; };
const RLE = "‫", PDF = "‬";
const srt = cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end + 250)}\n${lines(c.text).split("\n").map((l) => (rtl ? RLE + l + PDF : l)).join("\n")}\n`).join("\n");
writeFileSync(out, "﻿" + srt, "utf8");
console.log(`✔ ${cues.length} cues → ${out}`);
