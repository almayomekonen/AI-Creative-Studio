import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PostFX } from "../../three/PostFX";
import { AgentCore, Card, CamRig, Env, Office, Phone, useHebrewFontReady, useLiveTexture } from "./parts";
import { SWARM_MESSAGES, drawChat, drawPhoneScreen, drawSwarmBubble } from "./canvasUI";
import { C, heebo } from "./theme";

const cl = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const PHONE = new THREE.Vector3(0, 1.08, 0);
/** Where all messages converge and the agent is born. */
const BIRTH = new THREE.Vector3(0, 1.1, 0.9);
export type HookVariant = "swarm" | "push";

const N = 56;

/** The swarm: Hebrew WhatsApp messages as dimensional objects. Positions are pure functions of time. */
const Swarm: React.FC<{ t: number; hook: HookVariant; cam: THREE.Vector3 }> = ({ t, hook, cam }) => {
  const textures = useMemo(() => SWARM_MESSAGES.map(([n, m]) => {
    const c = document.createElement("canvas"); c.width = 640; c.height = 170;
    drawSwarmBubble(c.getContext("2d")!, 640, 170, n, m, `"${heebo}"`);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
  }), []);
  const mats = useMemo(() => textures.map((tx) => new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide })), [textures]);
  const conv = interpolate(t, [5.0, 6.0], [0, 1], { ...cl, easing: Easing.in(Easing.cubic) }); // converge into BIRTH
  return (
    <group>
      {Array.from({ length: N }, (_, i) => {
        const r = (k: string) => random(`${k}${i}`);
        const born = hook === "swarm" ? (i < 26 ? -1 : 1.2 + r("b") * 3.0) : 0.25 + r("b") * 3.8; // swarm-first: 26 already in flight at frame 0
        const life = t - born;
        if (life < 0 && born >= 0) return null;
        // trajectory: from the phone screen, outward on a spiral that wraps around the camera path
        const ang = r("a") * Math.PI * 2 + life * (0.6 + r("s") * 0.8);
        const rad = 0.6 + Math.min(3.2, life * (1.1 + r("v") * 1.2));
        let p: THREE.Vector3;
        if (born < 0) {
          // pre-existing storm (hook): rushing at the lens from depth
          // storm tube around the lens axis: big, close, fast — frame 0 is already full
          const span = 14;
          const z = cam.z - span + ((r("z") * span + t * (11 + r("v") * 8)) % span);
          const rr0 = 0.22 + r("rr") * 1.25;
          p = new THREE.Vector3(Math.cos(ang) * rr0 * 0.75, 1.1 + Math.sin(ang) * rr0 * 1.35, z);
          // part like a curtain at 1.0–1.6 s to reveal the phone
          const part = interpolate(t, [0.9, 1.7], [0, 1], { ...cl, easing: Easing.in(Easing.quad) });
          p.x += Math.sign(p.x || 1) * part * 5; p.y += (p.y - 1.1) * part * 1.5;
        } else {
          const toward = Math.min(1, life / 3.5);
          p = new THREE.Vector3(Math.cos(ang) * rad, PHONE.y + Math.sin(ang) * rad * 0.75, PHONE.z + 0.2 + toward * (cam.z - 0.8) * (0.4 + r("d") * 0.5));
        }
        p.lerp(BIRTH, conv);
        const s = (born < 0 ? 0.55 + r("sz") * 0.4 : 0.62 + r("sz") * 0.35) * (1 - conv * 0.92) * Math.min(1, (life + 1) * 4);
        if (s <= 0.01) return null;
        return (
          <mesh key={i} position={p} scale={[s * 1.3, s * 0.345, 1]} material={mats[i % mats.length]} quaternion={new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(p, cam, new THREE.Vector3(0, 1, 0))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI))}><planeGeometry args={[1, 1]} /></mesh>
        );
      })}
    </group>
  );
};

const Inner: React.FC<{ hook: HookVariant }> = ({ hook }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { camera } = useThree();
  // ---------- camera choreography ----------
  // CHAOS: aggressive macro push-in (with handheld energy); ARRIVAL: pull back to frame the birth, then push to the interface.
  const pushStart = hook === "swarm" ? 1.0 : 0.25;
  const push = interpolate(t, [pushStart, 4.7], [0, 1], { ...cl, easing: Easing.bezier(0.55, 0, 0.75, 0.9) });
  const zChaos = hook === "swarm" ? 9.5 - push * 7.7 : 8.5 - push * 6.7;
  const back = interpolate(t, [5.0, 6.4], [0, 1], { ...cl, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  const toUI = interpolate(t, [8.4, 9.95], [0, 1], { ...cl, easing: Easing.inOut(Easing.cubic) });
  const shake = (1 - back) * push * 0.035;
  const camPos = new THREE.Vector3(
    Math.sin(t * 13) * shake + Math.sin(t * 0.7) * 0.15 * back * (1 - toUI),
    THREE.MathUtils.lerp(hook === "push" ? 1.55 - push * 0.45 : 1.15, 1.25, back) + Math.cos(t * 11) * shake,
    THREE.MathUtils.lerp(zChaos, 4.6, back),
  );
  camPos.lerp(new THREE.Vector3(Math.sin(-0.05) * 4.8, BIRTH.y + 0.12, BIRTH.z + Math.cos(-0.05) * 4.8), toUI);
  const look = new THREE.Vector3(0, THREE.MathUtils.lerp(1.08, 1.1, back), THREE.MathUtils.lerp(0, BIRTH.z, back));
  const fov = THREE.MathUtils.lerp(hook === "swarm" ? 58 : 46, 34, push) + back * 6 * (1 - toUI);
  const roll = (hook === "swarm" ? Math.sin(t * 1.7) * 0.06 * (1 - push) : 0) + Math.sin(t * 3) * 0.01 * push * (1 - back);
  // ---------- story state ----------
  const phoneTex = useLiveTexture(720, 1540, (ctx, W, H) => drawPhoneScreen(ctx, W, H, "chaos", t, `"${heebo}"`));
  const chatTex = useLiveTexture(720, 1440, (ctx, W, H) => drawChat(ctx, W, H, 0, `"${heebo}"`));
  const form = interpolate(t, [5.95, 7.5], [0, 1], { ...cl, easing: Easing.out(Easing.back(1.4)) });
  const slab = interpolate(t, [8.5, 9.7], [0, 1], { ...cl, easing: Easing.inOut(Easing.cubic) });
  const uiIn = interpolate(t, [9.2, 9.9], [0, 1], cl);
  const phoneDim = 1 - interpolate(t, [5.4, 6.6], [0, 0.97], cl);
  const coreScale = THREE.MathUtils.lerp(0.42, 0.92, slab);
  const redGlint = t < 5 ? Math.max(0, Math.sin(t * 9)) * push : 0;
  return (
    <>
      <CamRig pos={camPos.toArray() as [number, number, number]} look={look.toArray() as [number, number, number]} fov={fov} roll={roll} />
      <color attach="background" args={[C.void]} />
      <fog attach="fog" args={[C.void, 6, 22]} />
      <Env intensity={0.12} exposure={1} />
      <Office day={0} />
      {/* night key: cool window rim + warm desk lamp pool far left */}
      {/* cool window rim from behind — grazes the phone edges, not the desk */}
      <directionalLight position={[2.5, 3, -6]} intensity={1.4} color="#7aa2ff" />
      <spotLight position={[-1.8, 3.2, 0.6]} angle={0.42} penumbra={0.9} intensity={26} color="#ffb070" />
      <pointLight position={[0.6, 1.6, 0.8]} intensity={redGlint * 4} color="#ff3b3b" distance={4} />
      {/* the phone, propped on the desk */}
      {phoneDim > 0.02 ? (
        <group position={PHONE} rotation={[-0.08, 0, 0]}>
          <Phone screen={phoneTex} glow={phoneDim} />
        </group>
      ) : null}
      <Swarm t={t} hook={hook} cam={camPos} />
      {/* the agent is born at the convergence point, then flattens into the interface */}
      {t > 5.9 ? (
        <group position={BIRTH}>
          <AgentCore form={form} slab={slab} pulse={interpolate(t, [5.95, 6.3], [1, 0], cl)} scale={coreScale} nodes={(1 - slab) * form} glow={1 + (1 - form) * 2} />
          {uiIn > 0 ? (
            <group scale={0.92 + 0.08 * uiIn}>
              <Card w={1.15} h={2.3} tex={chatTex} glass opacity={uiIn} emissive={uiIn} />
            </group>
          ) : null}
        </group>
      ) : null}
      <PostFX bloom={0.55} radius={0.45} threshold={0.78} dof={{ focus: Math.max(0.5, camPos.distanceTo(t < 5.2 ? PHONE : BIRTH)), aperture: t < 1.6 ? 0.0035 : 0.0016, maxblur: 0.016 }} />
    </>
  );
};

/** 0–10 s: THE CHAOS → THE ARRIVAL, one continuous camera move in one world. */
export const SceneOpen: React.FC<{ hook?: HookVariant }> = ({ hook = "swarm" }) => {
  const { width, height } = useVideoConfig();
  const ready = useHebrewFontReady();
  if (!ready) return null;
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 50, near: 0.05, far: 80 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <Inner hook={hook} />
    </ThreeCanvas>
  );
};
