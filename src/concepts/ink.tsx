import { useMemo } from 'react';
import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { ADVANCE, fit, Lines, useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { brushSwash, circlePath, nibStrokes, splatter } from '../lib/brush';
import { FONT } from '../lib/fonts';
import type { Pt } from '../lib/pathSample';
import { f1, hashString, rng } from '../lib/rng';
import { layoutStroke } from '../lib/strokeFont';

/* ------------------------------------------------------------------ */
/* Brush lettering primitives                                          */
/* ------------------------------------------------------------------ */

const NIB = 32;
const SLANT = -9;
const TRACK = 30;
/** Gestural question mark, drawn for the brand (box 110 × 180). */
const Q_PATH = 'M8 46C4 18 26 2 54 2C84 2 104 22 102 50C100 76 72 84 62 104C57 114 56 124 58 134';
const Q_W = 110;
const Q_H = 180;

const wordWidth = (text: string, size: number) => (layoutStroke(text, TRACK, 50).width * size) / 100 + size * 0.2;

function BrushWord({ text, x, y, size, fill, seed, weight = 21 }: { text: string; x: number; y: number; size: number; fill: string; seed: number; weight?: number }) {
  const glyphs = useMemo(() => {
    const r = rng(seed);
    return layoutStroke(text, TRACK, 50).glyphs.map((g, i) => ({
      x: g.x,
      w: g.w,
      d: nibStrokes(g.d, weight, NIB, seed + i * 7).join(''),
      rot: (r() - 0.5) * 5,
      dy: (r() - 0.5) * 7,
    }));
  }, [text, seed, weight]);
  return (
    <g transform={`translate(${f1(x + size * 0.16)} ${f1(y)}) scale(${size / 100}) skewX(${SLANT})`} fill={fill}>
      {glyphs.map((g, i) => (
        <path key={i} d={g.d} transform={`translate(${g.x} ${g.dy}) rotate(${f1(g.rot)} ${g.w / 2} 50)`} />
      ))}
    </g>
  );
}

function BrushQ({ x, y, h, fg, accent, seed, splash = true }: { x: number; y: number; h: number; fg: string; accent: string; seed: number; splash?: boolean }) {
  const shape = useMemo(() => {
    const body = nibStrokes(Q_PATH, 30, 38, seed, 0.22).join('');
    const drops = splash ? splatter(60, 166, 46, 22, seed + 3, 0.7) : [];
    return { body, drops };
  }, [seed, splash]);
  const s = h / Q_H;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${s})`}>
      <path d={shape.body} fill={fg} />
      <path d={circlePath(60, 166, 13.5)} fill={accent} />
      <g fill={accent}>
        {shape.drops.map((d, i) => (
          <ellipse key={i} cx={f1(d.x)} cy={f1(d.y)} rx={f1(d.rx * 0.6)} ry={f1(d.ry * 0.6)} transform={`rotate(${f1(d.rot)} ${f1(d.x)} ${f1(d.y)})`} />
        ))}
      </g>
    </g>
  );
}

function Swash({ ctrl, width, seed, fill, gap, opacity = 1 }: { ctrl: Pt[]; width: number; seed: number; fill: string; gap: string; opacity?: number }) {
  const key = JSON.stringify(ctrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const s = useMemo(() => brushSwash(ctrl, width, seed, { rough: 0.3, streaks: 7, taperOut: 0.22 }), [key, width, seed]);
  return (
    <g opacity={opacity}>
      <path d={s.body} fill={fill} />
      <g fill="none" stroke={gap} strokeLinecap="round">
        {s.streaks.map((st, i) => (
          <path key={i} d={st.d} strokeWidth={st.w} strokeDasharray={st.dash} />
        ))}
      </g>
    </g>
  );
}

function InkRough({ id, amount = 3.5 }: { id: string; amount?: number }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={4} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={amount} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

/** Ensō-like open brush circle used by the symbol. */
function ensoCtrl(cx: number, cy: number, r: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI * 0.35 + (i / 10) * Math.PI * 1.78;
    const rr = r * (1 + Math.sin(i * 1.7) * 0.03);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* Logo system                                                         */
/* ------------------------------------------------------------------ */

function measureInk(brand: string, layout: 'stacked' | 'line') {
  const { words, question } = splitBrand(brand);
  const pad = 46;
  if (layout === 'line' || words.length < 2) {
    const text = words.join(' ');
    const w = wordWidth(text, 100);
    const qh = 150;
    const qw = question ? (Q_W * qh) / Q_H + 20 : 0;
    return { kind: 'line' as const, text, w, qh, width: pad * 2 + w + qw, height: pad * 2 + 140, pad, question };
  }
  const l1 = words[0];
  const l2 = words.slice(1).join(' ');
  const s1 = 56;
  const w1 = wordWidth(l1, s1);
  const w2 = wordWidth(l2, 100);
  const qh = 214;
  const qw = question ? (Q_W * qh) / Q_H + 24 : 0;
  return { kind: 'stacked' as const, l1, l2, s1, w1, w2, qh, width: pad * 2 + Math.max(w1, w2) + qw, height: pad * 2 + s1 + 26 + 100 + 30, pad, question };
}

function InkLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const id = useUid('ink');
  const seed = hashString(brand) % 1000;
  const swash = useMemo(() => ensoCtrl(130, 130, 104), []);

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 260 260" x={x} y={y} width={width ?? 260} height={height ?? 260}>
        <defs>
          <InkRough id={id + 'r'} />
        </defs>
        <g filter={`url(#${id}r)`}>
          <Swash ctrl={swash} width={22} seed={seed + 2} fill={tone.fg} gap="transparent" />
          <BrushQ x={86} y={52} h={150} fg={tone.fg} accent={tone.accent} seed={seed} splash={false} />
        </g>
      </svg>
    );
  }

  if (variant === 'secondary') {
    const { base, question } = splitBrand(brand);
    const lay = layoutStroke(base, 34, 56);
    const qx = lay.width + (question ? 50 : 0);
    const w = qx + (question ? 60 : 0) + 40;
    return (
      <svg viewBox={`-20 -40 ${w} 180`} x={x} y={y} width={width ?? w} height={height ?? 180}>
        <g fill="none" stroke={tone.fg} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
          {lay.glyphs.map((g, i) => (
            <path key={i} d={g.d} transform={`translate(${g.x} 0)`} />
          ))}
        </g>
        {question && (
          <g transform={`translate(${qx} 0)`}>
            <path d="M1 24C1 10 13 0 28 0C44 0 56 10 56 26C56 40 46 48 36 54C30 58 28 64 28 74" fill="none" stroke={tone.fg} strokeWidth={7} strokeLinecap="round" />
            <circle cx={28} cy={96} r={7.5} fill={tone.accent} />
          </g>
        )}
        <line x1={0} x2={w - 40} y1={124} y2={124} stroke={tone.fg} strokeWidth={1.2} />
      </svg>
    );
  }

  const m = measureInk(brand, layout);
  return (
    <svg viewBox={`0 0 ${f1(m.width)} ${f1(m.height)}`} x={x} y={y} width={width ?? m.width} height={height ?? m.height}>
      <defs>
        <InkRough id={id + 'r'} />
      </defs>
      <g filter={`url(#${id}r)`}>
        {m.kind === 'line' ? (
          <>
            <BrushWord text={m.text} x={m.pad} y={m.pad + 18} size={100} fill={tone.fg} seed={seed} />
            {m.question && <BrushQ x={m.pad + m.w + 14} y={m.pad - 18} h={m.qh} fg={tone.fg} accent={tone.accent} seed={seed + 1} />}
          </>
        ) : (
          <>
            <BrushWord text={m.l1} x={m.pad + 6} y={m.pad + 4} size={m.s1} fill={tone.fg} seed={seed} weight={23} />
            <BrushWord text={m.l2} x={m.pad} y={m.pad + m.s1 + 30} size={100} fill={tone.fg} seed={seed + 50} />
            {m.question && <BrushQ x={m.pad + Math.max(m.w1, m.w2) + 10} y={m.pad - 14} h={m.qh} fg={tone.fg} accent={tone.accent} seed={seed + 1} />}
          </>
        )}
      </g>
    </svg>
  );
}

const inkAspect = (brand: string, layout: 'stacked' | 'line') => {
  const m = measureInk(brand, layout);
  return m.height / m.width;
};

/* ------------------------------------------------------------------ */
/* Poster                                                              */
/* ------------------------------------------------------------------ */

/** Clip path with a ragged, torn top edge (local photo coordinates). */
function tornEdge(w: number, h: number, seed: number): string {
  const r = rng(seed);
  const n = 48;
  let d = `M-20 ${h + 20}`;
  for (let i = 0; i <= n; i++) d += `L${f1((i / n) * (w + 40) - 20)} ${f1(18 + (r() - 0.35) * 22 + Math.sin(i * 0.7) * 9)}`;
  return d + `L${w + 20} ${h + 20}Z`;
}

function InkPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const tone: Tone = { fg: colors.fg, accent: colors.accent };
  const sig = lines(content.signature);
  const man = lines(content.manifesto);
  const { head, tail } = splitDate(content.date);
  const seed = 17;
  const s = settings.logoScale;
  const isSquare = format === 'square';
  const W = 1000;
  const H = isSquare ? 1000 : 1500;
  const photo = settings.photo;
  const split = settings.infoLayout === 'split';
  const mono = { fontFamily: FONT.mono, fill: colors.fg };
  const swashFill = colors.background === 'accent' ? colors.ink : colors.fg;

  const logo = (maxW: number, xx: number, yy: number) => {
    if (settings.titleLayout === 'symbol') {
      const sz = Math.min(maxW, 420) * s;
      return (
        <>
          <InkLogo variant="symbol" brand={content.brand} tone={tone} x={xx} y={yy} width={sz} height={sz} />
          <InkLogo variant="secondary" brand={content.brand} tone={tone} x={xx + sz + 20} y={yy + sz * 0.62} width={Math.max(160, maxW - sz - 20)} height={70} />
        </>
      );
    }
    const lay = settings.titleLayout === 'line' ? 'line' : 'stacked';
    const w = maxW * s;
    return <InkLogo variant="primary" brand={content.brand} tone={tone} layout={lay} x={xx} y={yy} width={w} height={w * inkAspect(content.brand, lay)} />;
  };

  const lineup = (x: number, y: number, w: number, align: 'start' | 'end' | 'middle') => (
    <g>
      <text x={align === 'end' ? x + w : align === 'middle' ? x + w / 2 : x} y={y} textAnchor={align} {...mono} fontSize={15} letterSpacing={4}>
        {content.lineupTitle}
      </text>
      <line x1={x} x2={x + w} y1={y + 16} y2={y + 16} stroke={colors.fg} strokeWidth={1} />
      {content.lineup.map((a, i) => {
        const yy = y + 66 + i * 78;
        const tx = align === 'end' ? x + w : align === 'middle' ? x + w / 2 : x;
        return (
          <g key={a.id}>
            <text x={tx} y={yy} textAnchor={align} fontFamily={FONT.serif} fontWeight={600} fontSize={fit(a.name, w, 40, ADVANCE.serifCaps)} fill={colors.fg} letterSpacing={1}>
              {a.name}
            </text>
            <text x={tx} y={yy + 24} textAnchor={align} {...mono} fontSize={13} letterSpacing={2.5} opacity={0.85}>
              {a.detail}
            </text>
          </g>
        );
      })}
    </g>
  );

  if (isSquare) {
    const colX = photo ? 600 : W;
    return (
      <Artboard format={format} colors={colors} texture={settings.texture} label={`${content.brand} — affiche carrée`}>
        {photo && <Photo x={colX} y={0} width={W - colX} height={H} kind="palms" src={photoSrc} shadow={colors.ink} light={colors.paper} grain={0.5 + settings.texture * 0.5} clipPath={verticalTorn(H, W - colX, seed)} />}
        <text x={56} y={64} {...mono} fontSize={13} letterSpacing={3}>
          N° {content.editionNumber}
        </text>
        <text x={colX - 44} y={64} textAnchor="end" {...mono} fontSize={13} letterSpacing={3}>
          {content.edition}
        </text>
        <line x1={56} x2={colX - 44} y1={82} y2={82} stroke={colors.fg} strokeWidth={1} />
        {logo(colX - 100, 40, 110)}
        <Swash ctrl={[[30, 560], [220, 540], [420, 556], [colX - 10, 530]]} width={92} seed={seed + 4} fill={swashFill} gap={colors.bg} />
        <text x={70} y={566} fontFamily={FONT.mono} fontSize={fit(man.join(' · '), colX - 160, 15, ADVANCE.mono, 2)} letterSpacing={2} fill={colors.bg}>
          {man.join(' · ')}
        </text>
        {lineup(56, 650, colX - 110, 'start')}
        <text x={56} y={H - 56} fontFamily={FONT.serif} fontWeight={500} fontSize={42} fill={colors.fg}>
          {head} <tspan fontStyle="italic" fontWeight={400}>{tail.toLowerCase()}</tspan>
        </text>
        <text x={colX - 44} y={H - 62} textAnchor="end" {...mono} fontSize={13} letterSpacing={3}>
          {content.venue}
        </text>
      </Artboard>
    );
  }

  const photoTop = 1110;
  const infoY = photo ? 740 : 780;
  return (
    <Artboard format={format} colors={colors} texture={settings.texture} label={`${content.brand} — affiche`}>
      {/* masthead annotations */}
      <text x={60} y={66} {...mono} fontSize={14} letterSpacing={3}>
        N° {content.editionNumber}
      </text>
      <text x={500} y={66} textAnchor="middle" {...mono} fontSize={14} letterSpacing={3}>
        {content.coords || content.pillars}
      </text>
      <text x={940} y={66} textAnchor="end" {...mono} fontSize={14} letterSpacing={3}>
        {content.edition}
      </text>
      <line x1={60} x2={940} y1={86} y2={86} stroke={colors.fg} strokeWidth={1} />
      <line x1={60} x2={60} y1={86} y2={130} stroke={colors.fg} strokeWidth={1} />
      <line x1={940} x2={940} y1={86} y2={130} stroke={colors.fg} strokeWidth={1} />

      {logo(880, 50, 140)}

      {/* the big gesture */}
      <Swash ctrl={[[-30, 640], [260, 600], [560, 628], [820, 586], [1040, 600]]} width={118} seed={seed} fill={swashFill} gap={colors.bg} />
      <text x={90} y={624} fontFamily={FONT.mono} fontSize={fit(man.join('  ·  '), 700, 17, ADVANCE.mono, 3)} letterSpacing={3} fill={colors.bg}>
        {man.join('  ·  ')}
      </text>

      {split ? (
        <>
          <Lines x={60} y={infoY + 10} lines={sig} lh={44} fontFamily={FONT.serif} fontStyle="italic" fontSize={38} fill={colors.fg} />
          <path d={`M60 ${infoY + 170} h120`} stroke={colors.accent} strokeWidth={2} />
          <text x={60} y={infoY + 204} {...mono} fontSize={14} letterSpacing={3}>
            {content.pillars}
          </text>
          {lineup(560, infoY - 12, 380, 'end')}
        </>
      ) : (
        <>
          {lineup(200, infoY - 12, 600, 'middle')}
          <text x={500} y={infoY + 290} textAnchor="middle" fontFamily={FONT.serif} fontStyle="italic" fontSize={fit(sig.join(' — '), 860, 30, ADVANCE.serif)} fill={colors.fg}>
            {sig.join(' — ')}
          </text>
        </>
      )}

      {photo ? (
        <>
          <Photo x={0} y={photoTop} width={W} height={H - photoTop} kind="palms" src={photoSrc} shadow={colors.ink} light={colors.paper} grain={0.4 + settings.texture * 0.6} clipPath={tornEdge(W, H - photoTop, seed)} />
          <g>
            <text x={60} y={H - 60} fontFamily={FONT.serif} fontWeight={500} fontSize={64} fill={colors.paper}>
              {head}
            </text>
            <text x={60 + head.length * 36 + 18} y={H - 62} fontFamily={FONT.serif} fontStyle="italic" fontSize={40} fill={colors.paper}>
              {tail.toLowerCase()}
            </text>
            <text x={940} y={H - 64} textAnchor="end" fontFamily={FONT.mono} fontSize={15} letterSpacing={4} fill={colors.paper}>
              {content.venue}
            </text>
            <line x1={940} x2={940} y1={H - 200} y2={H - 92} stroke={colors.paper} strokeWidth={1} />
            <circle cx={940} cy={H - 206} r={5} fill={colors.accent === colors.ink ? colors.paper : colors.accent} />
          </g>
        </>
      ) : (
        <>
          <Swash ctrl={[[1040, 1180], [760, 1230], [520, 1205], [260, 1268], [-40, 1250]]} width={70} seed={seed + 9} fill={swashFill} gap={colors.bg} opacity={0.92} />
          <InkSplash x={820} y={1120} color={colors.accent} seed={seed} />
          <text x={60} y={H - 70} fontFamily={FONT.serif} fontWeight={500} fontSize={92} fill={colors.fg}>
            {head}
          </text>
          <text x={60 + head.length * 52 + 22} y={H - 74} fontFamily={FONT.serif} fontStyle="italic" fontSize={52} fill={colors.fg}>
            {tail.toLowerCase()}
          </text>
          <text x={940} y={H - 78} textAnchor="end" {...mono} fontSize={15} letterSpacing={4}>
            {content.venue}
          </text>
        </>
      )}
      {content.mentions && (
        <text x={500} y={H - 22} textAnchor="middle" fontFamily={FONT.mono} fontSize={11} letterSpacing={2} fill={photo ? colors.paper : colors.fg} opacity={0.8}>
          {content.mentions}
        </text>
      )}
    </Artboard>
  );
}

function verticalTorn(h: number, w: number, seed: number) {
  const r = rng(seed + 3);
  let d = `M${w + 20} -20L${w + 20} ${h + 20}L40 ${h + 20}`;
  const n = 36;
  for (let i = n; i >= 0; i--) d += `L${f1(30 + (r() - 0.4) * 30 + Math.sin(i * 0.8) * 10)} ${f1((i / n) * h)}`;
  return d + 'Z';
}

function InkSplash({ x, y, color, seed }: { x: number; y: number; color: string; seed: number }) {
  const drops = useMemo(() => splatter(x, y, 120, 46, seed + 21, 1.4), [x, y, seed]);
  return (
    <g fill={color}>
      {drops.map((d, i) => (
        <ellipse key={i} cx={f1(d.x)} cy={f1(d.y)} rx={f1(d.rx)} ry={f1(d.ry)} transform={`rotate(${f1(d.rot)} ${f1(d.x)} ${f1(d.y)})`} />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */

export const ink: ConceptDef = {
  id: 'ink',
  index: '01',
  name: 'Ink / Gesture',
  short: 'Encre, papier, geste',
  description: 'Lettrage au pinceau dessiné en code, point d’interrogation calligraphique, papier ivoire et photographie nocturne.',
  rationale: [
    'Le nom est écrit comme un geste : chaque lettre est un tracé au pinceau calculé à partir de l’alphabet squelette « Trajet », dessiné pour la marque et rendu avec une plume large (pleins et déliés selon la direction du trait).',
    'Le « ? » est la signature : un crochet calligraphique dont le point est une goutte d’encre rouge, seul moment de couleur.',
    'L’affiche fonctionne comme une page de carnet : annotations, fines lignes, grand aplat d’encre qui porte le manifeste, et une photographie de nuit déchirée en pied de page.',
  ],
  base: { paper: '#efe8da', ink: '#121110' },
  palette: [
    { name: 'Papier', hex: '#efe8da', role: 'Fond' },
    { name: 'Encre', hex: '#121110', role: 'Texte, gestes' },
    { name: 'Goutte', hex: '#b3121b', role: 'Point du « ? »' },
    { name: 'Sépia', hex: '#8a7c66', role: 'Texture, grain' },
  ],
  typography: [
    { role: 'Logo', family: 'Trajet Brush', css: '', sample: 'UNE AUTRE ?', note: 'Lettrage original : squelette dessiné + rendu plume large en SVG.', custom: true },
    { role: 'Titres secondaires', family: 'Cormorant Garamond', css: FONT.serif, italic: true, weight: 400, sample: 'Une autre expérience', note: 'Italique pour la signature, capitales 600 pour les noms.' },
    { role: 'Annotations', family: 'IBM Plex Mono', css: FONT.mono, weight: 400, sample: 'N° 01 — LINE UP', note: 'Coordonnées, mentions, numérotation.' },
  ],
  defaults: {
    accent: '#b3121b',
    background: 'paper',
    titleLayout: 'stacked',
    logoScale: 1,
    texture: 0.55,
    photo: true,
    infoLayout: 'split',
    format: 'portrait',
  },
  Logo: InkLogo,
  Poster: InkPoster,
};
