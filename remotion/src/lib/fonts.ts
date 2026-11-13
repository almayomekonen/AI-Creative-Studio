import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";

// Fonts are fetched once at bundle/render time and embedded — subset to latin to keep renders fast.
export const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const inter = loadInter("normal", { weights: ["400", "600", "800"], subsets: ["latin"] }).fontFamily;
export const instrumentSerif = loadInstrumentSerif("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
