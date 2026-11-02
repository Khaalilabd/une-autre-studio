import { useMemo } from 'react';
import { lines, splitBrand } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { Lines, useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard, yearOf } from '../graphics/posterKit';
import { circlePath, outline } from '../lib/brush';
import { FONT } from '../lib/fonts';
import { fitMeasured, measure, titleCase } from '../lib/measure';
import { strokesFromPath } from '../lib/pathSample';
import { f1 } from '../lib/rng';

/* High-contrast question mark drawn for the brand: hairline entry, swelling bowl, fine stem, round dot. Box 76 × 128. */
const EQ_PATH = 'M6 30C6 12 20 0 38 0C58 0 70 14 70 32C70 50 56 58 46 66C40 71 38 78 38 92';
const EQ_W = 76;
const EQ_H = 128;

function ContrastQ({ x, y, h, color, dot }: { x: number; y: number; h: number; color: string; dot: string }) {
  const d = useMemo(() => {
    const pts = strokesFromPath(EQ_PATH, 179, 2)[0];
    return outline(pts, (t) => 2.4 + 12.5 * Math.exp(-(((t - 0.42) / 0.17) ** 2)) + 1.6 * t);
  }, []);
  const s = h / EQ_H;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${f1(s * 1000) / 1000})`}>
      <path d={d} fill={color} />
      <path d={circlePath(38, 117, 7.5)} fill={dot} />
    </g>
  );
}

const SERIF = "'Cormorant Garamond'";

function measureEditorial(brand: string, layout: 'stacked' | 'line') {
  const { words, question } = splitBrand(brand);
  const pad = 20;
  if (layout === 'line' || words.length < 2) {
    const joined = words.join(' ').toLowerCase();
    const text = joined.charAt(0).toUpperCase() + joined.slice(1);
    const size = 150;
    const tw = measure(text, { family: SERIF, size, weight: 300, italic: true });
    const qh = size * 0.72;
    const W = pad * 2 + tw + (question ? (EQ_W * qh) / EQ_H + 26 : 0);
    return { kind: 'line' as const, text, size, tw, qh, W, H: size * 1.08 + pad * 2, pad, question };
  }
  const small = words[0].toUpperCase();
  const big = titleCase(words.slice(1).join(' '));
  const bs = 190;
  const ss = 40;
  const tw = measure(big, { family: SERIF, size: bs, weight: 300, italic: true });
  const sw = measure(small, { family: SERIF, size: ss, weight: 500, tracking: ss * 0.42 });
  const qh = bs * 0.78;
  const W = pad * 2 + Math.max(tw, sw + 60) + (question ? (EQ_W * qh) / EQ_H + 18 : 0);
  return { kind: 'stacked' as const, small, big, bs, ss, tw, sw, qh, W, H: pad * 2 + ss + 18 + bs * 0.92, pad, question };
}

export const editorialAspect = (brand: string, layout: 'stacked' | 'line') => {
  const m = measureEditorial(brand, layout);
  return m.H / m.W;
};

function EditorialLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  useUid();
  const { base, question } = splitBrand(brand);

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 200 260" x={x} y={y} width={width ?? 200} height={height ?? 260}>
        <rect x={10} y={10} width={180} height={240} fill="none" stroke={tone.fg} strokeWidth={2} />
        <rect x={18} y={18} width={164} height={224} fill="none" stroke={tone.fg} strokeWidth={0.8} />
        <ContrastQ x={62} y={58} h={150} color={tone.fg} dot={tone.accent} />
        <text x={100} y={232} textAnchor="middle" fontFamily={FONT.serif} fontSize={13} fontWeight={500} letterSpacing={5} fill={tone.fg}>
          N°
        </text>
      </svg>
    );
  }

  if (variant === 'secondary') {
    const size = 46;
    const tr = size * 0.36;
    const tw = measure(base.toUpperCase(), { family: SERIF, size, weight: 500, tracking: tr });
    const W = tw + (question ? 56 : 0) + 40;
    return (
      <svg viewBox={`0 0 ${f1(W)} 100`} x={x} y={y} width={width ?? W} height={height ?? 100}>
        <line x1={20} x2={W - 20} y1={14} y2={14} stroke={tone.fg} strokeWidth={1} />
        <text x={20} y={66} fontFamily={FONT.serif} fontSize={size} fontWeight={500} letterSpacing={tr} fill={tone.fg}>
          {base.toUpperCase()}
        </text>
        {question && <ContrastQ x={20 + tw + 22} y={30} h={38} color={tone.fg} dot={tone.accent} />}
        <line x1={20} x2={W - 20} y1={86} y2={86} stroke={tone.fg} strokeWidth={1} />
      </svg>
    );
  }

  const m = measureEditorial(brand, layout);
  return (
    <svg viewBox={`0 0 ${f1(m.W)} ${f1(m.H)}`} x={x} y={y} width={width ?? m.W} height={height ?? m.H}>
      {m.kind === 'line' ? (
        <>
          <text x={m.pad} y={m.pad + m.size * 0.8} fontFamily={FONT.serif} fontStyle="italic" fontWeight={300} fontSize={m.size} fill={tone.fg}>
            {m.text}
          </text>
          {m.question && <ContrastQ x={m.pad + m.tw + 20} y={m.pad + m.size * 0.8 - m.qh * 0.94} h={m.qh} color={tone.fg} dot={tone.accent} />}
        </>
      ) : (
        <>
          <text x={m.pad + 6} y={m.pad + m.ss * 0.8} fontFamily={FONT.serif} fontWeight={500} fontSize={m.ss} letterSpacing={m.ss * 0.42} fill={tone.fg}>
            {m.small}
          </text>
          <line x1={m.pad + m.sw + 24} x2={m.pad + m.tw} y1={m.pad + m.ss * 0.5} y2={m.pad + m.ss * 0.5} stroke={tone.fg} strokeWidth={1.2} />
          <text x={m.pad - 4} y={m.pad + m.ss + 18 + m.bs * 0.7} fontFamily={FONT.serif} fontStyle="italic" fontWeight={300} fontSize={m.bs} fill={tone.fg}>
            {m.big}
          </text>
          {m.question && <ContrastQ x={m.pad + m.tw + 14} y={m.pad + m.ss + 18 + m.bs * 0.7 - m.qh * 0.94} h={m.qh} color={tone.fg} dot={tone.accent} />}
        </>
      )}
    </svg>
  );
}

function EditorialPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const tone: Tone = { fg: colors.fg, accent: colors.accent };
  const sig = lines(content.signature);
  const man = lines(content.manifesto);
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const M = 70;
  const s = settings.logoScale;
  const fg = colors.fg;
  const mono = { fontFamily: FONT.mono, fill: fg } as const;
  const year = yearOf(content.date);
  const split = settings.infoLayout === 'split';

  const logo = (xx: number, yy: number, maxW: number) => {
    if (settings.titleLayout === 'symbol') {
      const h = 330 * s;
      return (
        <>
          <EditorialLogo variant="symbol" brand={content.brand} tone={tone} x={xx} y={yy} width={(h * 200) / 260} height={h} />
          <EditorialLogo variant="secondary" brand={content.brand} tone={tone} x={xx + (h * 200) / 260 + 30} y={yy + h - 90} width={Math.min(maxW - (h * 200) / 260 - 30, 420)} height={80} />
        </>
      );
    }
    const lay = settings.titleLayout === 'line' ? 'line' : 'stacked';
    const w = maxW * s;
    return <EditorialLogo variant="primary" brand={content.brand} tone={tone} layout={lay} x={xx} y={yy} width={w} height={w * editorialAspect(content.brand, lay)} />;
  };

  const masthead = (
    <g>
      <line x1={M} x2={W - M} y1={M} y2={M} stroke={fg} strokeWidth={2} />
      <text x={M} y={M + 30} {...mono} fontSize={13} letterSpacing={3}>
        N° {content.editionNumber}
      </text>
      <text x={W / 2} y={M + 30} textAnchor="middle" {...mono} fontSize={13} letterSpacing={3}>
        {content.edition}
      </text>
      <text x={W - M} y={M + 30} textAnchor="end" {...mono} fontSize={13} letterSpacing={3}>
        {year || content.date}
      </text>
      <line x1={M} x2={W - M} y1={M + 46} y2={M + 46} stroke={fg} strokeWidth={0.8} />
    </g>
  );

  const plate = (x: number, y: number, w: number, h: number) =>
    settings.photo ? (
      <g>
        <Photo x={x} y={y} width={w} height={h} kind="stage" src={photoSrc} shadow={colors.ink} light={colors.paper} grain={0.35 + settings.texture * 0.4} />
        <text x={x} y={y + h + 24} fontFamily={FONT.serif} fontStyle="italic" fontSize={17} fill={fg}>
          Fig. {content.editionNumber} — {sig[sig.length - 1]?.toLowerCase()}
        </text>
      </g>
    ) : (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="none" stroke={fg} strokeWidth={0.8} />
        <ContrastQ x={x + w / 2 - (h * 0.82 * EQ_W) / EQ_H / 2} y={y + h * 0.09} h={h * 0.82} color={colors.accent} dot={fg} />
      </g>
    );

  const contents = (x: number, y: number, w: number, rowH: number, nameSize: number) => (
    <g>
      <text x={x} y={y} fontFamily={FONT.serif} fontStyle="italic" fontSize={34} fill={fg}>
        {titleCase(content.lineupTitle)}
      </text>
      <line x1={x} x2={x + w} y1={y + 18} y2={y + 18} stroke={fg} strokeWidth={0.8} />
      {content.lineup.map((a, i) => {
        const yy = y + 18 + rowH * (i + 0.72);
        const detW = measure(a.detail, { family: SERIF, size: 20, italic: true });
        const size = fitMeasured(a.name, w - 70 - detW - 40, { family: SERIF, size: nameSize, weight: 500, tracking: 2 });
        const nameW = measure(a.name, { family: SERIF, size, weight: 500, tracking: 2 });
        return (
          <g key={a.id}>
            <text x={x} y={yy} {...mono} fontSize={12} fill={colors.accent === colors.ink ? fg : colors.accent}>
              {String(i + 1).padStart(2, '0')}
            </text>
            <text x={x + 46} y={yy} fontFamily={FONT.serif} fontWeight={500} fontSize={size} letterSpacing={2} fill={fg}>
              {a.name}
            </text>
            <line x1={x + 46 + nameW + 14} x2={x + w - detW - 14} y1={yy - 4} y2={yy - 4} stroke={fg} strokeWidth={1} strokeDasharray="1 6" strokeLinecap="round" />
            <text x={x + w} y={yy} textAnchor="end" fontFamily={FONT.serif} fontStyle="italic" fontSize={20} fill={fg}>
              {a.detail.toLowerCase()}
            </text>
            <line x1={x} x2={x + w} y1={yy + rowH * 0.28} y2={yy + rowH * 0.28} stroke={fg} strokeWidth={0.4} opacity={0.6} />
          </g>
        );
      })}
    </g>
  );

  const colophon = (y: number) => (
    <g>
      <line x1={M} x2={W - M} y1={y} y2={y} stroke={fg} strokeWidth={2} />
      <text x={M} y={y + 36} fontFamily={FONT.serif} fontWeight={500} fontSize={fitMeasured(content.date, 300, { family: SERIF, size: 28, weight: 500 })} fill={fg}>
        {content.date}
      </text>
      <text x={W / 2} y={y + 36} textAnchor="middle" {...mono} fontSize={13} letterSpacing={3}>
        {content.venue}
      </text>
      <text x={W - M} y={y + 36} textAnchor="end" {...mono} fontSize={Math.min(12, (260 / Math.max(1, content.pillars.length)) * 1.6)} letterSpacing={2}>
        {content.pillars}
      </text>
      {content.mentions && (
        <text x={W / 2} y={y + 64} textAnchor="middle" {...mono} fontSize={10.5} letterSpacing={2} opacity={0.75}>
          {content.mentions}
        </text>
      )}
    </g>
  );

  if (sq) {
    return (
      <Artboard format={format} colors={colors} texture={settings.texture * 0.7} label={`${content.brand} — carré`}>
        {masthead}
        {logo(M - 20, 150, 540)}
        <Lines x={W - M} y={190} anchor="end" lines={sig} lh={26} fontFamily={FONT.serif} fontWeight={500} fontSize={17} letterSpacing={3} fill={fg} />
        {plate(620, 300, 310, 420)}
        {contents(M, 520, 500, 64, 26)}
        <Lines x={M} y={790} lines={man} lh={22} fontFamily={FONT.serif} fontStyle="italic" fontSize={19} fill={fg} />
        {colophon(880)}
      </Artboard>
    );
  }

  return (
    <Artboard format={format} colors={colors} texture={settings.texture * 0.7} label={`${content.brand} — affiche`}>
      {masthead}
      {logo(M - 20, 170, 760)}
      <line x1={W - M} x2={W - M} y1={170} y2={440} stroke={fg} strokeWidth={0.8} />
      <Lines x={W - M} y={490} anchor="end" lines={sig} lh={28} fontFamily={FONT.serif} fontWeight={500} fontSize={18} letterSpacing={3.5} fill={fg} />
      {split ? (
        <>
          {plate(M, 640, 500, 560)}
          <text x={620} y={668} fontFamily={FONT.serif} fontStyle="italic" fontSize={34} fill={fg}>
            {titleCase(content.lineupTitle)}
          </text>
          <line x1={620} x2={W - M} y1={686} y2={686} stroke={fg} strokeWidth={0.8} />
          {content.lineup.map((a, i) => (
            <g key={a.id}>
              <text x={620} y={760 + i * 132} {...mono} fontSize={12} fill={colors.accent === colors.ink ? fg : colors.accent}>
                {String(i + 1).padStart(2, '0')}
              </text>
              <text x={620} y={800 + i * 132} fontFamily={FONT.serif} fontWeight={500} fontSize={fitMeasured(a.name, 310, { family: SERIF, size: 36, weight: 500, tracking: 2 })} letterSpacing={2} fill={fg}>
                {a.name}
              </text>
              <text x={620} y={830 + i * 132} fontFamily={FONT.serif} fontStyle="italic" fontSize={21} fill={fg}>
                {a.detail.toLowerCase()}
              </text>
            </g>
          ))}
          <Lines x={620} y={1170} lines={man} lh={24} fontFamily={FONT.serif} fontStyle="italic" fontSize={19} fill={fg} opacity={0.85} />
        </>
      ) : (
        <>
          {plate(M + 150, 610, 560, 380)}
          {contents(M, 1080, W - 2 * M, 80, 38)}
        </>
      )}
      {colophon(H - 150)}
    </Artboard>
  );
}

export const editorial: ConceptDef = {
  id: 'editorial',
  index: '03',
  name: 'Editorial Luxe',
  short: 'Revue, grille, silence',
  description: 'Une couverture de revue indépendante : grille, filets, sérif à fort contraste et un « ? » dessiné à la main, posé en marge.',
  rationale: [
    'Le nom est composé comme un titre de revue : « UNE » en capitales espacées, « Autre » en italique léger, et un point d’interrogation dessiné pour la marque — délié très fin, panse pleine, point rond.',
    'Le symbole est un ex-libris au format de l’affiche (2:3) : un cadre double et le « ? ». Il signe les éditions comme une collection.',
    'L’affiche se lit comme un sommaire : numérotation, filets pointillés, légende de figure, colophon. Le luxe vient du silence et de la précision, pas de codes de mode.',
  ],
  base: { paper: '#f1ece2', ink: '#161513' },
  palette: [
    { name: 'Vélin', hex: '#f1ece2', role: 'Fond' },
    { name: 'Noir d’imprimerie', hex: '#161513', role: 'Texte' },
    { name: 'Carmin', hex: '#9e1b22', role: 'Numérotation, « ? »' },
    { name: 'Pierre', hex: '#b9ae9b', role: 'Filets secondaires' },
  ],
  typography: [
    { role: 'Titre', family: 'Cormorant Garamond', css: FONT.serif, italic: true, weight: 300, sample: 'Une autre', note: 'Italique léger, grand corps. « ? » dessiné sur mesure.' },
    { role: 'Capitales', family: 'Cormorant Garamond', css: FONT.serif, weight: 500, sample: 'MÊME LIEU', note: 'Capitales espacées (+0.2 em) pour signatures et noms.' },
    { role: 'Micro', family: 'IBM Plex Mono', css: FONT.mono, weight: 400, sample: 'N° 01 — 2025', note: 'Folio, numérotation, colophon.' },
  ],
  defaults: {
    accent: '#9e1b22',
    background: 'paper',
    titleLayout: 'stacked',
    logoScale: 1,
    texture: 0.3,
    photo: true,
    infoLayout: 'stack',
    format: 'portrait',
  },
  Logo: EditorialLogo,
  Poster: EditorialPoster,
};
