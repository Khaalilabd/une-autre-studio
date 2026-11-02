import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { Lines, useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { fitMeasured, measure } from '../lib/measure';
import { f1 } from '../lib/rng';

const STONE = '#c8b79c';
const SERIF = "'Cormorant Garamond'";

/** Arch window: rectangle with a semicircular head. */
const archPath = (x: number, y: number, w: number, h: number) => {
  const r = w / 2;
  return `M${f1(x)} ${f1(y + h)}V${f1(y + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(y + r)}V${f1(y + h)}Z`;
};

/** The "?" whose dot is a low red sun sitting on the horizon. */
function HorizonQ({ x, y, h, fg, accent }: { x: number; y: number; h: number; fg: string; accent: string }) {
  const s = h / 120;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${f1(s * 1000) / 1000})`}>
      <path d="M4 28C4 12 16 2 32 2C48 2 60 12 60 28C60 42 50 48 40 54C34 58 32 64 32 76" fill="none" stroke={fg} strokeWidth={7} strokeLinecap="round" />
      <path d="M32 116A12 12 0 0 1 32 92A12 12 0 0 1 32 116Z" fill={accent} />
      <line x1={10} x2={54} y1={106} y2={106} stroke={fg} strokeWidth={2.4} />
    </g>
  );
}

function ArchSymbol({ x, y, w, fg, accent }: { x: number; y: number; w: number; fg: string; accent: string }) {
  const h = w * 1.3;
  const hz = y + h * 0.62;
  return (
    <g>
      <path d={archPath(x, y, w, h)} fill="none" stroke={fg} strokeWidth={w * 0.06} />
      <circle cx={x + w / 2} cy={hz} r={w * 0.2} fill={accent} />
      <rect x={x + w * 0.03} y={hz} width={w * 0.94} height={h * 0.38 - w * 0.03} fill={fg} />
      {[0.08, 0.16, 0.24].map((k, i) => (
        <line key={i} x1={x + w * (0.3 + i * 0.05)} x2={x + w * (0.7 - i * 0.05)} y1={hz + h * k * 0.5} y2={hz + h * k * 0.5} stroke={accent} strokeWidth={w * 0.025} />
      ))}
    </g>
  );
}

function NocturneLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  useUid();
  const { base, question } = splitBrand(brand);
  const word = base.toUpperCase();

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 200 240" x={x} y={y} width={width ?? 200} height={height ?? 240}>
        <ArchSymbol x={20} y={10} w={160} fg={tone.fg} accent={tone.accent} />
      </svg>
    );
  }

  const size = variant === 'secondary' ? 44 : 58;
  const tr = size * (variant === 'secondary' ? 0.3 : 0.24);
  const weight = variant === 'secondary' ? 500 : 600;
  const tw = measure(word, { family: SERIF, size, weight, tracking: tr });
  const qh = size * 1.05;
  const qw = question ? qh * 0.55 + 18 : 0;

  if (variant === 'secondary') {
    const W = 70 + tw + qw + 20;
    return (
      <svg viewBox={`0 0 ${f1(W)} 90`} x={x} y={y} width={width ?? W} height={height ?? 90}>
        <ArchSymbol x={6} y={10} w={50} fg={tone.fg} accent={tone.accent} />
        <text x={74} y={62} fontFamily={FONT.serif} fontWeight={weight} fontSize={size} letterSpacing={tr} fill={tone.fg}>
          {word}
        </text>
        {question && <HorizonQ x={74 + tw + 6} y={20} h={qh} fg={tone.fg} accent={tone.accent} />}
      </svg>
    );
  }

  if (layout === 'line') {
    const W = 150 + tw + qw + 20;
    return (
      <svg viewBox={`0 0 ${f1(W)} 170`} x={x} y={y} width={width ?? W} height={height ?? 170}>
        <ArchSymbol x={12} y={10} w={116} fg={tone.fg} accent={tone.accent} />
        <text x={150} y={112} fontFamily={FONT.serif} fontWeight={weight} fontSize={size} letterSpacing={tr} fill={tone.fg}>
          {word}
        </text>
        {question && <HorizonQ x={150 + tw + 6} y={56} h={qh} fg={tone.fg} accent={tone.accent} />}
      </svg>
    );
  }

  const W = Math.max(tw + qw, 260) + 40;
  return (
    <svg viewBox={`0 0 ${f1(W)} 370`} x={x} y={y} width={width ?? W} height={height ?? 370}>
      <ArchSymbol x={W / 2 - 90} y={10} w={180} fg={tone.fg} accent={tone.accent} />
      <text x={20} y={330} fontFamily={FONT.serif} fontWeight={weight} fontSize={size} letterSpacing={tr} fill={tone.fg}>
        {word}
      </text>
      {question && <HorizonQ x={20 + tw + 6} y={274} h={qh} fg={tone.fg} accent={tone.accent} />}
    </svg>
  );
}

/** Wordmark set directly on the poster (scales to the available width). */
function Wordmark({ brand, x, y, maxW, size, fg, accent, anchor = 'middle' }: { brand: string; x: number; y: number; maxW: number; size: number; fg: string; accent: string; anchor?: 'middle' | 'start' }) {
  const { base, question } = splitBrand(brand);
  const word = base.toUpperCase();
  const fs = fitMeasured(word, maxW - (question ? size * 0.75 : 0), { family: SERIF, size, weight: 600, tracking: size * 0.16 });
  const tr = fs * 0.16;
  const tw = measure(word, { family: SERIF, size: fs, weight: 600, tracking: tr });
  const total = tw + (question ? fs * 0.86 : 0);
  const x0 = anchor === 'middle' ? x - total / 2 : x;
  return (
    <g>
      <text x={x0} y={y} fontFamily={FONT.serif} fontWeight={600} fontSize={fs} letterSpacing={tr} fill={fg}>
        {word}
      </text>
      {question && <HorizonQ x={x0 + tw + fs * 0.24} y={y - fs * 0.98} h={fs * 1.08} fg={fg} accent={accent} />}
    </g>
  );
}

function Window({ x, y, w, h, settings, colors, photoSrc, id }: { x: number; y: number; w: number; h: number; settings: PosterProps['settings']; colors: PosterProps['colors']; photoSrc: string | null; id: string }) {
  const d = archPath(x, y, w, h);
  const sun = colors.accent === colors.ink ? colors.paper : colors.accent;
  return (
    <g>
      <defs>
        <clipPath id={id + 'arch'}>
          <path d={d} />
        </clipPath>
        <linearGradient id={id + 'sky'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors.ink} />
          <stop offset="0.7" stopColor="#3a2a24" />
          <stop offset="1" stopColor={colors.ink} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}arch)`}>
        {settings.photo ? (
          <>
            <Photo x={x} y={y} width={w} height={h} kind="horizon" src={photoSrc} shadow={colors.ink} light={STONE} grain={0.5 + settings.texture * 0.5} seed={23} />
            {!photoSrc && <circle cx={x + w * 0.66} cy={y + h * 0.5} r={w * 0.075} fill={sun} opacity={0.92} />}
          </>
        ) : (
          <>
            <rect x={x} y={y} width={w} height={h} fill={`url(#${id}sky)`} />
            <circle cx={x + w / 2} cy={y + h * 0.62} r={w * 0.2} fill={sun} />
            <rect x={x} y={y + h * 0.62} width={w} height={h * 0.38} fill={colors.ink} />
            {Array.from({ length: 9 }, (_, i) => (
              <line key={i} x1={x + w / 2 - w * (0.2 - i * 0.018)} x2={x + w / 2 + w * (0.2 - i * 0.018)} y1={y + h * 0.64 + i * 18} y2={y + h * 0.64 + i * 18} stroke={sun} strokeWidth={6 - i * 0.5} opacity={0.9 - i * 0.08} />
            ))}
          </>
        )}
      </g>
      <path d={d} fill="none" stroke={colors.fg} strokeWidth={2} />
      <path d={archPath(x - 16, y - 16, w + 32, h + 16)} fill="none" stroke={colors.fg} strokeWidth={0.8} />
    </g>
  );
}

function NocturnePoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('noc');
  const tone: Tone = { fg: colors.fg, accent: colors.accent };
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const fg = colors.fg;
  const s = settings.logoScale;
  const sig = lines(content.signature);
  const man = lines(content.manifesto);
  const { head, tail } = splitDate(content.date);
  const mono = { fontFamily: FONT.mono, fill: fg } as const;
  const split = settings.infoLayout === 'split';
  const layout = settings.titleLayout;
  const red = colors.accent === colors.ink ? fg : colors.accent;

  const lineupCol = (x: number, y: number, w: number, anchor: 'start' | 'middle', gap = 72) => (
    <g>
      <text x={x} y={y} textAnchor={anchor} {...mono} fontSize={13} letterSpacing={5} fill={red}>
        {content.lineupTitle}
      </text>
      {content.lineup.map((a, i) => (
        <g key={a.id}>
          <text x={x} y={y + 50 + i * gap} textAnchor={anchor} fontFamily={FONT.serif} fontWeight={600} fontSize={fitMeasured(a.name, w, { family: SERIF, size: 34, weight: 600, tracking: 3 })} letterSpacing={3} fill={fg}>
            {a.name}
          </text>
          <text x={x} y={y + 74 + i * gap} textAnchor={anchor} fontFamily={FONT.serif} fontStyle="italic" fontSize={20} fill={fg} opacity={0.85}>
            {a.detail.toLowerCase()}
          </text>
        </g>
      ))}
    </g>
  );

  if (sq) {
    const aw = 400 * s;
    return (
      <Artboard format={format} colors={colors} texture={settings.texture * 0.8} label={`${content.brand} — carré`}>
        <Window x={60 + (400 - aw) / 2} y={70 + (400 - aw) * 1.2} w={aw} h={aw * 2.15} settings={settings} colors={colors} photoSrc={photoSrc} id={id} />
        {layout === 'symbol' ? (
          <NocturneLogo variant="secondary" brand={content.brand} tone={tone} x={510} y={70} width={430} height={90} />
        ) : (
          <Wordmark brand={content.brand} x={520} y={140} maxW={420} size={56} fg={fg} accent={colors.accent} anchor="start" />
        )}
        <Lines x={522} y={200} lines={sig} lh={26} fontFamily={FONT.serif} fontStyle="italic" fontSize={22} fill={fg} />
        {lineupCol(522, 360, 420, 'start', 72)}
        <text x={522} y={720} fontFamily={FONT.serif} fontWeight={500} fontSize={60} fill={fg}>
          {head} <tspan fontStyle="italic" fontSize={34}>{tail.toLowerCase()}</tspan>
        </text>
        <text x={522} y={770} {...mono} fontSize={14} letterSpacing={4}>
          {content.venue}
        </text>
        <text x={522} y={930} {...mono} fontSize={11} letterSpacing={3} opacity={0.8}>
          {content.pillars}
        </text>
      </Artboard>
    );
  }

  const aw = 640 * s;
  const ax = (W - aw) / 2;
  const ay = layout === 'symbol' ? 240 : 100;
  const ah = Math.min(820, aw * 1.25) - (layout === 'symbol' ? 140 : 0);
  const below = ay + ah;
  return (
    <Artboard format={format} colors={colors} texture={settings.texture * 0.8} label={`${content.brand} — affiche`}>
      <text x={40} y={H / 2} {...mono} fontSize={12} letterSpacing={6} transform={`rotate(-90 40 ${H / 2})`} textAnchor="middle">
        {content.coords || `${content.edition} — N° ${content.editionNumber}`}
      </text>
      <text x={960} y={H / 2} {...mono} fontSize={12} letterSpacing={6} transform={`rotate(90 960 ${H / 2})`} textAnchor="middle">
        {content.pillars}
      </text>
      {layout === 'symbol' && <NocturneLogo variant="symbol" brand={content.brand} tone={tone} x={440} y={60} width={120} height={144} />}
      <Window x={ax} y={ay} w={aw} h={ah} settings={settings} colors={colors} photoSrc={photoSrc} id={id} />
      {layout === 'line' && (
        <g>
          <rect x={ax} y={below - 150} width={aw} height={150} fill={colors.ink} opacity={0.55} />
          <Wordmark brand={content.brand} x={W / 2} y={below - 50} maxW={aw - 60} size={80} fg={colors.paper} accent={colors.accent === colors.ink ? colors.paper : colors.accent} />
        </g>
      )}
      {layout === 'stacked' && <Wordmark brand={content.brand} x={W / 2} y={below + 120} maxW={860} size={92} fg={fg} accent={colors.accent} />}
      {layout === 'symbol' && <Wordmark brand={content.brand} x={W / 2} y={below + 100} maxW={700} size={60} fg={fg} accent={colors.accent} />}
      <text x={W / 2} y={layout === 'line' ? below + 70 : below + 178} textAnchor="middle" fontFamily={FONT.serif} fontStyle="italic" fontSize={28} fill={fg}>
        {sig.join(' · ').toLowerCase()}
      </text>
      {split ? (
        <>
          {lineupCol(90, below + 250 - (layout === 'line' ? 90 : 0), 400, 'start')}
          <line x1={540} x2={540} y1={below + 222 - (layout === 'line' ? 90 : 0)} y2={H - 90} stroke={fg} strokeWidth={0.8} />
          <text x={580} y={below + 300 - (layout === 'line' ? 90 : 0)} fontFamily={FONT.serif} fontWeight={500} fontSize={110} fill={red}>
            {head}
          </text>
          <text x={584} y={below + 344 - (layout === 'line' ? 90 : 0)} fontFamily={FONT.serif} fontStyle="italic" fontSize={34} fill={fg}>
            {tail.toLowerCase()}
          </text>
          <Lines x={584} y={below + 400 - (layout === 'line' ? 90 : 0)} lines={man} lh={20} {...mono} fontSize={11} letterSpacing={2} opacity={0.8} />
        </>
      ) : (
        <>
          {lineupCol(W / 2, below + 250 - (layout === 'line' ? 90 : 0), 760, 'middle', 72)}
          <text x={W / 2} y={H - 120} textAnchor="middle" fontFamily={FONT.serif} fontWeight={500} fontSize={44} fill={red}>
            {content.date}
          </text>
        </>
      )}
      <line x1={90} x2={910} y1={H - 80} y2={H - 80} stroke={fg} strokeWidth={0.8} />
      <text x={90} y={H - 48} {...mono} fontSize={14} letterSpacing={5}>
        {content.venue}
      </text>
      <text x={910} y={H - 48} textAnchor="end" {...mono} fontSize={12} letterSpacing={3}>
        {content.mentions || content.edition}
      </text>
    </Artboard>
  );
}

export const nocturne: ConceptDef = {
  id: 'nocturne',
  index: '06',
  name: 'Mediterranean Nocturne',
  short: 'Arche, horizon, nuit',
  description: 'Une arche ouverte sur la nuit : horizon, soleil rouge bas, palmiers et grain photographique. Ancrée, pas touristique.',
  rationale: [
    'L’arche — forme de l’architecture méditerranéenne — devient la fenêtre de la marque : on regarde la même nuit, mais autrement.',
    'Le point du « ? » est un soleil rouge posé sur l’horizon. Le symbole (arche + disque + reflet) fonctionne en avatar comme en projection.',
    'L’affiche cadre une photographie granuleuse en duotone noir / pierre dans l’arche ; les informations sont gravées autour comme sur une façade.',
  ],
  base: { paper: '#e7dfd0', ink: '#0e0d0c' },
  palette: [
    { name: 'Chaux', hex: '#e7dfd0', role: 'Fond' },
    { name: 'Pierre', hex: STONE, role: 'Lumière de la photo' },
    { name: 'Nuit', hex: '#0e0d0c', role: 'Ombres, texte' },
    { name: 'Soleil bas', hex: '#a3161d', role: 'Disque, accents' },
  ],
  typography: [
    { role: 'Wordmark', family: 'Cormorant Garamond', css: FONT.serif, weight: 600, sample: 'UNE AUTRE', note: 'Capitales gravées, approche large. « ? » dessiné : point-soleil.' },
    { role: 'Lineup', family: 'Cormorant Garamond', css: FONT.serif, italic: true, weight: 400, sample: 'b2b karim siala', note: 'Italique pour les détails.' },
    { role: 'Micro', family: 'IBM Plex Mono', css: FONT.mono, weight: 400, sample: 'MARRACAS MARACAS', note: 'Textes verticaux, lieu.' },
  ],
  defaults: {
    accent: '#a3161d',
    background: 'paper',
    titleLayout: 'stacked',
    logoScale: 1,
    texture: 0.45,
    photo: true,
    infoLayout: 'split',
    format: 'portrait',
  },
  Logo: NocturneLogo,
  Poster: NocturnePoster,
};
