/**
 * Série spéciale 35–39 — « À main levée ». One flat colour, hand-drawn
 * capitals that bounce off the baseline and glow, a few hand-drawn pictos,
 * and a club hierarchy (line-up joined by "+", date, hours, venue). The
 * lettering is generated from the Trajet skeleton: each letter is re-traced
 * with a tremor, tilted and lifted — so every poster is written, not typeset.
 * Animated cut: the letters dance in a wave and the glow breathes.
 */
import { useMemo, type FC, type ReactNode } from 'react';
import { splitBrand } from '../data/content';
import type { Colors, ConceptDef, CreativeSettings, EventContent, LogoProps, PosterProps } from '../data/types';
import { useUid } from '../graphics/common';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { strokesFromPath, type Pt } from '../lib/pathSample';
import { f1, hashString, rng } from '../lib/rng';
import { layoutStroke, QUESTION_GLYPH } from '../lib/strokeFont';
import { mix } from './scene';

/* ======================================================================= */
/* hand lettering                                                          */
/* ======================================================================= */

/** Glyphs the Trajet alphabet lacks (cap 100, baseline 100). */
const EXTRA: Record<string, { w: number; d: string }> = {
  ':': { w: 0, d: 'M0 34L0 34.01M0 86L0 86.01' },
  '+': { w: 52, d: 'M26 30V82M0 56H52' },
  '—': { w: 44, d: 'M0 56H44' },
  '–': { w: 44, d: 'M0 56H44' },
};

interface Letter {
  d: string;
  x: number;
  w: number;
}

function layoutHand(text: string, tracking = 24, space = 46) {
  const out: Letter[] = [];
  let x = 0;
  let seg = '';
  const flush = () => {
    if (!seg) return;
    const l = layoutStroke(seg, tracking, space);
    for (const g of l.glyphs) out.push({ d: g.d, x: x + g.x, w: g.w });
    x += l.width + (/\s$/.test(seg) ? space : tracking);
    seg = '';
  };
  for (const ch of text.toUpperCase()) {
    const e = EXTRA[ch];
    if (!e) {
      seg += ch;
      continue;
    }
    flush();
    out.push({ d: e.d, x, w: e.w });
    x += e.w + tracking;
  }
  flush();
  const width = out.length ? Math.max(...out.map((g) => g.x + g.w)) : 0;
  return { letters: out, width };
}

const pathOf = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');

/** Re-traces a centre-line with a hand tremor. */
function tremble(d: string, seed: number, amp: number) {
  const r = rng(seed);
  return strokesFromPath(d, 999, 3)
    .map((pts) => {
      const p1 = r() * 6.28;
      const p2 = r() * 6.28;
      return pathOf(pts.map(([x, y], i): Pt => [x + Math.sin(i * 0.31 + p1) * amp + Math.sin(i * 0.83 + p2) * amp * 0.4, y + Math.cos(i * 0.27 + p2) * amp + Math.sin(i * 0.71 + p1) * amp * 0.4]));
    })
    .join('');
}

export interface Hand {
  /** stroke width in cap units (cap = 100) */
  weight: number;
  /** 0..1: how far letters leave the baseline / tilt */
  bounce: number;
  tremor?: number;
  tracking?: number;
  /** px the line bows upward in its middle */
  arc?: number;
}

/** One line of hand lettering, fitted into maxW, centred (or aligned) on x. Top of the caps at y. */
export function HandLine({ text, x, y, cap, maxW, h, color, on, seed, align = 'middle', dance = 1 }: { text: string; x: number; y: number; cap: number; maxW: number; h: Hand; color: string; on: boolean; seed: number; align?: 'start' | 'middle' | 'end'; dance?: number }) {
  const lay = useMemo(() => {
    const l = layoutHand(text, h.tracking ?? 24);
    const r = rng(seed + hashString(text));
    return {
      width: l.width,
      letters: l.letters.map((g) => ({
        ...g,
        d: tremble(g.d, Math.floor(r() * 1e6), h.tremor ?? 1.6),
        rot: (r() * 2 - 1) * 12 * h.bounce,
        dy: (r() * 2 - 1) * 20 * h.bounce,
        sc: 1 + (r() * 2 - 1) * 0.08 * h.bounce,
      })),
    };
  }, [text, seed, h.tracking, h.tremor, h.bounce]);
  if (!lay.letters.length) return null;
  const k = Math.min(cap / 100, maxW / Math.max(1, lay.width + h.weight));
  const wpx = lay.width * k;
  const x0 = align === 'middle' ? x - wpx / 2 : align === 'end' ? x - wpx : x;
  const n = lay.letters.length;
  return (
    <g transform={`translate(${f1(x0)} ${f1(y)}) scale(${f1(k * 1000) / 1000})`} fill="none" stroke={color} strokeWidth={h.weight} strokeLinecap="round" strokeLinejoin="round">
      {lay.letters.map((g, i) => {
        const t = n > 1 ? i / (n - 1) : 0.5;
        const arc = h.arc ? (-(1 - (2 * t - 1) ** 2) * h.arc) / k : 0;
        const cx = g.x + g.w / 2;
        return (
          <g key={i}>
            {on && (
              <>
                <animateTransform attributeName="transform" type="translate" additive="sum" values={`0 0;0 ${f1(-14 * dance)};0 0`} keyTimes="0;0.45;1" calcMode="spline" keySplines="0.3 0 0.4 1;0.5 0 0.7 1" dur="1.3s" begin={`${f1(-i * 0.11)}s`} repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="rotate" additive="sum" values={`0 ${cx} 50;${f1(5 * dance * (i % 2 ? 1 : -1))} ${cx} 50;0 ${cx} 50`} dur="1.3s" begin={`${f1(-i * 0.11)}s`} repeatCount="indefinite" />
              </>
            )}
            <g transform={`translate(0 ${f1(g.dy + arc)}) rotate(${f1(g.rot)} ${f1(cx)} 50) translate(${f1(cx)} 50) scale(${f1(g.sc * 100) / 100}) translate(${f1(-cx)} -50)`}>
              <path d={g.d} transform={`translate(${f1(g.x)} 0)`} />
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** Soft halo in `glow` colour around everything inside. */
export function Glow({ glow, sd, on, children }: { glow: string; sd: number; on: boolean; children: ReactNode }) {
  const id = useUid('gw');
  if (sd <= 0) return <g>{children}</g>;
  return (
    <g filter={`url(#${id})`}>
      <defs>
        <filter id={id} filterUnits="userSpaceOnUse" x={-200} y={-200} width={1400} height={1900} colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={sd} result="b">
            {on && <animate attributeName="stdDeviation" values={`${sd};${sd * 1.6};${sd}`} dur="2.6s" repeatCount="indefinite" />}
          </feGaussianBlur>
          <feFlood floodColor={glow} result="c" />
          <feComposite in="c" in2="b" operator="in" result="g" />
          <feGaussianBlur in="SourceAlpha" stdDeviation={sd * 0.35} result="b2" />
          <feComposite in="c" in2="b2" operator="in" result="g2" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="g2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {children}
    </g>
  );
}

/* ---- hand-drawn pictos (100 × 100 box, absolute M/L/C/Q only) ---- */

const circle = (cx: number, cy: number, r: number) => {
  const k = r * 0.5523;
  return `M${cx} ${cy - r}C${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy}C${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r}C${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy}C${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r}`;
};
const rays = (cx: number, cy: number, r0: number, r1: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return `M${f1(cx + Math.cos(a) * r0)} ${f1(cy + Math.sin(a) * r0)}L${f1(cx + Math.cos(a) * r1)} ${f1(cy + Math.sin(a) * r1)}`;
  }).join('');

const PICTOS: Record<string, string> = {
  sun: circle(50, 50, 18) + rays(50, 50, 28, 40, 8),
  rays: rays(50, 50, 34, 48, 12),
  moon: 'M64 12C40 16 26 36 30 60C34 82 58 94 80 84C62 82 48 68 48 48C48 32 54 20 64 12',
  wave: 'M4 56C14 38 26 38 34 56C42 74 56 74 64 56C72 38 86 38 96 54M4 80C14 62 26 62 34 80C42 98 56 98 64 80',
  palm: 'M50 98C53 76 54 56 50 40M50 40C40 28 24 28 12 38M50 40C44 22 50 10 62 4M50 40C62 26 78 26 90 38M50 40C60 44 68 54 70 66M50 40C40 46 32 56 30 68',
  chili: 'M30 26C22 54 36 82 82 96C62 76 52 52 48 26M30 26C34 18 44 18 48 26M39 20C39 12 45 6 54 6',
  leaf: 'M18 84C18 44 48 16 86 14C86 52 58 82 18 84M18 84L62 38',
  spark: 'M50 8L56 44L92 50L56 56L50 92L44 56L8 50L44 44L50 8',
  eye: 'M6 50C28 20 72 20 94 50C72 80 28 80 6 50' + circle(50, 50, 12),
  heart: 'M50 86C20 64 8 46 14 30C20 14 42 12 50 30C58 12 80 14 86 30C92 46 80 64 50 86',
  glass: 'M28 18L36 88L64 88L72 18M30 34L70 34M40 18C38 8 46 6 44 0M58 18C56 8 64 6 62 0',
};

function Picto({ kind, x, y, size, color, weight = 9, seed = 1, on, spin }: { kind: keyof typeof PICTOS | 'q'; x: number; y: number; size: number; color: string; weight?: number; seed?: number; on: boolean; spin?: boolean }) {
  const d = useMemo(() => tremble(kind === 'q' ? QUESTION_GLYPH.d : PICTOS[kind], seed, 1.4), [kind, seed]);
  const k = size / 100;
  const box = kind === 'q' ? `translate(22 0)` : '';
  return (
    <g transform={`translate(${f1(x - size / 2)} ${f1(y - size / 2)}) scale(${f1(k * 1000) / 1000})`}>
      {on && spin && <animateTransform attributeName="transform" type="rotate" additive="sum" values="0 50 50;360 50 50" dur="14s" repeatCount="indefinite" />}
      {on && !spin && <animateTransform attributeName="transform" type="rotate" additive="sum" values="-8 50 50;8 50 50;-8 50 50" dur="1.9s" repeatCount="indefinite" />}
      <path d={d} transform={box} fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/* ======================================================================= */
/* content helpers                                                         */
/* ======================================================================= */

const MONTHS: Record<string, string> = { janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12' };
/** "12 JUILLET 2025" → "12.07.2025" (falls back to the raw date). */
function numDate(date: string) {
  const m = /^(\d{1,2})\s+([^\s]+)\s*(\d{4})?/.exec(date.trim());
  const mm = m && MONTHS[m[2].toLowerCase()];
  return m && mm ? `${m[1].padStart(2, '0')}.${mm}${m[3] ? '.' + m[3] : ''}` : date;
}
const lineupNames = (c: EventContent) => c.lineup.map((a) => a.name).filter(Boolean);
/** "A + B + C" on one line, or split in two balanced lines. */
function plusRows(c: EventContent, perRow = 2) {
  const ns = lineupNames(c);
  const rows: string[] = [];
  for (let i = 0; i < ns.length; i += perRow) rows.push((i ? '+ ' : '') + ns.slice(i, i + perRow).join(' + '));
  return rows;
}

function scheme(colors: Colors, s: CreativeSettings, ink: string) {
  if (colors.background === 'paper') return { bg: colors.paper, fg: s.accent, glow: 'transparent' };
  if (colors.background === 'dark') return { bg: colors.ink, fg: ink, glow: s.accent };
  return { bg: s.accent, fg: ink, glow: mix(ink, s.accent, 0.35) };
}

/* ======================================================================= */
/* posters                                                                 */
/* ======================================================================= */

interface Spec {
  name: string;
  h: Hand;
  ink: string;
  glow: number;
  Body: FC<BodyProps>;
}
interface BodyProps {
  content: EventContent;
  settings: CreativeSettings;
  fg: string;
  W: number;
  H: number;
  sq: boolean;
  on: boolean;
  h: Hand;
}

function makePoster(spec: Spec): FC<PosterProps> {
  return function HandPoster({ content, settings, colors, format, animated = false }: PosterProps) {
    const sq = format === 'square';
    const W = 1000;
    const H = sq ? 1000 : 1500;
    const c = scheme(colors, settings, spec.ink);
    return (
      <Artboard format={format} colors={{ ...colors, bg: c.bg }} texture={settings.texture} label={`${content.brand} — ${spec.name}`}>
        <Glow glow={c.glow} sd={c.glow === 'transparent' ? 0 : spec.glow} on={animated}>
          <spec.Body content={content} settings={settings} fg={c.fg} W={W} H={H} sq={sq} on={animated} h={spec.h} />
        </Glow>
      </Artboard>
    );
  };
}

/** Brand line honouring title layout ("symbol" ⇒ a hand-drawn "?") and logo size. */
export function BrandHand({ content, settings, x, y, cap, maxW, h, fg, on, seed, align, rows }: { content: EventContent; settings: CreativeSettings; x: number; y: number; cap: number; maxW: number; h: Hand; fg: string; on: boolean; seed: number; align?: 'start' | 'middle' | 'end'; rows?: boolean }) {
  const k = settings.logoScale;
  if (settings.titleLayout === 'symbol') return <Picto kind="q" x={x} y={y + cap * k * 0.6} size={cap * 1.3 * k} color={fg} weight={h.weight * 0.8} on={on} />;
  const { words, question } = splitBrand(content.brand);
  const stacked = rows ?? settings.titleLayout === 'stacked';
  const parts = stacked && words.length > 1 ? [words[0], words.slice(1).join(' ') + (question ? ' ?' : '')] : [words.join(' ') + (question ? ' ?' : '')];
  return (
    <g>
      {parts.map((p, i) => (
        <HandLine key={i} text={p} x={x} y={y + i * cap * k * 1.15} cap={cap * k} maxW={maxW} h={h} color={fg} on={on} seed={seed + i * 7} align={align} />
      ))}
    </g>
  );
}

/* ---- 35 LUMIÈRE : electric blue, a centred block that glows ---- */
function LumiereBody({ content, settings, fg, W, H, sq, on, h }: BodyProps) {
  const textColor = settings.textColor ?? fg;
  const cx = W / 2;
  const u = sq ? 0.82 : 1;
  const y0 = sq ? 170 : 330;
  const rows = plusRows(content, 2);
  const small: Hand = { ...h, weight: h.weight * 1.1, bounce: h.bounce * 0.7 };
  let y = y0 + 230 * u;
  return (
    <g>
      <BrandHand content={content} settings={settings} x={cx} y={y0} cap={150 * u} maxW={840} h={{ ...h, arc: 40 }} fg={textColor} on={on} seed={3} rows={false} />
      <HandLine text={`${numDate(content.date)}`} x={cx} y={(y += 0)} cap={74 * u} maxW={700} h={small} color={textColor} on={on} seed={11} dance={0.5} />
      {rows.map((r, i) => (
        <HandLine key={i} text={r} x={cx} y={(y += (i ? 104 : 130) * u)} cap={82 * u} maxW={860} h={{ ...h, weight: h.weight * 1.2 }} color={textColor} on={on} seed={20 + i} dance={0.7} />
      ))}
      <HandLine text={content.hours} x={cx} y={(y += 130 * u)} cap={60 * u} maxW={640} h={small} color={textColor} on={on} seed={31} dance={0.5} />
      <HandLine text={content.venue} x={cx} y={(y += 100 * u)} cap={66 * u} maxW={780} h={small} color={textColor} on={on} seed={41} dance={0.5} />
      <g>
        <Picto kind="palm" x={cx - 150} y={y + 200 * u} size={96 * u} color={textColor} on={on} seed={2} weight={10} />
        <HandLine text="+" x={cx - 72} y={y + 182 * u} cap={40 * u} maxW={80} h={small} color={textColor} on={false} seed={5} />
        <Picto kind="q" x={cx + 8} y={y + 200 * u} size={96 * u} color={textColor} on={on} seed={3} weight={12} />
        <HandLine text="+" x={cx + 88} y={y + 182 * u} cap={40 * u} maxW={80} h={small} color={textColor} on={false} seed={6} />
        <Picto kind="wave" x={cx + 165} y={y + 200 * u} size={96 * u} color={textColor} on={on} seed={4} weight={10} />
      </g>
      {!sq && <HandLine text={content.edition} x={cx} y={H - 120} cap={30} maxW={500} h={small} color={textColor} on={false} seed={51} />}
    </g>
  );
}

/* ---- 36 HARISSA : the line-up, huge and bouncing, info in the corners ---- */
function HarissaBody({ content, settings, fg, W, H, sq, on, h }: BodyProps) {
  const M = sq ? 60 : 70;
  const ns = lineupNames(content);
  const big = sq ? 120 : 160;
  const top = sq ? 230 : 420;
  const gap = big * 1.25;
  const small: Hand = { ...h, weight: h.weight * 1.15, bounce: h.bounce * 0.6 };
  return (
    <g>
      <BrandHand content={content} settings={settings} x={W / 2} y={sq ? 60 : 80} cap={sq ? 54 : 64} maxW={560} h={small} fg={fg} on={on} seed={8} rows={false} />
      {ns.map((n, i) => (
        <HandLine key={i} text={(i ? '+ ' : '') + n} x={W / 2} y={top + i * gap} cap={big} maxW={W - M * 2} h={{ ...h, weight: h.weight * 1.05 }} color={fg} on={on} seed={60 + i} />
      ))}
      <HandLine text={numDate(content.date)} x={M} y={H - (sq ? 200 : 260)} cap={sq ? 50 : 64} maxW={430} h={small} color={fg} on={on} seed={70} align="start" dance={0.5} />
      <HandLine text={content.hours} x={M} y={H - (sq ? 120 : 160)} cap={sq ? 36 : 44} maxW={430} h={small} color={fg} on={on} seed={71} align="start" dance={0.5} />
      <HandLine text={content.venue} x={W - M} y={H - (sq ? 200 : 260)} cap={sq ? 40 : 48} maxW={400} h={small} color={fg} on={on} seed={72} align="end" dance={0.5} />
      <HandLine text={content.edition} x={W - M} y={H - (sq ? 120 : 160)} cap={sq ? 30 : 36} maxW={400} h={small} color={fg} on={on} seed={73} align="end" dance={0.5} />
      <Picto kind="chili" x={W / 2 - 330} y={sq ? 92 : 116} size={sq ? 56 : 76} color={fg} on={on} seed={9} />
      <Picto kind="sun" x={W / 2 + 330} y={sq ? 92 : 116} size={sq ? 56 : 76} color={fg} on={on} seed={10} spin />
    </g>
  );
}

/* ---- 37 NUIT ROSE : the brand as a neon sign, on black ---- */
function NuitBody({ content, settings, fg, W, H, sq, on, h }: BodyProps) {
  const cx = W / 2;
  const small: Hand = { ...h, weight: h.weight * 1.2, bounce: h.bounce * 0.6 };
  const y0 = sq ? 120 : 260;
  const cap = sq ? 190 : 250;
  const ry = y0 + cap * settings.logoScale * 2.35;
  return (
    <g>
      <BrandHand content={content} settings={settings} x={cx} y={y0} cap={cap} maxW={860} h={h} fg={fg} on={on} seed={12} rows={settings.titleLayout !== 'line'} />
      {plusRows(content, 3).map((r, i) => (
        <HandLine key={i} text={r} x={cx} y={ry + i * 70} cap={sq ? 44 : 56} maxW={840} h={small} color={fg} on={on} seed={80 + i} dance={0.4} />
      ))}
      <HandLine text={`${numDate(content.date)}   ${content.hours}`} x={cx} y={ry + (sq ? 110 : 150)} cap={sq ? 36 : 44} maxW={760} h={small} color={fg} on={on} seed={90} dance={0.4} />
      <HandLine text={content.venue} x={cx} y={ry + (sq ? 170 : 225)} cap={sq ? 36 : 44} maxW={700} h={small} color={fg} on={on} seed={91} dance={0.4} />
      <Picto kind="moon" x={cx - 50} y={H - (sq ? 70 : 120)} size={sq ? 50 : 70} color={fg} on={on} seed={13} />
      <Picto kind="spark" x={cx + 50} y={H - (sq ? 70 : 120)} size={sq ? 44 : 60} color={fg} on={on} seed={14} spin />
    </g>
  );
}

/* ---- 38 MENTHE : stacked line-up, leaves falling around ---- */
function MentheBody({ content, settings, fg, W, H, sq, on, h }: BodyProps) {
  const cx = W / 2;
  const small: Hand = { ...h, weight: h.weight * 1.15, bounce: h.bounce * 0.6 };
  const ns = lineupNames(content);
  const top = sq ? 300 : 480;
  const cap = sq ? 96 : 128;
  const leaves = useMemo(() => {
    const r = rng(38);
    return Array.from({ length: 8 }, (_, i) => ({ x: i % 2 ? 60 + r() * 70 : 870 + r() * 70, y: (sq ? 120 : 160) + r() * (sq ? 760 : 1140), s: 40 + r() * 40, seed: 100 + i }));
  }, [sq]);
  return (
    <g>
      {leaves.map((l, i) => (
        <g key={i} opacity={0.9}>
          <Picto kind="leaf" x={l.x} y={l.y} size={l.s} color={fg} on={on} seed={l.seed} weight={8} />
        </g>
      ))}
      <HandLine text={`${numDate(content.date)} · ${content.hours}`} x={cx} y={sq ? 90 : 140} cap={sq ? 34 : 44} maxW={760} h={small} color={fg} on={on} seed={110} dance={0.4} />
      {ns.map((n, i) => (
        <HandLine key={i} text={n} x={cx} y={top + i * cap * 1.3} cap={cap} maxW={820} h={h} color={fg} on={on} seed={120 + i} />
      ))}
      <HandLine text={content.venue} x={cx} y={top + ns.length * cap * 1.3 + 10} cap={sq ? 40 : 52} maxW={700} h={small} color={fg} on={on} seed={130} dance={0.4} />
      <BrandHand content={content} settings={settings} x={cx} y={H - (sq ? 130 : 200)} cap={sq ? 64 : 84} maxW={620} h={h} fg={fg} on={on} seed={140} rows={false} />
    </g>
  );
}

/* ---- 39 SOLEIL : the brand written around a sun, in black marker ---- */
function SoleilBody({ content, settings, fg, W, H, sq, on, h }: BodyProps) {
  const cx = W / 2;
  const cy = sq ? 360 : 500;
  const R = (sq ? 230 : 290) * Math.min(1.15, settings.logoScale);
  const small: Hand = { ...h, weight: h.weight * 1.1, bounce: h.bounce * 0.6 };
  const ring = useMemo(() => {
    const t = (content.brand.toUpperCase() + ' · ').repeat(2);
    const l = layoutHand(t, 30);
    const r = rng(39);
    return { l, items: l.letters.map((g) => ({ ...g, d: tremble(g.d, Math.floor(r() * 1e6), 1.6), rot: (r() * 2 - 1) * 8, dy: (r() * 2 - 1) * 8 })) };
  }, [content.brand]);
  const cap = (2 * Math.PI * R) / ring.l.width;
  const k = Math.min(0.7, cap);
  const total = ring.l.width;
  return (
    <g>
      <g fill="none" stroke={fg} strokeWidth={h.weight} strokeLinecap="round" strokeLinejoin="round">
        {on && <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy};360 ${cx} ${cy}`} dur="40s" repeatCount="indefinite" />}
        {ring.items.map((g, i) => {
          const a = ((g.x + g.w / 2) / total) * 360;
          return (
            <g key={i} transform={`rotate(${f1(a)} ${cx} ${cy}) translate(${cx} ${f1(cy - R)}) scale(${f1(k * 100) / 100}) translate(${f1(-(g.x + g.w / 2))} ${f1(-50 + g.dy)}) rotate(${f1(g.rot)} ${f1(g.x + g.w / 2)} 50)`}>
              <path d={g.d} transform={`translate(${f1(g.x)} 0)`} />
            </g>
          );
        })}
      </g>
      <Picto kind="rays" x={cx} y={cy} size={R * 1.3} color={fg} on={on} seed={15} weight={7} spin />
      <Picto kind="q" x={cx} y={cy} size={R * 0.7} color={fg} on={on} seed={16} weight={13} />
      {plusRows(content, 2).map((r, i) => (
        <HandLine key={i} text={r} x={cx} y={cy + R + (sq ? 90 : 140) + i * (sq ? 70 : 92)} cap={sq ? 52 : 70} maxW={860} h={h} color={fg} on={on} seed={150 + i} dance={0.6} />
      ))}
      <HandLine text={`${numDate(content.date)}  ${content.hours}`} x={cx} y={H - (sq ? 140 : 230)} cap={sq ? 38 : 48} maxW={780} h={small} color={fg} on={on} seed={160} dance={0.4} />
      <HandLine text={content.venue} x={cx} y={H - (sq ? 80 : 150)} cap={sq ? 38 : 48} maxW={700} h={small} color={fg} on={on} seed={161} dance={0.4} />
    </g>
  );
}

/* ======================================================================= */
/* logos + definitions                                                     */
/* ======================================================================= */

function makeLogo(h: Hand, kind: keyof typeof PICTOS | 'q'): FC<LogoProps> {
  return function HandLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
    if (variant === 'symbol') {
      return (
        <svg viewBox="0 0 300 300" x={x} y={y} width={width ?? 300} height={height ?? 300}>
          <Picto kind={kind} x={150} y={150} size={200} color={tone.accent} weight={10} on={false} />
        </svg>
      );
    }
    const { words, question } = splitBrand(brand);
    const rows = variant === 'primary' && layout === 'stacked' && words.length > 1 ? [words[0], words.slice(1).join(' ') + (question ? ' ?' : '')] : [words.join(' ') + (question ? ' ?' : '')];
    const w = Math.max(...rows.map((r) => layoutHand(r).width)) + 60;
    const hgt = rows.length * 130 + 40;
    return (
      <svg viewBox={`0 0 ${f1(w)} ${hgt}`} x={x} y={y} width={width ?? w} height={height ?? hgt}>
        {rows.map((r, i) => (
          <HandLine key={i} text={r} x={w / 2} y={30 + i * 130} cap={100} maxW={w - 40} h={h} color={tone.fg} on={false} seed={i + 1} />
        ))}
      </svg>
    );
  };
}

const SERIES = 'main';
const ANIM = 'Version animée : les lettres dansent en vague, le halo respire — comme une enseigne écrite à la main qui bouge sur le son.';
const typo = (note: string): ConceptDef['typography'] => [
  { role: 'Écriture', family: 'Trajet à main levée', css: FONT.sans, weight: 600, sample: 'UNE AUTRE ?', note, custom: true },
  { role: 'Infos', family: 'Trajet à main levée', css: FONT.sans, weight: 500, sample: '12.07.2025 · 22:00 — 04:00', note: 'Même écriture, plus petite et plus calme. Aucune police : tout est tracé.' },
];

const LUMIERE: Spec = { name: 'lumière', h: { weight: 15, bounce: 0.9, tremor: 1.6 }, ink: '#ffffff', glow: 9, Body: LumiereBody };
const HARISSA: Spec = { name: 'harissa', h: { weight: 16, bounce: 1, tremor: 1.8 }, ink: '#fff1dc', glow: 5, Body: HarissaBody };
const NUIT: Spec = { name: 'nuit rose', h: { weight: 11, bounce: 0.8, tremor: 1.3 }, ink: '#ffe3f6', glow: 14, Body: NuitBody };
const MENTHE: Spec = { name: 'menthe', h: { weight: 15, bounce: 1, tremor: 1.7 }, ink: '#f3ffe8', glow: 4, Body: MentheBody };
const SOLEIL: Spec = { name: 'soleil', h: { weight: 15, bounce: 0.9, tremor: 1.9 }, ink: '#17110a', glow: 0, Body: SoleilBody };

const BASE = { paper: '#f6f1e7', ink: '#0b0710' };

export const lumiere: ConceptDef = {
  id: 'lumiere',
  index: '35',
  series: SERIES,
  name: 'Lumière',
  short: 'Écrit à la main, bleu électrique',
  description: 'Un aplat bleu électrique, des capitales dessinées à la main qui sautillent et brillent, centrées. Line-up relié par des « + », date, horaires, lieu — et trois petits pictos : palmier + ? + vague.',
  rationale: [
    'Le minimum : une couleur, une écriture, l’information. L’empreinte, c’est l’écriture elle-même — tracée pour la marque à partir de l’alphabet Trajet, jamais une police.',
    'Chaque lettre est retracée avec un tremblement, inclinée et décollée de la ligne : c’est vivant, humain, et immédiatement reconnaissable d’une affiche à l’autre.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Bleu électrique', hex: '#1f3cff', role: 'Fond' },
    { name: 'Blanc', hex: '#ffffff', role: 'Écriture' },
    { name: 'Halo', hex: '#9fb2ff', role: 'Lueur' },
  ],
  typography: typo('Capitales tracées, une ligne arquée pour le nom.'),
  defaults: { accent: '#1f3cff', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.15, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(LUMIERE.h, 'q'),
  Poster: makePoster(LUMIERE),
};

export const harissa: ConceptDef = {
  id: 'harissa',
  index: '36',
  series: SERIES,
  name: 'Harissa',
  short: 'Le line-up en énorme, orange piment',
  description: 'Orange harissa, les noms des DJ en très grand, écrits à la main et reliés par des « + ». Date et horaires en bas à gauche, lieu à droite, un piment et un soleil au milieu.',
  rationale: [
    'La hiérarchie d’une vraie affiche de club : ce sont les artistes qu’on vient voir, ils prennent toute la place. Le nom de la marque reste en haut, petit, comme une signature.',
    'L’orange chaud et le piment ancrent la soirée en Tunisie sans tomber dans le cliché.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Harissa', hex: '#ff5a1f', role: 'Fond' },
    { name: 'Crème', hex: '#fff1dc', role: 'Écriture' },
  ],
  typography: typo('Grandes capitales pour les DJ, plus épaisses.'),
  defaults: { accent: '#ff5a1f', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.15, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(HARISSA.h, 'chili'),
  Poster: makePoster(HARISSA),
};

export const nuitrose: ConceptDef = {
  id: 'nuitrose',
  index: '37',
  series: SERIES,
  name: 'Nuit rose',
  short: 'Le nom comme une enseigne néon',
  description: 'Sur fond noir, UNE AUTRE ? écrit à la main en néon rose, en très grand. En dessous, tout petit et calme : les DJ, la date, les horaires, le lieu. Une lune, une étincelle.',
  rationale: [
    'La version nuit de la même écriture : le trait fin devient un tube de néon. Le nom de la marque est l’affiche.',
    'Fond « couleur » = l’enseigne sur un mur coloré ; fond « ivoire » = la même écriture à l’encre, sans halo.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Nuit', hex: '#0b0710', role: 'Fond' },
    { name: 'Néon', hex: '#ffe3f6', role: 'Tube' },
    { name: 'Rose', hex: '#ff3fb4', role: 'Halo' },
  ],
  typography: typo('Trait fin, comme un tube de néon plié.'),
  defaults: { accent: '#ff3fb4', background: 'dark', titleLayout: 'stacked', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(NUIT.h, 'moon'),
  Poster: makePoster(NUIT),
};

export const menthe: ConceptDef = {
  id: 'menthe',
  index: '38',
  series: SERIES,
  name: 'Menthe',
  short: 'Vert menthe, feuilles qui tombent',
  description: 'Un vert menthe franc, les DJ écrits les uns sous les autres, quelques feuilles dessinées qui tombent autour ; la date et les horaires en haut, la marque en signature en bas.',
  rationale: [
    'La fraîcheur d’une nuit d’été : la menthe du thé, en version pop. Une couleur qu’on ne voit jamais sur les affiches de club — donc qu’on remarque.',
    'Les feuilles sont dessinées avec le même trait que les lettres : tout vient de la même main.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Menthe', hex: '#14a86b', role: 'Fond' },
    { name: 'Blanc menthe', hex: '#f3ffe8', role: 'Écriture, feuilles' },
  ],
  typography: typo('Capitales empilées, très dansantes.'),
  defaults: { accent: '#14a86b', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.15, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(MENTHE.h, 'leaf'),
  Poster: makePoster(MENTHE),
};

export const soleil: ConceptDef = {
  id: 'soleil',
  index: '39',
  series: SERIES,
  name: 'Soleil',
  short: 'Le nom tourne autour du soleil',
  description: 'Jaune plein, écriture au marqueur noir : UNE AUTRE ? écrit en cercle autour d’un soleil dessiné, un « ? » au centre. Animée, la couronne de lettres tourne lentement.',
  rationale: [
    'Un tampon, un badge, un sticker : la couronne de lettres fonctionne seule sur un bracelet, un verre, une story.',
    'Sans halo, au marqueur noir — la version « jour » de la série, aussi lisible imprimée qu’à l’écran.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Jaune soleil', hex: '#ffd21f', role: 'Fond' },
    { name: 'Marqueur', hex: '#17110a', role: 'Écriture' },
  ],
  typography: typo('Marqueur noir, couronne de lettres.'),
  defaults: { accent: '#ffd21f', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.15, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(SOLEIL.h, 'sun'),
  Poster: makePoster(SOLEIL),
};
