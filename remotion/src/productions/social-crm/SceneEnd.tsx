import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PostFX } from "../../three/PostFX";
import { AgentCore, CamRig, Env, Office, Phone, SunBeams, useHebrewFontReady, useLiveTexture } from "./parts";
import { drawPhoneScreen } from "./canvasUI";
import { C, frank, heebo } from "./theme";

const cl = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ================= S04 — THE PAYOFF (23–30 s) =================
const Notebook: React.FC = () => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 1100; c.height = 800;
    const x = c.getContext("2d")!;
    x.fillStyle = "#f7f1e4"; x.fillRect(0, 0, 1100, 800);
    x.strokeStyle = "rgba(90,120,160,0.25)"; x.lineWidth = 2; for (let y = 120; y < 800; y += 56) { x.beginPath(); x.moveTo(40, y); x.lineTo(1060, y); x.stroke(); }
    x.fillStyle = "#1e293b"; x.direction = "rtl"; x.textAlign = "right";
    x.font = `700 64px "${frank}"`; x.fillText("תוכנית צמיחה 2027", 1040, 100);
    x.font = `400 44px "${frank}"`;
    ["• סניף שני בחיפה", "• קורס טיפוח אונליין", "• שיתוף פעולה עם מעצבות"].forEach((l, i) => x.fillText(l, 1040, 210 + i * 64));
    // hand-sketched rising chart
    x.strokeStyle = "#15803d"; x.lineWidth = 7; x.lineCap = "round"; x.beginPath();
    [[120, 700], [260, 640], [380, 660], [520, 560], [660, 520], [800, 420], [960, 330]].forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
    x.beginPath(); x.moveTo(930, 320); x.lineTo(965, 328); x.lineTo(948, 362); x.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }, []);
  return (
    <group position={[-0.08, 0.012, 1.05]} rotation={[-Math.PI / 2, 0, 0.1]}>
      <mesh><boxGeometry args={[1.5, 1.1, 0.02]} /><meshStandardMaterial color="#e8dcc6" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.011]}><planeGeometry args={[1.48, 1.08]} /><meshStandardMaterial map={tex} roughness={0.9} color="#cfc6b8" /></mesh>
      <mesh position={[0.55, -0.3, 0.03]} rotation={[0, 0, 0.6]}><cylinderGeometry args={[0.018, 0.018, 0.75, 16]} /><meshPhysicalMaterial color="#111" metalness={0.6} roughness={0.3} /></mesh>
    </group>
  );
};

const Cup: React.FC<{ t: number }> = ({ t }) => {
  const prof = useMemo(() => [[0, 0], [0.2, 0], [0.24, 0.04], [0.26, 0.42], [0.24, 0.42], [0.22, 0.06], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)), []);
  return (
    <group position={[-0.62, 0, -1.3]}>
      <mesh><latheGeometry args={[prof, 64]} /><meshPhysicalMaterial color="#f3efe8" roughness={0.3} clearcoat={0.6} /></mesh>
      <mesh position={[0, 0.37, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.225, 48]} /><meshStandardMaterial color="#3b2416" roughness={0.2} /></mesh>
      {/* steam */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.sin(t * 0.8 + i) * 0.05, 0.62 + i * 0.16 + ((t * 0.12) % 0.16), 0]} scale={[0.12 + i * 0.03, 0.22, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.07 - i * 0.015} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

const PayoffInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { scene } = useThree();
  const day = interpolate(t, [1.6, 4.6], [0, 1], { ...cl, easing: Easing.inOut(Easing.sin) });
  const collapse = interpolate(t, [0, 0.9], [1, 0], { ...cl, easing: Easing.out(Easing.cubic) });
  const screenMode = t < 1.2 ? "chaos" : "calm";
  const phoneTex = useLiveTexture(720, 1540, (ctx, W, H) => drawPhoneScreen(ctx, W, H, screenMode as "chaos" | "calm", 0, `"${heebo}"`));
  // camera: starts tight on the phone (match from the collapse), then a calm dolly back and down along the desk
  const dolly = interpolate(t, [0.6, 7], [0, 1], { ...cl, easing: Easing.inOut(Easing.cubic) });
  // crane: from a tight high-angle on the calm phone screen up to the whole morning desk
  const camPos = V(0.22, 2.3, 0.25).lerp(V(0.15, 5.1, 2.9), dolly);
  const look = V(0.22, 0, -0.68).lerp(V(0.0, 0, 0.0), dolly);
  const bg = new THREE.Color(C.void).lerp(new THREE.Color("#e9d8bf"), day);
  scene.background = bg;
  return (
    <>
      <CamRig pos={camPos.toArray() as [number, number, number]} look={look.toArray() as [number, number, number]} fov={36} />
      <fog attach="fog" args={[bg.getHex(), 8, 24]} />
      <Env intensity={0.15 + day * 0.35} exposure={1 - day * 0.12} />
      <Office day={day} />
      {/* night → morning: cool rim fades, warm low sun rises through the window */}
      <directionalLight position={[2.5, 3, -6]} intensity={1.4 * (1 - day)} color="#7aa2ff" />
      <directionalLight position={[2.2, 3.4, -3.6]} intensity={1.8 * day} color="#ffcf8f" />
      <ambientLight intensity={0.1 + 0.22 * day} color="#ffe7c7" />
      <SunBeams amount={day} />
      <group position={[0.22, 0.05, -0.7]} rotation={[-Math.PI / 2, 0, 0.06]}>
        <Phone screen={phoneTex} glow={1 - day * 0.3} lit={false} />
      </group>
      {/* warm window-light patch falling across the desk */}
      <mesh position={[0.6, 0.004, -0.9]} rotation={[-Math.PI / 2, 0, -0.5]}>
        <planeGeometry args={[2.4, 4.2]} />
        <meshBasicMaterial color="#ffc27a" transparent opacity={0.16 * day} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Notebook />
      <Cup t={t} />
      {/* the last fragments of the world sinking into the phone */}
      {collapse > 0.01 ? <Fragments k={collapse} /> : null}
      <PostFX bloom={0.35} radius={0.5} threshold={0.85} dof={{ focus: camPos.distanceTo(look), aperture: 0.0014, maxblur: 0.01 }} />
    </>
  );
};

const Fragments: React.FC<{ k: number }> = ({ k }) => (
  <group position={[0.22, 0.3, -0.7]} rotation={[-Math.PI / 2, 0, 0]}>
    {Array.from({ length: 18 }, (_, i) => {
      const a = random(`fa${i}`) * Math.PI * 2;
      const r = k * (0.8 + random(`fr${i}`) * 2.2);
      return (
        <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * 1.3, k * (1 + random(`fz${i}`) * 2)]} rotation={[0, 0, a]} scale={[0.5 * k + 0.05, 0.012, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={C.emeraldGlow} transparent opacity={k} toneMapped={false} blending={THREE.AdditiveBlending} />
        </mesh>
      );
    })}
  </group>
);

export const ScenePayoff: React.FC = () => {
  const { width, height } = useVideoConfig();
  const ready = useHebrewFontReady();
  if (!ready) return null;
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 36, near: 0.05, far: 80 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <PayoffInner />
    </ThreeCanvas>
  );
};

// ================= S05 — BRAND REVEAL (30–35 s) =================
const BrandInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const logo = interpolate(t, [0.7, 1.9], [0, 1], { ...cl, easing: Easing.inOut(Easing.cubic) });
  const lift = interpolate(t, [1.8, 2.55], [0, 1], { ...cl, easing: Easing.inOut(Easing.cubic) });
  const camPos = V(Math.sin((1 - logo) * 0.5) * 6.2, 0.15 * (1 - logo), Math.cos((1 - logo) * 0.5) * 6.2 - logo * 0.6);
  return (
    <>
      <CamRig pos={camPos.toArray() as [number, number, number]} look={[0, lift * -0.45, 0]} fov={30} />
      <color attach="background" args={[C.void]} />
      <Env intensity={0.3} />
      <directionalLight position={[3, 4, 5]} intensity={0.55} />
      <spotLight position={[-3, 2, -3]} angle={0.6} penumbra={0.5} intensity={60} color={C.emerald} />
      <group position={[0, 0.3 * lift, 0]} scale={1 - lift * 0.5}>
        <AgentCore form={1} logo={logo} pulse={interpolate(t, [0, 0.4], [1, 0], cl)} scale={0.62} glow={1.1 - logo * 0.6} />
      </group>
      <GlintSweep t={t} />
      <PostFX bloom={0.6} radius={0.45} threshold={0.75} />
    </>
  );
};

/** A diagonal light sweep across the finished icon (the "premium" glint). */
const GlintSweep: React.FC<{ t: number }> = ({ t }) => {
  const p = interpolate(t, [2.6, 3.3], [-0.3, 0.3], cl);
  if (t < 2.6 || t > 3.3) return null;
  return (
    <mesh position={[p, 0.3, 0.4]} rotation={[0, 0, -0.55]}>
      <planeGeometry args={[0.035, 0.5]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.45 * Math.sin(((t - 2.6) / 0.7) * Math.PI)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

export const SceneBrand: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 30, near: 0.05, far: 80 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <BrandInner />
    </ThreeCanvas>
  );
};
