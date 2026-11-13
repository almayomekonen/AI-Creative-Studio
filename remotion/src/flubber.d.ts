declare module "flubber" { export function interpolate(a: string, b: string, opts?: { maxSegmentLength?: number; string?: boolean }): (t: number) => string; }
