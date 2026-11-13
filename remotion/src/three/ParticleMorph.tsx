import React, { useEffect, useMemo, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import { continueRender, delayRender, random, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SIMPLEX3D } from "./glsl";
import { Bloom } from "./PostFX";

/** Sample N points inside text drawn on an offscreen 2D canvas → world-space targets (deterministic). */
export const sampleTextPoints = (text: string, font: string, count: number, worldWidth: number, seed = "pts"): Float32Array => {
  const W = 1600, H = 520;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 420;
  ctx.font = `${size}px ${font}`;
  while (ctx.measureText(text).width > W * 0.92 && size > 40) { size -= 10; ctx.font = `${size}px ${font}`; }
  ctx.fillText(text, W / 2, H / 2 + size * 0.04);
  const data = ctx.getImageData(0, 0, W, H).data;
  const filled: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) filled.push(x, y);
  const out = new Float32Array(count * 3);
  const n = filled.length / 2;
  const scale = worldWidth / W;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(random(`${seed}-${i}`) * n);
    out[i * 3] = (filled[k * 2] - W / 2) * scale + (random(`${seed}-jx${i}`) - 0.5) * scale * 2;
    out[i * 3 + 1] = -(filled[k * 2 + 1] - H / 2) * scale + (random(`${seed}-jy${i}`) - 0.5) * scale * 2;
    out[i * 3 + 2] = (random(`${seed}-z${i}`) - 0.5) * 0.15;
  }
  return out;
};

const VERT = /* glsl */ `
uniform float uTime; uniform float uForm; uniform float uExplode; uniform float uSize; uniform float uPixelRatio;
attribute vec3 aTarget; attribute float aRand;
varying float vRand; varying float vForm;
${SIMPLEX3D}
vec3 curl(vec3 p){ float e=0.1;
  float n1=snoise(p+vec3(0,e,0)), n2=snoise(p-vec3(0,e,0)), n3=snoise(p+vec3(0,0,e)), n4=snoise(p-vec3(0,0,e)), n5=snoise(p+vec3(e,0,0)), n6=snoise(p-vec3(e,0,0));
  return normalize(vec3(n1-n2 - (n3-n4), n3-n4 - (n5-n6), n5-n6 - (n1-n2)) + 1e-4); }
void main(){
  // swirling galaxy state: orbit + curl-noise drift
  float ang = uTime*(0.25+aRand*0.35) + aRand*6.2831;
  vec3 s = position; s.xz = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*s.xz;
  s += curl(s*0.35 + uTime*0.1) * 0.6;
  // staggered convergence onto the target shape
  float k = smoothstep(aRand*0.45, aRand*0.45+0.55, uForm);
  vec3 p = mix(s, aTarget, k);
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

const Points: React.FC<Required<Omit<ParticleMorphProps, "background" | "bloom">> & { targets: Float32Array }> = ({ count, targets, form, explode, colorA, colorB, size, orbit, fade }) => {
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
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
    return g;
  }, [count, targets]);
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uForm: { value: 0 }, uExplode: { value: 0 }, uSize: { value: 30 }, uPixelRatio: { value: 1 }, uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() }, uFade: { value: 1 } },
    }),
    [],
  );
  mat.uniforms.uTime.value = frame / fps;
  mat.uniforms.uForm.value = form;
  mat.uniforms.uExplode.value = explode;
  mat.uniforms.uSize.value = size;
  mat.uniforms.uFade.value = fade;
  mat.uniforms.uPixelRatio.value = gl.getPixelRatio();
  (mat.uniforms.uColA.value as THREE.Color).set(colorA);
  (mat.uniforms.uColB.value as THREE.Color).set(colorB);
  camera.position.set(Math.sin(orbit) * 7, 0.6 + Math.cos(orbit * 0.7) * 0.4, Math.cos(orbit) * 7);
  camera.lookAt(0, 0, 0);
  return <points geometry={geo} material={mat} />;
};

export type ParticleMorphProps = {
  /** Text the particles assemble into. */
  text: string;
  /** Font family name already loaded in the page (e.g. from @remotion/google-fonts). */
  font: string;
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
export const ParticleMorph: React.FC<ParticleMorphProps> = ({ text, font, count = 24000, form, explode = 0, colorA = "#ff6a3d", colorB = "#7fb2ff", size = 34, orbit = 0, fade = 1, background = "#05050a", bloom = 0.9 }) => {
  const { width, height } = useVideoConfig();
  const [targets, setTargets] = useState<Float32Array | null>(null);
  const [handle] = useState(() => delayRender(`sampling particle targets for "${text}"`));
  useEffect(() => {
    let alive = true;
    document.fonts.load(`400 200px "${font}"`).then(() => {
      if (!alive) return;
      setTargets(sampleTextPoints(text, `"${font}"`, count, 9));
      continueRender(handle);
    });
    return () => { alive = false; };
  }, [text, font, count, handle]);
  if (!targets) return null;
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 40 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <color attach="background" args={[background]} />
      <Points count={count} targets={targets} form={form} explode={explode} colorA={colorA} colorB={colorB} size={size} orbit={orbit} fade={fade} text={text} font={font} />
      <Bloom strength={bloom} radius={0.7} threshold={0.2} />
    </ThreeCanvas>
  );
};
