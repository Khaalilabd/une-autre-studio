/**
 * The UNE AUTRE ? ring logo, set on a circle with a small open dot on the left.
 */
import { useMemo, type ReactNode } from 'react';
import { splitBrand } from '../data/content';
import { FONT } from '../lib/fonts';
import { measure } from '../lib/measure';
import { f1 } from '../lib/rng';

export interface RingGlyph {
  ch: string;
  x: number;
  y: number;
  rot: number;
  size: number;
}

/** Positions of every glyph for a ring of radius R (letter centres on R), cap height `cap`. */
export function ringLayout(brand: string, R: number, cap: number, fontFamily = "'Fredoka'", fontWeight = 700, trackingRatio = 0.1, centerQuestion = false) {
  const { words, question } = splitBrand(brand);
  const top = (words[0] ?? '').toUpperCase();
  const bottom = words.slice(1).join(' ').toUpperCase();
  const size = cap / 0.7;
  const font = { family: fontFamily, size, weight: fontWeight };
  const track = size * trackingRatio;
  const jitter = [-7, 5, -3, 6, -5, 4, -6, 3];
  const out: RingGlyph[] = [];
  const place = (word: string, centreDeg: number, outward: boolean) => {
    const ws = [...word].map((c) => measure(c, font) + track);
    const total = ws.reduce((a, b) => a + b, 0) - track;
    let s = -total / 2;
    [...word].forEach((ch, i) => {
      const mid = s + ws[i] / 2 - track / 2;
      s += ws[i];
      const a = ((centreDeg + ((outward ? 1 : -1) * mid * 180) / (Math.PI * R)) * Math.PI) / 180;
      const rot = (a * 180) / Math.PI + (outward ? 90 : -90) + jitter[(i + (outward ? 0 : 3)) % jitter.length] * 0.6;
      out.push({ ch, x: Math.cos(a) * R, y: Math.sin(a) * R, rot, size });
    });
  };
  place(top, -104, true);
  if (bottom) place(bottom, 96, false);
  if (question) {
    const angle = centerQuestion ? 0 : (-12 * Math.PI) / 180;
    const radius = centerQuestion ? 0 : R * 1.02;
    out.push({ ch: '?', x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, rot: centerQuestion ? 0 : 8, size: size * 1.32 });
  }
  return { glyphs: out, size };
}

interface RingProps {
  brand: string;
  cx: number;
  cy: number;
  R: number;
  cap?: number;
  stroke?: string;
  fill?: string;
  /** outline width, in px */
  weight?: number;
  /** extra content drawn per glyph (e.g. animations), receives the glyph index */
  perGlyph?: (i: number, g: RingGlyph) => ReactNode;
  children?: ReactNode;
  dot?: boolean;
  fontFamily?: string;
  fontWeight?: number;
  tracking?: number;
  centerQuestion?: boolean;
}

/** One ring of lettering. Put animations for the whole ring in `children`. */
export function RingLogo({
  brand,
  cx,
  cy,
  R,
  cap = R * 0.46,
  stroke = '#ff1a1a',
  fill = 'none',
  weight = R * 0.022,
  perGlyph,
  children,
  dot = true,
  fontFamily = FONT.round,
  fontWeight = 700,
  tracking = 0.1,
  centerQuestion = false,
}: RingProps) {
  const lay = useMemo(() => ringLayout(brand, R, cap, fontFamily, fontWeight, tracking, centerQuestion), [brand, R, cap, fontFamily, fontWeight, tracking, centerQuestion]);
  return (
    <g transform={`translate(${f1(cx)} ${f1(cy)})`}>
      <g>
        {children}
        <g fontFamily={fontFamily} fontWeight={fontWeight} textAnchor="middle" fill={fill} stroke={stroke} strokeWidth={weight} strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>
          {lay.glyphs.map((g, i) => (
            <g key={i} transform={`translate(${f1(g.x)} ${f1(g.y)}) rotate(${f1(g.rot)})`}>
              {perGlyph?.(i, g)}
              <text y={g.size * 0.35} fontSize={f1(g.size)}>
                {g.ch}
              </text>
            </g>
          ))}
        </g>
        {dot && <circle cx={-R * 1.0} cy={-R * 0.2} r={cap * 0.16} fill={fill} stroke={stroke} strokeWidth={weight} />}
      </g>
    </g>
  );
}
