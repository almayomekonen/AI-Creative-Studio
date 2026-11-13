import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SIMPLEX3D, STUDIO_ENV } from "./glsl";
import { Bloom } from "./PostFX";

const VERT = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uPulse; uniform float uFreq;
varying vec3 vN; varying vec3 vWorld; varying float vDisp;
${SIMPLEX3D}
float disp(vec3 p){ return snoise(p*uFreq + vec3(0.0, uTime*0.35, uTime*0.2)) * uAmp + snoise(p*uFreq*2.1 - uTime*0.3)*uAmp*0.15 + uPulse*0.12; }
void main(){
  vec3 p = position + normal * disp(position);
  // analytic-ish normal via finite differences on the displaced surface
  vec3 t = normalize(cross(normal, vec3(0.0,1.0,0.0) + 0.001)); vec3 b = cross(normal, t);
  float e = 0.01;
  vec3 p1 = position + t*e; p1 += normalize(p1)*disp(p1);
  vec3 p2 = position + b*e; p2 += normalize(p2)*disp(p2);
  vec3 n = normalize(cross(p1-p, p2-p));
  if (dot(n, normal) < 0.0) n = -n;
  vDisp = disp(position);
  vN = normalize(mat3(modelMatrix) * n);
  vec4 w = modelMatrix * vec4(p,1.0); vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
uniform vec3 uTint; uniform float uIrid; uniform float uSweep;
varying vec3 vN; varying vec3 vWorld; varying float vDisp;
${STUDIO_ENV}
vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); }
void main(){
  vec3 v = normalize(vWorld - cameraPosition);
  vec3 n = normalize(vN);
  vec3 r = reflect(v, n);
  float fres = pow(1.0 - max(dot(n,-v),0.0), 4.0);
  vec3 env = studioEnv(r, uSweep);
  vec3 film = mix(vec3(1.0), hue(fres*0.8 + vDisp*1.5 + 0.55), uIrid*fres); // thin-film iridescence
  vec3 col = env * 0.8 * uTint * film * (0.7 + 0.7*fres);
  gl_FragColor = vec4(col, 1.0);
}`;

const Blob: React.FC<{ pulse: number; amp: number; tint: [number, number, number]; iridescence: number; spin: number }> = ({ pulse, amp, tint, iridescence, spin }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uAmp: { value: 0.3 }, uPulse: { value: 0 }, uFreq: { value: 0.85 }, uTint: { value: new THREE.Color() }, uIrid: { value: 0.5 }, uSweep: { value: 0 } },
    }),
    [],
  );
  const t = frame / fps;
  mat.uniforms.uTime.value = t;
  mat.uniforms.uAmp.value = amp;
  mat.uniforms.uPulse.value = pulse;
  mat.uniforms.uIrid.value = iridescence;
  mat.uniforms.uSweep.value = -1.2 + ((t * 0.55) % 2.6);
  (mat.uniforms.uTint.value as THREE.Color).setRGB(...tint);
  return (
    <mesh material={mat} rotation={[0.2, t * spin, 0]} scale={1 + pulse * 0.04}>
      <icosahedronGeometry args={[1.0, 160]} />
    </mesh>
  );
};

const Rig: React.FC<{ orbit: number; dist: number; lookY: number }> = ({ orbit, dist, lookY }) => {
  const { camera } = useThree();
  camera.position.set(Math.sin(orbit) * dist, 0.35, Math.cos(orbit) * dist);
  camera.lookAt(0, lookY, 0);
  return null;
};

export type LiquidChromeProps = {
  /** 0..1 beat pulse (from beatPulse()) — the liquid swells on the kick. */
  pulse?: number;
  /** Displacement amplitude: 0.1 calm mercury → 0.45 turbulent. */
  amp?: number;
  tint?: [number, number, number];
  iridescence?: number;
  /** Camera orbit angle in radians (animate it for a slow orbit). */
  orbit?: number;
  dist?: number;
  /** Camera look-at height: negative values lift the blob higher in frame (room for titles below). */
  lookY?: number;
  spin?: number;
  background?: string;
  bloom?: number;
};

/** Liquid chrome / mercury blob: noise-displaced surface reflecting a procedural photo studio, with thin-film iridescence and bloom. */
export const LiquidChrome: React.FC<LiquidChromeProps> = ({ pulse = 0, amp = 0.16, tint = [1, 1, 1], iridescence = 0.6, orbit = 0, dist = 5.4, lookY = 0, spin = 0.15, background = "#07070a", bloom = 0.45 }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 32, position: [0, 0, dist] }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <color attach="background" args={[background]} />
      <Rig orbit={orbit} dist={dist} lookY={lookY} />
      <Blob pulse={pulse} amp={amp} tint={tint} iridescence={iridescence} spin={spin} />
      <Bloom strength={bloom} radius={0.4} threshold={0.92} />
    </ThreeCanvas>
  );
};
