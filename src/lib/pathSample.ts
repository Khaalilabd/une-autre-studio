/**
 * Minimal SVG path sampler for the absolute commands used by our own glyph
 * drawings (M L H V C Q Z). Returns polylines split at sharp corners so that
 * each part can be re-drawn as an independent brush stroke.
 */
export type Pt = [number, number];

const TOKEN = /([MLHVCQZ])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function quad(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Each subpath becomes a list of segments; each segment is a sampled polyline. */
export function samplePath(d: string, step = 4): Pt[][][] {
  const tokens = [...d.matchAll(TOKEN)].map((m) => m[0]);
  const subpaths: Pt[][][] = [];
  let current: Pt[][] = [];
  let pos: Pt = [0, 0];
  let start: Pt = [0, 0];
  let i = 0;
  let cmd = '';
  const num = () => parseFloat(tokens[i++]);
  const line = (to: Pt) => {
    const n = Math.max(2, Math.ceil(dist(pos, to) / step));
    const seg: Pt[] = [];
    for (let k = 0; k <= n; k++) seg.push([pos[0] + ((to[0] - pos[0]) * k) / n, pos[1] + ((to[1] - pos[1]) * k) / n]);
    current.push(seg);
    pos = to;
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    switch (cmd) {
      case 'M': {
        if (current.length) subpaths.push(current);
        current = [];
        pos = [num(), num()];
        start = pos;
        cmd = 'L';
        break;
      }
      case 'L':
        line([num(), num()]);
        break;
      case 'H':
        line([num(), pos[1]]);
        break;
      case 'V':
        line([pos[0], num()]);
        break;
      case 'C': {
        const p1: Pt = [num(), num()];
        const p2: Pt = [num(), num()];
        const p3: Pt = [num(), num()];
        const len = dist(pos, p1) + dist(p1, p2) + dist(p2, p3);
        const n = Math.max(6, Math.ceil(len / step));
        const seg: Pt[] = [];
        for (let k = 0; k <= n; k++) seg.push(cubic(pos, p1, p2, p3, k / n));
        current.push(seg);
        pos = p3;
        break;
      }
      case 'Q': {
        const p1: Pt = [num(), num()];
        const p2: Pt = [num(), num()];
        const n = Math.max(6, Math.ceil((dist(pos, p1) + dist(p1, p2)) / step));
        const seg: Pt[] = [];
        for (let k = 0; k <= n; k++) seg.push(quad(pos, p1, p2, k / n));
        current.push(seg);
        pos = p2;
        break;
      }
      case 'Z':
        if (dist(pos, start) > 0.01) line(start);
        cmd = '';
        break;
      default:
        i++;
    }
  }
  if (current.length) subpaths.push(current);
  return subpaths;
}

/** Joins segments into continuous strokes, breaking wherever direction turns sharply. */
export function strokesFromPath(d: string, cornerDeg = 55, step = 4): Pt[][] {
  const out: Pt[][] = [];
  for (const sub of samplePath(d, step)) {
    let stroke: Pt[] = [];
    for (const seg of sub) {
      if (stroke.length >= 2 && seg.length >= 2) {
        const a = stroke[stroke.length - 2];
        const b = stroke[stroke.length - 1];
        const c = seg[1];
        const a1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
        let diff = Math.abs(a2 - a1);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if ((diff * 180) / Math.PI > cornerDeg) {
          out.push(stroke);
          stroke = [];
        }
      }
      stroke = stroke.length ? stroke.concat(seg.slice(1)) : seg.slice();
    }
    if (stroke.length) out.push(stroke);
  }
  return out;
}
