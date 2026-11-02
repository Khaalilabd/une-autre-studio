/**
 * Generative primitives used by directions 07–12: halftone screens, ridgelines,
 * guilloche rosettes, torn paper. Everything is plain SVG path data.
 */
import { circlePath } from './brush';
import { strokesFromPath, type Pt } from './pathSample';
import { f1, rng } from './rng';
import { QUESTION_GLYPH } from './strokeFont';

export function pathPoints(d: string, step = 2): Pt[] {
  return strokesFromPath(d, 999, step).flat();
}

/** Skeleton of the "?" (Trajet alphabet, box 56 × 100). */
export const Q_POINTS = pathPoints(QUESTION_GLYPH.d, 1.5);
export const Q_BOX = { w: 56, h: 100 };

export function distTo(x: number, y: number, pts: Pt[]) {
  let m = Infinity;
  for (const [px, py] of pts) {
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < m) m = d;
  }
  return Math.sqrt(m);
}

/** 0..1 field: 1 on the "?" skeleton, fading to 0 at `thickness` px. Centre (cx, cy), glyph height `h`. */
export function questionField(cx: number, cy: number, h: number, thickness: number) {
  const s = h / Q_BOX.h;
  return (x: number, y: number) => {
    const gx = (x - cx) / s + Q_BOX.w / 2;
    const gy = (y - cy) / s + Q_BOX.h / 2;
    const d = distTo(gx, gy, Q_POINTS) * s;
    const k = 1 - d / thickness;
    return k <= 0 ? 0 : Math.pow(Math.min(1, k), 0.7);
  };
}

export interface Dot {
  x: number;
  y: number;
  r: number;
}

/** Rotated halftone screen: dot radius follows `fn(x, y)` (0..1). */
export function halftone(w: number, h: number, cell: number, fn: (x: number, y: number) => number, angleDeg = 15, x0 = 0, y0 = 0): Dot[] {
  const a = (angleDeg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const R = Math.hypot(w, h);
  const cxm = x0 + w / 2;
  const cym = y0 + h / 2;
  const dots: Dot[] = [];
  for (let i = -R / 2; i <= R / 2; i += cell) {
    for (let j = -R / 2; j <= R / 2; j += cell) {
      const x = cxm + i * ca - j * sa;
      const y = cym + i * sa + j * ca;
      if (x < x0 - cell || x > x0 + w + cell || y < y0 - cell || y > y0 + h + cell) continue;
      const v = fn(x, y);
      if (v > 0.03) dots.push({ x, y, r: cell * 0.62 * Math.min(1, v) });
    }
  }
  return dots;
}

export const dotsPath = (dots: Dot[]) => dots.map((d) => circlePath(d.x, d.y, d.r)).join('');

/** "Unknown Pleasures" ridgelines. Returns closed fills (for occlusion) + strokes, back to front. */
export function ridgelines(
  x0: number,
  w: number,
  top: number,
  bottom: number,
  count: number,
  amp: (x: number, y: number) => number,
  seed: number,
  samples = 140,
) {
  const r = rng(seed);
  const out: { fill: string; line: string }[] = [];
  for (let i = 0; i < count; i++) {
    const y0 = top + ((bottom - top) * i) / (count - 1);
    const waves = Array.from({ length: 5 }, () => ({ f: 0.01 + r() * 0.05, p: r() * 10, a: 0.3 + r() * 0.7 }));
    const pts: Pt[] = [];
    for (let k = 0; k <= samples; k++) {
      const x = x0 + (w * k) / samples;
      let n = 0;
      for (const v of waves) n += Math.sin(x * v.f + v.p) * v.a;
      n = Math.max(0, n / 2.2 + 0.25 + (r() - 0.5) * 0.25);
      pts.push([x, y0 - amp(x, y0) * n]);
    }
    const line = 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
    out.push({ line, fill: `${line}L${f1(x0 + w)} ${f1(bottom + 40)}L${f1(x0)} ${f1(bottom + 40)}Z` });
  }
  return out;
}

/** Guilloche rosette (epitrochoid family), `copies` rotated copies. */
export function rosette(cx: number, cy: number, R: number, r: number, d: number, copies = 1, steps = 1400) {
  const paths: string[] = [];
  const k = (R + r) / r;
  const turns = Math.round(r) / gcd(Math.round(R), Math.round(r));
  for (let c = 0; c < copies; c++) {
    const rot = (c / copies) * ((2 * Math.PI) / Math.max(1, Math.round(k)));
    let s = '';
    const T = 2 * Math.PI * Math.min(turns, 12);
    for (let i = 0; i <= steps; i++) {
      const t = (T * i) / steps;
      const x = (R + r) * Math.cos(t) - d * Math.cos(k * t);
      const y = (R + r) * Math.sin(t) - d * Math.sin(k * t);
      const xr = cx + x * Math.cos(rot) - y * Math.sin(rot);
      const yr = cy + x * Math.sin(rot) + y * Math.cos(rot);
      s += `${i ? 'L' : 'M'}${f1(xr)} ${f1(yr)}`;
    }
    paths.push(s);
  }
  return paths;
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : Math.max(1, a);
}

/** Interleaved sine band, like the border of a banknote. */
export function waveBand(x0: number, x1: number, y: number, amp: number, period: number, lines: number, steps = 220) {
  const out: string[] = [];
  for (let l = 0; l < lines; l++) {
    const ph = (l / lines) * Math.PI * 2;
    let s = '';
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const yy = y + Math.sin((x / period) * Math.PI * 2 + ph) * amp * (0.6 + 0.4 * Math.cos(ph));
      s += `${i ? 'L' : 'M'}${f1(x)} ${f1(yy)}`;
    }
    out.push(s);
  }
  return out;
}

/** Rectangle with torn / jagged edges. */
export function tornRect(x: number, y: number, w: number, h: number, seed: number, rough = 6, step = 14) {
  const r = rng(seed);
  const pts: Pt[] = [];
  const edge = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(2, Math.round(len / step));
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const j = (r() - 0.5) * rough * 2;
      pts.push([ax + (bx - ax) * t + nx * j, ay + (by - ay) * t + ny * j]);
    }
  };
  edge(x, y, x + w, y);
  edge(x + w, y, x + w, y + h);
  edge(x + w, y + h, x, y + h);
  edge(x, y + h, x, y);
  return 'M' + pts.map(([px, py]) => `${f1(px)} ${f1(py)}`).join('L') + 'Z';
}
