/**
 * Directions 18–23 — "real-world" club posters: full-bleed atmospheric image,
 * centred hierarchy (title → date / venue → LINE UP → practical line).
 * Every image is generated (gradients, blur, glossy shading), no photo needed.
 */
import { useMemo, type FC, type ReactNode } from 'react';
import { lines, splitBrand, splitDate } from '../data/content';
import type { Colors, ConceptDef, CreativeSettings, EventContent, LogoProps, PosterProps, Tone } from '../data/types';
import { hexToRgb, useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { fitMeasured, measure } from '../lib/measure';
import { f1, rng } from '../lib/rng';
import { QUESTION_GLYPH } from '../lib/strokeFont';

/* ---------- colour helpers ---------- */
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
/** Base hue of the image, driven by the creative controls (background + accent). */
const baseHue = (c: Colors, s: CreativeSettings) => (c.background === 'paper' ? mix(s.accent, '#ffffff', 0.35) : c.background === 'dark' ? mix(s.accent, '#000000', 0.55) : s.accent);

const MONTHS: Record<string, string> = { janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12' };
/** "12 JUILLET 2025" → "12.07" (falls back to the raw date). */
function shortDate(date: string) {
  const m = /^(\d{1,2})\s+([^\s]+)/.exec(date.trim());
  const mm = m && MONTHS[m[2].toLowerCase()];
  return m && mm ? `${m[1].padStart(2, '0')}.${mm}` : date;
}
/** "RAYHANE" + "B2B KARIM SIALA" → "RAYHANE B2B KARIM SIALA" (club-poster habit). */
const joinB2B = (a: { name: string; detail: string }) => (/^b2b/i.test(a.detail) ? `${a.name} ${a.detail}` : a.name);

/* ---------- glossy tubes ---------- */
function Tube({ d, transform, color, sw, blur = 0 }: { d: string; transform?: string; color: string; sw: number; blur?: number }) {
  const id = useUid('tube');
  const layers = (
    <g transform={transform} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={mix(color, '#000000', 0.55)} strokeWidth={sw} />
      <path d={d} stroke={color} strokeWidth={sw * 0.78} transform={`translate(${-sw * 0.06} ${-sw * 0.06})`} />
      <path d={d} stroke={mix(color, '#ffffff', 0.45)} strokeWidth={sw * 0.34} transform={`translate(${-sw * 0.16} ${-sw * 0.18})`} opacity={0.85} />
      <path d={d} stroke="#ffffff" strokeWidth={sw * 0.09} transform={`translate(${-sw * 0.22} ${-sw * 0.24})`} opacity={0.8} />
    </g>
  );
  if (!blur) return layers;
  return (
    <g filter={`url(#${id})`}>
      <defs>
        <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
      </defs>
      {layers}
    </g>
  );
}

/** The "?" as a glossy tube (Trajet skeleton). Box: h tall, centred on (cx, cy). */
function GlossyQ({ cx, cy, h, color, blur = 0, rot = 0 }: { cx: number; cy: number; h: number; color: string; blur?: number; rot?: number }) {
  const s = h / 100;
  return <Tube d={QUESTION_GLYPH.d} transform={`translate(${f1(cx)} ${f1(cy)}) rotate(${rot}) scale(${f1(s * 100) / 100}) translate(-28 -50)`} color={color} sw={15} blur={blur / s} />;
}

function Blobs({ w, h, colors, seed = 3, blur = 90 }: { w: number; h: number; colors: string[]; seed?: number; blur?: number }) {
  const id = useUid('blob');
  const r = rng(seed);
  const items = Array.from({ length: 7 }, (_, i) => ({ x: r() * w, y: r() * h, rx: 200 + r() * 380, ry: 140 + r() * 300, c: colors[i % colors.length], o: 0.5 + r() * 0.5 }));
  return (
    <g filter={`url(#${id})`}>
      <defs>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
      </defs>
      {items.map((b, i) => (
        <ellipse key={i} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={b.c} opacity={b.o} />
      ))}
    </g>
  );
}

/* ---------- sunset scene ---------- */
function SunsetScene({ w, h, horizon, seed = 4, terrace = true, hue }: { w: number; h: number; horizon: number; seed?: number; terrace?: boolean; hue: string }) {
  const id = useUid('sun');
  const r = rng(seed);
  const glints = useMemo(() => {
    const rr = rng(seed + 9);
    return Array.from({ length: 260 }, () => {
      const y = horizon + 4 + Math.pow(rr(), 1.6) * (h - horizon);
      const spread = 60 + (y - horizon) * 0.9;
      const x = w / 2 + (rr() - 0.5) * spread * (rr() < 0.7 ? 1 : 3.2);
      return { x, y, l: 6 + rr() * (14 + (y - horizon) * 0.08), o: 0.35 + rr() * 0.6 };
    });
  }, [w, h, horizon, seed]);
  const sky = [mix(hue, '#1d1236', 0.7), mix(hue, '#a3405f', 0.45), mix(hue, '#ff7a36', 0.25), '#ffd38a'];
  return (
    <g>
      <defs>
        <linearGradient id={id + 's'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.55" stopColor={sky[1]} />
          <stop offset="0.88" stopColor={sky[2]} />
          <stop offset="1" stopColor={sky[3]} />
        </linearGradient>
        <linearGradient id={id + 'w'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(sky[2], '#000000', 0.25)} />
          <stop offset="1" stopColor={mix(sky[0], '#000000', 0.55)} />
        </linearGradient>
        <radialGradient id={id + 'g'} cx="0.5" cy={horizon / h} r="0.5">
          <stop offset="0" stopColor="#fff2c8" stopOpacity="0.95" />
          <stop offset="0.12" stopColor="#ffb25e" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ff6a3d" stopOpacity="0" />
        </radialGradient>
        <filter id={id + 'c'} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0025 0.018" numOctaves={4} seed={seed} />
          <feColorMatrix type="matrix" values={`0 0 0 0 1 0 0 0 0 0.62 0 0 0 0 0.55 2.2 0 0 0 -1.05`} />
        </filter>
        <clipPath id={id + 'k'}>
          <rect width={w} height={horizon} />
        </clipPath>
      </defs>
      <rect width={w} height={horizon} fill={`url(#${id}s)`} />
      <g clipPath={`url(#${id}k)`}>
        <rect y={horizon * 0.25} width={w} height={horizon * 0.72} filter={`url(#${id}c)`} opacity={0.75} />
      </g>
      <rect width={w} height={h} fill={`url(#${id}g)`} />
      <circle cx={w / 2} cy={horizon - 6} r={34} fill="#fff4d6" opacity={0.95} />
      <rect y={horizon} width={w} height={h - horizon} fill={`url(#${id}w)`} />
      <g stroke="#ffc27a" strokeLinecap="round">
        {glints.map((g, i) => (
          <line key={i} x1={g.x - g.l / 2} x2={g.x + g.l / 2} y1={g.y} y2={g.y} strokeWidth={1 + (g.y - horizon) / 220} opacity={g.o} />
        ))}
      </g>
      {terrace && (
        <g fill="#0d0708">
          <path d={`M${w * 0.58} ${h}L${w * 0.62} ${horizon + 120}L${w * 0.78} ${horizon + 70}L${w} ${horizon + 30}V${h}Z`} />
          <rect x={w * 0.6} y={horizon + 86} width={w * 0.4} height={12} />
          {Array.from({ length: 40 }, (_, i) => {
            const x = w * 0.61 + i * (w * 0.0098) + r() * 4;
            const s = 4 + r() * 3;
            return <path key={i} d={`M${f1(x)} ${horizon + 86}v-${f1(s * 2.2)}a${s} ${s} 0 1 1 ${f1(s * 0.01)} 0Z`} />;
          })}
        </g>
      )}
    </g>
  );
}

/* ---------- club ceiling ---------- */
function ClubScene({ w, h, hue, seed = 6 }: { w: number; h: number; hue: string; seed?: number }) {
  const id = useUid('club');
  const data = useMemo(() => {
    const r = rng(seed);
    const rows = Array.from({ length: 9 }, (_, k) => {
      const t = k / 8;
      const y = 40 + Math.pow(t, 1.5) * h * 0.36;
      const n = Math.round(46 - t * 24);
      const spread = w * (1.5 - t * 0.7);
      return Array.from({ length: n }, (_, i) => ({ x: w / 2 + (i / (n - 1) - 0.5) * spread, y: y + (r() - 0.5) * 3, s: 2.6 - t * 1.4 }));
    }).flat();
    const heads = Array.from({ length: 60 }, () => ({ x: r() * w, y: h * (0.83 + r() * 0.12), s: 18 + r() * 22, arm: r() < 0.2 }));
    return { rows, heads };
  }, [w, h, seed]);
  return (
    <g>
      <defs>
        <radialGradient id={id + 'h'} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor={mix(hue, '#ff9a5a', 0.25)} stopOpacity="0.85" />
          <stop offset="0.55" stopColor={mix(hue, '#000000', 0.45)} stopOpacity="0.9" />
          <stop offset="1" stopColor="#090202" />
        </radialGradient>
        <filter id={id + 'b'} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}h)`} />
      <g filter={`url(#${id}b)`} fill="#ffd9a8">
        {data.rows.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.s * 3} opacity={0.5} />
        ))}
      </g>
      <g fill="#fff4e0">
        {data.rows.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.s} />
        ))}
      </g>
      <g fill="#070101">
        {data.heads.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={p.s * 0.5} />
            <rect x={p.x - p.s} y={p.y + p.s * 0.45} width={p.s * 2} height={h} rx={p.s * 0.6} />
            {p.arm && <path d={`M${p.x + p.s * 0.7} ${p.y + p.s}L${p.x + p.s * 1.3} ${p.y - p.s * 1.8}`} stroke="#070101" strokeWidth={p.s * 0.35} strokeLinecap="round" />}
          </g>
        ))}
      </g>
    </g>
  );
}

/* ---------- glossy sugar ring ---------- */
function SugarRing({ cx, cy, R, sw, hue }: { cx: number; cy: number; R: number; sw: number; hue: string }) {
  const id = useUid('ring');
  const sugar = useMemo(() => {
    const r = rng(12);
    return Array.from({ length: 520 }, () => {
      const a = r() * Math.PI * 2;
      const rr = R + (r() - 0.5) * sw * 0.9;
      const up = Math.sin(a) < 0 ? 1 : 0.35;
      return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, s: 1 + r() * 4.5, o: (0.3 + r() * 0.7) * up };
    });
  }, [cx, cy, R, sw]);
  const outer = R + sw / 2;
  return (
    <g>
      <defs>
        <radialGradient id={id + 't'} cx={cx} cy={cy} r={outer} gradientUnits="userSpaceOnUse">
          <stop offset={(R - sw / 2) / outer} stopColor={mix(hue, '#000000', 0.6)} />
          <stop offset={(R - sw * 0.1) / outer} stopColor={mix(hue, '#ffffff', 0.15)} />
          <stop offset={(R + sw * 0.18) / outer} stopColor={hue} />
          <stop offset="1" stopColor={mix(hue, '#000000', 0.55)} />
        </radialGradient>
        <filter id={id + 'b'} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <circle cx={cx + 14} cy={cy + 40} r={R} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={sw} filter={`url(#${id}b)`} />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={`url(#${id}t)`} strokeWidth={sw} />
      <g fill="#fff6ef">
        {sugar.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width={p.s} height={p.s} opacity={p.o} transform={`rotate(${(i * 37) % 90} ${p.x} ${p.y})`} />
        ))}
      </g>
      <path d={`M${cx - R * 0.95} ${cy - R * 0.35}A${R} ${R} 0 0 1 ${cx - R * 0.2} ${cy - R * 0.98}`} fill="none" stroke="#ffffff" strokeWidth={sw * 0.12} strokeLinecap="round" opacity={0.75} filter={`url(#${id}b)`} />
    </g>
  );
}

function Sparkle({ x, y, s, color = '#ffffff' }: { x: number; y: number; s: number; color?: string }) {
  return <path d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`} fill={color} />;
}

/* ======================================================================= */
/* Wordmark-based logo factory                                             */
/* ======================================================================= */

interface WordStyle {
  family: string;
  css: string;
  weight: number;
  italic?: boolean;
  lower?: boolean;
  tracking: number;
  /** Optional per-text paint (chrome gradient, puffy stroke…). */
  paint?: (fill: string, accent: string, id: string, size: number) => { defs?: ReactNode; props: Record<string, unknown> };
  Symbol: FC<{ tone: Tone }>;
}

function makeLogo(st: WordStyle): FC<LogoProps> {
  return function WordLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
    const id = useUid('wl');
    const { words, question, base } = splitBrand(brand);
    const tx = (s: string) => (st.lower ? s.toLowerCase() : s.toUpperCase());
    if (variant === 'symbol') {
      return (
        <svg viewBox="0 0 300 300" x={x} y={y} width={width ?? 300} height={height ?? 300}>
          <st.Symbol tone={tone} />
        </svg>
      );
    }
    const size = variant === 'secondary' ? 70 : 140;
    const font = { family: st.family, size, weight: st.weight, italic: st.italic, tracking: size * st.tracking };
    const q = question ? ' ?' : '';
    const rows = variant === 'primary' && layout !== 'line' && words.length > 1 ? [tx(words[0]), tx(words.slice(1).join(' ')) + q] : [tx(base) + q];
    const w = Math.max(...rows.map((r) => measure(r, font))) + size * 0.5;
    const h = rows.length * size * 1.02 + size * 0.45;
    const paint = st.paint?.(tone.fg, tone.accent, id, size);
    return (
      <svg viewBox={`0 0 ${f1(w)} ${f1(h)}`} x={x} y={y} width={width ?? w} height={height ?? h}>
        {paint?.defs}
        {rows.map((r, i) => (
          <text
            key={i}
            x={w / 2}
            y={size * 0.98 + i * size * 1.02}
            textAnchor="middle"
            fontFamily={st.css}
            fontWeight={st.weight}
            fontStyle={st.italic ? 'italic' : undefined}
            fontSize={size}
            letterSpacing={size * st.tracking}
            fill={tone.fg}
            {...paint?.props}
          >
            {r}
          </text>
        ))}
      </svg>
    );
  };
}

function wordDims(st: WordStyle, brand: string, layout: 'stacked' | 'line') {
  const { words, question, base } = splitBrand(brand);
  const tx = (s: string) => (st.lower ? s.toLowerCase() : s.toUpperCase());
  const size = 140;
  const font = { family: st.family, size, weight: st.weight, italic: st.italic, tracking: size * st.tracking };
  const q = question ? ' ?' : '';
  const rows = layout !== 'line' && words.length > 1 ? [tx(words[0]), tx(words.slice(1).join(' ')) + q] : [tx(base) + q];
  return { w: Math.max(...rows.map((r) => measure(r, font))) + size * 0.5, h: rows.length * size * 1.02 + size * 0.45 };
}

/* ======================================================================= */
/* Shared poster pieces                                                    */
/* ======================================================================= */

function Title({ st, content, settings, colors, cx, y, maxW, maxH }: { st: WordStyle; content: EventContent; settings: CreativeSettings; colors: Colors; cx: number; y: number; maxW: number; maxH: number }) {
  const Logo = useMemo(() => makeLogo(st), [st]);
  const tone: Tone = { fg: '#ffffff', accent: colors.accent };
  if (settings.titleLayout === 'symbol') {
    const s = maxH * 1.25 * settings.logoScale;
    return <Logo variant="symbol" brand={content.brand} tone={tone} x={cx - s / 2} y={y} width={s} height={s} />;
  }
  const lay = settings.titleLayout === 'line' ? 'line' : 'stacked';
  const d = wordDims(st, content.brand, lay);
  const k = Math.min(maxW / d.w, maxH / d.h) * settings.logoScale;
  return <Logo variant="primary" layout={lay} brand={content.brand} tone={tone} x={cx - (d.w * k) / 2} y={y} width={d.w * k} height={d.h * k} />;
}

function Lineup({
  content,
  cx,
  y,
  maxW,
  size,
  family,
  css,
  weight,
  color = '#ffffff',
  gap = 1.02,
  sep,
  italic,
}: {
  content: EventContent;
  cx: number;
  y: number;
  maxW: number;
  size: number;
  family: string;
  css: string;
  weight: number;
  color?: string;
  gap?: number;
  sep?: string;
  italic?: boolean;
}) {
  if (sep) {
    const names = content.lineup.map((a) => a.name);
    const half = Math.ceil(names.length / 2);
    const rows = names.length > 2 ? [names.slice(0, half).join(sep), names.slice(half).join(sep)] : [names.join(sep)];
    return (
      <g textAnchor="middle" fontFamily={css} fontWeight={weight} fill={color} fontStyle={italic ? 'italic' : undefined}>
        {rows.map((r, i) => (
          <text key={i} x={cx} y={y + i * size * 1.2} fontSize={fitMeasured(r, maxW, { family, size, weight })}>
            {r}
          </text>
        ))}
      </g>
    );
  }
  return (
    <g textAnchor="middle" fontFamily={css} fontWeight={weight} fill={color}>
      {content.lineup.map((a, i) => {
        const t = joinB2B(a);
        return (
          <text key={a.id} x={cx} y={y + i * size * gap} fontSize={fitMeasured(t, maxW, { family, size, weight, tracking: -size * 0.02 })} letterSpacing={-size * 0.02}>
            {t}
          </text>
        );
      })}
    </g>
  );
}

const PhotoOverlay = ({ settings, photoSrc, W, H, hue }: { settings: CreativeSettings; photoSrc: string | null; W: number; H: number; hue: string }) =>
  settings.photo ? (
    <g opacity={0.38} style={{ mixBlendMode: 'screen' }}>
      <Photo width={W} height={H} kind="crowd" src={photoSrc} shadow="#000000" light={mix(hue, '#ffffff', 0.4)} grain={0.4} />
    </g>
  ) : null;

/* ======================================================================= */
/* 18 — GLOSSY                                                             */
/* ======================================================================= */

const glossyStyle: WordStyle = {
  family: "'Syne'",
  css: FONT.display,
  weight: 800,
  tracking: 0.01,
  Symbol: ({ tone }) => <GlossyQ cx={150} cy={150} h={250} color={tone.accent} />,
};
const GlossyLogo = makeLogo(glossyStyle);

function GlossyPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const hue = baseHue(colors, settings);
  const r = rng(21);
  const tubes = useMemo(
    () =>
      Array.from({ length: sq ? 5 : 7 }, (_, i) => ({
        x: i % 2 ? W - 60 - r() * 220 : 60 + r() * 220,
        y: 80 + r() * (H - 160),
        h: 160 + r() * 340,
        rot: (r() - 0.5) * 80,
        blur: i % 3 === 0 ? 0 : 6 + r() * 14,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sq],
  );
  const split = settings.infoLayout === 'split';
  return (
    <Artboard format={format} colors={{ ...colors, bg: mix(hue, '#000000', 0.35) }} texture={settings.texture * 0.4} label={`${content.brand} — glossy`}>
      <Blobs w={W} h={H} colors={[mix(hue, '#ffffff', 0.35), mix(hue, '#000000', 0.55), hue]} />
      <PhotoOverlay settings={settings} photoSrc={photoSrc} W={W} H={H} hue={hue} />
      {tubes.map((t, i) => (
        <GlossyQ key={i} cx={t.x} cy={t.y} h={t.h} color={mix(hue, '#ffffff', 0.15)} blur={t.blur} rot={t.rot} />
      ))}
      <Title st={glossyStyle} content={content} settings={settings} colors={colors} cx={W / 2} y={sq ? 70 : 120} maxW={sq ? 760 : 820} maxH={sq ? 200 : 230} />
      <text x={W / 2} y={sq ? 330 : 400} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={sq ? 30 : 38} letterSpacing={sq ? 6 : 8} fill="#ffffff">
        {content.date}
      </text>
      <text x={W / 2} y={sq ? 368 : 446} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 20 : 24} letterSpacing={3} fill="#ffffff">
        {content.venue}
      </text>
      <text x={W / 2} y={sq ? 520 : 760} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 14 : 18} letterSpacing={2} fill="#ffffff">
        {content.lineupTitle}
      </text>
      <Lineup
        content={content}
        cx={W / 2}
        y={sq ? 590 : 850}
        maxW={sq ? 760 : 840}
        size={split ? (sq ? 60 : 84) : sq ? 50 : 70}
        family="'General Sans'"
        css={FONT.sans}
        weight={700}
        gap={0.98}
      />
      <text x={W / 2} y={H - (sq ? 70 : 150)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 14 : 17} letterSpacing={1.5} fill="#ffffff">
        {(content.mentions || content.pillars).toUpperCase()}
      </text>
      <text x={W / 2} y={H - (sq ? 48 : 124)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 14 : 17} letterSpacing={1.5} fill="#ffffff" opacity={0.85}>
        {content.edition}
      </text>
    </Artboard>
  );
}

/* ======================================================================= */
/* 19 — CLUB (serif, lights)                                               */
/* ======================================================================= */

const clubStyle: WordStyle = {
  family: "'Gambetta'",
  css: FONT.gambetta,
  weight: 700,
  lower: true,
  tracking: -0.02,
  Symbol: ({ tone }) => (
    <g>
      <circle cx={150} cy={150} r={138} fill="none" stroke={tone.fg} strokeWidth={6} />
      <text x={150} y={232} textAnchor="middle" fontFamily={FONT.gambetta} fontWeight={700} fontSize={240} fill={tone.fg}>
        ?
      </text>
    </g>
  ),
};

function ClubPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('cp');
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const hue = baseHue(colors, settings);
  const { base, question } = splitBrand(content.brand);
  const ghost = (base.replace(/\s+/g, '') + (question ? '?' : '')).toLowerCase();
  return (
    <Artboard format={format} colors={{ ...colors, bg: '#0b0202' }} texture={settings.texture * 0.6} label={`${content.brand} — club`}>
      <defs>
        <filter id={id + 'g'} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient id={id + 'l'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffcf8a" />
          <stop offset="1" stopColor={mix(hue, '#ff7a2a', 0.4)} />
        </linearGradient>
      </defs>
      <ClubScene w={W} h={H} hue={hue} />
      <PhotoOverlay settings={settings} photoSrc={photoSrc} W={W} H={H} hue={hue} />
      {/* giant glowing letters drifting behind */}
      <g filter={`url(#${id}g)`} opacity={0.42} fontFamily={FONT.gambetta} fontWeight={700} fill={`url(#${id}l)`}>
        {[...ghost].map((ch, i) => (
          <text key={i} x={W * (0.22 + ((i * 0.37) % 0.62))} y={(sq ? 170 : 220) + i * (sq ? 85 : 130)} fontSize={sq ? 240 : 320} transform={`rotate(${(i % 3) * 8 - 8} ${W / 2} ${H / 2})`}>
            {ch}
          </text>
        ))}
      </g>
      <Title st={clubStyle} content={content} settings={settings} colors={colors} cx={W / 2} y={sq ? 90 : 170} maxW={sq ? 760 : 820} maxH={sq ? 210 : 260} />
      <text x={W / 2 + (sq ? 190 : 230)} y={sq ? 340 : 470} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 24 : 30} letterSpacing={4} fill="#ffffff">
        {content.edition}
      </text>
      <text x={W / 2} y={sq ? 640 : 1010} textAnchor="middle" fontFamily={FONT.gambetta} fontSize={sq ? 24 : 30} fill="#ffffff">
        A~Z
      </text>
      <Lineup content={content} cx={W / 2} y={sq ? 696 : 1080} maxW={sq ? 820 : 860} size={sq ? 40 : 52} family="'Gambetta'" css={FONT.gambetta} weight={500} sep=" - " />
      <text x={W / 2} y={sq ? 870 : 1300} textAnchor="middle" fontFamily={FONT.gambetta} fontWeight={700} fontSize={fitMeasured(content.date.toUpperCase(), 760, { family: "'Gambetta'", size: sq ? 46 : 62, weight: 700 })} fill="#ffffff">
        {content.date.toUpperCase()}
      </text>
      <text x={W / 2} y={sq ? 910 : 1350} textAnchor="middle" fontFamily={FONT.gambetta} fontWeight={700} fontSize={sq ? 24 : 32} letterSpacing={1} fill="#ffffff">
        {content.venue}.
      </text>
    </Artboard>
  );
}

/* ======================================================================= */
/* 20 — GOURMAND (puffy letters, sugar ring)                               */
/* ======================================================================= */

const CREAM = '#fff4dc';
const puffyStyle: WordStyle = {
  family: "'General Sans'",
  css: FONT.sans,
  weight: 700,
  lower: true,
  tracking: -0.04,
  paint: (fill, _a, id, size) => ({
    defs: (
      <defs>
        <filter id={id + 'ps'} x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy={size * 0.05} stdDeviation={size * 0.05} floodColor="#5a0000" floodOpacity="0.55" />
        </filter>
      </defs>
    ),
    props: { stroke: fill, strokeWidth: size * 0.045, strokeLinejoin: 'round', paintOrder: 'stroke', letterSpacing: size * 0.01, filter: `url(#${id}ps)` },
  }),
  Symbol: ({ tone }) => <SugarRing cx={150} cy={150} R={100} sw={70} hue={tone.accent} />,
};

function GourmandPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('gm');
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const hue = baseHue(colors, settings);
  const cy = sq ? 470 : 690;
  return (
    <Artboard format={format} colors={{ ...colors, bg: hue }} texture={settings.texture * 0.4} label={`${content.brand} — gourmand`}>
      <defs>
        <radialGradient id={id} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor={mix(hue, '#ffb21a', 0.55)} />
          <stop offset="0.6" stopColor={mix(hue, '#ff5a1a', 0.25)} />
          <stop offset="1" stopColor={mix(hue, '#8a0d0d', 0.35)} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />
      <PhotoOverlay settings={settings} photoSrc={photoSrc} W={W} H={H} hue={hue} />
      <SugarRing cx={W / 2} cy={cy} R={(sq ? 250 : 300) * settings.logoScale} sw={(sq ? 150 : 190) * settings.logoScale} hue={mix(hue, '#7a0000', 0.35)} />
      <GlossyQ cx={W * 0.86} cy={cy - 290} h={130} color={mix(hue, '#ff3030', 0.5)} blur={4} rot={18} />
      <GlossyQ cx={W * 0.12} cy={cy + 330} h={90} color={mix(hue, '#ff3030', 0.5)} blur={7} rot={-20} />
      <text x={W / 2} y={sq ? 90 : 150} textAnchor="middle" fontFamily={FONT.gambetta} fontSize={sq ? 44 : 58} fill={CREAM}>
        {content.venue.charAt(0) + content.venue.slice(1).toLowerCase()}
      </text>
      <text x={W / 2} y={cy - (sq ? 92 : 112)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={700} fontSize={sq ? 20 : 26} fill="#ffffff">
        {content.edition}
      </text>
      <Title st={puffyStyle} content={content} settings={{ ...settings, logoScale: 1 }} colors={{ ...colors }} cx={W / 2} y={cy - (sq ? 80 : 95)} maxW={sq ? 840 : 900} maxH={sq ? 200 : 230} />
      <Lineup content={content} cx={W / 2} y={cy + (sq ? 170 : 200)} maxW={sq ? 600 : 640} size={sq ? 24 : 30} family="'General Sans'" css={FONT.sans} weight={700} sep=" - " color="#ffffff" />
      <text x={W / 2} y={H - (sq ? 110 : 200)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={700} fontSize={sq ? 20 : 26} fill="#ffffff">
        {lines(content.signature)[0] ?? ''}
      </text>
      <text x={W / 2} y={H - (sq ? 80 : 164)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={500} fontSize={sq ? 20 : 26} fill="#ffffff">
        {content.date.charAt(0) + content.date.slice(1).toLowerCase()}
      </text>
    </Artboard>
  );
}
const GourmandLogo = makeLogo(puffyStyle);

/* ======================================================================= */
/* 21 — SUNSET (story)                                                     */
/* ======================================================================= */

const sunsetStyle: WordStyle = {
  family: "'General Sans'",
  css: FONT.sans,
  weight: 700,
  tracking: -0.02,
  Symbol: ({ tone }) => (
    <g>
      <path d="M60 170A90 90 0 0 1 240 170Z" fill={tone.accent} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={50 + i * 20} y={190 + i * 26} width={200 - i * 40} height={12} rx={6} fill={tone.fg} />
      ))}
    </g>
  ),
};

function SunsetPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const hue = baseHue(colors, settings);
  const horizon = sq ? 640 : 1000;
  const split = settings.infoLayout === 'split';
  return (
    <Artboard format={format} colors={{ ...colors, bg: '#1a0f22' }} texture={settings.texture * 0.35} label={`${content.brand} — sunset`}>
      <SunsetScene w={W} h={H} horizon={horizon} hue={hue} />
      <PhotoOverlay settings={settings} photoSrc={photoSrc} W={W} H={H} hue={hue} />
      <text x={W / 2} y={sq ? 70 : 150} textAnchor="middle" fontFamily={FONT.sans} fontWeight={700} fontSize={sq ? 18 : 22} letterSpacing={1} fill="#ffffff">
        {lines(content.signature).slice(0, 2).join(' · ')}
      </text>
      <Title st={sunsetStyle} content={content} settings={settings} colors={colors} cx={W / 2} y={sq ? 90 : 180} maxW={sq ? 700 : 760} maxH={sq ? 170 : 210} />
      <text x={W / 2} y={sq ? 330 : 470} textAnchor="middle" fontFamily={FONT.sans} fontWeight={700} fontSize={sq ? 52 : 70} fill="#ffffff">
        {shortDate(content.date)}
      </text>
      {split ? (
        <g textAnchor="middle">
          <text x={W / 2} y={sq ? 380 : 560} fontFamily={FONT.sans} fontWeight={500} fontSize={sq ? 18 : 24} fill="#ffffff">
            [{content.lineupTitle}]
          </text>
          {content.lineup.map((a, i) => (
            <g key={a.id}>
              <text x={W / 2} y={(sq ? 420 : 620) + i * (sq ? 48 : 86)} fontFamily={FONT.sans} fontWeight={700} fontSize={fitMeasured(a.name + ' [' + a.detail + ']', 760, { family: "'General Sans'", size: sq ? 30 : 40, weight: 700 })} fill="#ffffff">
                {a.name}
                {a.detail && <tspan fontWeight={400}> [{a.detail}]</tspan>}
              </text>
            </g>
          ))}
        </g>
      ) : (
        <Lineup content={content} cx={W / 2} y={sq ? 410 : 600} maxW={760} size={sq ? 34 : 46} family="'General Sans'" css={FONT.sans} weight={700} />
      )}
      <text x={W / 2} y={sq ? 600 : 860} textAnchor="middle" fontFamily={FONT.serif} fontWeight={400} fontSize={sq ? 40 : 60} letterSpacing={sq ? 10 : 14} fill="#ffffff">
        {content.venue}
      </text>
      <g transform={`translate(${W / 2} ${H - (sq ? 90 : 170)})`}>
        <rect x={-170} y={-36} width={340} height={72} rx={18} fill="#ffffff" />
        <text y={12} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={28} fill="#111111">
          {content.edition}
        </text>
      </g>
    </Artboard>
  );
}

/* ======================================================================= */
/* 22 — HORIZON (panel)                                                    */
/* ======================================================================= */

const horizonStyle: WordStyle = {
  family: "'General Sans'",
  css: FONT.sans,
  weight: 700,
  tracking: -0.01,
  Symbol: ({ tone }) => (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={60} y={70 + i * 46} width={180} height={i === 3 ? 10 : 26} rx={3} fill={i === 3 ? tone.accent : tone.fg} />
      ))}
    </g>
  ),
};

function HorizonPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('hz');
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const hue = baseHue(colors, settings);
  const P = sq ? { x: 130, y: 180, w: 740, h: 620 } : { x: 125, y: 400, w: 750, h: 720 };
  const bands = [P.h * 0.48, P.h * 0.27, P.h * 0.25];
  const { head } = splitDate(content.date);
  const tone: Tone = { fg: '#ffffff', accent: colors.accent };
  const Logo = useMemo(() => makeLogo(horizonStyle), []);
  return (
    <Artboard format={format} colors={{ ...colors, bg: '#2a1206' }} texture={settings.texture * 0.35} label={`${content.brand} — horizon`}>
      <defs>
        <clipPath id={id + 'p'}>
          <rect x={P.x} y={P.y} width={P.w} height={P.h} />
        </clipPath>
      </defs>
      <g transform={`translate(0 ${sq ? -260 : -560})`}>
        <SunsetScene w={W} h={H + (sq ? 260 : 560)} horizon={sq ? 420 : 760} hue={hue} terrace={false} seed={11} />
      </g>
      <PhotoOverlay settings={settings} photoSrc={photoSrc} W={W} H={H} hue={hue} />
      <g clipPath={`url(#${id}p)`}>
        <g transform={`translate(0 ${sq ? -120 : -260})`}>
          <SunsetScene w={W} h={H + 400} horizon={P.y + bands[0] + (sq ? 120 : 260) + 20} hue={mix(hue, '#ff4a1a', 0.3)} terrace={false} seed={17} />
        </g>
        <rect x={P.x} y={P.y} width={P.w} height={bands[0]} fill="#2b0d06" opacity={0.42} />
        <rect x={P.x} y={P.y + bands[0] + bands[1]} width={P.w} height={bands[2]} fill="#250808" opacity={0.55} />
      </g>
      <Logo variant="symbol" brand={content.brand} tone={tone} x={W / 2 - (sq ? 50 : 70)} y={sq ? 40 : 110} width={sq ? 100 : 140} height={sq ? 100 : 140} />
      {settings.titleLayout !== 'symbol' && (
        <Logo
          variant="primary"
          layout="line"
          brand={content.brand}
          tone={tone}
          x={P.x + 10}
          y={P.y + 6}
          width={P.w - 20}
          height={((P.w - 20) * wordDims(horizonStyle, content.brand, 'line').h) / wordDims(horizonStyle, content.brand, 'line').w}
        />
      )}
      {content.lineup.map((a, i) => (
        <text key={a.id} x={P.x + 34} y={P.y + bands[0] - 120 + i * 44} fontFamily={FONT.sans} fontWeight={700} fontSize={fitMeasured(joinB2B(a), P.w - 60, { family: "'General Sans'", size: sq ? 30 : 36, weight: 700 })} fill="#ffffff">
          {joinB2B(a)}
        </text>
      ))}
      <text x={P.x + 34} y={P.y + bands[0] + 62} fontFamily={FONT.sans} fontWeight={700} fontSize={sq ? 32 : 38} fill="#ffffff">
        {(lines(content.manifesto)[0] ?? '').toUpperCase()}
      </text>
      <text x={P.x + 34} y={P.y + bands[0] + bands[1] + 58} fontFamily={FONT.sans} fontWeight={700} fontSize={sq ? 30 : 36} fill="#ffffff">
        {lines(content.signature)[0]}
      </text>
      <text x={P.x + 34} y={P.y + bands[0] + bands[1] + 98} fontFamily={FONT.sans} fontWeight={700} fontSize={sq ? 30 : 36} fill="#ffffff">
        {lines(content.signature)[1]}
      </text>
      <text x={P.x + 34} y={P.y + P.h - 22} fontFamily={FONT.sans} fontWeight={600} fontSize={15} letterSpacing={3} fill="#ffffff">
        {content.edition}
      </text>
      <text x={P.x + P.w - 30} y={P.y + bands[0] + bands[1] + 102} textAnchor="end" fontFamily={FONT.sans} fontWeight={700} fontSize={sq ? 70 : 88} fill="#ffffff">
        {shortDate(content.date) === content.date ? head : shortDate(content.date)}
      </text>
      <text x={P.x + P.w - 30} y={P.y + P.h - 22} textAnchor="end" fontFamily={FONT.sans} fontWeight={600} fontSize={15} letterSpacing={3} fill="#ffffff">
        {content.pillars}
      </text>
      <text x={W / 2} y={P.y + P.h + (sq ? 110 : 190)} textAnchor="middle" fontFamily={FONT.serif} fontSize={fitMeasured(content.venue, 760, { family: "'Cormorant Garamond'", size: sq ? 54 : 72, tracking: (sq ? 54 : 72) * 0.22 })} letterSpacing={(sq ? 54 : 72) * 0.2} fill="#ffffff">
        {content.venue}
      </text>
    </Artboard>
  );
}

/* ======================================================================= */
/* 23 — CHROME                                                             */
/* ======================================================================= */

const chromePaint: WordStyle['paint'] = (_f, accent, id) => ({
  defs: (
    <defs>
      <linearGradient id={id + 'ch'} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.38" stopColor="#c9ced8" />
        <stop offset="0.5" stopColor="#3a3f4a" />
        <stop offset="0.53" stopColor={mix(accent, '#ffffff', 0.55)} />
        <stop offset="0.75" stopColor="#f4f6fb" />
        <stop offset="1" stopColor="#8a909c" />
      </linearGradient>
    </defs>
  ),
  props: { fill: `url(#${id}ch)`, stroke: '#ffffff', strokeWidth: 1.4, strokeOpacity: 0.7 },
});
const chromeStyle: WordStyle = {
  family: "'Anton'",
  css: FONT.condensed,
  weight: 400,
  tracking: 0.02,
  paint: chromePaint,
  Symbol: ({ tone }) => {
    const id = useUid('chs');
    const p = chromePaint!(tone.fg, tone.accent, id, 260);
    return (
      <g>
        {p.defs}
        <text x={150} y={262} textAnchor="middle" fontFamily={FONT.condensed} fontSize={300} {...p.props}>
          ?
        </text>
        <Sparkle x={236} y={70} s={26} />
      </g>
    );
  },
};

function ChromePoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const hue = baseHue(colors, settings);
  const id = useUid('chr');
  const r = rng(5);
  const sparks = Array.from({ length: 14 }, () => ({ x: r() * W, y: r() * H * 0.8, s: 6 + r() * 22 }));
  return (
    <Artboard format={format} colors={{ ...colors, bg: '#050506' }} texture={settings.texture * 0.5} label={`${content.brand} — chrome`}>
      <Blobs w={W} h={H} colors={[hue, mix(hue, '#ffffff', 0.4), '#1a1a40']} seed={9} blur={110} />
      <rect width={W} height={H} fill="#000" opacity={0.35} />
      <PhotoOverlay settings={settings} photoSrc={photoSrc} W={W} H={H} hue={hue} />
      {sparks.map((s, i) => (
        <Sparkle key={i} x={s.x} y={s.y} s={s.s} />
      ))}
      <Title st={chromeStyle} content={content} settings={settings} colors={colors} cx={W / 2} y={sq ? 90 : 170} maxW={sq ? 820 : 880} maxH={sq ? 300 : 420} />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#9aa1ae" />
          <stop offset="0.52" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c4c9d3" />
        </linearGradient>
      </defs>
      <text x={W / 2} y={sq ? 520 : 720} textAnchor="middle" fontFamily={FONT.condensed} fontSize={sq ? 70 : 96} letterSpacing={4} fill={`url(#${id})`}>
        {content.date}
      </text>
      <text x={W / 2} y={sq ? 560 : 776} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 18 : 22} letterSpacing={6} fill="#ffffff">
        {content.venue}
      </text>
      <text x={W / 2} y={sq ? 640 : 900} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 14 : 17} letterSpacing={4} fill={mix(hue, '#ffffff', 0.5)}>
        {content.lineupTitle}
      </text>
      <Lineup content={content} cx={W / 2} y={sq ? 700 : 980} maxW={sq ? 760 : 820} size={sq ? 48 : 66} family="'Anton'" css={FONT.condensed} weight={400} gap={1.05} />
      <text x={W / 2} y={H - (sq ? 50 : 90)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 13 : 16} letterSpacing={3} fill="#ffffff" opacity={0.85}>
        {content.mentions || `${content.edition} · ${content.pillars}`}
      </text>
    </Artboard>
  );
}

/* ======================================================================= */
/* Definitions                                                             */
/* ======================================================================= */

const typo = (title: string, css: string, weight: number, note: string, sample = 'UNE AUTRE ?'): ConceptDef['typography'] => [
  { role: 'Titre', family: title, css, weight, sample, note },
  { role: 'Line-up', family: 'General Sans', css: FONT.sans, weight: 700, sample: 'RAYHANE B2B KARIM SIALA', note: 'Noms en gras, centrés, lisibles en story.' },
  { role: 'Infos', family: 'General Sans', css: FONT.sans, weight: 600, sample: '12 JUILLET 2025', note: 'Date et lieu immédiatement sous le titre.' },
];
const BASE = { paper: '#f4efe6', ink: '#050505' };

export const glossy: ConceptDef = {
  id: 'glossy',
  index: '18',
  name: 'Glossy',
  short: 'Tubes 3D, flou, monochrome',
  description: 'Une affiche de club « réelle » : des « ? » en tubes brillants flottent dans un champ flou monochrome, titre extra-large, line-up centré.',
  rationale: [
    'Le code des affiches qui tournent sur Instagram : un visuel 3D brillant en plein cadre, une seule couleur déclinée en profondeur, et toute l’information au centre.',
    'Ici l’objet 3D, c’est le signe de la marque : des « ? » en tube laqué, nets ou flous selon leur profondeur. La couleur suit le réglage « couleur dominante » (rouge par défaut, mais vert, bleu… à chaque édition).',
    'Hiérarchie de club : TITRE → date → lieu → LINE UP en gros → mentions pratiques en bas.',
  ],
  base: BASE,
  palette: [
    { name: 'Rouge profond', hex: '#b5121b', role: 'Couleur d’édition' },
    { name: 'Rouge clair', hex: '#e65a5f', role: 'Reflets' },
    { name: 'Blanc', hex: '#ffffff', role: 'Texte' },
  ],
  typography: typo('Syne ExtraBold', FONT.display, 800, 'Titre très large, comme les affiches de club.'),
  defaults: { accent: '#b5121b', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.25, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: GlossyLogo,
  Poster: GlossyPoster,
};

export const clubnight: ConceptDef = {
  id: 'clubnight',
  index: '19',
  name: 'Club',
  short: 'Plafond lumineux, sérif, foule',
  description: 'L’intérieur du club : plafond de lumières, brume rouge, foule, lettres géantes floues derrière un titre sérif à caractère.',
  rationale: [
    'Inspiré des affiches de soirées en club : une photographie d’ambiance (ici entièrement générée — plafond d’ampoules en perspective, brume, silhouettes) et un titre sérif gras en minuscules.',
    'Les lettres du nom flottent en grand, floues et dorées, comme projetées dans la salle.',
    'Line-up en ordre alphabétique « A~Z » séparé par des tirets, date et lieu en sérif : la mise en page classique des soirées multi-DJ.',
  ],
  base: BASE,
  palette: [
    { name: 'Rouge salle', hex: '#8a1414', role: 'Brume' },
    { name: 'Ampoules', hex: '#ffe2b0', role: 'Lumières, lettres' },
    { name: 'Noir', hex: '#0b0202', role: 'Foule, fond' },
  ],
  typography: typo('Gambetta Bold', FONT.gambetta, 700, 'Sérif gras en minuscules.', 'une autre ?'),
  defaults: { accent: '#8a1414', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.35, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(clubStyle),
  Poster: ClubPoster,
};

export const gourmand: ConceptDef = {
  id: 'gourmand',
  index: '20',
  name: 'Gourmand',
  short: 'Anneau sucré, lettres gonflées',
  description: 'Un anneau 3D brillant et sucré sur un dégradé orange-rouge, des lettres crème toutes rondes : gourmand, solaire, très « été ».',
  rationale: [
    'Le cercle du logo devient un objet appétissant : un anneau laqué saupoudré de sucre, avec ses reflets, en plein centre.',
    'Le titre en lettres « gonflées » (contour arrondi épais) passe devant l’objet, comme sur les affiches de soirées estivales.',
    'Peu de texte, grosse émotion : nom du lieu en haut, line-up sur une ligne, date en bas.',
  ],
  base: BASE,
  palette: [
    { name: 'Orange', hex: '#ff6a1a', role: 'Dégradé' },
    { name: 'Rouge cerise', hex: '#c8141e', role: 'Anneau' },
    { name: 'Crème', hex: CREAM, role: 'Lettres' },
  ],
  typography: typo('Lettres gonflées', FONT.sans, 700, 'General Sans Bold + contour arrondi épais.', 'une autre ?'),
  defaults: { accent: '#e8361a', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: GourmandLogo,
  Poster: GourmandPoster,
};

export const sunset: ConceptDef = {
  id: 'sunset',
  index: '21',
  name: 'Sunset',
  short: 'Coucher de soleil, story',
  description: 'Un coucher de soleil sur la mer, terrasse en silhouette, et l’information empilée au centre : la story de soirée sunset.',
  rationale: [
    'Le format story des soirées en plein air : ciel violet-orangé, nuages, soleil sur l’horizon et ses reflets sur l’eau — tout est généré.',
    'Lecture verticale simple : signature → titre → date courte (12.07) → line-up avec détails entre crochets → lieu en capitales espacées → bouton.',
    'La couleur dominante teinte le ciel : chaque édition peut avoir sa lumière.',
  ],
  base: BASE,
  palette: [
    { name: 'Violet crépuscule', hex: '#3a2350', role: 'Haut du ciel' },
    { name: 'Orange soleil', hex: '#ff8a3d', role: 'Horizon' },
    { name: 'Blanc', hex: '#ffffff', role: 'Texte' },
  ],
  typography: typo('General Sans Bold', FONT.sans, 700, 'Grotesque grasse, simple et lisible.'),
  defaults: { accent: '#c94f3a', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(sunsetStyle),
  Poster: SunsetPoster,
};

export const horizon: ConceptDef = {
  id: 'horizon',
  index: '22',
  name: 'Horizon',
  short: 'Mer, panneau, bandes',
  description: 'La mer au coucher du soleil en fond, et un panneau central découpé en bandes : titre, line-up, signature, date en grand.',
  rationale: [
    'Variante « post » du sunset : le fond est la mer, et un panneau rectangulaire montre une autre vue du même ciel, découpée en bandes plus ou moins sombres.',
    'Chaque bande a son rôle : titre et noms en haut, manifeste au milieu, signature et date en bas — une grille qui reste identique d’une édition à l’autre.',
    'Le symbole (quatre bandes) sert d’en-tête et d’avatar.',
  ],
  base: BASE,
  palette: [
    { name: 'Mer cuivre', hex: '#7a3214', role: 'Fond' },
    { name: 'Orange', hex: '#ff8a3d', role: 'Ciel' },
    { name: 'Blanc', hex: '#ffffff', role: 'Texte' },
  ],
  typography: typo('General Sans Bold', FONT.sans, 700, 'Grotesque grasse, alignée à gauche dans le panneau.'),
  defaults: { accent: '#d0552a', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(horizonStyle),
  Poster: HorizonPoster,
};

export const chrome: ConceptDef = {
  id: 'chrome',
  index: '23',
  name: 'Chrome',
  short: 'Lettres chromées, étincelles',
  description: 'Le grand classique des soirées : titre condensé en chrome miroir, étincelles, lumières colorées floues sur fond noir.',
  rationale: [
    'Le style « chrome » est partout dans les affiches de soirées : lettres métalliques avec reflet de ciel et d’horizon, étoiles scintillantes.',
    'Ici il reste maîtrisé : un seul effet (le chrome), des lumières douces à la couleur de l’édition, et une hiérarchie très claire.',
    'Fonctionne aussi bien en affiche qu’en vidéo animée (les reflets peuvent glisser).',
  ],
  base: BASE,
  palette: [
    { name: 'Noir', hex: '#050506', role: 'Fond' },
    { name: 'Chrome', hex: '#c9ced8', role: 'Titre, date' },
    { name: 'Lumière rouge', hex: '#ff2a2a', role: 'Ambiance' },
  ],
  typography: typo('Anton chromé', FONT.condensed, 400, 'Condensée, dégradé miroir.'),
  defaults: { accent: '#ff2a2a', background: 'accent', titleLayout: 'stacked', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(chromeStyle),
  Poster: ChromePoster,
};
