import type { ProductKind } from "../three/products";
import type { CameraMove, ProductMotion } from "../three/ProductScene";
import type { StageId, TransitionId } from "./styles";

/** A complete commercial = one JSON spec. The engine renders it; scripts derive every production document from it. */
export type CommercialSpec = {
  id: string;
  title: string;
  style: string;
  format: "vertical" | "landscape" | "square";
  fps: number;
  product: ProductKind;
  brand: { name: string; sub?: string; tagline: string; cta?: string; colorA?: string; colorB?: string };
  /** synth.py spec (bpm, bars, progression, sections) — music and edit share one clock. */
  music: { bpm: number; bars: number; progression: [string, string][]; barsPerChord?: number; sections: { name: string; startBar: number; bars: number; layers: string[]; energy: number; impact?: boolean }[] };
  voice?: string;
  /** subtitle:false when the same words are already on screen as type (never duplicate). */
  voiceover?: { id: string; atBeat: number; text: string; subtitle?: boolean }[];
  concept: ConceptDoc;
  scenes: SceneSpec[];
  tailFrames?: number;
};

export type ConceptDoc = {
  logline: string;
  bigIdea: string;
  hook: string;
  progression: string;
  ending: string;
  audience: string;
  routes: { name: string; idea: string; why: string; risk: string }[];
  chosen: string;
  rationale: string;
  scores?: Record<string, number>;
};

export type BlockId = "product" | "shader" | "particles" | "chrome" | "type" | "montage" | "endcard";
export type TypePreset = "slam" | "rise" | "blur" | "track" | "stack" | "typewriter" | "split" | "outline" | "glitch" | "giant";
export type TextPos = "center" | "upper" | "lower" | "top" | "bottom";

export type TextOverlay = {
  text: string;
  preset: TypePreset;
  /** beats from scene start */
  at?: number;
  until?: number;
  pos?: TextPos;
  /** px at a 1080-wide canvas */
  size?: number;
  font?: "display" | "serif" | "body" | "mono";
  color?: string;
  accent?: string;
  emphasize?: string[];
  kicker?: string;
};

export type SceneSpec = {
  id: string;
  beats: number;
  block: BlockId;
  props?: Record<string, unknown> & {
    camera?: CameraMove;
    motion?: ProductMotion;
    stage?: StageId;
  };
  /** Transition INTO this scene. */
  transition?: TransitionId;
  text?: TextOverlay[];
  vfx?: { kind: "shockwave" | "flash" | "sparks"; atBeat: number; color?: string }[];
  sfx?: { name: string; atBeat: number; volume?: number }[];
  direction: { intent: string; shot: string; camera: string; lens: string; lighting: string; sound: string; edit?: string };
};

export type Timeline = { scene: SceneSpec; index: number; start: number; dur: number; enterOv: number; exitOv: number }[];
