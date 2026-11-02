/**
 * Procedural brush engine: turns centre-lines into filled, variable-width
 * outlines (real vector shapes, exportable as SVG), plus ink splatter.
 */
import { Pt, strokesFromPath } from './pathSample';
import { f1, rng } from './rng';

export type WidthFn = (t: number, angle: number) => number;

const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Smooth closed path through polygon points (quadratic curves via midpoints). */
export function smoothClosed(p: Pt[]): string {
  if (p.length < 3) return '';
  const m0 = mid(p[p.length - 1], p[0]);
  let d = `M${f1(m0[0])} ${f1(m0[1])}`;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = mid(p[i], p[(i + 1) % p.length]);
    d += `Q${f1(a[0])} ${f1(a[1])} ${f1(b[0])} ${f1(b[1])}`;
  }
  return d + 'Z';
}

export function circlePath(x: number, y: number, r: number): string {
  return `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`;
}

/** Filled outline of a stroke following `pts` with width given by `widthFn(t, angle)`. */
export function outline(pts: Pt[], widthFn: WidthFn): string {
  const n = pts.length;
  if (n < 2 || (n === 2 && Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) < 0.5)) {
    return circlePath(pts[0][0], pts[0][1], widthFn(0.5, 0) / 2);
  }
  const lens = [0];
  for (let i = 1; i < n; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[n - 1] || 1;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const angles: number[] = [];
  const widths: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const w = Math.max(0.3, widthFn(lens[i] / total, ang)) / 2;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    angles.push(ang);
    widths.push(w);
  }
  const capS: Pt = [pts[0][0] - Math.cos(angles[0]) * widths[0] * 0.9, pts[0][1] - Math.sin(angles[0]) * widths[0] * 0.9];
  const capE: Pt = [
    pts[n - 1][0] + Math.cos(angles[n - 1]) * widths[n - 1] * 0.9,
    pts[n - 1][1] + Math.sin(angles[n - 1]) * widths[n - 1] * 0.9,
  ];
  return smoothClosed([...left, capE, ...right.reverse(), capS]);
}

/** Centripetal-ish Catmull-Rom through control points. */
export function catmull(ctrl: Pt[], samples = 20): Pt[] {
  if (ctrl.length < 3) return ctrl;
  const out: Pt[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

function smoothNoise(seed: number) {
  const r = rng(seed);
  const waves = Array.from({ length: 4 }, (_, k) => ({ f: (k + 1) * (2 + r() * 3), p: r() * Math.PI * 2, a: 1 / (k + 1.5) }));
  return (t: number) => waves.reduce((s, w) => s + Math.sin(t * w.f + w.p) * w.a, 0) / 1.6;
}

export interface Swash {
  body: string;
  streaks: { d: string; w: number; dash: string }[];
}

/** An expressive brush sweep: tapered, uneven body plus dry-brush streaks. */
export function brushSwash(
  ctrl: Pt[],
  width: number,
  seed: number,
  opts: { taperIn?: number; taperOut?: number; rough?: number; streaks?: number } = {},
): Swash {
  const { taperIn = 0.12, taperOut = 0.35, rough = 0.25, streaks = 6 } = opts;
  const pts = catmull(ctrl, 24);
  const noise = smoothNoise(seed);
  const profile = (t: number) => {
    const a = Math.min(1, t / taperIn);
    const b = Math.min(1, (1 - t) / taperOut);
    const taper = Math.sin((Math.min(a, b) * Math.PI) / 2);
    return width * (0.08 + 0.92 * taper) * (1 + rough * noise(t * 3));
  };
  const body = outline(pts, (t) => profile(t));
  const r = rng(seed + 99);
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[lens.length - 1];
  const out: Swash['streaks'] = [];
  for (let s = 0; s < streaks; s++) {
    const off = (r() - 0.5) * 0.8;
    const t0 = 0.45 + r() * 0.4;
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const t = lens[i] / total;
      if (t < t0) continue;
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const w = profile(t) * off;
      const x = pts[i][0] - Math.sin(ang) * w;
      const y = pts[i][1] + Math.cos(ang) * w;
      d += `${d ? 'L' : 'M'}${f1(x)} ${f1(y)}`;
    }
    const seg = 30 + r() * 140;
    out.push({ d, w: 0.5 + r() * width * 0.025, dash: `${f1(seg)} ${f1(8 + r() * 30)} ${f1(seg * 0.3)} ${f1(20 + r() * 60)}` });
  }
  return { body, streaks: out };
}

export interface Drop {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
}

/** Ink splatter around a point: a few heavy drops close by, a spray of fine ones further out. */
export function splatter(cx: number, cy: number, spread: number, count: number, seed: number, size = 1): Drop[] {
  const r = rng(seed);
  const drops: Drop[] = [];
  for (let i = 0; i < count; i++) {
    const ang = r() * Math.PI * 2;
    const dist = Math.pow(r(), 0.7) * spread;
    const big = 1 - dist / spread;
    const rad = (0.6 + Math.pow(r(), 3) * 9 * big + big * 2) * size;
    const stretch = 1 + r() * 2.2 * (dist / spread);
    drops.push({
      x: cx + Math.cos(ang) * dist,
      y: cy + Math.sin(ang) * dist,
      rx: rad * stretch,
      ry: rad,
      rot: (ang * 180) / Math.PI,
    });
  }
  return drops;
}

/** Calligraphic (broad-nib) rendering of a monoline glyph path. */
export function nibStrokes(d: string, base: number, nibDeg: number, seed: number, minRatio = 0.28): string[] {
  const nib = (nibDeg * Math.PI) / 180;
  return strokesFromPath(d, 55, 3).map((pts, k) => {
    const noise = smoothNoise(seed + k * 13);
    return outline(pts, (t, ang) => {
      const angular = minRatio + (1 - minRatio) * Math.abs(Math.sin(ang - nib));
      const pressure = 0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, t * 1.4));
      return base * angular * pressure * (1 + 0.12 * noise(t * 4));
    });
  });
}
