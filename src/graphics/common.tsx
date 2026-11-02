import { useId, type ReactNode } from 'react';

/** Filter/gradient ids must be unique per SVG instance (many posters share a page). */
export function useUid(prefix = 'u') {
  return prefix + useId().replace(/[^a-zA-Z0-9]/g, '');
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Rough text width estimate (no DOM needed) so editable content never overflows. */
export const ADVANCE = { mono: 0.6, ui: 0.58, serif: 0.5, serifCaps: 0.68, condensed: 0.43, display: 0.72, sans: 0.58, sansCaps: 0.66 } as const;

export function fit(text: string, maxWidth: number, size: number, advance: number, tracking = 0) {
  const n = Math.max(1, [...text].length);
  const w = n * (advance * size + tracking);
  return w > maxWidth ? Math.max(6, (size * maxWidth) / w) : size;
}

/**
 * Paper / film grain. `amount` 0..1. Renders a filter + a rect covering the given area.
 * Dark specks for light grounds, light specks for dark grounds.
 */
export function Grain({
  width,
  height,
  amount,
  color = '#000',
  freq = 0.9,
  seed = 3,
  mottle = true,
}: {
  width: number;
  height: number;
  amount: number;
  color?: string;
  freq?: number;
  seed?: number;
  mottle?: boolean;
}) {
  const id = useUid('grain');
  if (amount <= 0.001) return null;
  const [r, g, b] = hexToRgb(color).map((v) => v / 255);
  return (
    <g pointerEvents="none">
      <defs>
        <filter id={id + 'f'} x="0" y="0" width={width} height={height} filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 2.4 0 0 0 -1.15`} />
        </filter>
        {mottle && (
          <filter id={id + 'm'} x="0" y="0" width={width} height={height} filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" baseFrequency={0.0035} numOctaves={3} seed={seed + 7} />
            <feColorMatrix type="matrix" values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 1.4 0 0 0 -0.62`} />
          </filter>
        )}
      </defs>
      {mottle && <rect width={width} height={height} filter={`url(#${id}m)`} opacity={amount * 0.55} />}
      <rect width={width} height={height} filter={`url(#${id}f)`} opacity={Math.min(1, amount * 0.9)} />
    </g>
  );
}

/** Maps luminance onto a two-colour ramp (shadow → highlight). */
export function DuotoneFilter({ id, shadow, light, contrast = 1.15 }: { id: string; shadow: string; light: string; contrast?: number }) {
  const s = hexToRgb(shadow).map((v) => v / 255);
  const l = hexToRgb(light).map((v) => v / 255);
  const c = contrast;
  const o = (1 - c) / 2;
  return (
    <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
      <feColorMatrix type="matrix" values={`0.3 0.59 0.11 0 0 0.3 0.59 0.11 0 0 0.3 0.59 0.11 0 0 0 0 0 1 0`} />
      <feComponentTransfer>
        <feFuncR type="linear" slope={c} intercept={o} />
        <feFuncG type="linear" slope={c} intercept={o} />
        <feFuncB type="linear" slope={c} intercept={o} />
      </feComponentTransfer>
      <feComponentTransfer>
        <feFuncR type="table" tableValues={`${s[0]} ${l[0]}`} />
        <feFuncG type="table" tableValues={`${s[1]} ${l[1]}`} />
        <feFuncB type="table" tableValues={`${s[2]} ${l[2]}`} />
      </feComponentTransfer>
    </filter>
  );
}

/** Multi-line <text>; `lh` = line height in px. */
export function Lines({
  x,
  y,
  lines,
  lh,
  anchor = 'start',
  ...rest
}: {
  x: number;
  y: number;
  lines: string[];
  lh: number;
  anchor?: 'start' | 'middle' | 'end';
  fill?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fontStyle?: string;
  letterSpacing?: number | string;
  opacity?: number;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} {...rest}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

export function Frame({ children, width, height, bg, label }: { children: ReactNode; width: number; height: number; bg: string; label?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
      <rect width={width} height={height} fill={bg} />
      {children}
    </svg>
  );
}
