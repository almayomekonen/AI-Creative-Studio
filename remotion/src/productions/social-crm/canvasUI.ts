import { C, BIZ } from "./theme";

/**
 * Hebrew RTL interface drawing for 3D surfaces (CanvasTexture). Every element here is story-specific:
 * the lead's chat, the quote, the owner's approvals, the calendar slot, the receipt, the insight.
 * All functions take a 0..1 (or seconds) progress so they animate deterministically per frame.
 */
export type Ctx = CanvasRenderingContext2D;

export const rr = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/** Wrap RTL text into lines that fit maxW. */
const wrap = (ctx: Ctx, text: string, maxW: number) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
};

const rtl = (ctx: Ctx, font: string) => { ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic"; ctx.font = font; };

/** Chat bubble. side "in" = customer (right in RTL chat? In Hebrew WhatsApp, incoming is on the LEFT, outgoing on the RIGHT). */
export const bubble = (ctx: Ctx, opts: { text: string; side: "in" | "out"; y: number; W: number; font: string; scale?: number; alpha?: number; time?: string; tick?: boolean }) => {
  const { text, side, y, W, font } = opts;
  const s = opts.scale ?? 1;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  rtl(ctx, `400 ${34}px ${font}`);
  const maxW = W * 0.7;
  const lines = wrap(ctx, text, maxW - 48);
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width), 140);
  const bw = tw + 52, bh = lines.length * 44 + 44;
  const x = side === "out" ? W - 36 - bw : 36;
  ctx.translate(x + (side === "out" ? bw : 0), y);
  ctx.scale(s, s);
  ctx.translate(-(x + (side === "out" ? bw : 0)), -y);
  ctx.fillStyle = side === "out" ? C.waBubbleOut : C.waBubbleIn;
  rr(ctx, x, y, bw, bh, 22);
  ctx.fill();
  ctx.fillStyle = "#e9edef";
  lines.forEach((l, i) => ctx.fillText(l, x + bw - 26, y + 46 + i * 44));
  ctx.font = `400 22px ${font}`;
  ctx.fillStyle = "rgba(233,237,239,0.55)";
  ctx.textAlign = "left";
  ctx.direction = "ltr";
  ctx.fillText(`${opts.time ?? "09:41"}${opts.tick ? "  ✓✓" : ""}`, x + 20, y + bh - 14);
  ctx.restore();
  return bh;
};

/** A — customer-facing agent answering a WhatsApp lead. t in seconds since station start. */
export const drawChat = (ctx: Ctx, W: number, H: number, t: number, font: string) => {
  ctx.fillStyle = "#0b141a";
  ctx.fillRect(0, 0, W, H);
  // header
  ctx.fillStyle = "#1f2c34";
  ctx.fillRect(0, 0, W, 150);
  ctx.fillStyle = C.emerald;
  ctx.beginPath(); ctx.arc(W - 90, 78, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0b141a"; ctx.font = `700 34px ${font}`; ctx.textAlign = "center"; ctx.fillText("נ", W - 90, 90);
  rtl(ctx, `500 38px ${font}`); ctx.fillStyle = "#e9edef"; ctx.fillText(BIZ.lead, W - 150, 70);
  ctx.font = `400 26px ${font}`; ctx.fillStyle = t > 0.9 && t < 1.6 ? C.emeraldGlow : "rgba(233,237,239,0.6)";
  ctx.fillText(t > 0.9 && t < 1.6 ? "הסוכן מקליד…" : "ליד חדש · מודעה בפייסבוק", W - 150, 112);
  let y = 200;
  const inA = ease((t - 0.15) / 0.25);
  if (inA > 0) y += bubble(ctx, { text: `היי, ראיתי את המודעה 🙂 כמה עולה ${BIZ.service}?`, side: "in", y, W, font, scale: 0.85 + 0.15 * inA, alpha: inA, time: "21:47" }) + 26;
  // typing dots
  if (t > 0.75 && t < 1.25) {
    ctx.fillStyle = C.waBubbleOut; rr(ctx, W - 36 - 150, y, 150, 74, 22); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(233,237,239,${0.35 + 0.65 * Math.abs(Math.sin(t * 9 - i * 0.6))})`; ctx.beginPath(); ctx.arc(W - 36 - 110 + i * 34, y + 37, 9, 0, Math.PI * 2); ctx.fill(); }
  }
  const outA = ease((t - 1.25) / 0.25);
  if (outA > 0) bubble(ctx, { text: `היי ${BIZ.leadShort}! ${BIZ.service} מלא ${BIZ.price}, כשעה. רוצה שאשמור לך מקום השבוע?`, side: "out", y, W, font, scale: 0.85 + 0.15 * outA, alpha: outA, time: "21:47", tick: true });
};

/** Owner-assistant approval chip (confirmation BEFORE the action). p 0..1 appear, pressed 0..1. */
export const drawApproval = (ctx: Ctx, W: number, H: number, question: string, detail: string, pressed: number, font: string) => {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#111b21";
  rr(ctx, 4, 4, W - 8, H - 8, 34); ctx.fill();
  ctx.strokeStyle = pressed > 0.5 ? C.emerald : "rgba(52,211,153,0.45)"; ctx.lineWidth = 4; rr(ctx, 4, 4, W - 8, H - 8, 34); ctx.stroke();
  rtl(ctx, `500 26px ${font}`); ctx.fillStyle = C.emeraldGlow; ctx.fillText("העוזר האישי · וואטסאפ", W - 40, 54);
  ctx.font = `700 38px ${font}`; ctx.fillStyle = "#e9edef"; ctx.fillText(question, W - 40, 108);
  ctx.font = `400 28px ${font}`; ctx.fillStyle = "rgba(233,237,239,0.7)"; ctx.fillText(detail, W - 40, 150);
  // buttons (RTL: approve on the right)
  const bw = (W - 100) / 2;
  const bx = W - 40 - bw;
  ctx.fillStyle = pressed > 0.5 ? C.emerald : "#1f2c34"; rr(ctx, bx, 180, bw, 70, 20); ctx.fill();
  ctx.fillStyle = pressed > 0.5 ? "#04130a" : C.emeraldGlow; ctx.font = `700 32px ${font}`; ctx.textAlign = "center"; ctx.direction = "rtl";
  ctx.fillText(pressed > 0.5 ? "✓ אושר" : "אישור", bx + bw / 2, 226);
  ctx.fillStyle = "#1f2c34"; rr(ctx, 40, 180, bw, 70, 20); ctx.fill();
  ctx.fillStyle = "rgba(233,237,239,0.6)"; ctx.fillText("עריכה", 40 + bw / 2, 226);
};

/** B — quote document forming line by line. p 0..1 build, sent 0..1 stamp. */
export const drawQuote = (ctx: Ctx, W: number, H: number, p: number, sent: number, font: string) => {
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  const reveal = (i: number) => clamp01(p * 9 - i);
  ctx.save();
  ctx.globalAlpha = reveal(0); ctx.fillStyle = C.emerald; ctx.fillRect(W - 90, 70, 26, 26); ctx.fillRect(W - 128, 108, 18, 18);
  rtl(ctx, `800 64px ${font}`); ctx.fillStyle = C.ink; ctx.globalAlpha = reveal(0.5); ctx.fillText("הצעת מחיר", W - 150, 115);
  ctx.font = `400 30px ${font}`; ctx.fillStyle = "#475569"; ctx.globalAlpha = reveal(1); ctx.fillText(`${BIZ.name} · ${BIZ.sub}`, W - 70, 185);
  ctx.globalAlpha = reveal(1.5); ctx.fillText(`לכבוד: ${BIZ.lead}`, W - 70, 235);
  ctx.globalAlpha = reveal(2); ctx.fillText("מס׳ 1047 · בתוקף 14 יום", W - 70, 280);
  ctx.globalAlpha = reveal(2.5); ctx.fillStyle = "#e2e8f0"; ctx.fillRect(70, 320, W - 140, 3);
  const rows: [string, string][] = [[BIZ.quoteItem, BIZ.quoteTotal], ["ייעוץ עור ראשוני", "כלול"], ["מוצר טיפוח לבית", "מתנה"]];
  rows.forEach(([a, b], i) => {
    ctx.globalAlpha = reveal(3 + i * 0.8); ctx.font = `500 34px ${font}`; ctx.fillStyle = C.ink; ctx.textAlign = "right"; ctx.direction = "rtl";
    ctx.fillText(a, W - 70, 390 + i * 70); ctx.textAlign = "left"; ctx.direction = "rtl"; ctx.fillText(b, 70, 390 + i * 70);
  });
  ctx.globalAlpha = reveal(5.6); ctx.fillStyle = "#e2e8f0"; ctx.fillRect(70, 600, W - 140, 3);
  ctx.globalAlpha = reveal(6.2); ctx.font = `800 52px ${font}`; ctx.fillStyle = C.ink; ctx.textAlign = "right"; ctx.fillText("סה״כ", W - 70, 690);
  ctx.textAlign = "left"; ctx.fillStyle = C.emerald; ctx.fillText(BIZ.quoteTotal, 70, 690);
  ctx.restore();
  if (sent > 0) {
    ctx.save(); ctx.globalAlpha = clamp01(sent * 2); ctx.translate(W / 2, H - 170); ctx.rotate(-0.12); ctx.scale(1.4 - 0.4 * ease(sent), 1.4 - 0.4 * ease(sent));
    ctx.strokeStyle = C.emerald; ctx.lineWidth = 8; rr(ctx, -190, -60, 380, 120, 24); ctx.stroke();
    ctx.fillStyle = C.emerald; ctx.font = `800 58px ${font}`; ctx.textAlign = "center"; ctx.direction = "rtl"; ctx.fillText("נשלח ✓", 0, 20);
    ctx.restore();
  }
};

/** C — week calendar. p: slot appears/glows. */
export const drawCalendar = (ctx: Ctx, W: number, H: number, p: number, confirmed: number, font: string) => {
  ctx.fillStyle = "#0d1520"; ctx.fillRect(0, 0, W, H);
  rtl(ctx, `700 40px ${font}`); ctx.fillStyle = "#e2e8f0"; ctx.fillText("היומן של לילך", W - 50, 70);
  ctx.font = `400 26px ${font}`; ctx.fillStyle = C.slate; ctx.fillText("השבוע", W - 50, 108);
  const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳"];
  const gx = 120, gy = 150, cw = (W - gx - 40) / 5, chh = (H - gy - 40) / 6;
  days.forEach((d, i) => { ctx.textAlign = "center"; ctx.fillStyle = i === 4 ? C.emeraldGlow : C.slate; ctx.font = `600 28px ${font}`; ctx.fillText(d, W - 40 - cw * (i + 0.5), gy - 12); });
  ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00"].forEach((h, r) => { ctx.textAlign = "left"; ctx.direction = "ltr"; ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.font = `400 22px ${font}`; ctx.fillText(h, 24, gy + r * chh + 30); ctx.direction = "rtl"; });
  ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.lineWidth = 2;
  for (let i = 0; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(W - 40 - cw * i, gy); ctx.lineTo(W - 40 - cw * i, H - 40); ctx.stroke(); }
  for (let r = 0; r <= 6; r++) { ctx.beginPath(); ctx.moveTo(gx, gy + r * chh); ctx.lineTo(W - 40, gy + r * chh); ctx.stroke(); }
  // existing bookings (fictional)
  const busy: [number, number, string][] = [[0, 0, "טיפול"], [1, 2, "גבות"], [2, 1, "טיפול"], [3, 3, "ייעוץ"], [0, 4, "מניקור"], [2, 4, "טיפול"]];
  busy.forEach(([d, r, l]) => { ctx.fillStyle = "rgba(59,130,246,0.22)"; rr(ctx, W - 40 - cw * (d + 1) + 6, gy + r * chh + 6, cw - 12, chh - 12, 12); ctx.fill(); ctx.fillStyle = "#93c5fd"; ctx.font = `500 22px ${font}`; ctx.textAlign = "center"; ctx.fillText(l, W - 40 - cw * (d + 0.5), gy + r * chh + chh / 2 + 8); });
  // the new slot (Thursday 10:00) — drawn faint here; the 3D raised slot carries the hero glow
  ctx.globalAlpha = clamp01(p) * (1 - confirmed * 0.6);
  ctx.strokeStyle = C.emerald; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); rr(ctx, W - 40 - cw * 5 + 6, gy + chh + 6, cw - 12, chh - 12, 12); ctx.stroke(); ctx.setLineDash([]);
  ctx.globalAlpha = 1;
};

/** The raised calendar slot (its own little 3D card). */
export const drawSlot = (ctx: Ctx, W: number, H: number, confirmed: number, font: string) => {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = confirmed > 0.5 ? C.emerald : "#0f2a1c"; rr(ctx, 0, 0, W, H, 26); ctx.fill();
  rtl(ctx, `800 40px ${font}`); ctx.fillStyle = confirmed > 0.5 ? "#04130a" : C.mint; ctx.fillText(`${BIZ.slot}`, W - 28, 62);
  ctx.font = `500 30px ${font}`; ctx.fillText(`${BIZ.lead} · ${BIZ.service}`, W - 28, 108);
  ctx.font = `700 28px ${font}`; ctx.fillText(confirmed > 0.5 ? "✓ נקבע · נשלחה תזכורת" : "ממתין לאישור", W - 28, 152);
};

/** D — receipt. p 0..1 printed length (content reveals with it), paid stamp. */
export const drawReceipt = (ctx: Ctx, W: number, H: number, font: string, sent = 1) => {
  ctx.fillStyle = "#fbfbf8"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e9ece8"; for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + 12, H - 16); ctx.lineTo(x + 24, H); ctx.fill(); }
  ctx.textAlign = "center"; ctx.direction = "rtl"; ctx.fillStyle = C.ink;
  ctx.font = `800 46px ${font}`; ctx.fillText(BIZ.name, W / 2, 80);
  ctx.font = `400 24px ${font}`; ctx.fillStyle = "#64748b"; ctx.fillText("עוסק מורשה · קבלה מס׳ 2231", W / 2, 120);
  ctx.fillStyle = "#cbd5e1"; ctx.fillRect(40, 150, W - 80, 2);
  rtl(ctx, `500 32px ${font}`); ctx.fillStyle = C.ink; ctx.fillText(`${BIZ.service} — ${BIZ.lead}`, W - 40, 210);
  ctx.textAlign = "left"; ctx.fillText(BIZ.price, 40, 210);
  rtl(ctx, `400 26px ${font}`); ctx.fillStyle = "#64748b"; ctx.fillText("אמצעי תשלום: אשראי", W - 40, 260);
  ctx.fillStyle = "#cbd5e1"; ctx.fillRect(40, 290, W - 80, 2);
  rtl(ctx, `800 40px ${font}`); ctx.fillStyle = C.ink; ctx.fillText("סה״כ שולם", W - 40, 350);
  ctx.textAlign = "left"; ctx.fillStyle = C.emerald; ctx.fillText(BIZ.price, 40, 350);
  ctx.globalAlpha = Math.max(0, Math.min(1, sent)); ctx.textAlign = "center"; ctx.fillStyle = C.emerald; ctx.font = `800 34px ${font}`; ctx.fillText("✓ נשלחה ללקוחה בוואטסאפ", W / 2, 430); ctx.globalAlpha = 1;
};

/** E — insight card: what the agent noticed + the owner's one-tap decision. */
export const drawInsight = (ctx: Ctx, W: number, H: number, font: string, pressed = 0) => {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(10,20,16,0.94)"; rr(ctx, 4, 4, W - 8, H - 8, 34); ctx.fill();
  ctx.strokeStyle = C.emerald; ctx.lineWidth = 4; rr(ctx, 4, 4, W - 8, H - 8, 34); ctx.stroke();
  rtl(ctx, `700 30px ${font}`); ctx.fillStyle = C.emeraldGlow; ctx.fillText("✦ זוהתה הזדמנות", W - 44, 66);
  ctx.font = `800 46px ${font}`; ctx.fillStyle = "#f1f5f9"; ctx.fillText("8 לקוחות לא קבעו תור מעל חודשיים", W - 44, 136);
  ctx.font = `400 34px ${font}`; ctx.fillStyle = "rgba(241,245,249,0.78)"; ctx.fillText("להכין להן הודעת הטבת חזרה?", W - 44, 196);
  const bw = (W - 110) / 2, bx = W - 44 - bw;
  ctx.fillStyle = pressed > 0.5 ? C.emerald : "#1f2c34"; rr(ctx, bx, 262, bw, 92, 22); ctx.fill();
  ctx.fillStyle = pressed > 0.5 ? "#04130a" : C.emeraldGlow; ctx.font = `700 36px ${font}`; ctx.textAlign = "center";
  ctx.fillText(pressed > 0.5 ? "✓ מכין טיוטה" : "כן, להכין", bx + bw / 2, 320);
  ctx.fillStyle = "#1f2c34"; rr(ctx, 44, 262, bw, 92, 22); ctx.fill();
  ctx.fillStyle = "rgba(241,245,249,0.6)"; ctx.fillText("אחר כך", 44 + bw / 2, 320);
};

/** Notification / message bubble used in the chaos swarm (fictional customers). */
export const SWARM_MESSAGES: [string, string][] = [
  ["דנה", "היי, יש תור פנוי מחר?"], ["יוסי", "כמה עולה הטיפול?"], ["מיכל", "שלחתם כבר הצעת מחיר?"], ["אבי", "אפשר לדבר עכשיו?"],
  ["רונית", "צריכה קבלה על התשלום 🙏"], ["שירה", "מה שעות הפתיחה?"], ["עומר", "אפשר להזיז את הפגישה?"], ["ליאת", "ראיתי את המודעה, מעוניינת"],
  ["תמר", "יש הנחה לחבילה?"], ["גיל", "?"], ["נועה", "כמה עולה טיפול פנים?"], ["הדר", "אתם עובדים בשישי?"],
];

export const drawSwarmBubble = (ctx: Ctx, W: number, H: number, name: string, text: string, font: string) => {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(31,44,52,0.96)"; rr(ctx, 4, 4, W - 8, H - 8, 30); ctx.fill();
  ctx.fillStyle = C.emerald; ctx.beginPath(); ctx.arc(W - 56, H / 2, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#04130a"; ctx.font = `800 30px ${font}`; ctx.textAlign = "center"; ctx.direction = "rtl"; ctx.fillText(name[0], W - 56, H / 2 + 11);
  rtl(ctx, `700 30px ${font}`); ctx.fillStyle = "#e9edef"; ctx.fillText(name, W - 104, H / 2 - 8);
  ctx.font = `400 30px ${font}`; ctx.fillStyle = "rgba(233,237,239,0.82)"; ctx.fillText(text, W - 104, H / 2 + 32);
  ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(34, 34, 16, 0, Math.PI * 2); ctx.fill();
};

/** Phone lock-screen / home: notification stack with a climbing unread badge (chaos) or calm status (payoff). */
export const drawPhoneScreen = (ctx: Ctx, W: number, H: number, mode: "chaos" | "calm" | "agent", t: number, font: string) => {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (mode === "calm") { g.addColorStop(0, "#1a2a22"); g.addColorStop(1, "#0b1510"); } else { g.addColorStop(0, "#0b141a"); g.addColorStop(1, "#06090c"); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `300 150px ${font}`; ctx.fillText(mode === "calm" ? "08:12" : "21:47", W / 2, 260);
  if (mode === "chaos") {
    const n = Math.min(12, Math.floor(t * 3.2) + 1);
    for (let i = 0; i < Math.min(n, 6); i++) {
      const [name, text] = SWARM_MESSAGES[(n - 1 - i) % SWARM_MESSAGES.length];
      ctx.save(); ctx.translate(0, 340 + i * 150);
      ctx.fillStyle = "rgba(40,52,60,0.92)"; rr(ctx, 40, 0, W - 80, 130, 30); ctx.fill();
      rtl(ctx, `700 32px ${font}`); ctx.fillStyle = "#fff"; ctx.fillText(`WhatsApp · ${name}`, W - 80, 52);
      ctx.font = `400 30px ${font}`; ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillText(text, W - 80, 98);
      ctx.restore();
    }
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(W - 90, 1250, 54, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `800 52px ${font}`; ctx.textAlign = "center"; ctx.fillText(String(Math.floor(3 + t * 9)), W - 90, 1268);
  } else if (mode === "calm") {
    ctx.save(); ctx.translate(0, 360);
    ctx.fillStyle = "rgba(34,197,94,0.18)"; rr(ctx, 40, 0, W - 80, 250, 34); ctx.fill();
    ctx.strokeStyle = "rgba(52,211,153,0.6)"; ctx.lineWidth = 3; rr(ctx, 40, 0, W - 80, 250, 34); ctx.stroke();
    rtl(ctx, `700 34px ${font}`); ctx.fillStyle = C.mint; ctx.fillText("Social CRM · סיכום הלילה", W - 80, 60);
    ctx.font = `500 32px ${font}`; ctx.fillStyle = "#ecfdf5";
    ["✓ כל הפניות נענו", "✓ פגישה נקבעה ליום ה׳", "✓ 2 קבלות נשלחו"].forEach((l, i) => ctx.fillText(l, W - 80, 120 + i * 46));
    ctx.restore();
  }
};
