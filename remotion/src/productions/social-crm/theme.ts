import { loadFont as loadHeebo } from "@remotion/google-fonts/Heebo";
import { loadFont as loadFrank } from "@remotion/google-fonts/FrankRuhlLibre";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

// Hebrew needs the "hebrew" subset — without it the glyphs silently fall back to a system font.
export const heebo = loadHeebo("normal", { weights: ["300", "400", "500", "700", "800", "900"], subsets: ["hebrew", "latin"] }).fontFamily;
export const frank = loadFrank("normal", { weights: ["400", "500", "700"], subsets: ["hebrew", "latin"] }).fontFamily;
export const inter = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;

/** "Emerald Noir" — identity designed for Social CRM. Built around the real logo colours (#111827 tile, #22c55e / #3b82f6 / #a855f7 nodes). */
export const C = {
  void: "#04060a",
  graphite: "#111827", // logo tile
  slate: "#94a3b8", // logo connector lines
  emerald: "#22c55e", // logo node — the agent's light
  emeraldGlow: "#34d399",
  mint: "#bbf7d0",
  blue: "#3b82f6", // logo node
  purple: "#a855f7", // logo node
  paper: "#f6f7f5",
  ink: "#0b1220",
  waBubbleIn: "#1f2c34", // dark-mode chat (incoming)
  waBubbleOut: "#005c4b", // dark-mode chat (outgoing)
  warm: "#ffd9a8",
  warmDeep: "#c9772e",
  dayWall: "#efe4d3",
};

/** Fictional business used throughout (no real customer data). */
export const BIZ = {
  name: "סטודיו לילך",
  sub: "קוסמטיקה וטיפוח",
  lead: "נועה כהן",
  leadShort: "נועה",
  service: "טיפול פנים",
  price: "₪350",
  quoteItem: "חבילת 3 טיפולי פנים",
  quoteTotal: "₪950",
  slot: "יום ה׳ · 10:00",
};
