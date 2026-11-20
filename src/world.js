import { createNoise2D } from 'simplex-noise';

export const W = 960;
export const H = 600;
export const SURFACE = 250;
export const DOCK_X = 190;
export const ROD_TIP = { x: 214, y: 112 };
export const LAKE_FLOOR = 585;
export const MAX_DEPTH_PX = LAKE_FLOOR - SURFACE;

// Seeded so scenery and waves are identical every load and in tests.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const noise2D = createNoise2D(mulberry32(1337));

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Lakebed height: shallow by the dock, deep far out. */
export function bottomAt(x) {
  const k = clamp((x - DOCK_X) / (W - DOCK_X), 0, 1);
  return 360 + Math.pow(k, 0.7) * (LAKE_FLOOR - 360) + Math.sin(x * 0.02) * 6;
}

export const depthOf = (y) => clamp((y - SURFACE) / MAX_DEPTH_PX, 0, 1);
export const yForDepth = (d) => SURFACE + d * MAX_DEPTH_PX;

let waveAmp = 2.5;
export const setWaveAmp = (a) => { waveAmp = a; };
export const getWaveAmp = () => waveAmp;

export function surfaceY(x, t) {
  return SURFACE + noise2D(x * 0.006, t * 0.35) * waveAmp + Math.sin(x * 0.035 + t * 2.2) * waveAmp * 0.35;
}
