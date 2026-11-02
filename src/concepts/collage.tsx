import { useMemo } from 'react';
import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { tornRect } from '../lib/generators';
import { measure } from '../lib/measure';
import { f1, hashString, rng } from '../lib/rng';

const FACES = [
  { css: FONT.condensed, fam: "'Anton'", weight: 400, italic: false },
  { css: FONT.serif, fam: "'Cormorant Garamond'", weight: 600, italic: true },
  { css: FONT.display, fam: "'Syne'", weight: 800, italic: false },
  { css: FONT.mono, fam: "'IBM Plex Mono'", weight: 500, italic: false },
  { css: FONT.sans, fam: "'General Sans'", weight: 700, italic: false },
  { css: FONT.gambetta, fam: "'Gambetta'", weight: 600, italic: true },
];
const NEWSPRINT = '#d8d1c3';

interface Scrap {
  x: number;
  w: number;
  h: number;
  rot: number;
  dy: number;
  ch: string;
  face: (typeof FACES)[number];
  size: number;
  bg: string;
  fg: string;
  edge: string;
}

/** Lays out a word as cut-out letters, each from a different "magazine". */
function ransom(text: string, size: number, seed: number, tone: Tone & { paper: string }, isQ = false): { scraps: Scrap[]; width: number } {
  const r = rng(seed);
  const combos = [
    { bg: tone.paper, fg: tone.fg },
    { bg: tone.fg, fg: tone.paper },
    { bg: tone.accent, fg: tone.paper },
    { bg: NEWSPRINT, fg: tone.fg },
    { bg: tone.paper, fg: tone.accent },
  ];
  const scraps: Scrap[] = [];
  let x = 0;
  for (const ch of [...text]) {
    if (ch === ' ') {
      x += size * 0.32;
      continue;
    }
    const q = isQ || ch === '?';
    let face = q ? FACES[0] : FACES[Math.floor(r() * FACES.length)];
    // narrow display cuts make T / I / J ambiguous — fall back to a clear grotesque
    if (!q && 'TIJ'.includes(ch) && (face.fam === "'Syne'" || face.fam === "'Anton'")) face = FACES[4];
    const sz = size * (q ? 1.3 : 0.86 + r() * 0.3);
    const tw = measure(ch, { family: face.fam, size: sz, weight: face.weight, italic: face.italic });
    const w = tw + sz * 0.26;
    const h = sz * 1.06;
    const c = q ? { bg: tone.accent, fg: tone.paper } : combos[Math.floor(r() * combos.length)];
    scraps.push({ x, w, h, rot: (r() - 0.5) * 12, dy: (r() - 0.5) * size * 0.12, ch, face, size: sz, bg: c.bg, fg: c.fg, edge: tornRect(0, 0, w, h, Math.floor(r() * 1e6), 2.2, 9) });
    x += w + size * 0.04;
  }
  return { scraps, width: x };
}

function Ransom({ scraps, x, y, lineH }: { scraps: Scrap[]; x: number; y: number; lineH: number }) {
  return (
    <g>
      {scraps.map((s, i) => (
        <g key={i} transform={`translate(${f1(x + s.x)} ${f1(y + (lineH - s.h) / 2 + s.dy)}) rotate(${f1(s.rot)} ${f1(s.w / 2)} ${f1(s.h / 2)})`}>
          <path d={s.edge} fill={s.bg} />
          <text x={s.w / 2} y={s.h * 0.8} textAnchor="middle" fontFamily={s.face.css} fontWeight={s.face.weight} fontStyle={s.face.italic ? 'italic' : undefined} fontSize={s.size} fill={s.fg}>
            {s.ch}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Embossed label-maker tape. The text is punched out so the tape works on any ground. */
function Dymo({ text, x, y, size = 30, fill, rot = 0 }: { text: string; x: number; y: number; size?: number; fill: string; rot?: number }) {
  const id = useUid('dymo');
  const tw = measure(text, { family: "'IBM Plex Mono'", size, weight: 500, tracking: size * 0.18 });
  const w = tw + size * 1.3;
  const h = size * 1.6;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${rot})`}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}>
          <rect width={w} height={h} fill="#fff" />
          <text x={size * 0.65} y={h * 0.68} fontFamily={FONT.mono} fontWeight={500} fontSize={size} letterSpacing={size * 0.18} fill="#000">
            {text}
          </text>
        </mask>
      </defs>
      <rect width={w} height={h} rx={h * 0.16} fill={fill} mask={`url(#${id})`} />
    </g>
  );
}
const fitDymo = (text: string, maxW: number, size: number) => Math.min(size, (size * maxW) / dymoWidth(text, size));
const dymoWidth = (text: string, size = 30) => measure(text, { family: "'IBM Plex Mono'", size, weight: 500, tracking: size * 0.18 }) + size * 1.3;

function Tape({ x, y, w, rot, color = '#f3eee2' }: { x: number; y: number; w: number; rot: number; color?: string }) {
  const d = useMemo(() => tornRect(0, 0, w, w * 0.32, Math.round(x * 7 + y), 1.6, 6), [w, x, y]);
  return <path d={d} transform={`translate(${f1(x)} ${f1(y)}) rotate(${rot})`} fill={color} opacity={0.55} />;
}

function CollageLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const id = useUid('cl');
  const { words, question, base } = splitBrand(brand);
  const seed = hashString(brand);
  const t = { ...tone, paper: tone.fg === tone.accent ? '#ffffff' : '#f3eee2' };

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 240 240" x={x} y={y} width={width ?? 240} height={height ?? 240}>
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240">
            <rect width="240" height="240" fill="#fff" />
            <text x="120" y="196" textAnchor="middle" fontFamily={FONT.condensed} fontSize="190" fill="#000">
              ?
            </text>
          </mask>
        </defs>
        <g transform="rotate(-5 120 120)">
          <path d={tornRect(36, 26, 168, 196, 7, 3.5, 10)} fill={tone.accent} mask={`url(#${id})`} />
          <path d={tornRect(70, 12, 100, 28, 3, 1.5, 6)} fill={tone.fg} opacity={0.35} />
        </g>
      </svg>
    );
  }

  if (variant === 'secondary') {
    const text = base.toUpperCase() + (question ? ' ?' : '');
    const w = dymoWidth(text, 40);
    return (
      <svg viewBox={`0 0 ${f1(w + 20)} 84`} x={x} y={y} width={width ?? w + 20} height={height ?? 84}>
        <Dymo text={text} x={10} y={10} size={40} fill={tone.fg} />
      </svg>
    );
  }

  const size = 110;
  const lineH = size * 1.5;
  if (layout === 'line' || words.length < 2) {
    const r = ransom(base.toUpperCase() + (question ? ' ?' : ''), size, seed, t);
    return (
      <svg viewBox={`-20 -10 ${f1(r.width + 40)} ${f1(lineH + 20)}`} x={x} y={y} width={width ?? r.width + 40} height={height ?? lineH + 20}>
        <Ransom scraps={r.scraps} x={0} y={0} lineH={lineH} />
      </svg>
    );
  }
  const a = ransom(words[0].toUpperCase(), size, seed, t);
  const b = ransom(words.slice(1).join(' ').toUpperCase() + (question ? ' ?' : ''), size, seed + 1, t);
  const W = Math.max(a.width, b.width + size * 0.5);
  return (
    <svg viewBox={`-20 -10 ${f1(W + 40)} ${f1(lineH * 2 + 10)}`} x={x} y={y} width={width ?? W + 40} height={height ?? lineH * 2 + 10}>
      <Ransom scraps={a.scraps} x={0} y={0} lineH={lineH} />
      <Ransom scraps={b.scraps} x={size * 0.5} y={lineH * 0.92} lineH={lineH} />
    </svg>
  );
}

function Stamp({ x, y, text, sub, color, rot = -8 }: { x: number; y: number; text: string; sub: string; color: string; rot?: number }) {
  const id = useUid('stamp');
  const w = 380;
  const h = 150;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} filter={`url(#${id})`} opacity={0.88}>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={3} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.2 1.6" result="holes" />
          <feComposite in="SourceGraphic" in2="holes" operator="in" />
        </filter>
      </defs>
      <rect x={0} y={0} width={w} height={h} rx={10} fill="none" stroke={color} strokeWidth={6} />
      <rect x={10} y={10} width={w - 20} height={h - 20} rx={6} fill="none" stroke={color} strokeWidth={2} />
      <text x={w / 2} y={88} textAnchor="middle" fontFamily={FONT.condensed} fontSize={64} fill={color}>
        {text}
      </text>
      <text x={w / 2} y={124} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={18} letterSpacing={5} fill={color}>
        {sub}
      </text>
    </g>
  );
}

/** Fake newspaper columns: grey lines only, no invented text. */
function Newsprint({ w, h, color }: { w: number; h: number; color: string }) {
  const d = useMemo(() => {
    const r = rng(42);
    let s = '';
    for (let c = 0; c < 5; c++) {
      const x0 = 40 + c * ((w - 80) / 5);
      const cw = (w - 80) / 5 - 24;
      for (let y = 40; y < h - 30; y += 15) {
        const lw = r() < 0.12 ? cw * (0.3 + r() * 0.5) : cw;
        s += `M${f1(x0)} ${y}h${f1(lw)}`;
      }
    }
    return s;
  }, [w, h]);
  return <path d={d} stroke={color} strokeWidth={5} opacity={0.07} />;
}

function CollagePoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('cp');
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const fg = colors.fg;
  const s = settings.logoScale;
  const layout = settings.titleLayout;
  const split = settings.infoLayout === 'split';
  const tone = { fg, accent: colors.accent, paper: colors.background === 'paper' ? '#f6f1e6' : colors.paper };
  const { words, question, base } = splitBrand(content.brand);
  const { head, tail } = splitDate(content.date);
  const seed = hashString(content.brand);
  const man = lines(content.manifesto);

  const titleSize = (sq ? 92 : 118) * s;
  const lineH = titleSize * 1.5;
  const rows =
    layout === 'line' || words.length < 2
      ? [ransom(base.toUpperCase() + (question ? ' ?' : ''), titleSize * 0.8, seed, tone)]
      : [ransom(words[0].toUpperCase(), titleSize, seed, tone), ransom(words.slice(1).join(' ').toUpperCase() + (question ? ' ?' : ''), titleSize, seed + 1, tone)];
  const maxRow = Math.max(...rows.map((r) => r.width));
  const k = Math.min(1, (W - 120) / maxRow);

  const photoBox = sq ? { x: 520, y: 330, w: 410, h: 420 } : { x: 470, y: 470, w: 460, h: 560 };
  const tornPhoto = useMemo(() => tornRect(0, 0, photoBox.w, photoBox.h, 77, 7, 12), [photoBox.w, photoBox.h]);
  const strips = useMemo(
    () => [
      { d: tornRect(0, 0, 1200, sq ? 150 : 190, 11, 8, 16), x: -100, y: sq ? 300 : 400, rot: -6, fill: colors.accent },
      { d: tornRect(0, 0, 520, sq ? 360 : 520, 12, 7, 14), x: sq ? 30 : 40, y: sq ? 440 : 600, rot: 3, fill: tone.paper },
      { d: tornRect(0, 0, 700, 120, 13, 6, 14), x: sq ? 380 : 300, y: sq ? 820 : 1220, rot: -2, fill: fg },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sq, colors.accent, tone.paper, fg],
  );

  const labelX = sq ? 60 : 70;
  const labelY = sq ? 470 : 640;

  return (
    <Artboard format={format} colors={colors} texture={settings.texture} label={`${content.brand} — collage`}>
      <Newsprint w={W} h={H} color={fg} />
      {strips.map((st, i) => (
        <path key={i} d={st.d} fill={st.fill} transform={`translate(${st.x} ${st.y}) rotate(${st.rot})`} />
      ))}
      {/* photo fragment, or a giant cut-out "?" */}
      <g transform={`translate(${photoBox.x} ${photoBox.y}) rotate(3 ${photoBox.w / 2} ${photoBox.h / 2})`}>
        {settings.photo ? (
          <>
            <defs>
              <clipPath id={id + 'p'}>
                <path d={tornPhoto} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${id}p)`}>
              <Photo width={photoBox.w} height={photoBox.h} kind="crowd" src={photoSrc} shadow={colors.ink} light="#e9e3d6" grain={0.6} />
            </g>
          </>
        ) : (
          <>
            <path d={tornPhoto} fill={tone.paper} />
            <text x={photoBox.w / 2} y={photoBox.h * 0.86} textAnchor="middle" fontFamily={FONT.condensed} fontSize={photoBox.h * 0.95} fill={colors.accent}>
              ?
            </text>
          </>
        )}
        <Tape x={-30} y={-6} w={150} rot={-24} />
        <Tape x={photoBox.w - 110} y={photoBox.h - 30} w={150} rot={-18} />
      </g>

      {layout === 'symbol' ? (
        <g transform={`translate(${sq ? 60 : 70} ${sq ? 60 : 80})`}>
          <CollageLogo variant="symbol" brand={content.brand} tone={{ fg, accent: colors.accent }} width={sq ? 220 : 280} height={sq ? 220 : 280} />
          <Dymo text={base.toUpperCase() + (question ? ' ?' : '')} x={sq ? 240 : 300} y={sq ? 90 : 120} size={sq ? 34 : 40} fill={fg} rot={-2} />
        </g>
      ) : (
        <g transform={`translate(60 ${sq ? 50 : 70}) scale(${f1(k * 100) / 100})`}>
          {rows.map((r, i) => (
            <Ransom key={i} scraps={r.scraps} x={i * titleSize * 0.4} y={i * lineH * 0.92} lineH={lineH} />
          ))}
        </g>
      )}

      {/* line-up on label-maker tape */}
      <Dymo text={content.lineupTitle} x={labelX} y={labelY} size={20} fill={colors.accent} rot={-2} />
      {content.lineup.map((a, i) => (
        <g key={a.id}>
          <Dymo text={a.name} x={labelX + (i % 2) * 14} y={labelY + 50 + i * (sq ? 76 : 96)} size={fitDymo(a.name, sq ? 400 : 370, split ? (sq ? 24 : 30) : sq ? 22 : 26)} fill={fg} rot={i % 2 ? 1.5 : -1} />
          {a.detail && (
            <Dymo text={a.detail} x={labelX + 30 + (i % 2) * 14} y={labelY + 50 + i * (sq ? 76 : 96) + (sq ? 40 : 50)} size={14} fill={colors.accent} rot={i % 2 ? -1 : 1} />
          )}
        </g>
      ))}

      <Stamp x={sq ? 46 : split ? 520 : 320} y={sq ? 830 : 1080} text={head + ' ' + (tail.split(' ')[0] ?? '')} sub={tail.split(' ').slice(1).join(' ') + ' · ' + content.edition} color={colors.accent} />

      <text x={sq ? 470 : 340} y={sq ? 908 : 1300} fontFamily={FONT.condensed} fontSize={sq ? 46 : 60} fill={tone.paper} transform={`rotate(-2 ${sq ? 470 : 340} ${sq ? 908 : 1300})`}>
        {content.venue}
      </text>
      {!sq && (
        <>
          <text x={70} y={1400} fontFamily={FONT.gambetta} fontStyle="italic" fontSize={30} fill={fg}>
            {lines(content.signature).join(', ').toLowerCase()}
          </text>
          <text x={70} y={1444} fontFamily={FONT.mono} fontSize={13} letterSpacing={3} fill={fg}>
            {content.pillars} · {man[0]}
          </text>
          {content.mentions && (
            <text x={70} y={1474} fontFamily={FONT.mono} fontSize={11} letterSpacing={2} fill={fg} opacity={0.7}>
              {content.mentions}
            </text>
          )}
        </>
      )}
    </Artboard>
  );
}

export const collage: ConceptDef = {
  id: 'collage',
  index: '10',
  name: 'Collage / Zine',
  short: 'Découpé, collé, tamponné',
  description: 'L’esthétique du fanzine : lettres découpées dans six magazines, papiers déchirés, scotch, étiquettes Dymo et coup de tampon.',
  rationale: [
    'Le nom est une lettre anonyme : chaque lettre vient d’une « revue » différente (six caractères), sur un papier déchiré, tourné à la main. La combinaison change si le nom change — l’identité est vivante.',
    'Le logo secondaire est une étiquette Dymo, lettres embouties en creux : sobre, physique, utilisable partout. Le symbole est un « ? » découpé dans un papier rouge.',
    'L’affiche est un collage : bandes déchirées, fragment de photo scotché, programmation sur étiquettes, date au tampon encreur. Une soirée qui a l’air faite main.',
  ],
  base: { paper: '#e9e3d6', ink: '#151311' },
  palette: [
    { name: 'Papier journal', hex: '#e9e3d6', role: 'Fond' },
    { name: 'Encre', hex: '#151311', role: 'Étiquettes, lettres' },
    { name: 'Rouge tampon', hex: '#d7261e', role: 'Bandes, tampon, « ? »' },
    { name: 'Gris presse', hex: NEWSPRINT, role: 'Papiers' },
  ],
  typography: [
    { role: 'Logo', family: 'Lettre anonyme', css: '', sample: 'UNE AUTRE ?', note: 'Six caractères mélangés, papiers déchirés générés.', custom: true },
    { role: 'Étiquettes', family: 'IBM Plex Mono', css: FONT.mono, weight: 500, sample: 'RAYHANE', note: 'Lettres en creux sur ruban Dymo.' },
    { role: 'Tampon', family: 'Anton', css: FONT.condensed, weight: 400, sample: '12 JUILLET', note: 'Encre irrégulière, filtre de tampon.' },
  ],
  defaults: { accent: '#d7261e', background: 'paper', titleLayout: 'stacked', logoScale: 1, texture: 0.5, photo: true, infoLayout: 'split', format: 'portrait' },
  Logo: CollageLogo,
  Poster: CollagePoster,
};
