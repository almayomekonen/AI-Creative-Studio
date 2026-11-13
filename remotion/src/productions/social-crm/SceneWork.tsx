import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { PostFX } from "../../three/PostFX";
import { AgentCore, Card, CamRig, Env, useHebrewFontReady, useLiveTexture } from "./parts";
import { bubble, drawApproval, drawCalendar, drawChat, drawInsight, drawQuote, drawReceipt, drawSlot, rr } from "./canvasUI";
import { BIZ, C, heebo } from "./theme";

const cl = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const F = `"${heebo}"`;

/** Station positions along the journey (one continuous world). */
export const ST = { A: V(0, 0, 0), B: V(3.4, 0.3, -6), C: V(0, 0.6, -12), D: V(-3.4, 0.2, -18), E: V(0, 0, -24) };
/** Camera distance that frames a 2.3-tall slab at fov 34 in 9:16 — also the arrival's final framing (match cut). */
export const SLAB_DIST = 4.8;
const FOV = 34;
// [arrive, leave] travel windows (seconds, local)
const TRAVEL: [number, number, keyof typeof ST, keyof typeof ST][] = [[2.35, 2.95, "A", "B"], [4.85, 5.45, "B", "C"], [7.35, 7.95, "C", "D"], [9.85, 10.5, "D", "E"]];

const viewOf = (k: keyof typeof ST, t: number) => {
  const s = ST[k];
  const orbit = { A: -0.05 - t * 0.07, B: 0.12, C: -0.1, D: 0.14, E: 0 }[k];
  const d = { A: SLAB_DIST, B: 5.3, C: 5.4, D: 5.3, E: 6.6 }[k];
  return { pos: V(s.x + Math.sin(orbit) * d, s.y + 0.55, s.z + Math.cos(orbit) * d), look: s.clone().add(V(0, 0.42, 0)) };
};

const smooth = Easing.bezier(0.65, 0, 0.35, 1);

const Inner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- camera along the station path ----------
  let from: keyof typeof ST = "A", to: keyof typeof ST = "A", k = 0;
  for (const [a, b, s0, s1] of TRAVEL) {
    if (t >= b) { from = s1; to = s1; k = 0; }
    else if (t >= a) { from = s0; to = s1; k = smooth((t - a) / (b - a)); break; }
    else break;
  }
  const va = viewOf(from, t), vb = viewOf(to, t);
  const camPos = va.pos.clone().lerp(vb.pos, k);
  camPos.y += Math.sin(k * Math.PI) * 0.6; // arc between stations = camera travel with lift
  const look = va.look.clone().lerp(vb.look, k);
  // E: pull back to reveal the field, then push to the cluster
  if (t > 10.5) { const e = interpolate(t, [10.5, 12.4], [0, 1], { ...cl, easing: smooth }); camPos.z -= e * 2.0; camPos.y -= e * 0.25; }
  // collapse: the whole world rushes into a single point in front of camera
  const collapse = interpolate(t, [12.55, 13.0], [0, 1], { ...cl, easing: Easing.in(Easing.cubic) });

  // ---------- textures (story-specific, animated) ----------
  const tA = t, tB = t - 2.6, tC = t - 5.1, tD = t - 7.6;
  const chat = useLiveTexture(720, 1440, (ctx, W, H) => drawChat(ctx, W, H, Math.min(tA + 0.2, 2.2), F));
  const carrier = useLiveTexture(760, 260, (ctx, W, H) => { ctx.clearRect(0, 0, W, H); bubble(ctx, { text: `היי ${BIZ.leadShort}! ${BIZ.service} מלא ${BIZ.price}, כשעה.`, side: "out", y: 20, W, font: F, time: "21:47", tick: true }); }, true);
  const quote = useLiveTexture(900, 1270, (ctx, W, H) => drawQuote(ctx, W, H, interpolate(tB, [0.1, 1.3], [0, 1], cl), interpolate(tB, [1.95, 2.25], [0, 1], cl), F));
  const pressB = interpolate(tB, [1.6, 1.7], [0, 1], cl);
  const chipB = useLiveTexture(900, 290, (ctx, W, H) => drawApproval(ctx, W, H, `לשלוח את הצעת המחיר ל${BIZ.leadShort}?`, `${BIZ.quoteItem} · ${BIZ.quoteTotal}`, pressB, F), true);
  const cal = useLiveTexture(900, 1300, (ctx, W, H) => drawCalendar(ctx, W, H, interpolate(tC, [0.3, 0.6], [0, 1], cl), interpolate(tC, [1.5, 1.6], [0, 1], cl), F));
  const confirmC = interpolate(tC, [1.5, 1.6], [0, 1], cl);
  const slot = useLiveTexture(700, 190, (ctx, W, H) => drawSlot(ctx, W, H, confirmC, F), true);
  const chipC = useLiveTexture(900, 290, (ctx, W, H) => drawApproval(ctx, W, H, "לקבוע את התור?", `${BIZ.lead} · ${BIZ.slot}`, confirmC, F), true);
  const pressD = interpolate(tD, [1.45, 1.55], [0, 1], cl);
  const receipt = useLiveTexture(660, 1200, (ctx, W, H) => drawReceipt(ctx, W, H, F, pressD), false);
  const chipD = useLiveTexture(900, 290, (ctx, W, H) => drawApproval(ctx, W, H, `להפיק קבלה ולשלוח ל${BIZ.leadShort}?`, `${BIZ.service} · ${BIZ.price}`, pressD, F), true);
  const insight = useLiveTexture(900, 450, (ctx, W, H) => drawInsight(ctx, W, H, F, interpolate(t, [12.0, 12.1], [0, 1], cl)), true);

  // ---------- object states ----------
  // A → B: the agent's reply lifts off and becomes the quote
  const lift = interpolate(t, [2.0, 2.75], [0, 1], { ...cl, easing: smooth });
  const carrierPos = V(0.12, -0.18, 0.08).add(ST.A).lerp(ST.B.clone().add(V(0, 0, 0.05)), lift);
  carrierPos.y += Math.sin(lift * Math.PI) * 0.9;
  const docIn = interpolate(tB, [0.05, 0.45], [0, 1], { ...cl, easing: Easing.out(Easing.back(1.2)) });
  // B → C: approved quote shrinks and flies into Thursday 10:00
  const toSlot = interpolate(t, [4.75, 5.35], [0, 1], { ...cl, easing: smooth });
  const slotHome = ST.C.clone().add(V(-0.52, 0.42, 0.06));
  const docPos = ST.B.clone().lerp(slotHome, toSlot);
  const docScale = THREE.MathUtils.lerp(1, 0.12, toSlot) * docIn;
  // C: slot rises out of the grid
  const rise = interpolate(tC, [0.35, 0.8], [0, 1], { ...cl, easing: Easing.out(Easing.back(1.6)) });
  // C → D: slot flips and becomes the receipt
  const flip = interpolate(t, [7.25, 7.85], [0, 1], { ...cl, easing: smooth });
  const slotPos = slotHome.clone().add(V(0.52 * rise, -0.05 * rise, 0.45 * rise)).lerp(ST.D.clone().add(V(0, 1.05, 0.12)), flip);
  const printLen = interpolate(tD, [0.25, 1.25], [0, 1], { ...cl, easing: Easing.inOut(Easing.quad) });
  // D → E: receipt dissolves into data
  const dissolve = interpolate(t, [9.8, 10.6], [0, 1], { ...cl, easing: smooth });
  const highlight = interpolate(t, [10.9, 11.4], [0, 1], cl);
  const insightIn = interpolate(t, [11.2, 11.6], [0, 1], { ...cl, easing: Easing.out(Easing.back(1.3)) });

  // agent guide orb: leads the camera, hovers top-left of each station
  const guide = va.look.clone().lerp(vb.look, Math.min(1, k * 1.25)).add(V(-0.7, -0.05, 0.75));
  guide.y += Math.sin(t * 2.2) * 0.05;

  const world = (1 - collapse);
  // collapse centre: a point 2.5 units in front of the lens (where the phone appears in the next scene)
  const centre = camPos.clone().add(look.clone().sub(camPos).normalize().multiplyScalar(2.5));
  return (
    <>
      <CamRig pos={camPos.toArray() as [number, number, number]} look={look.toArray() as [number, number, number]} fov={FOV} />
      <color attach="background" args={[C.void]} />
      <fog attach="fog" args={[C.void, 7, 26]} />
      <Env intensity={0.45} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[2, 4, 5]} intensity={1.2} color="#ffffff" />
      <SpaceDust t={t} />
      <group scale={world} position={centre.clone().multiplyScalar(1 - world).toArray() as [number, number, number]}>
        {/* A — conversations */}
        {t < 3.0 ? <group position={ST.A}><Card w={1.15} h={2.3} tex={chat} glass /></group> : null}
        {lift > 0 && lift < 1 ? <group position={carrierPos} scale={0.7 + lift * 0.5} rotation={[0, lift * 0.6, lift * -0.2]}><mesh><planeGeometry args={[1.1, 0.376]} /><meshBasicMaterial map={carrier} transparent toneMapped={false} side={THREE.DoubleSide} /></mesh></group> : null}
        {/* B — quote + approval */}
        {docIn > 0 && toSlot < 1 ? (
          <group position={docPos} scale={docScale} rotation={[0, -0.12 + toSlot * 0.12, 0]}><Card w={1.5} h={2.12} tex={quote} emissive={0.8} /></group>
        ) : null}
        {tB > 1.15 && t < 4.8 ? <group position={ST.B.clone().add(V(0, -0.62, 0.45))} scale={interpolate(tB, [1.15, 1.4], [0.6, 1], { ...cl, easing: Easing.out(Easing.back(1.5)) })}><Card w={1.35} h={0.435} tex={chipB} glass /></group> : null}
        {/* C — calendar + slot + approval */}
        {t > 4.9 && t < 7.9 ? <group position={ST.C}><Card w={1.5} h={2.17} tex={cal} glass /></group> : null}
        {t > 5.3 && t < 9.9 ? (
          <group position={slotPos} scale={THREE.MathUtils.lerp(0.3, 1, Math.max(rise, flip))} rotation={[0, flip * Math.PI, 0]}>
            {flip < 0.5 ? <Card w={1.2} h={0.326} tex={slot} depth={0.06} /> : <PrinterHead />}
          </group>
        ) : null}
        {tC > 1.0 && t < 7.4 ? <group position={ST.C.clone().add(V(0, -0.66, 0.45))} scale={interpolate(tC, [1.0, 1.25], [0.6, 1], { ...cl, easing: Easing.out(Easing.back(1.5)) })}><Card w={1.35} h={0.435} tex={chipC} glass /></group> : null}
        {/* D — receipt prints out of the flipped slot */}
        {tD > 0 && dissolve < 1 ? (
          <group position={ST.D.clone().add(V(0, 1.05 - printLen * 1.0, 0.1))}>
            <ReceiptPaper tex={receipt} len={printLen} fade={1 - dissolve} />
          </group>
        ) : null}
        {tD > 1.1 && t < 9.9 ? <group position={ST.D.clone().add(V(0, -0.62, 0.5))} scale={interpolate(tD, [1.1, 1.35], [0.6, 1], { ...cl, easing: Easing.out(Easing.back(1.5)) })}><Card w={1.35} h={0.435} tex={chipD} glass /></group> : null}
        {/* D → E — data */}
        {t > 9.75 ? <DataField t={t} dissolve={dissolve} highlight={highlight} /> : null}
        {insightIn > 0 ? <group position={ST.E.clone().add(V(0, -0.12, 0.9))} scale={insightIn}><Card w={1.28} h={0.64} tex={insight} glass /></group> : null}
        {/* the agent, guiding */}
        <group position={guide}><AgentCore scale={0.12} form={1} nodes={0.7} glow={1.0} /></group>
        <pointLight position={guide} color={C.emerald} intensity={5} distance={5} />
      </group>
      <PostFX bloom={0.4} radius={0.4} threshold={0.9} dof={{ focus: camPos.distanceTo(look), aperture: 0.0012, maxblur: 0.01 }} />
    </>
  );
};

const PrinterHead: React.FC = () => (
  <mesh><boxGeometry args={[1.25, 0.16, 0.22]} /><meshPhysicalMaterial color="#14532d" metalness={0.4} roughness={0.25} clearcoat={1} emissive={C.emerald} emissiveIntensity={0.15} /></mesh>
);

/** Receipt paper emerging from the printer head: the plane is cropped (not squashed) by moving UVs. */
const ReceiptPaper: React.FC<{ tex: THREE.Texture; len: number; fade: number }> = ({ tex, len, fade }) => {
  const H = 2.0 * Math.max(0.001, len);
  tex.repeat.set(1, Math.max(0.001, len));
  tex.offset.set(0, 1 - Math.max(0.001, len));
  return (
    <mesh position={[0, 1.0 - H / 2 - 0.0, 0]}>
      <planeGeometry args={[1.1, H]} />
      <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={fade} color={new THREE.Color(0.8, 0.8, 0.8)} />
    </mesh>
  );
};

/** Customers as data: particles leave the receipt and settle into a field; a cluster lights up = the opportunity. */
const DataField: React.FC<{ t: number; dissolve: number; highlight: number }> = ({ t, dissolve, highlight }) => {
  const cols = 12, rows = 17, n = cols * rows;
  const HL = useMemo(() => new Set([65, 66, 67, 77, 78, 79, 90, 91]), []); // a cluster mid-field, clear of the title and the card
  const { geo, start, end } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const s = new Float32Array(n * 3), e = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      s[i * 3] = ST.D.x + (random(`sx${i}`) - 0.5) * 1.1; s[i * 3 + 1] = ST.D.y + (random(`sy${i}`) - 0.5) * 2.0; s[i * 3 + 2] = ST.D.z + 0.1;
      const cx = i % cols, cy = Math.floor(i / cols);
      e[i * 3] = ST.E.x + (cx - (cols - 1) / 2) * 0.17; e[i * 3 + 1] = ST.E.y + 0.35 + ((rows - 1) / 2 - cy) * 0.15; e[i * 3 + 2] = ST.E.z + (random(`ez${i}`) - 0.5) * 0.1;
      const col = new THREE.Color(C.slate); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return { geo: g, start: s, end: e };
  }, [n]);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colA = geo.getAttribute("color") as THREE.BufferAttribute;
  const em = new THREE.Color(C.emeraldGlow), sl = new THREE.Color(C.slate);
  for (let i = 0; i < n; i++) {
    const kk = Math.max(0, Math.min(1, dissolve * 1.6 - random(`st${i}`) * 0.6));
    const e2 = kk * kk * (3 - 2 * kk);
    pos.setXYZ(i, THREE.MathUtils.lerp(start[i * 3], end[i * 3], e2), THREE.MathUtils.lerp(start[i * 3 + 1], end[i * 3 + 1], e2) + Math.sin(e2 * Math.PI) * 0.6, THREE.MathUtils.lerp(start[i * 3 + 2], end[i * 3 + 2], e2));
    const c = HL.has(i) ? sl.clone().lerp(em, highlight) : sl.clone().multiplyScalar(1 - highlight * 0.45);
    colA.setXYZ(i, c.r, c.g, c.b);
  }
  pos.needsUpdate = true; colA.needsUpdate = true;
  const ring = interpolate(t, [10.9, 11.9], [0, 1], cl);
  // ring centred on the highlighted cluster (mean grid position of HL indices)
  const hlc = [...HL].reduce((acc, i) => [acc[0] + (i % cols), acc[1] + Math.floor(i / cols)], [0, 0]).map((v) => v / HL.size);
  const hc = ST.E.clone().add(V((hlc[0] - (cols - 1) / 2) * 0.17, 0.35 + ((rows - 1) / 2 - hlc[1]) * 0.15, 0.05));
  return (
    <group>
      {/* frustumCulled=false: positions move far from where the bounding sphere was first computed */}
      <points geometry={geo} frustumCulled={false}><pointsMaterial size={0.085} vertexColors transparent depthWrite={false} toneMapped={false} sizeAttenuation /></points>
      {highlight > 0 ? (
        <mesh position={hc} scale={0.3 + ring * 0.08}>
          <ringGeometry args={[0.95, 1.0, 64]} />
          <meshBasicMaterial color={C.emeraldGlow} transparent opacity={0.9 * (1 - ring * 0.4) * highlight} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};

/** Deep-space dust for parallax during camera travel. */
const SpaceDust: React.FC<{ t: number }> = () => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 900, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = (random(`dx${i}`) - 0.5) * 22; p[i * 3 + 1] = (random(`dy${i}`) - 0.5) * 14; p[i * 3 + 2] = 6 - random(`dz${i}`) * 38; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  return <points geometry={geo}><pointsMaterial size={0.025} color="#4ade80" transparent opacity={0.35} depthWrite={false} /></points>;
};

/** 10–23 s: THE POWER — five capabilities as one continuous journey; each object becomes the next. */
export const SceneWork: React.FC = () => {
  const { width, height } = useVideoConfig();
  const ready = useHebrewFontReady();
  if (!ready) return null;
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: FOV, near: 0.05, far: 80 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <Inner />
    </ThreeCanvas>
  );
};

export { rr };
