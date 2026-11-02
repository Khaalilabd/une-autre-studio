import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { fitMeasured, measure } from '../lib/measure';
import { f1 } from '../lib/rng';

const SANS = "'General Sans'";
const tw = (t: string, size: number, weight = 600) => measure(t, { family: SANS, size, weight, tracking: -size * 0.045 });

/** The sign reduced to geometry: a crescent (the hook) and a red point. Centre of the crescent (cx, cy), radius r. */
function Crescent({ cx, cy, r, fg, accent, bg }: { cx: number; cy: number; r: number; fg: string; accent: string; bg?: string }) {
  const id = useUid('cr');
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={cx - r * 1.2} y={cy - r * 1.2} width={r * 2.4} height={r * 2.4}>
          <rect x={cx - r * 1.2} y={cy - r * 1.2} width={r * 2.4} height={r * 2.4} fill="#fff" />
          <circle cx={cx - r * 0.3} cy={cy + r * 0.26} r={r * 0.7} fill="#000" />
        </mask>
      </defs>
      {bg && <circle cx={cx} cy={cy} r={r} fill={bg} />}
      <circle cx={cx} cy={cy} r={r} fill={fg} mask={`url(#${id})`} />
      <circle cx={cx - r * 0.12} cy={cy + r * 1.55} r={r * 0.3} fill={accent} />
    </g>
  );
}

function SwissLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const { words, question, base } = splitBrand(brand);
  const word = base.toLowerCase();

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 240 240" x={x} y={y} width={width ?? 240} height={height ?? 240}>
        <Crescent cx={128} cy={96} r={70} fg={tone.fg} accent={tone.accent} />
      </svg>
    );
  }

  if (variant === 'secondary') {
    const size = 70;
    const w = tw(word, size, 500);
    const W = w + (question ? 60 : 0) + 20;
    return (
      <svg viewBox={`0 0 ${f1(W)} 100`} x={x} y={y} width={width ?? W} height={height ?? 100}>
        <text x={6} y={72} fontFamily={FONT.sans} fontWeight={500} fontSize={size} letterSpacing={-size * 0.045} fill={tone.fg}>
          {word}
        </text>
        {question && <Crescent cx={w + 34} cy={30} r={17} fg={tone.fg} accent={tone.accent} />}
      </svg>
    );
  }

  const size = 160;
  if (layout === 'line' || words.length < 2) {
    const w = tw(word, size);
    const W = w + (question ? 150 : 20) + 30;
    return (
      <svg viewBox={`0 0 ${f1(W)} 220`} x={x} y={y} width={width ?? W} height={height ?? 220}>
        <text x={10} y={160} fontFamily={FONT.sans} fontWeight={600} fontSize={size} letterSpacing={-size * 0.045} fill={tone.fg}>
          {word}
        </text>
        {question && <Crescent cx={w + 80} cy={70} r={48} fg={tone.fg} accent={tone.accent} />}
      </svg>
    );
  }
  const l1 = words[0].toLowerCase();
  const l2 = words.slice(1).join(' ').toLowerCase();
  const w = Math.max(tw(l1, size), tw(l2, size));
  const W = w + (question ? 40 : 0) + 30;
  return (
    <svg viewBox={`0 0 ${f1(W)} 330`} x={x} y={y} width={width ?? W} height={height ?? 330}>
      {question && <Crescent cx={tw(l1, size) + 110} cy={64} r={52} fg={tone.fg} accent={tone.accent} />}
      <text x={10} y={128} fontFamily={FONT.sans} fontWeight={600} fontSize={size} letterSpacing={-size * 0.045} fill={tone.fg}>
        {l1}
      </text>
      <text x={10} y={272} fontFamily={FONT.sans} fontWeight={600} fontSize={size} letterSpacing={-size * 0.045} fill={tone.fg}>
        {l2}
      </text>
    </svg>
  );
}

function SwissPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('sw');
  const tone: Tone = { fg: colors.fg, accent: colors.accent };
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const M = 60;
  const fg = colors.fg;
  const s = settings.logoScale;
  const layout = settings.titleLayout;
  const split = settings.infoLayout === 'split';
  const { words, question, base } = splitBrand(content.brand);
  const { head, tail } = splitDate(content.date);
  const sig = lines(content.signature);

  // Rhythm: one ring family per artist, around the crescent.
  const C = { cx: sq ? 640 : 610, cy: sq ? 360 : 470, r: (sq ? 170 : 220) * s * (layout === 'symbol' ? 1.25 : 1) };
  const rings = content.lineup.flatMap((_, i) =>
    Array.from({ length: 4 }, (_, k) => ({ r: C.r * (1.25 + i * 0.55 + k * 0.1), w: k === 0 ? 3 : 0.9 })),
  );

  const title = () => {
    if (layout === 'symbol') return null;
    const word = base.toLowerCase();
    const yBase = sq ? 760 : 1050;
    if (layout === 'line' || words.length < 2) {
      const size = fitMeasured(word, W - 2 * M, { family: SANS, size: 220, weight: 600, tracking: -220 * 0.045 });
      return (
        <text x={M - 6} y={yBase} fontFamily={FONT.sans} fontWeight={600} fontSize={size} letterSpacing={-size * 0.045} fill={fg}>
          {word}
          {question && <tspan fill={colors.accent}>.</tspan>}
        </text>
      );
    }
    const l1 = words[0].toLowerCase();
    const l2 = words.slice(1).join(' ').toLowerCase();
    const size = Math.min(200, fitMeasured(l2, W - 2 * M, { family: SANS, size: 260, weight: 600, tracking: -260 * 0.045 }));
    return (
      <g fontFamily={FONT.sans} fontWeight={600} fontSize={size} letterSpacing={-size * 0.045} fill={fg}>
        <text x={M - 6} y={yBase - size * 0.86}>
          {l1}
        </text>
        <text x={M - 6} y={yBase}>
          {l2}
        </text>
      </g>
    );
  };

  const colW = (W - 2 * M) / 3;
  const infoY = sq ? 830 : 1170;

  return (
    <Artboard format={format} colors={colors} texture={settings.texture * 0.5} label={`${content.brand} — swiss`}>
      <defs>
        <clipPath id={id + 'c'}>
          <circle cx={C.cx} cy={C.cy} r={C.r} />
        </clipPath>
      </defs>
      {/* grid columns (very faint) */}
      {Array.from({ length: 13 }, (_, i) => (
        <line key={i} x1={M + ((W - 2 * M) * i) / 12} x2={M + ((W - 2 * M) * i) / 12} y1={0} y2={H} stroke={fg} strokeOpacity={0.05} />
      ))}
      <g fill="none" stroke={fg}>
        {rings.map((r, i) => (
          <circle key={i} cx={C.cx} cy={C.cy} r={r.r} strokeWidth={r.w} opacity={0.85} />
        ))}
      </g>
      {settings.photo ? (
        <g>
          <g clipPath={`url(#${id}c)`}>
            <Photo x={C.cx - C.r} y={C.cy - C.r} width={C.r * 2} height={C.r * 2} kind="stage" src={photoSrc} shadow={colors.ink} light={colors.paper} grain={0.4} />
          </g>
          <circle cx={C.cx - C.r * 0.12} cy={C.cy + C.r * 1.55} r={C.r * 0.3} fill={colors.accent} />
        </g>
      ) : (
        <Crescent cx={C.cx} cy={C.cy} r={C.r} fg={fg} accent={colors.accent} />
      )}

      {/* date, top-left: thin vs bold contrast */}
      <text x={M - 8} y={sq ? 210 : 260} fontFamily={FONT.sans} fontWeight={200} fontSize={sq ? 200 : 260} letterSpacing={-12} fill={fg}>
        {head}
      </text>
      <text x={M} y={sq ? 250 : 306} fontFamily={FONT.sans} fontWeight={500} fontSize={22} fill={fg}>
        {tail}
      </text>
      <text x={M} y={sq ? 280 : 340} fontFamily={FONT.sans} fontWeight={400} fontSize={18} fill={fg} opacity={0.7}>
        {content.venue.toLowerCase()}
      </text>
      <text x={M} y={50} fontFamily={FONT.sans} fontWeight={500} fontSize={14} fill={fg}>
        {content.edition.toLowerCase()} — n° {content.editionNumber}
      </text>
      <text x={W - 26} y={sq ? 520 : 760} fontFamily={FONT.sans} fontWeight={500} fontSize={13} letterSpacing={3} fill={fg} transform={`rotate(90 ${W - 26} ${sq ? 520 : 760})`} textAnchor="middle">
        {content.pillars}
      </text>

      {title()}
      {layout === 'symbol' && <SwissLogo variant="secondary" brand={content.brand} tone={tone} x={M - 6} y={sq ? 690 : 960} width={420} height={60} />}

      <line x1={M} x2={W - M} y1={infoY - 40} y2={infoY - 40} stroke={fg} strokeWidth={2} />
      {split ? (
        content.lineup.map((a, i) => (
          <g key={a.id}>
            <text x={M + colW * i} y={infoY} fontFamily={FONT.sans} fontWeight={500} fontSize={14} fill={colors.accent}>
              {String(i + 1).padStart(2, '0')}
            </text>
            <text x={M + colW * i} y={infoY + 40} fontFamily={FONT.sans} fontWeight={600} fontSize={fitMeasured(a.name.toLowerCase(), colW - 20, { family: SANS, size: 30, weight: 600 })} letterSpacing={-0.8} fill={fg}>
              {a.name.toLowerCase()}
            </text>
            <text x={M + colW * i} y={infoY + 66} fontFamily={FONT.sans} fontWeight={400} fontSize={15} fill={fg} opacity={0.75}>
              {a.detail.toLowerCase()}
            </text>
          </g>
        ))
      ) : (
        content.lineup.map((a, i) => (
          <text key={a.id} x={M} y={infoY + i * 42} fontFamily={FONT.sans} fontWeight={600} fontSize={30} letterSpacing={-0.8} fill={fg}>
            <tspan fill={colors.accent} fontSize={14} fontWeight={500}>
              {String(i + 1).padStart(2, '0')}{'  '}
            </tspan>
            {a.name.toLowerCase()}
            <tspan fontWeight={400} fontSize={18} opacity={0.75}>
              {'  '}
              {a.detail.toLowerCase()}
            </tspan>
          </text>
        ))
      )}
      {!sq && (
        <>
          <line x1={M} x2={W - M} y1={H - 110} y2={H - 110} stroke={fg} strokeWidth={0.8} />
          <text x={M} y={H - 70} fontFamily={FONT.sans} fontWeight={400} fontSize={18} fill={fg}>
            {sig.join(' / ').toLowerCase()}
          </text>
          <text x={W - M} y={H - 70} textAnchor="end" fontFamily={FONT.sans} fontWeight={400} fontSize={16} fill={fg} opacity={0.75}>
            {lines(content.manifesto)[0]?.toLowerCase()}
          </text>
          {content.mentions && (
            <text x={M} y={H - 40} fontFamily={FONT.sans} fontSize={13} fill={fg} opacity={0.6}>
              {content.mentions}
            </text>
          )}
        </>
      )}
    </Artboard>
  );
}

export const swiss: ConceptDef = {
  id: 'swiss',
  index: '09',
  name: 'Swiss Rhythm',
  short: 'Grille, cercle, rythme',
  description: 'Le graphisme suisse appliqué à la nuit : grille stricte, minuscules, et un « ? » réduit à un croissant et un point rouge.',
  rationale: [
    'Le « ? » devient pure géométrie : un cercle évidé (le crochet) et un point rouge. Il se lit à 16 pixels comme à 4 mètres.',
    'Chaque artiste de la programmation génère une famille d’anneaux autour du signe : l’affiche change de rythme selon le nombre de noms.',
    'Typographie en minuscules, contraste maigre / gras, alignements au fer à gauche sur une grille de douze colonnes : une identité calme et très sûre d’elle.',
  ],
  base: { paper: '#efede7', ink: '#141414' },
  palette: [
    { name: 'Blanc gris', hex: '#efede7', role: 'Fond' },
    { name: 'Noir', hex: '#141414', role: 'Croissant, texte, anneaux' },
    { name: 'Rouge point', hex: '#ff3b30', role: 'Point, numéros' },
  ],
  typography: [
    { role: 'Signe', family: 'Croissant', css: '', sample: '?', note: 'Cercle évidé + point : le « ? » géométrique.', custom: true },
    { role: 'Wordmark', family: 'General Sans', css: FONT.sans, weight: 600, sample: 'une autre', note: 'Minuscules, approche serrée (−4,5 %).' },
    { role: 'Date', family: 'General Sans', css: FONT.sans, weight: 200, sample: '12', note: 'Chiffres très maigres en contraste.' },
  ],
  defaults: { accent: '#ff3b30', background: 'paper', titleLayout: 'stacked', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: SwissLogo,
  Poster: SwissPoster,
};
