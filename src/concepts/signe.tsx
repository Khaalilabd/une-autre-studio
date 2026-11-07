/**
 * Série spéciale 40–44 — « Le signe ». The "?" of the name is the hero of
 * every poster, as in Ruban — but each time in a different matter, with its
 * own layout and a motion that means something: light turning around an
 * emboss, a corona behind an eclipse, stripes bent by glass, a drink filling
 * the sign, a shadow sweeping like a sundial. One hue per poster.
 */
import { useMemo, type FC } from 'react';
import { lines } from '../data/content';
import type { Colors, ConceptDef, CreativeSettings, EventContent, PosterProps, Tone } from '../data/types';
import { useUid } from '../graphics/common';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { Q_POINTS } from '../lib/generators';
import { fitMeasured } from '../lib/measure';
import type { Pt } from '../lib/pathSample';
import { f1, rng } from '../lib/rng';
import { Brand, makeLogo, Mono, type WordStyle } from './regard';
import { mix } from './scene';

/* ======================================================================= */
/* the sign                                                                */
/* ======================================================================= */

const pathOf = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
const HOOK = Q_POINTS.filter(([, y]) => y < 90);

export interface Sign {
  hook: string;
  pts: Pt[];
  dot: Pt;
  w: number;
  /** y of the bottom of the dot */
  base: number;
  box: { x0: number; x1: number; y0: number; y1: number };
}

/** "?" of glyph height h centred on (cx, cy), drawn as a thick round stroke + a dot. */
export function sign(cx: number, cy: number, h: number, weight = 0.15): Sign {
  const s = h / 100;
  const map = ([x, y]: Pt): Pt => [cx + (x - 28) * s, cy + (y - 50) * s];
  const w = h * weight;
  const dot = map([28, 97]);
  const pts = HOOK.map(map);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const base = dot[1] + w * 0.62;
  return { hook: pathOf(pts), pts, dot, w, base, box: { x0: Math.min(...xs) - w / 2, x1: Math.max(...xs) + w / 2, y0: Math.min(...ys) - w / 2, y1: base } };
}

export function SignShape({ g, color, extra = 0 }: { g: Sign; color: string; extra?: number }) {
  return (
    <g>
      <path d={g.hook} fill="none" stroke={color} strokeWidth={g.w + extra} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={g.dot[0]} cy={g.dot[1]} r={g.w * 0.62 + extra / 2} fill={color} />
    </g>
  );
}

const MONTHS: Record<string, string> = { janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12' };
export function numDate(date: string) {
  const m = /^(\d{1,2})\s+([^\s]+)\s*(\d{4})?/.exec(date.trim());
  const mm = m && MONTHS[m[2].toLowerCase()];
  return m && mm ? `${m[1].padStart(2, '0')}.${mm}${m[3] ? '.' + m[3] : ''}` : date;
}
export const names = (c: EventContent) => c.lineup.map((a) => a.name.toUpperCase()).filter(Boolean);

/** Ground colour + text colour from the background control. */
function ground(colors: Colors, s: CreativeSettings, darkBg: string, onAccent = '#ffffff') {
  if (colors.background === 'paper') return { bg: colors.paper, fg: colors.ink, light: false };
  if (colors.background === 'dark') return { bg: darkBg, fg: colors.paper, light: false };
  return { bg: s.accent, fg: onAccent, light: true };
}

export const sans = (x: number, y: number, t: string, size: number, fill: string, o: { weight?: number; anchor?: 'start' | 'middle' | 'end'; maxW?: number; spacing?: number } = {}) => {
  const weight = o.weight ?? 600;
  const fs = o.maxW ? fitMeasured(t, o.maxW, { family: "'General Sans'", size, weight, tracking: (o.spacing ?? 0) * size }) : size;
  return (
    <text x={x} y={y} textAnchor={o.anchor ?? 'start'} fontFamily={FONT.sans} fontWeight={weight} fontSize={fs} letterSpacing={(o.spacing ?? 0) * fs} fill={fill}>
      {t}
    </text>
  );
};

export const signStyle: WordStyle = { css: FONT.sans, family: "'General Sans'", weight: 600, tracking: 0.02 };

/* ======================================================================= */
/* 40 — RELIEF : the sign embossed in the paper, light turning around it    */
/* ======================================================================= */

function Relief({ g, bg, W, H, on }: { g: Sign; bg: string; W: number; H: number; on: boolean }) {
  const id = useUid('rl');
  const light = (
    <feDistantLight azimuth={225} elevation={38}>
      {on && <animate attributeName="azimuth" from="225" to="585" dur="12s" repeatCount="indefinite" />}
    </feDistantLight>
  );
  return (
    <g>
      <defs>
        <filter id={id} filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H} colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={g.w * 0.11} result="b" />
          <feDiffuseLighting in="b" surfaceScale={g.w * 0.09} diffuseConstant={1.62} lightingColor="#ffffff" result="d">
            {light}
          </feDiffuseLighting>
          <feSpecularLighting in="b" surfaceScale={g.w * 0.09} specularConstant={0.55} specularExponent={26} lightingColor="#ffffff" result="s">
            {light}
          </feSpecularLighting>
          <feFlood floodColor={bg} result="f" />
          <feBlend in="d" in2="f" mode="multiply" result="m" />
          <feComposite in="s" in2="m" operator="arithmetic" k1={0} k2={0.55} k3={1} k4={0} />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>
        <SignShape g={g} color="#ffffff" />
      </g>
    </g>
  );
}

function ReliefPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const c = ground(colors, settings, mix(settings.accent, '#000000', 0.6), '#fff4ea');
  const g = useMemo(() => sign(W / 2, sq ? 430 : 640, (sq ? 560 : 800) * settings.logoScale, 0.17), [sq, settings.logoScale]);
  const M = sq ? 56 : 70;
  const colW = (W - M * 2) / 4;
  const rowY = H - (sq ? 92 : 120);
  const cells: [string, string][] = [
    ['DATE', numDate(content.date)],
    ['HORAIRES', content.hours],
    ['LIEU', content.venue],
    ['ÉDITION', content.edition],
  ];
  const ns = names(content);
  return (
    <Artboard format={format} colors={{ ...colors, bg: c.bg }} texture={settings.texture} label={`${content.brand} — relief`}>
      <Relief g={g} bg={c.bg} W={W} H={H} on={animated} />
      <Brand st={signStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : settings} tone={{ fg: c.fg, accent: c.fg }} x={W / 2} y={sq ? 40 : 64} maxW={420} maxH={sq ? 46 : 60} />
      {sans(W / 2, rowY - (sq ? 64 : 96), ns.join('  ·  '), sq ? 30 : 40, c.fg, { anchor: 'middle', maxW: W - M * 2, spacing: 0.02 })}
      <line x1={M} x2={W - M} y1={rowY - (sq ? 38 : 52)} y2={rowY - (sq ? 38 : 52)} stroke={c.fg} strokeOpacity={0.45} />
      {cells.map(([k, v], i) => (
        <g key={k}>
          {i > 0 && <line x1={M + colW * i} x2={M + colW * i} y1={rowY - (sq ? 26 : 36)} y2={rowY + 30} stroke={c.fg} strokeOpacity={0.45} />}
          <Mono x={M + colW * i + (i ? 16 : 0)} y={rowY - (sq ? 6 : 8)} size={sq ? 10 : 12} fill={c.fg} opacity={0.7}>
            {k}
          </Mono>
          {sans(M + colW * i + (i ? 16 : 0), rowY + (sq ? 22 : 28), v, sq ? 18 : 23, c.fg, { maxW: colW - 24 })}
        </g>
      ))}
    </Artboard>
  );
}

/* ======================================================================= */
/* 41 — ÉCLIPSE : a black sign in front of a burning light                 */
/* ======================================================================= */

function Eclipse({ g, accent, on }: { g: Sign; accent: string; on: boolean }) {
  const id = useUid('ec');
  return (
    <g>
      <defs>
        <filter id={id + 'h'} x="-60%" y="-40%" width="220%" height="180%">
          <feGaussianBlur stdDeviation={g.w * 0.75} />
        </filter>
        <filter id={id + 'c'} x="-40%" y="-30%" width="180%" height="160%">
          <feMorphology operator="dilate" radius={g.w * 0.06} result="d" />
          <feGaussianBlur in="d" stdDeviation={g.w * 0.14} result="b" />
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.016" numOctaves={3} seed={41} result="n">
            {on && <animate attributeName="baseFrequency" values="0.011 0.016;0.016 0.011;0.011 0.016" dur="9s" repeatCount="indefinite" />}
          </feTurbulence>
          <feDisplacementMap in="b" in2="n" scale={g.w * 0.55} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={id + 'r'} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={2.5} />
        </filter>
      </defs>
      <g filter={`url(#${id}h)`} opacity={0.75}>
        <SignShape g={g} color={accent} extra={g.w * 0.8} />
        {on && <animate attributeName="opacity" values="0.75;0.45;0.75" dur="4.8s" repeatCount="indefinite" />}
      </g>
      <g filter={`url(#${id}c)`}>
        <SignShape g={g} color={mix(accent, '#ffffff', 0.25)} />
      </g>
      <g filter={`url(#${id}r)`}>
        <SignShape g={g} color="#fff2d6" extra={5} />
      </g>
      <SignShape g={g} color="#030303" />
    </g>
  );
}

const credits: WordStyle = { css: FONT.serif, family: "'Cormorant Garamond'", weight: 500, tracking: 0.28 };

function EclipsePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const bg = colors.background === 'paper' ? '#1a1410' : colors.background === 'accent' ? mix(settings.accent, '#000000', 0.78) : '#040404';
  const fg = '#f4ece0';
  const g = useMemo(() => sign(W / 2, sq ? 420 : 610, (sq ? 520 : 720) * settings.logoScale, 0.16), [sq, settings.logoScale]);
  const ns = names(content);
  const y0 = H - (sq ? 250 : 360);
  return (
    <Artboard format={format} colors={{ ...colors, background: 'dark', bg }} texture={settings.texture} label={`${content.brand} — éclipse`}>
      <Eclipse g={g} accent={settings.accent} on={animated} />
      <Mono x={W / 2} y={sq ? 64 : 92} size={sq ? 12 : 14} fill={fg} anchor="middle" spacing={0.5}>
        {content.brand} · PRÉSENTE
      </Mono>
      <g fontFamily={FONT.serif} fontWeight={500} fill={fg} textAnchor="middle">
        {ns.map((n, i) => (
          <text key={i} x={W / 2} y={y0 + i * (sq ? 52 : 70)} fontSize={fitMeasured(n, 820, { family: "'Cormorant Garamond'", size: sq ? 44 : 60, weight: 500, tracking: (sq ? 44 : 60) * 0.18 })} letterSpacing={(sq ? 44 : 60) * 0.18}>
            {n}
          </text>
        ))}
      </g>
      <line x1={W / 2 - 40} x2={W / 2 + 40} y1={y0 + ns.length * (sq ? 52 : 70) - 10} y2={y0 + ns.length * (sq ? 52 : 70) - 10} stroke={settings.accent} strokeWidth={2} />
      <Mono x={W / 2} y={y0 + ns.length * (sq ? 52 : 70) + (sq ? 26 : 36)} size={sq ? 13 : 16} fill={fg} anchor="middle" spacing={0.3}>
        {numDate(content.date)} — {content.hours} — {content.venue}
      </Mono>
      <Brand st={credits} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : settings} tone={{ fg, accent: settings.accent }} x={W / 2} y={H - (sq ? 70 : 96)} maxW={380} maxH={sq ? 34 : 42} />
    </Artboard>
  );
}

/* ======================================================================= */
/* 42 — VERRE : a glass sign bending the stripes behind it                 */
/* ======================================================================= */

function Glass({ g, W, H, base, line, on }: { g: Sign; W: number; H: number; base: string; line: string; on: boolean }) {
  const id = useUid('gl');
  const P = 64;
  const slide = (to: number, dur: number) =>
    on ? <animateTransform attributeName="patternTransform" type="translate" additive="sum" values={`0 0;${to} 0`} dur={`${dur}s`} repeatCount="indefinite" /> : null;
  return (
    <g>
      <defs>
        <pattern id={id + 'a'} width={P} height={P} patternUnits="userSpaceOnUse" patternTransform="rotate(16)">
          <rect width={P} height={P} fill={base} />
          <rect width={P / 2} height={P} fill={line} />
          {slide(P, 6)}
        </pattern>
        <pattern id={id + 'b'} width={P * 0.7} height={P} patternUnits="userSpaceOnUse" patternTransform="rotate(-34) scale(1.6)">
          <rect width={P * 0.7} height={P} fill={mix(base, '#ffffff', 0.1)} />
          <rect width={P * 0.35} height={P} fill={mix(line, '#ffffff', 0.2)} />
          {slide(-P * 0.7, 3.2)}
        </pattern>
        <mask id={id + 'm'} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <SignShape g={g} color="#ffffff" />
        </mask>
        <mask id={id + 'e'} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <SignShape g={g} color="#ffffff" />
          <g transform={`translate(${f1(g.w * 0.05)} ${f1(g.w * 0.07)})`}>
            <SignShape g={g} color="#000000" extra={-g.w * 0.1} />
          </g>
        </mask>
        <filter id={id + 'l'} filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 1" result="a" />
          <feGaussianBlur in="a" stdDeviation={g.w * 0.22} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={g.w * 0.7} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feComposite in="d" in2="SourceAlpha" operator="in" />
        </filter>
        <filter id={id + 's'} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={g.w * 0.25} />
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}a)`} />
      <g filter={`url(#${id}s)`} opacity={0.45} transform={`translate(${f1(g.w * 0.25)} ${f1(g.w * 0.35)})`}>
        <SignShape g={g} color="#000000" />
      </g>
      <g filter={`url(#${id}l)`}>
        <g mask={`url(#${id}m)`}>
          <rect width={W} height={H} fill={`url(#${id}b)`} />
          <rect width={W} height={H} fill="#ffffff" opacity={0.12} />
        </g>
      </g>
      <g mask={`url(#${id}e)`}>
        <rect width={W} height={H} fill="#ffffff" opacity={0.85} />
      </g>
    </g>
  );
}

function VerrePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const c = ground(colors, settings, mix(settings.accent, '#000000', 0.7));
  const base = c.light ? mix(settings.accent, '#000000', 0.12) : c.bg;
  const line = c.light ? mix(settings.accent, '#ffffff', 0.12) : mix(c.bg, settings.accent, 0.45);
  const vid = useUid('vg');
  const g = useMemo(() => sign(sq ? 660 : 670, sq ? 480 : 700, (sq ? 680 : 980) * settings.logoScale, 0.2), [sq, settings.logoScale]);
  const M = sq ? 50 : 64;
  const ns = names(content);
  const label = (y: number, t: string) => (
    <Mono x={M} y={y} size={sq ? 11 : 13} fill={c.fg} opacity={0.75}>
      {t}
    </Mono>
  );
  const y0 = sq ? 300 : 520;
  const st = sq ? 30 : 40;
  return (
    <Artboard format={format} colors={{ ...colors, bg: base }} texture={settings.texture * 0.6} label={`${content.brand} — verre`}>
      <Glass g={g} W={W} H={H} base={base} line={line} on={animated} />
      <defs>
        <linearGradient id={vid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={base} stopOpacity={0.92} />
          <stop offset="0.75" stopColor={base} stopOpacity={0.6} />
          <stop offset="1" stopColor={base} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={sq ? 440 : 470} height={H} fill={`url(#${vid})`} />
      <Brand st={signStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'stacked' } : settings.titleLayout === 'line' ? { ...settings, titleLayout: 'stacked' } : settings} tone={{ fg: c.fg, accent: c.fg }} x={M - 4} y={sq ? 50 : 64} maxW={sq ? 260 : 290} maxH={sq ? 150 : 190} anchor="start" />
      {label(y0, 'AVEC')}
      {ns.map((n, i) => (
        <g key={i}>{sans(M, y0 + 46 + i * (st + 10), n, st, c.fg, { maxW: sq ? 270 : 300 })}</g>
      ))}
      {label(y0 + 90 + ns.length * (st + 10), 'LE')}
      {sans(M, y0 + 136 + ns.length * (st + 10), numDate(content.date), st, c.fg, { maxW: 300 })}
      {label(y0 + 190 + ns.length * (st + 10), 'DE')}
      {sans(M, y0 + 236 + ns.length * (st + 10), content.hours, st * 0.8, c.fg, { maxW: 300 })}
      {label(y0 + 290 + ns.length * (st + 10), 'À')}
      {sans(M, y0 + 336 + ns.length * (st + 10), content.venue, st * 0.8, c.fg, { maxW: 300 })}
      <Mono x={M} y={H - (sq ? 40 : 60)} size={sq ? 11 : 13} fill={c.fg} opacity={0.75}>
        {content.edition}
      </Mono>
    </Artboard>
  );
}

/* ======================================================================= */
/* 43 — REMPLISSAGE : the sign as a glass that fills up                    */
/* ======================================================================= */

function Fill({ g, W, H, liquid, rim, bg, on }: { g: Sign; W: number; H: number; liquid: string; rim: string; bg: string; on: boolean }) {
  const id = useUid('fl');
  const top = g.dot[1] - g.w * 4.6;
  const level = top + (g.base - top) * 0.32;
  const wave = useMemo(() => {
    const pts: string[] = [];
    for (let x = -400; x <= W + 400; x += 20) pts.push(`${x} ${f1(Math.sin((x / 200) * Math.PI * 2) * 12)}`);
    return `M${pts.join('L')}L${W + 400} ${H}L-400 ${H}Z`;
  }, [W, H]);
  const bubbles = useMemo(() => {
    const r = rng(43);
    return Array.from({ length: 22 }, () => ({ x: W / 2 - g.w * 2 + r() * g.w * 4, r: 3 + r() * 7, d: 3 + r() * 4, b: r() * 4 }));
  }, [W, g.w]);
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <SignShape g={g} color="#ffffff" />
        </mask>
        <linearGradient id={id + 'g'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(liquid, '#ffffff', 0.25)} />
          <stop offset="1" stopColor={mix(liquid, '#000000', 0.35)} />
        </linearGradient>
      </defs>
      <SignShape g={g} color={rim} extra={12} />
      <SignShape g={g} color={mix(bg, '#ffffff', 0.05)} />
      <g mask={`url(#${id})`}>
        <g transform={`translate(0 ${f1(level)})`}>
          {on && <animateTransform attributeName="transform" type="translate" values={`0 ${f1(level)};0 ${f1(g.base + 20)};0 ${f1(top - 30)};0 ${f1(level)}`} keyTimes="0;0.15;0.75;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.5 0 0.5 1;0.4 0 0.6 1" dur="10s" repeatCount="indefinite" />}
          <g>
            {on && <animateTransform attributeName="transform" type="translate" values="0 0;-200 0" dur="2.4s" repeatCount="indefinite" />}
            <path d={wave} fill={`url(#${id}g)`} />
          </g>
          {bubbles.map((b, i) => (
            <circle key={i} cx={f1(b.x)} cy={f1(60 + (i % 7) * 70)} r={f1(b.r)} fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={2}>
              {on && <animate attributeName="cy" values={`${H};-40`} dur={`${f1(b.d)}s`} begin={`${f1(-b.b)}s`} repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
        <path d={g.hook} transform={`translate(${f1(-g.w * 0.22)} ${f1(-g.w * 0.12)})`} fill="none" stroke="#ffffff" strokeOpacity={0.3} strokeWidth={g.w * 0.09} strokeLinecap="round" />
      </g>
    </g>
  );
}

function RemplissagePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const bg = colors.background === 'paper' ? colors.paper : colors.background === 'accent' ? mix(settings.accent, '#000000', 0.45) : mix(settings.accent, '#000000', 0.84);
  const fg = colors.background === 'paper' ? colors.ink : '#ffe9f1';
  const g = useMemo(() => sign(W / 2, sq ? 380 : 560, (sq ? 520 : 760) * settings.logoScale, 0.2), [sq, settings.logoScale]);
  const M = sq ? 50 : 64;
  const cut = H - (sq ? 250 : 330);
  const ns = names(content);
  return (
    <Artboard format={format} colors={{ ...colors, background: colors.background === 'paper' ? 'paper' : 'dark', bg }} texture={settings.texture} label={`${content.brand} — remplissage`}>
      <Fill g={g} W={W} H={H} liquid={settings.accent} rim={mix(fg, bg, 0.2)} bg={bg} on={animated} />
      <Brand st={signStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : settings} tone={{ fg, accent: settings.accent }} x={M - 4} y={sq ? 40 : 56} maxW={360} maxH={sq ? 46 : 58} anchor="start" />
      <Mono x={W - M} y={sq ? 70 : 92} size={sq ? 12 : 14} fill={fg} anchor="end">
        {content.pillars}
      </Mono>
      <line x1={0} x2={W} y1={cut} y2={cut} stroke={fg} strokeWidth={2} strokeDasharray="2 12" strokeLinecap="round" />
      <circle cx={0} cy={cut} r={22} fill={colors.background === 'paper' ? '#ffffff' : '#000000'} opacity={0.5} />
      <circle cx={W} cy={cut} r={22} fill={colors.background === 'paper' ? '#ffffff' : '#000000'} opacity={0.5} />
      <Mono x={M} y={cut + (sq ? 44 : 56)} size={sq ? 11 : 13} fill={fg} opacity={0.75}>
        ENTRÉE · N°{content.editionNumber} · {content.edition}
      </Mono>
      {ns.map((n, i) => (
        <g key={i}>{sans(M, cut + (sq ? 92 : 116) + i * (sq ? 40 : 52), n, sq ? 32 : 44, fg, { maxW: 520 })}</g>
      ))}
      {sans(W - M, cut + (sq ? 92 : 116), numDate(content.date), sq ? 32 : 44, fg, { anchor: 'end', maxW: 340 })}
      {sans(W - M, cut + (sq ? 132 : 168), content.hours, sq ? 22 : 28, fg, { anchor: 'end', weight: 500, maxW: 340 })}
      {sans(W - M, cut + (sq ? 168 : 212), content.venue, sq ? 22 : 28, fg, { anchor: 'end', weight: 500, maxW: 340 })}
    </Artboard>
  );
}

/* ======================================================================= */
/* 44 — OMBRE : the sign standing on the ground, its shadow a sundial      */
/* ======================================================================= */

function Shadowed({ g, W, H, groundY, sky, soil, ink, on }: { g: Sign; W: number; H: number; groundY: number; sky: string; soil: string; ink: string; on: boolean }) {
  const id = useUid('om');
  const dur = 16;
  const sunX = [905, 500, 95];
  return (
    <g>
      <defs>
        <linearGradient id={id + 's'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(sky, '#ffffff', 0.25)} />
          <stop offset="1" stopColor={sky} />
        </linearGradient>
        <linearGradient id={id + 'g'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(soil, '#000000', 0.1)} />
          <stop offset="1" stopColor={soil} />
        </linearGradient>
        <filter id={id + 'b'} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={3} />
        </filter>
      </defs>
      <rect width={W} height={groundY} fill={`url(#${id}s)`} />
      <rect y={groundY} width={W} height={H - groundY} fill={`url(#${id}g)`} />
      <circle cx={sunX[0]} cy={groundY - 640} r={30} fill={mix(sky, '#ffffff', 0.7)}>
        {on && (
          <>
            <animate attributeName="cx" values={sunX.join(';')} dur={`${dur}s`} repeatCount="indefinite" />
            <animate attributeName="cy" values={`${groundY - 640};${groundY - 900};${groundY - 640}`} dur={`${dur}s`} repeatCount="indefinite" />
          </>
        )}
      </circle>
      <g transform={`translate(0 ${groundY})`} opacity={0.42} filter={`url(#${id}b)`}>
        <g transform="skewX(-52)">
          {on && <animateTransform attributeName="transform" type="skewX" values="-52;0;52" dur={`${dur}s`} repeatCount="indefinite" />}
          <g transform="scale(1 -0.42)">
            <g transform={`translate(0 ${-groundY})`}>
              <SignShape g={g} color={mix(ink, '#000000', 0.4)} />
            </g>
          </g>
        </g>
      </g>
      <SignShape g={g} color={ink} />
      <line x1={0} x2={W} y1={groundY} y2={groundY} stroke={ink} strokeOpacity={0.25} />
    </g>
  );
}

function OmbrePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const dark = colors.background === 'dark';
  const sky = dark ? '#1a1530' : colors.background === 'paper' ? colors.paper : '#efdcbc';
  const soil = dark ? '#0e0b1c' : colors.background === 'paper' ? mix(colors.paper, '#000000', 0.06) : '#e2c497';
  const ink = settings.accent;
  const fg = dark ? '#f3ead8' : '#2a1a10';
  const groundY = sq ? 700 : 1040;
  const h = (sq ? 520 : 760) * settings.logoScale;
  const g = useMemo(() => {
    const s0 = sign(W / 2, 0, h, 0.17);
    return sign(W / 2, groundY - s0.base, h, 0.17);
  }, [h, groundY]);
  const M = sq ? 50 : 64;
  const ns = names(content);
  return (
    <Artboard format={format} colors={{ ...colors, background: dark ? 'dark' : 'paper', bg: sky }} texture={settings.texture} label={`${content.brand} — ombre`}>
      <Shadowed g={g} W={W} H={H} groundY={groundY} sky={sky} soil={soil} ink={ink} on={animated} />
      {sans(M, sq ? 92 : 120, numDate(content.date), sq ? 44 : 60, fg, { weight: 600, maxW: 440 })}
      {sans(W - M, sq ? 92 : 120, content.hours, sq ? 26 : 34, fg, { anchor: 'end', weight: 500, maxW: 400 })}
      {sans(W - M, sq ? 124 : 162, content.venue, sq ? 18 : 22, fg, { anchor: 'end', weight: 500, maxW: 400 })}
      {ns.map((n, i) => (
        <g key={i}>{sans(M, groundY + (sq ? 78 : 120) + i * (sq ? 46 : 64), n, sq ? 38 : 54, fg, { maxW: W - M * 2 })}</g>
      ))}
      <Mono x={M} y={H - (sq ? 36 : 56)} size={sq ? 11 : 13} fill={fg} opacity={0.7}>
        {lines(content.signature).join(' · ')}
      </Mono>
      <Brand st={signStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : settings} tone={{ fg, accent: ink }} x={W - M + 4 - 300} y={H - (sq ? 70 : 96)} maxW={300} maxH={sq ? 34 : 44} anchor="start" />
    </Artboard>
  );
}

/* ======================================================================= */
/* symbols + definitions                                                   */
/* ======================================================================= */

const sym = (render: (g: Sign, tone: Tone) => JSX.Element): FC<{ tone: Tone }> =>
  function SignSymbol({ tone }) {
    const g = useMemo(() => sign(150, 140, 230, 0.17), []);
    return render(g, tone);
  };

const ReliefSymbol = sym((g, t) => (
  <g>
    <rect width={300} height={300} fill={t.accent} />
    <Relief g={g} bg={t.accent} W={300} H={300} on={false} />
  </g>
));
const EclipseSymbol = sym((g, t) => <Eclipse g={g} accent={t.accent} on={false} />);
const VerreSymbol = sym((g, t) => <Glass g={g} W={300} H={300} base={mix(t.accent, '#000000', 0.12)} line={mix(t.accent, '#ffffff', 0.12)} on={false} />);
const FillSymbol = sym((g, t) => <Fill g={g} W={300} H={300} liquid={t.accent} rim={t.fg} bg="#1a0612" on={false} />);
const OmbreSymbol = sym((g, t) => <SignShape g={g} color={t.accent} />);

const SERIES = 'signe';
const BASE = { paper: '#f4efe6', ink: '#0b0a09' };
const ANIM = 'Une seule couleur, un seul objet — et une animation lente, en boucle parfaite, où le texte ne bouge jamais.';
const typo = (title: string, css: string, weight: number, note: string): ConceptDef['typography'] => [
  { role: 'Le signe', family: '« ? » du nom', css: FONT.sans, weight: 600, sample: '?', note: 'Le point d’interrogation de la marque est l’objet de chaque affiche.', custom: true },
  { role: 'Texte', family: title, css, weight, sample: 'RAYHANE · FIRAS KOBBI', note },
  { role: 'Annotations', family: 'IBM Plex Mono', css: FONT.mono, weight: 500, sample: 'DATE · HORAIRES · LIEU', note: 'Petites capitales espacées.' },
];

export const relief: ConceptDef = {
  id: 'relief',
  index: '40',
  series: SERIES,
  name: 'Relief',
  short: 'Le « ? » gaufré, ton sur ton',
  description: 'Un « ? » embossé dans un papier terracotta, de la même couleur que le fond : seules la lumière et l’ombre le dessinent. Animée, la lumière tourne autour du signe.',
  rationale: [
    'Le luxe du ton sur ton : aucune couleur ajoutée, le signe de la marque n’existe que par son relief — comme un gaufrage sur une carte d’invitation.',
    'Le texte est rangé dans une seule ligne de quatre colonnes en bas (date, horaires, lieu, édition), le line-up juste au-dessus. Tout le reste est silence.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Terracotta', hex: '#c4532d', role: 'Fond et relief' },
    { name: 'Crème', hex: '#fff4ea', role: 'Texte' },
  ],
  typography: typo('General Sans', FONT.sans, 600, 'Sobre, aligné sur une grille de quatre colonnes.'),
  defaults: { accent: '#c4532d', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(signStyle, ReliefSymbol),
  Poster: ReliefPoster,
};

export const eclipse: ConceptDef = {
  id: 'eclipse',
  index: '41',
  series: SERIES,
  name: 'Éclipse',
  short: 'Un « ? » noir devant la lumière',
  description: 'Le « ? » en noir absolu devant une lumière ambre : seule sa couronne brûle autour de lui. Animée, la couronne ondule comme une flamme. Le line-up en générique de film.',
  rationale: [
    'Le signe ne se montre pas, il se devine par la lumière qu’il cache — la promesse « une autre » expérience, mystérieuse.',
    'Mise en page de générique de cinéma : « UNE AUTRE ? PRÉSENTE » en haut, noms en capitales sérif très espacées, une ligne d’infos.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Noir', hex: '#040404', role: 'Fond, signe' },
    { name: 'Ambre', hex: '#ff8a1f', role: 'Couronne' },
    { name: 'Lin', hex: '#f4ece0', role: 'Texte' },
  ],
  typography: typo('Cormorant Garamond', FONT.serif, 500, 'Capitales sérif très espacées, comme un générique.'),
  defaults: { accent: '#ff8a1f', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.25, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(credits, EclipseSymbol),
  Poster: EclipsePoster,
};

export const verre: ConceptDef = {
  id: 'verre',
  index: '42',
  series: SERIES,
  name: 'Verre',
  short: 'Un « ? » de verre qui tord le décor',
  description: 'Un immense « ? » en verre posé sur des rayures émeraude : à travers lui, les rayures se tordent et changent de sens. Animée, le décor glisse et le verre le déforme en direct.',
  rationale: [
    'Même lieu, vu à travers le signe : tout est identique, mais rien n’a plus le même sens — littéralement.',
    'Mise en page suisse : une colonne d’infos à gauche (AVEC · LE · DE · À), le signe déborde à droite, coupé par le format.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Émeraude', hex: '#0f7a5c', role: 'Fond, rayures' },
    { name: 'Verre', hex: '#ffffff', role: 'Reflets' },
  ],
  typography: typo('General Sans', FONT.sans, 600, 'Colonne d’infos, labels en mono.'),
  defaults: { accent: '#0f7a5c', background: 'accent', titleLayout: 'stacked', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(signStyle, VerreSymbol),
  Poster: VerrePoster,
};

export const remplissage: ConceptDef = {
  id: 'remplissage',
  index: '43',
  series: SERIES,
  name: 'Remplissage',
  short: 'Le « ? » se remplit',
  description: 'Le « ? » est un verre vide sur fond prune : animé, il se remplit d’une boisson rose, avec des bulles, puis se vide. En bas, un talon de ticket détachable avec les infos.',
  rationale: [
    'La soirée en un geste : on remplit le verre. Le signe devient un contenant — la question se remplit d’une réponse.',
    'Le bas de l’affiche est un ticket d’entrée (pointillés, encoches) : les DJ à gauche, date, horaires et lieu à droite.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Prune', hex: '#2a0b20', role: 'Fond' },
    { name: 'Rose boisson', hex: '#ff3d8a', role: 'Liquide' },
    { name: 'Rose pâle', hex: '#ffe9f1', role: 'Verre, texte' },
  ],
  typography: typo('General Sans', FONT.sans, 600, 'Talon de ticket : noms à gauche, infos à droite.'),
  defaults: { accent: '#ff3d8a', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(signStyle, FillSymbol),
  Poster: RemplissagePoster,
};

export const ombre: ConceptDef = {
  id: 'ombre',
  index: '44',
  series: SERIES,
  name: 'Ombre',
  short: 'Le « ? » et son cadran solaire',
  description: 'Un « ? » posé au sol dans une lumière de fin de journée, son ombre étirée sur le sable. Animée, le soleil traverse le ciel et l’ombre tourne comme un cadran solaire — du coucher à la nuit.',
  rationale: [
    'Le temps qui passe, de la fin d’après-midi à la nuit : l’affiche montre la soirée qui commence. Fond « noir » = la même scène sous la lune.',
    'Le sol coupe l’affiche : la date et les horaires dans le ciel, les DJ écrits dans l’ombre.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Sable', hex: '#efdcbc', role: 'Ciel, sol' },
    { name: 'Brique', hex: '#9a3412', role: 'Le signe' },
    { name: 'Brun', hex: '#2a1a10', role: 'Texte' },
  ],
  typography: typo('General Sans', FONT.sans, 600, 'Date en grand dans le ciel, noms sur le sol.'),
  defaults: { accent: '#9a3412', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(signStyle, OmbreSymbol),
  Poster: OmbrePoster,
};
