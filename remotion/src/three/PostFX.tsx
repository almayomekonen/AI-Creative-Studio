import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export type DOF = {
  /** Focus distance from camera, world units. */
  focus: number;
  /** Aperture: 0.0005 subtle … 0.004 strong macro bokeh. */
  aperture: number;
  maxblur?: number;
};

/**
 * Film post stack for any <ThreeCanvas>: depth of field (Bokeh) → bloom → tonemap/output.
 * Takes over rendering at useFrame priority 1, so it stays frame-accurate under Remotion.
 */
export const PostFX: React.FC<{ bloom?: number; radius?: number; threshold?: number; dof?: DOF }> = ({ bloom = 0.7, radius = 0.6, threshold = 0.8, dof }) => {
  const { gl, scene, camera, size } = useThree();
  const { composer, bokeh } = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    let b: BokehPass | null = null;
    if (dof) {
      b = new BokehPass(scene, camera, { focus: dof.focus, aperture: dof.aperture, maxblur: dof.maxblur ?? 0.01 });
      c.addPass(b);
    }
    if (bloom > 0) c.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), bloom, radius, threshold));
    c.addPass(new OutputPass());
    return { composer: c, bokeh: b };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, !!dof]);
  if (bokeh && dof) {
    const u = bokeh.uniforms as unknown as Record<string, { value: number }>;
    u.focus.value = dof.focus;
    u.aperture.value = dof.aperture;
    u.maxblur.value = dof.maxblur ?? 0.01;
  }
  useEffect(() => composer.setSize(size.width, size.height), [composer, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame(() => composer.render(), 1);
  return null;
};

/** Back-compat: bloom only. */
export const Bloom: React.FC<{ strength?: number; radius?: number; threshold?: number }> = ({ strength = 0.7, radius = 0.6, threshold = 0.8 }) => (
  <PostFX bloom={strength} radius={radius} threshold={threshold} />
);
