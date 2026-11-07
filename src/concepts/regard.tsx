/**
 * Série spéciale 29–34 — « Énigmes ». Puzzles and optical tricks: the same
 * things, seen differently, become something else (same place, same people,
 * another experience). 30–34 share one dark, minimal print — black, bone, one
 * signal red. Each has a still cut and an animated cut (SMIL).
 */
import { useMemo, type FC, type ReactNode } from 'react';
import { lines, splitBrand } from '../data/content';
import type { Colors, ConceptDef, CreativeSettings, EventContent, LogoProps, PosterProps, Tone } from '../data/types';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { Q_BOX, Q_POINTS } from '../lib/generators';
import { fitMeasured, measure } from '../lib/measure';
import type { Pt } from '../lib/pathSample';
import { f1, rng } from '../lib/rng';
import { Anim, f3 } from './matiere';
import { mix } from './scene';

/* ======================================================================= */
/* shared helpers                                                          */
/* ======================================================================= */

const pathOf = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
const QHOOK = Q_POINTS.filter(([, y]) => y < 90);
const QDOT: Pt = [28, 97];
/** "?" skeleton mapped to a glyph of height h centred on (cx, cy). */
const qMap = (cx: number, cy: number, h: number) => (p: Pt): Pt => [cx + (p[0] - Q_BOX.w / 2) * (h / Q_BOX.h), cy + (p[1] - Q_BOX.h / 2) * (h / Q_BOX.h)];
const names = (c: EventContent) => c.lineup.map((a) => a.name.toUpperCase()).filter(Boolean);

/** Discrete on/off visibility over a loop: `spans` are [start, end) in seconds. */
function Blink({ spans, dur }: { spans: [number, number][]; dur: number }) {
  const times: number[] = [0];
  const values: number[] = [spans.some(([a]) => a <= 0) ? 1 : 0];
  for (const [a, b] of spans) {
    if (a > times[times.length - 1] + 1e-4) {
      times.push(a);
      values.push(1);
    } else values[values.length - 1] = 1;
    if (b < dur - 1e-4) {
      times.push(b);
      values.push(0);
    }
  }
  return <animate attributeName="opacity" values={values.join(';')} keyTimes={times.map((t) => f3(t / dur)).join(';')} calcMode="discrete" dur={`${dur}s`} repeatCount="indefinite" />;
}


export interface WordStyle {
  css: string;
  family: string;
  weight: number;
  italic?: boolean;
  lower?: boolean;
  tracking: number;
}

function wordRows(st: WordStyle, brand: string, layout: 'stacked' | 'line', size = 140) {
  const { words, question, base } = splitBrand(brand);
  const tx = (s: string) => (st.lower ? s.toLowerCase() : s.toUpperCase());
  const q = question ? ' ?' : '';
  const rows = layout !== 'line' && words.length > 1 ? [tx(words[0]), tx(words.slice(1).join(' ')) + q] : [tx(base) + q];
  const font = { family: st.family, size, weight: st.weight, italic: st.italic, tracking: size * st.tracking };
  return { rows, size, w: Math.max(...rows.map((r) => measure(r, font))) + size * 0.3, h: rows.length * size * 1.02 + size * 0.3 };
}

function Word({ st, brand, layout, tone, x, y, width, height, anchor = 'middle' }: { st: WordStyle; brand: string; layout: 'stacked' | 'line'; tone: Tone; x?: number; y?: number; width?: number; height?: number; anchor?: 'start' | 'middle' }) {
  const d = wordRows(st, brand, layout);
  const tx = anchor === 'middle' ? d.w / 2 : d.size * 0.05;
  return (
    <svg viewBox={`0 0 ${f1(d.w)} ${f1(d.h)}`} x={x} y={y} width={width ?? d.w} height={height ?? d.h} overflow="visible">
      {d.rows.map((r, i) => (
        <text key={i} x={tx} y={d.size * 0.92 + i * d.size * 1.02} textAnchor={anchor} fontFamily={st.css} fontWeight={st.weight} fontStyle={st.italic ? 'italic' : undefined} fontSize={d.size} letterSpacing={d.size * st.tracking} fill={tone.fg}>
          {r.replace(/ \?$/, '')}
          {/ \?$/.test(r) && <tspan fill={tone.accent}> ?</tspan>}
        </text>
      ))}
    </svg>
  );
}

/** Brand block honouring the title-layout and logo-size controls, fitted into a box. */
export function Brand({ st, content, settings, tone, x, y, maxW, maxH, anchor = 'middle' }: { st: WordStyle; content: EventContent; settings: CreativeSettings; tone: Tone; x: number; y: number; maxW: number; maxH: number; anchor?: 'start' | 'middle' }) {
  const lay = settings.titleLayout === 'stacked' ? 'stacked' : 'line';
  const brand = settings.titleLayout === 'symbol' ? '?' : content.brand;
  const d = wordRows(st, brand, lay);
  const k = Math.min(maxW / d.w, maxH / d.h) * settings.logoScale;
  return <Word st={st} brand={brand} layout={lay} tone={tone} x={anchor === 'middle' ? x - (d.w * k) / 2 : x} y={y} width={d.w * k} height={d.h * k} anchor={anchor} />;
}

export function makeLogo(st: WordStyle, Symbol: FC<{ tone: Tone }>): FC<LogoProps> {
  return function RegardLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
    if (variant === 'symbol') {
      return (
        <svg viewBox="0 0 300 300" x={x} y={y} width={width ?? 300} height={height ?? 300}>
          <Symbol tone={tone} />
        </svg>
      );
    }
    return <Word st={st} brand={brand} layout={variant === 'secondary' ? 'line' : layout} tone={tone} x={x} y={y} width={width} height={height} />;
  };
}

/** Light or dark scheme from the background control; `night` is the concept's own dark ground. */
function scheme(colors: Colors, night: string) {
  if (colors.background === 'paper') return { bg: colors.paper, fg: colors.ink, dim: mix(colors.ink, colors.paper, 0.45) };
  if (colors.background === 'accent') return { bg: mix(colors.bg, '#000000', 0.25), fg: '#ffffff', dim: 'rgba(255,255,255,0.65)' };
  return { bg: night, fg: colors.paper, dim: mix(colors.paper, night, 0.4) };
}

export const Mono = ({ x, y, size, fill, anchor = 'start', children, opacity, spacing = 0.12 }: { x: number; y: number; size: number; fill: string; anchor?: 'start' | 'middle' | 'end'; children: ReactNode; opacity?: number; spacing?: number }) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={FONT.mono} fontWeight={500} fontSize={size} letterSpacing={size * spacing} fill={fill} opacity={opacity}>
    {children}
  </text>
);

/* ======================================================================= */
/* 29 — ANAMORPHOSE : fragments in a room that line up into the "?"        */
/* ======================================================================= */

const F = 1500; // camera distance
const ANA_ANGLES = [0, 0.32, 0.78, 0.32, 0, -0.32, -0.78, -0.32];

interface Shard {
  pts: Pt[]; // as seen from the right spot (screen space)
  z: number;
  w: number;
  accent?: boolean;
  decoy?: boolean;
}

function shards(cx: number, cy: number, h: number): Shard[] {
  const r = rng(29);
  const map = qMap(cx, cy, h);
  const hook = QHOOK.map(map);
  const out: Shard[] = [];
  for (let i = 0; i < hook.length - 2; i += 6) {
    out.push({ pts: hook.slice(i, Math.min(hook.length, i + 6)), z: (r() * 2 - 1) * 520, w: 64 });
  }
  const [dx, dy] = map(QDOT);
  out.push({ pts: [[dx, dy - 90], [dx, dy - 30]], z: -160, w: 60, accent: true });
  for (let i = 0; i < 16; i++) {
    const x = 120 + r() * 760;
    const y = 220 + r() * 820;
    const a = r() * Math.PI;
    const l = 20 + r() * 60;
    out.push({ pts: [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], z: (r() * 2 - 1) * 700, w: 6 + r() * 10, decoy: true });
  }
  return out;
}

/** Where a shard lands when the camera orbits by θ around the vertical axis through (cx, ·, 0). */
function project(s: Shard, cx: number, cy: number, th: number) {
  const k = (F + s.z) / F; // place the shard on the ray it occupies when θ = 0
  const c = Math.cos(th);
  const sn = Math.sin(th);
  let depth = 0;
  const pts = s.pts.map(([x, y]): Pt => {
    const X = (x - cx) * k;
    const Y = (y - cy) * k;
    const Xr = X * c + s.z * sn;
    const Zr = -X * sn + s.z * c;
    depth = Zr;
    const p = F / (F + Zr);
    return [cx + Xr * p, cy + Y * p];
  });
  return { d: pathOf(pts), w: s.w * (F / (F + depth)) };
}

function AnamorphoseScene({ fg, accent, dim, on, labels }: { fg: string; accent: string; dim: string; on: boolean; labels: boolean }) {
  const cx = 500;
  const cy = 660;
  const data = useMemo(() => {
    const list = shards(cx, cy, 700);
    return list.map((s) => {
      const frames = ANA_ANGLES.map((a) => project(s, cx, cy, a));
      return { s, ds: frames.map((f) => f.d), ws: frames.map((f) => f1(f.w)) };
    });
  }, []);
  const dur = 16;
  const vx = ANA_ANGLES.map((a) => f1(cx - Math.sin(a) * 1100));
  const floor = Array.from({ length: 13 }, (_, k) => cy + 880 / (k * 0.55 + 1));
  return (
    <g>
      <g stroke={dim} strokeWidth={1.2} opacity={0.55}>
        {floor.map((y, i) => (
          <line key={i} x1={0} x2={1000} y1={f1(y)} y2={f1(y)} />
        ))}
        {Array.from({ length: 17 }, (_, i) => -1500 + i * 250).map((bx) => (
          <line key={bx} x1={vx[0]} y1={cy} x2={bx + 500} y2={1500}>
            <Anim attr="x1" values={vx} dur={dur} on={on} />
          </line>
        ))}
      </g>
      <g fill="none" strokeLinecap="butt">
        {data.map(({ s, ds, ws }, i) => (
          <path key={i} d={ds[0]} stroke={s.accent ? accent : fg} strokeWidth={ws[0]} opacity={s.decoy ? 0.45 : 1}>
            <Anim attr="d" values={ds} dur={dur} on={on} />
            <Anim attr="stroke-width" values={ws} dur={dur} on={on} />
          </path>
        ))}
      </g>
      {labels &&
        data
          .filter(({ s }) => !s.decoy)
          .filter((_, i) => i % 4 === 1)
          .map(({ s }, i) => {
            const [x, y] = s.pts[0];
            const right = x > cx;
            const lx = right ? x + 70 : x - 70;
            return (
              <g key={i}>
                <line x1={x} y1={y} x2={lx} y2={y - 30} stroke={accent} strokeWidth={1.2} />
                <Mono x={lx + (right ? 6 : -6)} y={y - 34} size={14} fill={accent} anchor={right ? 'start' : 'end'}>
                  z {s.z >= 0 ? '+' : '−'}
                  {Math.abs(Math.round(s.z))}
                </Mono>
              </g>
            );
          })}
    </g>
  );
}

const anaStyle: WordStyle = { css: FONT.sans, family: "'General Sans'", weight: 600, tracking: -0.04 };

function AnamorphosePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const c = scheme(colors, '#101014');
  const M = 64;
  const tone = { fg: c.fg, accent: settings.accent };
  const colY = H - (sq ? 150 : 210);
  const col = (sq ? W - M * 2 : W - M * 2) / 3;
  const label = (x: number, t: string) => (
    <Mono x={x} y={colY} size={sq ? 12 : 14} fill={c.dim}>
      {t}
    </Mono>
  );
  const val = (x: number, y: number, t: string, size: number) => (
    <text x={x} y={y} fontFamily={FONT.sans} fontWeight={600} fontSize={fitMeasured(t, col - 24, { family: "'General Sans'", size, weight: 600 })} fill={c.fg}>
      {t}
    </text>
  );
  return (
    <Artboard format={format} colors={{ ...colors, bg: c.bg }} texture={settings.texture} label={`${content.brand} — anamorphose`}>
      <g transform={sq ? 'translate(170 -60) scale(0.66)' : undefined}>
        <AnamorphoseScene fg={c.fg} accent={settings.accent} dim={c.dim} on={animated} labels={!animated} />
      </g>
      <Brand st={anaStyle} content={content} settings={settings} tone={tone} x={M - 6} y={sq ? 40 : 52} maxW={sq ? 600 : 870} maxH={sq ? 90 : 130} anchor="start" />
      <Mono x={M} y={sq ? 160 : 222} size={sq ? 12 : 15} fill={c.fg}>
        ANAMORPHOSE N°{content.editionNumber} — LE SIGNE N’APPARAÎT QUE D’ICI
      </Mono>
      <g>
        <ellipse cx={W / 2} cy={sq ? 770 : 1160} rx={86} ry={18} fill="none" stroke={settings.accent} strokeWidth={2} />
        <line x1={W / 2 - 20} x2={W / 2 + 20} y1={sq ? 770 : 1160} y2={sq ? 770 : 1160} stroke={settings.accent} strokeWidth={2} />
        <Mono x={W / 2} y={sq ? 812 : 1206} size={sq ? 12 : 14} fill={settings.accent} anchor="middle">
          ◎ VOUS ÊTES ICI
        </Mono>
      </g>
      <line x1={M} x2={W - M} y1={colY - (sq ? 26 : 34)} y2={colY - (sq ? 26 : 34)} stroke={c.fg} strokeWidth={1.5} />
      {label(M, 'DATE')}
      {label(M + col, 'LIEU')}
      {label(M + col * 2, content.lineupTitle)}
      {val(M, colY + (sq ? 40 : 50), content.date, sq ? 28 : 34)}
      {val(M, colY + (sq ? 72 : 92), content.edition, sq ? 18 : 22)}
      {val(M + col, colY + (sq ? 40 : 50), content.venue, sq ? 28 : 34)}
      {val(M + col, colY + (sq ? 72 : 92), content.pillars, sq ? 14 : 16)}
      {names(content).map((n, i) => val(M + col * 2, colY + (sq ? 40 : 50) + i * (sq ? 30 : 38), n, sq ? 24 : 30))}
    </Artboard>
  );
}


/* ======================================================================= */
/* 30–34 — the dark puzzles: black, bone white, one signal red             */
/* ======================================================================= */

const NIGHT = '#0a0a0a';
const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

/** Tiny corner furniture shared by the dark puzzles: index top-left, date/venue top-right. */
function Corners({ content, fg, dim, label, W, sq }: { content: EventContent; fg: string; dim: string; label: string; W: number; sq: boolean }) {
  const M = sq ? 50 : 64;
  const y = sq ? 56 : 72;
  const s = sq ? 12 : 14;
  return (
    <g>
      <Mono x={M} y={y} size={s} fill={fg}>
        {label}
      </Mono>
      <Mono x={W - M} y={y} size={s} fill={fg} anchor="end">
        {content.date}
      </Mono>
      <Mono x={W - M} y={y + s * 1.6} size={s} fill={dim} anchor="end">
        {content.venue}
      </Mono>
    </g>
  );
}

/* ---- 30 MOTS CROISÉS : the brand as a crossword ---- */

const XWORDS: { w: string; r: number; c: number; v?: boolean; n: number }[] = [
  { w: 'LIEU', r: 1, c: 5, v: true, n: 1 },
  { w: 'MEME', r: 3, c: 2, v: true, n: 2 },
  { w: 'GENS', r: 3, c: 8, v: true, n: 3 },
  { w: 'UNE', r: 4, c: 0, n: 4 },
  { w: 'AUTRE', r: 4, c: 4, n: 5 },
];

function crossCells() {
  const cells = new Map<string, { r: number; c: number; ch: string; order: number; n?: number }>();
  let order = 0;
  for (const x of XWORDS) {
    [...x.w].forEach((ch, i) => {
      const r = x.r + (x.v ? i : 0);
      const c = x.c + (x.v ? 0 : i);
      const k = `${r},${c}`;
      const cur = cells.get(k);
      if (!cur) cells.set(k, { r, c, ch, order: order++, n: i === 0 ? x.n : undefined });
      else if (i === 0) cur.n = x.n;
    });
  }
  return [...cells.values()];
}

function Crossword({ x0, y0, cell, fg, bg, accent, on }: { x0: number; y0: number; cell: number; fg: string; bg: string; accent: string; on: boolean }) {
  const cells = useMemo(crossCells, []);
  const dur = 12;
  const at = (r: number, c: number) => [x0 + c * cell, y0 + (r - 1) * cell] as const;
  const [bx, by] = at(4, 3);
  const [qx, qy] = at(4, 9);
  return (
    <g>
      {cells.map((k) => {
        const [x, y] = at(k.r, k.c);
        return (
          <g key={`${k.r},${k.c}`}>
            <rect x={x} y={y} width={cell} height={cell} fill="none" stroke={fg} strokeWidth={1.6} />
            {k.n && (
              <text x={x + 6} y={y + 17} fontFamily={FONT.mono} fontSize={cell * 0.17} fill={fg} opacity={0.7}>
                {k.n}
              </text>
            )}
            <text x={x + cell / 2} y={y + cell * 0.7} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={cell * 0.56} fill={fg}>
              {k.ch}
              {on && <Blink spans={[[0.8 + k.order * 0.32, dur - 1]]} dur={dur} />}
            </text>
          </g>
        );
      })}
      <rect x={bx} y={by} width={cell} height={cell} fill={fg} />
      <rect x={qx} y={qy} width={cell} height={cell} fill={accent}>
        {on && <animate attributeName="opacity" values="1;0.15;1" dur="1.1s" repeatCount="indefinite" />}
      </rect>
      <text x={qx + cell / 2} y={qy + cell * 0.72} textAnchor="middle" fontFamily={FONT.sans} fontWeight={700} fontSize={cell * 0.62} fill={bg}>
        ?
      </text>
    </g>
  );
}

const crossStyle: WordStyle = { css: FONT.sans, family: "'General Sans'", weight: 600, tracking: -0.02 };

function MotsCroisesPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const c = scheme(colors, NIGHT);
  const M = sq ? 50 : 64;
  const cell = sq ? 66 : 88;
  const gx = (W - cell * 10) / 2;
  const gy = sq ? 150 : 300;
  const clueY = gy + cell * 6 + (sq ? 60 : 110);
  const cs = sq ? 13 : 18;
  const clue = (x: number, y: number, t: string, head?: boolean) => (
    <Mono x={x} y={y} size={cs} fill={head ? c.fg : c.dim} spacing={head ? 0.14 : 0.02}>
      {t}
    </Mono>
  );
  const ns = names(content);
  const solY = sq ? clueY : clueY + cs * 9;
  return (
    <Artboard format={format} colors={{ ...colors, bg: c.bg }} texture={settings.texture} label={`${content.brand} — mots croisés`}>
      <Corners content={content} fg={c.fg} dim={c.dim} label={`GRILLE N°${content.editionNumber}`} W={W} sq={sq} />
      <Crossword x0={gx} y0={gy} cell={cell} fg={c.fg} bg={c.bg} accent={settings.accent} on={animated} />
      {!sq && (
        <g>
          {clue(M, clueY, 'HORIZONTALEMENT', true)}
          {clue(M, clueY + cs * 1.9, '4. Pas encore la même. (3)')}
          {clue(M, clueY + cs * 3.4, '5. Ce que vous allez vivre. (5)')}
          {clue(W / 2 + 10, clueY, 'VERTICALEMENT', true)}
          {clue(W / 2 + 10, clueY + cs * 1.9, '1. Ici, comme toujours. (4)')}
          {clue(W / 2 + 10, clueY + cs * 3.4, '2. Identique, au pluriel près. (4)')}
          {clue(W / 2 + 10, clueY + cs * 4.9, '3. Vous, nous, eux. (4)')}
        </g>
      )}
      <line x1={M} x2={W - M} y1={solY - (sq ? 10 : 30)} y2={solY - (sq ? 10 : 30)} stroke={c.fg} strokeWidth={1} opacity={0.4} />
      {clue(M, solY + cs * 1.2, `SOLUTION · ${content.lineupTitle}`, true)}
      <g fontFamily={FONT.sans} fontWeight={600} fill={c.fg}>
        {ns.map((n, i) => (
          <text key={i} x={M} y={solY + cs * 1.2 + (sq ? 42 : 56) * (i + 1)} fontSize={fitMeasured(n, W - M * 2, { family: "'General Sans'", size: sq ? 34 : 46, weight: 600 })} letterSpacing={-1}>
            {n}
          </text>
        ))}
      </g>
      <Brand st={crossStyle} content={content} settings={settings} tone={{ fg: c.fg, accent: settings.accent }} x={M - 4} y={H - (sq ? 76 : 104)} maxW={360} maxH={sq ? 44 : 56} anchor="start" />
      <Mono x={W - M} y={H - (sq ? 44 : 62)} size={sq ? 11 : 13} fill={c.dim} anchor="end">
        {content.edition}
      </Mono>
    </Artboard>
  );
}

/* ---- 31 MOTS MÊLÉS : the names hidden in a field of letters ---- */

const SEARCH = { cols: 15, rows: 19 };
const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
];

function wordSearch(brand: string, list: string[]) {
  const r = rng(31);
  const grid: string[][] = Array.from({ length: SEARCH.rows }, () => Array(SEARCH.cols).fill(''));
  const found: { w: string; r0: number; c0: number; dr: number; dc: number; brand?: boolean }[] = [];
  const fits = (w: string, r0: number, c0: number, dr: number, dc: number) =>
    [...w].every((ch, i) => {
      const rr = r0 + dr * i;
      const cc = c0 + dc * i;
      return rr >= 0 && rr < SEARCH.rows && cc >= 0 && cc < SEARCH.cols && (grid[rr][cc] === '' || grid[rr][cc] === ch);
    });
  const put = (w: string, r0: number, c0: number, dr: number, dc: number, isBrand = false) => {
    [...w].forEach((ch, i) => (grid[r0 + dr * i][c0 + dc * i] = ch));
    found.push({ w, r0, c0, dr, dc, brand: isBrand });
  };
  const b = plain(brand).slice(0, SEARCH.cols);
  put(b, 9, Math.floor((SEARCH.cols - b.length) / 2), 0, 1, true);
  for (const w0 of list) {
    const w = plain(w0).slice(0, SEARCH.cols);
    if (w.length < 2) continue;
    for (let t = 0; t < 600; t++) {
      const [dr, dc] = DIRS[Math.floor(r() * DIRS.length)];
      const r0 = Math.floor(r() * SEARCH.rows);
      const c0 = Math.floor(r() * SEARCH.cols);
      if (fits(w, r0, c0, dr, dc)) {
        put(w, r0, c0, dr, dc);
        break;
      }
    }
  }
  const pool = 'AAEEEIINNORSSTTULMDGPBCKVYH';
  for (const row of grid) for (let i = 0; i < row.length; i++) if (!row[i]) row[i] = pool[Math.floor(r() * pool.length)];
  return { grid, found };
}

function WordSearch({ content, x0, y0, cell, fg, dim, accent, on }: { content: EventContent; x0: number; y0: number; cell: number; fg: string; dim: string; accent: string; on: boolean }) {
  const ns = names(content);
  const sig = lines(content.signature).slice(0, 2);
  const { grid, found } = useMemo(() => wordSearch(content.brand, [...ns, ...sig]), [content.brand, ns.join('|'), sig.join('|')]);
  const dur = 14;
  const lit = new Map<string, number>();
  found.forEach((f, k) => [...f.w].forEach((_, i) => {
    const key = `${f.r0 + f.dr * i},${f.c0 + f.dc * i}`;
    if (!lit.has(key)) lit.set(key, k);
  }));
  const t = (k: number) => 1 + k * 1.6;
  const cx = (c: number) => x0 + c * cell + cell / 2;
  const cy = (r: number) => y0 + r * cell + cell / 2;
  return (
    <g>
      {found.map((f, k) => {
        const x1 = cx(f.c0);
        const y1 = cy(f.r0);
        const x2 = cx(f.c0 + f.dc * (f.w.length - 1));
        const y2 = cy(f.r0 + f.dr * (f.w.length - 1));
        return (
          <g key={k} fill="none" strokeLinecap="round">
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={f.brand ? accent : fg} strokeWidth={cell * 0.86} />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={NIGHT} strokeWidth={cell * 0.86 - 3} />
            {on && <Blink spans={[[t(k), dur - 0.6]]} dur={dur} />}
          </g>
        );
      })}
      <g fontFamily={FONT.mono} fontWeight={500} fontSize={cell * 0.5} textAnchor="middle">
        {grid.map((row, r) =>
          row.map((ch, c) => {
            const k = lit.get(`${r},${c}`);
            const hit = k !== undefined;
            return (
              <g key={`${r},${c}`}>
                <text x={cx(c)} y={cy(r) + cell * 0.18} fill={dim}>
                  {ch}
                </text>
                {hit && (
                  <text x={cx(c)} y={cy(r) + cell * 0.18} fill={found[k].brand ? accent : fg} stroke={NIGHT} strokeWidth={4} style={{ paintOrder: 'stroke' }}>
                    {ch}
                    {on && <Blink spans={[[t(k), dur - 0.6]]} dur={dur} />}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </g>
    </g>
  );
}

function MotsMelesPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const c = scheme(colors, NIGHT);
  const M = sq ? 50 : 64;
  const cell = sq ? 40 : 54;
  const gx = (W - cell * SEARCH.cols) / 2;
  const gy = sq ? 110 : 150;
  const listY = gy + cell * SEARCH.rows + (sq ? 50 : 70);
  const ns = names(content);
  return (
    <Artboard format={format} colors={{ ...colors, bg: c.bg }} texture={settings.texture} label={`${content.brand} — mots mêlés`}>
      <Corners content={content} fg={c.fg} dim={c.dim} label={`MOTS MÊLÉS N°${content.editionNumber}`} W={W} sq={sq} />
      <WordSearch content={content} x0={gx} y0={gy} cell={cell} fg={c.fg} dim={mix(c.fg, c.bg, 0.78)} accent={settings.accent} on={animated} />
      {!sq && (
        <g>
          <Mono x={M} y={listY} size={14} fill={c.fg}>
            À TROUVER
          </Mono>
          <text x={M} y={listY + 46} fontFamily={FONT.sans} fontWeight={600} fontSize={fitMeasured(ns.join(' · '), W - M * 2, { family: "'General Sans'", size: 36, weight: 600 })} fill={c.fg}>
            {ns.join(' · ')}
          </text>
        </g>
      )}
      <Mono x={M} y={H - (sq ? 40 : 60)} size={sq ? 12 : 14} fill={settings.accent}>
        {content.brand}
      </Mono>
      <Mono x={W - M} y={H - (sq ? 40 : 60)} size={sq ? 11 : 13} fill={c.dim} anchor="end">
        {content.edition}
      </Mono>
    </Artboard>
  );
}

/* ---- 32 PHRASE À TROUS : the signature with its key word missing ---- */

function PhrasePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const c = scheme(colors, NIGHT);
  const M = sq ? 56 : 70;
  const key = (splitBrand(content.brand).words.slice(-1)[0] ?? 'AUTRE').toUpperCase();
  const sig = lines(content.signature).map((l) => l.toUpperCase());
  const rows = sig.length ? sig : ['MÊME LIEU', 'MÊMES GENS', `UNE ${key} EXPÉRIENCE`];
  // split the line holding the key word so it can be left blank
  const parts = rows.map((l) => {
    const i = l.indexOf(key);
    return i < 0 ? { pre: l, post: '', hole: false } : { pre: l.slice(0, i), post: l.slice(i + key.length), hole: true };
  });
  if (!parts.some((p) => p.hole)) parts.push({ pre: 'UNE ', post: '', hole: true });
  const flat = parts.flatMap((p) => (p.hole ? [{ pre: p.pre.trimEnd(), post: '', hole: true }, ...(p.post.trim() ? [{ pre: p.post.trim(), post: '', hole: false }] : [])] : [p]));
  const font = { family: "'General Sans'", weight: 700, size: sq ? 120 : 150 };
  const size = Math.min(...flat.map((p) => fitMeasured(p.pre + (p.hole ? ` ${key} ?` : ''), W - M * 2, { ...font, tracking: -font.size * 0.04 })));
  const lh = size * 0.96;
  const y0 = (sq ? 470 : 760) - ((flat.length - 1) * lh) / 2;
  const dur = 9;
  const typed = key + ' ?';
  const wOf = (s: string) => measure(s, { family: "'General Sans'", size, weight: 700, tracking: -size * 0.04 });
  const ns = names(content);
  return (
    <Artboard format={format} colors={{ ...colors, bg: c.bg }} texture={settings.texture} label={`${content.brand} — phrase à trous`}>
      <Corners content={content} fg={c.fg} dim={c.dim} label={`À COMPLÉTER · N°${content.editionNumber}`} W={W} sq={sq} />
      <g fontFamily={FONT.sans} fontWeight={700} fontSize={size} letterSpacing={-size * 0.04} fill={c.fg}>
        {flat.map((p, i) => {
          const y = y0 + i * lh;
          if (!p.hole) return <text key={i} x={M} y={y}>{p.pre}</text>;
          const hx = M + (p.pre ? wOf(p.pre + ' ') : 0);
          const bw = Math.min(W - M - hx, wOf(typed));
          const steps = [...typed].map((_, k) => hx + wOf(typed.slice(0, k + 1)));
          const t0 = 1.6;
          const tEnd = dur - 1.4;
          return (
            <g key={i}>
              {p.pre && <text x={M} y={y}>{p.pre}</text>}
              <rect x={hx} y={y + size * 0.08} width={bw} height={Math.max(6, size * 0.06)} fill={settings.accent} />
              {animated &&
                [...typed].map((ch, k) => (
                  <text key={k} x={hx + wOf(typed.slice(0, k))} y={y} fill={settings.accent} opacity={0}>
                    {ch}
                    <Blink spans={[[t0 + k * 0.22, tEnd - (typed.length - k) * 0.07]]} dur={dur} />
                  </text>
                ))}
              <rect x={hx + 4} y={y - size * 0.72} width={Math.max(5, size * 0.05)} height={size * 0.78} fill={settings.accent}>
                {animated && (
                  <>
                    <animate
                      attributeName="x"
                      values={[hx + 4, ...steps.map((s) => s + 6), hx + 4].map(f1).join(';')}
                      keyTimes={[0, ...steps.map((_, k) => (t0 + k * 0.22) / dur), (tEnd + 0.2) / dur].map(f3).join(';')}
                      calcMode="discrete"
                      dur={`${dur}s`}
                      repeatCount="indefinite"
                    />
                    <animate attributeName="opacity" values="1;0;1" dur="0.9s" calcMode="discrete" keyTimes="0;0.5;1" repeatCount="indefinite" />
                  </>
                )}
              </rect>
            </g>
          );
        })}
      </g>
      <g>
        <Mono x={M} y={H - (sq ? 150 : 230)} size={sq ? 12 : 14} fill={c.dim}>
          {content.lineupTitle}
        </Mono>
        {ns.map((n, i) => (
          <Mono key={i} x={M} y={H - (sq ? 120 : 194) + i * (sq ? 24 : 32)} size={sq ? 16 : 22} fill={c.fg} spacing={0.06}>
            {n}
          </Mono>
        ))}
        <Mono x={W - M} y={H - (sq ? 48 : 70)} size={sq ? 12 : 14} fill={settings.accent} anchor="end">
          {content.brand}
        </Mono>
      </g>
    </Artboard>
  );
}

/* ---- 33 LE POINT : only the dot of the "?" — the hook is barely there ---- */

function PointPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const c = scheme(colors, NIGHT);
  const h = sq ? 680 : 1000;
  const map = qMap(W / 2, sq ? 470 : 700, h);
  const hook = useMemo(() => pathOf(QHOOK.map(map)), [h, sq]);
  const [dx, dy] = map(QDOT);
  const r = sq ? 22 : 30;
  const ns = names(content);
  return (
    <Artboard format={format} colors={{ ...colors, bg: c.bg }} texture={settings.texture} label={`${content.brand} — le point`}>
      <Corners content={content} fg={c.fg} dim={c.dim} label={`N°${content.editionNumber}`} W={W} sq={sq} />
      <path d={hook} fill="none" stroke={c.fg} strokeWidth={1.2} opacity={0.22} pathLength={1} strokeDasharray="1 1" strokeDashoffset={0} strokeLinecap="round">
        <Anim attr="stroke-dashoffset" values={[0, 0, 1, 1]} dur={14} on={animated} />
      </path>
      <circle cx={dx} cy={dy} r={r} fill={settings.accent}>
        {animated && <animate attributeName="r" values={`${r};${r * 1.22};${r}`} keyTimes="0;0.18;1" keySplines="0.2 0 0.4 1;0.3 0 0.6 1" calcMode="spline" dur="0.484s" repeatCount="indefinite" />}
      </circle>
      <Mono x={W / 2} y={dy + r + (sq ? 50 : 70)} size={sq ? 14 : 16} fill={c.fg} anchor="middle" spacing={0.4}>
        {content.brand}
      </Mono>
      <Mono x={W / 2} y={H - (sq ? 44 : 64)} size={sq ? 11 : 13} fill={c.dim} anchor="middle" spacing={0.16}>
        {ns.join('  /  ')}
      </Mono>
    </Artboard>
  );
}

/* ---- 34 CENSURÉ : a classified memo where only the essentials survive ---- */

interface Tok {
  t: string;
  show?: boolean;
  accent?: boolean;
}

function memo(content: EventContent): Tok[] {
  const w = (s: string): Tok[] => s.split(' ').map((t) => ({ t }));
  const sig = lines(content.signature);
  return [
    ...w('CE SOIR,'),
    ...sig.slice(0, 2).flatMap((l) => w(l.toUpperCase() + '.')),
    ...w('MAIS RIEN NE SERA PAREIL. LE LINE-UP EST'),
    ...names(content).map((n, i, a) => ({ t: n + (i < a.length - 1 ? ',' : '.'), show: true })),
    ...w('RENDEZ-VOUS LE'),
    { t: content.date.toUpperCase(), show: true },
    { t: 'À' },
    { t: content.venue.toUpperCase() + '.', show: true },
    ...w('LES DÉTAILS SONT CONFIDENTIELS. CE QUI SE PASSE ICI RESTE ICI. LA SEULE QUESTION :'),
    { t: content.brand.toUpperCase(), show: true, accent: true },
  ];
}

function CensurePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const c = scheme(colors, NIGHT);
  const M = sq ? 56 : 70;
  const size = sq ? 30 : 44;
  const lh = size * (sq ? 1.7 : 1.95);
  const font = { family: "'IBM Plex Mono'", size, weight: 500 };
  const space = measure(' ', font);
  const placed = useMemo(() => {
    let x = M;
    let y = sq ? 200 : 330;
    return memo(content).map((tok) => {
      const w = measure(tok.t, font);
      if (x + w > W - M && x > M) {
        x = M;
        y += lh;
      }
      const p = { ...tok, x, y, w };
      x += w + space * 1.6;
      return p;
    });
  }, [content, sq]);
  const dur = 10;
  const last = placed[placed.length - 1];
  return (
    <Artboard format={format} colors={{ ...colors, bg: c.bg }} texture={settings.texture} label={`${content.brand} — censuré`}>
      <Mono x={M} y={sq ? 70 : 96} size={sq ? 12 : 14} fill={c.fg}>
        DOSSIER N°{content.editionNumber} · CLASSÉ
      </Mono>
      <Mono x={W - M} y={sq ? 70 : 96} size={sq ? 12 : 14} fill={settings.accent} anchor="end">
        CONFIDENTIEL
      </Mono>
      <line x1={M} x2={W - M} y1={sq ? 92 : 124} y2={sq ? 92 : 124} stroke={c.fg} strokeWidth={1} opacity={0.4} />
      <g fontFamily={FONT.mono} fontWeight={500} fontSize={size}>
        {placed.map((p, i) => {
          const bar = !p.show;
          const k = i % 3 === 1;
          const ws = [p.w + 8, p.w + 8, 0, 0];
          const rot = i % 4;
          const vals = [...ws.slice(rot), ...ws.slice(0, rot)];
          return (
            <g key={i}>
              <text x={p.x} y={p.y} fill={p.accent ? settings.accent : c.fg}>
                {p.t}
              </text>
              {bar && (
                <rect x={p.x - 4} y={p.y - size * 1.02} width={p.w + 8} height={size * 1.28} fill={c.fg}>
                  {k && <Anim attr="width" values={vals.map(f1)} dur={dur + (i % 5)} on={animated} />}
                </rect>
              )}
            </g>
          );
        })}
      </g>
      <line x1={M} x2={W - M} y1={last.y + lh} y2={last.y + lh} stroke={c.fg} strokeWidth={1} opacity={0.4} />
      <Mono x={M} y={H - (sq ? 44 : 64)} size={sq ? 11 : 13} fill={c.dim}>
        {content.pillars}
      </Mono>
      <Mono x={W - M} y={H - (sq ? 44 : 64)} size={sq ? 11 : 13} fill={c.dim} anchor="end">
        {content.edition}
      </Mono>
    </Artboard>
  );
}

/* ======================================================================= */
/* symbols + definitions                                                   */
/* ======================================================================= */

const AnaSymbol: FC<{ tone: Tone }> = ({ tone }) => (
  <g transform="translate(150 150) scale(0.3) translate(-500 -620)">
    <AnamorphoseScene fg={tone.fg} accent={tone.accent} dim="transparent" on={false} labels={false} />
  </g>
);
const CrossSymbol: FC<{ tone: Tone }> = ({ tone }) => (
  <g transform="translate(150 150) scale(0.36) translate(-400 -260)">
    <Crossword x0={0} y0={0} cell={80} fg={tone.fg} bg={NIGHT} accent={tone.accent} on={false} />
  </g>
);
const SearchSymbol: FC<{ tone: Tone }> = ({ tone }) => (
  <g>
    <line x1={60} y1={150} x2={240} y2={150} stroke={tone.accent} strokeWidth={64} strokeLinecap="round" />
    <line x1={60} y1={150} x2={240} y2={150} stroke={NIGHT} strokeWidth={58} strokeLinecap="round" />
    <text x={150} y={164} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={40} letterSpacing={6} fill={tone.accent}>
      AUTRE
    </text>
  </g>
);
const BlankSymbol: FC<{ tone: Tone }> = ({ tone }) => (
  <g>
    <rect x={50} y={176} width={200} height={12} fill={tone.accent} />
    <rect x={56} y={86} width={10} height={86} fill={tone.accent} />
  </g>
);
const DotSymbol: FC<{ tone: Tone }> = ({ tone }) => <circle cx={150} cy={150} r={60} fill={tone.accent} />;
const BarSymbol: FC<{ tone: Tone }> = ({ tone }) => (
  <g>
    <rect x={40} y={110} width={150} height={34} fill={tone.fg} />
    <rect x={40} y={160} width={90} height={34} fill={tone.fg} />
    <text x={142} y={190} fontFamily={FONT.mono} fontWeight={500} fontSize={34} fill={tone.accent}>
      ?
    </text>
  </g>
);


const SERIES = 'regard';
const BASE = { paper: '#ece8df', ink: '#0d0d10' };
const ANIM = 'Version animée : c’est là que le tour a lieu — et le texte, lui, ne bouge jamais.';

const typo = (title: string, css: string, weight: number, note: string, info: string, infoCss: string, sample = 'UNE AUTRE ?', italic = false): ConceptDef['typography'] => [
  { role: 'Titre', family: title, css, weight, italic, sample, note },
  { role: 'Infos', family: info, css: infoCss, weight: 500, sample: '12 JUILLET 2025 · MARRACAS MARACAS', note: 'Petites capitales espacées, comme des annotations.' },
];

export const anamorphose: ConceptDef = {
  id: 'anamorphose',
  index: '29',
  series: SERIES,
  name: 'Anamorphose',
  short: 'Le « ? » n’existe que d’un seul point',
  description: 'Des fragments suspendus dans une pièce. Depuis le bon endroit, ils forment le « ? ». Animée, la caméra tourne : la question se brise en morceaux, puis se recompose.',
  rationale: [
    'L’idée de la marque en une illusion d’optique : les mêmes morceaux, le même lieu — il suffit de changer de point de vue pour voir autre chose.',
    'Chaque fragment est réellement placé en profondeur (cotes « z » annotées) ; la version animée fait tourner la caméra et le sol en perspective.',
    'Un fond clair, technique, presque architectural — l’opposé exact des affiches de club habituelles. ' + ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Béton', hex: '#ece8df', role: 'Fond' },
    { name: 'Encre', hex: '#0d0d10', role: 'Fragments, texte' },
    { name: 'Rouge repère', hex: '#e8341c', role: 'Le point, le repère' },
  ],
  typography: typo('General Sans', FONT.sans, 600, 'Grand, serré, aligné à gauche.', 'IBM Plex Mono', FONT.mono),
  defaults: { accent: '#e8341c', background: 'paper', titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(anaStyle, AnaSymbol),
  Poster: AnamorphosePoster,
};


const NOIR_BASE = { paper: '#f2f0ea', ink: '#0a0a0a' };
const NOIR_PALETTE = (accentRole: string): ConceptDef['palette'] => [
  { name: 'Noir', hex: '#0a0a0a', role: 'Fond' },
  { name: 'Os', hex: '#f2f0ea', role: 'Texte, grille' },
  { name: 'Rouge signal', hex: '#e8341c', role: accentRole },
];
const NOIR_DEFAULTS = { accent: '#e8341c', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' } as const;
const NOIR = 'Noir, os, un seul rouge : la même empreinte d’une affiche à l’autre, que l’on reconnaît sans lire.';

export const motscroises: ConceptDef = {
  id: 'motscroises',
  index: '30',
  series: SERIES,
  name: 'Mots croisés',
  short: 'La marque comme une grille',
  description: 'UNE AUTRE en horizontal, MÊME · LIEU · GENS en vertical : la signature de la marque tient dans une grille de mots croisés, avec le « ? » en case rouge. Animée, la grille se remplit lettre par lettre.',
  rationale: [
    'La phrase de la marque devient un logo : les mots se croisent exactement comme la promesse — même lieu, mêmes gens, une autre expérience.',
    'Des définitions écrites comme des énigmes (« Vous, nous, eux. (4) ») : on lit l’affiche jusqu’au bout pour jouer.',
    NOIR,
  ],
  base: NOIR_BASE,
  palette: NOIR_PALETTE('La case « ? »'),
  typography: typo('General Sans', FONT.sans, 600, 'Lettres de grille, line-up en solution.', 'IBM Plex Mono', FONT.mono),
  defaults: { ...NOIR_DEFAULTS },
  Logo: makeLogo(crossStyle, CrossSymbol),
  Poster: MotsCroisesPoster,
};

export const motsmeles: ConceptDef = {
  id: 'motsmeles',
  index: '31',
  series: SERIES,
  name: 'Mots mêlés',
  short: 'Le line-up caché dans les lettres',
  description: 'Un champ de lettres grises sur noir ; entourés, le nom de la marque (en rouge) et les artistes cachés dans tous les sens. Animée, les mots sont trouvés un par un.',
  rationale: [
    'Les mêmes lettres pour tout le monde — encore faut-il y voir les bons mots. L’affiche se regarde de près, longtemps.',
    'Texture typographique pure, aucune image : la grille fait le fond, les cercles font le signe.',
    NOIR,
  ],
  base: NOIR_BASE,
  palette: NOIR_PALETTE('La marque trouvée'),
  typography: typo('IBM Plex Mono', FONT.mono, 500, 'Grille monospace, lettres éteintes / allumées.', 'General Sans', FONT.sans),
  defaults: { ...NOIR_DEFAULTS },
  Logo: makeLogo(crossStyle, SearchSymbol),
  Poster: MotsMelesPoster,
};

export const phrase: ConceptDef = {
  id: 'phrase',
  index: '32',
  series: SERIES,
  name: 'Phrase à trous',
  short: 'UNE ____ EXPÉRIENCE.',
  description: 'La signature en très grand, il manque un mot : un trait rouge et un curseur. Animée, le mot s’écrit — AUTRE ? — puis s’efface, et recommence.',
  rationale: [
    'Le mot qui manque, c’est la marque. Le cerveau le complète tout seul : l’affiche se retient parce qu’on l’a terminée soi-même.',
    'Trois lignes de grotesque grasse, un trait rouge, rien d’autre. Le minimalisme le plus radical de la série.',
    NOIR,
  ],
  base: NOIR_BASE,
  palette: NOIR_PALETTE('Le trou, le curseur'),
  typography: typo('General Sans', FONT.sans, 700, 'Grasse, serrée, en capitales.', 'IBM Plex Mono', FONT.mono),
  defaults: { ...NOIR_DEFAULTS },
  Logo: makeLogo(crossStyle, BlankSymbol),
  Poster: PhrasePoster,
};

export const point: ConceptDef = {
  id: 'point',
  index: '33',
  series: SERIES,
  name: 'Le point',
  short: 'Il ne reste que le point',
  description: 'Une affiche noire, un point rouge, et le crochet du « ? » à peine visible en filet. Animée, le point bat à 124 BPM et le crochet se dessine puis disparaît.',
  rationale: [
    'L’empreinte la plus simple possible : un point rouge. À force, il suffit seul à signer une affiche, une story, un bracelet, un tampon.',
    'Tout le reste est minuscule et espacé — l’assurance d’une marque qu’on n’a plus besoin d’expliquer.',
    NOIR,
  ],
  base: NOIR_BASE,
  palette: NOIR_PALETTE('Le point'),
  typography: typo('IBM Plex Mono', FONT.mono, 500, 'Minuscule, très espacée.', 'IBM Plex Mono', FONT.mono),
  defaults: { ...NOIR_DEFAULTS },
  Logo: makeLogo(crossStyle, DotSymbol),
  Poster: PointPoster,
};

export const censure: ConceptDef = {
  id: 'censure',
  index: '34',
  series: SERIES,
  name: 'Censuré',
  short: 'Le mémo classé de la nuit',
  description: 'Un texte presque entièrement caviardé : seuls survivent les noms, la date, le lieu — et la question, en rouge. Animée, des barres glissent et laissent entrevoir ce qui se dit.',
  rationale: [
    '« Ce qui se passe ici reste ici » : l’affiche montre qu’on en dit peu, et c’est exactement ce qui donne envie d’y être.',
    'Les barres font un motif graphique très fort, reconnaissable de loin, qui se décline en stickers, en bandeaux, en bracelets.',
    NOIR,
  ],
  base: NOIR_BASE,
  palette: NOIR_PALETTE('La question'),
  typography: typo('IBM Plex Mono', FONT.mono, 500, 'Machine à écrire, barres pleines.', 'IBM Plex Mono', FONT.mono),
  defaults: { ...NOIR_DEFAULTS },
  Logo: makeLogo(crossStyle, BarSymbol),
  Poster: CensurePoster,
};
