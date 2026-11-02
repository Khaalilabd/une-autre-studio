import { useMemo } from 'react';
import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { rosette, waveBand } from '../lib/generators';
import { fitMeasured, measure } from '../lib/measure';
import { f1 } from '../lib/rng';
import { layoutStroke, QUESTION_GLYPH } from '../lib/strokeFont';

const SERIF = "'Gambetta'";

function Rosettes({ cx, cy, R, color, opacity = 0.55, sw = 0.7 }: { cx: number; cy: number; R: number; color: string; opacity?: number; sw?: number }) {
  const d = useMemo(() => {
    const k = R / 323;
    return [
      ...rosette(cx, cy, 230 * k, 23 * k, 70 * k, 18, 520),
      ...rosette(cx, cy, 150 * k, 25 * k, 40 * k, 12, 420),
      ...rosette(cx, cy, 70 * k, 14 * k, 26 * k, 10, 300),
    ].join('');
  }, [cx, cy, R]);
  return <path d={d} fill="none" stroke={color} strokeWidth={sw} opacity={opacity} />;
}

/** Hollow, engraved monogram built from the Trajet U and A, plus the "?". */
function Monogram({ cx, cy, size, fg, accent, initials }: { cx: number; cy: number; size: number; fg: string; accent: string; initials: string }) {
  const id = useUid('mono');
  const lay = layoutStroke(initials, -26, 40);
  const s = size / 100;
  const w = lay.width * s;
  const x0 = cx - w / 2;
  const y0 = cy - size / 2 - size * 0.08;
  const strokes = (width: number, color: string) => (
    <g transform={`translate(${f1(x0)} ${f1(y0)}) scale(${s})`} fill="none" stroke={color} strokeWidth={width / s} strokeLinecap="round" strokeLinejoin="round">
      {lay.glyphs.map((g, i) => (
        <path key={i} d={g.d} transform={`translate(${g.x} 0)`} />
      ))}
    </g>
  );
  const qs = (size * 0.3) / 100;
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={x0 - size} y={y0 - size} width={w + size * 2} height={size * 3}>
          <rect x={x0 - size} y={y0 - size} width={w + size * 2} height={size * 3} fill="#fff" />
          {strokes(size * 0.055, '#000')}
        </mask>
      </defs>
      <g mask={`url(#${id})`}>{strokes(size * 0.17, fg)}</g>
      <g transform={`translate(${f1(cx - 28 * qs)} ${f1(cy + size * 0.52)}) scale(${f1(qs * 1000) / 1000})`} fill="none" stroke={accent} strokeWidth={(size * 0.04) / qs} strokeLinecap="round">
        <path d={QUESTION_GLYPH.d} />
      </g>
    </g>
  );
}

function Crest({ cx, cy, r, tone, brand, withText = true }: { cx: number; cy: number; r: number; tone: Tone; brand: string; withText?: boolean }) {
  const id = useUid('crest');
  const { words, base } = splitBrand(brand);
  const initials = (words.length > 1 ? words.slice(0, 2).map((w) => w[0]) : [...words[0].slice(0, 2)]).join('');
  const tr = r * 0.8;
  const fs = r * 0.13;
  return (
    <g>
      <defs>
        <path id={id + 't'} d={`M${cx - tr} ${cy}A${tr} ${tr} 0 0 1 ${cx + tr} ${cy}`} />
        <path id={id + 'b'} d={`M${cx - tr - fs * 0.75} ${cy}A${tr + fs * 0.75} ${tr + fs * 0.75} 0 0 0 ${cx + tr + fs * 0.75} ${cy}`} />
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={tone.fg} strokeWidth={r * 0.03} />
      <circle cx={cx} cy={cy} r={r * 0.94} fill="none" stroke={tone.fg} strokeWidth={r * 0.008} />
      <circle cx={cx} cy={cy} r={r * 0.64} fill="none" stroke={tone.fg} strokeWidth={r * 0.012} />
      <Rosettes cx={cx} cy={cy} R={r * 0.6} color={tone.accent} opacity={0.5} sw={Math.max(0.4, r * 0.0035)} />
      {withText && (
        <>
          <text fontFamily={FONT.gambetta} fontWeight={600} fontSize={fs} letterSpacing={fs * 0.32} fill={tone.fg}>
            <textPath href={`#${id}t`} startOffset="50%" textAnchor="middle">
              {base.toUpperCase()}
            </textPath>
          </text>
          <text fontFamily={FONT.gambetta} fontSize={fs * 0.9} letterSpacing={fs * 0.9} fill={tone.fg}>
            <textPath href={`#${id}b`} startOffset="50%" textAnchor="middle">
              ✦ ✦ ✦
            </textPath>
          </text>
        </>
      )}
      <Monogram cx={cx} cy={cy - r * 0.04} size={r * 0.62} fg={tone.fg} accent={tone.accent} initials={initials} />
    </g>
  );
}

function ClubLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const { base, question } = splitBrand(brand);
  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 240 240" x={x} y={y} width={width ?? 240} height={height ?? 240}>
        <Crest cx={120} cy={120} r={110} tone={tone} brand={brand} withText={false} />
      </svg>
    );
  }
  if (variant === 'secondary') {
    const size = 58;
    const word = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    const w = measure(word, { family: SERIF, size, weight: 400, italic: true });
    const W = w + (question ? 46 : 0) + 30;
    const band = waveBand(15, W - 15, 92, 4, 22, 3).join('');
    return (
      <svg viewBox={`0 0 ${f1(W)} 110`} x={x} y={y} width={width ?? W} height={height ?? 110}>
        <text x={15} y={64} fontFamily={FONT.gambetta} fontStyle="italic" fontWeight={400} fontSize={size} fill={tone.fg}>
          {word}
          {question && <tspan fill={tone.accent}> ?</tspan>}
        </text>
        <path d={band} fill="none" stroke={tone.fg} strokeWidth={0.9} />
      </svg>
    );
  }
  if (layout === 'line') {
    const size = 64;
    const text = base.toUpperCase() + (question ? ' ?' : '');
    const w = measure(text, { family: SERIF, size, weight: 500, tracking: size * 0.22 });
    const W = 260 + w + 30;
    return (
      <svg viewBox={`0 0 ${f1(W)} 240`} x={x} y={y} width={width ?? W} height={height ?? 240}>
        <Crest cx={120} cy={120} r={108} tone={tone} brand={brand} withText={false} />
        <text x={260} y={142} fontFamily={FONT.gambetta} fontWeight={500} fontSize={size} letterSpacing={size * 0.22} fill={tone.fg}>
          {text}
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 400" x={x} y={y} width={width ?? 400} height={height ?? 400}>
      <Crest cx={200} cy={200} r={188} tone={tone} brand={brand} />
    </svg>
  );
}

function ClubPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('club');
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const fg = colors.fg;
  const s = settings.logoScale;
  const layout = settings.titleLayout;
  const split = settings.infoLayout === 'split';
  const { head, tail } = splitDate(content.date);
  const sig = lines(content.signature);
  const lineAccent = colors.background === 'accent' ? colors.paper : colors.accent;
  const toneLines = { fg, accent: lineAccent };

  const cx = sq ? 340 : 500;
  const cy = sq ? 470 : 560;
  const R = (sq ? 300 : 360) * s;
  const bands = useMemo(
    () => [...waveBand(70, W - 70, sq ? 96 : 110, 9, 34, 7), ...waveBand(70, W - 70, H - (sq ? 96 : 110), 9, 34, 7)].join(''),
    [sq, H],
  );

  const center = () => {
    if (settings.photo) {
      return (
        <g>
          <defs>
            <clipPath id={id + 'o'}>
              <ellipse cx={cx} cy={cy} rx={R * 0.6} ry={R * 0.78} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}o)`}>
            <Photo x={cx - R * 0.6} y={cy - R * 0.78} width={R * 1.2} height={R * 1.56} kind="horizon" src={photoSrc} shadow={colors.ink} light={colors.paper} grain={0.5} />
          </g>
          <ellipse cx={cx} cy={cy} rx={R * 0.6} ry={R * 0.78} fill="none" stroke={fg} strokeWidth={3} />
          <ellipse cx={cx} cy={cy} rx={R * 0.64} ry={R * 0.82} fill="none" stroke={fg} strokeWidth={1} />
          <ClubLogo variant="symbol" brand={content.brand} tone={toneLines} x={cx - R * 0.22} y={cy - R * 1.05} width={R * 0.44} height={R * 0.44} />
        </g>
      );
    }
    if (layout === 'symbol') return <><circle cx={cx} cy={cy} r={R * 0.6} fill={colors.bg} /><ClubLogo variant="symbol" brand={content.brand} tone={toneLines} x={cx - R * 0.62} y={cy - R * 0.62} width={R * 1.24} height={R * 1.24} /></>;
    if (layout === 'line') {
      return (
        <>
          <ClubLogo variant="symbol" brand={content.brand} tone={toneLines} x={cx - R * 0.5} y={cy - R * 0.62} width={R} height={R} />
        </>
      );
    }
    return (
      <>
        <circle cx={cx} cy={cy} r={R * 0.6} fill={colors.bg} />
        <ClubLogo variant="primary" brand={content.brand} tone={toneLines} x={cx - R * 0.62} y={cy - R * 0.62} width={R * 1.24} height={R * 1.24} />
      </>
    );
  };

  const wordmark = (y: number) => {
    const text = splitBrand(content.brand).base.toUpperCase() + (splitBrand(content.brand).question ? ' ?' : '');
    const size = fitMeasured(text, sq ? 560 : 820, { family: SERIF, size: 64, weight: 500, tracking: 64 * 0.22 });
    return (
      <text x={sq ? cx : W / 2} y={y} textAnchor="middle" fontFamily={FONT.gambetta} fontWeight={500} fontSize={size} letterSpacing={size * 0.22} fill={fg}>
        {text}
      </text>
    );
  };

  const program = (x: number, y: number, anchor: 'middle' | 'start', w: number) => (
    <g textAnchor={anchor}>
      <text x={x} y={y} fontFamily={FONT.gambetta} fontStyle="italic" fontSize={24} fill={lineAccent}>
        {content.lineupTitle.toLowerCase()}
      </text>
      {content.lineup.map((a, i) => (
        <g key={a.id}>
          <text x={x} y={y + 50 + i * 64} fontFamily={FONT.gambetta} fontWeight={500} fontSize={fitMeasured(a.name, w, { family: SERIF, size: 34, weight: 500, tracking: 6 })} letterSpacing={6} fill={fg}>
            {a.name}
          </text>
          <text x={x} y={y + 76 + i * 64} fontFamily={FONT.gambetta} fontStyle="italic" fontSize={19} fill={fg} opacity={0.8}>
            {a.detail.toLowerCase()}
          </text>
        </g>
      ))}
    </g>
  );

  return (
    <Artboard format={format} colors={colors} texture={settings.texture * 0.6} label={`${content.brand} — club`}>
      <rect x={40} y={40} width={W - 80} height={H - 80} fill="none" stroke={fg} strokeWidth={3} />
      <rect x={52} y={52} width={W - 104} height={H - 104} fill="none" stroke={fg} strokeWidth={1} />
      <path d={bands} fill="none" stroke={fg} strokeWidth={0.8} opacity={0.7} />
      <Rosettes cx={cx} cy={cy} R={R * 1.08} color={fg} opacity={0.22} sw={0.6} />
      {center()}
      <text x={78} y={sq ? 156 : 172} fontFamily={FONT.mono} fontSize={12} letterSpacing={3} fill={fg}>
        N° {content.editionNumber}
      </text>
      <text x={W - 78} y={sq ? 156 : 172} textAnchor="end" fontFamily={FONT.mono} fontSize={12} letterSpacing={3} fill={fg}>
        {content.edition}
      </text>
      {sq ? (
        <>
          {layout !== 'stacked' && wordmark(860)}
          {program(690, 300, 'start', 250)}
          <text x={690} y={620} fontFamily={FONT.gambetta} fontWeight={500} fontSize={64} fill={lineAccent}>
            {head}
          </text>
          <text x={690} y={656} fontFamily={FONT.gambetta} fontStyle="italic" fontSize={24} fill={fg}>
            {tail.toLowerCase()}
          </text>
          <text x={690} y={700} fontFamily={FONT.mono} fontSize={12} letterSpacing={3} fill={fg}>
            {content.venue}
          </text>
        </>
      ) : (
        <>
          {layout !== 'stacked' || settings.photo ? wordmark(1000) : null}
          <text x={W / 2} y={1046} textAnchor="middle" fontFamily={FONT.gambetta} fontStyle="italic" fontSize={26} fill={fg} opacity={0.9}>
            {sig.join(' · ').toLowerCase()}
          </text>
          {split ? (
            <>
              {program(110, 1110, 'start', 420)}
              <rect x={600} y={1104} width={300} height={200} rx={16} fill="none" stroke={fg} strokeWidth={1.4} />
              <text x={750} y={1196} textAnchor="middle" fontFamily={FONT.gambetta} fontWeight={500} fontSize={84} fill={lineAccent}>
                {head}
              </text>
              <text x={750} y={1236} textAnchor="middle" fontFamily={FONT.gambetta} fontStyle="italic" fontSize={24} fill={fg}>
                {tail.toLowerCase()}
              </text>
              <text x={750} y={1276} textAnchor="middle" fontFamily={FONT.mono} fontSize={11} letterSpacing={3} fill={fg}>
                {content.venue}
              </text>
            </>
          ) : (
            <>
              {program(W / 2, 1100, 'middle', 760)}
              <text x={W / 2} y={1330} textAnchor="middle" fontFamily={FONT.gambetta} fontWeight={500} fontSize={30} letterSpacing={4} fill={lineAccent}>
                {content.date} — {content.venue}
              </text>
            </>
          )}
          <text x={W / 2} y={H - 150} textAnchor="middle" fontFamily={FONT.mono} fontSize={11} letterSpacing={4} fill={fg} opacity={0.8}>
            {content.mentions || content.pillars}
          </text>
        </>
      )}
    </Artboard>
  );
}

export const club: ConceptDef = {
  id: 'club',
  index: '12',
  name: 'Guilloché / Club',
  short: 'Écusson, monogramme, billet',
  description: 'Un club privé plus qu’une soirée : écusson à monogramme, rosaces guillochées et bordures de billet de banque, sur fond lie-de-vin.',
  rationale: [
    'L’écusson réunit le nom gravé en couronne, un monogramme « UA » en lettres creuses dessinées à partir du squelette « Trajet », et un petit « ? » rouge en signature.',
    'Les rosaces et les bordures sont des guillochis mathématiques (courbes épicycloïdales), comme sur les billets et les actions anciennes : une sensation de valeur et de rareté, sans aucun code de luxe copié.',
    'L’affiche se lit comme un titre d’adhésion : cadre double, numéro d’édition en coin, programme en petites capitales, date dans un cartouche.',
  ],
  base: { paper: '#efe4d0', ink: '#140b0c' },
  palette: [
    { name: 'Lie-de-vin', hex: '#6e1420', role: 'Fond dominant' },
    { name: 'Crème', hex: '#efe4d0', role: 'Gravure, texte' },
    { name: 'Encre', hex: '#140b0c', role: 'Contrepoint' },
  ],
  typography: [
    { role: 'Écusson', family: 'Monogramme UA', css: '', sample: 'UA ?', note: 'Lettres creuses gravées + couronne de texte.', custom: true },
    { role: 'Titres', family: 'Gambetta', css: FONT.gambetta, weight: 500, sample: 'UNE AUTRE', note: 'Capitales très espacées (+22 %).' },
    { role: 'Détails', family: 'Gambetta Italic', css: FONT.gambetta, italic: true, weight: 400, sample: 'b2b karim siala', note: 'Italique pour les mentions.' },
  ],
  defaults: { accent: '#6e1420', background: 'accent', titleLayout: 'stacked', logoScale: 1, texture: 0.35, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: ClubLogo,
  Poster: ClubPoster,
};
