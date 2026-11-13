# Production Report — Social CRM · "The Employee That Never Sleeps"
_AI Creative Studio · first real-world production · 2026-11-13_

## Deliverables
| Item | File |
|---|---|
| **Final 9:16 MP4** (1080×1920, 60 fps, H.264, −14 LUFS) | `renders/social-crm-9x16-final.mp4` |
| Master (pre-normalisation) | `renders/social-crm-master.mp4` |
| Storyboard (frames from the final film) | `03-storyboard.md`, `storyboard/contact-sheet.jpg`, `storyboard/S*.jpg` |
| 9:16 safe-zone check | `storyboard/mobile-safe-check.jpg` |
| Shot list | `shotlist.yaml` (+ `04-direction.md` camera & lighting) |
| Hebrew VO script + recording spec | `deliverables/vo-script-he.md` |
| Hebrew RTL captions (SRT, UTF-8, RTL-embedded) | `deliverables/social-crm-he.srt` |
| Concept / script / sound design / edit timeline | `01-concept.md`, `02-script.md`, `05-sound-design.md`, `06-edit-timeline.md` |
| QC | `qc-report.md`, `renders/qc.json` |
| Hook iterations (selection evidence) | `hook-iterations/*.jpg` |

## Exact reproduction
```bash
cd ~/Documents/AI-Creative-Studio
node scripts/pipeline/commercial.mjs assets social-crm      # score (synth.py), VO, script-exact Hebrew captions
node scripts/pipeline/commercial.mjs docs social-crm        # brief, concept, script, direction, shot list, sound design, EDL
node scripts/pipeline/commercial.mjs render social-crm      # 60 fps master → social-vertical-60 delivery (−14 LUFS) → QC
node scripts/pipeline/captions-to-srt.mjs remotion/public/commercials/social-crm/captions.json productions/ad-social-crm/deliverables/social-crm-he.srt --rtl
```
Code: `remotion/src/productions/social-crm/` (SceneOpen, SceneWork, SceneEnd, Ad, parts, canvasUI, theme). Spec: `remotion/src/commercials/social-crm.json`. Composition id: `Ad-social-crm`. Render time on the M1: ~4 min master + ~1.5 min export/QC.

## Creative summary
**Big idea:** the agent *is* the logo. Social CRM's real three-node icon (green #22c55e · blue #3b82f6 · purple #a855f7 on a #111827 tile) became the visual hero: a liquid-chrome core inside a faceted clear-glass shell, lit from inside with emerald, orbited by the three brand nodes. Born from the chaos of unanswered WhatsApp messages, it works through five real jobs, gives the owner time back, and resolves into the actual logo.

| Time | Scene | What happens |
|---|---|---|
| 0–5 s | Chaos | Frame 0 inside a storm of Hebrew WhatsApp messages rushing past the lens (bokeh depth); the storm parts; aggressive push-in onto a phone in a dark office; pings accelerate into a riser |
| 5–10 s | Arrival | Every message converges into one point → emerald flash → the agent forms → its shell flattens into the agent interface (match cut) |
| 10–23 s | Power | One continuous camera journey; each object becomes the next: reply bubble → quote (owner approves "✓ אושר") → flies into Thursday 10:00 (approved) → slot flips into a receipt (approved, sent) → receipt dissolves into customer data → 8-customer opportunity + one-tap decision |
| 23–30 s | Payoff | Everything collapses into the phone; music drops to near silence; night turns into warm morning; flat-lay: calm night summary, coffee, notebook "תוכנית צמיחה 2027" — the owner is present without being shown |
| 30–35 s | Brand | Hero → real logo icon → "SocialCRM" types on → "העובד החדש שלכם · ישירות בוואטסאפ" → "פחות להתעסק. יותר להצמיח." |

**Identity "Emerald Noir":** obsidian #04060a, logo graphite, emerald light, brand blue/purple accents only via the nodes; Heebo (Hebrew display/UI, hebrew subset), Frank Ruhl Libre (emotional serif line), Inter (wordmark, matching the real logo).

**Product accuracy:** customer-facing agent shown only answering an incoming WhatsApp lead; owner-assistant actions (quote, meeting, receipt, opportunity) each shown with an explicit owner approval *before* the action. All business data is fictional (סטודיו לילך, נועה כהן). No statistics about the product are claimed.

## Process & review log (what was actually fixed)
1. **Hook — 4 iterations** (`hook-iterations/`): iter1 swarm missing (meshes had no geometry) · iter2 sparse, weak frame 0 · iter3 storm-first vs push-first compared → storm-first chosen · iter4 denser storm, DOF bokeh, desk relit → **selected**.
2. Hero read as a green jelly ball → glass made clear, emerald moved to light/edges/rim, chrome made silver.
3. Phone kept showing behind the hero (colour-dim didn't apply) → opacity + removal.
4. Capability labels collided with cards → cards reframed lower; labels own the top third.
5. Quote/receipt blew out to white under bloom → paper rendered below the bloom threshold.
6. Approval toasts cut off / inside the 9:16 UI zone → moved onto each object.
7. Opportunity dots vanished at their destination (three.js frustum culling of moving points) → fixed; ring re-centred on the real cluster; insight card given a decision row.
8. Payoff was a phone filling the frame with text colliding → redesigned as a morning flat-lay crane.
9. Brand: oversized hero, typing over the icon, grey tile, giant glint bar → resized, re-timed, near-black tile, subtle glint.
10. **QC caught a delivery defect:** the export preset forced 30 fps while QC also expected 30 → added `social-vertical-60` export + QC spec; the pipeline now follows the spec's fps. Final file verified **60.0 fps**.

## Automated QC (final file)
PASS — 1080×1920 · 60.0 fps · H.264 yuv420p · 35.008 s · −14.03 LUFS integrated · −1.50 dBTP true peak · LRA 5.9 · no mid-programme black · no frozen segments.

## ⚠️ Must resolve before publishing
1. **Voiceover licence.** The film uses macOS "Carmit" as a **scratch** voice (Apple licenses system voices for personal, non-commercial use). The only free local Hebrew neural voice (Piper `he_IL-saspeech`) is trained on a dataset whose licence forbids commercial/broadcast use, so it was rejected. Record a licensed Hebrew voice (script + spec in `deliverables/vo-script-he.md`), drop the WAVs into `vo-final/`, and re-run the reproduction commands — captions re-time automatically.
2. **Human audio review.** The mix was verified by loudness/spectrum measurement only; no one has listened to it yet.

## Known limitations (honest)
- No live-action people (procedural stack); the owner is implied through the environment by design.
- Interfaces are original WhatsApp-style dark-mode chats, not the real WhatsApp UI or logo.
- Scratch Hebrew TTS mispronounces some words slightly ("בעסק" heard as "ביסק" by Whisper); the final human VO removes this.

## Access note
Per your one-time permission, the studio read exactly one file from the Social CRM project: `~/Documents/social-crm/public/media/logo.svg` (copied to `studio/brand/social-crm/logo.svg`). Nothing else in Social CRM was read or modified.
