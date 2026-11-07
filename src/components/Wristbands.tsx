import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mix } from '../concepts/scene';
import type { EventContent } from '../data/types';
import { useUid } from '../graphics/common';
import { RingLogo } from '../graphics/ringLogo';
import { FONT } from '../lib/fonts';
import { fitMeasured, measure } from '../lib/measure';
import { splitBrand } from '../data/content';
import { download, rasterize, slug, toSvgDocument } from '../lib/exporter';
import { rng } from '../lib/rng';
import { useStudio } from '../state/store';
import { svgTexture, Viewer3D } from './Viewer3D';

/**
 * Entry passes as printed fabric wristbands (polyester, dye-sublimation,
 * one-way closure ring). Each design is drawn at the real band ratio —
 * 350 × 15 mm, 1 unit = 0.1 mm — so the same artwork feeds the 3D mock-up,
 * the flat preview and the print files (SVG in mm, PNG at 300 dpi).
 */

const BW = 3500;
const BH = 150;
const RED = '#ff1f1f';

const MONTHS: Record<string, string> = { janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12' };
function numDate(date: string) {
  const m = /^(\d{1,2})\s+([^\s]+)\s*(\d{4})?/.exec(date.trim());
  const mm = m && MONTHS[m[2].toLowerCase()];
  return m && mm ? `${m[1].padStart(2, '0')}.${mm}${m[3] ? '.' + m[3] : ''}` : date;
}

export interface Pal {
  bg: string;
  bg2: string;
  ink: string;
  accent: string;
}

interface BandProps {
  content: EventContent;
  pal: Pal;
}

export interface Design {
  id: string;
  name: string;
  tag: string;
  pal: Pal;
  clasp: string;
  Band: (p: BandProps) => JSX.Element;
  idea: string;
}

/* ======================================================================= */
/* the bands — print artwork, 3500 × 150                                   */
/* ======================================================================= */

const upper = (c: EventContent) => c.brand.toUpperCase();

/**
 * UNE AUTRE ? set like the ring logo, but unrolled: every letter placed and
 * tilted on its own along a wave (first word rising, the rest falling), the
 * "?" bigger and leaning, the small open dot in front. `flip` mirrors the wave.
 */
function LogoWord({ brand, x, y, size, color, weight, flip = false }: { brand: string; x: number; y: number; size: number; color: string; weight: number; flip?: boolean }) {
  const { words, question } = splitBrand(brand);
  const font = { family: "'Fredoka'", size, weight: 700 };
  const track = size * 0.1;
  const glyphs = [...[...(words[0] ?? '').toUpperCase()], ' ', ...[...words.slice(1).join(' ').toUpperCase()]].map((ch) => ({ ch, w: ch === ' ' ? size * 0.32 : measure(ch, font) + track }));
  const qw = question ? measure('?', { ...font, size: size * 1.3 }) + track + size * 0.28 : 0;
  const total = glyphs.reduce((a, g) => a + g.w, 0) + qw;
  const jitter = [-6, 5, -3, 6, -5, 4, -6, 3, -4];
  const dir = flip ? -1 : 1;
  let cx = x - total / 2;
  const placed = glyphs.map((g, i) => {
    const mid = cx + g.w / 2;
    cx += g.w;
    const t = (mid - x) / (total / 2);
    return { ...g, mid, dy: -Math.sin(t * Math.PI) * size * 0.2 * dir, rot: Math.cos(t * Math.PI) * -16 * dir + jitter[i % jitter.length] };
  });
  return (
    <g fontFamily={FONT.round} fontWeight={700} textAnchor="middle" fill="none" stroke={color} strokeWidth={weight} strokeLinejoin="round">
      <circle cx={x - total / 2 - size * 0.38} cy={y - size * 0.36 + size * 0.12 * dir} r={size * 0.11} />
      {placed
        .filter((g) => g.ch !== ' ')
        .map((g, i) => (
          <text key={i} transform={`translate(${g.mid.toFixed(1)} ${(y + g.dy).toFixed(1)}) rotate(${g.rot.toFixed(1)})`} fontSize={size} y={size * 0.35}>
            {g.ch}
          </text>
        ))}
      {question && (
        <text transform={`translate(${(x + total / 2 - qw / 2).toFixed(1)} ${(y - size * 0.08 * dir).toFixed(1)}) rotate(${10 * dir})`} fontSize={size * 1.3} y={size * 0.45}>
          ?
        </text>
      )}
    </g>
  );
}

function AnneauBand({ content, pal }: BandProps) {
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      {Array.from({ length: 7 }, (_, i) => 260 + i * 420).map((x, i) =>
        i % 2 === 0 ? (
          <RingLogo key={i} brand={content.brand} cx={x} cy={BH / 2} R={46} cap={21} stroke={pal.accent} weight={2.6} />
        ) : (
          <LogoWord key={i} brand={content.brand} x={x} y={BH / 2} size={58} color={pal.accent} weight={3} flip={i % 4 === 3} />
        ),
      )}
      <text x={BW - 70} y={BH / 2 + 10} textAnchor="end" fontFamily={FONT.mono} fontWeight={500} fontSize={28} letterSpacing={5} fill={pal.ink}>
        N°{content.editionNumber}
      </text>
    </g>
  );
}


/**
 * Anneau ? — the clasp end carries the plain ring logo inside a crown of small
 * "?"; the rest of the band is only "?", outlined like the logo, set on a wave
 * with changing sizes and tilts (a few filled, the open dot in between).
 */
function AnneauQBand({ content, pal }: BandProps) {
  // the clasp sits at the right end of the flat band (where the loop starts);
  // the second logo goes halfway round the worn loop, opposite the clasp
  const LX = BW - 260;
  const MX = Math.round(BW * (1 - LOOP_FRAC / 2));
  const Crowned = ({ x }: { x: number }) => (
    <g>
      <RingLogo brand={content.brand} cx={x} cy={BH / 2} R={44} cap={20} stroke={pal.accent} weight={2.6} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const cx = x + Math.cos(a) * 108;
        const cy = BH / 2 + Math.sin(a) * 56;
        return (
          <text key={i} transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${i % 2 ? 12 : -12})`} y={8} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={22} fill={i % 3 === 0 ? pal.accent : 'none'} stroke={pal.accent} strokeWidth={1.6} strokeLinejoin="round">
            ?
          </text>
        );
      })}
      {[-150, 150].map((dx) => (
        <path key={dx} d={`M${x + dx} 24V${BH - 24}`} stroke={pal.accent} strokeOpacity={0.4} strokeWidth={2} strokeDasharray="2 8" strokeLinecap="round" />
      ))}
    </g>
  );
  const sizes = [96, 70, 84, 62, 104, 74, 88, 66];
  const tilt = [-14, 9, -5, 16, -10, 6, -18, 12, -3];
  const run = (start: number, end: number, seed: number) => {
    const n = Math.max(2, Math.round((end - start) / 92) + 1);
    const step = (end - start) / (n - 1);
    return Array.from({ length: n }, (_, k) => {
      const i = k + seed;
      const x = start + k * step;
      const size = sizes[i % sizes.length];
      const y = BH / 2 + Math.sin(i * 0.9) * 12;
      return (
        <g key={i}>
          <text transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt[i % tilt.length]})`} y={size * 0.36} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={size} fill={i % 7 === 3 ? pal.accent : 'none'} stroke={pal.accent} strokeWidth={size > 80 ? 3 : 2.4} strokeLinejoin="round">
            ?
          </text>
          {k < n - 1 && i % 5 === 2 && <circle cx={x + step / 2} cy={BH / 2 - Math.cos(i) * 34} r={6} fill="none" stroke={pal.accent} strokeWidth={2.2} />}
        </g>
      );
    });
  };
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      {/* the band: only "?", broken by the two crowned logos */}
      {run(300, MX - 220, 0)}
      {run(MX + 220, LX - 220, 40)}
      <Crowned x={MX} />
      <Crowned x={LX} />
      <text x={70} y={BH / 2 + 10} fontFamily={FONT.mono} fontWeight={500} fontSize={26} letterSpacing={5} fill={pal.ink}>
        N°{content.editionNumber}
      </text>
    </g>
  );
}

function NeonBand({ content, pal }: BandProps) {
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i} transform={`translate(${120 + i * 780} 0)`}>
          <text x={0} y={BH / 2 + 32} fontFamily={FONT.round} fontWeight={700} fontSize={92} letterSpacing={2} fill={pal.ink}>
            {upper(content).replace(/\s*\?$/, '')}
          </text>
          <circle cx={600} cy={BH / 2} r={44} fill="none" stroke={pal.accent} strokeWidth={4} />
          <text x={600} y={BH / 2 + 26} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={74} fill={pal.accent}>
            ?
          </text>
        </g>
      ))}
    </g>
  );
}

function RubanBand({ content, pal }: BandProps) {
  const id = useUid('rb');
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0" spreadMethod="reflect" gradientTransform="scale(0.2 1)">
          <stop offset="0" stopColor={pal.bg} />
          <stop offset="1" stopColor={pal.bg2} />
        </linearGradient>
      </defs>
      <rect width={BW} height={BH} fill={`url(#${id})`} />
      {Array.from({ length: 12 }, (_, i) => {
        const x = 180 + i * 285;
        return i % 3 === 2 ? (
          <text key={i} x={x} y={BH / 2 + 12} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={30} letterSpacing={5} fill={pal.ink}>
            {upper(content)}
          </text>
        ) : (
          <g key={i} transform={`translate(${x} ${BH / 2}) rotate(${i % 2 ? 12 : -10})`}>
            <text y={44} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={128} fill={pal.ink}>
              ?
            </text>
            <circle cx={0} cy={31} r={10} fill={pal.accent} />
          </g>
        );
      })}
    </g>
  );
}

function EditionBand({ content, pal }: BandProps) {
  const names = content.lineup.map((a) => a.name.toUpperCase()).filter(Boolean).join('  +  ');
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      <rect y={10} width={BW} height={5} fill={pal.accent} />
      <rect y={BH - 15} width={BW} height={5} fill={pal.accent} />
      <text x={220} y={BH / 2 + 12} fontFamily={FONT.mono} fontWeight={500} fontSize={32} letterSpacing={4} fill={pal.ink}>
        {numDate(content.date)} · {content.hours}
      </text>
      <RingLogo brand={content.brand} cx={BW / 2} cy={BH / 2} R={48} cap={22} stroke={pal.accent} weight={2.6} />
      <text x={BW / 2 + 120} y={BH / 2 + 16} fontFamily={FONT.round} fontWeight={600} fontSize={44} fill={pal.ink}>
        {names}
      </text>
      <text x={BW - 70} y={BH / 2 + 12} textAnchor="end" fontFamily={FONT.mono} fontWeight={500} fontSize={30} letterSpacing={4} fill={pal.accent}>
        N°{content.editionNumber} · {content.venue}
      </text>
    </g>
  );
}

function TunnelBand({ content, pal }: BandProps) {
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      {Array.from({ length: 9 }, (_, i) => {
        const x = 200 + i * 390;
        return (
          <g key={i}>
            {[1, 0.62, 0.38].map((k, j) => (
              <RingLogo key={j} brand={content.brand} cx={x} cy={BH / 2} R={58 * k} cap={26 * k} stroke={j === 0 ? pal.accent : mix(pal.accent, pal.bg, 0.25 + j * 0.25)} weight={2.4 * Math.max(0.6, k)} dot={j === 0} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

function SignatureBand({ content, pal }: BandProps) {
  const sig = content.signature
    .split('\n')
    .map((l) => l.trim().toUpperCase())
    .filter(Boolean);
  const words = sig.length ? sig : ['MÊME LIEU', 'MÊMES GENS', 'UNE AUTRE EXPÉRIENCE'];
  let x = 90;
  const items: JSX.Element[] = [];
  let k = 0;
  while (x < BW - 200) {
    const w = words[k % words.length];
    items.push(
      <text key={'t' + k} x={x} y={BH / 2 + 18} fontFamily={FONT.round} fontWeight={600} fontSize={54} letterSpacing={2} fill={pal.ink}>
        {w}
      </text>,
    );
    x += w.length * 33 + 70;
    items.push(
      <g key={'q' + k}>
        <circle cx={x} cy={BH / 2} r={30} fill={pal.accent} />
        <text x={x} y={BH / 2 + 17} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={46} fill={pal.bg}>
          ?
        </text>
      </g>,
    );
    x += 100;
    k++;
  }
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      {items}
    </g>
  );
}

function DamierBand({ content, pal }: BandProps) {
  const cells = Math.floor(BW / BH);
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      {Array.from({ length: cells + 1 }, (_, i) => {
        const dark = i % 2 === 1;
        const x = i * BH;
        return (
          <g key={i}>
            {dark && <rect x={x} width={BH} height={BH} fill={pal.ink} />}
            {i % 6 === 3 ? (
              <RingLogo brand={content.brand} cx={x + BH / 2} cy={BH / 2} R={44} cap={20} stroke={pal.accent} weight={2.4} />
            ) : (
              <text x={x + BH / 2} y={BH / 2 + 34} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={104} fill={i % 3 === 0 ? pal.accent : dark ? pal.bg : pal.ink}>
                ?
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function CodeBand({ content, pal }: BandProps) {
  const bars = useMemo(() => {
    const r = rng(77);
    const out: { x: number; w: number }[] = [];
    let x = 60;
    while (x < BW - 60) {
      const w = 4 + Math.floor(r() * 4) * 5;
      if (x < 1350 || x > 2150) out.push({ x, w });
      x += w + 6 + Math.floor(r() * 3) * 6;
    }
    return out;
  }, []);
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={22} width={b.w} height={BH - 44} fill={i % 23 === 0 ? pal.accent : pal.ink} />
      ))}
      <text x={BW / 2} y={BH / 2 - 4} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={50} fill={pal.ink}>
        {upper(content)}
      </text>
      <text x={BW / 2} y={BH / 2 + 38} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={26} letterSpacing={5} fill={pal.accent}>
        N°{content.editionNumber} · {numDate(content.date)}
      </text>
    </g>
  );
}


/* ---- festival-style bands: several elements on one strip ---- */

/** Diagonal stripes filling a box (hazard / sport look). */
function Stripes({ x, w, color, gap = 34, angle = 35 }: { x: number; w: number; color: string; gap?: number; angle?: number }) {
  const id = useUid('st');
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={x} width={w} height={BH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {Array.from({ length: Math.ceil((w + BH * 2) / (gap * 2)) }, (_, i) => (
          <rect key={i} x={x - BH + i * gap * 2} y={-BH} width={gap} height={BH * 3} fill={color} transform={`rotate(${angle} ${x - BH + i * gap * 2} ${BH / 2})`} />
        ))}
      </g>
    </g>
  );
}


/* ======================================================================= */
/* ENTRY passes — one bracelet for every guest, packed with details        */
/* ======================================================================= */

const ICONS: Record<string, string> = {
  palm: 'M50 98C52 76 54 56 50 40M50 40C40 28 24 28 12 38M50 40C44 22 50 10 62 4M50 40C62 26 78 26 90 38M50 40C60 44 68 54 70 66M50 40C40 46 32 56 30 68',
  wave: 'M4 46C14 28 26 28 34 46C42 64 56 64 64 46C72 28 86 28 96 44M4 72C14 54 26 54 34 72C42 90 56 90 64 72C72 54 86 54 96 70',
  sun: 'M50 30A20 20 0 1 1 49.9 30M50 4V16M50 84V96M4 50H16M84 50H96M17 17L26 26M74 74L83 83M83 17L74 26M26 74L17 83',
  glass: 'M14 14H86L50 54ZM50 54V88M30 90H70M64 6L74 26M40 30A6 6 0 1 1 39.9 30',
  vinyl: 'M50 6A44 44 0 1 1 49.9 6M50 34A16 16 0 1 1 49.9 34M50 46A4 4 0 1 1 49.9 46M50 18A32 32 0 0 1 82 50',
  note: 'M34 76A12 10 0 1 1 33.9 76M46 76V20L80 12V64M80 64A12 10 0 1 1 79.9 64M46 34L80 26',
  star: 'M50 6L58 42L94 50L58 58L50 94L42 58L6 50L42 42Z',
};

function Icon({ kind, x, y, s, color, w = 6, fill }: { kind: keyof typeof ICONS; x: number; y: number; s: number; color: string; w?: number; fill?: string }) {
  return (
    <g transform={`translate(${x - s / 2} ${y - s / 2}) scale(${s / 100})`}>
      <path d={ICONS[kind]} fill={fill ?? 'none'} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

const lineupOf = (c: EventContent) => c.lineup.map((a) => a.name.toUpperCase()).filter(Boolean).join('  +  ');
const serial = (c: EventContent) => `N°${c.editionNumber.padStart(2, '0')} · 0001`;

function Pill({ x, y, t, size, color, fill }: { x: number; y: number; t: string; size: number; color: string; fill?: string }) {
  const w = measure(t, { family: "'Fredoka'", size, weight: 600 }) + size * 1.1;
  const h = size * 1.55;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={fill ?? 'none'} stroke={color} strokeWidth={3.5} />
      <text x={x} y={y + size * 0.36} textAnchor="middle" fontFamily={FONT.round} fontWeight={600} fontSize={size} fill={fill ? color === fill ? '#ffffff' : color : color}>
        {t}
      </text>
    </g>
  );
}

const fitText = (x: number, y: number, t: string, size: number, maxW: number, fill: string, o: { family?: string; css?: string; weight?: number; anchor?: 'start' | 'middle' | 'end'; spacing?: number } = {}) => {
  const fam = o.family ?? "'Fredoka'";
  const weight = o.weight ?? 600;
  const fs = fitMeasured(t, maxW, { family: fam, size, weight, tracking: (o.spacing ?? 0) * size });
  return (
    <text x={x} y={y} textAnchor={o.anchor ?? 'middle'} fontFamily={o.css ?? FONT.round} fontWeight={weight} fontSize={fs} letterSpacing={(o.spacing ?? 0) * fs} fill={fill}>
      {t}
    </text>
  );
};

function Serial({ x, content, color, accent }: { x: number; content: EventContent; color: string; accent: string }) {
  return (
    <g fontFamily={FONT.mono} fontWeight={500} letterSpacing={4} textAnchor="end">
      <text x={x} y={BH / 2 - 6} fontSize={24} fill={accent}>
        ENTRÉE
      </text>
      <text x={x} y={BH / 2 + 26} fontSize={22} fill={color}>
        {serial(content)}
      </text>
    </g>
  );
}

/** Nuit — Ruban's blue night, the whole evening along the wrist. */
function NuitBand({ content, pal }: BandProps) {
  const id = useUid('nu');
  const stars = useMemo(() => {
    const r = rng(12);
    return Array.from({ length: 90 }, () => ({ x: r() * BW, y: 10 + r() * 130, r: 1 + r() * 2.4 }));
  }, []);
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0" spreadMethod="reflect" gradientTransform="scale(0.33 1)">
          <stop offset="0" stopColor={pal.bg} />
          <stop offset="1" stopColor={pal.bg2} />
        </linearGradient>
      </defs>
      <rect width={BW} height={BH} fill={`url(#${id})`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={pal.ink} opacity={0.35} />
      ))}
      <RingLogo brand={content.brand} cx={240} cy={BH / 2} R={48} cap={22} stroke={pal.accent} weight={2.8} />
      <LogoWord brand={content.brand} x={590} y={BH / 2} size={52} color={pal.ink} weight={3} />
      <Pill x={980} y={BH / 2} t={numDate(content.date)} size={38} color={pal.ink} />
      <Icon kind="palm" x={1210} y={BH / 2 + 4} s={110} color={pal.ink} />
      <Icon kind="wave" x={1330} y={BH / 2 + 10} s={80} color={pal.ink} w={7} />
      {fitText(1890, BH / 2 + 16, lineupOf(content), 44, 880, pal.ink)}
      <Icon kind="star" x={2385} y={44} s={34} color={pal.accent} fill={pal.accent} w={2} />
      <Icon kind="star" x={2420} y={104} s={22} color={pal.ink} fill={pal.ink} w={2} />
      <g fontFamily={FONT.mono} fontWeight={500} letterSpacing={5} textAnchor="middle">
        <text x={2680} y={BH / 2 - 4} fontSize={32} fill={pal.ink}>
          {content.hours}
        </text>
        <text x={2680} y={BH / 2 + 30} fontSize={22} fill={pal.accent}>
          {content.venue}
        </text>
      </g>
      <g transform={`translate(3060 ${BH / 2}) rotate(-10)`}>
        <text y={44} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={130} fill={pal.ink}>
          ?
        </text>
        <circle cx={0} cy={31} r={10} fill={pal.accent} />
      </g>
      <Serial x={BW - 60} content={content} color={pal.ink} accent={pal.accent} />
    </g>
  );
}

/** Coucher de soleil — an illustrated Tunisian summer evening, the sun is the logo. */
function SoleilBand({ content, pal }: BandProps) {
  const id = useUid('so');
  const palms = [430, 1080, 1600, 2240];
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.bg2} />
          <stop offset="0.7" stopColor={pal.bg} />
        </linearGradient>
        <clipPath id={id + 'c'}>
          <rect width={BW} height={104} />
        </clipPath>
      </defs>
      <rect width={BW} height={BH} fill={`url(#${id})`} />
      {[760, 2560].map((x) => (
        <g key={x} clipPath={`url(#${id}c)`}>
          <circle cx={x} cy={104} r={70} fill="#ffd27a" opacity={0.9} />
          <RingLogo brand={content.brand} cx={x} cy={96} R={52} cap={24} stroke={pal.accent} weight={2.8} />
        </g>
      ))}
      <rect y={104} width={BW} height={46} fill={pal.ink} />
      {Array.from({ length: 30 }, (_, i) => (
        <path key={i} d={`M${i * 120} 122q15 -8 30 0t30 0`} fill="none" stroke={pal.bg2} strokeWidth={3} opacity={0.6} />
      ))}
      {palms.map((x, i) => (
        <g key={x} transform={`translate(${x} 0) scale(${i % 2 ? 0.85 : 1}) translate(${-x} 0)`}>
          <Icon kind="palm" x={x} y={58} s={104} color={pal.ink} w={9} />
        </g>
      ))}
      <LogoWord brand={content.brand} x={1350} y={56} size={50} color="#ffffff" weight={3.2} />
      {fitText(1930, 70, numDate(content.date), 46, 300, '#ffffff', { weight: 700 })}
      <text x={1930} y={140} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={20} letterSpacing={5} fill={pal.bg2}>
        {content.hours}
      </text>
      {fitText(2880, 68, lineupOf(content), 40, 620, '#ffffff')}
      <text x={2880} y={140} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={18} letterSpacing={5} fill={pal.bg2}>
        {content.venue}
      </text>
      <Serial x={BW - 60} content={content} color="#ffffff" accent={pal.ink} />
    </g>
  );
}

/** Néon nuit — black, everything drawn in red neon outline: the bar, the music, the logo. */
function NeonNuitBand({ content, pal }: BandProps) {
  const zig = (x: number) => <path d={`M${x} 40L${x + 18} 64L${x} 86L${x + 18} 110`} fill="none" stroke={pal.accent} strokeWidth={4} strokeLinejoin="round" opacity={0.7} />;
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      <RingLogo brand={content.brand} cx={240} cy={BH / 2} R={48} cap={22} stroke={pal.accent} weight={2.8} />
      <Icon kind="glass" x={430} y={BH / 2} s={86} color={pal.accent} w={5} />
      <LogoWord brand={content.brand} x={790} y={BH / 2} size={52} color={pal.accent} weight={3} />
      {zig(1080)}
      <Pill x={1300} y={BH / 2} t={numDate(content.date)} size={38} color={pal.accent} />
      <text x={1560} y={BH / 2 + 12} fontFamily={FONT.mono} fontWeight={500} fontSize={32} letterSpacing={5} fill={pal.ink}>
        {content.hours}
      </text>
      <Icon kind="vinyl" x={1990} y={BH / 2} s={96} color={pal.accent} w={4} />
      {fitText(2500, BH / 2 + 16, lineupOf(content), 42, 800, pal.ink)}
      <Icon kind="note" x={2960} y={BH / 2} s={84} color={pal.accent} w={5} />
      {zig(3060)}
      <Serial x={BW - 60} content={content} color={pal.ink} accent={pal.accent} />
    </g>
  );
}

/** Mosaïque — a Tunisian tile pattern with white windows holding the details. */
function MosaiqueBand({ content, pal }: BandProps) {
  const id = useUid('mo');
  const T = 75;
  const win = (x: number, w: number, child: JSX.Element) => (
    <g>
      <rect x={x - w / 2} y={18} width={w} height={BH - 36} rx={20} fill={pal.bg2} />
      {child}
    </g>
  );
  return (
    <g>
      <defs>
        <pattern id={id} width={T} height={T} patternUnits="userSpaceOnUse">
          <rect width={T} height={T} fill={pal.bg} />
          <rect x={T * 0.22} y={T * 0.22} width={T * 0.56} height={T * 0.56} fill="none" stroke={pal.bg2} strokeWidth={3} />
          <rect x={T * 0.22} y={T * 0.22} width={T * 0.56} height={T * 0.56} fill="none" stroke={pal.bg2} strokeWidth={3} transform={`rotate(45 ${T / 2} ${T / 2})`} />
          <circle cx={T / 2} cy={T / 2} r={5} fill={pal.accent} />
          <path d={`M0 0L${T * 0.12} 0L0 ${T * 0.12}ZM${T} 0L${T * 0.88} 0L${T} ${T * 0.12}ZM0 ${T}L${T * 0.12} ${T}L0 ${T * 0.88}ZM${T} ${T}L${T * 0.88} ${T}L${T} ${T * 0.88}Z`} fill={pal.bg2} />
        </pattern>
      </defs>
      <rect width={BW} height={BH} fill={`url(#${id})`} />
      {win(420, 300, <RingLogo brand={content.brand} cx={420} cy={BH / 2} R={46} cap={21} stroke={pal.accent} weight={2.6} />)}
      {win(1040, 640, <LogoWord brand={content.brand} x={1040} y={BH / 2} size={50} color={pal.bg} weight={3} />)}
      {win(1730, 520, <g>{fitText(1730, BH / 2 - 2, numDate(content.date), 40, 440, pal.bg, { weight: 700 })}<text x={1730} y={BH / 2 + 32} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={22} letterSpacing={5} fill={pal.accent}>{content.hours}</text></g>)}
      {win(2490, 760, <g>{fitText(2490, BH / 2 + 4, lineupOf(content), 36, 700, pal.bg)}<text x={2490} y={BH / 2 + 34} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={18} letterSpacing={5} fill={pal.accent}>{content.venue}</text></g>)}
      {win(3200, 380, <Serial x={3360} content={content} color={pal.bg} accent={pal.accent} />)}
    </g>
  );
}

/** Billet — a real ticket on the wrist: perforated sections, serial, barcode, stamp. */
function BilletBand({ content, pal }: BandProps) {
  const cuts = [520, 1260, 1860, 2700];
  const bars = useMemo(() => {
    const r = rng(5);
    const out: { x: number; w: number }[] = [];
    let x = 2760;
    while (x < 3200) {
      const w = 3 + Math.floor(r() * 3) * 4;
      out.push({ x, w });
      x += w + 5 + Math.floor(r() * 2) * 5;
    }
    return out;
  }, []);
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      <rect y={8} width={BW} height={3} fill={pal.ink} />
      <rect y={16} width={BW} height={1.5} fill={pal.ink} />
      <rect y={BH - 11} width={BW} height={3} fill={pal.ink} />
      <rect y={BH - 17.5} width={BW} height={1.5} fill={pal.ink} />
      {cuts.map((x) => (
        <line key={x} x1={x} x2={x} y1={24} y2={BH - 24} stroke={pal.ink} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />
      ))}
      <g fontFamily={FONT.mono} fontWeight={500} letterSpacing={5}>
        <text x={130} y={BH / 2 - 4} fontSize={30} fill={pal.accent}>
          ENTRÉE
        </text>
        <text x={130} y={BH / 2 + 30} fontSize={22} fill={pal.ink}>
          {serial(content)}
        </text>
      </g>
      <RingLogo brand={content.brand} cx={640} cy={BH / 2} R={44} cap={20} stroke={pal.accent} weight={2.6} />
      <LogoWord brand={content.brand} x={990} y={BH / 2} size={46} color={pal.ink} weight={2.8} />
      {fitText(1560, BH / 2 + 4, numDate(content.date), 52, 520, pal.ink, { weight: 700 })}
      <text x={1560} y={BH / 2 + 40} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={22} letterSpacing={5} fill={pal.accent}>
        {content.hours}
      </text>
      {fitText(2280, BH / 2 + 2, lineupOf(content), 36, 760, pal.ink)}
      <text x={2280} y={BH / 2 + 38} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={18} letterSpacing={5} fill={pal.ink}>
        {content.venue}
      </text>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={34} width={b.w} height={BH - 68} fill={pal.ink} />
      ))}
      <g transform={`translate(3360 ${BH / 2}) rotate(-14)`} opacity={0.9}>
        <circle r={52} fill="none" stroke={pal.accent} strokeWidth={4} />
        <circle r={42} fill="none" stroke={pal.accent} strokeWidth={1.5} />
        <text y={30} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={84} fill={pal.accent}>
          ?
        </text>
      </g>
    </g>
  );
}

/** Fête — maximal: stripes, checkerboard, logo, date pill, icons, everything at once. */
function FeteBand({ content, pal }: BandProps) {
  const check = Array.from({ length: 8 }, (_, i) => i);
  return (
    <g>
      <rect width={BW} height={BH} fill={pal.bg} />
      <Stripes x={0} w={420} color={pal.ink} gap={28} />
      <RingLogo brand={content.brand} cx={560} cy={BH / 2} R={46} cap={21} stroke={pal.ink} weight={2.8} />
      <LogoWord brand={content.brand} x={920} y={BH / 2} size={52} color={pal.ink} weight={3.2} />
      <g>
        {check.map((i) => (
          <g key={i}>
            <rect x={1220 + i * 37.5} y={0} width={37.5} height={75} fill={i % 2 ? pal.ink : pal.bg} />
            <rect x={1220 + i * 37.5} y={75} width={37.5} height={75} fill={i % 2 ? pal.bg : pal.ink} />
          </g>
        ))}
      </g>
      <Pill x={1760} y={BH / 2} t={numDate(content.date)} size={40} color={pal.ink} />
      <Icon kind="star" x={1990} y={48} s={40} color={pal.accent} fill={pal.accent} w={2} />
      <Icon kind="note" x={2060} y={BH / 2 + 6} s={70} color={pal.ink} w={6} />
      {fitText(2510, BH / 2 + 14, lineupOf(content), 40, 640, pal.ink, { weight: 700 })}
      <Icon kind="sun" x={2900} y={BH / 2} s={72} color={pal.ink} w={6} />
      <Stripes x={3000} w={500} color={pal.ink} gap={28} />
      <rect x={3080} y={42} width={360} height={66} rx={33} fill={pal.bg} />
      <text x={3260} y={BH / 2 + 10} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={22} letterSpacing={4} fill={pal.ink}>
        ENTRÉE · {serial(content)}
      </text>
    </g>
  );
}

export const DESIGNS: Design[] = [
  { id: 'nuit', name: 'Nuit', tag: 'Entrée · bleu nuit', pal: { bg: '#050a24', bg2: '#1636d8', ink: '#f2f5ff', accent: RED }, clasp: '#1636d8', Band: NuitBand, idea: 'Toute la soirée sur le poignet, dans le bleu de Ruban semé d’étoiles : logo, UNE AUTRE ? façon logo, date en pastille, palmier et vagues, line-up, horaires et lieu, grand « ? » et numéro d’entrée.' },
  { id: 'soleil', name: 'Coucher de soleil', tag: 'Entrée · illustré', pal: { bg: '#ff5a1f', bg2: '#ff3d8a', ink: '#2a0b20', accent: '#ffffff' }, clasp: '#2a0b20', Band: SoleilBand, idea: 'Une illustration en plein couleur : ciel rose-orange, mer et palmiers en silhouette, deux soleils qui sont le logo en anneau, et toutes les infos en blanc.' },
  { id: 'neonnuit', name: 'Néon nuit', tag: 'Entrée · néon', pal: { bg: '#0b0b0b', bg2: '#0b0b0b', ink: '#ffffff', accent: RED }, clasp: '#111111', Band: NeonNuitBand, idea: 'Noir, tout dessiné en néon rouge : le logo, un cocktail, un vinyle, une note, des éclairs, la date en pastille, les horaires et le line-up.' },
  { id: 'mosaique', name: 'Mosaïque', tag: 'Entrée · zellige', pal: { bg: '#0d3b8c', bg2: '#ffffff', ink: '#0d3b8c', accent: RED }, clasp: '#ffffff', Band: MosaiqueBand, idea: 'Un motif de carreaux tunisiens bleu et blanc, ponctué de rouge, avec cinq fenêtres blanches : logo, UNE AUTRE ?, date et horaires, line-up et lieu, numéro d’entrée.' },
  { id: 'billet', name: 'Billet', tag: 'Entrée · ticket', pal: { bg: '#f4efe6', bg2: '#f4efe6', ink: '#111111', accent: RED }, clasp: RED, Band: BilletBand, idea: 'Un vrai billet au poignet : filets doubles, sections prédécoupées, ENTRÉE et numéro de série, logo, date en grand, line-up, code-barres et tampon « ? ».' },
  { id: 'fete', name: 'Fête', tag: 'Entrée · maximal', pal: { bg: '#ffd400', bg2: '#ffd400', ink: '#111111', accent: RED }, clasp: '#111111', Band: FeteBand, idea: 'Tout en même temps : rayures, damier, logo, UNE AUTRE ? façon logo, date en pastille, étoile, note, soleil, line-up et numéro d’entrée — joyeux et très photographiable.' },
  { id: 'anneau', name: 'Anneau', tag: 'Noir & rouge', pal: { bg: '#0b0b0b', bg2: '#0b0b0b', ink: '#ffffff', accent: RED }, clasp: '#111111', Band: AnneauBand, idea: 'Le logo en anneau en contour rouge, alterné avec UNE AUTRE ? en toutes lettres, N° d’édition au bout. Le plus fidèle à l’identité.' },
  { id: 'anneauq', name: 'Anneau ?', tag: 'Nouveau · tout en « ? »', pal: { bg: '#0b0b0b', bg2: '#0b0b0b', ink: '#ffffff', accent: RED }, clasp: '#111111', Band: AnneauQBand, idea: 'Comme Anneau, mais le nom disparaît : le logo en anneau seul, entouré d’une couronne de « ? », côté fermeture et au milieu du poignet ; tout le reste du bracelet n’est fait que de « ? » en contour rouge, de tailles et d’inclinaisons différentes, quelques-uns pleins. N° d’édition au bout libre.' },
  { id: 'neon', name: 'Néon', tag: 'Rouge plein', pal: { bg: '#e3121b', bg2: '#e3121b', ink: '#ffffff', accent: '#ffffff' }, clasp: '#ffffff', Band: NeonBand, idea: 'Rouge plein, UNE AUTRE en blanc, le « ? » dans un cercle comme un sceau. Se voit de loin, à la porte et sur les photos.' },
  { id: 'ruban', name: 'Ruban', tag: 'Bleu nuit', pal: { bg: '#050a24', bg2: '#1636d8', ink: '#e6eaf6', accent: RED }, clasp: '#1636d8', Band: RubanBand, idea: 'Le dégradé de Ruban, des « ? » argent qui dansent avec leur point rouge. Assorti aux affiches 3D.' },
  { id: 'edition', name: 'Édition', tag: 'Collector', pal: { bg: '#f4efe6', bg2: '#f4efe6', ink: '#111111', accent: RED }, clasp: RED, Band: EditionBand, idea: 'Deux filets rouges, la date et les horaires, l’anneau au centre, le line-up et le lieu : un vrai billet, différent à chaque soirée.' },
  { id: 'tunnel', name: 'Tunnel', tag: 'Nouveau · hypnotique', pal: { bg: '#0b0b0b', bg2: '#0b0b0b', ink: '#ffffff', accent: RED }, clasp: RED, Band: TunnelBand, idea: 'Le logo répété en anneaux imbriqués, de plus en plus petits — l’affiche Tunnel, au poignet.' },
  { id: 'signature', name: 'Signature', tag: 'Nouveau · la phrase', pal: { bg: '#111111', bg2: '#111111', ink: '#ffffff', accent: RED }, clasp: '#111111', Band: SignatureBand, idea: 'MÊME LIEU · MÊMES GENS · UNE AUTRE EXPÉRIENCE tout autour du poignet, ponctué de « ? » rouges : on lit la promesse en tournant le bras.' },
  { id: 'damier', name: 'Damier', tag: 'Nouveau · graphique', pal: { bg: '#ffffff', bg2: '#ffffff', ink: '#111111', accent: RED }, clasp: '#111111', Band: DamierBand, idea: 'Un damier noir et blanc de « ? », un sur trois en rouge, le logo toutes les six cases. Très pop, très photographiable.' },
  { id: 'code', name: 'Code-barres', tag: 'Nouveau · billet', pal: { bg: '#f4efe6', bg2: '#f4efe6', ink: '#111111', accent: RED }, clasp: RED, Band: CodeBand, idea: 'Un code-barres graphique avec une fenêtre centrale : UNE AUTRE ?, le numéro et la date. L’esthétique du billet, sans carton.' },
];

const bandSvg = (d: Design, pal: Pal, content: EventContent) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${BW} ${BH}`} width={BW} height={BH}>
    <d.Band content={content} pal={pal} />
  </svg>
);

/* ======================================================================= */
/* 3D wristband                                                             */
/* ======================================================================= */

const RX = 3.3;
const RZ = 2.7;
const WIDTH = 1.5;
const LOOP_FRAC = 0.55;
const TAIL = 12;

/** The band as a ribbon: one turn around the wrist (slight spiral so the end overlaps), then a free tail out of the clasp. */
function ribbonGeometry() {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const push = (x: number, y: number, z: number, u: number) => {
    pos.push(x, y + WIDTH / 2, z, x, y - WIDTH / 2, z);
    uv.push(1 - u, 1, 1 - u, 0);
  };
  const N = 260;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * Math.PI * 2;
    const g = 1 + t * 0.035;
    push(Math.cos(a) * RX * g, 0, Math.sin(a) * RZ * g, t * LOOP_FRAC);
  }
  const ex = RX * 1.035;
  const M = 90;
  for (let k = 1; k <= M; k++) {
    const s = k / M;
    const d = s * TAIL;
    // the free tail falls softly and twists a little, like real fabric
    const tw = Math.sin(s * Math.PI) * 0.35;
    const cx = ex + d * 0.28 + s * s * 1.2;
    const cy = -s * s * 2.2;
    const cz = d * 0.92;
    const u = LOOP_FRAC + s * (1 - LOOP_FRAC);
    pos.push(cx - Math.sin(tw) * WIDTH * 0.5, cy + Math.cos(tw) * WIDTH * 0.5, cz, cx + Math.sin(tw) * WIDTH * 0.5, cy - Math.cos(tw) * WIDTH * 0.5, cz);
    uv.push(1 - u, 1, 1 - u, 0);
  }
  const rows = N + M + 1;
  for (let i = 0; i < rows - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The band lying open on a table, face up, with a soft S curve (like a product shot). */
function flatGeometry() {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const L = 35;
  const N = 300;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = L / 2 - L * s;
    const z = Math.sin(s * Math.PI * 1.6) * 1.6;
    const dz = Math.cos(s * Math.PI * 1.6) * 1.6 * Math.PI * 1.6 / L;
    // half-width vector, perpendicular to the curve in the table plane
    const nx = -dz / Math.hypot(1, dz);
    const nz = 1 / Math.hypot(1, dz);
    const y = 0.06 + Math.max(0, Math.sin(s * Math.PI * 5.2)) * 0.12;
    pos.push(x + nx * WIDTH * 0.5, y, z + nz * WIDTH * 0.5, x - nx * WIDTH * 0.5, y, z - nz * WIDTH * 0.5);
    uv.push(1 - s, 0, 1 - s, 1);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Plain-weave polyester: a tiny tile of over/under threads → normal map (built once). */
let weaveCache: THREE.CanvasTexture | null = null;
function weaveNormal() {
  if (weaveCache) return weaveCache;
  const N = 64;
  const T = 8; // threads per tile
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const cx = Math.floor((x / N) * T);
      const cy = Math.floor((y / N) * T);
      const fx = ((x / N) * T) % 1;
      const fy = ((y / N) * T) % 1;
      const warpUp = (cx + cy) % 2 === 0;
      const warp = Math.sin(fy * Math.PI) * (warpUp ? 1 : 0.35) * (0.75 + 0.25 * Math.sin(fx * Math.PI));
      const weft = Math.sin(fx * Math.PI) * (warpUp ? 0.35 : 1) * (0.75 + 0.25 * Math.sin(fy * Math.PI));
      h[y * N + x] = Math.max(warp, weft);
    }
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  const H = (x: number, y: number) => h[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2;
      const dy = (H(x, y + 1) - H(x, y - 1)) * 2.2;
      const l = Math.hypot(dx, dy, 1);
      const o = (y * N + x) * 4;
      img.data[o] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      img.data[o + 2] = (1 / l) * 255;
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(110, 5);
  weaveCache = t;
  return t;
}

/** Heat-cut edges: a fine darker line along both selvedges, drawn onto the band texture. */
function sealEdges(tex: THREE.CanvasTexture) {
  const c = tex.image as HTMLCanvasElement;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const e = Math.max(2, Math.round(c.height * 0.028));
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(0, 0, c.width, e);
  ctx.fillRect(0, c.height - e, c.width, e);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(0, e, c.width, 1);
  ctx.fillRect(0, c.height - e - 1, c.width, 1);
  tex.needsUpdate = true;
}

export type StandKind = 'poignet' | 'socle' | 'table' | 'aucun';

export function Band3D({ d, pal, clasp, stand, spin, content }: { d: Design; pal: Pal; clasp: string; stand: StandKind; spin: boolean; content: EventContent }) {
  return (
    <Viewer3D
      className="wb-viewer"
      background="#121316"
      camera={[15, 8, 22]}
      target={[2.2, -0.8, 3]}
      autoRotate={spin}
      deps={[d.id, JSON.stringify(pal), clasp, stand, content]}
      setup={({ scene, renderer, camera, controls }) => {
        const group = new THREE.Group();
        scene.add(group);
        const flat = stand === 'table';
        const floor = scene.getObjectByName('floor');
        if (floor) floor.position.y = flat ? 0 : -6;
        controls.maxDistance = flat ? 90 : 40;
        if (flat) {
          camera.position.set(0, 36, 27);
          controls.target.set(0, 0, 0);
        } else {
          camera.position.set(15, 8, 22);
          controls.target.set(2.2, -0.8, 3);
        }
        controls.update();
        let alive = true;
        const disposers: (() => void)[] = [];
        const geo = flat ? flatGeometry() : ribbonGeometry();
        disposers.push(() => geo.dispose());
        svgTexture(bandSvg(d, pal, content), 4096, 176, renderer).then((tex) => {
          if (!alive) return tex.dispose();
          sealEdges(tex);
          const weave = weaveNormal();
          // woven polyester: soft satin sheen running along the threads, fine weave relief
          const fabric = {
            roughness: 0.6,
            sheen: 0.45,
            sheenRoughness: 0.45,
            sheenColor: new THREE.Color(pal.bg).lerp(new THREE.Color('#ffffff'), flat ? 0.1 : 0.2),
            anisotropy: 0.3,
            normalMap: weave,
            normalScale: new THREE.Vector2(0.22, 0.22),
            envMapIntensity: 0.32,
          };
          const outer = new THREE.MeshPhysicalMaterial({ map: tex, ...fabric, side: THREE.BackSide });
          const inner = new THREE.MeshPhysicalMaterial({ color: mix(pal.bg, '#000000', 0.28), ...fabric, sheen: 0.7, side: THREE.FrontSide });
          const a = new THREE.Mesh(geo, outer);
          const b = new THREE.Mesh(geo, inner);
          a.castShadow = b.castShadow = true;
          group.add(a, b);
          disposers.push(() => {
            tex.dispose();
            outer.dispose();
            inner.dispose();
          });
        });
        const claspMat = new THREE.MeshPhysicalMaterial({ color: clasp, roughness: 0.35, clearcoat: 0.6 });
        const claspMesh = new THREE.Mesh(new RoundedBoxGeometry(0.62, WIDTH + 0.4, 1.1, 4, 0.14), claspMat);
        if (flat) {
          claspMesh.rotation.z = Math.PI / 2;
          claspMesh.position.set(17.5 + 0.2, 0.32, 0);
        } else claspMesh.position.set(RX * 1.02, 0, 0.1);
        claspMesh.castShadow = true;
        group.add(claspMesh);
        disposers.push(() => {
          claspMesh.geometry.dispose();
          claspMat.dispose();
        });
        if (stand === 'poignet' || stand === 'socle') {
          const mat =
            stand === 'poignet'
              ? new THREE.MeshPhysicalMaterial({ color: '#c99a7a', roughness: 0.55, sheen: 0.3 })
              : new THREE.MeshPhysicalMaterial({ color: '#1b1c20', roughness: 0.4, metalness: 0.2 });
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1, stand === 'poignet' ? 1.06 : 1, 12, 96), mat);
          cyl.scale.set(RX * 0.9, 1, RZ * 0.88);
          cyl.position.y = 1.2;
          cyl.castShadow = cyl.receiveShadow = true;
          group.add(cyl);
          disposers.push(() => {
            cyl.geometry.dispose();
            mat.dispose();
          });
        }
        return () => {
          alive = false;
          scene.remove(group);
          disposers.forEach((f) => f());
        };
      }}
    />
  );
}

/* ======================================================================= */
/* studio                                                                   */
/* ======================================================================= */

/** Fabric look for the flat preview only (never in the print file). */
function Weave() {
  const id = useUid('wv');
  return (
    <g pointerEvents="none">
      <defs>
        <pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width={4} height={8} fill="#ffffff" opacity={0.05} />
        </pattern>
        <linearGradient id={id + 's'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.18} />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="1" stopColor="#000000" stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <rect width={BW} height={BH} fill={`url(#${id})`} />
      <rect width={BW} height={BH} fill={`url(#${id}s)`} />
    </g>
  );
}

const SPEC = [
  ['Format', '15 × 350 mm (largeur standard, à confirmer avec le fabricant)'],
  ['Matière', 'Polyester tissé souple, plus épais que le satin'],
  ['Impression', 'Sublimation haute définition, recto'],
  ['Fermeture', 'Bague de fermeture classique, usage unique (inviolable)'],
  ['Fichier', 'PNG 300 dpi · 4134 × 177 px (le fabricant accepte PNG / JPG)'],
  ['Commande', 'À partir de 50 pièces · délai 2–3 semaines (d’après europaband.fr)'],
];

export const ColorRow = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="lc-row">
    <span>{label}</span>
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    <code>{value.toUpperCase()}</code>
  </label>
);

export function FabricPasses() {
  const { content } = useStudio();
  const [sel, setSel] = useState(() => {
    const q = /[?&]b=([a-z]+)/.exec(location.hash)?.[1];
    return DESIGNS.some((x) => x.id === q) ? q! : DESIGNS[0].id;
  });
  const d = DESIGNS.find((x) => x.id === sel)!;
  const [pals, setPals] = useState<Record<string, Pal>>({});
  const [clasps, setClasps] = useState<Record<string, string>>({});
  const pal = pals[d.id] ?? d.pal;
  const clasp = clasps[d.id] ?? d.clasp;
  const [stand, setStand] = useState<StandKind>('poignet');
  const [spin, setSpin] = useState(true);
  const [busy, setBusy] = useState(false);
  const setPal = (k: keyof Pal) => (v: string) => setPals((p) => ({ ...p, [d.id]: { ...pal, [k]: v } }));
  const base = `${slug(content.brand)}_pass-tissu-${d.id}_N${content.editionNumber}`;
  const exportSvg = async () => {
    let doc = await toSvgDocument(bandSvg(d, pal, content));
    doc = doc.replace(/<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, '<svg$1 width="350mm" height="15mm"');
    download(doc, base + '.svg');
  };
  const exportPng = async () => {
    setBusy(true);
    try {
      download(await rasterize(await toSvgDocument(bandSvg(d, pal, content)), 4134, 177), base + '_300dpi.png');
    } finally {
      setBusy(false);
    }
  };
  const resetColors = () => {
    setPals((p) => ({ ...p, [d.id]: d.pal }));
    setClasps((c) => ({ ...c, [d.id]: d.clasp }));
  };
  return (
    <section className="series">
      <header className="series-head">
        <p className="series-kicker">Pass d’entrée · bracelets en tissu · atelier 3D · {String(DESIGNS.length).padStart(2, '0')} designs</p>
        <h2>Le pass, au poignet</h2>
        <p>Polyester imprimé par sublimation, fermé par une bague inviolable — pas de carton. Choisissez un design, ajustez les couleurs et la bague, tournez le bracelet en 3D : la bande est dessinée à l’échelle réelle (350 × 15 mm) avec vos textes, et le fichier téléchargé est celui à envoyer au fabricant.</p>
      </header>
      <div className="wb-studio">
        <div className="wb-stage">
          <Band3D d={d} pal={pal} clasp={clasp} stand={stand} spin={spin} content={content} />
          <div className="wb-flat">
            <svg viewBox={`0 0 ${BW} ${BH}`}>
              <d.Band content={content} pal={pal} />
              <Weave />
            </svg>
            <p className="wb-dim">Bande à plat · 350 × 15 mm · échelle réelle du fichier</p>
          </div>
        </div>
        <aside className="live-controls wb-controls">
          <section>
            <h4>Design</h4>
            <div className="wb-picks">
              {DESIGNS.map((x) => (
                <button key={x.id} className={x.id === sel ? 'on' : ''} onClick={() => setSel(x.id)}>
                  <svg viewBox={`0 0 1200 ${BH}`}>
                    <x.Band content={content} pal={pals[x.id] ?? x.pal} />
                  </svg>
                  <span>{x.name}</span>
                  <small>{x.tag}</small>
                </button>
              ))}
            </div>
            <p className="wb-idea">{d.idea}</p>
          </section>
          <section>
            <h4>Couleurs</h4>
            <ColorRow label="Fond" value={pal.bg} onChange={setPal('bg')} />
            {d.pal.bg2 !== d.pal.bg && <ColorRow label="Fond 2" value={pal.bg2} onChange={setPal('bg2')} />}
            <ColorRow label="Encre" value={pal.ink} onChange={setPal('ink')} />
            <ColorRow label="Accent" value={pal.accent} onChange={setPal('accent')} />
            <ColorRow label="Bague" value={clasp} onChange={(v) => setClasps((c) => ({ ...c, [d.id]: v }))} />
            <button className="tbtn" onClick={resetColors}>
              Couleurs d’origine
            </button>
          </section>
          <section>
            <h4>Présentation</h4>
            <div className="lc-row">
              <span>Support</span>
              <div className="lc-choice">
                {(
                  [
                    ['poignet', 'Poignet'],
                    ['socle', 'Socle noir'],
                    ['table', 'À plat'],
                    ['aucun', 'Aucun'],
                  ] as [StandKind, string][]
                ).map(([v, l]) => (
                  <button key={v} className={v === stand ? 'on' : ''} onClick={() => setStand(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <label className="lc-row">
              <span>Rotation auto</span>
              <input type="checkbox" checked={spin} onChange={(e) => setSpin(e.target.checked)} />
              <code>{spin ? 'oui' : 'non'}</code>
            </label>
          </section>
          <section>
            <h4>Fabrication</h4>
            <dl className="wb-spec">
              {SPEC.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{k === 'Fermeture' ? `${v} — couleur ${clasp.toUpperCase()}` : v}</dd>
                </div>
              ))}
            </dl>
            <div className="wb-actions">
              <button className="tbtn solid" onClick={exportPng} disabled={busy}>
                {busy ? 'Export…' : 'PNG 300 dpi'}
              </button>
              <button className="tbtn" onClick={exportSvg}>
                SVG 350 × 15 mm
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
