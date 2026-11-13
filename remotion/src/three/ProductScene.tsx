import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PostFX, type DOF } from "./PostFX";
import { Product, PRODUCTS, type ProductBrand, type ProductKind } from "./products";
import type { StageId } from "../engine/styles";

/** Camera state. `lens` in mm (full-frame equivalent). */
/** `dist` may be omitted when `fill` is given — the engine resolves it with fitDistance for the current aspect. */
export type Cam = { orbit: number; dist?: number; fill?: number; height: number; lookY: number; lens?: number };
export type CameraMove = { from: Cam; to?: Cam; ease?: "inOut" | "out" | "in" | "linear" };

export const lensToFov = (mm: number) => (2 * Math.atan(12 / mm) * 180) / Math.PI;

/**
 * Distance at which an object of (width, height) fills `fill` of the frame — respects aspect ratio,
 * so the same shot spec frames correctly in 9:16, 1:1 and 16:9.
 */
export const fitDistance = (objW: number, objH: number, lensMm: number, aspect: number, fill = 0.7) => {
  const vf = 2 * Math.atan(12 / lensMm);
  const dH = objH / fill / (2 * Math.tan(vf / 2));
  const dW = objW / fill / (2 * Math.tan(vf / 2) * aspect);
  return Math.max(dH, dW);
};

const EASES = { inOut: Easing.bezier(0.65, 0, 0.35, 1), out: Easing.bezier(0.16, 1, 0.3, 1), in: Easing.bezier(0.7, 0, 0.84, 0), linear: (t: number) => t };

const Rig: React.FC<{ move: CameraMove }> = ({ move }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { camera } = useThree();
  const p = EASES[move.ease ?? "inOut"](interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const to = move.to ?? move.from;
  const l = (a: number, b: number) => a + (b - a) * p;
  const c = { orbit: l(move.from.orbit, to.orbit), dist: l(move.from.dist ?? 8, to.dist ?? move.from.dist ?? 8), height: l(move.from.height, to.height), lookY: l(move.from.lookY, to.lookY), lens: l(move.from.lens ?? 50, to.lens ?? move.from.lens ?? 50) };
  camera.position.set(Math.sin(c.orbit) * c.dist, c.height, Math.cos(c.orbit) * c.dist);
  camera.lookAt(0, c.lookY, 0);
  const pc = camera as THREE.PerspectiveCamera;
  const fov = lensToFov(c.lens);
  if (Math.abs(pc.fov - fov) > 1e-3) { pc.fov = fov; pc.updateProjectionMatrix(); }
  return null;
};

const Env: React.FC<{ intensity: number; exposure?: number }> = ({ intensity, exposure = 1 }) => {
  const { gl, scene } = useThree();
  gl.toneMappingExposure = exposure;
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environmentIntensity = intensity;
    pmrem.dispose();
  }, [gl, scene, intensity]);
  return null;
};

const radialTex = (stops: [number, string][], w = 512, h = 512, cx = 0.5, cy = 0.58, r = 0.6) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(w * cx, h * cy, 4, w * cx, h * cy, Math.max(w, h) * r);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const gridTex = (line: string) => {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = line; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
  for (let i = 0; i <= 1024; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Gradient sky dome (zenith → horizon + sun glow): gives glass and chrome something beautiful to refract and reflect. */
const SkyDome: React.FC<{ top: string; horizon: string; sun: string }> = ({ top, horizon, sun }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uHor: { value: new THREE.Color(horizon) }, uSun: { value: new THREE.Color(sun) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y*1.6+0.15,0.0,1.0); vec3 c = mix(uHor, uTop, smoothstep(0.0,1.0,h));
        float s = max(dot(normalize(vDir), normalize(vec3(0.3,0.12,-1.0))),0.0); c += uSun*pow(s,12.0)*0.9 + uSun*pow(s,200.0)*2.0;
        gl_FragColor = vec4(c,1.0); }`,
  }), [top, horizon, sun]);
  return <mesh material={mat}><sphereGeometry args={[40, 48, 32]} /></mesh>;
};

/** Backdrop card that always faces the camera from behind the product. */
const Backdrop: React.FC<{ tex: THREE.Texture; orbit: number; y?: number; w?: number; h?: number; dist?: number; opacity?: number }> = ({ tex, orbit, y = 1.6, w = 16, h = 14, dist = 7, opacity = 1 }) => (
  <mesh position={[-Math.sin(orbit) * dist, y, -Math.cos(orbit) * dist]} rotation={[0, orbit, 0]}>
    <planeGeometry args={[w, h]} />
    <meshBasicMaterial map={tex} transparent opacity={opacity} toneMapped={false} depthWrite={false} />
  </mesh>
);

export type StageColors = { bg: string; glow: [string, string]; accent: string; accent2: string };

/** Lighting + set per stage. Each is a complete DP setup, not just a colour change. */
const Stage: React.FC<{ stage: StageId; colors: StageColors; orbit: number; reflect: boolean; children: React.ReactNode }> = ({ stage, colors, orbit, reflect, children }) => {
  const frame = useCurrentFrame();
  const glow = useMemo(() => radialTex([[0, colors.glow[0]], [0.5, colors.glow[1]], [1, "rgba(0,0,0,0)"]]), [colors.glow[0], colors.glow[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const glowA = useMemo(() => radialTex([[0, colors.accent], [0.45, "rgba(0,0,0,0.0)"]], 512, 512, 0.5, 0.5, 0.5), [colors.accent]);
  const glowB = useMemo(() => radialTex([[0, colors.accent2], [0.45, "rgba(0,0,0,0.0)"]], 512, 512, 0.5, 0.5, 0.5), [colors.accent2]);
  const shadow = useMemo(() => radialTex([[0, "rgba(0,0,0,0.55)"], [0.35, "rgba(0,0,0,0.18)"], [0.7, "rgba(0,0,0,0)"]], 512, 512, 0.5, 0.5, 0.5), []);
  const grid = useMemo(() => gridTex(colors.accent), [colors.accent]);
  const mirror = reflect ? <group scale={[1, -1, 1]}>{children}</group> : null;

  if (stage === "noir") return (
    <>
      <color attach="background" args={[colors.bg]} /><fog attach="fog" args={[colors.bg, 9, 24]} /><Env intensity={0.55} />
      <spotLight position={[4, 6, 4]} angle={0.4} penumbra={0.9} intensity={70} color="#ffd9b0" />
      <spotLight position={[-5, 3, 2]} angle={0.6} penumbra={1} intensity={30} color="#9fbfff" />
      <spotLight position={[0, 4, -5]} angle={0.5} penumbra={0.6} intensity={110} color="#ffffff" />
      <pointLight position={[Math.sin(frame * 0.04) * 3, 1.6, Math.cos(frame * 0.04) * 3]} intensity={7} color="#ffe2c4" distance={8} />
      <Backdrop tex={glow} orbit={orbit} />
      {children}{mirror}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}><circleGeometry args={[30, 64]} /><meshBasicMaterial color={colors.bg} transparent opacity={0.8} /></mesh>
    </>
  );
  if (stage === "neon") return (
    <>
      <color attach="background" args={[colors.bg]} /><fog attach="fog" args={[colors.bg, 8, 20]} /><Env intensity={0.35} />
      <spotLight position={[-4, 3, -3]} angle={0.6} penumbra={0.5} intensity={160} color={colors.accent} />
      <spotLight position={[4, 3, -3]} angle={0.6} penumbra={0.5} intensity={160} color={colors.accent2} />
      <spotLight position={[2, 6, 5]} angle={0.4} penumbra={1} intensity={45} color="#ffffff" />
      <group rotation={[0, orbit, 0]}>
        <mesh position={[-3.2, 2.2, -5]}><planeGeometry args={[9, 9]} /><meshBasicMaterial map={glowA} transparent toneMapped={false} depthWrite={false} /></mesh>
        <mesh position={[3.2, 2.2, -5]}><planeGeometry args={[9, 9]} /><meshBasicMaterial map={glowB} transparent toneMapped={false} depthWrite={false} /></mesh>
      </group>
      {children}{mirror}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}><planeGeometry args={[40, 40]} /><meshBasicMaterial map={grid} transparent opacity={0.85} color="#666" /></mesh>
    </>
  );
  if (stage === "dream") return (
    <>
      <color attach="background" args={[colors.bg]} /><Env intensity={0.45} exposure={0.85} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} color="#fff4f0" />
      <directionalLight position={[-4, 2, -3]} intensity={2.2} color={colors.accent} />
      <directionalLight position={[4, 1, -4]} intensity={1.6} color={colors.accent2} />
      <SkyDome top={colors.accent} horizon={colors.glow[0]} sun={colors.accent2} />
      {children}
    </>
  );
  if (stage === "white") return (
    <>
      <color attach="background" args={[colors.bg]} /><Env intensity={0.4} exposure={0.78} />
      <directionalLight position={[-3, 7, 5]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[5, 2, -4]} intensity={0.9} color="#ffffff" />
      {children}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}><planeGeometry args={[4.5, 4.5]} /><meshBasicMaterial map={shadow} transparent depthWrite={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 60]} /><meshBasicMaterial color={colors.bg} /></mesh>
    </>
  );
  // void: silhouette + coloured rims
  return (
    <>
      <color attach="background" args={[colors.bg]} /><Env intensity={0.25} />
      <spotLight position={[-3, 3, -4]} angle={0.5} penumbra={0.4} intensity={220} color={colors.accent} />
      <spotLight position={[3, 3, -4]} angle={0.5} penumbra={0.4} intensity={220} color={colors.accent2} />
      <spotLight position={[0, 6, -1.5]} angle={0.35} penumbra={1} intensity={30} color="#ffffff" />
      {children}
    </>
  );
};

export type ProductMotion = {
  /** Turntable speed, radians per second. */
  spin?: number;
  spinOffset?: number;
  /** Vertical float amplitude (dream/levitation). */
  float?: number;
  /** Drop-in: starts this many units above and lands with a soft bounce over `dropFrames`. */
  drop?: number;
  dropFrames?: number;
  tilt?: number;
  scale?: number;
};

export type ProductSceneProps = {
  product: ProductKind;
  brand: ProductBrand;
  stage: StageId;
  colors: StageColors;
  camera: CameraMove;
  motion?: ProductMotion;
  dof?: DOF | "auto";
  bloom?: number;
  reflect?: boolean;
};

/**
 * Library-grade 3D product scene: any product × any stage × any camera move, with DOF, bloom, reflections.
 * Native at any aspect ratio (vertical fov is preserved, so 9:16 frames products tall and tight).
 */
export const ProductScene: React.FC<ProductSceneProps> = ({ product, brand, stage, colors, camera, motion = {}, dof, bloom = 0.3, reflect }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;
  const dropY = motion.drop ? interpolate(frame, [0, motion.dropFrames ?? 18], [motion.drop, 0], { extrapolateRight: "clamp", easing: Easing.bezier(0.5, 0, 0.75, 1.35) }) : 0;
  const y = dropY + (motion.float ? Math.sin(t * 1.4) * motion.float + motion.float : 0);
  const spin = (motion.spinOffset ?? 0) + t * (motion.spin ?? 0);
  const focusDist = camera.from.dist ?? 8;
  const autoDof: DOF | undefined = dof === "auto" ? { focus: focusDist, aperture: 0.0016, maxblur: 0.012 } : dof;
  const doReflect = reflect ?? (stage === "noir" || stage === "neon");
  const orbit = camera.from.orbit;
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 30 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <Rig move={camera} />
      <Stage stage={stage} colors={colors} orbit={orbit} reflect={doReflect}>
        <group position={[0, y, 0]} rotation={[motion.tilt ?? 0, spin, 0]} scale={motion.scale ?? 1}>
          <Product kind={product} brand={brand} />
        </group>
      </Stage>
      <PostFX bloom={bloom} radius={0.35} threshold={stage === "white" || stage === "dream" ? 0.97 : 0.9} dof={autoDof} />
    </ThreeCanvas>
  );
};

export { PRODUCTS };
