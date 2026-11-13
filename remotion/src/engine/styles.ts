import { anton, inter, instrumentSerif } from "../lib/fonts";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";

const spaceGrotesk = loadSpaceGrotesk("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
const playfair = loadPlayfair("italic", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily;
const archivoBlack = loadArchivoBlack("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const jetbrains = loadJetBrains("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;

export type StageId = "noir" | "neon" | "dream" | "white" | "void";
export type TransitionId = "cut" | "flash" | "whip" | "zoom" | "portal" | "glitch" | "iris";

/**
 * A visual identity = a complete, reusable creative system. Productions pick one and every block reads from it,
 * so the same scene library yields genuinely different films.
 */
export type Style = {
  id: string;
  name: string;
  mood: string;
  palette: { bg: string; ink: string; paper: string; accent: string; accent2: string; glow: [string, string] };
  fonts: { display: string; serif: string; body: string; mono: string };
  type: { displayCase: "upper" | "none"; tracking: number; displayWeightFeel: "heavy" | "elegant" | "technical" };
  stage: StageId;
  film: { grain: number; vignette: number; letterbox?: number; tint?: string };
  /** Preferred transition vocabulary, most characteristic first. */
  transitions: TransitionId[];
  /** Synth defaults for this identity. */
  music: { bpmHint: number; mood: string };
  references: string;
};

export const STYLES: Record<string, Style> = {
  "noir-luxe": {
    id: "noir-luxe", name: "Noir Luxe", mood: "nocturnal, sensual, expensive",
    palette: { bg: "#0b0909", ink: "#0b0909", paper: "#f4ede2", accent: "#d9b26a", accent2: "#7a1f1a", glow: ["#ffb070", "#5a2410"] },
    fonts: { display: anton, serif: instrumentSerif, body: inter, mono: jetbrains },
    type: { displayCase: "upper", tracking: 10, displayWeightFeel: "elegant" },
    stage: "noir", film: { grain: 0.14, vignette: 0.4 }, transitions: ["flash", "zoom", "cut"],
    music: { bpmHint: 120, mood: "minor, slow pads, deep kick" }, references: "fragrance noir campaigns, Wong Kar-wai colour, Mann night light",
  },
  "acid-volt": {
    id: "acid-volt", name: "Acid Volt", mood: "aggressive, electric, loud",
    palette: { bg: "#050505", ink: "#050505", paper: "#f2f2ee", accent: "#c6ff00", accent2: "#ff2bd6", glow: ["#c6ff00", "#1a3300"] },
    fonts: { display: archivoBlack, serif: playfair, body: spaceGrotesk, mono: jetbrains },
    type: { displayCase: "upper", tracking: -2, displayWeightFeel: "heavy" },
    stage: "neon", film: { grain: 0.1, vignette: 0.3 }, transitions: ["glitch", "portal", "whip", "flash"],
    music: { bpmHint: 150, mood: "driving 16ths, distorted bass, risers" }, references: "energy-drink spots, rave flyers, brutalist grotesk posters",
  },
  "ethereal-dawn": {
    id: "ethereal-dawn", name: "Ethereal Dawn", mood: "weightless, tender, dreamlike",
    palette: { bg: "#f3e6e8", ink: "#2b2140", paper: "#fffaf6", accent: "#b48cff", accent2: "#ffb3c7", glow: ["#ffe3ee", "#c7b6ff"] },
    fonts: { display: playfair, serif: playfair, body: inter, mono: jetbrains },
    type: { displayCase: "none", tracking: 1, displayWeightFeel: "elegant" },
    stage: "dream", film: { grain: 0.08, vignette: 0.15, tint: "rgba(255,200,230,0.06)" }, transitions: ["portal", "iris", "zoom"],
    music: { bpmHint: 90, mood: "sus2 pads, sparse arps, shimmer" }, references: "surrealist photography, pastel skies, Magritte, slow-motion fabric",
  },
  "swiss-precision": {
    id: "swiss-precision", name: "Swiss Precision", mood: "exact, confident, rhythmic",
    palette: { bg: "#f2f1ee", ink: "#111111", paper: "#ffffff", accent: "#ff3b1f", accent2: "#111111", glow: ["#ffffff", "#d9d6d0"] },
    fonts: { display: spaceGrotesk, serif: instrumentSerif, body: spaceGrotesk, mono: jetbrains },
    type: { displayCase: "none", tracking: -3, displayWeightFeel: "technical" },
    stage: "white", film: { grain: 0.04, vignette: 0.08 }, transitions: ["iris", "whip", "cut"],
    music: { bpmHint: 120, mood: "minimal percussion, ticks, clean bass" }, references: "Müller-Brockmann grids, Braun, Swiss railway clock",
  },
  "chrome-y2k": {
    id: "chrome-y2k", name: "Chrome Y2K", mood: "glossy, playful, futurist",
    palette: { bg: "#0c0f1a", ink: "#0c0f1a", paper: "#eef3ff", accent: "#7df9ff", accent2: "#ff7ad9", glow: ["#9ad7ff", "#2a1b5a"] },
    fonts: { display: archivoBlack, serif: instrumentSerif, body: spaceGrotesk, mono: jetbrains },
    type: { displayCase: "upper", tracking: 2, displayWeightFeel: "heavy" },
    stage: "void", film: { grain: 0.06, vignette: 0.3 }, transitions: ["zoom", "portal", "glitch"],
    music: { bpmHint: 128, mood: "bright arps, bouncy bass" }, references: "Y2K chrome type, early-2000s CGI, holographic foil",
  },
  "mono-brutal": {
    id: "mono-brutal", name: "Mono Brutal", mood: "stark, editorial, uncompromising",
    palette: { bg: "#000000", ink: "#000000", paper: "#ffffff", accent: "#ffffff", accent2: "#ff0000", glow: ["#ffffff", "#222222"] },
    fonts: { display: anton, serif: instrumentSerif, body: jetbrains, mono: jetbrains },
    type: { displayCase: "upper", tracking: 0, displayWeightFeel: "heavy" },
    stage: "void", film: { grain: 0.2, vignette: 0.2 }, transitions: ["cut", "flash", "glitch"],
    music: { bpmHint: 100, mood: "sparse, heavy hits, silence" }, references: "editorial fashion, black-and-white print, Swiss punk",
  },
};

export const getStyle = (id: string): Style => STYLES[id] ?? STYLES["noir-luxe"];
export const fontsFor = (s: Style) => s.fonts;
