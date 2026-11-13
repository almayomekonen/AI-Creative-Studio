import React, { useEffect, useMemo, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import { continueRender, delayRender, random, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SIMPLEX3D } from "./glsl";
import { Bloom } from "./PostFX";

export type ParticleTarget = { text?: string; path?: string; font?: string };

/** Sample N points inside a target (multi-line text with "\n", or an SVG path in a 200×200 viewBox) → world coords. */
export const sampleTargetPoints = (target: ParticleTarget, count: number, worldWidth: number, seed = "pts"): Float32Array => {
  const W = 1600, H = 1600;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  if (target.path) {
    ctx.translate(W / 2 - 700, H / 2 - 700); ctx.scale(7, 7);
    ctx.fill(new Path2D(target.path));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    const lines = (target.text ?? "").split("\n");
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let size = 420;
    const font = target.font ?? "sans-serif";
    const fit = () => { ctx.font = `${size}px ${font}`; return Math.max(...lines.map((l) => ctx.measureText(l).width)) <= W * 0.94 && size * lines.length * 1.0 <= H * 0.9; };
    while (!fit() && size > 40) size -= 10;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 0.98 + size * 0.04));
  }
  const data = ctx.getImageData(0, 0, W, H).data;
  const filled: number[] = [];
  let minX = W, maxX = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) { filled.push(x, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  const out = new Float32Array(count * 3);
  const n = filled.length / 2;
  if (!n) return out;
  const scale = worldWidth / Math.max(1, maxX - minX);
  const cx = (minX + maxX) / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(random(`${seed}-${i}`) * n);
    out[i * 3] = (filled[k * 2] - cx) * scale + (random(`${seed}-jx${i}`) - 0.5) * scale * 2;
    out[i * 3 + 1] = -(filled[k * 2 + 1] - H / 2) * scale + (random(`${seed}-jy${i}`) - 0.5) * scale * 2;
    out[i * 3 + 2] = (random(`${seed}-z${i}`) - 0.5) * 0.15;
  }
  return out;
};
/** Back-compat */
export const sampleTextPoints = (text: string, font: string, count: number, worldWidth: number, seed = "pts") => sampleTargetPoints({ text, font }, count, worldWidth, seed);

const VERT = /* glsl */ `
uniform float uTime; uniform float uForm; uniform float uExplode; uniform float uSize; uniform float uPixelRatio; uniform float uSwirl; uniform float uTurb;
attribute vec3 aTarget; attribute float aRand;
varying float vRand; varying float vForm;
${SIMPLEX3D}
vec3 curl(vec3 p){ float e=0.1;
  float n1=snoise(p+vec3(0,e,0)), n2=snoise(p-vec3(0,e,0)), n3=snoise(p+vec3(0,0,e)), n4=snoise(p-vec3(0,0,e)), n5=snoise(p+vec3(e,0,0)), n6=snoise(p-vec3(e,0,0));
  return normalize(vec3(n1-n2 - (n3-n4), n3-n4 - (n5-n6), n5-n6 - (n1-n2)) + 1e-4); }
void main(){
  // swirling galaxy state: orbit + curl-noise drift
  float ang = uTime*(0.25+aRand*0.35) + aRand*6.2831;
  vec3 sw = position; sw.xz = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*sw.xz;
  sw += curl(sw*0.35 + uTime*0.1) * 0.6;
  vec3 s = mix(position, sw, uSwirl); // uSwirl=0 → start is a held shape (shape-to-shape morph)
  // staggered convergence onto the target shape
  float k = smoothstep(aRand*0.45, aRand*0.45+0.55, uForm);
  vec3 p = mix(s, aTarget, k);
  p += curl(p*0.8 + uTime*0.3) * sin(k*3.14159) * uTurb; // melt / swirl in the middle of a shape-to-shape morph
  // explosion: radial burst + noise
  p += normalize(aTarget + vec3(0.0,0.0,0.6) + 0.3*curl(aTarget*2.0)) * uExplode * (2.0 + aRand*6.0);
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (0.6 + aRand) * (1.0/ -mv.z);
  vRand = aRand; vForm = k;
}`;

const FRAG = /* glsl */ `
uniform vec3 uColA; uniform vec3 uColB; uniform float uFade;
varying float vRand; varying float vForm;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = mix(uColA, uColB, vRand) * (0.6 + 0.9*vForm);
  gl_FragColor = vec4(col * a, a * uFade);
}`;

type PointsProps = { count: number; targets: Float32Array; starts: Float32Array | null; form: number; explode: number; colorA: string; colorB: string; size: number; orbit: number; fade: number; turbulence: number; camDist: number };
const Points: React.FC<PointsProps> = ({ count, targets, starts, form, explode, colorA, colorB, size, orbit, fade, turbulence, camDist }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { camera, gl } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // disc galaxy distribution
      const r = Math.pow(random(`r${i}`), 0.6) * 6;
      const a = random(`a${i}`) * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (random(`y${i}`) - 0.5) * 1.2 * (1 - r / 7);
      pos[i * 3 + 2] = Math.sin(a) * r;
      rnd[i] = random(`k${i}`);
    }
    g.setAttribute("position", new THREE.BufferAttribute(starts ?? pos, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
    return g;
  }, [count, targets, starts]);
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uSwirl: { value: 1 }, uTurb: { value: 0 }, uTime: { value: 0 }, uForm: { value: 0 }, uExplode: { value: 0 }, uSize: { value: 30 }, uPixelRatio: { value: 1 }, uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() }, uFade: { value: 1 } },
    }),
    [],
  );
  mat.uniforms.uTime.value = frame / fps;
  mat.uniforms.uForm.value = form;
  mat.uniforms.uExplode.value = explode;
  mat.uniforms.uSize.value = size;
  mat.uniforms.uFade.value = fade;
  mat.uniforms.uSwirl.value = starts ? 0 : 1;
  mat.uniforms.uTurb.value = turbulence;
  mat.uniforms.uPixelRatio.value = gl.getPixelRatio();
  (mat.uniforms.uColA.value as THREE.Color).set(colorA);
  (mat.uniforms.uColB.value as THREE.Color).set(colorB);
  camera.position.set(Math.sin(orbit) * camDist, 0.6 + Math.cos(orbit * 0.7) * 0.4, Math.cos(orbit) * camDist);
  camera.lookAt(0, 0, 0);
  return <points geometry={geo} material={mat} />;
};

export type ParticleMorphProps = {
  /** Text the particles assemble into ("\n" for multiple lines). */
  text?: string;
  /** Or: an SVG path (200×200 viewBox) to assemble into. */
  path?: string;
  /** Font family name already loaded in the page (e.g. from @remotion/google-fonts). */
  font: string;
  /** Optional start shape: particles begin AS this shape (instead of a galaxy) → shape-to-shape morph. */
  from?: ParticleTarget;
  /** Curl-noise melt in the middle of the morph (0 = straight lines, 1.5 = liquid swirl). */
  turbulence?: number;
  count?: number;
  /** 0 = swirling galaxy, 1 = fully formed text. */
  form: number;
  /** 0 = intact, >0 = burst outward. */
  explode?: number;
  colorA?: string;
  colorB?: string;
  size?: number;
  /** Camera orbit angle (radians). */
  orbit?: number;
  fade?: number;
  background?: string;
  bloom?: number;
};

/** GPU particle system (tens of thousands of points) that swirls in curl noise, assembles into text, then explodes. */
export const ParticleMorph: React.FC<ParticleMorphProps> = ({ text, path, font, from, turbulence = 0.6, count = 24000, form, explode = 0, colorA = "#ff6a3d", colorB = "#7fb2ff", size = 34, orbit = 0, fade = 1, background = "#05050a", bloom = 0.9 }) => {
  const { width, height } = useVideoConfig();
  const aspect = width / height;
  const camDist = 7;
  // visible width at the target plane (fov 40) → shapes always fit, in 9:16 too
  const worldWidth = Math.min(9, 2 * camDist * Math.tan((20 * Math.PI) / 180) * aspect * 0.82);
  const [pts, setPts] = useState<{ targets: Float32Array; starts: Float32Array | null } | null>(null);
  const [handle] = useState(() => delayRender(`sampling particle targets for "${text ?? "path"}"`));
  const key = JSON.stringify({ text, path, from, count, worldWidth });
  useEffect(() => {
    let alive = true;
    document.fonts.load(`400 200px "${font}"`).then(() => {
      if (!alive) return;
      const targets = sampleTargetPoints({ text, path, font: `"${font}"` }, count, worldWidth, "to");
      const starts = from ? sampleTargetPoints({ ...from, font: `"${from.font ?? font}"` }, count, worldWidth * 0.9, "from") : null;
      setPts({ targets, starts });
      continueRender(handle);
    });
    return () => { alive = false; };
  }, [key, font, handle]); // eslint-disable-line react-hooks/exhaustive-deps
  const targets = pts?.targets;
  if (!targets) return null;
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 40 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <color attach="background" args={[background]} />
      <Points count={count} targets={targets} starts={pts!.starts} form={form} explode={explode} colorA={colorA} colorB={colorB} size={size} orbit={orbit} fade={fade} turbulence={from ? turbulence : 0} camDist={camDist} />
      <Bloom strength={bloom} radius={0.7} threshold={0.2} />
    </ThreeCanvas>
  );
};
