/**
 * Série spéciale 50–54 — « Le logo vivant ». The real UNE AUTRE ? ring logo
 * (rounded outlined caps on a circle) meets the Ruban treatment: one object,
 * one deep ground, a slow, clean loop. Five ways to make the logo itself move:
 * sculpted matter, neon tubes, an endless tunnel, a flipping medal, and the
 * Ruban "?" orbited by the ring.
 */
import { useMemo, type FC, type ReactNode } from 'react';
import type { ConceptDef, CreativeSettings, EventContent, LogoProps, PosterProps, Tone } from '../data/types';
import { useUid } from '../graphics/common';
import { Artboard } from '../graphics/posterKit';
import { RingLogo } from '../graphics/ringLogo';
import { FONT } from '../lib/fonts';
import { fitMeasured } from '../lib/measure';
import { layoutStroke } from '../lib/strokeFont';
import { f1, hashString, rng } from '../lib/rng';
import { RubanSculpture, Spin, type Metal } from './matiere';
import { mix } from './scene';

const W = 1000;
const RED = '#ff1f1f';

const MONTHS: Record<string, string> = { janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12' };
function numDate(date: string) {
  const m = /^(\d{1,2})\s+([^\s]+)\s*(\d{4})?/.exec(date.trim());
  const mm = m && MONTHS[m[2].toLowerCase()];
  return m && mm ? `${m[1].padStart(2, '0')}.${mm}${m[3] ? '.' + m[3] : ''}` : date;
}

interface Frame {
  sq: boolean;
  H: number;
  cx: number;
  cy: number;
  R: number;
}
const frame = (format: string, logoScale: number): Frame => {
  const sq = format === 'square';
  return { sq, H: sq ? 1000 : 1500, cx: W / 2, cy: sq ? 410 : 620, R: (sq ? 215 : 290) * logoScale };
};

const mono = (x: number, y: number, t: ReactNode, size: number, fill: string, anchor: 'start' | 'middle' | 'end' = 'start', opacity = 1) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={FONT.mono} fontWeight={500} fontSize={size} letterSpacing={size * 0.18} fill={fill} opacity={opacity}>
    {t}
  </text>
);

/** Shared text system of the series: corners, line-up in the logo's rounded caps, one info row. */
function Info({ content, settings, f, fg, accent, glow }: { content: EventContent; settings: CreativeSettings; f: Frame; fg: string; accent: string; glow?: string }) {
  const id = useUid('li');
  const M = f.sq ? 50 : 64;
  const ns = content.lineup.map((a) => a.name.toUpperCase()).filter(Boolean);
  const size = (f.sq ? 50 : 66) * (settings.lineupScale ?? 1);
  const font = { family: "'Fredoka'", size, weight: 600, tracking: size * 0.02 };
  const one = ns.join(' + ');
  const fit = fitMeasured(one, W - M * 2, font);
  const rows = fit > size * 0.72 || ns.length < 2 ? [one] : [ns.slice(0, 2).join(' + '), '+ ' + ns.slice(2).join(' + ')].filter((r) => r !== '+ ');
  const fs = Math.min(...rows.map((r) => fitMeasured(r, W - M * 2, font)));
  const lineHeight = fs * 1.08;
  const info = [numDate(content.date), content.hours, content.venue].filter(Boolean).join('   ·   ');
  const infoSize = f.sq ? 15 : 19;
  const lastLineOffset = (rows.length - 1) * lineHeight;
  const infoOffset = f.sq ? 70 : 92;
  const bottomOffset = lastLineOffset + infoOffset + infoSize + 16;
  const maxY = f.H - M - bottomOffset;
  const minY = Math.min(f.cy + f.R * 1.24 + 24, maxY);
  const y0 = Math.max(minY, Math.min(maxY, f.cy + f.R * 1.55 + (f.sq ? 40 : 70) + (settings.lineupOffset ?? 0)));
  return (
    <g>
      {glow && (
        <defs>
          <filter id={id} x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation={8} result="b" />
            <feFlood floodColor={glow} />
            <feComposite in2="b" operator="in" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      {mono(M, f.sq ? 56 : 72, `N°${content.editionNumber} · ${content.edition}`, f.sq ? 12 : 14, fg, 'start', 0.85)}
      {mono(W - M, f.sq ? 56 : 72, content.pillars, f.sq ? 12 : 14, fg, 'end', 0.85)}
      <g filter={glow ? `url(#${id})` : undefined} fontFamily={FONT.round} fontWeight={600} fill={fg} textAnchor="middle">
        {rows.map((r, i) => (
          <text key={i} x={W / 2} y={y0 + i * lineHeight} fontSize={fs} letterSpacing={fs * 0.02}>
            {r}
          </text>
        ))}
      </g>
      <line x1={W / 2 - 30} x2={W / 2 + 30} y1={y0 + lastLineOffset + (f.sq ? 30 : 42)} y2={y0 + lastLineOffset + (f.sq ? 30 : 42)} stroke={accent} strokeWidth={3} strokeLinecap="round" />
      {mono(W / 2, y0 + lastLineOffset + infoOffset, info, infoSize, fg, 'middle')}
    </g>
  );
}

/** Dark ground with a light pool (Ruban's lighting), tinted by the accent. */
function Ground({ f, base, glow, at = [0.15, 0.95] }: { f: Frame; base: string; glow: string; at?: [number, number] }) {
  const id = useUid('lg');
  return (
    <g>
      <defs>
        <radialGradient id={id} cx={at[0]} cy={at[1]} r="0.75">
          <stop offset="0" stopColor={glow} stopOpacity={0.7} />
          <stop offset="0.6" stopColor={glow} stopOpacity={0.12} />
          <stop offset="1" stopColor={glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={W} height={f.H} fill={base} />
      <rect width={W} height={f.H} fill={`url(#${id})`} />
    </g>
  );
}

const darkOf = (s: CreativeSettings, k = 0.9) => mix(s.accent, '#000000', k);

function HandText({
  text,
  cx,
  y,
  cap,
  maxW,
  color,
  weight = 7,
  tracking = 24,
  arch = 0,
}: {
  text: string;
  cx: number;
  y: number;
  cap: number;
  maxW: number;
  color: string;
  weight?: number;
  tracking?: number;
  arch?: number;
}) {
  const layout = useMemo(() => layoutStroke(text, tracking, tracking * 1.65), [text, tracking]);
  const scale = Math.min(cap / 100, maxW / Math.max(1, layout.width));
  const width = layout.width * scale;
  const jitter = useMemo(() => {
    const random = rng(hashString(text));
    return layout.glyphs.map(() => ({ rotation: (random() - 0.5) * 2.4, y: (random() - 0.5) * 3 }));
  }, [layout.glyphs, text]);

  return (
    <g fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
      {layout.glyphs.map((glyph, i) => {
        const x = glyph.x * scale;
        const t = width > 0 ? (x + (glyph.w * scale) / 2) / width : 0.5;
        const curveY = -arch * (1 - (2 * t - 1) ** 2);
        const curveAngle = Math.atan((4 * arch * (2 * t - 1)) / Math.max(1, width)) * (180 / Math.PI);
        const wobble = jitter[i];
        return (
          <path
            key={i}
            d={glyph.d}
            transform={`translate(${f1(cx - width / 2 + x)} ${f1(y + curveY + wobble.y)}) rotate(${f1(curveAngle + wobble.rotation)}) scale(${f1(scale)})`}
          />
        );
      })}
    </g>
  );
}

function NightIcons({ cx, cy, filter }: { cx: number; cy: number; filter: string }) {
  const sunX = cx - 44;
  const moonX = cx + 48;
  return (
    <g fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${filter})`}>
      <circle cx={sunX} cy={cy} r={13} />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={f1(sunX + Math.cos(angle) * 21)}
            y1={f1(cy + Math.sin(angle) * 21)}
            x2={f1(sunX + Math.cos(angle) * 29)}
            y2={f1(cy + Math.sin(angle) * 29)}
          />
        );
      })}
      <line x1={cx - 9} y1={cy} x2={cx + 9} y2={cy} />
      <line x1={cx} y1={cy - 9} x2={cx} y2={cy + 9} />
      <path d={`M${moonX + 10} ${cy - 20}A22 22 0 1 0 ${moonX + 10} ${cy + 20}A17 17 0 0 1 ${moonX + 10} ${cy - 20}Z`} />
    </g>
  );
}

/* ======================================================================= */
/* 50 — RUBAN ROUGE : clear, unlit type around a centred question mark      */
/* ======================================================================= */

function RubanRougePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const id = useUid('rr');
  const square = format === 'square';
  const H = square ? 1000 : 1500;
  const cx = W / 2;
  const brand = content.brand.toUpperCase();
  const date = content.date.toUpperCase();
  const venue = content.venue.toUpperCase();
  const hours = content.hours.toUpperCase().replace(/:/g, '·').replace(/[—–]/g, '-');
  const lineup = content.lineup.map((slot) => slot.name.trim()).filter(Boolean).join(' · ').toUpperCase();
  const start = square ? 355 : 535;
  const step = square ? 112 : 168;
  const maxOffset = square ? 60 : 80;
  const offset = Math.max(-maxOffset, Math.min(maxOffset, settings.lineupOffset ?? 0));
  const red = '#d20b0b';
  return (
    <Artboard format={format} colors={{ ...colors, background: 'dark', bg: red }} texture={0} label={`${content.brand} — ruban rouge`}>
      <defs>
        <filter id={id} x="-35%" y="-50%" width="170%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="wide" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="soft" />
          <feFlood floodColor="#fff" floodOpacity="0.9" result="white" />
          <feComposite in="white" in2="soft" operator="in" result="core" />
          <feMerge>
            <feMergeNode in="wide" />
            <feMergeNode in="core" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={W} height={H} fill={red} />
      <g filter={`url(#${id})`} opacity={0.96}>
        {animated && <animate attributeName="opacity" values="0.92;1;0.92" dur="3s" repeatCount="indefinite" />}
        <HandText text={brand} cx={cx} y={start} cap={square ? 82 : 94} maxW={800} color="#fff" weight={8} tracking={17} arch={square ? 24 : 30} />
        <HandText text={date} cx={cx} y={start + step} cap={square ? 46 : 54} maxW={820} color="#fff" weight={6} tracking={17} />
        <HandText text={venue} cx={cx} y={start + step * 2} cap={square ? 62 : 72} maxW={820} color="#fff" weight={8} tracking={17} />
        <HandText text={hours} cx={cx} y={start + step * 2.72} cap={square ? 38 : 44} maxW={760} color="#fff" weight={6} tracking={15} />
        {lineup && <HandText text={lineup} cx={cx} y={start + step * 3.35 + offset} cap={(square ? 26 : 32) * (settings.lineupScale ?? 1)} maxW={840} color="#fff" weight={5} tracking={11} />}
        <NightIcons cx={cx} cy={start + step * 4.12 + offset} filter={id} />
        <HandText text={`${content.edition} ${content.editionNumber}`} cx={cx} y={H - (square ? 82 : 120)} cap={square ? 24 : 30} maxW={500} color="#fff" weight={4} tracking={14} />
      </g>
    </Artboard>
  );
}

/* ======================================================================= */
/* 51 — NÉON : the logo as a real neon sign, powering on                   */
/* ======================================================================= */

function NeonRing({ brand, f, color, on, mirror }: { brand: string; f: Frame; color: string; on: boolean; mirror?: boolean }) {
  const id = useUid('nr');
  const cap = f.R * 0.46;
  const w = cap * 0.07;
  const flicker = on ? <animate attributeName="opacity" values="0;1;0.1;1;0.3;1;1" keyTimes="0;0.03;0.06;0.1;0.13;0.17;1" calcMode="discrete" dur="9s" repeatCount="indefinite" /> : null;
  return (
    <g>
      <defs>
        <filter id={id + 'w'} filterUnits="userSpaceOnUse" x={-200} y={-400} width={1400} height={2400}>
          <feGaussianBlur stdDeviation={cap * 0.22} />
        </filter>
        <filter id={id + 'n'} filterUnits="userSpaceOnUse" x={-200} y={-400} width={1400} height={2400}>
          <feGaussianBlur stdDeviation={cap * 0.05} />
        </filter>
      </defs>
      <g>
        {flicker}
        <g filter={`url(#${id}w)`} opacity={mirror ? 0.5 : 0.8}>
          <RingLogo brand={brand} cx={f.cx} cy={f.cy} R={f.R} cap={cap} stroke={color} weight={w * 3} />
        </g>
        <g filter={`url(#${id}n)`}>
          <RingLogo brand={brand} cx={f.cx} cy={f.cy} R={f.R} cap={cap} stroke={color} weight={w * 1.6} />
        </g>
        <RingLogo brand={brand} cx={f.cx} cy={f.cy} R={f.R} cap={cap} stroke={mix(color, '#ffffff', 0.55)} weight={w * 0.55} />
      </g>
    </g>
  );
}

function NeonPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const f = frame(format, settings.logoScale);
  const base = colors.background === 'accent' ? darkOf(settings, 0.7) : colors.background === 'paper' ? '#151314' : '#070606';
  const floor = f.cy + f.R * 1.42;
  const id = useUid('np');
  return (
    <Artboard format={format} colors={{ ...colors, background: 'dark', bg: base }} texture={settings.texture} label={`${content.brand} — néon`}>
      <defs>
        <pattern id={id} width={120} height={60} patternUnits="userSpaceOnUse">
          <rect width={120} height={60} fill={base} />
          <path d="M0 0.5H120M0 30.5H120M60 0V30M0 30V60M120 30V60" stroke="#ffffff" strokeOpacity={0.035} strokeWidth={1.5} />
        </pattern>
        <linearGradient id={id + 'f'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity={0} />
          <stop offset="1" stopColor="#000000" stopOpacity={0.85} />
        </linearGradient>
      </defs>
      <rect width={W} height={floor} fill={`url(#${id})`} />
      <rect y={floor} width={W} height={f.H - floor} fill={mix(base, '#000000', 0.4)} />
      <path d={`M${f1(f.cx - f.R * 1.0)} ${f1(f.cy - f.R * 0.2)}C${f1(f.cx - f.R * 1.25)} ${f1(f.cy + f.R * 0.6)} ${f1(f.cx - f.R * 0.6)} ${f1(floor - 40)} ${f1(f.cx - f.R * 1.1)} ${f1(floor)}`} fill="none" stroke="#000000" strokeWidth={4} opacity={0.9} />
      <NeonRing brand={content.brand} f={f} color={settings.accent} on={animated} />
      <g transform={`translate(0 ${f1(floor * 2)}) scale(1 -1)`} opacity={0.14}>
        <NeonRing brand={content.brand} f={f} color={settings.accent} on={animated} mirror />
      </g>
      <rect y={floor} width={W} height={f.H - floor} fill={`url(#${id}f)`} />
      <Info content={content} settings={settings} f={{ ...f, cy: f.cy + 20 }} fg="#ffe9e9" accent={settings.accent} glow={settings.accent} />
    </Artboard>
  );
}

/* ======================================================================= */
/* 52 — TUNNEL : rings inside rings, an endless zoom                        */
/* ======================================================================= */

function Tunnel({ brand, f, color, bg, on }: { brand: string; f: Frame; color: string; bg: string; on: boolean }) {
  const k = 0.58;
  const n = 8;
  return (
    <g transform={`translate(${f.cx} ${f.cy})`}>
      <g>
        {on && <animateTransform attributeName="transform" type="scale" values={`1;${f1(1000 / k) / 1000}`} dur="3.4s" repeatCount="indefinite" />}
        {Array.from({ length: n }, (_, i) => {
          const s = Math.pow(k, i - 1);
          const c = mix(color, bg, Math.min(0.85, i * 0.12));
          return (
            <g key={i} transform={`scale(${f1(s * 1000) / 1000}) rotate(${i % 2 ? 14 : 0})`}>
              <RingLogo brand={brand} cx={0} cy={0} R={f.R} cap={f.R * 0.46} stroke={c} weight={(f.R * 0.022) / Math.max(0.35, s)} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

function TunnelPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const f = frame(format, settings.logoScale);
  const base = colors.background === 'paper' ? colors.paper : colors.background === 'accent' ? settings.accent : '#050505';
  const color = colors.background === 'accent' ? '#0a0a0a' : colors.background === 'paper' ? settings.accent : settings.accent;
  const fg = colors.background === 'paper' ? colors.ink : colors.background === 'accent' ? '#0a0a0a' : '#ffecec';
  const id = useUid('tn');
  return (
    <Artboard format={format} colors={{ ...colors, bg: base }} texture={settings.texture} label={`${content.brand} — tunnel`}>
      <defs>
        <clipPath id={id}>
          <rect width={W} height={f.cy + f.R * 1.45} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <Tunnel brand={content.brand} f={f} color={color} bg={base} on={animated} />
      </g>
      <Info content={content} settings={settings} f={f} fg={fg} accent={color} />
    </Artboard>
  );
}

/* ======================================================================= */
/* 53 — MÉDAILLE : the logo struck on a coin that flips                     */
/* ======================================================================= */

function Coin({ brand, f, metal, content, on }: { brand: string; f: Frame; metal: string; content: EventContent; on: boolean }) {
  const id = useUid('cn');
  const R = f.R * 1.38;
  const cap = f.R * 0.46;
  const lite = mix(metal, '#ffffff', 0.55);
  const dark = mix(metal, '#000000', 0.55);
  const ticks = useMemo(() => Array.from({ length: 120 }, (_, i) => (i / 120) * Math.PI * 2), []);
  const flipKT = '0;0.35;0.42;0.5;0.85;0.92;1';
  const face = (children: ReactNode) => (
    <g>
      <circle r={R} fill={`url(#${id}g)`} />
      <g stroke={dark} strokeWidth={3} strokeOpacity={0.6}>
        {ticks.map((a, i) => (
          <line key={i} x1={f1(Math.cos(a) * (R - 4))} y1={f1(Math.sin(a) * (R - 4))} x2={f1(Math.cos(a) * (R - 16))} y2={f1(Math.sin(a) * (R - 16))} />
        ))}
      </g>
      <circle r={R - 24} fill="none" stroke={lite} strokeOpacity={0.5} strokeWidth={2} />
      <circle r={R - 30} fill="none" stroke={dark} strokeOpacity={0.5} strokeWidth={2} />
      {children}
    </g>
  );
  const emboss = (node: (color: string) => ReactNode) => (
    <g>
      <g transform="translate(3 4)">{node(dark)}</g>
      <g transform="translate(-2 -2)">{node(lite)}</g>
      {node(metal)}
    </g>
  );
  return (
    <g>
      <defs>
        <radialGradient id={id + 'g'} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor={lite} />
          <stop offset="0.5" stopColor={metal} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <filter id={id + 's'} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={20} />
        </filter>
      </defs>
      <ellipse cx={f.cx} cy={f.cy + R + 60} rx={R * 0.8} ry={22} fill="#000000" opacity={0.6} filter={`url(#${id}s)`}>
        {on && <animate attributeName="rx" values={`${R * 0.8};${R * 0.8};${R * 0.1};${R * 0.8};${R * 0.8};${R * 0.1};${R * 0.8}`} keyTimes={flipKT} dur="7s" repeatCount="indefinite" />}
      </ellipse>
      <g transform={`translate(${f.cx} ${f.cy})`}>
        <g>
          {on && <animateTransform attributeName="transform" type="scale" values="1 1;1 1;0.01 1;-1 1;-1 1;0.01 1;1 1" keyTimes={flipKT} dur="7s" repeatCount="indefinite" />}
          <g>
            {on && <animate attributeName="opacity" values="1;0;1" keyTimes="0;0.42;0.92" calcMode="discrete" dur="7s" repeatCount="indefinite" />}
            {face(emboss((c) => <RingLogo brand={brand} cx={0} cy={0} R={f.R} cap={cap} stroke={c} fill={c} weight={cap * 0.06} />))}
          </g>
          {on && (
            <g transform="scale(-1 1)" opacity={0}>
              <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.42;0.92" calcMode="discrete" dur="7s" repeatCount="indefinite" />
              {face(
                emboss((c) => (
                  <g fill={c} fontFamily={FONT.round} fontWeight={700} textAnchor="middle">
                    <text y={R * 0.32} fontSize={R * 0.95}>
                      ?
                    </text>
                    <text y={R * 0.62} fontSize={R * 0.13} letterSpacing={R * 0.02}>
                      N°{content.editionNumber} · {numDate(content.date)}
                    </text>
                  </g>
                )),
              )}
            </g>
          )}
        </g>
      </g>
    </g>
  );
}

function MedaillePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const f0 = frame(format, settings.logoScale);
  const f = { ...f0, R: f0.R * 0.88 };
  const base = colors.background === 'paper' ? colors.paper : colors.background === 'accent' ? mix(settings.accent, '#000000', 0.5) : '#0b0606';
  const fg = colors.background === 'paper' ? colors.ink : '#fff0ec';
  return (
    <Artboard format={format} colors={{ ...colors, bg: base }} texture={settings.texture} label={`${content.brand} — médaille`}>
      <Ground f={f} base={base} glow={mix(settings.accent, '#000000', 0.3)} at={[0.5, 0.42]} />
      <Coin brand={content.brand} f={f} metal={settings.accent} content={content} on={animated} />
      <Info content={content} settings={settings} f={{ ...f, R: f.R * 1.25 }} fg={fg} accent={settings.accent} />
    </Artboard>
  );
}

/* ======================================================================= */
/* 54 — ORBITE : Ruban's "?" at the centre, the ring logo turning around    */
/* ======================================================================= */

function OrbitePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const f = frame(format, settings.logoScale);
  const base = colors.background === 'paper' ? '#0d0f1c' : colors.background === 'accent' ? darkOf(settings, 0.6) : '#04050d';
  const metal: Metal = { deep: '#050a2e', mid: '#5a6a9e', light: '#f2f5ff' };
  const k = (f.R * 1.7) / 1000;
  return (
    <Artboard format={format} colors={{ ...colors, background: 'dark', bg: base }} texture={settings.texture} label={`${content.brand} — orbite`}>
      <Ground f={f} base={base} glow="#1636d8" />
      <g transform={`translate(${f.cx} ${f.cy}) scale(${f1(k * 1000) / 1000}) translate(-500 -770)`}>
        <RubanSculpture metal={metal} accent={settings.accent} on={animated} />
      </g>
      <g>
        <Spin cx={f.cx} cy={f.cy} dur={36} on={animated} />
        <RingLogo brand={content.brand} cx={f.cx} cy={f.cy} R={f.R * 1.18} cap={f.R * 0.38} stroke={settings.accent} weight={f.R * 0.02} />
      </g>
      <Info content={content} settings={settings} f={{ ...f, R: f.R * 1.08 }} fg="#eef1ff" accent={settings.accent} />
    </Artboard>
  );
}

/* ======================================================================= */
/* logos + definitions                                                     */
/* ======================================================================= */

/** The brand logo itself, for every variant: the ring (primary/symbol) or a single rounded line (secondary). */
const ringLogo = (render?: (tone: Tone) => ReactNode): FC<LogoProps> =>
  function BrandRing({ variant, brand, tone, x, y, width, height }: LogoProps) {
    if (variant === 'secondary') {
      const t = brand.toUpperCase();
      return (
        <svg viewBox="0 0 900 160" x={x} y={y} width={width ?? 900} height={height ?? 160}>
          <text x={450} y={112} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={fitMeasured(t, 860, { family: "'Fredoka'", size: 120, weight: 700 })} fill="none" stroke={tone.fg} strokeWidth={5} strokeLinejoin="round">
            {t}
          </text>
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 400 400" x={x} y={y} width={width ?? 400} height={height ?? 400}>
        {render?.(tone)}
        <RingLogo brand={brand} cx={200} cy={200} R={130} cap={60} stroke={tone.accent} weight={4} />
      </svg>
    );
  };

const SERIES = 'logo';
const BASE = { paper: '#f4efe6', ink: '#070606' };
const ANIM = 'Le logo est l’objet de l’affiche : il bouge en boucle, lentement, et le texte reste fixe — l’identité se reconnaît avant même de lire.';
const typo: ConceptDef['typography'] = [
  { role: 'Logo', family: 'Fredoka', css: FONT.round, weight: 700, sample: 'UNE AUTRE ?', note: 'Capitales rondes et épaisses sur un anneau, avec un point d’interrogation en orbite.', custom: true },
  { role: 'Line-up', family: 'Fredoka', css: FONT.round, weight: 600, sample: 'RAYHANE + FIRAS KOBBI', note: 'La même rondeur que le logo, reliée par des « + ».' },
  { role: 'Infos', family: 'IBM Plex Mono', css: FONT.mono, weight: 500, sample: '12.07.2025 · 22:00 — 04:00', note: 'Une seule ligne, espacée.' },
];
const defaults = (background: CreativeSettings['background'], accent = RED): CreativeSettings => ({ accent, background, titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' });
const palette = (extra: ConceptDef['palette']): ConceptDef['palette'] => [{ name: 'Rouge UNE AUTRE', hex: RED, role: 'Logo' }, ...extra];

export const rubanrouge: ConceptDef = {
  id: 'rubanrouge',
  index: '50',
  series: SERIES,
  name: 'Ruban rouge',
  short: 'Le logo sculpté dans la matière de Ruban',
  description: 'L’anneau UNE AUTRE ? taillé dans la matière de Ruban — chrome rouge, grain, pores — sur un rouge presque noir. Animé, les lettres se froissent en éclats puis redeviennent lisses, et l’anneau oscille.',
  rationale: ['Ce qu’on aime dans Ruban (une matière vivante, une seule couleur, de la lumière) appliqué au vrai logo : c’est la marque elle-même qui devient l’objet.', 'Le line-up reprend les capitales rondes du logo, relié par des « + » ; une seule ligne d’infos dessous.', ANIM],
  base: BASE,
  palette: palette([{ name: 'Rouge nuit', hex: '#1f0306', role: 'Fond' }, { name: 'Chrome rose', hex: '#ffe9e6', role: 'Reflets' }]),
  typography: typo,
  defaults: defaults('dark'),
  Logo: ringLogo(),
  Poster: RubanRougePoster,
};

export const neonlogo: ConceptDef = {
  id: 'neonlogo',
  index: '51',
  series: SERIES,
  name: 'Néon',
  short: 'Le logo en vrai tube de néon',
  description: 'Le contour du logo est déjà un tube de néon : le voilà accroché à un mur de briques sombres, avec son câble et son reflet sur le sol. Animé, il s’allume en grésillant, puis bourdonne.',
  rationale: ['Le logo tel qu’il pourrait exister dans le lieu : une enseigne. L’affiche montre l’objet qu’on fabriquera pour le bar ou l’entrée.', 'Le reflet au sol et le câble sont les petits détails qui rendent l’image crédible.', ANIM],
  base: BASE,
  palette: palette([{ name: 'Mur', hex: '#070606', role: 'Fond' }, { name: 'Cœur du tube', hex: '#ff9c9c', role: 'Lumière' }]),
  typography: typo,
  defaults: defaults('dark'),
  Logo: ringLogo(),
  Poster: NeonPoster,
};

export const tunnel: ConceptDef = {
  id: 'tunnel',
  index: '52',
  series: SERIES,
  name: 'Tunnel',
  short: 'Des anneaux dans des anneaux, à l’infini',
  description: 'Le logo répété en anneaux de plus en plus petits, comme un tunnel. Animé, on y plonge sans fin : chaque anneau prend la place du précédent.',
  rationale: ['« Une autre » à l’infini : chaque édition contient la suivante. Hypnotique en story, parfait en boucle sur un écran de scène.', 'Fond « couleur » = tunnel noir sur rouge ; fond « ivoire » = rouge sur papier.', ANIM],
  base: BASE,
  palette: palette([{ name: 'Noir', hex: '#050505', role: 'Fond' }]),
  typography: typo,
  defaults: defaults('dark'),
  Logo: ringLogo(),
  Poster: TunnelPoster,
};

export const medaille: ConceptDef = {
  id: 'medaille',
  index: '53',
  series: SERIES,
  name: 'Médaille',
  short: 'Le logo frappé sur une pièce',
  description: 'Le logo frappé en relief sur une médaille rouge métallisée, tranche crénelée. Animée, elle se retourne : au dos, un grand « ? », le numéro d’édition et la date.',
  rationale: ['La médaille, c’est aussi l’objet des bracelets (puce NFC d’entrée, breloque cadeau) : l’affiche annonce l’objet qu’on gardera au poignet.', 'Le dos change à chaque édition — on collectionne les pièces.', ANIM],
  base: BASE,
  palette: palette([{ name: 'Nuit', hex: '#0b0606', role: 'Fond' }, { name: 'Métal rouge', hex: '#ff8f8f', role: 'Reflets' }]),
  typography: typo,
  defaults: defaults('dark'),
  Logo: ringLogo(),
  Poster: MedaillePoster,
};

export const orbite: ConceptDef = {
  id: 'orbite',
  index: '54',
  series: SERIES,
  name: 'Orbite',
  short: 'Le « ? » de Ruban dans l’anneau du logo',
  description: 'Le « ? » sculpté de Ruban, au centre, et l’anneau rouge du logo qui tourne lentement autour de lui, sur le bleu nuit de Ruban. Animé, la matière se froisse pendant que l’anneau tourne.',
  rationale: ['Le mélange littéral : la sculpture que vous aimez, tenue par le logo de la marque — l’un ne va plus sans l’autre.', 'Bleu de Ruban, rouge du logo : deux couleurs seulement, qui ne se touchent jamais.', ANIM],
  base: BASE,
  palette: palette([{ name: 'Outremer nuit', hex: '#04050d', role: 'Fond' }, { name: 'Argent', hex: '#f2f5ff', role: 'Sculpture' }]),
  typography: typo,
  defaults: defaults('dark'),
  Logo: ringLogo(),
  Poster: OrbitePoster,
};
