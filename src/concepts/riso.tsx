import { useMemo } from 'react';
import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { dotsPath, halftone, questionField } from '../lib/generators';
import { fitMeasured, measure } from '../lib/measure';
import { f1 } from '../lib/rng';

const SANS = "'General Sans'";
const T = (size: number) => ({ family: SANS, size, weight: 700, tracking: -size * 0.035 });

/** A "?" printed as a halftone screen. */
function DotQ({ cx, cy, h, cell, fill, angle = 45 }: { cx: number; cy: number; h: number; cell: number; fill: string; angle?: number }) {
  const d = useMemo(() => {
    const w = h * 0.75;
    const field = questionField(cx, cy, h, h * 0.085);
    return dotsPath(halftone(w + cell * 4, h + cell * 4, cell, field, angle, cx - w / 2 - cell * 2, cy - h / 2 - cell * 2));
  }, [cx, cy, h, cell, angle]);
  return <path d={d} fill={fill} />;
}

function RisoLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  useUid();
  const { words, question, base } = splitBrand(brand);
  const word = base.toUpperCase();

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 240 240" x={x} y={y} width={width ?? 240} height={height ?? 240}>
        <circle cx={120} cy={120} r={112} fill="none" stroke={tone.fg} strokeWidth={6} />
        <DotQ cx={120} cy={122} h={170} cell={10} fill={tone.fg} />
        <circle cx={120} cy={202} r={11} fill={tone.accent} />
      </svg>
    );
  }

  if (variant === 'secondary') {
    const size = 72;
    const tw = measure(word, { family: SANS, size, weight: 600, tracking: -1 });
    const W = tw + (question ? 70 : 0) + 20;
    return (
      <svg viewBox={`0 0 ${f1(W)} 100`} x={x} y={y} width={width ?? W} height={height ?? 100}>
        <text x={6} y={78} fontFamily={FONT.sans} fontWeight={600} fontSize={size} letterSpacing={-1} fill={tone.fg}>
          {word}
        </text>
        {question && <DotQ cx={tw + 44} cy={50} h={78} cell={6} fill={tone.accent} />}
      </svg>
    );
  }

  const size = 150;
  if (layout === 'line' || words.length < 2) {
    const tw = measure(word, T(size));
    const W = tw + (question ? 190 : 20) + 40;
    return (
      <svg viewBox={`0 0 ${f1(W)} 230`} x={x} y={y} width={width ?? W} height={height ?? 230}>
        <g style={{ mixBlendMode: 'multiply' }}>{question && <DotQ cx={tw + 120} cy={112} h={200} cell={9} fill={tone.accent} />}</g>
        <text x={20} y={170} fontFamily={FONT.sans} fontWeight={700} fontSize={size} letterSpacing={-size * 0.035} fill={tone.fg}>
          {word}
        </text>
      </svg>
    );
  }
  const l1 = words[0].toUpperCase();
  const l2 = words.slice(1).join(' ').toUpperCase();
  const w = Math.max(measure(l1, T(size)), measure(l2, T(size)));
  const W = w + (question ? 170 : 20) + 40;
  return (
    <svg viewBox={`0 0 ${f1(W)} 340`} x={x} y={y} width={width ?? W} height={height ?? 340}>
      <g style={{ mixBlendMode: 'multiply' }}>{question && <DotQ cx={w - 10} cy={170} h={320} cell={11} fill={tone.accent} />}</g>
      <text x={20} y={150} fontFamily={FONT.sans} fontWeight={700} fontSize={size} letterSpacing={-size * 0.035} fill={tone.fg}>
        {l1}
      </text>
      <text x={20} y={290} fontFamily={FONT.sans} fontWeight={700} fontSize={size} letterSpacing={-size * 0.035} fill={tone.fg}>
        {l2}
      </text>
    </svg>
  );
}

function Sun({ cx, cy, r, fill, cell = 15 }: { cx: number; cy: number; r: number; fill: string; cell?: number }) {
  const d = useMemo(
    () =>
      dotsPath(
        halftone(
          r * 2.4,
          r * 2.4,
          cell,
          (x, y) => {
            const k = 1 - Math.hypot(x - cx, y - cy) / r;
            const band = Math.sin((y - cy) * 0.09) > -0.35 || y < cy ? 1 : 0.35;
            return k > 0 ? Math.min(1, k * 1.6) * band : 0;
          },
          15,
          cx - r * 1.2,
          cy - r * 1.2,
        ),
      ),
    [cx, cy, r, cell],
  );
  return <path d={d} fill={fill} />;
}

function RisoPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('riso');
  const tone: Tone = { fg: colors.fg, accent: colors.accent };
  const sq = format === 'square';
  const W = 1000;
  const s = settings.logoScale;
  const blend = colors.background === 'paper' ? 'multiply' : 'normal';
  const red = colors.accent;
  const fg = colors.fg;
  const { words, question, base } = splitBrand(content.brand);
  const { head, tail } = splitDate(content.date);
  const man = lines(content.manifesto);
  const sig = lines(content.signature);
  const layout = settings.titleLayout;
  const split = settings.infoLayout === 'split';

  const sun = { cx: sq ? 690 : 560, cy: sq ? 470 : 690, r: (sq ? 300 : 380) * s };
  const q = { cx: sq ? 690 : 500, cy: sq ? 520 : 720, h: (sq ? 640 : 860) * s * (layout === 'symbol' ? 1.12 : 1) };

  const title = () => {
    if (layout === 'symbol') return null;
    const word = base.toUpperCase();
    if (layout === 'line' || words.length < 2) {
      const size = fitMeasured(word, sq ? 560 : 900, T(200));
      return (
        <text x={50} y={sq ? 230 : 250} fontFamily={FONT.sans} fontWeight={700} fontSize={size} letterSpacing={-size * 0.035} fill={fg}>
          {word}
        </text>
      );
    }
    const l1 = words[0].toUpperCase();
    const l2 = words.slice(1).join(' ').toUpperCase();
    const size = Math.min(fitMeasured(l1, sq ? 560 : 900, T(230)), fitMeasured(l2, sq ? 560 : 900, T(230)));
    return (
      <g fontFamily={FONT.sans} fontWeight={700} fontSize={size} letterSpacing={-size * 0.035} fill={fg}>
        <text x={44} y={60 + size * 0.86}>
          {l1}
        </text>
        <text x={44} y={60 + size * 1.74}>
          {l2}
        </text>
      </g>
    );
  };

  const lineup = (x: number, y: number, w: number) => (
    <g>
      <text x={x} y={y} fontFamily={FONT.mono} fontSize={14} letterSpacing={3} fill={fg}>
        {content.lineupTitle}
      </text>
      {content.lineup.map((a, i) => (
        <g key={a.id}>
          <text x={x} y={y + 52 + i * 66} fontFamily={FONT.sans} fontWeight={600} fontSize={fitMeasured(a.name, w, { family: SANS, size: 40, weight: 600 })} letterSpacing={-0.5} fill={fg}>
            {a.name}
          </text>
          <text x={x} y={y + 76 + i * 66} fontFamily={FONT.mono} fontSize={13} letterSpacing={2} fill={fg} opacity={0.8}>
            {a.detail}
          </text>
        </g>
      ))}
    </g>
  );

  return (
    <Artboard format={format} colors={colors} texture={settings.texture} label={`${content.brand} — riso`}>
      <defs>
        <clipPath id={id + 'c'}>
          <circle cx={sun.cx} cy={sun.cy} r={sun.r} />
        </clipPath>
      </defs>
      {/* ink 1 — accent */}
      <g style={{ mixBlendMode: blend }}>
        {settings.photo ? (
          <g clipPath={`url(#${id}c)`}>
            <Photo x={sun.cx - sun.r} y={sun.cy - sun.r} width={sun.r * 2} height={sun.r * 2} kind="crowd" src={photoSrc} shadow={red} light={colors.bg} grain={0.5} />
          </g>
        ) : (
          <Sun cx={sun.cx} cy={sun.cy} r={sun.r} fill={red} />
        )}
        <text x={sq ? 60 : 620} y={sq ? 900 : 1190} fontFamily={FONT.sans} fontWeight={700} fontSize={fitMeasured(head, sq ? 300 : 320, T(sq ? 200 : 260))} letterSpacing={-8} fill={red}>
          {head}
        </text>
      </g>
      {/* ink 2 — key, slightly off register */}
      <g transform="translate(5 -3)" style={{ mixBlendMode: blend }}>
        {question && <DotQ cx={q.cx} cy={q.cy} h={q.h} cell={sq ? 12 : 14} fill={fg} />}
        {title()}
      </g>
      <text x={W - 50} y={50} textAnchor="end" fontFamily={FONT.mono} fontSize={13} letterSpacing={3} fill={fg}>
        RISO · 2 ENCRES · N° {content.editionNumber}
      </text>
      {sq ? (
        <>
          <text x={64} y={936} fontFamily={FONT.mono} fontSize={14} letterSpacing={3} fill={fg}>
            {tail} · {content.venue}
          </text>
          {lineup(60, 500, 360)}
        </>
      ) : (
        <>
          {split ? (
            <>
              {lineup(50, 1110, 520)}
              <text x={626} y={1236} fontFamily={FONT.mono} fontSize={17} letterSpacing={4} fill={fg}>
                {tail}
              </text>
            </>
          ) : (
            <>
              {lineup(50, 1110, 900)}
              <text x={626} y={1236} fontFamily={FONT.mono} fontSize={17} letterSpacing={4} fill={fg}>
                {tail}
              </text>
            </>
          )}
          {layout === 'symbol' && (
            <RisoLogo variant="secondary" brand={content.brand} tone={tone} x={44} y={60} width={520} height={90} />
          )}
          <line x1={50} x2={950} y1={1390} y2={1390} stroke={fg} strokeWidth={2} />
          <text x={50} y={1436} fontFamily={FONT.sans} fontWeight={600} fontSize={26} fill={fg}>
            {content.venue}
          </text>
          <text x={950} y={1434} textAnchor="end" fontFamily={FONT.mono} fontSize={13} letterSpacing={2} fill={fg}>
            {sig.join(' · ')}
          </text>
          <text x={50} y={1470} fontFamily={FONT.mono} fontSize={11} letterSpacing={2} fill={fg} opacity={0.75}>
            {content.mentions || man.join(' / ')}
          </text>
        </>
      )}
    </Artboard>
  );
}

export const riso: ConceptDef = {
  id: 'riso',
  index: '07',
  name: 'Riso / Halftone',
  short: 'Trame, deux encres, surimpression',
  description: 'Une impression risographie à deux encres : le « ? » et le soleil sont des trames de points, légèrement hors repérage.',
  rationale: [
    'Le « ? » n’est pas dessiné, il est tramé : des milliers de points dont la taille suit la forme du signe. De près c’est une texture, de loin c’est une question.',
    'Deux encres seulement, superposées en multiplication comme sur une vraie riso : là où le rouge et le noir se croisent, l’encre s’assombrit. Le léger décalage de repérage est volontaire.',
    'Un langage de fanzine imprimé et de sérigraphie de club : économique, tactile, et très reconnaissable en story.',
  ],
  base: { paper: '#f2ebdd', ink: '#1a1a1d' },
  palette: [
    { name: 'Papier riso', hex: '#f2ebdd', role: 'Fond' },
    { name: 'Encre noire', hex: '#1a1a1d', role: 'Trame du « ? », titres' },
    { name: 'Rouge fluo', hex: '#ef3b36', role: 'Soleil tramé, date' },
  ],
  typography: [
    { role: 'Signe', family: 'Trame « ? »', css: '', sample: '?', note: 'Trame de points générée à partir du squelette du « ? ».', custom: true },
    { role: 'Titres', family: 'General Sans', css: FONT.sans, weight: 700, sample: 'UNE AUTRE', note: 'Grotesque serrée, capitales grasses.' },
    { role: 'Infos', family: 'IBM Plex Mono', css: FONT.mono, weight: 400, sample: 'RISO · 2 ENCRES', note: 'Mentions d’impression.' },
  ],
  defaults: { accent: '#ef3b36', background: 'paper', titleLayout: 'stacked', logoScale: 1, texture: 0.45, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: RisoLogo,
  Poster: RisoPoster,
};
