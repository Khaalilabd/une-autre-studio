/**
 * Shared toolkit for the "Anneau" family (13–17), derived from the existing
 * UNE AUTRE ? mark: hollow outlined capitals, set on circles, open dots.
 */
import type { ReactNode } from 'react';
import { FONT } from '../lib/fonts';
import { measure } from '../lib/measure';
import { f1, rng } from '../lib/rng';
import { useUid } from './common';

export const OUT_FAMILY = "'General Sans'";
export const OUT_WEIGHT = 700;

export const capW = (ch: string, size: number) => measure(ch, { family: OUT_FAMILY, size, weight: OUT_WEIGHT });

export interface ArcGlyph {
  ch: string;
  x: number;
  y: number;
  rot: number;
}

/**
 * Places letters along a circle. `side: 'top'` reads clockwise with tops outward;
 * `side: 'bottom'` reads left-to-right along the bottom with tops toward the centre.
 */
export function arcLayout(text: string, size: number, r: number, centerDeg: number, side: 'top' | 'bottom', tracking = 0.08, fill360 = false): ArcGlyph[] {
  const chars = [...text];
  const widths = chars.map((c) => (c === ' ' ? size * 0.32 : capW(c, size)));
  let gap = size * tracking;
  let total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  if (fill360) {
    const C = 2 * Math.PI * r;
    gap += (C - total - gap) / chars.length;
    total = C - gap;
  }
  const span = total / r;
  const c0 = (centerDeg * Math.PI) / 180;
  const out: ArcGlyph[] = [];
  let acc = 0;
  chars.forEach((ch, i) => {
    const mid = (acc + widths[i] / 2) / r;
    const a = side === 'top' ? c0 - span / 2 + mid : c0 + span / 2 - mid;
    acc += widths[i] + gap;
    if (ch === ' ') return;
    out.push({ ch, x: Math.cos(a) * r, y: Math.sin(a) * r, rot: (a * 180) / Math.PI + (side === 'top' ? 90 : -90) });
  });
  return out;
}

/** Hollow capitals: outline only, round joins — the house style of the mark. */
export function OutlineGlyphs({
  glyphs,
  cx,
  cy,
  size,
  color,
  sw,
  fill = 'none',
  paint,
}: {
  glyphs: ArcGlyph[];
  cx: number;
  cy: number;
  size: number;
  color: string;
  sw: number;
  fill?: string;
  paint?: 'stroke';
}) {
  return (
    <g fontFamily={FONT.sans} fontWeight={OUT_WEIGHT} fontSize={size} fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" paintOrder={paint}>
      {glyphs.map((g, i) => (
        <text key={i} x={0} y={0} dy="0.36em" textAnchor="middle" transform={`translate(${f1(cx + g.x)} ${f1(cy + g.y)}) rotate(${f1(g.rot)})`}>
          {g.ch}
        </text>
      ))}
    </g>
  );
}

/** Straight line of glyphs (for wordmarks), with optional bounce. */
export function lineLayout(text: string, size: number, seed = 0, bounce = 0): { glyphs: ArcGlyph[]; width: number } {
  const r = rng(seed + 1);
  const chars = [...text];
  const gap = size * 0.06;
  let x = 0;
  const glyphs: ArcGlyph[] = [];
  for (const ch of chars) {
    const w = ch === ' ' ? size * 0.3 : capW(ch, size);
    if (ch !== ' ') glyphs.push({ ch, x: x + w / 2, y: bounce ? (r() - 0.5) * size * 0.22 * bounce : 0, rot: bounce ? (r() - 0.5) * 22 * bounce : 0 });
    x += w + gap;
  }
  return { glyphs, width: x - gap };
}

/** Soft neon glow around whatever it wraps (wide halo + tight glow + crisp core). */
export function Glow({ children, sw, strength = 1 }: { children: (w: number, op: number) => ReactNode; sw: number; strength?: number }) {
  const id = useUid('glow');
  return (
    <g>
      <defs>
        <filter id={id + 'a'} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={sw * 3.2 * strength} />
        </filter>
        <filter id={id + 'b'} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={sw * 0.9 * strength} />
        </filter>
      </defs>
      <g filter={`url(#${id}a)`} opacity={0.9}>
        {children(sw * 3, 1)}
      </g>
      <g filter={`url(#${id}b)`}>{children(sw * 1.6, 1)}</g>
      {children(sw, 1)}
    </g>
  );
}

/** Hand-drawn wobble: displaces strokes with low-frequency noise. */
export function Wobble({ children, amount = 5, seed = 2 }: { children: ReactNode; amount?: number; seed?: number }) {
  const id = useUid('wob');
  return (
    <g filter={`url(#${id})`}>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={amount} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {children}
    </g>
  );
}

/** Thin circular arc between two angles (degrees). */
export const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${f1(x0)} ${f1(y0)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}`;
};
