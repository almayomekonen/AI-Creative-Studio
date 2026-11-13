import React, { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender, random, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SIMPLEX3D, STUDIO_ENV } from "../../three/glsl";
import { C } from "./theme";
import { heebo } from "./theme";
import type { Ctx } from "./canvasUI";

/** Hold the render until the Hebrew webfont is usable in Canvas 2D (otherwise textures bake a fallback font). */
export const useHebrewFontReady = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("loading Heebo for canvas textures"));
  useEffect(() => {
    Promise.all(["400", "500", "700", "800"].map((w) => document.fonts.load(`${w} 40px "${heebo}"`, "אבג"))).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  return ready;
};

/** Canvas texture redrawn every frame via `draw` (deterministic from frame/time). */
export const useLiveTexture = (w: number, h: number, draw: (ctx: Ctx, W: number, H: number) => void, transparent = false) => {
  const { tex, ctx } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { tex: t, ctx: c.getContext("2d")! };
  }, [w, h]);
  if (transparent) ctx.clearRect(0, 0, w, h);
  draw(ctx, w, h);
  tex.needsUpdate = true;
  return tex;
};

export const Env: React.FC<{ intensity?: number; exposure?: number }> = ({ intensity = 0.6, exposure = 1 }) => {
  const { gl, scene } = useThree();
  gl.toneMappingExposure = exposure;
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
    pm.dispose();
  }, [gl, scene]);
  scene.environmentIntensity = intensity;
  return null;
};

export const CamRig: React.FC<{ pos: [number, number, number]; look: [number, number, number]; fov?: number; roll?: number }> = ({ pos, look, fov = 40, roll = 0 }) => {
  const { camera } = useThree();
  camera.position.set(...pos);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(...look);
  const pc = camera as THREE.PerspectiveCamera;
  if (Math.abs(pc.fov - fov) > 1e-3) { pc.fov = fov; pc.updateProjectionMatrix(); }
  return null;
};

// ---------------- THE AGENT CORE (visual hero) ----------------
const CHROME_VERT = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uPulse;
varying vec3 vN; varying vec3 vW; varying float vD;
${SIMPLEX3D}
float disp(vec3 p){ return snoise(p*1.2 + vec3(0.0, uTime*0.45, uTime*0.25))*uAmp + uPulse*0.08; }
void main(){
  vec3 p = position + normal*disp(position);
  vec3 t = normalize(cross(normal, vec3(0.0,1.0,0.0)+0.001)); vec3 b = cross(normal,t); float e=0.01;
  vec3 p1 = position + t*e; p1 += normalize(p1)*disp(p1); vec3 p2 = position + b*e; p2 += normalize(p2)*disp(p2);
  vec3 n = normalize(cross(p1-p, p2-p)); if (dot(n,normal)<0.0) n=-n;
  vD = disp(position); vN = normalize(mat3(modelMatrix)*n); vec4 w = modelMatrix*vec4(p,1.0); vW = w.xyz;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const CHROME_FRAG = /* glsl */ `
uniform float uSweep; uniform vec3 uGlow; uniform float uGlowAmt;
varying vec3 vN; varying vec3 vW; varying float vD;
${STUDIO_ENV}
void main(){
  vec3 v = normalize(vW - cameraPosition); vec3 n = normalize(vN); vec3 r = reflect(v,n);
  float fres = pow(1.0-max(dot(n,-v),0.0),3.0);
  vec3 env = studioEnv(r, uSweep)*0.85;
  vec3 col = env*(0.65+0.6*fres) + uGlow*uGlowAmt*(0.25 + fres*1.2 + max(vD,0.0)*2.0);
  gl_FragColor = vec4(col,1.0);
}`;

/** Logo node layout (from the real icon: green left-centre, blue upper-right, purple lower-right), normalised. */
export const LOGO_NODES: { pos: [number, number]; color: string }[] = [
  { pos: [-0.5, 0], color: C.emerald },
  { pos: [0.5, 0.8], color: C.blue },
  { pos: [0.5, -0.8], color: C.purple },
];

export type AgentCoreProps = {
  /** 0 = not yet formed (fragments scattered), 1 = whole. */
  form?: number;
  /** 0 = sphere-ish hero, 1 = flattened into an interface slab (phone-shaped). */
  slab?: number;
  /** 0 = hero, 1 = resolved into the logo icon (rounded square tile + 3 nodes + connectors). */
  logo?: number;
  pulse?: number;
  scale?: number;
  spin?: number;
  glow?: number;
  /** satellites visible 0..1 */
  nodes?: number;
  time?: number;
};

/**
 * The Social CRM agent: a liquid-chrome core inside a faceted emerald-lit glass shell, orbited by the three nodes of the real logo.
 * It can (a) assemble from fragments, (b) flatten into an interface slab, (c) resolve into the actual logo icon.
 */
export const AgentCore: React.FC<AgentCoreProps> = ({ form = 1, slab = 0, logo = 0, pulse = 0, scale = 1, spin = 0, glow = 1, nodes = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const chrome = useMemo(() => new THREE.ShaderMaterial({ vertexShader: CHROME_VERT, fragmentShader: CHROME_FRAG, uniforms: { uTime: { value: 0 }, uAmp: { value: 0.12 }, uPulse: { value: 0 }, uSweep: { value: 0 }, uGlow: { value: new THREE.Color(C.emerald) }, uGlowAmt: { value: 1 } } }), []);
  chrome.uniforms.uTime.value = t;
  chrome.uniforms.uPulse.value = pulse;
  chrome.uniforms.uAmp.value = 0.12 * (1 - slab) * (1 - logo);
  chrome.uniforms.uSweep.value = -1.4 + ((t * 0.5) % 2.8);
  chrome.uniforms.uGlowAmt.value = glow * 0.28;
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.03, transmission: 1, thickness: 0.35, ior: 1.38, clearcoat: 1, flatShading: true, envMapIntensity: 1.6, specularIntensity: 1, attenuationColor: new THREE.Color("#bbf7d0"), attenuationDistance: 14, transparent: true }), []);
  const tileMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#141c2c", roughness: 0.55, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.12 }), []);
  const ico = useMemo(() => new THREE.IcosahedronGeometry(1.0, 1), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(ico), [ico]);
  const tile = useMemo(() => new RoundedBoxGeometry(2.0, 2.0, 0.34, 6, 0.48), []);
  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({ color: C.emeraldGlow, transparent: true }), []);
  edgeMat.opacity = (0.55 + 0.45 * pulse) * form * (1 - logo) * (1 - slab * 0.9);

  // shell: icosahedron → flattened slab → (fades) ; tile fades in for the logo
  const sx = THREE.MathUtils.lerp(1, 0.62, slab), sy = THREE.MathUtils.lerp(1, 1.25, slab), sz = THREE.MathUtils.lerp(1, 0.07, slab);
  const shellScale = (0.4 + 0.6 * form) * (1 - logo * 0.95);
  const coreScale = (0.25 + 0.75 * form) * 0.6 * (1 - slab * 0.85) * (1 - logo);
  glass.opacity = 1 - slab * 0.85;
  const rotY = spin + t * 0.35 * (1 - slab) * (1 - logo);
  return (
    <group scale={scale}>
      <group rotation={[0.25 * (1 - slab) * (1 - logo), rotY, 0]}>
        <mesh material={chrome} scale={coreScale}><icosahedronGeometry args={[1, 96]} /></mesh>
        <group scale={[sx * shellScale, sy * shellScale, sz * shellScale]}>
          <mesh geometry={ico} material={glass} />
          <lineSegments geometry={edges} material={edgeMat} />
        </group>
      </group>
      <pointLight color={C.emerald} intensity={(6 + pulse * 10) * form * glow} distance={6} />
      {/* logo tile */}
      {logo > 0.01 ? <mesh geometry={tile} material={tileMat} scale={0.2 + 0.8 * logo} /> : null}
      {/* the three brand nodes: orbit as satellites → lock to logo positions */}
      {LOGO_NODES.map((n, i) => {
        const a = t * (0.9 + i * 0.15) + (i * Math.PI * 2) / 3;
        const orbit = new THREE.Vector3(Math.cos(a) * 1.75, Math.sin(a * 1.3) * 0.5, Math.sin(a) * 1.75);
        const target = new THREE.Vector3(n.pos[0] * 0.62, n.pos[1] * 0.5, 0.25);
        const p = orbit.lerp(target, logo);
        return (
          <group key={i} position={p}>
            <mesh scale={(0.13 - 0.03 * logo) * nodes}><sphereGeometry args={[1, 32, 32]} /><meshBasicMaterial color={n.color} toneMapped={false} /></mesh>
            <pointLight color={n.color} intensity={2.5 * nodes * (1 - logo * 0.6)} distance={2.5} />
          </group>
        );
      })}
      {/* connectors: green node → blue / purple (exactly like the logo) */}
      <Connectors nodes={nodes} logo={logo} t={t} />
    </group>
  );
};

const Connectors: React.FC<{ nodes: number; logo: number; t: number }> = ({ nodes, logo, t }) => {
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: C.slate, transparent: true }), []);
  const pts = LOGO_NODES.map((n, i) => {
    const a = t * (0.9 + i * 0.15) + (i * Math.PI * 2) / 3;
    const orbit = new THREE.Vector3(Math.cos(a) * 1.75, Math.sin(a * 1.3) * 0.5, Math.sin(a) * 1.75);
    return orbit.lerp(new THREE.Vector3(n.pos[0] * 0.62, n.pos[1] * 0.5, 0.25), logo);
  });
  geo.setFromPoints([pts[0], pts[1], pts[0], pts[2]]);
  mat.opacity = nodes * (0.25 + 0.75 * logo);
  mat.color.set(logo > 0.5 ? C.slate : C.emeraldGlow);
  return <lineSegments geometry={geo} material={mat} />;
};

// ---------------- PHONE ----------------
export const Phone: React.FC<{ screen: THREE.Texture; glow?: number; scale?: number; lit?: boolean }> = ({ screen, glow = 1, scale = 1, lit = true }) => {
  const body = useMemo(() => new RoundedBoxGeometry(1.0, 2.05, 0.09, 8, 0.14), []);
  const bodyMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#0d0f12", metalness: 0.6, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }), []);
  return (
    <group scale={scale}>
      <mesh geometry={body} material={bodyMat} />
      <mesh position={[0, 0, 0.0455]}>
        <planeGeometry args={[0.92, 1.97]} />
        <meshBasicMaterial map={screen} toneMapped={false} transparent opacity={glow} />
      </mesh>
      {lit ? <ScreenLight glow={glow} /> : null}
    </group>
  );
};
// tiny helper: a soft point light in front of the screen so the screen lights the desk
const ScreenLight: React.FC<{ glow: number }> = ({ glow }) => <pointLight position={[0, 0, 0.6]} intensity={2.2 * glow} distance={3} color="#cfe9ff" />;

// ---------------- OFFICE SET (night ↔ day) ----------------
const canvasTex = (w: number, h: number, draw: (c: Ctx) => void, repeat?: [number, number]) => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};

export const Office: React.FC<{ day: number }> = ({ day }) => {
  const wood = useMemo(() => canvasTex(1024, 1024, (c) => {
    c.fillStyle = "#2a1a10"; c.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 220; i++) { c.strokeStyle = `rgba(${60 + random(`w${i}`) * 50},${35 + random(`w2${i}`) * 25},${18},${0.25 + random(`w3${i}`) * 0.35})`; c.lineWidth = 1 + random(`w4${i}`) * 3; const y = random(`wy${i}`) * 1024; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(300, y + (random(`b1${i}`) - 0.5) * 40, 700, y + (random(`b2${i}`) - 0.5) * 40, 1024, y + (random(`b3${i}`) - 0.5) * 30); c.stroke(); }
  }, [2, 2]), []);
  const night = useMemo(() => canvasTex(1024, 1024, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, "#03060c"); g.addColorStop(1, "#0b1424"); c.fillStyle = g; c.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 260; i++) { const r = 2 + random(`r${i}`) * 14; c.fillStyle = `rgba(${200 + random(`c1${i}`) * 55},${150 + random(`c2${i}`) * 80},${90 + random(`c3${i}`) * 120},${0.15 + random(`a${i}`) * 0.5})`; c.beginPath(); c.arc(random(`x${i}`) * 1024, 420 + random(`y${i}`) * 600, r, 0, Math.PI * 2); c.fill(); }
  }), []);
  const dayTex = useMemo(() => canvasTex(1024, 1024, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, "#fff3dc"); g.addColorStop(0.55, "#ffd9a0"); g.addColorStop(1, "#f2b46b"); c.fillStyle = g; c.fillRect(0, 0, 1024, 1024);
    c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.arc(700, 360, 120, 0, Math.PI * 2); c.fill();
  }), []);
  const deskMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: wood, color: "#1c1714", roughness: 0.22, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.06 }), [wood]);
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.95 }), []);
  wallMat.color.lerpColors(new THREE.Color("#0c0f14"), new THREE.Color(C.dayWall), day);
  return (
    <group>
      {/* desk */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={deskMat}><planeGeometry args={[14, 10]} /></mesh>
      {/* back wall with window */}
      <mesh position={[0, 3, -4]} material={wallMat}><planeGeometry args={[30, 12]} /></mesh>
      <mesh position={[0.8, 2.6, -3.95]}>
        <planeGeometry args={[4.2, 3.4]} />
        <meshBasicMaterial map={night} toneMapped={false} transparent opacity={1 - day} />
      </mesh>
      <mesh position={[0.8, 2.6, -3.94]}>
        <planeGeometry args={[4.2, 3.4]} />
        <meshBasicMaterial map={dayTex} toneMapped={false} transparent opacity={day} />
      </mesh>
      {/* window mullions */}
      {[-1.3, 0.8, 2.9].map((x) => <mesh key={x} position={[x, 2.6, -3.9]}><boxGeometry args={[0.07, 3.5, 0.05]} /><meshStandardMaterial color="#111" /></mesh>)}
      <mesh position={[0.8, 2.6, -3.9]}><boxGeometry args={[4.3, 0.07, 0.05]} /><meshStandardMaterial color="#111" /></mesh>
    </group>
  );
};

/** Volumetric sun beams through the window (additive gradient planes) + dust motes in the light. */
export const SunBeams: React.FC<{ amount: number }> = ({ amount }) => {
  const frame = useCurrentFrame();
  const beam = useMemo(() => canvasTex(256, 1024, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, "rgba(255,214,150,0.55)"); g.addColorStop(1, "rgba(255,214,150,0)"); c.fillStyle = g; c.fillRect(0, 0, 256, 1024);
    const h = c.createLinearGradient(0, 0, 256, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)"); c.globalCompositeOperation = "destination-out"; c.fillStyle = h; c.fillRect(0, 0, 256, 1024);
  }), []);
  const dust = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 400;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = -1 + random(`dx${i}`) * 4; p[i * 3 + 1] = 0.2 + random(`dy${i}`) * 3; p[i * 3 + 2] = -3 + random(`dz${i}`) * 4.5; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  if (amount <= 0.001) return null;
  return (
    <group>
      {[-0.6, 0.4, 1.4, 2.2].map((x, i) => (
        <mesh key={i} position={[x - 0.6, 1.6, -1.6]} rotation={[0.55, 0.25, 0.35]}>
          <planeGeometry args={[0.7 + i * 0.15, 5.5]} />
          <meshBasicMaterial map={beam} transparent opacity={amount * (0.5 + 0.2 * Math.sin(frame / 50 + i))} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <points geometry={dust} rotation={[0, frame * 0.0006, 0]}>
        <pointsMaterial size={0.018} color="#fff1d6" transparent opacity={0.7 * amount} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
};

/** A rounded glass/paper card with a canvas face. */
export const Card: React.FC<{ w: number; h: number; tex: THREE.Texture; depth?: number; glass?: boolean; opacity?: number; emissive?: number }> = ({ w, h, tex, depth = 0.04, glass = false, opacity = 1, emissive = 1 }) => {
  const geo = useMemo(() => new RoundedBoxGeometry(w, h, depth, 4, Math.min(w, h) * 0.06), [w, h, depth]);
  const bodyMat = useMemo(() => (glass ? new THREE.MeshPhysicalMaterial({ color: "#cfeedd", transmission: 1, roughness: 0.08, thickness: 0.3, ior: 1.4, clearcoat: 1 }) : new THREE.MeshPhysicalMaterial({ color: "#e9ece8", roughness: 0.7 })), [glass]);
  return (
    <group>
      <mesh geometry={geo} material={bodyMat} />
      <mesh position={[0, 0, depth / 2 + 0.002]}>
        <planeGeometry args={[w * 0.985, h * 0.985]} />
        <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={opacity} color-r={emissive} color-g={emissive} color-b={emissive} />
      </mesh>
    </group>
  );
};
