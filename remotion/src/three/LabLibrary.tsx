import React from "react";
import { Sequence } from "remotion";
import { ProductScene } from "./ProductScene";
import type { ProductKind } from "./products";
import { getStyle } from "../engine/styles";
import type { StageId } from "../engine/styles";

// 9:16 test bench: every product on its natural stage (30 frames each).
const CASES: { product: ProductKind; style: string; stage: StageId; name: string; sub: string; dist: number; lookY: number; lens: number }[] = [
  { product: "flacon", style: "noir-luxe", stage: "noir", name: "NOIR", sub: "eau de code", dist: 9, lookY: 1.3, lens: 50 },
  { product: "can", style: "acid-volt", stage: "neon", name: "VOLT", sub: "zero sugar", dist: 8, lookY: 1.3, lens: 50 },
  { product: "prism", style: "ethereal-dawn", stage: "dream", name: "Éther", sub: "", dist: 10, lookY: 1.8, lens: 50 },
  { product: "watch", style: "swiss-precision", stage: "white", name: "Tempo", sub: "", dist: 7.5, lookY: 1.3, lens: 50 },
  { product: "jar", style: "chrome-y2k", stage: "void", name: "GLOW", sub: "", dist: 11, lookY: 1.0, lens: 50 },
];
export const LabLibrary: React.FC = () => (
  <>
    {CASES.map((c, i) => {
      const s = getStyle(c.style);
      return (
        <Sequence key={i} from={i * 30} durationInFrames={30}>
          <ProductScene
            product={c.product}
            stage={c.stage}
            brand={{ name: c.name, sub: c.sub, colorA: s.palette.accent, colorB: c.product === "can" ? "#0a0a0a" : c.product === "watch" ? "#ffffff" : s.palette.glow[1], ink: s.palette.ink, fontDisplay: s.fonts.display, fontBody: s.fonts.body }}
            colors={{ bg: s.palette.bg, glow: s.palette.glow, accent: s.palette.accent, accent2: s.palette.accent2 }}
            camera={{ from: { orbit: 0.35, dist: c.dist, height: 1.2, lookY: c.lookY, lens: c.lens } }}
            motion={{ spin: 0.3, float: c.stage === "dream" ? 0.12 : 0 }}
            dof="auto"
          />
        </Sequence>
      );
    })}
  </>
);
