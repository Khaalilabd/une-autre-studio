import { useMemo } from 'react';
import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { ADVANCE, fit, Lines, useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { f1 } from '../lib/rng';
import { layoutStroke } from '../lib/strokeFont';

/* Geometric question mark: 3/4 circle + stem + square dot. Unit = radius r. */
function GeoQ({ cx, cy, r, sw, fg, dot }: { cx: number; cy: number; r: number; sw: number; fg: string; dot: string }) {
  const top = cy - r * 1.45;
  const d = `M${f1(cx - r)} ${f1(top + r)}A${f1(r)} ${f1(r)} 0 1 1 ${f1(cx)} ${f1(top + 2 * r)}V${f1(top + 2.75 * r)}`;
  return (
    <g>
      <path d={d} fill="none" stroke={fg} strokeWidth={sw} strokeLinecap="butt" />
      <rect x={f1(cx - sw / 2)} y={f1(top + 2.95 * r)} width={f1(sw)} height={f1(sw)} fill={dot} />
    </g>
  );
}

/** Brand letters set around a circle with the Trajet skeleton, heavy monoline. */
function RingText({ cx, cy, R, size, sw, text, color }: { cx: number; cy: number; R: number; size: number; sw: number; text: string; color: string }) {
  const placed = useMemo(() => {
    const unit = layoutStroke(text + ' · ', 30, 40);
    const s = size / 100;
    const len = (unit.width + 40) * s;
    const C = 2 * Math.PI * R;
    const reps = Math.max(1, Math.floor(C / len));
    const stretch = C / (reps * len);
    const out: { d: string; ang: number; w: number }[] = [];
    for (let k = 0; k < reps; k++) {
      for (const g of unit.glyphs) {
        const pos = (k * len + (g.x + g.w / 2) * s) * stretch;
        out.push({ d: g.d, ang: (pos / C) * 360, w: g.w });
      }
    }
    return { out, s };
  }, [text, size, R]);
  return (
    <g fill="none" stroke={color} strokeWidth={sw / placed.s} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={1.6}>
      {placed.out.map((g, i) => (
        <path key={i} d={g.d} transform={`translate(${cx} ${cy}) rotate(${f1(g.ang)}) translate(${f1((-g.w / 2) * placed.s)} ${f1(-R - size / 2)}) scale(${placed.s})`} />
      ))}
    </g>
  );
}

function Monoline({ text, x, y, size, sw, color, track = 22 }: { text: string; x: number; y: number; size: number; sw: number; color: string; track?: number }) {
  const lay = layoutStroke(text, track, 44);
  const s = size / 100;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${s})`} fill="none" stroke={color} strokeWidth={sw / s} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={1.6}>
      {lay.glyphs.map((g, i) => (
        <path key={i} d={g.d} transform={`translate(${g.x} 0)`} />
      ))}
    </g>
  );
}

const monoWidth = (text: string, size: number, track = 22) => (layoutStroke(text, track, 44).width * size) / 100;

function SignalLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const id = useUid('sig');
  const { base, question } = splitBrand(brand);

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 240 240" x={x} y={y} width={width ?? 240} height={height ?? 240}>
        <defs>
          <mask id={id + 'm'}>
            <rect width="240" height="240" fill="#fff" />
            <GeoQ cx={120} cy={120} r={42} sw={26} fg="#000" dot="#000" />
          </mask>
        </defs>
        <circle cx={120} cy={120} r={116} fill={tone.fg} mask={`url(#${id}m)`} />
      </svg>
    );
  }

  if (variant === 'secondary') {
    const w = monoWidth(base, 70) + (question ? 80 : 0);
    return (
      <svg viewBox={`-10 -30 ${f1(w + 30)} 130`} x={x} y={y} width={width ?? w + 30} height={height ?? 130}>
        <Monoline text={base} x={0} y={0} size={70} sw={8} color={tone.fg} />
        {question && <GeoQ cx={w - 22} cy={44} r={20} sw={8} fg={tone.fg} dot={tone.accent} />}
      </svg>
    );
  }

  if (layout === 'line') {
    const tw = monoWidth(base, 120);
    const W = tw + (question ? 270 : 40) + 40;
    return (
      <svg viewBox={`0 0 ${f1(W)} 230`} x={x} y={y} width={width ?? W} height={height ?? 230}>
        <Monoline text={base} x={30} y={55} size={120} sw={22} color={tone.fg} />
        {question && (
          <>
            <circle cx={tw + 172} cy={115} r={92} fill="none" stroke={tone.fg} strokeWidth={6} />
            <GeoQ cx={tw + 172} cy={115} r={38} sw={22} fg={tone.fg} dot={tone.accent} />
          </>
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 420 420" x={x} y={y} width={width ?? 420} height={height ?? 420}>
      <RingText cx={210} cy={210} R={172} size={36} sw={8} text={base} color={tone.fg} />
      <circle cx={210} cy={210} r={136} fill="none" stroke={tone.fg} strokeWidth={2} />
      {question ? <GeoQ cx={210} cy={210} r={60} sw={30} fg={tone.fg} dot={tone.accent} /> : <circle cx={210} cy={210} r={16} fill={tone.accent} />}
    </svg>
  );
}

function SignalPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const tone: Tone = { fg: colors.fg, accent: colors.accent };
  const { head, tail } = splitDate(content.date);
  const s = settings.logoScale;
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const split = settings.infoLayout === 'split';
  const text = { fill: colors.fg };
  const lineupHeadSize = (n: string, w: number) => fit(n, w, 46, ADVANCE.display);

  const mark = (cx: number, cy: number, d: number) => {
    if (settings.titleLayout === 'line') {
      const w = Math.min(W - 120, d * 1.25) * s;
      const tw = monoWidth(splitBrand(content.brand).base, 120);
      const lw = tw + (splitBrand(content.brand).question ? 270 : 40) + 40;
      return <SignalLogo variant="primary" layout="line" brand={content.brand} tone={tone} x={cx - w / 2} y={cy - (w * 230) / lw / 2} width={w} height={(w * 230) / lw} />;
    }
    const dd = d * s;
    const v = settings.titleLayout === 'symbol' ? 'symbol' : 'primary';
    return <SignalLogo variant={v} brand={content.brand} tone={tone} x={cx - dd / 2} y={cy - dd / 2} width={dd} height={dd} />;
  };

  const lineup = (x: number, y: number, w: number, anchor: 'start' | 'middle') => (
    <g>
      {content.lineup.map((a, i) => (
        <g key={a.id}>
          <text x={x} y={y + i * 104} textAnchor={anchor} fontFamily={FONT.display} fontWeight={700} fontSize={lineupHeadSize(a.name, w)} {...text}>
            {a.name}
          </text>
          <text x={x} y={y + i * 104 + 32} textAnchor={anchor} fontFamily={FONT.mono} fontSize={15} letterSpacing={3} {...text} opacity={0.85}>
            {a.detail}
          </text>
        </g>
      ))}
    </g>
  );

  if (sq) {
    return (
      <Artboard format={format} colors={colors} texture={settings.texture * 0.6} label={`${content.brand} — carré`}>
        {mark(340, 500, 600)}
        <line x1={680} x2={680} y1={60} y2={940} stroke={colors.fg} strokeWidth={2} />
        <text x={710} y={92} fontFamily={FONT.mono} fontSize={14} letterSpacing={3} {...text}>
          {content.edition}
        </text>
        <text x={710} y={250} fontFamily={FONT.display} fontWeight={800} fontSize={fit(head, 250, 150, ADVANCE.display)} {...text}>
          {head}
        </text>
        <text x={712} y={290} fontFamily={FONT.mono} fontSize={15} letterSpacing={3} {...text}>
          {tail}
        </text>
        <text x={710} y={420} fontFamily={FONT.mono} fontSize={13} letterSpacing={4} {...text}>
          {content.lineupTitle}
        </text>
        {content.lineup.map((a, i) => (
          <g key={a.id}>
            <text x={710} y={470 + i * 80} fontFamily={FONT.display} fontWeight={700} fontSize={fit(a.name, 250, 28, ADVANCE.display)} {...text}>
              {a.name}
            </text>
            <text x={710} y={494 + i * 80} fontFamily={FONT.mono} fontSize={12} letterSpacing={2} {...text} opacity={0.85}>
              {a.detail}
            </text>
          </g>
        ))}
        <text x={710} y={900} fontFamily={FONT.mono} fontSize={13} letterSpacing={3} {...text}>
          {content.venue}
        </text>
        <text x={710} y={930} fontFamily={FONT.mono} fontSize={10} letterSpacing={2} {...text} opacity={0.8}>
          {content.pillars}
        </text>
        {settings.photo && <Photo x={710} y={680} width={250} height={170} kind="crowd" src={photoSrc} shadow={colors.ink} light={colors.background === 'accent' ? colors.paper : colors.accent} grain={0.6} />}
      </Artboard>
    );
  }

  const photo = settings.photo;
  const gridY = photo ? 1010 : 930;
  return (
    <Artboard format={format} colors={colors} texture={settings.texture * 0.6} label={`${content.brand} — affiche`}>
      <text x={60} y={74} fontFamily={FONT.display} fontWeight={800} fontSize={30} {...text}>
        {content.editionNumber}
      </text>
      <text x={940} y={70} textAnchor="end" fontFamily={FONT.mono} fontSize={14} letterSpacing={3} {...text}>
        {content.edition}
      </text>
      {mark(500, 450, 740)}
      {photo && (
        <>
          <Photo x={0} y={840} width={W} height={130} kind="crowd" src={photoSrc} shadow={colors.ink} light={colors.background === 'accent' ? colors.paper : colors.accent} grain={0.7} />
          <text x={60} y={826} fontFamily={FONT.mono} fontSize={12} letterSpacing={3} {...text}>
            {lines(content.manifesto).join(' / ')}
          </text>
        </>
      )}
      {!photo && (
        <text x={500} y={872} textAnchor="middle" fontFamily={FONT.mono} fontSize={fit(lines(content.manifesto).join(' / '), 880, 14, ADVANCE.mono, 3)} letterSpacing={3} {...text}>
          {lines(content.manifesto).join(' / ')}
        </text>
      )}
      <line x1={60} x2={940} y1={gridY} y2={gridY} stroke={colors.fg} strokeWidth={3} />
      {split ? (
        <>
          <text x={60} y={gridY + 44} fontFamily={FONT.mono} fontSize={14} letterSpacing={4} {...text}>
            {content.lineupTitle}
          </text>
          {lineup(60, gridY + 120, 520, 'start')}
          <line x1={620} x2={620} y1={gridY} y2={gridY + 340} stroke={colors.fg} strokeWidth={2} />
          <text x={650} y={gridY + 190} fontFamily={FONT.display} fontWeight={800} fontSize={fit(head, 290, 190, ADVANCE.display)} {...text}>
            {head}
          </text>
          <Lines x={654} y={gridY + 240} lines={tail.split(' ')} lh={24} fontFamily={FONT.mono} fontSize={17} letterSpacing={4} {...text} />
        </>
      ) : (
        <>
          <text x={500} y={gridY + 50} textAnchor="middle" fontFamily={FONT.mono} fontSize={14} letterSpacing={4} {...text}>
            {content.lineupTitle} — {content.date}
          </text>
          {lineup(500, gridY + 124, 860, 'middle')}
        </>
      )}
      <line x1={60} x2={940} y1={H - 110} y2={H - 110} stroke={colors.fg} strokeWidth={3} />
      <text x={60} y={H - 62} fontFamily={FONT.display} fontWeight={700} fontSize={fit(content.venue, 440, 30, ADVANCE.display)} {...text}>
        {content.venue}
      </text>
      <text x={940} y={H - 64} textAnchor="end" fontFamily={FONT.mono} fontSize={fit(content.pillars, 440, 14, ADVANCE.mono, 2)} letterSpacing={2} {...text}>
        {content.pillars}
      </text>
      {content.mentions && (
        <text x={500} y={H - 24} textAnchor="middle" fontFamily={FONT.mono} fontSize={11} letterSpacing={2} {...text} opacity={0.8}>
          {content.mentions}
        </text>
      )}
    </Artboard>
  );
}

export const signal: ConceptDef = {
  id: 'signal',
  index: '02',
  name: 'Red Signal',
  short: 'Rouge, cercle, signal',
  description: 'Le rouge domine. Le nom tourne autour d’un « ? » géométrique : un signal reconnaissable sans photographie.',
  rationale: [
    'Le logo est un objet circulaire : le nom tourne en boucle — comme un disque, comme une question qui revient à chaque édition — autour d’un « ? » construit (trois quarts de cercle, fût, point carré).',
    'Les lettres viennent du même squelette « Trajet » que le concept 01, ici en monoline épais à terminaisons carrées : même ADN, tempérament opposé.',
    'L’affiche tient sans image : proportions, contraste rouge / blanc cassé et grille stricte. La date devient un chiffre monumental.',
  ],
  base: { paper: '#f3eee6', ink: '#140c0c' },
  palette: [
    { name: 'Signal', hex: '#c8141e', role: 'Fond dominant' },
    { name: 'Blanc cassé', hex: '#f3eee6', role: 'Logo, texte' },
    { name: 'Noir rouge', hex: '#140c0c', role: 'Point, contrepoint' },
  ],
  typography: [
    { role: 'Logo', family: 'Trajet Mono', css: '', sample: 'UNE AUTRE ?', note: 'Squelette Trajet en monoline épais, disposé en cercle.', custom: true },
    { role: 'Titres', family: 'Syne', css: FONT.display, weight: 800, sample: '12 RAYHANE', note: 'Grotesque contemporaine, chasse large.' },
    { role: 'Infos', family: 'IBM Plex Mono', css: FONT.mono, weight: 400, sample: 'B2B KARIM SIALA', note: 'Détails, mentions, dates.' },
  ],
  defaults: {
    accent: '#c8141e',
    background: 'accent',
    titleLayout: 'stacked',
    logoScale: 1,
    texture: 0.25,
    photo: false,
    infoLayout: 'split',
    format: 'portrait',
  },
  Logo: SignalLogo,
  Poster: SignalPoster,
};
