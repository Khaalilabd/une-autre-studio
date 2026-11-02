/** Measures text with the real (already loaded) web fonts through a canvas context. */
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

export function measure(text: string, font: { family: string; size: number; weight?: number; italic?: boolean; tracking?: number }): number {
  const key = `${font.family}|${font.size}|${font.weight ?? 400}|${font.italic ? 1 : 0}|${font.tracking ?? 0}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (!ctx && typeof document !== 'undefined') ctx = document.createElement('canvas').getContext('2d');
  let w: number;
  if (ctx) {
    ctx.font = `${font.italic ? 'italic ' : ''}${font.weight ?? 400} ${font.size}px ${font.family}`;
    w = ctx.measureText(text).width;
  } else {
    w = text.length * font.size * 0.55;
  }
  w += Math.max(0, [...text].length - 1) * (font.tracking ?? 0);
  cache.set(key, w);
  return w;
}

/** Largest font size (≤ size) so that text fits in maxWidth. */
export function fitMeasured(text: string, maxWidth: number, font: { family: string; size: number; weight?: number; italic?: boolean; tracking?: number }) {
  const w = measure(text, font);
  return w > maxWidth ? (font.size * maxWidth) / w : font.size;
}

export const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
