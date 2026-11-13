import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

export type Uniforms = Record<string, number | [number, number] | [number, number, number]>;

const toUniform = (v: Uniforms[string]) =>
  typeof v === "number" ? v : v.length === 2 ? new THREE.Vector2(v[0], v[1]) : new THREE.Vector3(v[0], v[1], v[2]);

const Quad: React.FC<{ fragment: string; uniforms: Uniforms }> = ({ fragment, uniforms }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(width, height) }, ...Object.fromEntries(Object.entries(uniforms).map(([k, v]) => [k, { value: toUniform(v) }])) },
        depthTest: false,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fragment, width, height],
  );
  mat.uniforms.uTime.value = frame / fps;
  for (const [k, v] of Object.entries(uniforms)) {
    const u = mat.uniforms[k];
    if (typeof v === "number") u.value = v;
    else (u.value as THREE.Vector2 | THREE.Vector3).fromArray(v as number[]);
  }
  return (
    <mesh material={mat} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

/**
 * Full-frame GLSL fragment shader, driven by the Remotion frame (deterministic, seekable).
 * Built-in uniforms: `uTime` (seconds), `uRes` (px). Pass any extra float/vec2/vec3 uniforms per frame.
 * Use for raymarched worlds, liquid gradients, procedural skies, transitions, distortion.
 */
export const ShaderCanvas: React.FC<{ fragment: string; uniforms?: Uniforms }> = ({ fragment, uniforms = {} }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: false, preserveDrawingBuffer: true }} camera={{ position: [0, 0, 1] }}>
      <Quad fragment={fragment} uniforms={uniforms} />
    </ThreeCanvas>
  );
};
