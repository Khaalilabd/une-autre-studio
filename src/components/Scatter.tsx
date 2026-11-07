/**
 * Scattered name — the letters of UNE AUTRE ? hung one by one: each at its own
 * height, size and tilt, a loose arc, now and then a letter dropping lower,
 * capitals and small letters mixed, lit like neon.
 */

type Ctx2 = CanvasRenderingContext2D;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const rnd = (i: number, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7 + 0.5) * 43758.5453;
  return v - Math.floor(v);
};
const hex = (h: string) => {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgba = (h: string, a: number) => {
  const c = hex(h);
  return `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;
};
export const whiten = (h: string, k: number, a = 1) => {
  const c = hex(h).map((v) => Math.round(v + (255 - v) * k));
  return `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;
};

interface Placed {
  ch: string;
  x: number;
  y: number;
  s: number;
  rot: number;
  i: number;
}

/** positions in units of the letter height (1 = h px) */
export function scatter(text: string, seed: number, spread = 1) {
  const out: Placed[] = [];
  const chars = [...text];
  const n = chars.filter((c) => c !== ' ').length;
  let x = 0;
  let i = 0;
  for (const raw of chars) {
    if (raw === ' ') {
      x += 0.42;
      continue;
    }
    const s = 0.8 + rnd(i + 3, seed) * 0.45;
    const drop = rnd(i + 7, seed) > 0.84 ? 0.5 + rnd(i + 8, seed) * 0.25 : 0;
    const arc = Math.sin((i / Math.max(1, n - 1)) * Math.PI) * -0.22;
    const up = raw === '?' ? 0 : rnd(i + 5, seed) > 0.5;
    const ch = raw === '?' ? '?' : up ? raw.toUpperCase() : raw.toLowerCase();
    out.push({
      ch,
      x: x + (s * 0.62) / 2,
      y: (arc + (rnd(i + 11, seed) - 0.5) * 0.5 + drop) * spread,
      s,
      rot: ((rnd(i + 13, seed) - 0.5) * 44 + (drop ? 28 : 0)) * spread,
      i,
    });
    x += s * 0.62 + 0.12 + rnd(i + 17, seed) * 0.16;
    i++;
  }
  const w = Math.max(0, x - 0.12);
  for (const p of out) p.x -= w / 2;
  return { items: out, width: w };
}

export interface ScatterOpts {
  seed: number;
  color: string;
  glow?: number;
  spread?: number;
  lit?: (i: number) => number;
  /** plain filled letters, no light (for dark text on light backgrounds) */
  flat?: boolean;
}

/** draw the scattered word centred on (cx, cy); h = letter height in px */
export function drawScattered(ctx: Ctx2, text: string, cx: number, cy: number, h: number, o: ScatterOpts) {
  const { items } = scatter(text, o.seed, o.spread ?? 1);
  const glow = o.glow ?? 1;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of items) {
    const b = clamp(o.lit ? o.lit(p.i) : 1);
    ctx.save();
    ctx.translate(cx + p.x * h, cy + p.y * h);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.font = `600 ${h * p.s}px Fredoka`;
    if (o.flat) {
      ctx.fillStyle = o.color;
      ctx.fillText(p.ch, 0, 0);
    } else {
      // unlit tube, then two glows, then the hot core
      ctx.fillStyle = 'rgba(70,60,70,0.35)';
      ctx.fillText(p.ch, 0, 0);
      if (b > 0.01) {
        ctx.shadowColor = rgba(o.color, b);
        ctx.fillStyle = rgba(o.color, b);
        ctx.shadowBlur = h * 0.5 * glow;
        ctx.fillText(p.ch, 0, 0);
        ctx.shadowBlur = h * 0.14 * glow;
        ctx.fillText(p.ch, 0, 0);
        ctx.shadowBlur = 0;
        ctx.fillStyle = whiten(o.color, 0.35, b);
        ctx.fillText(p.ch, 0, 0);
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

/** largest letter height so the scattered word fits in maxW */
export const fitScatter = (text: string, seed: number, maxW: number, maxH: number) => Math.min(maxH, maxW / Math.max(0.1, scatter(text, seed).width));
