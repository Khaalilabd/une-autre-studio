import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { ADVANCE, fit, Lines, useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { layoutBlocks } from '../lib/blockFont';
import { FONT } from '../lib/fonts';
import { f1, hashString, rng } from '../lib/rng';

/** Block lettering ("Bloc" alphabet). `cell` = size of one module in px; cap height = 7 cells. */
function BlockText({ text, x, y, cell, fill, misreg, rotate = 0 }: { text: string; x: number; y: number; cell: number; fill: string; misreg?: string; rotate?: number }) {
  const { rects } = layoutBlocks(text);
  const body = rects.map((r) => `M${f1(r.x * cell)} ${f1(r.y * cell)}h${f1(r.w * cell + 0.4)}v${f1(r.h * cell + 0.4)}h${f1(-r.w * cell - 0.4)}Z`).join('');
  return (
    <g transform={`translate(${f1(x)} ${f1(y)})${rotate ? ` rotate(${rotate})` : ''}`}>
      {misreg && <path d={body} fill={misreg} transform={`translate(${f1(cell * 0.32)} ${f1(cell * 0.22)})`} />}
      <path d={body} fill={fill} />
    </g>
  );
}

const blockW = (text: string, cell: number) => layoutBlocks(text).width * cell;

function BrutalLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  useUid();
  const { words, question, base } = splitBrand(brand);
  const c = 20;

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 240 240" x={x} y={y} width={width ?? 240} height={height ?? 240}>
        <rect x={8} y={8} width={224} height={224} fill="none" stroke={tone.fg} strokeWidth={16} />
        <BlockText text="?" x={60} y={50} cell={20} fill={tone.fg} />
        <rect x={80} y={170} width={20} height={20} fill={tone.accent} />
      </svg>
    );
  }

  if (variant === 'secondary') {
    const size = 84;
    const tw = base.length * size * ADVANCE.condensed + base.length * 2;
    const W = tw + (question ? 70 : 0) + 30;
    return (
      <svg viewBox={`0 0 ${f1(W)} 120`} x={x} y={y} width={width ?? W} height={height ?? 120}>
        <rect x={0} y={0} width={W} height={12} fill={tone.fg} />
        <text x={0} y={108} fontFamily={FONT.condensed} fontSize={size} letterSpacing={2} fill={tone.fg} textLength={tw} lengthAdjust="spacingAndGlyphs">
          {base.toUpperCase()}
        </text>
        {question && (
          <text x={tw + 16} y={108} fontFamily={FONT.condensed} fontSize={size} fill={tone.accent}>
            ?
          </text>
        )}
      </svg>
    );
  }

  if (layout === 'line' || words.length < 2) {
    const tw = blockW(base, c);
    const W = tw + (question ? c * 6 : 0) + c * 2;
    return (
      <svg viewBox={`0 0 ${f1(W)} ${c * 10}`} x={x} y={y} width={width ?? W} height={height ?? c * 10}>
        <BlockText text={base} x={c} y={c * 2} cell={c} fill={tone.fg} misreg={tone.accent} />
        {question && <BlockText text="?" x={tw + c * 2.5} y={c * 2} cell={c} fill={tone.accent} />}
      </svg>
    );
  }

  const l1 = words[0];
  const l2 = words.slice(1).join(' ');
  const w = Math.max(blockW(l1, c), blockW(l2, c));
  const qc = c * 2.2;
  const W = c + w + (question ? c + 4 * qc : 0) + c;
  const Hh = c * 2 + c * 15 + c * 2;
  return (
    <svg viewBox={`0 0 ${f1(W)} ${f1(Hh)}`} x={x} y={y} width={width ?? W} height={height ?? Hh}>
      <BlockText text={l1} x={c} y={c * 2} cell={c} fill={tone.fg} misreg={tone.accent} />
      <BlockText text={l2} x={c} y={c * 10} cell={c} fill={tone.fg} misreg={tone.accent} />
      {question && <BlockText text="?" x={c * 2 + w} y={c * 2} cell={qc} fill={tone.accent} />}
    </svg>
  );
}

function RegMark({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={color} strokeWidth={1.5} fill="none">
      <circle cx={x} cy={y} r={9} />
      <path d={`M${x - 15} ${y}h30M${x} ${y - 15}v30`} />
    </g>
  );
}

function Barcode({ x, y, w, h, seed, color }: { x: number; y: number; w: number; h: number; seed: string; color: string }) {
  const r = rng(hashString(seed));
  const bars: { x: number; w: number }[] = [];
  let p = 0;
  while (p < w) {
    const bw = 1 + Math.floor(r() * 4) * 1.6;
    if (r() > 0.4) bars.push({ x: p, w: bw });
    p += bw + 1 + r() * 4;
  }
  return (
    <g fill={color}>
      {bars.map((b, i) => (
        <rect key={i} x={x + b.x} y={y} width={b.w} height={h} />
      ))}
    </g>
  );
}

function Scanlines({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const id = useUid('scan');
  return (
    <g>
      <defs>
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="2.2" fill={color} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} opacity={0.55} />
    </g>
  );
}

function BrutalPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const tone: Tone = { fg: colors.fg, accent: colors.accent };
  const { words, question, base } = splitBrand(content.brand);
  const { head, tail } = splitDate(content.date);
  const sq = format === 'square';
  const W = 1000;
  const H = sq ? 1000 : 1500;
  const fg = colors.fg;
  const bg = colors.bg;
  const s = settings.logoScale;
  const accentQ = question ? colors.accent : fg;
  const split = settings.infoLayout === 'split';
  const man = lines(content.manifesto);
  const cond = { fontFamily: FONT.condensed, fill: fg } as const;
  const mono = { fontFamily: FONT.mono, fill: fg } as const;
  const l1 = words[0];
  const l2 = words.slice(1).join(' ') || words[0];

  const lineupBlock = (x: number, y: number, w: number, boxed: boolean, nameSize: number) => (
    <g>
      {boxed && <rect x={x} y={y} width={w} height={70 + content.lineup.length * (nameSize + 46)} fill="none" stroke={fg} strokeWidth={6} />}
      <rect x={x} y={y} width={Math.min(w, 190)} height={40} fill={fg} />
      <text x={x + 14} y={y + 29} fontFamily={FONT.mono} fontWeight={500} fontSize={18} letterSpacing={3} fill={bg}>
        {content.lineupTitle}
      </text>
      {content.lineup.map((a, i) => {
        const yy = y + 60 + nameSize + i * (nameSize + 46);
        return (
          <g key={a.id}>
            <text x={x + (boxed ? 20 : 0)} y={yy} {...cond} fontSize={fit(a.name, w - 40, nameSize, ADVANCE.condensed)}>
              {a.name}
            </text>
            <text x={x + (boxed ? 22 : 2)} y={yy + 28} {...mono} fontSize={15} letterSpacing={2}>
              ↳ {a.detail}
            </text>
          </g>
        );
      })}
    </g>
  );

  const footerBar = (
    <g>
      <rect x={0} y={H - 84} width={W} height={84} fill={fg} />
      <text x={40} y={H - 30} fontFamily={FONT.condensed} fontSize={fit(content.venue, 520, 44, ADVANCE.condensed)} fill={bg} letterSpacing={1}>
        {content.venue}
      </text>
      <text x={W - 40} y={H - 34} textAnchor="end" fontFamily={FONT.mono} fontSize={fit(content.pillars, 380, 14, ADVANCE.mono, 2)} letterSpacing={2} fill={bg}>
        {content.pillars}
      </text>
    </g>
  );

  const photoBlock = (x: number, y: number, w: number, h: number) =>
    settings.photo ? (
      <g>
        <Photo x={x} y={y} width={w} height={h} kind="crowd" src={photoSrc} shadow={colors.ink} light={colors.background === 'paper' ? colors.paper : colors.accent === colors.ink ? colors.paper : colors.accent} grain={0.6} />
        <Scanlines x={x} y={y} w={w} h={h} color={colors.ink} />
        <rect x={x} y={y} width={w} height={h} fill="none" stroke={fg} strokeWidth={6} />
      </g>
    ) : (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={fg} />
        <Lines x={x + 20} y={y + 50} lines={man} lh={40} fontFamily={FONT.condensed} fontSize={fit(man[0] ?? '', w - 40, 36, ADVANCE.condensed)} fill={bg} />
      </g>
    );

  if (sq) {
    const c = Math.min(26, 560 / Math.max(1, layoutBlocks(l2).width)) * s;
    return (
      <Artboard format={format} colors={colors} texture={settings.texture} label={`${content.brand} — carré`}>
        <BlockText text="?" x={620} y={110} cell={86} fill={accentQ} />
        {settings.titleLayout !== 'symbol' ? (
          <>
            <BlockText text={l1} x={40} y={50} cell={c} fill={fg} misreg={colors.accent} />
            <BlockText text={l2} x={40} y={50 + c * 8} cell={c} fill={fg} misreg={colors.accent} />
          </>
        ) : (
          <BrutalLogo variant="secondary" brand={content.brand} tone={tone} x={40} y={60} width={520} height={120} />
        )}
        <RegMark x={960} y={40} color={fg} />
        {lineupBlock(40, 520, 520, split, 46)}
        <text x={W - 40} y={H - 120} textAnchor="end" {...cond} fontSize={fit(head, 300, 170, ADVANCE.condensed)}>
          {head}
        </text>
        <text x={W - 40} y={H - 104} textAnchor="end" {...mono} fontSize={14} letterSpacing={3}>
          {tail} — {content.edition}
        </text>
        {footerBar}
      </Artboard>
    );
  }

  const layout = settings.titleLayout;
  // vertical band: second word rotated along the left edge
  const bandCells = layoutBlocks(l2).width;
  const vc = Math.min(64, 1320 / Math.max(1, bandCells)) * s;
  return (
    <Artboard format={format} colors={colors} texture={settings.texture} label={`${content.brand} — affiche`}>
      <RegMark x={40} y={40} color={fg} />
      <RegMark x={960} y={40} color={fg} />
      {layout === 'stacked' && (
        <>
          <BlockText text={l2} x={40} y={H - 110} cell={vc} fill={fg} misreg={colors.accent} rotate={-90} />
          <BlockText text={l1} x={40 + vc * 7 + 40} y={70} cell={Math.min(34, 470 / Math.max(1, layoutBlocks(l1).width))} fill={fg} misreg={colors.accent} />
          <BlockText text="?" x={40 + vc * 7 + 40} y={340} cell={60} fill={accentQ} />
          <text x={W - 40} y={530} textAnchor="end" {...cond} fontSize={fit(head, 240, 230, ADVANCE.condensed)}>
            {head}
          </text>
          <Lines x={W - 40} y={570} anchor="end" lines={tail.split(' ')} lh={30} {...mono} fontSize={22} letterSpacing={3} />
          <Barcode x={W - 220} y={650} w={180} h={50} seed={content.brand + content.date} color={fg} />
          {split ? (
            <>
              {lineupBlock(40 + vc * 7 + 40, 800, W - 80 - vc * 7 - 40, true, 50)}
              {photoBlock(40 + vc * 7 + 40, 1170, W - 80 - vc * 7 - 40, 196)}
            </>
          ) : (
            <>
              {photoBlock(40 + vc * 7 + 40, 790, W - 80 - vc * 7 - 40, 240)}
              {lineupBlock(40 + vc * 7 + 40, 1070, W - 80 - vc * 7 - 40, false, 56)}
            </>
          )}
        </>
      )}
      {layout === 'line' && (
        <>
          <BlockText text={base} x={40} y={90} cell={Math.min(40, 920 / Math.max(1, layoutBlocks(base).width)) * s} fill={fg} misreg={colors.accent} />
          <BlockText text="?" x={560} y={430} cell={88} fill={accentQ} />
          <text x={40} y={640} {...cond} fontSize={fit(head, 480, 300, ADVANCE.condensed)}>
            {head}
          </text>
          <text x={46} y={690} {...mono} fontSize={22} letterSpacing={4}>
            {tail}
          </text>
          {lineupBlock(40, 1060, split ? 450 : 920, split, 50)}
          {split ? photoBlock(520, 1060, 440, 330) : photoBlock(40, 760, 470, 260)}
        </>
      )}
      {layout === 'symbol' && (
        <>
          <BlockText text="?" x={500 - 220 * s} y={70} cell={110 * s} fill={accentQ} />
          <BrutalLogo variant="secondary" brand={content.brand} tone={tone} x={40} y={880} width={600} height={140} />
          <text x={W - 40} y={1010} textAnchor="end" {...cond} fontSize={fit(head, 300, 150, ADVANCE.condensed)}>
            {head}
          </text>
          <text x={W - 40} y={1044} textAnchor="end" {...mono} fontSize={16} letterSpacing={3}>
            {tail}
          </text>
          {lineupBlock(40, 1080, split ? 560 : 920, split, 44)}
          {split && photoBlock(630, 1080, 330, 300)}
        </>
      )}
      <text x={W - 40} y={H - 104} textAnchor="end" {...mono} fontSize={13} letterSpacing={3}>
        {content.edition} / N°{content.editionNumber}
      </text>
      {content.mentions && (
        <text x={40} y={H - 104} {...mono} fontSize={12} letterSpacing={2}>
          {content.mentions}
        </text>
      )}
      {footerBar}
    </Artboard>
  );
}

export const brutalist: ConceptDef = {
  id: 'brutalist',
  index: '04',
  name: 'Brutalist Culture',
  short: 'Masse, bloc, impression',
  description: 'Lettres modulaires massives, contre-typage rouge décalé, cadres épais et repères d’impression. Lisible à vingt mètres.',
  rationale: [
    'Le nom est construit avec « Bloc », un alphabet modulaire dessiné sur une grille de 7 modules : aucun caractère n’est une police, tout est rectangle.',
    'Un double rouge décalé simule un repérage d’impression raté : l’imperfection devient la signature, comme un tirage sérigraphié.',
    'L’affiche est asymétrique : le deuxième mot est couché sur toute la hauteur, le « ? » rouge occupe la zone d’impact, l’information est enfermée dans des cadres épais.',
  ],
  base: { paper: '#ebe6dc', ink: '#0f0f0f' },
  palette: [
    { name: 'Béton clair', hex: '#ebe6dc', role: 'Fond' },
    { name: 'Noir', hex: '#0f0f0f', role: 'Masse, cadres' },
    { name: 'Rouge repérage', hex: '#d1121c', role: '« ? », décalage' },
  ],
  typography: [
    { role: 'Logo', family: 'Bloc', css: '', sample: 'UNE AUTRE ?', note: 'Alphabet modulaire original, 7 modules de haut.', custom: true },
    { role: 'Titres', family: 'Anton', css: FONT.condensed, weight: 400, sample: 'RAYHANE 12', note: 'Condensée, compacte, pour les noms et chiffres.' },
    { role: 'Infos', family: 'IBM Plex Mono', css: FONT.mono, weight: 500, sample: '↳ B2B LUIGI', note: 'Étiquettes, mentions, renvois.' },
  ],
  defaults: {
    accent: '#d1121c',
    background: 'paper',
    titleLayout: 'stacked',
    logoScale: 1,
    texture: 0.4,
    photo: true,
    infoLayout: 'split',
    format: 'portrait',
  },
  Logo: BrutalLogo,
  Poster: BrutalPoster,
};
