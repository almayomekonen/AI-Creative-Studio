import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

/**
 * Procedural product library. Each product is built from code (lathe profiles, primitives, canvas-drawn graphics),
 * sits on y=0, is ~2.5–3 units tall and faces +z. Add a product = add a builder here + a ProductKind entry.
 */
export type ProductKind = "flacon" | "prism" | "can" | "jar" | "watch";
export type ProductBrand = { name: string; sub?: string; colorA: string; colorB: string; ink: string; fontDisplay: string; fontBody: string };

const v2 = (pts: number[][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));

const canvasTex = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = THREE.RepeatWrapping;
  return t;
};

// ---------- materials ----------
const useGlass = (tint = "#ffffff", rough = 0.04) =>
  useMemo(() => new THREE.MeshPhysicalMaterial({ color: tint, roughness: rough, transmission: 1, thickness: 0.6, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4, specularIntensity: 1 }), [tint, rough]);
const useMetal = (color: string, rough = 0.22) => useMemo(() => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough, clearcoat: 0.6 }), [color, rough]);

// ---------- FLACON (heavy-based perfume) ----------
const Flacon: React.FC<{ brand: ProductBrand }> = ({ brand }) => {
  const glass = useGlass();
  const juice = useMemo(() => new THREE.MeshPhysicalMaterial({ color: brand.colorA, roughness: 0.08, clearcoat: 1, emissive: new THREE.Color(brand.colorA), emissiveIntensity: 0.12 }), [brand.colorA]);
  const metal = useMetal(brand.colorB);
  const label = useMemo(() => canvasTex(1024, 512, (ctx) => {
    ctx.fillStyle = "#efe6d8"; ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = brand.ink; ctx.lineWidth = 3; ctx.strokeRect(40, 40, 944, 432);
    ctx.fillStyle = brand.ink; ctx.textAlign = "center";
    ctx.font = `150px "${brand.fontDisplay}"`; ctx.fillText(brand.name, 512, 270);
    ctx.font = `600 34px "${brand.fontBody}"`; ctx.fillText((brand.sub ?? "").toUpperCase().split("").join(" "), 512, 350);
  }), [brand]);
  const labelMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: label, color: "#b9b4ad", roughness: 0.6, envMapIntensity: 0.4 }), [label]);
  return (
    <group>
      <mesh material={glass}><latheGeometry args={[v2([[0, 0], [0.78, 0], [0.86, 0.04], [0.9, 0.14], [0.9, 1.62], [0.86, 1.74], [0.7, 1.84], [0.34, 1.9], [0.26, 1.96], [0.26, 2.06], [0, 2.06]]), 128]} /></mesh>
      <mesh material={juice}><latheGeometry args={[v2([[0, 0.16], [0.8, 0.16], [0.82, 0.2], [0.82, 1.32], [0, 1.32]]), 96]} /></mesh>
      <mesh material={labelMat} position={[0, 0.82, 0]}><cylinderGeometry args={[0.905, 0.905, 0.62, 96, 1, true, -0.87, 1.74]} /></mesh>
      <mesh material={metal} position={[0, 2.38, 0]}><cylinderGeometry args={[0.42, 0.46, 0.62, 8]} /></mesh>
      <mesh material={metal} position={[0, 2.07, 0]}><cylinderGeometry args={[0.3, 0.3, 0.06, 48]} /></mesh>
    </group>
  );
};

// ---------- PRISM (tall hexagonal fragrance with pearl stopper) ----------
const Prism: React.FC<{ brand: ProductBrand }> = ({ brand }) => {
  const glass = useGlass("#f3e9ff", 0.02);
  // liquid is opaque-glossy: three.js can't show a transmissive object through another transmissive one
  const juice = useMemo(() => new THREE.MeshPhysicalMaterial({ color: brand.colorA, roughness: 0.08, clearcoat: 1, emissive: new THREE.Color(brand.colorA), emissiveIntensity: 0.25 }), [brand.colorA]);
  const pearl = useMemo(() => new THREE.MeshPhysicalMaterial({ color: brand.colorB, roughness: 0.15, metalness: 0.1, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 800], clearcoat: 1, sheen: 1, sheenColor: new THREE.Color("#ffffff") }), [brand.colorB]);
  const engrave = useMemo(() => canvasTex(512, 1024, (ctx) => {
    ctx.clearRect(0, 0, 512, 1024);
    ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.textAlign = "center";
    ctx.save(); ctx.translate(256, 512); ctx.rotate(-Math.PI / 2);
    ctx.font = `italic 140px "${brand.fontDisplay}"`; ctx.fillText(brand.name, 0, 40); ctx.restore();
  }), [brand]);
  return (
    <group>
      <mesh material={glass}><latheGeometry args={[v2([[0, 0], [0.6, 0], [0.66, 0.05], [0.66, 2.3], [0.6, 2.42], [0.24, 2.5], [0.2, 2.62], [0, 2.62]]), 6]} /></mesh>
      <mesh material={juice}><latheGeometry args={[v2([[0, 0.1], [0.56, 0.1], [0.58, 0.14], [0.58, 1.75], [0, 1.75]]), 6]} /></mesh>
      <mesh position={[0, 1.25, 0.575]}><planeGeometry args={[0.55, 1.6]} /><meshBasicMaterial map={engrave} transparent depthWrite={false} toneMapped={false} /></mesh>
      <mesh material={pearl} position={[0, 3.05, 0]}><sphereGeometry args={[0.46, 64, 64]} /></mesh>
    </group>
  );
};

// ---------- CAN (330 ml slim) ----------
const Can: React.FC<{ brand: ProductBrand }> = ({ brand }) => {
  const alu = useMetal("#d8dade", 0.28);
  const wrap = useMemo(() => canvasTex(2048, 1024, (ctx) => {
    ctx.fillStyle = brand.colorB; ctx.fillRect(0, 0, 2048, 1024);
    // diagonal energy stripes
    ctx.fillStyle = brand.colorA;
    for (let i = -4; i < 14; i++) { ctx.beginPath(); ctx.moveTo(i * 180, 1024); ctx.lineTo(i * 180 + 90, 1024); ctx.lineTo(i * 180 + 420, 0); ctx.lineTo(i * 180 + 330, 0); ctx.fill(); }
    ctx.fillStyle = brand.colorB; ctx.fillRect(560, 140, 930, 744);
    ctx.fillStyle = brand.colorA; ctx.textAlign = "center";
    ctx.save(); ctx.translate(1024, 512); ctx.rotate(-Math.PI / 2);
    ctx.font = `330px "${brand.fontDisplay}"`; ctx.fillText(brand.name, 0, 115); ctx.restore();
    ctx.font = `700 46px "${brand.fontBody}"`; ctx.fillStyle = brand.ink === brand.colorB ? "#fff" : brand.ink;
    ctx.fillText((brand.sub ?? "").toUpperCase(), 1024 + 330, 960);
  }), [brand]);
  wrap.offset.x = 0.5; // bring the logo panel (texture centre) round to face the camera (+z)
  const wrapMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: wrap, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }), [wrap]);
  return (
    <group>
      <mesh material={alu}><latheGeometry args={[v2([[0, 0.02], [0.48, 0], [0.58, 0.07], [0.62, 0.2], [0.62, 2.32], [0.53, 2.5], [0.5, 2.56], [0.47, 2.58], [0, 2.54]]), 96]} /></mesh>
      <mesh material={wrapMat} position={[0, 1.26, 0]}><cylinderGeometry args={[0.623, 0.623, 2.1, 128, 1, true]} /></mesh>
      {/* ring-pull: flattened torus loop + tongue + rivet */}
      <mesh material={alu} position={[0.0, 2.585, 0.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.35, 0.35]}><torusGeometry args={[0.12, 0.035, 12, 40]} /></mesh>
      <mesh material={alu} position={[0, 2.582, 0.04]}><boxGeometry args={[0.13, 0.018, 0.16]} /></mesh>
      <mesh material={alu} position={[0, 2.59, 0.0]}><cylinderGeometry args={[0.035, 0.035, 0.025, 20]} /></mesh>
      <mesh material={alu} position={[0, 2.565, -0.22]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.16, 32]} /></mesh>
    </group>
  );
};

// ---------- JAR (skincare) ----------
const Jar: React.FC<{ brand: ProductBrand }> = ({ brand }) => {
  const frosted = useGlass("#ffffff", 0.32);
  const cream = useMemo(() => new THREE.MeshPhysicalMaterial({ color: brand.colorA, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color("#ffffff") }), [brand.colorA]);
  const lid = useMetal(brand.colorB, 0.18);
  return (
    <group scale={1.25}>
      <mesh material={frosted}><latheGeometry args={[v2([[0, 0], [0.95, 0], [1.02, 0.08], [1.04, 0.9], [0.98, 1.0], [0.9, 1.0], [0.9, 1.12], [0, 1.12]]), 96]} /></mesh>
      <mesh material={cream} position={[0, 0.5, 0]}><cylinderGeometry args={[0.8, 0.8, 0.75, 64]} /></mesh>
      <mesh material={lid} position={[0, 1.33, 0]}><cylinderGeometry args={[1.0, 1.0, 0.44, 96]} /></mesh>
    </group>
  );
};

// ---------- WATCH (dial animates with real time from the frame) ----------
const Watch: React.FC<{ brand: ProductBrand }> = ({ brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const steel = useMetal("#cfd2d6", 0.18);
  const strap = useMemo(() => new THREE.MeshPhysicalMaterial({ color: brand.ink, roughness: 0.75, sheen: 0.4 }), [brand.ink]);
  const crystal = useGlass("#ffffff", 0.0);
  const { tex, ctx } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { tex: t, ctx: c.getContext("2d")! };
  }, []);
  // Swiss-railway dial redrawn every frame — seconds hand driven by the frame (deterministic).
  const sec = (frame / fps) * 1;
  ctx.fillStyle = brand.colorB; ctx.fillRect(0, 0, 1024, 1024);
  ctx.save(); ctx.translate(512, 512);
  for (let i = 0; i < 60; i++) {
    ctx.save(); ctx.rotate((i / 60) * Math.PI * 2);
    ctx.fillStyle = brand.ink; const big = i % 5 === 0;
    ctx.fillRect(-(big ? 14 : 5), -470, big ? 28 : 10, big ? 110 : 34);
    ctx.restore();
  }
  ctx.fillStyle = brand.ink; ctx.textAlign = "center"; ctx.font = `700 54px "${brand.fontBody}"`; ctx.fillText(brand.name.toUpperCase(), 0, -150);
  const hand = (angle: number, len: number, w: number, col: string) => { ctx.save(); ctx.rotate(angle); ctx.fillStyle = col; ctx.fillRect(-w / 2, -len, w, len + 80); ctx.restore(); };
  hand(((10 + sec / 3600) / 12) * Math.PI * 2, 270, 34, brand.ink);
  hand(((8 + sec / 60) / 60) * Math.PI * 2, 400, 26, brand.ink);
  const s = (Math.floor(sec * 4) / 4 / 60) * Math.PI * 2 * 4; // ticking second hand, 4 steps/s, sped ×4 for drama
  ctx.save(); ctx.rotate(s); ctx.fillStyle = brand.colorA; ctx.fillRect(-7, -330, 14, 450); ctx.beginPath(); ctx.arc(0, -330, 44, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fillStyle = brand.colorA; ctx.fill();
  ctx.restore();
  tex.needsUpdate = true;
  return (
    <group position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={steel}><cylinderGeometry args={[0.95, 0.95, 0.3, 96]} /></mesh>
      <mesh material={steel} position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.92, 0.06, 24, 96]} /></mesh>
      <mesh position={[0, 0.151, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.86, 96]} /><meshPhysicalMaterial map={tex} roughness={0.5} /></mesh>
      <mesh material={crystal} position={[0, 0.2, 0]}><cylinderGeometry args={[0.88, 0.88, 0.04, 96]} /></mesh>
      <mesh material={steel} position={[1.0, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.14, 24]} /></mesh>
      <mesh material={strap} position={[0, -0.02, 1.3]}><boxGeometry args={[0.95, 0.12, 0.9]} /></mesh>
      <mesh material={strap} position={[0, -0.02, -1.3]}><boxGeometry args={[0.95, 0.12, 0.9]} /></mesh>
    </group>
  );
};

/** width/height are world-unit bounds (used by fitDistance for aspect-correct framing). */
export const PRODUCTS: Record<ProductKind, { C: React.FC<{ brand: ProductBrand }>; width: number; height: number; focusY: number }> = {
  flacon: { C: Flacon, width: 1.8, height: 2.7, focusY: 1.25 },
  prism: { C: Prism, width: 1.35, height: 3.5, focusY: 1.7 },
  can: { C: Can, width: 1.25, height: 2.6, focusY: 1.3 },
  jar: { C: Jar, width: 2.6, height: 2.0, focusY: 0.95 },
  watch: { C: Watch, width: 2.0, height: 3.5, focusY: 1.4 }, // height includes the strap stubs
};

export const Product: React.FC<{ kind: ProductKind; brand: ProductBrand }> = ({ kind, brand }) => {
  const P = PRODUCTS[kind].C;
  return <P brand={brand} />;
};
