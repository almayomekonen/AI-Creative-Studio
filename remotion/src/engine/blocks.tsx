import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ProductScene, fitDistance, type Cam, type CameraMove } from "../three/ProductScene";
import { PRODUCTS, type ProductBrand } from "../three/products";
import { ShaderCanvas } from "../three/ShaderCanvas";
import { SURREAL_WORLD, LIQUID_GRADIENT, PORTAL_TUNNEL, LIQUID_SILK, SURREAL_DUSK, SURREAL_DAWN } from "../three/shaders";
import { ParticleMorph, type ParticleTarget } from "../three/ParticleMorph";
import { LiquidChrome } from "../three/LiquidChrome";
import { MorphShape, type ShapeName } from "../lib/Morph";
import { beatPulse } from "../lib/beats";
import type { CommercialSpec, SceneSpec } from "./types";
import type { Style } from "./styles";
import { useFormat } from "./format";

export type BlockCtx = { spec: CommercialSpec; scene: SceneSpec; style: Style; fpb: number; kicks: number[]; sceneStartSec: number };

const hex2vec = (h: string): [number, number, number] => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const brandFor = (spec: CommercialSpec, style: Style): ProductBrand => ({
  name: spec.brand.name, sub: spec.brand.sub, colorA: spec.brand.colorA ?? style.palette.accent, colorB: spec.brand.colorB ?? style.palette.glow[1],
  ink: style.palette.ink, fontDisplay: style.fonts.display, fontBody: style.fonts.body,
});

/** Resolve "fill" framing: cams may omit dist and give `fill` (fraction of frame the product should occupy). */
const resolveCam = (c: Cam, kind: CommercialSpec["product"], aspect: number): Cam => {
  if (c.dist !== undefined && !Number.isNaN(c.dist)) return c;
  const p = PRODUCTS[kind];
  return { ...c, dist: fitDistance(p.width, p.height, c.lens ?? 50, aspect, c.fill ?? 0.7) };
};

// ---------------- product ----------------
const ProductBlock: React.FC<{ ctx: BlockCtx }> = ({ ctx }) => {
  const f = useFormat();
  const p = ctx.scene.props ?? {};
  const cam = p.camera as CameraMove;
  const move: CameraMove = { ...cam, from: resolveCam(cam.from, ctx.spec.product, f.aspect), to: cam.to ? resolveCam(cam.to, ctx.spec.product, f.aspect) : undefined };
  return (
    <ProductScene
      product={ctx.spec.product}
      brand={brandFor(ctx.spec, ctx.style)}
      stage={(p.stage as Style["stage"]) ?? ctx.style.stage}
      colors={{ bg: ctx.style.palette.bg, glow: ctx.style.palette.glow, accent: ctx.style.palette.accent, accent2: ctx.style.palette.accent2 }}
      camera={move}
      motion={p.motion}
      dof={(p.dof as "auto" | undefined) ?? undefined}
      bloom={(p.bloom as number | undefined) ?? 0.3}
    />
  );
};

// ---------------- shader ----------------
const ShaderBlock: React.FC<{ ctx: BlockCtx }> = ({ ctx }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const p = ctx.scene.props ?? {};
  const pal = ctx.style.palette;
  const prog = interpolate(frame, [0, durationInFrames], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.3, 1) });
  const anim = (p.animate ?? {}) as Record<string, [number, number]>;
  const a = (k: string, d: number) => (anim[k] ? anim[k][0] + (anim[k][1] - anim[k][0]) * prog : ((p[k] as number | undefined) ?? d));
  const pulse = beatPulse(frame + Math.round(ctx.sceneStartSec * fps), fps, ctx.kicks, 8);
  const kind = (p.shader as string) ?? "gradient";
  if (kind === "surreal") return <ShaderCanvas fragment={SURREAL_WORLD} uniforms={{ ...((p.palette === "dawn" ? SURREAL_DAWN : SURREAL_DUSK) as unknown as Record<string, [number, number, number]>), uCamX: a("uCamX", 3.2), uDolly: a("uDolly", 0), uRise: a("uRise", 0), uSun: a("uSun", 0.3), uOrb: 0.4 + 0.4 * pulse }} />;
  if (kind === "tunnel") return <ShaderCanvas fragment={PORTAL_TUNNEL} uniforms={{ uSpeed: a("uSpeed", 1.2), uColA: hex2vec(pal.accent), uColB: hex2vec(pal.accent2), uTwist: a("uTwist", 1), uFlash: pulse }} />;
  if (kind === "silk") return <ShaderCanvas fragment={LIQUID_SILK} uniforms={{ uA: hex2vec((p.c0 as string) ?? pal.ink), uB: hex2vec((p.c1 as string) ?? pal.accent), uC: hex2vec((p.c2 as string) ?? pal.paper), uFlow: a("uFlow", 1) }} />;
  return <ShaderCanvas fragment={LIQUID_GRADIENT} uniforms={{ uA: hex2vec((p.c0 as string) ?? pal.bg), uB: hex2vec((p.c1 as string) ?? pal.accent), uC: hex2vec((p.c2 as string) ?? pal.accent2), uFlow: a("uFlow", 1.5) }} />;
};

// ---------------- particles ----------------
const ParticlesBlock: React.FC<{ ctx: BlockCtx }> = ({ ctx }) => {
  const frame = useCurrentFrame();
  const p = ctx.scene.props ?? {};
  const b = ctx.fpb;
  const formAt = (p.formAt as [number, number]) ?? [0, 3];
  const explodeAt = p.explodeAt as [number, number] | undefined;
  const form = interpolate(frame, [formAt[0] * b, formAt[1] * b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const explode = explodeAt ? interpolate(frame, [explodeAt[0] * b, explodeAt[1] * b], [0, 1.3], { ...clamp, easing: Easing.out(Easing.cubic) }) : 0;
  const pal = ctx.style.palette;
  return (
    <ParticleMorph
      text={p.text as string | undefined}
      path={p.path as string | undefined}
      from={p.from as ParticleTarget | undefined}
      font={ctx.style.fonts.display}
      form={form}
      explode={explode}
      fade={1 - 0.45 * (explode / 1.3)}
      turbulence={(p.turbulence as number) ?? 0.8}
      colorA={(p.colorA as string) ?? pal.accent}
      colorB={(p.colorB as string) ?? pal.accent2}
      orbit={((p.orbitFrom as number) ?? -0.3) + frame * ((p.orbitSpeed as number) ?? 0.004)}
      background={(p.background as string) ?? pal.bg}
      size={(p.size as number) ?? 30}
      count={(p.count as number) ?? 24000}
    />
  );
};

// ---------------- chrome ----------------
const ChromeBlock: React.FC<{ ctx: BlockCtx }> = ({ ctx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = ctx.scene.props ?? {};
  const pulse = beatPulse(frame + Math.round(ctx.sceneStartSec * fps), fps, ctx.kicks, 9);
  return <LiquidChrome pulse={pulse} amp={((p.amp as number) ?? 0.16) + 0.05 * pulse} tint={(p.tint as [number, number, number]) ?? [1, 1, 1]} iridescence={(p.iridescence as number) ?? 0.5} orbit={frame * 0.006} dist={(p.dist as number) ?? 6.8} lookY={(p.lookY as number) ?? 0} background={ctx.style.palette.bg} bloom={0.4} />;
};

// ---------------- type (background plate for kinetic type) ----------------
const TypeBlock: React.FC<{ ctx: BlockCtx }> = ({ ctx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = ctx.scene.props ?? {};
  const pal = ctx.style.palette;
  const pulse = beatPulse(frame + Math.round(ctx.sceneStartSec * fps), fps, ctx.kicks, 6);
  const bg = (p.background as string) ?? pal.bg;
  const f = useFormat();
  return (
    <AbsoluteFill style={{ background: bg }}>
      {p.grid ? (
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(${pal.accent}22 1px, transparent 1px), linear-gradient(90deg, ${pal.accent}22 1px, transparent 1px)`, backgroundSize: `${90 * f.u}px ${90 * f.u}px`, transform: `scale(${1 + pulse * 0.02})` }} />
      ) : null}
      {p.bars ? (
        <AbsoluteFill>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${(i / 6) * 100}%`, height: `${100 / 12}%`, background: i % 2 ? pal.accent : "transparent", opacity: 0.06 + pulse * 0.08, transform: `translateX(${((frame * (i % 2 ? 6 : -6)) % 200) - 100}px)` }} />
          ))}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------- montage (one cut per beat) ----------------
const MontageBlock: React.FC<{ ctx: BlockCtx }> = ({ ctx }) => {
  const frame = useCurrentFrame();
  const f = useFormat();
  const p = ctx.scene.props ?? {};
  const pal = ctx.style.palette;
  const words = (p.words as string[]) ?? ["One", "Two"];
  const per = Math.max(1, Math.round(((p.beatsPerCut as number) ?? 1) * ctx.fpb));
  const i = Math.min(words.length - 1, Math.floor(frame / per));
  const local = frame - i * per;
  const bgs = (p.backgrounds as string[]) ?? [pal.bg, pal.accent, pal.paper, pal.accent2];
  const bg = bgs[i % bgs.length];
  const fg = bg === pal.paper || bg === pal.accent ? pal.ink : pal.paper;
  const shapes = ((p.shapes as ShapeName[]) ?? ["circle", "star", "hexagon", "burst", "triangle", "diamond", "blob", "circle"]);
  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "absolute", opacity: 0.85, transform: `rotate(${frame * 1.2}deg)` }}>
        <MorphShape shapes={shapes} morphFrames={Math.max(4, per - 3)} holdFrames={3} fills={[bg === pal.accent2 ? pal.accent : pal.accent2, bg === pal.accent ? pal.paper : pal.accent]} size={760 * f.u} />
      </div>
      <div style={{ fontFamily: ctx.style.fonts.display, fontSize: ((p.size as number) ?? 190) * f.u, color: fg, textTransform: ctx.style.type.displayCase === "upper" ? "uppercase" : undefined, letterSpacing: ctx.style.type.tracking, WebkitTextStroke: `${14 * f.u}px ${bg}`, paintOrder: "stroke fill", transform: `translateY(${interpolate(local, [0, 5], [50 * f.u, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}px) scale(${interpolate(local, [0, 3, per], [1.1, 1, 0.97], clamp)})`, textAlign: "center", lineHeight: 0.9, padding: `0 ${f.safe.left}px` }}>
        {words[i]}
      </div>
    </AbsoluteFill>
  );
};

// ---------------- endcard ----------------
const EndcardBlock: React.FC<{ ctx: BlockCtx }> = ({ ctx }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const f = useFormat();
  const p = ctx.scene.props ?? {};
  const pal = ctx.style.palette;
  const withProduct = (p.withProduct as boolean) ?? true;
  const s = (d: number) => interpolate(frame, [d, d + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const P = PRODUCTS[ctx.spec.product];
  const lookY = P.focusY + P.height * 0.3; // aim above the product → it sits low in frame, leaving the top third for the lockup
  const cam = (p.camera as CameraMove) ?? { from: { orbit: 0.2, height: 1.2, lookY, lens: 50, fill: 0.31 }, to: { orbit: -0.1, height: 1.0, lookY, lens: 50, fill: 0.3 } };
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: pal.bg, opacity: fadeOut }}>
      {withProduct ? <ProductBlock ctx={{ ...ctx, scene: { ...ctx.scene, props: { ...p, camera: cam, motion: (p.motion as object) ?? { spin: 0.35 } } } }} /> : null}
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: f.safe.top + f.height * 0.05 }}>
        <div style={{ fontFamily: ctx.style.fonts.display, fontSize: ((p.logoSize as number) ?? 170) * f.u, color: (p.logoColor as string) ?? pal.paper, letterSpacing: ctx.style.type.tracking * 1.5, textTransform: ctx.style.type.displayCase === "upper" ? "uppercase" : undefined, opacity: s(2), transform: `translateY(${(1 - s(2)) * 30}px)`, lineHeight: 1, textShadow: "0 10px 50px rgba(0,0,0,0.35)" }}>{ctx.spec.brand.name}</div>
        <div style={{ height: 4 * f.u, width: 260 * f.u * s(8), background: pal.accent, margin: `${22 * f.u}px 0` }} />
        <div style={{ fontFamily: ctx.style.fonts.serif, fontSize: 56 * f.u, color: (p.taglineColor as string) ?? pal.paper, opacity: s(10), textAlign: "center", padding: `0 ${f.safe.left}px`, fontStyle: "italic" }}>{ctx.spec.brand.tagline}</div>
      </AbsoluteFill>
      {ctx.spec.brand.cta ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: f.safe.bottom + 30 * f.u }}>
          <div style={{ fontFamily: ctx.style.fonts.body, fontSize: 30 * f.u, letterSpacing: 5 * f.u, textTransform: "uppercase", color: pal.ink, background: pal.accent, padding: `${16 * f.u}px ${34 * f.u}px`, borderRadius: 999, opacity: s(18), transform: `scale(${0.9 + 0.1 * s(18)})` }}>{ctx.spec.brand.cta}</div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

export const BLOCKS: Record<SceneSpec["block"], React.FC<{ ctx: BlockCtx }>> = {
  product: ProductBlock, shader: ShaderBlock, particles: ParticlesBlock, chrome: ChromeBlock, type: TypeBlock, montage: MontageBlock, endcard: EndcardBlock,
};
