import { useMemo } from 'react';
import { catmull, circlePath, outline } from '../lib/brush';
import type { Pt } from '../lib/pathSample';
import { f1, rng } from '../lib/rng';
import { DuotoneFilter, Grain, useUid } from './common';

/**
 * Original SVG "photography": a grainy night scene built from code (no external
 * images). Drawn in greyscale, then mapped to any duotone (mono, red, stone…).
 * An uploaded photo can replace it and goes through the exact same treatment.
 */
export type SceneKind = 'palms' | 'crowd' | 'horizon' | 'stage';

const W = 1200;
const H = 900;

function palm(bx: number, by: number, h: number, lean: number, seed: number) {
  const r = rng(seed);
  const top: Pt = [bx + lean * h, by - h];
  const ctrl: Pt[] = [
    [bx, by],
    [bx + lean * h * 0.25 + (r() - 0.5) * 20, by - h * 0.35],
    [bx + lean * h * 0.7, by - h * 0.75],
    top,
  ];
  const trunk = outline(catmull(ctrl, 16), (t) => 26 - 14 * t + Math.sin(t * 60) * 1.2);
  const fronds: string[] = [];
  const leaflets: string[] = [];
  const n = 9 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.9 + (r() - 0.5) * 0.25;
    const L = h * (0.28 + r() * 0.14);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const droop = L * (0.35 + r() * 0.35) * (Math.abs(dx) + 0.3);
    const pts = catmull(
      [
        top,
        [top[0] + dx * L * 0.45, top[1] + dy * L * 0.45 - L * 0.1],
        [top[0] + dx * L * 0.85, top[1] + dy * L * 0.8 + droop * 0.5],
        [top[0] + dx * L, top[1] + dy * L + droop],
      ],
      14,
    );
    fronds.push(outline(pts, (t) => 9 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 1));
    let d = '';
    for (let k = 3; k < pts.length - 1; k += 2) {
      const t = k / pts.length;
      const [x, y] = pts[k];
      const [x2, y2] = pts[k + 1];
      const ang = Math.atan2(y2 - y, x2 - x);
      const len = L * 0.22 * Math.sin(Math.PI * t) + 4;
      for (const side of [1, -1]) {
        const la = ang + side * 0.9 + 0.35;
        d += `M${f1(x)} ${f1(y)}L${f1(x + Math.cos(la) * len)} ${f1(y + Math.sin(la) * len + len * 0.35)}`;
      }
    }
    leaflets.push(d);
  }
  return { trunk, fronds, leaflets: leaflets.join('') };
}

function crowd(y0: number, scale: number, count: number, seed: number) {
  const r = rng(seed);
  let bodies = '';
  let arms = '';
  for (let i = 0; i < count; i++) {
    const x = (i / count) * (W + 80) - 40 + (r() - 0.5) * (W / count);
    const s = scale * (0.85 + r() * 0.3);
    const y = y0 + (r() - 0.5) * 18 * scale;
    const hr = 13 * s;
    bodies += circlePath(x, y, hr);
    const sw = 30 * s;
    const top = y + hr * 1.1;
    bodies += `M${f1(x - sw)} ${f1(H + 10)}L${f1(x - sw)} ${f1(top + 18 * s)}Q${f1(x - sw)} ${f1(top)} ${f1(x - sw * 0.4)} ${f1(top)}L${f1(x + sw * 0.4)} ${f1(top)}Q${f1(x + sw)} ${f1(top)} ${f1(x + sw)} ${f1(top + 18 * s)}L${f1(x + sw)} ${f1(H + 10)}Z`;
    if (r() < 0.22) {
      const side = r() < 0.5 ? -1 : 1;
      const ex = x + side * sw * 0.9;
      const hx = ex + side * (8 + r() * 26) * s;
      const hy = y - (40 + r() * 50) * s;
      arms += `M${f1(x + side * sw * 0.6)} ${f1(top + 8 * s)}L${f1(ex)} ${f1(top - 30 * s)}L${f1(hx)} ${f1(hy)}`;
    }
  }
  return { bodies, arms };
}

function Scene({ kind, seed, disc }: { kind: SceneKind; seed: number; disc?: boolean }) {
  const id = useUid('sc');
  const data = useMemo(() => {
    const r = rng(seed);
    const horizon = kind === 'horizon' ? H * 0.58 : H * 0.55;
    const palms =
      kind === 'palms' || kind === 'horizon'
        ? [
            palm(140 + r() * 60, H + 20, 560, 0.12, seed + 1),
            palm(330 + r() * 60, H + 20, 400, -0.08, seed + 2),
            palm(1000 + r() * 50, H + 20, 500, -0.14, seed + 3),
            ...(kind === 'palms' ? [palm(820, H + 20, 330, 0.1, seed + 4)] : []),
          ]
        : kind === 'stage'
          ? [palm(90, H + 20, 470, 0.14, seed + 5), palm(1120, H + 20, 440, -0.14, seed + 6)]
          : [];
    const rows =
      kind === 'crowd' || kind === 'stage'
        ? [crowd(H * 0.66, 0.7, 34, seed + 10), crowd(H * 0.74, 1.05, 22, seed + 11), crowd(H * 0.86, 1.7, 12, seed + 12)]
        : kind === 'palms'
          ? [crowd(H * 0.84, 0.9, 30, seed + 13), crowd(H * 0.92, 1.4, 16, seed + 14)]
          : [];
    const beams = Array.from({ length: kind === 'horizon' ? 0 : 7 }, (_, i) => {
      const a = -Math.PI / 2 + (i - 3) * 0.2 + (r() - 0.5) * 0.12;
      return { a, w: 0.03 + r() * 0.03, o: 0.25 + r() * 0.35 };
    });
    const reflections = Array.from({ length: 28 }, () => ({
      x: W * 0.5 + (r() - 0.5) * W * 0.5,
      y: horizon + 8 + r() * 120,
      w: 10 + r() * 90,
    }));
    return { horizon, palms, rows, beams, reflections };
  }, [kind, seed]);

  const src: Pt = [W * 0.52, data.horizon - 10];
  return (
    <g>
      <defs>
        <linearGradient id={id + 'sky'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141414" />
          <stop offset="0.55" stopColor="#4a4a4a" />
          <stop offset="1" stopColor="#111" />
        </linearGradient>
        <radialGradient id={id + 'glow'} cx={src[0] / W} cy={src[1] / H} r="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.25" stopColor="#bbb" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id + 'beam'} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={id + 'blur'} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}sky)`} />
      <rect width={W} height={H} fill={`url(#${id}glow)`} />
      {disc && <circle cx={W * 0.68} cy={data.horizon - 120} r={70} fill="#d8d8d8" opacity={0.9} />}
      <g filter={`url(#${id}blur)`}>
        {data.beams.map((b, i) => {
          const L = 1100;
          const x1 = src[0] + Math.cos(b.a - b.w) * L;
          const y1 = src[1] + Math.sin(b.a - b.w) * L;
          const x2 = src[0] + Math.cos(b.a + b.w) * L;
          const y2 = src[1] + Math.sin(b.a + b.w) * L;
          return <path key={i} d={`M${src[0]} ${src[1]}L${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}Z`} fill={`url(#${id}beam)`} opacity={b.o} />;
        })}
      </g>
      <rect y={data.horizon} width={W} height={H - data.horizon} fill="#0b0b0b" />
      <g stroke="#cfcfcf" strokeLinecap="round" opacity={0.55}>
        {data.reflections.map((r, i) => (
          <line key={i} x1={r.x - r.w / 2} x2={r.x + r.w / 2} y1={r.y} y2={r.y} strokeWidth={1.5 + (r.y - data.horizon) / 60} />
        ))}
      </g>
      <line x1={0} x2={W} y1={data.horizon} y2={data.horizon} stroke="#9a9a9a" strokeWidth={1.5} />
      {kind === 'stage' && (
        <g fill="#050505">
          <rect x={W * 0.3} y={data.horizon - 150} width={W * 0.44} height={8} />
          <rect x={W * 0.3} y={data.horizon - 150} width={8} height={170} />
          <rect x={W * 0.74 - 8} y={data.horizon - 150} width={8} height={170} />
          <rect x={W * 0.26} y={data.horizon + 10} width={W * 0.52} height={40} />
        </g>
      )}
      {data.palms.map((p, i) => (
        <g key={i} fill="#030303">
          <path d={p.trunk} />
          {p.fronds.map((f, k) => (
            <path key={k} d={f} />
          ))}
          <path d={p.leaflets} fill="none" stroke="#030303" strokeWidth={3.2} strokeLinecap="round" />
        </g>
      ))}
      {data.rows.map((row, i) => (
        <g key={i} opacity={0.75 + i * 0.12}>
          <path d={row.bodies} fill={i === 0 ? '#151515' : '#050505'} />
          <path d={row.arms} fill="none" stroke={i === 0 ? '#151515' : '#050505'} strokeWidth={9 + i * 5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
    </g>
  );
}

export interface PhotoProps {
  x?: number;
  y?: number;
  width: number;
  height: number;
  kind?: SceneKind;
  src?: string | null;
  shadow?: string;
  light?: string;
  grain?: number;
  seed?: number;
  disc?: boolean;
  clipPath?: string;
}

/** A photograph slot: uploaded image if present, otherwise the SVG night scene. */
export function Photo({ x = 0, y = 0, width, height, kind = 'palms', src, shadow = '#0c0c0b', light = '#ece6da', grain = 0.6, seed = 11, disc, clipPath }: PhotoProps) {
  const id = useUid('ph');
  return (
    <svg x={x} y={y} width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="hidden">
      <defs>
        <DuotoneFilter id={id + 'd'} shadow={shadow} light={light} />
        {clipPath && (
          <clipPath id={id + 'c'}>
            <path d={clipPath} />
          </clipPath>
        )}
      </defs>
      <g clipPath={clipPath ? `url(#${id}c)` : undefined}>
        <g filter={`url(#${id}d)`}>
          {src ? (
            <image href={src} width={width} height={height} preserveAspectRatio="xMidYMid slice" />
          ) : (
            <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
              <Scene kind={kind} seed={seed} disc={disc} />
            </svg>
          )}
        </g>
        <Grain width={width} height={height} amount={grain} color={light} freq={1.1} mottle={false} seed={seed} />
      </g>
    </svg>
  );
}
