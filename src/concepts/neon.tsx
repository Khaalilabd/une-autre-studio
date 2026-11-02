import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { hexToRgb, Lines, useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { fitMeasured } from '../lib/measure';
import { f1 } from '../lib/rng';
import { layoutStroke, QUESTION_GLYPH } from '../lib/strokeFont';

const SANS = "'General Sans'";
const TRACK = 34;

function lighten(hex: string, k: number) {
  const [r, g, b] = hexToRgb(hex);
  const m = (v: number) => Math.round(v + (255 - v) * k);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/** Glyph paths for a word, already positioned (glyph units, cap height 100). */
function wordPaths(text: string) {
  const lay = layoutStroke(text, TRACK, 54);
  return { width: lay.width, paths: lay.glyphs.map((g) => ({ d: g.d, x: g.x })) };
}

interface TubeSet {
  paths: { d: string; x: number }[];
  x: number;
  y: number;
  scale: number;
  color: string;
}

/** Bent glass tubes: wide soft halo, tighter glow, then the hot core. */
function Neon({ sets, sw, lit = true }: { sets: TubeSet[]; sw: number; lit?: boolean }) {
  const id = useUid('neon');
  const draw = (width: number, color: (c: string) => string) =>
    sets.map((s, i) => (
      <g key={i} transform={`translate(${f1(s.x)} ${f1(s.y)}) scale(${s.scale})`} fill="none" stroke={color(s.color)} strokeWidth={width / s.scale} strokeLinecap="round" strokeLinejoin="round">
        {s.paths.map((p, k) => (
          <path key={k} d={p.d} transform={`translate(${p.x} 0)`} />
        ))}
      </g>
    ));
  return (
    <g>
      <defs>
        <filter id={id + 'a'} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={sw * 2.4} />
        </filter>
        <filter id={id + 'b'} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={sw * 0.7} />
        </filter>
      </defs>
      {lit && (
        <>
          <g filter={`url(#${id}a)`} opacity={0.85}>
            {draw(sw * 3.2, (c) => c)}
          </g>
          <g filter={`url(#${id}b)`}>{draw(sw * 1.5, (c) => c)}</g>
        </>
      )}
      {draw(sw * (lit ? 0.6 : 1), (c) => (lit ? lighten(c, 0.72) : c))}
    </g>
  );
}

function measureSign(brand: string, layout: 'stacked' | 'line') {
  const { words, question, base } = splitBrand(brand);
  if (layout === 'line' || words.length < 2) {
    const w = wordPaths(base);
    const s = 1.1;
    const qs = 1.7;
    const W = 60 + w.width * s + (question ? 40 + QUESTION_GLYPH.w * qs : 0) + 60;
    return { W, H: 260, rows: [{ ...w, x: 60, y: 90, scale: s }], q: question ? { x: 60 + w.width * s + 40, y: 40, scale: qs } : null };
  }
  const a = wordPaths(words[0]);
  const b = wordPaths(words.slice(1).join(' '));
  const s1 = 0.7;
  const s2 = 1.2;
  const width = Math.max(a.width * s1, b.width * s2);
  const qs = 2.3;
  const W = 60 + width + (question ? 50 + QUESTION_GLYPH.w * qs : 0) + 60;
  return {
    W,
    H: 350,
    rows: [
      { ...a, x: 66, y: 50, scale: s1 },
      { ...b, x: 60, y: 160, scale: s2 },
    ],
    q: question ? { x: 60 + width + 50, y: 50, scale: qs } : null,
  };
}

export const neonAspect = (brand: string, layout: 'stacked' | 'line') => {
  const m = measureSign(brand, layout);
  return m.H / m.W;
};

function NeonLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const { base, question } = splitBrand(brand);
  const qPaths = [{ d: QUESTION_GLYPH.d, x: 0 }];

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 240 240" x={x} y={y} width={width ?? 240} height={height ?? 240}>
        <Neon
          sw={6}
          sets={[
            { paths: [{ d: 'M30 0H170C186 0 200 14 200 30V170C200 186 186 200 170 200H30C14 200 0 186 0 170V30C0 14 14 0 30 0Z', x: 0 }], x: 20, y: 20, scale: 1, color: tone.fg },
            { paths: qPaths, x: 82, y: 40, scale: 1.6, color: tone.accent },
          ]}
        />
      </svg>
    );
  }

  if (variant === 'secondary') {
    const w = wordPaths(base);
    const s = 0.62;
    const W = 30 + w.width * s + (question ? 30 + QUESTION_GLYPH.w * s : 0) + 30;
    return (
      <svg viewBox={`0 0 ${f1(W)} 110`} x={x} y={y} width={width ?? W} height={height ?? 110}>
        <Neon
          lit={false}
          sw={5}
          sets={[
            { paths: w.paths, x: 30, y: 24, scale: s, color: tone.fg },
            ...(question ? [{ paths: qPaths, x: 30 + w.width * s + 30, y: 24, scale: s, color: tone.accent }] : []),
          ]}
        />
      </svg>
    );
  }

  const m = measureSign(brand, layout);
  return (
    <svg viewBox={`0 0 ${f1(m.W)} ${m.H}`} x={x} y={y} width={width ?? m.W} height={height ?? m.H}>
      <Neon
        sw={7}
        sets={[
          ...m.rows.map((r) => ({ paths: r.paths, x: r.x, y: r.y, scale: r.scale, color: tone.fg })),
          ...(m.q ? [{ paths: qPaths, x: m.q.x, y: m.q.y, scale: m.q.scale, color: tone.accent }] : []),
        ]}
      />
    </svg>
  );
}

function Bricks({ w, h, color }: { w: number; h: number; color: string }) {
  const id = useUid('brick');
  return (
    <g>
      <defs>
        <pattern id={id} width="120" height="56" patternUnits="userSpaceOnUse">
          <path d="M0 0H120M0 28H120M0 0V28M60 28V56" stroke={color} strokeWidth="1.2" fill="none" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id})`} opacity={0.07} />
    </g>
  );
}

function NeonPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('np');
  const tone: Tone = { fg: colors.fg, accent: colors.accent };
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const fg = colors.fg;
  const s = settings.logoScale;
  const layout = settings.titleLayout;
  const split = settings.infoLayout === 'split';
  const { head, tail } = splitDate(content.date);
  const sig = lines(content.signature);
  const floor = sq ? 690 : 1040;
  const glow = colors.background === 'accent' ? colors.paper : colors.accent;

  const maxW = (sq ? 760 : 860) * s;
  const sign =
    layout === 'symbol'
      ? { variant: 'symbol' as const, layout: undefined, w: (sq ? 380 : 520) * s, h: (sq ? 380 : 520) * s, y: sq ? 90 : 130 }
      : (() => {
          const lay = layout === 'line' ? ('line' as const) : ('stacked' as const);
          return { variant: 'primary' as const, layout: lay, w: maxW, h: maxW * neonAspect(content.brand, lay), y: sq ? 110 : 170 };
        })();
  const placed = <NeonLogo variant={sign.variant} layout={sign.layout} brand={content.brand} tone={tone} x={(W - sign.w) / 2} y={sign.y} width={sign.w} height={sign.h} />;

  const info = (y: number) =>
    split ? (
      <g>
        <text x={70} y={y} fontFamily={FONT.mono} fontSize={13} letterSpacing={4} fill={glow}>
          {content.lineupTitle}
        </text>
        {content.lineup.map((a, i) => (
          <g key={a.id}>
            <text x={70} y={y + 46 + i * 62} fontFamily={FONT.sans} fontWeight={300} fontSize={fitMeasured(a.name, 480, { family: SANS, size: 38, weight: 300 })} fill={fg}>
              {a.name}
            </text>
            <text x={72} y={y + 70 + i * 62} fontFamily={FONT.mono} fontSize={12} letterSpacing={2} fill={fg} opacity={0.6}>
              {a.detail}
            </text>
          </g>
        ))}
        <text x={930} y={y + 70} textAnchor="end" fontFamily={FONT.sans} fontWeight={200} fontSize={120} letterSpacing={-4} fill={fg}>
          {head}
        </text>
        <text x={930} y={y + 104} textAnchor="end" fontFamily={FONT.mono} fontSize={14} letterSpacing={4} fill={glow}>
          {tail}
        </text>
      </g>
    ) : (
      <g textAnchor="middle">
        <text x={500} y={y} fontFamily={FONT.mono} fontSize={13} letterSpacing={4} fill={glow}>
          {content.lineupTitle} — {content.date}
        </text>
        {content.lineup.map((a, i) => (
          <text key={a.id} x={500} y={y + 50 + i * 54} fontFamily={FONT.sans} fontWeight={300} fontSize={fitMeasured(`${a.name}  ${a.detail}`, 860, { family: SANS, size: 34, weight: 300 })} fill={fg}>
            {a.name}
            <tspan fontFamily={FONT.mono} fontSize={13} letterSpacing={2} fill={glow} dx={14}>
              {a.detail}
            </tspan>
          </text>
        ))}
      </g>
    );

  return (
    <Artboard format={format} colors={colors} texture={settings.texture * 0.8} label={`${content.brand} — néon`}>
      <defs>
        <radialGradient id={id + 'spill'} cx="0.5" cy="0.32" r="0.55">
          <stop offset="0" stopColor={glow} stopOpacity={colors.background === 'paper' ? 0.12 : 0.22} />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id + 'floor'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.15" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={id + 'fade'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={id + 'm'}>
          <rect y={floor} width={W} height={H - floor} fill={`url(#${id}fade)`} />
        </mask>
        <filter id={id + 'wet'} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3 9" />
        </filter>
      </defs>
      <Bricks w={W} h={floor} color={fg} />
      <rect width={W} height={H} fill={`url(#${id}spill)`} />
      {placed}
      {/* wet floor */}
      <rect y={floor} width={W} height={H - floor} fill={`url(#${id}floor)`} />
      <line x1={0} x2={W} y1={floor} y2={floor} stroke={fg} strokeOpacity={0.25} />
      {settings.photo ? (
        <Photo x={0} y={floor} width={W} height={H - floor} kind="crowd" src={photoSrc} shadow={colors.bg} light={glow} grain={0.5} />
      ) : (
        <g mask={`url(#${id}m)`} filter={`url(#${id}wet)`}>
          <g transform={`translate(0 ${f1(floor + (sign.y + sign.h) * 0.8)}) scale(1 -0.8)`}>{placed}</g>
        </g>
      )}
      <text x={70} y={sq ? 56 : 70} fontFamily={FONT.mono} fontSize={12} letterSpacing={4} fill={fg} opacity={0.7}>
        N° {content.editionNumber} · {content.edition}
      </text>
      <text x={930} y={sq ? 56 : 70} textAnchor="end" fontFamily={FONT.mono} fontSize={12} letterSpacing={4} fill={fg} opacity={0.7}>
        {content.pillars}
      </text>
      {sq ? (
        <>
          {info(floor - 150)}
          <text x={500} y={960} textAnchor="middle" fontFamily={FONT.mono} fontSize={13} letterSpacing={5} fill={fg}>
            {content.venue}
          </text>
        </>
      ) : (
        <>
          <Lines x={500} y={floor - 290} anchor="middle" lines={[sig.join(' · ')]} lh={30} fontFamily={FONT.gambetta} fontStyle="italic" fontSize={30} fill={fg} opacity={0.85} />
          {info(floor - 230)}
          <text x={500} y={H - 50} textAnchor="middle" fontFamily={FONT.mono} fontSize={14} letterSpacing={6} fill={fg}>
            {content.venue}
          </text>
          {content.mentions && (
            <text x={500} y={H - 24} textAnchor="middle" fontFamily={FONT.mono} fontSize={11} letterSpacing={2} fill={fg} opacity={0.6}>
              {content.mentions}
            </text>
          )}
        </>
      )}
    </Artboard>
  );
}

export const neon: ConceptDef = {
  id: 'neon',
  index: '08',
  name: 'Néon',
  short: 'Enseigne, lueur, reflet',
  description: 'Le nom écrit en tubes de néon, un « ? » rouge qui grésille, et son reflet sur le sol mouillé. La nuit comme enseigne.',
  rationale: [
    'Le logo est une enseigne : le squelette « Trajet » devient un tube de verre plié, avec halo, lueur et cœur chauffé à blanc — exactement comme un néon réel.',
    'Allumé, il signe les soirées ; éteint (version secondaire), il devient un simple tracé, sobre, pour les supports imprimés.',
    'L’affiche met en scène l’enseigne sur un mur sombre : la lumière déborde sur la brique et se reflète dans le sol mouillé. Ou, photo activée, éclaire la foule.',
  ],
  base: { paper: '#f6efe3', ink: '#0d0a12' },
  palette: [
    { name: 'Nuit violette', hex: '#0d0a12', role: 'Fond' },
    { name: 'Blanc chaud', hex: '#f6efe3', role: 'Tubes, texte' },
    { name: 'Rouge néon', hex: '#ff2d55', role: '« ? », lueurs' },
  ],
  typography: [
    { role: 'Enseigne', family: 'Trajet Néon', css: '', sample: 'UNE AUTRE ?', note: 'Squelette Trajet rendu en tube : halo, lueur, cœur.', custom: true },
    { role: 'Programmation', family: 'General Sans', css: FONT.sans, weight: 300, sample: 'Rayhane', note: 'Fine, lumineuse sur fond sombre.' },
    { role: 'Signature', family: 'Gambetta', css: FONT.gambetta, italic: true, weight: 400, sample: 'même lieu · mêmes gens', note: 'Italique pour la signature.' },
  ],
  defaults: { accent: '#ff2d55', background: 'dark', titleLayout: 'stacked', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: NeonLogo,
  Poster: NeonPoster,
};
