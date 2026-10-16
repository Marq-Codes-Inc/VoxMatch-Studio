// src/components/panels/timeline/constants.ts

export const TIMELINE_TRACK_TOP = 48;
export const TRACK_HEIGHT = 56;
export const RULER_HEIGHT = 40;

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function timeToPercent(time: number, duration: number) {
  return duration ? (time / duration) * 100 : 0;
}

export function getNiceInterval(secondsPerPixel: number, minPx = 80) {
  const target = secondsPerPixel * minPx;
  const bases = [1, 2, 5];
  let pow = Math.pow(10, Math.floor(Math.log10(target || 1)));
  for (let k = 0; k < 100; k++) {
    for (const b of bases) {
      const candidate = b * pow;
      if (candidate >= target) return candidate;
    }
    pow *= 10;
  }
  return target || 1;
}
