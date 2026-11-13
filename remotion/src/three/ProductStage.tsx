import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Bloom } from "./PostFX";

/** Procedural studio environment map for physically-based reflections (no HDRI download). */
const StudioEnvironment: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    pmrem.dispose();
  }, [gl, scene, intensity]);
  return null;
};

/** Label texture drawn with Canvas 2D — brand name, sub-line and fine print. */
const makeLabel = (brand: string, sub: string, ink: string, paper: string, fontDisplay: string, fontBody: string) => {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(40, 40, 944, 432);
  ctx.fillStyle = ink; ctx.textAlign = "center";
  ctx.font = `150px "${fontDisplay}"`; ctx.fillText(brand, 512, 270);
  ctx.font = `600 34px "${fontBody}"`; ctx.fillText(sub.toUpperCase().split("").join(" "), 512, 350);
  ctx.font = `400 22px "${fontBody}"`; ctx.fillText("50 ml · 1.7 fl.oz · RENDERED, NOT FILMED", 512, 420);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** Soft radial glow card behind the product — glass refracts it, which is what makes glass read as glass. */
const makeGlow = (inner: string, outer: string) => {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(256, 300, 10, 256, 300, 300);
  g.addColorStop(0, inner); g.addColorStop(0.55, outer); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Lathe profile of a heavy-based perfume flacon (radius, height). */
const BOTTLE_PROFILE = [
  [0.0, 0.0], [0.78, 0.0], [0.86, 0.04], [0.9, 0.14], [0.9, 1.62], [0.86, 1.74], [0.7, 1.84], [0.34, 1.9], [0.26, 1.96], [0.26, 2.06], [0.0, 2.06],
].map(([x, y]) => new THREE.Vector2(x, y));
const LIQUID_PROFILE = [[0.0, 0.16], [0.8, 0.16], [0.82, 0.2], [0.82, 1.32], [0.0, 1.32]].map(([x, y]) => new THREE.Vector2(x, y));

const Bottle: React.FC<{ spin: number; label: THREE.Texture; liquid: string; cap: string; sweep: number; sweepIntensity: number }> = ({ spin, label, liquid, cap, sweep, sweepIntensity }) => {
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.6, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4, specularIntensity: 1 }), []);
  const juice = useMemo(() => new THREE.MeshPhysicalMaterial({ color: liquid, roughness: 0.1, transmission: 0.9, thickness: 1.5, ior: 1.33, attenuationColor: new THREE.Color(liquid), attenuationDistance: 0.8 }), [liquid]);
  const metal = useMemo(() => new THREE.MeshPhysicalMaterial({ color: cap, metalness: 1, roughness: 0.22, clearcoat: 0.6 }), [cap]);
  const labelMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: label, color: "#b9b4ad", roughness: 0.6, envMapIntensity: 0.4, side: THREE.FrontSide }), [label]);
  return (
    <group rotation={[0, spin, 0]}>
      <mesh material={glass} castShadow><latheGeometry args={[BOTTLE_PROFILE, 128]} /></mesh>
      <mesh material={juice}><latheGeometry args={[LIQUID_PROFILE, 96]} /></mesh>
      {/* label wraps 100° of the body */}
      <mesh material={labelMat} position={[0, 0.82, 0]}><cylinderGeometry args={[0.905, 0.905, 0.62, 96, 1, true, -0.87, 1.74]} /></mesh>
      {/* cap: faceted metal block */}
      <mesh material={metal} position={[0, 2.38, 0]}><cylinderGeometry args={[0.42, 0.46, 0.62, 8]} /></mesh>
      <mesh material={metal} position={[0, 2.07, 0]}><cylinderGeometry args={[0.3, 0.3, 0.06, 48]} /></mesh>
      {/* moving rim light that sweeps across the glass */}
      <pointLight position={[Math.sin(sweep) * 3, 1.6, Math.cos(sweep) * 3]} intensity={sweepIntensity} color="#ffe2c4" distance={8} />
    </group>
  );
};

const Rig: React.FC<{ orbit: number; dist: number; height: number; lookY: number }> = ({ orbit, dist, height, lookY }) => {
  const { camera } = useThree();
  camera.position.set(Math.sin(orbit) * dist, height, Math.cos(orbit) * dist);
  camera.lookAt(0, lookY, 0);
  return null;
};

export type ProductStageProps = {
  brand?: string;
  sub?: string;
  /** Product turntable rotation (radians). */
  spin?: number;
  /** Camera orbit (radians), distance and height — animate for push-ins and cranes. */
  orbit?: number;
  dist?: number;
  height?: number;
  lookY?: number;
  /** Light-sweep angle (radians) — animate for the glint pass. */
  sweep?: number;
  /** Brightness of the moving rim light (lower it for close-ups so it doesn't flare). */
  sweepIntensity?: number;
  liquid?: string;
  cap?: string;
  backdrop?: string;
  /** Inner/outer colours of the glow card behind the product. */
  glow?: [string, string];
  fonts: { display: string; body: string };
  bloom?: number;
};

/**
 * Procedural 3D product visualisation: glass perfume bottle (physical transmission, IOR, clearcoat), coloured liquid,
 * faceted metal cap, canvas-drawn label, studio environment lighting, three-point lights, mirrored floor and bloom.
 * Swap BOTTLE_PROFILE for any lathe-able product (can, jar, lipstick, candle) or load a glTF.
 */
export const ProductStage: React.FC<ProductStageProps> = ({
  brand = "NOIR", sub = "eau de code", spin = 0, orbit = 0.4, dist = 8.8, height = 1.5, lookY = 1.2, sweep = 0, sweepIntensity = 7,
  liquid = "#e0892f", cap = "#c9a86a", backdrop = "#0b0909", glow = ["#ffb070", "#5a2410"], fonts, bloom = 0.3,
}) => {
  const { width, height: h } = useVideoConfig();
  useCurrentFrame();
  const label = useMemo(() => makeLabel(brand, sub, "#141012", "#efe6d8", fonts.display, fonts.body), [brand, sub, fonts.display, fonts.body]);
  const glowTex = useMemo(() => makeGlow(glow[0], glow[1]), [glow[0], glow[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ThreeCanvas width={width} height={h} camera={{ fov: 30 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
      <color attach="background" args={[backdrop]} />
      <fog attach="fog" args={[backdrop, 9, 22]} />
      <StudioEnvironment intensity={0.55} />
      <Rig orbit={orbit} dist={dist} height={height} lookY={lookY} />
      {/* three-point lighting: warm key, cool fill, hard rim from behind */}
      <spotLight position={[4, 6, 4]} angle={0.4} penumbra={0.9} intensity={70} color="#ffd9b0" />
      <spotLight position={[-5, 3, 2]} angle={0.6} penumbra={1} intensity={30} color="#9fbfff" />
      <spotLight position={[0, 4, -5]} angle={0.5} penumbra={0.6} intensity={110} color="#ffffff" />
      {/* glow card follows the camera azimuth so it always sits behind the product */}
      <mesh position={[-Math.sin(orbit) * 7, 1.6, -Math.cos(orbit) * 7]} rotation={[0, orbit, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshBasicMaterial map={glowTex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <Bottle spin={spin} label={label} liquid={liquid} cap={cap} sweep={sweep} sweepIntensity={sweepIntensity} />
      {/* mirrored reflection + glossy floor */}
      <group scale={[1, -1, 1]}><Bottle spin={spin} label={label} liquid={liquid} cap={cap} sweep={sweep} sweepIntensity={sweepIntensity} /></group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[30, 64]} />
        {/* unlit dark glass floor: the mirrored product below shows through = clean studio reflection, no fresnel wash */}
        <meshBasicMaterial color={backdrop} transparent opacity={0.8} />
      </mesh>
      <Bloom strength={bloom} radius={0.3} threshold={0.95} />
    </ThreeCanvas>
  );
};
