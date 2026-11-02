/**
 * Directions 18–23 — club posters that work like the real ones (one strong
 * object filling the frame, centred hierarchy, huge line-up) but whose object
 * belongs to UNE AUTRE ? and to Tunisia. Everything is generated in SVG.
 */
import { useMemo, type FC, type ReactNode } from 'react';
import { lines, splitBrand } from '../data/content';
import type { Colors, ConceptDef, CreativeSettings, EventContent, LogoProps, PosterProps, Tone } from '../data/types';
import { hexToRgb, useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { catmull, outline } from '../lib/brush';
import { FONT } from '../lib/fonts';
import { Q_POINTS, questionField } from '../lib/generators';
import { fitMeasured, measure } from '../lib/measure';
import type { Pt } from '../lib/pathSample';
import { f1, rng } from '../lib/rng';
import { QUESTION_GLYPH } from '../lib/strokeFont';

/* ======================================================================= */
/* helpers                                                                 */
/* ======================================================================= */

const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
/** Base hue driven by the creative controls (background + accent). */
const baseHue = (c: Colors, s: CreativeSettings) => (c.background === 'paper' ? mix(s.accent, '#ffffff', 0.35) : c.background === 'dark' ? mix(s.accent, '#000000', 0.55) : s.accent);

const MONTHS: Record<string, string> = { janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12' };
/** "12 JUILLET 2025" → "12.07" (falls back to the raw date). */
function shortDate(date: string) {
  const m = /^(\d{1,2})\s+([^\s]+)/.exec(date.trim());
  const mm = m && MONTHS[m[2].toLowerCase()];
  return m && mm ? `${m[1].padStart(2, '0')}.${mm}` : date;
}
const joinB2B = (a: { name: string; detail: string }) => (/^b2b/i.test(a.detail) ? `${a.name} ${a.detail}` : a.name);

/** Points along the "?" skeleton, centred on (cx, cy), glyph height h, roughly every `step` px. */
function qPoints(cx: number, cy: number, h: number, step: number): Pt[] {
  const s = h / 100;
  const out: Pt[] = [];
  let last: Pt | null = null;
  for (const [x, y] of Q_POINTS) {
    const p: Pt = [cx + (x - 28) * s, cy + (y - 50) * s];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= step) {
      out.push(p);
      last = p;
    }
  }
  return out;
}

function Blur({ sd, children }: { sd: number; children: ReactNode }) {
  const id = useUid('bl');
  return (
    <g filter={`url(#${id})`}>
      <defs>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={sd} />
        </filter>
      </defs>
      {children}
    </g>
  );
}

/* ---------- wordmark logo factory ---------- */
interface WordStyle {
  family: string;
  css: string;
  weight: number;
  italic?: boolean;
  lower?: boolean;
  tracking: number;
  Symbol: FC<{ tone: Tone }>;
}

function makeLogo(st: WordStyle): FC<LogoProps> {
  return function WordLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
    if (variant === 'symbol') {
      return (
        <svg viewBox="0 0 300 300" x={x} y={y} width={width ?? 300} height={height ?? 300}>
          <st.Symbol tone={tone} />
        </svg>
      );
    }
    const d = wordDims(st, brand, variant === 'secondary' ? 'line' : layout, variant === 'secondary' ? 70 : 140);
    return (
      <svg viewBox={`0 0 ${f1(d.w)} ${f1(d.h)}`} x={x} y={y} width={width ?? d.w} height={height ?? d.h}>
        {d.rows.map((r, i) => (
          <text
            key={i}
            x={d.w / 2}
            y={d.size * 0.98 + i * d.size * 1.04}
            textAnchor="middle"
            fontFamily={st.css}
            fontWeight={st.weight}
            fontStyle={st.italic ? 'italic' : undefined}
            fontSize={d.size}
            letterSpacing={d.size * st.tracking}
            fill={tone.fg}
          >
            {r.replace(/ \?$/, '')}
            {/ \?$/.test(r) && <tspan fill={tone.accent}> ?</tspan>}
          </text>
        ))}
      </svg>
    );
  };
}

function wordDims(st: WordStyle, brand: string, layout: 'stacked' | 'line', size = 140) {
  const { words, question, base } = splitBrand(brand);
  const tx = (s: string) => (st.lower ? s.toLowerCase() : s.toUpperCase());
  const font = { family: st.family, size, weight: st.weight, italic: st.italic, tracking: size * st.tracking };
  const q = question ? ' ?' : '';
  const rows = layout !== 'line' && words.length > 1 ? [tx(words[0]), tx(words.slice(1).join(' ')) + q] : [tx(base) + q];
  return { rows, size, w: Math.max(...rows.map((r) => measure(r, font))) + size * 0.5, h: rows.length * size * 1.04 + size * 0.42 };
}

/** Title block honouring the "title layout" + "logo size" controls. */
function Title({ st, content, settings, colors, cx, y, maxW, maxH, fg = '#ffffff' }: { st: WordStyle; content: EventContent; settings: CreativeSettings; colors: Colors; cx: number; y: number; maxW: number; maxH: number; fg?: string }) {
  const Logo = useMemo(() => makeLogo(st), [st]);
  const tone: Tone = { fg, accent: colors.accent === colors.ink ? fg : colors.accent };
  if (settings.titleLayout === 'symbol') {
    const s = maxH * 1.15 * settings.logoScale;
    return <Logo variant="symbol" brand={content.brand} tone={tone} x={cx - s / 2} y={y} width={s} height={s} />;
  }
  const lay = settings.titleLayout === 'line' ? 'line' : 'stacked';
  const d = wordDims(st, content.brand, lay);
  const k = Math.min(maxW / d.w, maxH / d.h) * settings.logoScale;
  return <Logo variant="primary" layout={lay} brand={content.brand} tone={tone} x={cx - (d.w * k) / 2} y={y} width={d.w * k} height={d.h * k} />;
}

/** Club-poster line-up: centred, huge, one name per line (or one row joined by a separator). */
function Lineup({ content, cx, y, maxW, size, family, css, weight, color = '#ffffff', italic, oneRow }: { content: EventContent; cx: number; y: number; maxW: number; size: number; family: string; css: string; weight: number; color?: string; italic?: boolean; oneRow?: string }) {
  if (oneRow) {
    const t = content.lineup.map((a) => a.name).join(oneRow);
    return (
      <text x={cx} y={y} textAnchor="middle" fontFamily={css} fontWeight={weight} fontStyle={italic ? 'italic' : undefined} fill={color} fontSize={fitMeasured(t, maxW, { family, size, weight, italic })}>
        {t}
      </text>
    );
  }
  return (
    <g textAnchor="middle" fontFamily={css} fontWeight={weight} fontStyle={italic ? 'italic' : undefined} fill={color}>
      {content.lineup.map((a, i) => {
        const t = joinB2B(a);
        return (
          <text key={a.id} x={cx} y={y + i * size * 1.02} fontSize={fitMeasured(t, maxW, { family, size, weight, italic, tracking: -size * 0.02 })} letterSpacing={-size * 0.02}>
            {t}
          </text>
        );
      })}
    </g>
  );
}

const PhotoLayer = ({ settings, photoSrc, W, H, light, opacity = 0.35 }: { settings: CreativeSettings; photoSrc: string | null; W: number; H: number; light: string; opacity?: number }) =>
  settings.photo ? (
    <g opacity={opacity}>
      <Photo width={W} height={H} kind="crowd" src={photoSrc} shadow="#000000" light={light} grain={0.4} />
    </g>
  ) : null;

/* ======================================================================= */
/* 18 — FACETTES : a mirror ball shaped like the "?"                       */
/* ======================================================================= */

function MirrorQ({ cx, cy, h, tint, cell = 22, seed = 3 }: { cx: number; cy: number; h: number; tint: string; cell?: number; seed?: number }) {
  const tiles = useMemo(() => {
    const r = rng(seed);
    const field = questionField(cx, cy, h, h * 0.1);
    const out: { x: number; y: number; c: string; hot: boolean }[] = [];
    for (let y = cy - h * 0.6; y < cy + h * 0.6; y += cell) {
      for (let x = cx - h * 0.45; x < cx + h * 0.45; x += cell) {
        const v = field(x + cell / 2, y + cell / 2);
        if (v < 0.22) continue;
        const light = Math.max(0, 1 - Math.hypot(x - (cx - h * 0.2), y - (cy - h * 0.35)) / (h * 0.9));
        const b = 0.25 + 0.5 * r() + 0.35 * light;
        const hot = r() < 0.06 + light * 0.12;
        const base = mix('#1c1d22', '#e9ecf2', Math.min(1, b));
        out.push({ x, y, c: hot ? '#ffffff' : r() < 0.18 ? mix(base, tint, 0.55) : base, hot });
      }
    }
    return out;
  }, [cx, cy, h, tint, cell, seed]);
  return (
    <g>
      {tiles.map((t, i) => (
        <rect key={i} x={t.x + 1.2} y={t.y + 1.2} width={cell - 2.4} height={cell - 2.4} rx={1.5} fill={t.c} />
      ))}
      {tiles
        .filter((t) => t.hot)
        .map((t, i) => (
          <Sparkle key={i} x={t.x + cell / 2} y={t.y + cell / 2} s={cell * 0.9} />
        ))}
    </g>
  );
}

function Sparkle({ x, y, s, color = '#ffffff' }: { x: number; y: number; s: number; color?: string }) {
  return <path d={`M${f1(x)} ${f1(y - s)}Q${f1(x)} ${f1(y)} ${f1(x + s)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y + s)}Q${f1(x)} ${f1(y)} ${f1(x - s)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y - s)}Z`} fill={color} />;
}

/** Light spots thrown by the ball across the room. */
function Spots({ W, H, tint, seed = 8, n = 70 }: { W: number; H: number; tint: string; seed?: number; n?: number }) {
  const spots = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, rx: 4 + r() * 16, ry: 3 + r() * 9, rot: r() * 180, c: r() < 0.3 ? tint : '#ffffff', o: 0.35 + r() * 0.6 }));
  }, [W, H, tint, seed, n]);
  return (
    <g>
      <Blur sd={6}>
        {spots.map((s, i) => (
          <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx * 2.2} ry={s.ry * 2.2} fill={s.c} opacity={s.o * 0.5} transform={`rotate(${f1(s.rot)} ${f1(s.x)} ${f1(s.y)})`} />
        ))}
      </Blur>
      {spots.map((s, i) => (
        <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={s.c} opacity={s.o} transform={`rotate(${f1(s.rot)} ${f1(s.x)} ${f1(s.y)})`} />
      ))}
    </g>
  );
}

const facettesStyle: WordStyle = {
  family: "'General Sans'",
  css: FONT.sans,
  weight: 600,
  tracking: 0.06,
  Symbol: ({ tone }) => (
    <g>
      <line x1={150} x2={150} y1={0} y2={34} stroke={tone.fg} strokeWidth={3} />
      <MirrorQ cx={150} cy={160} h={230} tint={tone.accent} cell={12} />
    </g>
  ),
};

function FacettesPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const hue = baseHue(colors, settings);
  const bg = mix(hue, '#000000', 0.72);
  const qh = (sq ? 440 : 640) * settings.logoScale;
  const qcy = sq ? 280 : 420;
  return (
    <Artboard format={format} colors={{ ...colors, bg }} texture={settings.texture * 0.4} label={`${content.brand} — facettes`}>
      <defs>
        <radialGradient id="facGlow" cx="0.5" cy={qcy / H} r="0.6">
          <stop offset="0" stopColor={mix(hue, '#ffffff', 0.15)} stopOpacity="0.55" />
          <stop offset="1" stopColor={bg} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#facGlow)" />
      <PhotoLayer settings={settings} photoSrc={photoSrc} W={W} H={H} light={mix(hue, '#ffffff', 0.5)} />
      <Spots W={W} H={H} tint={mix(hue, '#ffffff', 0.3)} />
      <line x1={W / 2} x2={W / 2} y1={0} y2={qcy - qh * 0.58} stroke="#d9dbe0" strokeWidth={3} />
      <MirrorQ cx={W / 2} cy={qcy} h={qh} tint={hue} cell={sq ? 18 : 22} />
      <Title st={facettesStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : settings} colors={colors} cx={W / 2} y={sq ? 560 : 830} maxW={sq ? 760 : 840} maxH={sq ? 120 : 190} />
      <text x={W / 2} y={sq ? 760 : 1050} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 22 : 30} letterSpacing={sq ? 6 : 9} fill="#ffffff">
        {content.date} · {content.venue}
      </text>
      <Lineup content={content} cx={W / 2} y={sq ? 830 : 1150} maxW={sq ? 820 : 860} size={settings.infoLayout === 'split' ? (sq ? 40 : 62) : sq ? 32 : 48} family="'General Sans'" css={FONT.sans} weight={700} />
      <text x={W / 2} y={H - (sq ? 26 : 56)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={500} fontSize={sq ? 13 : 16} letterSpacing={3} fill="#ffffff" opacity={0.8}>
        {content.mentions || `${content.edition} · ${content.pillars}`}
      </text>
    </Artboard>
  );
}

/* ======================================================================= */
/* 19 — BAB : the studded blue door of Sidi Bou Saïd                       */
/* ======================================================================= */

function Stud({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x + r * 0.25} cy={y + r * 0.35} r={r} fill="#000" opacity={0.35} />
      <circle cx={x} cy={y} r={r} fill="url(#babStud)" />
    </g>
  );
}

function Door({ x, y, w, h, color, withQ = true, seed = 4 }: { x: number; y: number; w: number; h: number; color: string; withQ?: boolean; seed?: number }) {
  const r = w / 2;
  const arch = `M${x} ${y + h}V${y + r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h}Z`;
  const studs = useMemo(() => {
    const pts: Pt[] = [];
    const sp = w / 16;
    const inset = w * 0.08;
    // border following the arch
    for (let a = Math.PI; a <= Math.PI * 2 + 0.001; a += sp / (r - inset)) pts.push([x + r + Math.cos(a) * (r - inset), y + r + Math.sin(a) * (r - inset)]);
    for (let yy = y + r; yy <= y + h - inset; yy += sp) pts.push([x + inset, yy], [x + w - inset, yy]);
    for (let xx = x + inset; xx <= x + w - inset; xx += sp) pts.push([xx, y + h - inset]);
    // central rosette-like square frame
    const fx0 = x + w * 0.2;
    const fx1 = x + w * 0.8;
    const fy0 = y + h * 0.66;
    const fy1 = y + h * 0.86;
    for (let xx = fx0; xx <= fx1; xx += sp) pts.push([xx, fy0], [xx, fy1]);
    for (let yy = fy0 + sp; yy < fy1; yy += sp) pts.push([fx0, yy], [fx1, yy]);
    const q = withQ ? qPoints(x + w / 2, y + h * 0.4, w * 0.62, sp * 0.95) : [];
    return { frame: pts, q };
  }, [x, y, w, h, r, withQ]);
  const sr = w / 46;
  const rr = rng(seed);
  return (
    <g>
      <defs>
        <radialGradient id="babStud" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#9aa0a8" />
          <stop offset="0.45" stopColor="#2a2d33" />
          <stop offset="1" stopColor="#08090b" />
        </radialGradient>
        <linearGradient id="babWood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={mix(color, '#000000', 0.25)} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={mix(color, '#000000', 0.3)} />
        </linearGradient>
      </defs>
      <path d={`M${x - w * 0.06} ${y + h}V${y + r}A${r + w * 0.06} ${r + w * 0.06} 0 0 1 ${x + w + w * 0.06} ${y + r}V${y + h}Z`} fill="#f7f4ee" stroke="#d9d3c8" strokeWidth={2} />
      <path d={arch} fill="url(#babWood)" />
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={x + (w * (i + 1)) / 7} x2={x + (w * (i + 1)) / 7} y1={y + r * 0.2} y2={y + h} stroke="#000" strokeOpacity={0.12} strokeWidth={2} />
      ))}
      {studs.frame.map(([sx, sy], i) => (
        <Stud key={i} x={sx} y={sy} r={sr} />
      ))}
      {studs.q.map(([sx, sy], i) => (
        <Stud key={'q' + i} x={sx} y={sy} r={sr * (1.25 + rr() * 0.1)} />
      ))}
      <circle cx={x + w * 0.82} cy={y + h * 0.58} r={w * 0.045} fill="none" stroke="#1a1b1e" strokeWidth={w * 0.014} />
    </g>
  );
}

const babStyle: WordStyle = {
  family: "'Gambetta'",
  css: FONT.gambetta,
  weight: 600,
  tracking: 0.12,
  Symbol: ({ tone }) => (
    <g>
      <Door x={75} y={20} w={150} h={260} color={tone.accent} />
    </g>
  ),
};

function BabPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const night = colors.background === 'dark';
  const wall = night ? '#14213a' : colors.background === 'accent' ? mix(settings.accent, '#ffffff', 0.85) : '#f3efe6';
  const ink = night ? '#f3efe6' : '#16233f';
  const door = settings.accent;
  const dw = (sq ? 360 : 470) * settings.logoScale;
  const dh = dw * 1.72;
  const dx = sq ? 560 - dw / 2 + 140 : W / 2 - dw / 2;
  const dy = sq ? 1000 - dh - 40 : 380;
  const r = rng(13);
  return (
    <Artboard format={format} colors={{ ...colors, bg: wall }} texture={settings.texture * 0.9} label={`${content.brand} — bab`}>
      {/* lime-washed wall */}
      {Array.from({ length: 26 }, (_, i) => (
        <ellipse key={i} cx={r() * W} cy={r() * H} rx={80 + r() * 200} ry={30 + r() * 80} fill={night ? '#0c1526' : '#e3ddd0'} opacity={0.35} />
      ))}
      {night && (
        <Blur sd={60}>
          <ellipse cx={dx + dw / 2} cy={dy + dh * 0.1} rx={dw * 0.8} ry={dw * 0.5} fill="#ffcf7a" opacity={0.35} />
        </Blur>
      )}
      <PhotoLayer settings={settings} photoSrc={photoSrc} W={W} H={H} light={wall} opacity={0.18} />
      {/* bougainvillea */}
      <Blur sd={1.5}>
        {Array.from({ length: 90 }, (_, i) => {
          const side = i % 2 ? 1 : -1;
          const t = r();
          const cx0 = dx + dw / 2 + side * (dw * 0.58 + r() * dw * 0.22);
          const cy0 = dy + dw * 0.25 + t * dh * 0.55;
          return <circle key={i} cx={cx0} cy={cy0} r={6 + r() * 12} fill={r() < 0.72 ? '#d6337a' : '#2f6b3a'} opacity={0.85} />;
        })}
      </Blur>
      <Door x={dx} y={dy} w={dw} h={dh} color={door} />
      {sq ? (
        <g>
          <Title st={babStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'stacked' } : settings} colors={colors} cx={250} y={60} maxW={420} maxH={230} fg={ink} />
          <text x={250} y={360} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={22} letterSpacing={4} fill={ink}>
            {content.date}
          </text>
          <Lineup content={content} cx={250} y={460} maxW={420} size={34} family="'General Sans'" css={FONT.sans} weight={700} color={ink} />
          <text x={250} y={930} textAnchor="middle" fontFamily={FONT.gambetta} fontStyle="italic" fontSize={26} fill={ink}>
            {content.venue.toLowerCase()}
          </text>
        </g>
      ) : (
        <g>
          <Title st={babStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : settings} colors={colors} cx={W / 2} y={60} maxW={820} maxH={220} fg={ink} />
          <text x={W / 2} y={dy - 26} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={24} letterSpacing={6} fill={ink}>
            {content.date} — {content.venue}
          </text>
          <Lineup content={content} cx={W / 2} y={dy + dh + 90} maxW={840} size={settings.infoLayout === 'split' ? 56 : 44} family="'General Sans'" css={FONT.sans} weight={700} color={ink} />
          <text x={W / 2} y={H - 46} textAnchor="middle" fontFamily={FONT.gambetta} fontStyle="italic" fontSize={24} fill={ink}>
            {lines(content.signature).join(' · ').toLowerCase()}
          </text>
        </g>
      )}
    </Artboard>
  );
}

/* ======================================================================= */
/* 20 — MACHMOUM : jasmine flowers composing the "?"                       */
/* ======================================================================= */

function Jasmine({ x, y, s, rot, open = 1 }: { x: number; y: number; s: number; rot: number; open?: number }) {
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(s * 100) / 100})`}>
      {[0, 1, 2, 3, 4].map((k) => (
        <ellipse key={k} cx={0} cy={-11 * open} rx={6.2} ry={11} fill="url(#jasPetal)" transform={`rotate(${k * 72})`} />
      ))}
      <circle r={2.6} fill="#e8d27a" />
    </g>
  );
}

function JasmineQ({ cx, cy, h, seed = 6 }: { cx: number; cy: number; h: number; seed?: number }) {
  const flowers = useMemo(() => {
    const r = rng(seed);
    const pts = qPoints(cx, cy, h, h * 0.032);
    return pts.flatMap(([x, y]) =>
      Array.from({ length: 2 }, () => ({ x: x + (r() - 0.5) * h * 0.07, y: y + (r() - 0.5) * h * 0.07, s: (h / 600) * (1 + r() * 0.9), rot: r() * 72, open: 0.7 + r() * 0.4, bud: r() < 0.2 })),
    );
  }, [cx, cy, h, seed]);
  return (
    <g>
      {flowers.map((f, i) =>
        f.bud ? (
          <ellipse key={i} cx={f.x} cy={f.y} rx={5 * f.s} ry={9 * f.s} fill="#f3e9f0" transform={`rotate(${f.rot * 5} ${f.x} ${f.y})`} />
        ) : (
          <Jasmine key={i} x={f.x} y={f.y} s={f.s} rot={f.rot} open={f.open} />
        ),
      )}
    </g>
  );
}

const JasDefs = () => (
  <defs>
    <radialGradient id="jasPetal" cx="0.5" cy="0.8" r="0.9">
      <stop offset="0" stopColor="#f1e3c8" />
      <stop offset="0.35" stopColor="#ffffff" />
      <stop offset="1" stopColor="#efe6f2" />
    </radialGradient>
  </defs>
);

const machmoumStyle: WordStyle = {
  family: "'Gambetta'",
  css: FONT.gambetta,
  weight: 500,
  italic: true,
  lower: true,
  tracking: -0.01,
  Symbol: () => (
    <g>
      <JasDefs />
      <JasmineQ cx={150} cy={150} h={250} />
    </g>
  ),
};

function MachmoumPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const hue = baseHue(colors, settings);
  const bg = mix(hue, '#04060a', 0.8);
  const qh = (sq ? 560 : 720) * settings.logoScale;
  const qcy = sq ? 420 : 560;
  const r = rng(30);
  return (
    <Artboard format={format} colors={{ ...colors, bg }} texture={settings.texture * 0.5} label={`${content.brand} — machmoum`}>
      <JasDefs />
      <Blur sd={120}>
        <ellipse cx={W / 2} cy={qcy} rx={420} ry={520} fill={mix(hue, '#ffffff', 0.08)} opacity={0.6} />
      </Blur>
      <PhotoLayer settings={settings} photoSrc={photoSrc} W={W} H={H} light={mix(hue, '#ffffff', 0.4)} opacity={0.25} />
      {/* falling petals out of focus */}
      <Blur sd={5}>
        {Array.from({ length: 22 }, (_, i) => (
          <ellipse key={i} cx={r() * W} cy={r() * H} rx={8 + r() * 10} ry={14 + r() * 16} fill="#ffffff" opacity={0.25 + r() * 0.3} transform={`rotate(${r() * 180} 0 0)`} />
        ))}
      </Blur>
      <Blur sd={18}>
        <JasmineQ cx={W / 2 + 6} cy={qcy + 10} h={qh} seed={7} />
      </Blur>
      <JasmineQ cx={W / 2} cy={qcy} h={qh} />
      <text x={W / 2} y={sq ? 60 : 90} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 15 : 19} letterSpacing={6} fill="#f3eee6">
        {content.edition} · {content.venue}
      </text>
      <Title st={machmoumStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : settings} colors={colors} cx={W / 2} y={sq ? 720 : 960} maxW={sq ? 640 : 780} maxH={sq ? 110 : 170} fg="#f6f0e6" />
      <text x={W / 2} y={sq ? 870 : 1190} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 22 : 28} letterSpacing={8} fill="#f3eee6">
        {content.date}
      </text>
      <Lineup content={content} cx={W / 2} y={sq ? 920 : 1270} maxW={sq ? 820 : 860} size={settings.infoLayout === 'split' ? (sq ? 30 : 46) : sq ? 26 : 38} family="'General Sans'" css={FONT.sans} weight={700} color="#ffffff" oneRow={sq ? ' · ' : undefined} />
    </Artboard>
  );
}

/* ======================================================================= */
/* 21 — THERMIQUE : the dance floor seen by a thermal camera               */
/* ======================================================================= */

const INFERNO = {
  r: '0 0.12 0.42 0.78 0.98 1 1',
  g: '0 0.02 0.04 0.18 0.5 0.85 1',
  b: '0.02 0.3 0.45 0.3 0.08 0.25 0.95',
};

function ThermalField({ W, H, qcx, qcy, qh, seed = 2, people = 160 }: { W: number; H: number; qcx: number; qcy: number; qh: number; seed?: number; people?: number }) {
  const id = useUid('th');
  const bodies = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: people }, () => {
      const cluster = r() < 0.6;
      const x = cluster ? qcx + (r() - 0.5) * W * 0.7 : r() * W;
      const y = cluster ? qcy + (r() - 0.5) * H * 0.6 : r() * H;
      return { x, y, s: 16 + r() * 18, o: 0.18 + r() * 0.2 };
    });
  }, [W, H, qcx, qcy, seed, people]);
  const s = qh / 100;
  return (
    <g filter={`url(#${id})`}>
      <defs>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="22" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={INFERNO.r} />
            <feFuncG type="table" tableValues={INFERNO.g} />
            <feFuncB type="table" tableValues={INFERNO.b} />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width={W} height={H} fill="#000" />
      {bodies.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.s} fill="#fff" opacity={b.o} />
      ))}
      <path d={QUESTION_GLYPH.d} transform={`translate(${f1(qcx - 28 * s)} ${f1(qcy - 50 * s)}) scale(${f1(s * 100) / 100})`} fill="none" stroke="#fff" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={0.92} />
    </g>
  );
}

function Hud({ W, H, x, y, label }: { W: number; H: number; x: number; y: number; label: string }) {
  const c = '#ffffff';
  const corner = (cx: number, cy: number, dx: number, dy: number) => <path d={`M${cx} ${cy + dy * 40}V${cy}H${cx + dx * 40}`} fill="none" stroke={c} strokeWidth={3} />;
  return (
    <g opacity={0.9}>
      {corner(40, 40, 1, 1)}
      {corner(W - 40, 40, -1, 1)}
      {corner(40, H - 40, 1, -1)}
      {corner(W - 40, H - 40, -1, -1)}
      <g stroke={c} strokeWidth={2} fill="none">
        <circle cx={x} cy={y} r={34} />
        <path d={`M${x - 60} ${y}H${x - 40}M${x + 40} ${y}H${x + 60}M${x} ${y - 60}V${y - 40}M${x} ${y + 40}V${y + 60}`} />
      </g>
      <text x={x + 48} y={y - 46} fontFamily={FONT.mono} fontSize={16} letterSpacing={2} fill={c}>
        {label}
      </text>
    </g>
  );
}

const thermiqueStyle: WordStyle = {
  family: "'IBM Plex Mono'",
  css: FONT.mono,
  weight: 500,
  tracking: 0.04,
  Symbol: () => (
    <g>
      <ThermalField W={300} H={300} qcx={150} qcy={150} qh={210} people={30} />
    </g>
  ),
};

function ThermiquePoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const qh = (sq ? 520 : 640) * settings.logoScale;
  const qcy = sq ? 440 : 600;
  const scale = ['#000000', '#3a0a5a', '#9a1c5a', '#e8471a', '#ffb21a', '#fff4c8'];
  return (
    <Artboard format={format} colors={{ ...colors, bg: '#000000' }} texture={settings.texture * 0.6} label={`${content.brand} — thermique`}>
      <ThermalField W={W} H={H} qcx={W / 2} qcy={qcy} qh={qh} />
      <PhotoLayer settings={settings} photoSrc={photoSrc} W={W} H={H} light="#ffb21a" opacity={0.18} />
      <Hud W={W} H={H} x={W / 2 + qh * 0.05} y={qcy + qh * 0.47} label="T° MAX" />
      <g>
        {scale.map((c, i) => (
          <rect key={i} x={W - 70} y={(sq ? 300 : 420) + i * 50} width={18} height={50} fill={c} />
        ))}
        <text x={W - 80} y={sq ? 316 : 436} textAnchor="end" fontFamily={FONT.mono} fontSize={14} fill="#fff">
          −
        </text>
        <text x={W - 80} y={(sq ? 300 : 420) + 300} textAnchor="end" fontFamily={FONT.mono} fontSize={14} fill="#fff">
          +
        </text>
      </g>
      <text x={70} y={sq ? 80 : 96} fontFamily={FONT.mono} fontSize={sq ? 14 : 16} letterSpacing={3} fill="#ffffff">
        ● REC · {content.edition} · {shortDate(content.date)}
      </text>
      <Title st={thermiqueStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : settings} colors={colors} cx={W / 2} y={sq ? 100 : 130} maxW={sq ? 760 : 820} maxH={sq ? 110 : 150} />
      <text x={W / 2} y={sq ? 820 : 1130} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={sq ? 20 : 24} letterSpacing={6} fill="#ffffff">
        {content.date} · {content.venue}
      </text>
      <Lineup content={content} cx={W / 2} y={sq ? 880 : 1220} maxW={sq ? 820 : 860} size={settings.infoLayout === 'split' ? (sq ? 36 : 56) : sq ? 28 : 44} family="'General Sans'" css={FONT.sans} weight={700} />
      <text x={W / 2} y={H - (sq ? 26 : 50)} textAnchor="middle" fontFamily={FONT.mono} fontSize={sq ? 12 : 14} letterSpacing={3} fill="#ffffff" opacity={0.8}>
        {lines(content.signature).join(' / ')}
      </text>
    </Artboard>
  );
}

/* ======================================================================= */
/* 22 — BRACELET : a giant woven entry wristband                           */
/* ======================================================================= */

function Ribbon({ ctrl, width, front, back, text, seed = 1 }: { ctrl: Pt[]; width: number; front: string; back: string; text: string; seed?: number }) {
  const id = useUid('rb');
  const data = useMemo(() => {
    const pts = catmull(ctrl, 40);
    // twist: width follows |cos|, side follows sign
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tw = (i: number) => Math.cos(lens[i] * 0.0042 + seed);
    const runs: { pts: Pt[]; front: boolean; idx: number[] }[] = [];
    pts.forEach((p, i) => {
      const f = tw(i) >= 0;
      const last = runs[runs.length - 1];
      if (!last || last.front !== f) runs.push({ pts: last ? [last.pts[last.pts.length - 1], p] : [p], front: f, idx: last ? [last.idx[last.idx.length - 1], i] : [i] });
      else {
        last.pts.push(p);
        last.idx.push(i);
      }
    });
    const center = 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
    return {
      runs: runs.map((r) => ({ front: r.front, d: outline(r.pts, (t) => width * (0.08 + 0.92 * Math.abs(tw(r.idx[Math.min(r.idx.length - 1, Math.round(t * (r.idx.length - 1)))])))) })),
      center,
      total: lens[lens.length - 1],
    };
  }, [ctrl, width, seed]);
  const unit = text + ' · ';
  const reps = Math.max(1, Math.ceil(data.total / (unit.length * width * 0.36)));
  return (
    <g>
      <defs>
        <path id={id + 'c'} d={data.center} />
        <pattern id={id + 'weave'} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 0H6M0 3H6" stroke="#000" strokeOpacity="0.12" strokeWidth="1" />
        </pattern>
      </defs>
      <Blur sd={18}>
        {data.runs.map((r, i) => (
          <path key={i} d={r.d} fill="#000" opacity={0.35} transform="translate(18 26)" />
        ))}
      </Blur>
      {data.runs.map((r, i) => (
        <g key={i}>
          <path d={r.d} fill={r.front ? front : back} />
          <path d={r.d} fill={`url(#${id}weave)`} />
        </g>
      ))}
      <text fontFamily={FONT.sans} fontWeight={700} fontSize={width * 0.42} letterSpacing={width * 0.04} fill="#ffffff" dy={width * 0.15}>
        <textPath href={`#${id}c`}>{unit.repeat(reps)}</textPath>
      </text>
    </g>
  );
}

const braceletStyle: WordStyle = {
  family: "'Anton'",
  css: FONT.condensed,
  weight: 400,
  tracking: 0.02,
  Symbol: ({ tone }) => (
    <g>
      <ellipse cx={150} cy={150} rx={118} ry={70} fill="none" stroke={tone.accent} strokeWidth={46} transform="rotate(-18 150 150)" />
      <ellipse cx={150} cy={150} rx={118} ry={70} fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={46} strokeDasharray="2 4" transform="rotate(-18 150 150)" />
      <rect x={218} y={74} width={40} height={58} rx={6} fill="#cfd3da" stroke="#8a8f99" strokeWidth={3} transform="rotate(-18 238 103)" />
      <text x={150} y={168} textAnchor="middle" fontFamily={FONT.condensed} fontSize={60} fill={tone.fg} transform="rotate(-18 150 150)">
        ?
      </text>
    </g>
  ),
};

function BraceletPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const hue = settings.accent;
  const bg = colors.background === 'dark' ? '#0d0c0f' : colors.background === 'accent' ? mix(hue, '#ffffff', 0.82) : '#f2eee6';
  const ink = colors.background === 'dark' ? '#f2eee6' : '#141414';
  const k = settings.logoScale;
  const ctrl: Pt[] = sq
    ? [
        [-80, 560],
        [260, 460],
        [520, 660],
        [760, 420],
        [1080, 560],
      ]
    : [
        [-80, 640],
        [300, 540],
        [640, 780],
        [380, 1000],
        [760, 1070],
        [1080, 900],
      ];
  const label = splitBrand(content.brand).base.toUpperCase() + (splitBrand(content.brand).question ? ' ?' : '') + ' · ' + content.edition;
  return (
    <Artboard format={format} colors={{ ...colors, bg }} texture={settings.texture * 0.6} label={`${content.brand} — bracelet`}>
      <PhotoLayer settings={settings} photoSrc={photoSrc} W={W} H={H} light={bg} opacity={0.2} />
      <Ribbon ctrl={ctrl} width={150 * k} front={hue} back={mix(hue, '#000000', 0.45)} text={label} />
      <g transform={`translate(760 ${sq ? 420 : 1070}) rotate(-24)`}>
        <rect x={-38 * k} y={-56 * k} width={76 * k} height={112 * k} rx={10 * k} fill="#d4d8de" stroke="#8b909a" strokeWidth={3} />
        <rect x={-22 * k} y={-30 * k} width={44 * k} height={60 * k} rx={6 * k} fill="#aeb3bc" />
      </g>
      <Title st={braceletStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : settings} colors={colors} cx={W / 2} y={sq ? 50 : 80} maxW={sq ? 760 : 840} maxH={sq ? 200 : 260} fg={ink} />
      <text x={W / 2} y={sq ? 300 : 400} textAnchor="middle" fontFamily={FONT.sans} fontWeight={700} fontSize={sq ? 24 : 32} letterSpacing={6} fill={ink}>
        {content.date} · {content.venue}
      </text>
      <Lineup content={content} cx={W / 2} y={sq ? 800 : 1240} maxW={sq ? 820 : 860} size={settings.infoLayout === 'split' ? (sq ? 40 : 60) : sq ? 30 : 46} family="'Anton'" css={FONT.condensed} weight={400} color={ink} />
      <text x={W / 2} y={H - (sq ? 30 : 56)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 13 : 16} letterSpacing={3} fill={ink} opacity={0.8}>
        {content.mentions || content.pillars}
      </text>
    </Artboard>
  );
}

/* ======================================================================= */
/* 23 — REFLET : the same place twice, by day and in its night reflection  */
/* ======================================================================= */

function Facade({ W, base, line, lights }: { W: number; base: number; line: string; lights: string }) {
  const arches = [0.22, 0.5, 0.78].map((f) => W * f);
  const aw = W * 0.18;
  const ah = 300;
  const bulbs: Pt[] = [];
  for (let s = 0; s < 3; s++) {
    const x0 = W * (0.05 + s * 0.3);
    const x1 = x0 + W * 0.3;
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      bulbs.push([x0 + (x1 - x0) * t, base - ah - 70 + Math.sin(t * Math.PI) * 40]);
    }
  }
  return (
    <g fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M0 ${base}H${W}`} />
      <path d={`M${W * 0.04} ${base}V${base - ah - 40}H${W * 0.96}V${base}`} />
      {arches.map((x, i) => (
        <path key={i} d={`M${x - aw / 2} ${base}V${base - ah + aw / 2}A${aw / 2} ${aw / 2} 0 0 1 ${x + aw / 2} ${base - ah + aw / 2}V${base}`} />
      ))}
      {[0.06, 0.94].map((f, i) => {
        const x = W * f;
        return (
          <g key={i}>
            <path d={`M${x} ${base}Q${x + (i ? -20 : 20)} ${base - 260} ${x + (i ? -10 : 10)} ${base - 430}`} strokeWidth={6} />
            {[-70, -35, 0, 35, 70].map((a, k) => (
              <path key={k} d={`M${x + (i ? -10 : 10)} ${base - 430}q${f1(Math.sin((a * Math.PI) / 180) * 80)} -30 ${f1(Math.sin((a * Math.PI) / 180) * 150)} ${f1(40 + Math.abs(a))}`} />
            ))}
          </g>
        );
      })}
      <path d={bulbs.map(([x, y], i) => `${i % 13 ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('')} strokeWidth={1.5} />
      {bulbs.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y + 6} r={5} fill={lights} stroke="none" />
      ))}
    </g>
  );
}

const refletStyle: WordStyle = {
  family: "'Cormorant Garamond'",
  css: FONT.serif,
  weight: 600,
  tracking: 0.16,
  Symbol: ({ tone }) => (
    <g fill="none" strokeWidth={6}>
      <path d="M90 150V90A60 60 0 0 1 210 90V150" stroke={tone.fg} />
      <path d="M90 150V210A60 60 0 0 0 210 210V150" stroke={tone.accent} strokeDasharray="10 8" />
      <path d="M50 150H250" stroke={tone.fg} />
    </g>
  ),
};

function RefletPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('rf');
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const mid = H / 2;
  const hue = settings.accent;
  const day = mix(hue, '#fff3df', 0.82);
  const night = mix(hue, '#05060c', 0.82);
  const base = mid - 10;
  return (
    <Artboard format={format} colors={{ ...colors, bg: day }} texture={settings.texture * 0.5} label={`${content.brand} — reflet`}>
      <defs>
        <linearGradient id={id + 'd'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(day, '#ffffff', 0.5)} />
          <stop offset="1" stopColor={day} />
        </linearGradient>
        <linearGradient id={id + 'n'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night} />
          <stop offset="1" stopColor={mix(night, '#000000', 0.6)} />
        </linearGradient>
        <filter id={id + 'w'} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.06" numOctaves={2} seed={4} />
          <feDisplacementMap in="SourceGraphic" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <rect width={W} height={mid} fill={`url(#${id}d)`} />
      <rect y={mid} width={W} height={H - mid} fill={`url(#${id}n)`} />
      <PhotoLayer settings={settings} photoSrc={photoSrc} W={W} H={H} light={day} opacity={0.15} />
      <g transform={`translate(0 ${(1 - settings.logoScale) * 120})`}>
        <Facade W={W} base={base} line={mix(hue, '#141414', 0.75)} lights={mix(hue, '#141414', 0.6)} />
        <g filter={`url(#${id}w)`} transform={`translate(0 ${mid + mid * 0.62}) scale(1 -0.62)`} opacity={0.9}>
          <Facade W={W} base={base} line={mix(hue, '#ffffff', 0.3)} lights="#ffd27a" />
        </g>
      </g>
      <rect x={0} y={mid - 2} width={W} height={4} fill={hue} />
      <text x={W / 2} y={sq ? 80 : 110} textAnchor="middle" fontFamily={FONT.serif} fontWeight={600} fontSize={sq ? 32 : 42} letterSpacing={12} fill={mix(hue, '#141414', 0.8)}>
        {(lines(content.signature)[0] ?? '').toUpperCase()}
      </text>
      <text x={W / 2} y={sq ? 120 : 160} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 15 : 18} letterSpacing={5} fill={mix(hue, '#141414', 0.8)}>
        {content.venue} · {content.date}
      </text>
      <Title st={refletStyle} content={content} settings={settings.titleLayout === 'symbol' ? { ...settings, titleLayout: 'line' } : { ...settings, titleLayout: 'line', logoScale: 1 }} colors={colors} cx={W / 2} y={mid + (sq ? 30 : 40)} maxW={sq ? 760 : 840} maxH={sq ? 90 : 120} fg="#ffffff" />
      <Lineup content={content} cx={W / 2} y={H - (sq ? 170 : 260)} maxW={sq ? 820 : 860} size={settings.infoLayout === 'split' ? (sq ? 36 : 54) : sq ? 28 : 42} family="'General Sans'" css={FONT.sans} weight={700} />
      <text x={W / 2} y={H - (sq ? 30 : 56)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={sq ? 13 : 16} letterSpacing={3} fill="#ffffff" opacity={0.8}>
        {(lines(content.signature)[2] ?? content.edition).toUpperCase()}
      </text>
    </Artboard>
  );
}

/* ======================================================================= */
/* Definitions                                                             */
/* ======================================================================= */

const typo = (title: string, css: string, weight: number, note: string, sample = 'UNE AUTRE ?', italic = false): ConceptDef['typography'] => [
  { role: 'Titre', family: title, css, weight, italic, sample, note },
  { role: 'Line-up', family: 'General Sans', css: FONT.sans, weight: 700, sample: 'RAYHANE B2B KARIM SIALA', note: 'Noms en gras, centrés, lisibles en story.' },
  { role: 'Infos', family: 'General Sans', css: FONT.sans, weight: 600, sample: '12 JUILLET 2025', note: 'Date et lieu juste sous le titre.' },
];
const BASE = { paper: '#f4efe6', ink: '#050505' };

export const facettes: ConceptDef = {
  id: 'facettes',
  index: '18',
  name: 'Facettes',
  short: 'Boule disco en forme de « ? »',
  description: 'Une boule à facettes qui a la forme du « ? » : des centaines de petits miroirs, et leurs éclats de lumière projetés sur toute l’affiche.',
  rationale: [
    'L’objet emblème du club, réinventé : la boule à facettes n’est plus une sphère, c’est le signe de la marque. Chaque miroir est calculé à partir du squelette du « ? ».',
    'Les éclats lumineux débordent sur tout le fond, comme dans la salle quand la boule tourne. La couleur d’édition teinte la salle et certains miroirs.',
    'Hiérarchie de club conservée : objet, titre, date et lieu, line-up en grand.',
  ],
  base: BASE,
  palette: [
    { name: 'Nuit teintée', hex: '#2a0a10', role: 'Fond' },
    { name: 'Miroir', hex: '#e9ecf2', role: 'Facettes' },
    { name: 'Couleur d’édition', hex: '#c8141e', role: 'Reflets' },
  ],
  typography: typo('General Sans', FONT.sans, 600, 'Capitales espacées, sobres face à l’objet.'),
  defaults: { accent: '#c8141e', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.25, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(facettesStyle),
  Poster: FacettesPoster,
};

export const bab: ConceptDef = {
  id: 'bab',
  index: '19',
  name: 'Bab',
  short: 'La porte cloutée de Sidi Bou Saïd',
  description: 'La porte bleue de Sidi Bou Saïd, dont les clous dessinent un « ? ». Mur chaulé, bougainvillier, et une porte qu’on a envie de pousser.',
  rationale: [
    'Un symbole que tout le monde reconnaît en Tunisie, utilisé d’une façon qu’on n’a jamais vue : les clous décoratifs de la porte forment le point d’interrogation de la marque.',
    'Pousser la porte, c’est entrer dans « une autre » expérience — même lieu, autre passage.',
    'Fond « noir » = la même porte la nuit, sous une lanterne ; la couleur d’édition change la couleur de la porte.',
  ],
  base: BASE,
  palette: [
    { name: 'Bleu Sidi Bou', hex: '#1d5fa8', role: 'Porte' },
    { name: 'Chaux', hex: '#f3efe6', role: 'Mur' },
    { name: 'Bougainvillier', hex: '#d6337a', role: 'Fleurs' },
    { name: 'Clous', hex: '#1a1b1e', role: 'Le « ? »' },
  ],
  typography: typo('Gambetta', FONT.gambetta, 600, 'Capitales sérif espacées, comme une plaque gravée.'),
  defaults: { accent: '#1d5fa8', background: 'paper', titleLayout: 'line', logoScale: 1, texture: 0.4, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(babStyle),
  Poster: BabPoster,
};

export const machmoum: ConceptDef = {
  id: 'machmoum',
  index: '20',
  name: 'Machmoum',
  short: 'Le « ? » en fleurs de jasmin',
  description: 'Un machmoum géant : des fleurs de jasmin assemblées en point d’interrogation, blanches sur une nuit d’été profonde.',
  rationale: [
    'Le jasmin, c’est l’odeur des nuits d’été tunisiennes. Ici les fleurs (pétales dessinés un à un) composent le « ? », avec un double flou derrière pour la profondeur.',
    'Quelques pétales tombent hors champ : l’affiche a une atmosphère, pas seulement une information.',
    'Titre en italique sérif, date espacée, line-up en grand en dessous.',
  ],
  base: BASE,
  palette: [
    { name: 'Nuit d’été', hex: '#0c0d14', role: 'Fond' },
    { name: 'Jasmin', hex: '#ffffff', role: 'Fleurs' },
    { name: 'Pistil', hex: '#e8d27a', role: 'Cœurs' },
  ],
  typography: typo('Gambetta Italic', FONT.gambetta, 500, 'Italique en minuscules, délicat.', 'une autre ?', true),
  defaults: { accent: '#2a3a6a', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(machmoumStyle),
  Poster: MachmoumPoster,
};

export const thermique: ConceptDef = {
  id: 'thermique',
  index: '21',
  name: 'Thermique',
  short: 'La piste vue en caméra thermique',
  description: 'La piste de danse vue d’en haut par une caméra thermique : la chaleur des corps, et au centre le point le plus chaud — en forme de « ? ».',
  rationale: [
    '« Mêmes gens », vus autrement : les danseurs deviennent des taches de chaleur ; la marque est la zone la plus brûlante de la salle.',
    'Palette thermique (noir, violet, rouge, orange, jaune, blanc), viseur et échelle de température façon interface de caméra — très fort en story et en vidéo.',
    'Totalement original dans le paysage des affiches de club, et pourtant immédiatement compréhensible.',
  ],
  base: BASE,
  palette: [
    { name: 'Froid', hex: '#3a0a5a', role: 'Fond de piste' },
    { name: 'Chaud', hex: '#e8471a', role: 'Foule' },
    { name: 'Brûlant', hex: '#fff4c8', role: 'Le « ? »' },
  ],
  typography: typo('IBM Plex Mono', FONT.mono, 500, 'Typographie d’interface de caméra.'),
  defaults: { accent: '#e8471a', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(thermiqueStyle),
  Poster: ThermiquePoster,
};

export const bracelet: ConceptDef = {
  id: 'bracelet',
  index: '22',
  name: 'Bracelet',
  short: 'Le bracelet d’entrée, géant',
  description: 'Le bracelet tissé qu’on porte au poignet, en géant : il s’enroule et se vrille à travers l’affiche, le nom imprimé dessus.',
  rationale: [
    'L’objet de la soirée elle-même : le bracelet d’entrée. Il devient le visuel principal, vrillé en 3D (recto en couleur d’édition, verso plus sombre), avec sa trame tissée et son fermoir.',
    'Le texte imprimé suit le ruban : la marque se lit en mouvement.',
    'Un visuel simple à décliner en vrai : bracelets, tote bags, sangles — l’affiche annonce le merch.',
  ],
  base: BASE,
  palette: [
    { name: 'Couleur d’édition', hex: '#d7261e', role: 'Ruban' },
    { name: 'Écru', hex: '#f2eee6', role: 'Fond' },
    { name: 'Métal', hex: '#d4d8de', role: 'Fermoir' },
  ],
  typography: typo('Anton', FONT.condensed, 400, 'Condensée, comme imprimée sur une sangle.'),
  defaults: { accent: '#d7261e', background: 'paper', titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(braceletStyle),
  Poster: BraceletPoster,
};

export const reflet: ConceptDef = {
  id: 'reflet',
  index: '23',
  name: 'Reflet',
  short: 'Même lieu, deux fois',
  description: 'Le lieu dessiné au trait le jour, et son reflet inversé la nuit, troublé comme dans l’eau : la phrase de la marque devenue image.',
  rationale: [
    '« Même lieu. Mêmes gens. Une autre expérience. » — en une image : la façade (arches, palmiers, guirlandes) en haut, de jour ; en bas, son reflet de nuit, lumières allumées, ondulé par l’eau.',
    'Le titre se pose exactement sur la ligne de flottaison, entre les deux mondes.',
    'Le dessin est générique (aucun lieu réel reproduit) et peut être redessiné d’après le vrai lieu de chaque édition.',
  ],
  base: BASE,
  palette: [
    { name: 'Jour', hex: '#f8ecd9', role: 'Haut' },
    { name: 'Nuit', hex: '#0d0a14', role: 'Bas' },
    { name: 'Guirlandes', hex: '#ffd27a', role: 'Lumières' },
  ],
  typography: typo('Cormorant Garamond', FONT.serif, 600, 'Capitales sérif espacées sur la ligne d’horizon.'),
  defaults: { accent: '#c46a2a', background: 'paper', titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(refletStyle),
  Poster: RefletPoster,
};
