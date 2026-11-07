/**
 * Série spéciale 24–28 — « Matière vivante ». One sculpted object in a deep,
 * almost monochrome ground; crisp grotesk set on top of it. The object's
 * surface is the show (metal grain, pores, shards) and, in the animated cut,
 * it slowly mutates while the type stays perfectly still. Pure SVG: filters
 * for the matter, SMIL for the motion — the animated file plays on its own.
 */
import { useMemo, type FC, type ReactNode } from 'react';
import { lines, splitBrand } from '../data/content';
import type { Colors, ConceptDef, CreativeSettings, EventContent, LogoProps, PosterProps, Tone } from '../data/types';
import { hexToRgb, useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { RingLogo } from '../graphics/ringLogo';
import { catmull } from '../lib/brush';
import { FONT } from '../lib/fonts';
import { Q_BOX, Q_POINTS } from '../lib/generators';
import { fitMeasured, measure } from '../lib/measure';
import type { Pt } from '../lib/pathSample';
import { f1, rng } from '../lib/rng';
import { mix } from './scene';
import { HandLine, Glow, BrandHand, type Hand } from './main';

/* ======================================================================= */
/* motion + geometry helpers                                               */
/* ======================================================================= */

export const f3 = (n: number) => Math.round(n * 1000) / 1000;

/** Looping SMIL animation; values[0] is also the still frame, so static and animated posters match. */
export function Anim({ attr, values, dur, on, linear }: { attr: string; values: (string | number)[]; dur: number; on: boolean; linear?: boolean }) {
  if (!on) return null;
  const v = [...values, values[0]];
  const n = v.length - 1;
  return (
    <animate
      attributeName={attr}
      values={v.join(';')}
      keyTimes={v.map((_, i) => f3(i / n)).join(';')}
      {...(linear ? { calcMode: 'linear' } : { calcMode: 'spline', keySplines: Array(n).fill('0.45 0 0.55 1').join(';') })}
      dur={`${dur}s`}
      repeatCount="indefinite"
    />
  );
}

export function Spin({ cx, cy, dur, on, reverse }: { cx: number; cy: number; dur: number; on: boolean; reverse?: boolean }) {
  if (!on) return null;
  return <animateTransform attributeName="transform" type="rotate" from={`${reverse ? 360 : 0} ${cx} ${cy}`} to={`${reverse ? 0 : 360} ${cx} ${cy}`} dur={`${dur}s`} repeatCount="indefinite" />;
}

const pathOf = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
/** Open curve; same control count ⇒ same command count ⇒ SMIL can morph between keyframes. */
export const curve = (ctrl: Pt[], samples = 14) => pathOf(catmull(ctrl, samples));
/** Closed curve through the control points. */
function loop(ctrl: Pt[], samples = 14) {
  const n = ctrl.length;
  const ext = [ctrl[n - 1], ...ctrl, ctrl[0], ctrl[1]];
  const pts = catmull(ext, samples).slice(samples, samples * (n + 1) + 1);
  return pathOf(pts) + 'Z';
}
const lerpPts = (a: Pt[], b: Pt[], t: number): Pt[] => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);

/* ======================================================================= */
/* the matter                                                              */
/* ======================================================================= */

export interface Metal {
  deep: string;
  mid: string;
  light: string;
}

/**
 * A thick tube lit from the top-left: a stack of narrowing strokes shifted
 * toward the light. The Matter filter melts the bands into one volume.
 */
export function Tube({ ds, width, metal, dur, on, rim, layers = 8 }: { ds: string[]; width: number; metal: Metal; dur: number; on: boolean; rim?: string; layers?: number }) {
  const d0 = ds[0];
  const a = (k = 0) => <Anim attr="d" values={ds} dur={dur} on={on} key={k} />;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d0} stroke={metal.deep} strokeWidth={width * 1.08}>
        {a()}
      </path>
      {rim && (
        <path d={d0} stroke={rim} strokeWidth={width * 0.94} transform={`translate(${f1(width * 0.05)} ${f1(width * 0.07)})`}>
          {a()}
        </path>
      )}
      {Array.from({ length: layers }, (_, k) => {
        const t = k / (layers - 1);
        return (
          <path
            key={k}
            d={d0}
            stroke={mix(metal.mid, metal.light, Math.pow(t, 2.1))}
            strokeWidth={width * (1 - t * 0.8) * (rim && k === 0 ? 0.9 : 1)}
            transform={`translate(${f1(-t * width * 0.13)} ${f1(-t * width * 0.18)})`}
          >
            {a(k)}
          </path>
        );
      })}
      <path d={d0} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={width * 0.05} transform={`translate(${f1(-width * 0.16)} ${f1(-width * 0.22)})`}>
        {a()}
      </path>
    </g>
  );
}

export interface MatterOpts {
  /** Displacement keyframes (0 = intact surface, 100+ = torn into shards). */
  shatter: number[];
  shards?: boolean;
  warpFreq?: number;
  grain?: number;
  sparkle?: number;
  pits?: number;
  pitFreq?: number;
  soften?: number;
  seed?: number;
}

/** Surface of the object: soft volume → displaced (shards or melt) → metal grain highlights → tiny pores. */
function MatterFilter({ id, deep, o, dur, on }: { id: string; deep: string; o: MatterOpts; dur: number; on: boolean }) {
  const { shatter, shards = true, warpFreq = 0.016, grain = 0.5, sparkle = 0.75, pits = 0.6, pitFreq = 0.16, soften = 5, seed = 3 } = o;
  const [r, g, b] = hexToRgb(deep).map((v) => v / 255);
  const wf = (k: number) => `${f3(warpFreq * k)} ${f3(warpFreq * (2 - k))}`;
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation={soften} result="soft" />
      <feTurbulence type="fractalNoise" baseFrequency={wf(1)} numOctaves={3} seed={seed} result="warp">
        <Anim attr="baseFrequency" values={[wf(1), wf(1.25), wf(0.8)]} dur={dur * 1.7} on={on} />
      </feTurbulence>
      {shards ? (
        <feComponentTransfer in="warp" result="map">
          <feFuncR type="discrete" tableValues="0.15 0.62 0.38 0.85 0.5 0.25 0.74 0.45" />
          <feFuncG type="discrete" tableValues="0.7 0.3 0.88 0.42 0.12 0.6 0.35 0.8" />
        </feComponentTransfer>
      ) : (
        <feComponentTransfer in="warp" result="map">
          <feFuncR type="linear" slope={1} />
        </feComponentTransfer>
      )}
      <feDisplacementMap in="soft" in2="map" scale={shatter[0]} xChannelSelector="R" yChannelSelector="G" result="shape">
        <Anim attr="scale" values={shatter} dur={dur} on={on} />
      </feDisplacementMap>
      <feTurbulence type="fractalNoise" baseFrequency={grain} numOctaves={2} seed={seed + 4} result="g" />
      <feSpecularLighting in="g" surfaceScale={2.6} specularConstant={0.95} specularExponent={16} lightingColor="#ffffff" result="spec">
        <feDistantLight azimuth={225} elevation={44} />
      </feSpecularLighting>
      <feComposite in="spec" in2="shape" operator="in" result="specIn" />
      <feComponentTransfer in="specIn" result="sparkle">
        <feFuncA type="linear" slope={sparkle} />
      </feComponentTransfer>
      <feBlend in="sparkle" in2="shape" mode="screen" result="lit" />
      <feTurbulence type="fractalNoise" baseFrequency={pitFreq} numOctaves={1} seed={seed + 9} result="pn" />
      <feColorMatrix in="pn" type="matrix" values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} -18 0 0 0 ${f3(18 * 0.34)}`} result="pitA" />
      <feComposite in="pitA" in2="shape" operator="in" result="pitIn" />
      <feComponentTransfer in="pitIn" result="pitDim">
        <feFuncA type="linear" slope={pits} />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="lit" />
        <feMergeNode in="pitDim" />
      </feMerge>
    </filter>
  );
}

export function Matter({ deep, o, dur, on, shadow, children }: { deep: string; o: MatterOpts; dur: number; on: boolean; shadow?: ReactNode; children: ReactNode }) {
  const id = useUid('mt');
  return (
    <g>
      <defs>
        <MatterFilter id={id} deep={deep} o={o} dur={dur} on={on} />
        <filter id={id + 's'} filterUnits="userSpaceOnUse" x={-300} y={-300} width={1600} height={2100}>
          <feGaussianBlur stdDeviation={36} />
        </filter>
      </defs>
      {shadow && (
        <g filter={`url(#${id}s)`} opacity={0.75} transform="translate(40 60)">
          {shadow}
        </g>
      )}
      <g filter={`url(#${id})`}>{children}</g>
    </g>
  );
}

/* ======================================================================= */
/* sculptures (drawn in the 1000 × 1500 portrait space)                    */
/* ======================================================================= */

export interface SculptProps {
  metal: Metal;
  accent: string;
  on: boolean;
}

/* ---- 24 RUBAN : the "?" as a twisting sculpted tube ---- */
export const RUBAN_KF: { hook: Pt[]; dot: Pt[] }[] = [
  {
    hook: [[470, 1040], [478, 930], [540, 850], [640, 770], [722, 660], [732, 520], [664, 400], [540, 342], [408, 360], [308, 432], [262, 548]],
    dot: [[462, 1196], [496, 1204]],
  },
  {
    hook: [[340, 1120], [430, 985], [568, 905], [706, 806], [768, 652], [706, 500], [584, 420], [452, 334], [356, 300], [268, 334], [216, 430]],
    dot: [[560, 1250], [600, 1236]],
  },
  {
    hook: [[520, 1080], [432, 960], [520, 862], [684, 820], [706, 680], [618, 560], [704, 440], [600, 326], [458, 380], [356, 330], [296, 470]],
    dot: [[430, 1220], [470, 1180]],
  },
];

export function RubanSculpture({ metal, on }: SculptProps) {
  const hook = useMemo(() => RUBAN_KF.map((k) => curve(k.hook)), []);
  const dot = useMemo(() => RUBAN_KF.map((k) => curve(k.dot, 3)), []);
  const dur = 11;
  return (
    <Matter deep={metal.deep} dur={dur} on={on} o={{ shatter: [34, 120, 70], warpFreq: 0.02, pits: 0.7, seed: 4 }} shadow={<path d={hook[0]} stroke="#000" strokeWidth={170} fill="none" strokeLinecap="round" />}>
      <Tube ds={hook} width={168} metal={metal} dur={dur} on={on} />
      <Tube ds={dot} width={150} metal={metal} dur={dur} on={on} />
    </Matter>
  );
}

/* ---- 25 MERCURE : a liquid chrome loop and its drops ---- */
function mercureKf(seed: number, squash: number): Pt[] {
  const r = rng(seed);
  return Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const w = 1 + (r() - 0.5) * 0.22;
    return [500 + Math.cos(a) * 290 * w * squash, 700 + Math.sin(a) * 360 * w / squash];
  });
}
const MERCURE_DROPS: { kf: Pt[]; w: number }[] = [
  { kf: [[760, 1170], [790, 1120], [740, 1210]], w: 74 },
  { kf: [[250, 1230], [230, 1290], [280, 1180]], w: 52 },
  { kf: [[640, 300], [670, 250], [610, 340]], w: 36 },
];

function MercureSculpture({ metal, accent, on }: SculptProps) {
  const ring = useMemo(() => [mercureKf(7, 1), mercureKf(11, 1.12), mercureKf(19, 0.88)].map((p) => loop(p, 12)), []);
  const dur = 9;
  return (
    <Matter deep={metal.deep} dur={dur} on={on} o={{ shatter: [14, 30, 10, 36], shards: false, warpFreq: 0.006, grain: 0.7, sparkle: 0.55, pits: 0.25, pitFreq: 0.3, soften: 7, seed: 9 }} shadow={<path d={ring[0]} stroke="#000" strokeWidth={200} fill="none" />}>
      <Tube ds={ring} width={190} metal={metal} dur={dur} on={on} rim={accent} layers={9} />
      {MERCURE_DROPS.map((d, i) => (
        <Tube key={i} ds={d.kf.map(([x, y]) => curve([[x, y], [x + 1, y + 1], [x + 2, y + 2]], 2))} width={d.w} metal={metal} dur={dur} on={on} rim={accent} layers={6} />
      ))}
    </Matter>
  );
}

/* ---- 26 CORAIL : a porous coral that grows, branches and retracts ---- */
const CORAIL_BRANCHES: { pts: Pt[]; w: number }[] = [
  { pts: [[500, 1330], [520, 1160], [480, 990], [520, 830], [500, 650], [540, 470]], w: 118 },
  { pts: [[505, 1070], [404, 968], [330, 866], [300, 724], [340, 600]], w: 86 },
  { pts: [[495, 910], [610, 826], [700, 706], [722, 560]], w: 82 },
  { pts: [[508, 730], [420, 628], [378, 504], [400, 380]], w: 70 },
  { pts: [[520, 610], [620, 524], [662, 404], [640, 300]], w: 64 },
  { pts: [[332, 866], [250, 806], [210, 700], [220, 620]], w: 54 },
  { pts: [[700, 706], [790, 664], [826, 566], [812, 480]], w: 54 },
  { pts: [[302, 724], [214, 760], [160, 860]], w: 44 },
];

function CorailSculpture({ metal, on }: SculptProps) {
  const branches = useMemo(
    () =>
      CORAIL_BRANCHES.map((b, i) => {
        const base = b.pts.map(() => b.pts[0]);
        const sway = b.pts.map(([x, y], k): Pt => [x + Math.sin(y * 0.01 + i) * 34 * (k / b.pts.length), y - k * 8]);
        return { w: b.w, ds: [b.pts, sway, lerpPts(b.pts, base, 0.62)].map((p) => curve(p, 10)) };
      }),
    [],
  );
  const dur = 12;
  return (
    <Matter deep={metal.deep} dur={dur} on={on} o={{ shatter: [6, 16, 40, 10], warpFreq: 0.03, grain: 0.42, sparkle: 0.5, pits: 0.95, pitFreq: 0.11, soften: 4, seed: 13 }} shadow={<path d={branches[0].ds[0]} stroke="#000" strokeWidth={180} fill="none" strokeLinecap="round" />}>
      {branches.map((b, i) => (
        <Tube key={i} ds={b.ds} width={b.w} metal={metal} dur={dur} on={on} layers={7} />
      ))}
    </Matter>
  );
}

/* ---- 27 NŒUD : a trefoil knot turning on itself under a fixed light ---- */
function knotArcs(rot: number, a: number) {
  const N = 150;
  const pts: Pt[] = Array.from({ length: N + 1 }, (_, i) => {
    const t = (i / N) * Math.PI * 2;
    const x = (Math.sin(t) + a * Math.sin(2 * t)) / (1 + a);
    const y = (Math.cos(t) - a * Math.cos(2 * t)) / (1 + a);
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    return [500 + (x * c - y * s) * 360, 700 + (x * s + y * c) * 360];
  });
  // three overlapping arcs drawn in order fake the over/under crossings
  return [0, 1, 2].map((k) => pathOf(pts.slice(k * 50, k * 50 + 62).concat(k === 2 ? pts.slice(1, 13) : [])));
}

function NoeudSculpture({ metal, on }: SculptProps) {
  const arcs = useMemo(() => {
    const frames = [0, 1, 2, 3, 4, 5].map((i) => knotArcs((i / 6) * ((Math.PI * 2) / 3), 1.6 + 0.35 * Math.sin((i / 6) * Math.PI * 2)));
    return [0, 1, 2].map((k) => frames.map((f) => f[k]));
  }, []);
  const dur = 14;
  return (
    <Matter deep={metal.deep} dur={dur} on={on} o={{ shatter: [4, 26, 70, 18, 4, 40], warpFreq: 0.02, pits: 0.55, seed: 21 }} shadow={<path d={arcs[0][0] + arcs[1][0] + arcs[2][0]} stroke="#000" strokeWidth={150} fill="none" />}>
      {arcs.map((ds, k) => (
        <Tube key={k} ds={ds} width={128} metal={metal} dur={dur} on={on} />
      ))}
    </Matter>
  );
}

/* ---- 28 SOUFFLE : a cloud of particles breathing in and out of the "?" ---- */
function SouffleSculpture({ accent, on }: SculptProps) {
  const id = useUid('sf');
  const { dots, dust } = useMemo(() => {
    const r = rng(28);
    const h = 900;
    const s = h / Q_BOX.h;
    const gauss = () => (r() + r() + r() - 1.5) / 1.5;
    const dots = Array.from({ length: 1100 }, () => {
      const [qx, qy] = Q_POINTS[Math.floor(r() * Q_POINTS.length)];
      const spread = 30 + r() * 26;
      return { x: 500 + (qx - Q_BOX.w / 2) * s + gauss() * spread, y: 720 + (qy - Q_BOX.h / 2) * s + gauss() * spread, r: 2 + Math.pow(r(), 3) * 9 };
    });
    const dust = Array.from({ length: 260 }, () => ({ x: r() * 1000, y: 160 + r() * 1200, r: 0.8 + r() * 2.2 }));
    return { dots, dust };
  }, []);
  const dur = 10;
  const scatter = [26, 140, 420, 220, 40];
  return (
    <g>
      <defs>
        <radialGradient id={id + 'g'} cx="35%" cy="32%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor={accent} />
          <stop offset="1" stopColor={mix(accent, '#000000', 0.8)} />
        </radialGradient>
        <filter id={id + 'w'} x="-30%" y="-20%" width="160%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0045 0.006" numOctaves={2} seed={5} result="n">
            <Anim attr="baseFrequency" values={['0.0045 0.006', '0.006 0.004', '0.004 0.007']} dur={dur * 1.6} on={on} />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale={scatter[0]} xChannelSelector="R" yChannelSelector="G" result="d">
            <Anim attr="scale" values={scatter} dur={dur} on={on} />
          </feDisplacementMap>
          <feGaussianBlur in="d" stdDeviation={14} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="d" />
          </feMerge>
        </filter>
      </defs>
      <g fill={accent} opacity={0.5}>
        {dust.map((d, i) => (
          <circle key={i} cx={f1(d.x)} cy={f1(d.y)} r={f1(d.r)} />
        ))}
      </g>
      <g filter={`url(#${id}w)`} fill={`url(#${id}g)`}>
        {dots.map((d, i) => (
          <circle key={i} cx={f1(d.x)} cy={f1(d.y)} r={f1(d.r)} />
        ))}
      </g>
    </g>
  );
}

/* ======================================================================= */
/* type                                                                    */
/* ======================================================================= */

export interface PuffStyle {
  family: string;
  css: string;
  weight: number;
  italic?: boolean;
  lower?: boolean;
  /** Stroke added around the letters, as a fraction of the size: the "inflated" look. */
  puff: number;
  tracking: number;
}

function puffDims(st: PuffStyle, brand: string, layout: 'stacked' | 'line', size = 140) {
  const { words, question, base } = splitBrand(brand);
  const tx = (s: string) => (st.lower ? s.toLowerCase() : s.toUpperCase());
  const q = question ? ' ?' : '';
  const rows = layout !== 'line' && words.length > 1 ? [tx(words[0]), tx(words.slice(1).join(' ')) + q] : [tx(base) + q];
  const pad = size * st.puff;
  const font = { family: st.family, size, weight: st.weight, italic: st.italic, tracking: size * st.tracking + pad * 2 };
  return { rows, size, w: Math.max(...rows.map((r) => measure(r, font))) + pad * 2 + size * 0.1, h: rows.length * size * 0.96 + pad * 2 + size * 0.22 };
}

/** Inflated wordmark: letters thickened by a round-joined stroke of their own colour. */
function PuffWord({ st, brand, layout, tone, x, y, width, height, customFont }: { st: PuffStyle; brand: string; layout: 'stacked' | 'line'; tone: Tone; x?: number; y?: number; width?: number; height?: number; customFont?: string }) {
  const d = puffDims(st, brand, layout);
  const pad = d.size * st.puff;
  const fontFamily = customFont || st.css;
  
  return (
    <svg viewBox={`0 0 ${f1(d.w)} ${f1(d.h)}`} x={x} y={y} width={width ?? d.w} height={height ?? d.h} overflow="visible">
      {d.rows.map((r, i) => {
        const q = / \?$/.test(r);
        return (
          <text
            key={i}
            x={d.w / 2}
            y={pad + d.size * 0.86 + i * d.size * 0.96}
            textAnchor="middle"
            fontFamily={fontFamily}
            fontWeight={st.weight}
            fontStyle={st.italic ? 'italic' : undefined}
            fontSize={d.size}
            letterSpacing={d.size * st.tracking + pad * 2}
            fill={tone.fg}
            stroke={tone.fg}
            strokeWidth={pad * 2}
            strokeLinejoin="round"
            style={{ paintOrder: 'stroke' }}
          >
            {r.replace(/ \?$/, '')}
            {q && (
              <tspan fill={tone.accent} stroke={tone.accent}>
                {' ?'}
              </tspan>
            )}
          </text>
        );
      })}
    </svg>
  );
}

function makeLogo(st: PuffStyle, Symbol: FC<{ tone: Tone }>): FC<LogoProps> {
  return function MatiereLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
    if (variant === 'symbol') {
      return (
        <svg viewBox="0 0 300 300" x={x} y={y} width={width ?? 300} height={height ?? 300}>
          <Symbol tone={tone} />
        </svg>
      );
    }
    return <PuffWord st={st} brand={brand} layout={variant === 'secondary' ? 'line' : layout} tone={tone} x={x} y={y} width={width} height={height} />;
  };
}

/** Sculpture shrunk into the 300 × 300 symbol box. */
const symbolOf = (Sculpt: FC<SculptProps>, metal: Metal, accent: string): FC<{ tone: Tone }> =>
  function MatiereSymbol({ tone }) {
    return (
      <g transform="translate(150 150) scale(0.25) translate(-500 -760)">
        <Sculpt metal={metal} accent={tone.accent || accent} on={false} />
      </g>
    );
  };

/** Circular badge: the signature written around a "?", turning in the animated cut. */
function Badge({ cx, cy, r, text, fg, on, scale = 1, rotationSpeed = 24, fontFamily = FONT.sans }: { cx: number; cy: number; r: number; text: string; fg: string; on: boolean; scale?: number; rotationSpeed?: number; fontFamily?: string }) {
  const id = useUid('bd');
  const unit = text.toUpperCase() + ' × ';
  const actualR = r * scale;
  const circ = Math.PI * 2 * (actualR - 8 * scale);
  const size = Math.max(8, actualR * 0.2);
  const reps = Math.max(1, Math.round(circ / measure(unit, { family: fontFamily, size, weight: 600, tracking: size * 0.12 })));
  return (
    <g>
      <defs>
        <path id={id} d={`M${cx - actualR + 8 * scale} ${cy}a${actualR - 8 * scale} ${actualR - 8 * scale} 0 1 1 ${2 * (actualR - 8 * scale)} 0a${actualR - 8 * scale} ${actualR - 8 * scale} 0 1 1 ${-2 * (actualR - 8 * scale)} 0`} />
      </defs>
      <g>
        <text fontFamily={fontFamily} fontWeight={600} fontSize={size} letterSpacing={size * 0.12} fill={fg} textLength={f1(circ - 2)} lengthAdjust="spacing">
          <textPath href={`#${id}`}>{unit.repeat(reps)}</textPath>
        </text>
        <Spin cx={cx} cy={cy} dur={rotationSpeed} on={on} />
      </g>
      <circle cx={cx} cy={cy} r={actualR * 0.56} fill="none" stroke={fg} strokeWidth={1.5 * scale} />
      <text x={cx} y={cy + actualR * 0.24} textAnchor="middle" fontFamily={FONT.gambetta} fontWeight={600} fontSize={actualR * 0.7} fill={fg}>
        ?
      </text>
    </g>
  );
}

/** Logo badge: the brand name written around a circle that spins (like the Badge but for the top logo). */
function LogoBadge({ cx, cy, r, text, fg, on, rotationSpeed = 24, fontFamily = FONT.sans, showCenter = false }: { cx: number; cy: number; r: number; text: string; fg: string; on: boolean; rotationSpeed?: number; fontFamily?: string; showCenter?: boolean }) {
  const id = useUid('lb');
  const unit = text.toUpperCase() + '   ·   ';
  const circ = Math.PI * 2 * r;
  const size = r * 0.18;
  const reps = Math.max(1, Math.ceil(circ / measure(unit, { family: fontFamily, size, weight: 700, tracking: size * 0.06 })));
  return (
    <g>
      <defs>
        <path id={id} d={`M${cx - r} ${cy}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0`} />
      </defs>
      <g>
        <text fontFamily={fontFamily} fontWeight={700} fontSize={size} letterSpacing={size * 0.06} fill={fg} textLength={f1(circ - 2)} lengthAdjust="spacing">
          <textPath href={`#${id}`}>{unit.repeat(reps)}</textPath>
        </text>
        <Spin cx={cx} cy={cy} dur={rotationSpeed} on={on} />
      </g>
      {showCenter && (
        <>
          <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={fg} strokeWidth={2} opacity={0.3} />
          <text x={cx} y={cy + r * 0.2} textAnchor="middle" fontFamily={FONT.gambetta} fontWeight={600} fontSize={r * 0.6} fill={fg}>
            ?
          </text>
        </>
      )}
    </g>
  );
}

/** Headline = the line-up joined by "+", on one row when it fits, else two. */
function headline(content: EventContent, maxW: number, max: number, titleFont = "'General Sans'") {
  const names = content.lineup.map((a) => a.name.toUpperCase()).filter(Boolean);
  const font = { family: titleFont, size: max, weight: 700, tracking: -max * 0.03 };
  const one = names.join(' + ');
  const s1 = fitMeasured(one, maxW, font);
  if (s1 >= max * 0.7 || names.length < 2) return { rows: [one], size: s1 };
  const h = Math.ceil(names.length / 2);
  const rows = [names.slice(0, h).join(' + '), '+ ' + names.slice(h).join(' + ')];
  return { rows, size: Math.min(...rows.map((r) => fitMeasured(r, maxW, font))) };
}

interface TextProps {
  st: PuffStyle;
  content: EventContent;
  settings: CreativeSettings;
  fg: string;
  accent: string;
  shadow: string;
  sq: boolean;
  on: boolean;
  /** draw the ring logo as the bottom-left seal instead of the text badge */
  seal?: string;
}

/** Everything typographic — identical for the five posters, the object changes. */
export function InfoLayer({ st, content, settings, fg, accent, shadow, sq, on, seal }: TextProps) {
  const id = useUid('tx');
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const M = 76;
  const tone: Tone = { fg, accent };

  // Position offsets from settings
  const logoOffsetX = settings.logoPositionX ?? 0;
  const logoOffsetY = settings.logoPositionY ?? 0;
  const textOffsetX = settings.textBlockX ?? 0;
  const textOffsetY = settings.textBlockY ?? 0;
  const badgeOffsetX = settings.badgeX ?? 0;
  const badgeOffsetY = settings.badgeY ?? 0;

  // Get font for badge
  const badgeFontKey = settings.badgeFont ?? 'sans';
  const badgeFont = FONT[badgeFontKey as keyof typeof FONT] || FONT.sans;
  
  // Get font for main text (lineup and info)
  const titleFontKey = settings.titleFont ?? 'sans';
  const titleFont = FONT[titleFontKey as keyof typeof FONT] || FONT.sans;

  // Get font for logo
  const logoFontKey = settings.logoFont ?? 'sans';
  const logoFont = FONT[logoFontKey as keyof typeof FONT] || FONT.sans;

  // Hand-drawn text settings
  const useHandDrawn = settings.useHandDrawn ?? false;
  const handStyle: Hand = {
    weight: settings.handWeight ?? 15,
    bounce: settings.handBounce ?? 0.9,
    tremor: settings.handTremor ?? 1.6,
  };

  // wordmark
  const lay = settings.titleLayout === 'line' ? 'line' : settings.titleLayout === 'badge' ? 'stacked' : 'stacked';
  
  // Rotation settings for the logo (rotation sur lui-même en cercle)
  const logoSpinEnabled = settings.logoSpin ?? false;
  
  const wm = (() => {
    // Logo tournant circulaire en haut
    if (settings.titleLayout === 'badge') {
      const badgeSize = (sq ? 80 : 110) * settings.logoScale;
      const badgeCx = W / 2 + logoOffsetX;
      const badgeCy = (sq ? 90 : 120) + logoOffsetY;
      return (
        <Badge 
          cx={badgeCx} 
          cy={badgeCy} 
          r={badgeSize} 
          text={content.brand} 
          fg={fg} 
          on={on}
          scale={1}
          rotationSpeed={settings.badgeRotationSpeed ?? 24}
          fontFamily={badgeFont}
        />
      );
    }
    
    // Logo qui tourne en cercle (comme l'orbite mais en haut)
    if (logoSpinEnabled) {
      const badgeSize = (sq ? 90 : 130) * settings.logoScale;
      const badgeCx = W / 2 + logoOffsetX;
      const badgeCy = (sq ? 100 : 140) + logoOffsetY;
      return (
        <LogoBadge 
          cx={badgeCx} 
          cy={badgeCy} 
          r={badgeSize} 
          text={content.brand} 
          fg={fg} 
          on={on}
          rotationSpeed={settings.logoSpinSpeed ?? 20}
          fontFamily={logoFont}
          showCenter={false}
        />
      );
    }
    
    // Hand-drawn logo (when useHandDrawn is enabled)
    if (useHandDrawn) {
      const cap = (sq ? 110 : 150) * settings.logoScale;
      const yPos = (sq ? 44 : 72) + logoOffsetY;
      const centerX = W / 2 + logoOffsetX;
      
      return (
        <Glow glow={mix(fg, accent, 0.6)} sd={9} on={on}>
          <BrandHand
            content={content}
            settings={{ ...settings, titleLayout: settings.titleLayout === 'symbol' ? 'symbol' : lay }}
            x={centerX}
            y={yPos}
            cap={cap}
            maxW={sq ? 440 : 560}
            h={handStyle}
            fg={fg}
            on={on}
            seed={1}
            rows={lay === 'stacked'}
          />
        </Glow>
      );
    }
    
    // Standard "Puff" logo (inflated text)
    if (settings.titleLayout === 'symbol') {
      const s = (sq ? 110 : 150) * settings.logoScale;
      
      return (
        <PuffWord st={st} brand="?" layout="line" tone={{ fg: accent, accent }} x={W / 2 - s / 2 + logoOffsetX} y={(sq ? 40 : 70) + logoOffsetY} width={s} height={s} customFont={logoFont} />
      );
    }
    
    const d = puffDims(st, content.brand, lay);
    const k = Math.min((sq ? 440 : 560) / d.w, (sq ? 120 : lay === 'line' ? 120 : 210) / d.h) * settings.logoScale;
    const logoWidth = d.w * k;
    const logoHeight = d.h * k;
    
    return (
      <PuffWord st={st} brand={content.brand} layout={lay} tone={tone} x={W / 2 - (logoWidth) / 2 + logoOffsetX} y={(sq ? 44 : 72) + logoOffsetY} width={logoWidth} height={logoHeight} customFont={logoFont} />
    );
  })();

  const hl = headline(content, W - M * 2, sq ? 84 : 108, titleFont);
  const hy = sq ? 540 : 790;
  const infoY = hy + (hl.rows.length - 1) * hl.size * 0.98 + (sq ? 62 : 84);
  const sig = lines(content.signature);
  const man = lines(content.manifesto);
  const big = sq ? 44 : 60;
  const mid = sq ? 26 : 34;
  const small = sq ? 17 : 22;
  const split = settings.infoLayout === 'split';

  // Prepare lineup text for hand-drawn style
  const lineupText = content.lineup.map(a => a.name.toUpperCase()).join(' + ');

  return (
    <g>
      <defs>
        <filter id={id} x="-10%" y="-30%" width="120%" height="160%">
          <feDropShadow dx={0} dy={4} stdDeviation={10} floodColor={shadow} floodOpacity={0.55} />
        </filter>
      </defs>
      <g transform={`translate(${logoOffsetX} ${logoOffsetY})`}>
        {/* Hide normal logo when orbit is active */}
        {!settings.logoOrbit && wm}
      </g>
      
      {useHandDrawn ? (
        // Hand-drawn text style (like Lumière)
        <Glow glow={mix(fg, accent, 0.6)} sd={9} on={on}>
          <g transform={`translate(${textOffsetX} ${textOffsetY})`}>
            {/* Lineup */}
            <HandLine 
              text={lineupText} 
              x={W / 2} 
              y={hy + (sq ? 10 : 20)} 
              cap={sq ? 74 : 98} 
              maxW={W - M * 2} 
              h={handStyle} 
              color={fg} 
              on={on} 
              seed={100} 
              dance={0.7} 
            />
            {split ? (
              <>
                {/* Date */}
                <HandLine 
                  text={content.date} 
                  x={M + 190} 
                  y={infoY - 20} 
                  cap={sq ? 40 : 52} 
                  maxW={380} 
                  h={{ ...handStyle, weight: handStyle.weight * 1.1, bounce: handStyle.bounce * 0.6 }} 
                  color={fg} 
                  on={on} 
                  seed={101} 
                  align="start" 
                  dance={0.5} 
                />
                {/* Edition */}
                <HandLine 
                  text={content.edition} 
                  x={M + 100} 
                  y={infoY + mid * 1.25 - 20} 
                  cap={sq ? 24 : 30} 
                  maxW={380} 
                  h={{ ...handStyle, weight: handStyle.weight * 1.1, bounce: handStyle.bounce * 0.6 }} 
                  color={fg} 
                  on={on} 
                  seed={102} 
                  align="start" 
                  dance={0.5} 
                />
                {/* Venue */}
                <HandLine 
                  text={content.venue} 
                  x={W - M - 190} 
                  y={infoY - big * 0.32 - 20} 
                  cap={sq ? 28 : 36} 
                  maxW={380} 
                  h={{ ...handStyle, weight: handStyle.weight * 1.1, bounce: handStyle.bounce * 0.6 }} 
                  color={fg} 
                  on={on} 
                  seed={103} 
                  align="end" 
                  dance={0.5} 
                />
                {/* Pillars */}
                <HandLine 
                  text={content.pillars} 
                  x={W - M - 150} 
                  y={infoY - big * 0.32 + mid * 1.05 - 20} 
                  cap={sq ? 24 : 28} 
                  maxW={380} 
                  h={{ ...handStyle, weight: handStyle.weight * 1.1, bounce: handStyle.bounce * 0.6 }} 
                  color={fg} 
                  on={on} 
                  seed={104} 
                  align="end" 
                  dance={0.5} 
                />
              </>
            ) : (
              <>
                {/* Date — Venue */}
                <HandLine 
                  text={`${content.date} — ${content.venue}`} 
                  x={W / 2} 
                  y={infoY - 20} 
                  cap={sq ? 30 : 38} 
                  maxW={W - M * 2} 
                  h={{ ...handStyle, weight: handStyle.weight * 1.1, bounce: handStyle.bounce * 0.6 }} 
                  color={fg} 
                  on={on} 
                  seed={105} 
                  dance={0.5} 
                />
                {/* Edition · Pillars */}
                <HandLine 
                  text={`${content.edition} · ${content.pillars}`} 
                  x={W / 2} 
                  y={infoY + mid * 1.2 - 20} 
                  cap={sq ? 20 : 26} 
                  maxW={W - M * 2} 
                  h={{ ...handStyle, weight: handStyle.weight * 1.1, bounce: handStyle.bounce * 0.6 }} 
                  color={fg} 
                  on={on} 
                  seed={106} 
                  dance={0.5} 
                />
              </>
            )}
          </g>
        </Glow>
      ) : (
        // Standard font-based text
        <g filter={`url(#${id})`} fill={fg} transform={`translate(${textOffsetX} ${textOffsetY})`}>
          {hl.rows.map((r, i) => (
            <text key={i} x={W / 2} y={hy + i * hl.size * 0.98} textAnchor="middle" fontFamily={titleFont} fontWeight={700} fontSize={hl.size} letterSpacing={-hl.size * 0.03}>
              {r}
            </text>
          ))}
          {split ? (
            <>
              <text x={M} y={infoY} fontFamily={titleFont} fontWeight={700} fontSize={fitMeasured(content.date, 380, { family: titleFont, size: big, weight: 700, tracking: -big * 0.02 })} letterSpacing={-big * 0.02}>
                {content.date}
              </text>
              <text x={M} y={infoY + mid * 1.25} fontFamily={titleFont} fontWeight={600} fontSize={mid * 0.8} letterSpacing={1}>
                {content.edition}
              </text>
              <text x={W - M} y={infoY - big * 0.32} textAnchor="end" fontFamily={titleFont} fontWeight={700} fontSize={fitMeasured(content.venue, 380, { family: titleFont, size: mid, weight: 700 })}>
                {content.venue}
              </text>
              <text x={W - M} y={infoY - big * 0.32 + mid * 1.05} textAnchor="end" fontFamily={titleFont} fontWeight={400} fontSize={fitMeasured(content.pillars, 380, { family: titleFont, size: mid * 0.8, weight: 400 })}>
                {content.pillars}
              </text>
              {sig[0] && (
                <text x={W - M} y={infoY - big * 0.32 + mid * 2.1} textAnchor="end" fontFamily={titleFont} fontWeight={600} fontSize={fitMeasured(sig.join(' · '), 380, { family: titleFont, size: small, weight: 600 })}>
                  {sig.join(' · ')}
                </text>
              )}
            </>
          ) : (
            <>
              <text x={W / 2} y={infoY} textAnchor="middle" fontFamily={titleFont} fontWeight={700} fontSize={fitMeasured(`${content.date} — ${content.venue}`, W - M * 2, { family: titleFont, size: mid * 1.1, weight: 700 })}>
                {content.date} — {content.venue}
              </text>
              <text x={W / 2} y={infoY + mid * 1.2} textAnchor="middle" fontFamily={titleFont} fontWeight={400} fontSize={mid * 0.75} letterSpacing={2}>
                {content.edition} · {content.pillars}
              </text>
            </>
          )}
        </g>
      )}
      {(settings.badgeVisible !== false) && (
        <g transform={`translate(${badgeOffsetX} ${badgeOffsetY})`}>
          {seal ? (
            <g>
              <Spin cx={M + (sq ? 62 : 84)} cy={H - (sq ? 86 : 122)} dur={settings.badgeRotationSpeed ?? 20} on={on} />
              <RingLogo brand={content.brand} cx={M + (sq ? 62 : 84)} cy={H - (sq ? 86 : 122)} R={(sq ? 44 : 60) * (settings.badgeScale ?? 1)} cap={(sq ? 21 : 28) * (settings.badgeScale ?? 1)} stroke={seal} weight={(sq ? 1.6 : 2.2) * (settings.badgeScale ?? 1)} />
            </g>
          ) : (
            <Badge 
              cx={M + (sq ? 50 : 66)} 
              cy={H - (sq ? 74 : 104)} 
              r={sq ? 50 : 66} 
              text={sig.join(' · ') || content.brand} 
              fg={fg} 
              on={on}
              scale={settings.badgeScale ?? 1}
              rotationSpeed={settings.badgeRotationSpeed ?? 24}

              fontFamily={badgeFont}
            />
          )}
          <g fill={fg} fontFamily={titleFont}>
            <text x={M + (sq ? 130 : 170)} y={H - (sq ? 68 : 96)} fontWeight={700} fontSize={small}>
              {content.lineupTitle} · {content.editionNumber}
            </text>
            {man.map((l, i) => (
              <text key={i} x={W - M} y={H - (sq ? 96 : 132) + i * small * 1.15} textAnchor="end" fontWeight={400} fontSize={small * 0.8} opacity={0.9}>
                {l}
              </text>
            ))}
          </g>
        </g>
      )}
    </g>
  );
}

/* ======================================================================= */
/* poster factory                                                          */
/* ======================================================================= */

export interface Spec {
  name: string;
  Sculpt: FC<SculptProps>;
  metal: Metal;
  st: PuffStyle;
  /** Ground darkness in "dark" mode (0 = accent, 1 = black). */
  depth: number;
  glow: [number, number];
  /** How dark the light pool is in "dark" mode (0 = pure accent). */
  glowK: number;
  /** brand identity added around the object */
  ring?: 'orbit' | 'halo' | 'seal';
}

function ground(spec: Spec, colors: Colors, s: CreativeSettings) {
  if (colors.background === 'paper') return { bg: colors.paper, glow: mix(s.accent, '#ffffff', 0.55), fg: colors.ink, shadow: '#ffffff' };
  if (colors.background === 'accent') return { bg: mix(s.accent, '#000000', 0.35), glow: mix(s.accent, '#ffffff', 0.25), fg: '#ffffff', shadow: '#000000' };
  return { bg: mix(s.accent, '#000000', spec.depth), glow: mix(s.accent, '#000000', spec.glowK), fg: '#f4f6fb', shadow: '#000000' };
}

const RING_RED = '#ff1f1f';

/**
 * UNE AUTRE ? written on a tilted ring orbiting the sculpture, like a planet's
 * ring: the back half passes behind the "?" (dimmer, upside down), the front
 * half in front of it (readable). Drawn in the logo's rounded outlined caps.
 */
function Orbit({ brand, color, on, half, rx, ry, tilt, speed, fontSize, fontFamily }: { brand: string; color: string; on: boolean; half: 'back' | 'front'; rx?: number; ry?: number; tilt?: number; speed?: number; fontSize?: number; fontFamily?: string }) {
  const id = useUid('ob');
  const cx = 492;
  const cy = 600;
  const radiusX = rx ?? 420;
  const radiusY = ry ?? 108;
  const size = fontSize ?? 58;
  const rotation = tilt ?? -9;
  const duration = speed ?? 3.2;
  const font = fontFamily ?? FONT.round;
  
  const C = Math.PI * (3 * (radiusX + radiusY) - Math.sqrt((3 * radiusX + radiusY) * (radiusX + 3 * radiusY)));
  const unit = `${brand.toUpperCase()}   ·   `;
  const uw = measure(unit, { family: font, size, weight: 700, tracking: size * 0.06 });
  const n = Math.ceil(C / uw) + 2;
  const d = `M${cx - radiusX} ${cy}A${radiusX} ${radiusY} 0 1 0 ${cx + radiusX} ${cy}A${radiusX} ${radiusY} 0 1 0 ${cx - radiusX} ${cy}`;
  return (
    <g transform={`rotate(${rotation} ${cx} ${cy})`}>
      <defs>
        <path id={id + 'p'} d={d} />
        <clipPath id={id + 'c'}>
          <rect x={-200} y={half === 'front' ? cy : cy - 600} width={1400} height={600} />
        </clipPath>
        <filter id={id + 'g'} x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation={6} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g clipPath={`url(#${id}c)`} opacity={half === 'back' ? 0.38 : 1} filter={half === 'front' ? `url(#${id}g)` : undefined}>
        <text 
          fontFamily={font} 
          fontWeight={700} 
          fontSize={size} 
          letterSpacing={size * 0.06} 
          fill={color} 
          stroke={color} 
          strokeWidth={size * 0.15} 
          strokeLinejoin="round"
          style={{ paintOrder: 'stroke' }}
        >
          <textPath href={`#${id}p`} startOffset={f1(-uw * 0.4)}>
            {unit.repeat(n)}
            {on && <animate attributeName="startOffset" from={f1(-uw)} to="0" dur={`${duration}s`} repeatCount="indefinite" />}
          </textPath>
        </text>
      </g>
    </g>
  );
}

/** The ring logo, very large, turning slowly behind the sculpture. */
function Halo({ brand, color, on }: { brand: string; color: string; on: boolean }) {
  const id = useUid('hl');
  return (
    <g filter={`url(#${id})`}>
      <defs>
        <filter id={id} filterUnits="userSpaceOnUse" x={-200} y={-200} width={1400} height={1600}>
          <feGaussianBlur stdDeviation={9} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g>
        <Spin cx={492} cy={560} dur={50} on={on} />
        <RingLogo brand={brand} cx={492} cy={560} R={330} cap={140} stroke={color} weight={4.5} />
      </g>
    </g>
  );
}

export function makePoster(spec: Spec): FC<PosterProps> {
  return function MatierePoster({ content, settings, colors, format, photoSrc, animated = false }: PosterProps) {
    const id = useUid('mp');
    const sq = format === 'square';
    const W = 1000;
    const H = sq ? 1000 : 1500;
    const g = ground(spec, colors, settings);
    const [gx, gy] = spec.glow;
    
    // Get font for logo orbit
    const logoFontKey = settings.logoFont ?? 'sans';
    const logoFont = FONT[logoFontKey as keyof typeof FONT] || FONT.sans;
    
    // Allow custom metal colors from settings
    const metal = {
      deep: settings.sculptureMetalDeep ?? spec.metal.deep,
      mid: settings.sculptureMetalMid ?? spec.metal.mid,
      light: settings.sculptureMetalLight ?? spec.metal.light,
    };
    
    // Allow custom sculpture scale and position
    const sculptureScale = settings.sculptureScale ?? 1;
    const sculptureX = settings.sculptureX ?? 0;
    const sculptureY = settings.sculptureY ?? 0;
    
    const sculptureTransform = (() => {
      if (sq) {
        // Square format: base transform + scale + position
        return `translate(${150 + sculptureX} ${-40 + sculptureY}) scale(${0.7 * sculptureScale})`;
      } else if (sculptureScale !== 1 || sculptureX !== 0 || sculptureY !== 0) {
        // Portrait with custom scale or position: center on sculpture origin (500, 760), then scale/translate
        return `translate(${500 + sculptureX} ${760 + sculptureY}) scale(${sculptureScale}) translate(-500 -760)`;
      }
      return undefined;
    })();
    
    return (
      <Artboard format={format} colors={{ ...colors, bg: g.bg }} texture={settings.texture} label={`${content.brand} — ${spec.name}`}>
        <defs>
          <radialGradient id={id + 'g'} cx={gx} cy={gy} r="0.7">
            <stop offset="0" stopColor={g.glow} stopOpacity={0.85} />
            <stop offset="0.55" stopColor={g.glow} stopOpacity={0.25} />
            <stop offset="1" stopColor={g.glow} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={id + 'v'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000000" stopOpacity={colors.background === 'paper' ? 0 : 0.45} />
            <stop offset="0.6" stopColor="#000000" stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}g)`} />
        <rect width={W} height={H} fill={`url(#${id}v)`} />
        {settings.photo && (
          <g opacity={0.22}>
            <Photo width={W} height={H} kind="crowd" src={photoSrc} shadow="#000000" light={g.glow} grain={0.4} />
          </g>
        )}
        <g transform={sculptureTransform}>
          {settings.logoOrbit ? (
            // Custom orbit with user settings
            <>
              <Orbit 
                brand={content.brand} 
                color={settings.accent} 
                on={animated} 
                half="back"
                rx={settings.logoOrbitRadius}
                ry={settings.logoOrbitRadius ? settings.logoOrbitRadius * 0.26 : undefined}
                tilt={settings.logoOrbitTilt}
                speed={settings.logoOrbitSpeed}
                fontSize={settings.logoOrbitRadius ? settings.logoOrbitRadius * 0.14 : undefined}
                fontFamily={logoFont}
              />
            </>
          ) : (
            // Default orbit (for spec.ring === 'orbit' variants)
            spec.ring === 'orbit' && <Orbit brand={content.brand} color={RING_RED} on={animated} half="back" />
          )}
          {spec.ring === 'halo' && <Halo brand={content.brand} color={RING_RED} on={animated} />}
          <spec.Sculpt metal={metal} accent={settings.accent} on={animated} />
          {settings.logoOrbit ? (
            // Custom orbit with user settings (front half)
            <>
              <Orbit 
                brand={content.brand} 
                color={settings.accent} 
                on={animated} 
                half="front"
                rx={settings.logoOrbitRadius}
                ry={settings.logoOrbitRadius ? settings.logoOrbitRadius * 0.26 : undefined}
                tilt={settings.logoOrbitTilt}
                speed={settings.logoOrbitSpeed}
                fontSize={settings.logoOrbitRadius ? settings.logoOrbitRadius * 0.14 : undefined}
                fontFamily={logoFont}
              />
            </>
          ) : (
            // Default orbit (for spec.ring === 'orbit' variants)
            spec.ring === 'orbit' && <Orbit brand={content.brand} color={RING_RED} on={animated} half="front" />
          )}
        </g>
        <InfoLayer st={spec.st} content={content} settings={settings} fg={g.fg} accent={settings.accent} shadow={g.shadow} sq={sq} on={animated} seal={spec.ring ? RING_RED : undefined} />
      </Artboard>
    );
  };
}

/* ======================================================================= */
/* definitions                                                             */
/* ======================================================================= */

const SERIES = 'matiere';
const BASE = { paper: '#eef0f4', ink: '#05060c' };

const typo = (title: string, css: string, weight: number, note: string, sample = 'UNE AUTRE ?', italic = false): ConceptDef['typography'] => [
  { role: 'Logo gonflé', family: title, css, weight, italic, sample, note },
  { role: 'Titre line-up', family: 'General Sans', css: FONT.sans, weight: 700, sample: 'RAYHANE + FIRAS KOBBI', note: 'Grotesque grasse, serrée, posée sur l’objet.' },
  { role: 'Infos', family: 'General Sans', css: FONT.sans, weight: 400, sample: '12 JUILLET 2025 — MARRACAS', note: 'Gras / léger en alternance, aligné à gauche et à droite.' },
];

export const RUBAN: Spec = {
  name: 'ruban',
  Sculpt: RubanSculpture,
  metal: { deep: '#050a2e', mid: '#5a6a9e', light: '#f2f5ff' },
  st: { family: "'General Sans'", css: FONT.sans, weight: 700, puff: 0.045, tracking: -0.02 },
  depth: 0.8,
  glow: [0.12, 0.92],
  glowK: 0.15,
};
const MERCURE: Spec = {
  name: 'mercure',
  Sculpt: MercureSculpture,
  metal: { deep: '#030304', mid: '#2e3036', light: '#ffffff' },
  st: { family: "'Syne'", css: FONT.display, weight: 800, puff: 0.035, tracking: -0.01 },
  depth: 0.93,
  glow: [0.85, 0.1],
  glowK: 0.5,
};
const CORAIL: Spec = {
  name: 'corail',
  Sculpt: CorailSculpture,
  metal: { deep: '#2a1410', mid: '#a86a52', light: '#ffe6cf' },
  st: { family: "'Gambetta'", css: FONT.gambetta, weight: 700, italic: true, lower: true, puff: 0.045, tracking: -0.02 },
  depth: 0.72,
  glow: [0.5, 1],
  glowK: 0.3,
};
const NOEUD: Spec = {
  name: 'nœud',
  Sculpt: NoeudSculpture,
  metal: { deep: '#0d0420', mid: '#6a52b0', light: '#f6f0ff' },
  st: { family: "'General Sans'", css: FONT.sans, weight: 700, puff: 0.06, tracking: -0.01 },
  depth: 0.78,
  glow: [0.15, 0.15],
  glowK: 0.25,
};
const SOUFFLE: Spec = {
  name: 'souffle',
  Sculpt: SouffleSculpture,
  metal: { deep: '#000000', mid: '#000000', light: '#ffffff' },
  st: { family: "'General Sans'", css: FONT.sans, weight: 600, lower: true, puff: 0.012, tracking: -0.04 },
  depth: 0.95,
  glow: [0.5, 0.55],
  glowK: 0.7,
};

const ANIM_NOTE = 'Version animée : l’objet mute en boucle, le texte ne bouge pas — la lisibilité reste parfaite en story.';

export const ruban: ConceptDef = {
  id: 'ruban',
  index: '24',
  series: SERIES,
  name: 'Ruban',
  short: 'Le « ? » sculpté, bleu outremer',
  description: 'Un tube de matière argentée, grainée, qui dessine le « ? » dans un bleu nuit profond. Animé, il se froisse en éclats puis redevient lisse.',
  rationale: [
    'Une seule couleur, un seul objet, une seule typo : l’affiche attire par la matière (grain métallique, pores, éclats) et non par l’accumulation.',
    'L’objet est le signe de la marque — un « ? » épais comme une sculpture — et le line-up se pose dessus, en grotesque grasse, au centre exact.',
    ANIM_NOTE,
  ],
  base: BASE,
  palette: [
    { name: 'Outremer nuit', hex: '#0a1450', role: 'Fond' },
    { name: 'Outremer', hex: '#1636d8', role: 'Lumière' },
    { name: 'Argent', hex: '#f2f5ff', role: 'Matière, texte' },
  ],
  typography: typo('General Sans', FONT.sans, 700, 'Capitales grasses, gonflées par un contour arrondi.'),
  defaults: { accent: '#1636d8', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.35, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(RUBAN.st, symbolOf(RubanSculpture, RUBAN.metal, '#1636d8')),
  Poster: makePoster(RUBAN),
};

const rubanVariant = (id: ConceptDef['id'], index: string, ring: Spec['ring'], name: string, short: string, description: string, extra: string): ConceptDef => ({
  ...ruban,
  id,
  index,
  series: 'rubanid',
  name,
  short,
  description,
  rationale: ['Ruban tel quel : le « ? » sculpté qui se froisse et redevient lisse, la même mise en page, les mêmes couleurs.', extra, 'Le sceau en bas à gauche est le vrai logo en anneau, qui tourne lentement : chaque affiche est signée UNE AUTRE ?.'],
  palette: [...ruban.palette, { name: 'Rouge UNE AUTRE', hex: RING_RED, role: 'Logo, anneau' }],
  Logo: ruban.Logo,
  Poster: makePoster({ ...RUBAN, name: name.toLowerCase(), ring }),
});

export const rubanorbite = rubanVariant('rubanorbite', '60', 'orbit', 'Ruban · Orbite', 'UNE AUTRE ? en orbite autour du « ? »', 'Ruban, avec un anneau UNE AUTRE ? incliné qui tourne autour du « ? » comme l’anneau d’une planète : il passe derrière, puis devant la sculpture.', 'L’identité n’est plus posée à côté de l’objet : elle tourne autour, en 3D. Moitié arrière estompée et à l’envers, moitié avant lisible et lumineuse.');
export const rubanhalo = rubanVariant('rubanhalo', '61', 'halo', 'Ruban · Halo', 'Le « ? » au centre du logo qui tourne', 'Ruban, posé au centre d’un très grand anneau UNE AUTRE ? — le vrai logo — qui tourne lentement derrière la sculpture.', 'Le « ? » sculpté complète le logo : l’anneau dit UNE AUTRE, la sculpture répond « ? ». Rotation lente, presque imperceptible, très élégante.');
export const rubansceau = rubanVariant('rubansceau', '62', 'seal', 'Ruban · Sceau', 'Ruban, signé du logo', 'Ruban sans rien changer, sauf la signature : le badge en bas à gauche devient le vrai logo en anneau, qui tourne.', 'La version la plus discrète : l’affiche que vous aimez, avec l’identité qui tourne en bas comme un sceau.');

export const mercure: ConceptDef = {
  id: 'mercure',
  index: '25',
  series: SERIES,
  name: 'Mercure',
  short: 'Un anneau de chrome liquide',
  description: 'Une boucle de métal liquide et ses gouttes, sur un noir total, avec une lumière rouge qui glisse sur le bord. Animée, elle ondule comme du mercure.',
  rationale: [
    'Même principe que Ruban, autre matière : le chrome, lisse et miroitant. Le rouge n’est qu’un reflet sur l’arête — la couleur d’édition devient une lumière.',
    'L’anneau = la boucle « même lieu, mêmes gens » ; les gouttes qui s’en échappent = l’expérience qui déborde.',
    ANIM_NOTE,
  ],
  base: BASE,
  palette: [
    { name: 'Noir', hex: '#050506', role: 'Fond' },
    { name: 'Chrome', hex: '#ffffff', role: 'Matière' },
    { name: 'Rouge reflet', hex: '#e0261b', role: 'Lumière d’arête' },
  ],
  typography: typo('Syne', FONT.display, 800, 'Capitales larges et gonflées, très club.'),
  defaults: { accent: '#e0261b', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.22, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(MERCURE.st, symbolOf(MercureSculpture, MERCURE.metal, '#e0261b')),
  Poster: makePoster(MERCURE),
};

export const corail: ConceptDef = {
  id: 'corail',
  index: '26',
  series: SERIES,
  name: 'Corail',
  short: 'Un corail poreux qui pousse',
  description: 'Un corail couleur sable, criblé de pores, dans un vert d’eau profond. Animé, il pousse, se ramifie, puis se rétracte.',
  rationale: [
    'La Méditerranée en version sculpture : la matière poreuse (pores très présents) répond au grain argenté de Ruban, en chaud.',
    'Une forme qui grandit = une communauté qui se ramifie d’édition en édition.',
    ANIM_NOTE,
  ],
  base: BASE,
  palette: [
    { name: 'Vert d’eau nuit', hex: '#06332e', role: 'Fond' },
    { name: 'Lagon', hex: '#0f8a78', role: 'Lumière' },
    { name: 'Sable', hex: '#ffe6cf', role: 'Matière' },
  ],
  typography: typo('Gambetta Italic', FONT.gambetta, 700, 'Italique sérif gonflée, en minuscules.', 'une autre ?', true),
  defaults: { accent: '#0f8a78', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.35, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(CORAIL.st, symbolOf(CorailSculpture, CORAIL.metal, '#0f8a78')),
  Poster: makePoster(CORAIL),
};

export const noeud: ConceptDef = {
  id: 'noeud',
  index: '27',
  series: SERIES,
  name: 'Nœud',
  short: 'Une boucle sans fin qui tourne',
  description: 'Un nœud de matière lilas qui tourne sur lui-même sous une lumière fixe, dans un violet profond ; le badge tourne avec lui.',
  rationale: [
    'Le nœud n’a ni début ni fin : chaque édition revient au même endroit, et pourtant ce n’est jamais la même — l’idée « une autre » en un objet.',
    'Sa symétrie d’ordre 3 permet une rotation parfaitement continue en boucle — idéal en story et en écran de fond de scène.',
    ANIM_NOTE,
  ],
  base: BASE,
  palette: [
    { name: 'Violet nuit', hex: '#140838', role: 'Fond' },
    { name: 'Violet', hex: '#5b2bd6', role: 'Lumière' },
    { name: 'Lilas', hex: '#f6f0ff', role: 'Matière' },
  ],
  typography: typo('General Sans', FONT.sans, 700, 'Capitales grasses, très gonflées.'),
  defaults: { accent: '#5b2bd6', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.35, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(NOEUD.st, symbolOf(NoeudSculpture, NOEUD.metal, '#5b2bd6')),
  Poster: makePoster(NOEUD),
};

export const souffle: ConceptDef = {
  id: 'souffle',
  index: '28',
  series: SERIES,
  name: 'Souffle',
  short: 'Un nuage de particules en « ? »',
  description: 'Un millier de particules vert acide qui forment le « ? » sur un noir total. Animé, le nuage respire : il se disperse puis se reforme.',
  rationale: [
    'La version la plus immatérielle de la série : plus d’objet, de la poussière de lumière. Le signe n’existe que quand tout le monde est là.',
    'Vert acide sur noir : le contraste le plus fort de la série, pour se démarquer dans un fil Instagram.',
    ANIM_NOTE,
  ],
  base: BASE,
  palette: [
    { name: 'Noir', hex: '#050605', role: 'Fond' },
    { name: 'Vert acide', hex: '#b8ff2e', role: 'Particules' },
    { name: 'Blanc', hex: '#f4f6fb', role: 'Texte' },
  ],
  typography: typo('General Sans', FONT.sans, 700, 'Minuscules serrées, juste arrondies.', 'une autre ?'),
  defaults: { accent: '#b8ff2e', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(SOUFFLE.st, symbolOf(SouffleSculpture, SOUFFLE.metal, '#b8ff2e')),
  Poster: makePoster(SOUFFLE),
};
