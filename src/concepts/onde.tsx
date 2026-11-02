import { useMemo } from 'react';
import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { questionField, ridgelines } from '../lib/generators';
import { fitMeasured } from '../lib/measure';
import { strokesFromPath } from '../lib/pathSample';
import { f1 } from '../lib/rng';
import { layoutStroke } from '../lib/strokeFont';

const SANS = "'General Sans'";

/** Trajet lettering whose centre-lines vibrate like a sound wave. */
function vibrating(text: string, amp = 7, freq = 0.11) {
  const lay = layoutStroke(text, 30, 50);
  const parts: string[] = [];
  for (const g of lay.glyphs) {
    for (const pts of strokesFromPath(g.d, 999, 2)) {
      parts.push(
        'M' +
          pts
            .map(([x, y]) => {
              const gx = x + g.x;
              return `${f1(gx)} ${f1(y + Math.sin(gx * freq) * amp * Math.sin((y / 100) * Math.PI))}`;
            })
            .join('L'),
      );
    }
  }
  return { d: parts.join(''), width: lay.width };
}

function MiniRidges({ x, y, w, h, color, accent, count = 16, seed = 5, sw = 2 }: { x: number; y: number; w: number; h: number; color: string; accent: string; count?: number; seed?: number; sw?: number }) {
  const data = useMemo(() => {
    const field = questionField(x + w / 2, y + h * 0.52, h * 0.82, w * 0.1);
    return ridgelines(x, w, y + h * 0.12, y + h * 0.95, count, (px, py) => 2 + h * 0.13 * field(px, py), seed, 90);
  }, [x, y, w, h, count, seed]);
  return (
    <g fill="none" strokeWidth={sw} strokeLinejoin="round">
      {data.map((r, i) => (
        <path key={i} d={r.line} stroke={i >= count - 3 ? accent : color} />
      ))}
    </g>
  );
}

function OndeLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const { words, question, base } = splitBrand(brand);

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 240 240" x={x} y={y} width={width ?? 240} height={height ?? 240}>
        <circle cx={120} cy={120} r={112} fill="none" stroke={tone.fg} strokeWidth={5} />
        <MiniRidges x={40} y={30} w={160} h={190} color={tone.fg} accent={tone.accent} count={14} sw={3.2} />
      </svg>
    );
  }

  if (variant === 'secondary') {
    const lay = layoutStroke(base + (question ? ' ?' : ''), 30, 50);
    const s = 0.6;
    const W = lay.width * s + 40;
    let sine = '';
    for (let i = 0; i <= 120; i++) sine += `${i ? 'L' : 'M'}${f1(20 + ((W - 40) * i) / 120)} ${f1(96 + Math.sin(i * 0.42) * 6 * Math.sin((i / 120) * Math.PI))}`;
    return (
      <svg viewBox={`0 0 ${f1(W)} 112`} x={x} y={y} width={width ?? W} height={height ?? 112}>
        <g transform={`translate(20 14) scale(${s})`} fill="none" stroke={tone.fg} strokeWidth={5 / s} strokeLinecap="round" strokeLinejoin="round">
          {lay.glyphs.map((g, i) => (
            <path key={i} d={g.d} transform={`translate(${g.x} 0)`} stroke={g.char === '?' ? tone.accent : tone.fg} />
          ))}
        </g>
        <path d={sine} fill="none" stroke={tone.accent} strokeWidth={2.4} />
      </svg>
    );
  }

  const stacked = layout !== 'line' && words.length > 1;
  const rows = stacked ? [vibrating(words[0], 5), vibrating(words.slice(1).join(' '), 7)] : [vibrating(base, 7)];
  const scales = stacked ? [0.62, 1] : [1];
  const textW = Math.max(...rows.map((r, i) => r.width * scales[i]));
  const qW = question ? (stacked ? 190 : 130) : 0;
  const H = stacked ? 260 : 160;
  const W = 30 + textW + (question ? 30 + qW : 0) + 30;
  return (
    <svg viewBox={`0 0 ${f1(W)} ${H}`} x={x} y={y} width={width ?? W} height={height ?? H}>
      {rows.map((r, i) => (
        <path
          key={i}
          d={r.d}
          transform={`translate(30 ${stacked ? (i ? 130 : 30) : 30}) scale(${scales[i]})`}
          fill="none"
          stroke={tone.fg}
          strokeWidth={10 / scales[i]}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {question && <MiniRidges x={30 + textW + 30} y={10} w={qW} h={H - 20} color={tone.fg} accent={tone.accent} count={stacked ? 18 : 13} sw={2.6} />}
    </svg>
  );
}

function OndePoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('onde');
  const tone: Tone = { fg: colors.fg, accent: colors.accent };
  const sq = format === 'square';
  const W = 1000;
  const fg = colors.fg;
  const s = settings.logoScale;
  const layout = settings.titleLayout;
  const split = settings.infoLayout === 'split';
  const { head, tail } = splitDate(content.date);
  const sig = lines(content.signature);
  const { question } = splitBrand(content.brand);

  const region = sq ? { x: 110, w: 780, top: 330, bottom: 800 } : { x: 110, w: 780, top: 330, bottom: 1110 };
  const qh = (region.bottom - region.top) * 0.86 * (layout === 'symbol' ? 1.08 : 1) * Math.min(1.1, s);
  const qcy = (region.top + region.bottom) / 2 + 20;
  const count = sq ? 46 : 62;
  const ridges = useMemo(() => {
    const field = question ? questionField(W / 2, qcy, qh, 52) : () => 0;
    return ridgelines(region.x, region.w, region.top, region.bottom, count, (px, py) => 4 + 120 * field(px, py), 21, 170);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sq, qh, qcy, count, question]);
  const dotY = qcy + (97 - 50) * (qh / 100);

  const head1 = () => {
    if (layout === 'symbol') {
      return (
        <text x={W / 2} y={sq ? 120 : 170} textAnchor="middle" fontFamily={FONT.sans} fontWeight={500} fontSize={26} letterSpacing={14} fill={fg}>
          {content.brand.toUpperCase()}
        </text>
      );
    }
    const lay = layout === 'line' ? 'line' : 'stacked';
    const w = (sq ? 440 : 600) * Math.min(1.15, s);
    const h = lay === 'line' ? w * 0.22 : w * 0.42;
    return <OndeLogo variant="primary" layout={lay} brand={content.brand} tone={tone} x={(W - w) / 2} y={sq ? 40 : 70} width={w} height={h} />;
  };

  return (
    <Artboard format={format} colors={colors} texture={settings.texture * 0.6} label={`${content.brand} — onde`}>
      <defs>
        <clipPath id={id + 'r'}>
          <rect x={region.x} y={region.top - 140} width={region.w} height={region.bottom - region.top + 180} />
        </clipPath>
      </defs>
      {settings.photo && (
        <g opacity={0.45} clipPath={`url(#${id}r)`}>
          <Photo x={region.x} y={region.top - 140} width={region.w} height={region.bottom - region.top + 180} kind="crowd" src={photoSrc} shadow={colors.bg} light={fg} grain={0.5} />
        </g>
      )}
      <g strokeLinejoin="round" clipPath={`url(#${id}r)`}>
        {ridges.map((r, i) => {
          const y0 = region.top + ((region.bottom - region.top) * i) / (count - 1);
          const hot = question && Math.abs(y0 - dotY) < 16;
          return (
            <g key={i}>
              <path d={r.fill} fill={settings.photo ? 'none' : colors.bg} />
              <path d={r.line} fill="none" stroke={hot ? colors.accent : fg} strokeWidth={hot ? 2.6 : 1.6} />
            </g>
          );
        })}
      </g>
      {head1()}
      <text x={W / 2} y={region.bottom + (sq ? 50 : 70)} textAnchor="middle" fontFamily={FONT.mono} fontSize={13} letterSpacing={5} fill={fg} opacity={0.75}>
        {sig.join(' · ')}
      </text>
      {split ? (
        <g>
          {content.lineup.map((a, i) => (
            <g key={a.id}>
              <text x={110} y={(sq ? 880 : 1250) + i * (sq ? 34 : 50)} fontFamily={FONT.mono} fontSize={13} letterSpacing={3} fill={colors.accent}>
                CH.{String(i + 1).padStart(2, '0')}
              </text>
              <text x={190} y={(sq ? 880 : 1250) + i * (sq ? 34 : 50)} fontFamily={FONT.sans} fontWeight={400} fontSize={fitMeasured(a.name, 380, { family: SANS, size: sq ? 24 : 32, weight: 400 })} fill={fg}>
                {a.name}
                <tspan fontFamily={FONT.mono} fontSize={12} letterSpacing={2} opacity={0.65} dx={12}>
                  {a.detail}
                </tspan>
              </text>
            </g>
          ))}
          <text x={890} y={sq ? 920 : 1330} textAnchor="end" fontFamily={FONT.sans} fontWeight={200} fontSize={sq ? 110 : 150} letterSpacing={-6} fill={fg}>
            {head}
          </text>
          <text x={890} y={sq ? 950 : 1366} textAnchor="end" fontFamily={FONT.mono} fontSize={13} letterSpacing={4} fill={fg}>
            {tail}
          </text>
        </g>
      ) : (
        <g textAnchor="middle">
          {content.lineup.map((a, i) => (
            <text key={a.id} x={W / 2} y={(sq ? 870 : 1240) + i * (sq ? 32 : 44)} fontFamily={FONT.sans} fontWeight={400} fontSize={sq ? 24 : 30} fill={fg}>
              {a.name}
              <tspan fontFamily={FONT.mono} fontSize={12} letterSpacing={2} opacity={0.65} dx={10}>
                {a.detail}
              </tspan>
            </text>
          ))}
          <text x={W / 2} y={sq ? 975 : 1400} fontFamily={FONT.mono} fontSize={15} letterSpacing={5} fill={colors.accent}>
            {content.date}
          </text>
        </g>
      )}
      {!sq && (
        <>
          <line x1={110} x2={890} y1={1430} y2={1430} stroke={fg} strokeOpacity={0.4} />
          <text x={110} y={1466} fontFamily={FONT.mono} fontSize={13} letterSpacing={4} fill={fg}>
            {content.venue}
          </text>
          <text x={890} y={1466} textAnchor="end" fontFamily={FONT.mono} fontSize={12} letterSpacing={3} fill={fg} opacity={0.7}>
            {content.mentions || `${content.edition} · ${content.pillars}`}
          </text>
        </>
      )}
    </Artboard>
  );
}

export const onde: ConceptDef = {
  id: 'onde',
  index: '11',
  name: 'Onde / Fréquence',
  short: 'Son, crête, vibration',
  description: 'Des dizaines d’ondes sonores empilées dont les crêtes dessinent un « ? » géant. La musique fait apparaître la question.',
  rationale: [
    'Le « ? » n’est pas tracé : il émerge des ondes. Chaque ligne est un signal ; là où elle traverse le signe, elle s’emballe. L’onde qui passe par le point devient rouge.',
    'Le logo vibre : les lettres du squelette « Trajet » sont modulées par une sinusoïde, comme un son qui fait trembler l’air. Le symbole reprend les ondes dans un cercle.',
    'Référence assumée aux pochettes de disques électroniques : noir profond, trait blanc fin, beaucoup de silence autour.',
  ],
  base: { paper: '#ece8e1', ink: '#07090c' },
  palette: [
    { name: 'Nuit', hex: '#07090c', role: 'Fond' },
    { name: 'Signal blanc', hex: '#ece8e1', role: 'Ondes, texte' },
    { name: 'Crête rouge', hex: '#ff3d2e', role: 'Onde du point, canaux' },
  ],
  typography: [
    { role: 'Logo', family: 'Trajet modulé', css: '', sample: 'UNE AUTRE ?', note: 'Squelette Trajet déformé par une onde sinusoïdale.', custom: true },
    { role: 'Programmation', family: 'General Sans', css: FONT.sans, weight: 400, sample: 'Firas Kobbi', note: 'Régulière, claire.' },
    { role: 'Canaux', family: 'IBM Plex Mono', css: FONT.mono, weight: 400, sample: 'CH.01 — CH.03', note: 'Repères de canaux de table de mixage.' },
  ],
  defaults: { accent: '#ff3d2e', background: 'dark', titleLayout: 'stacked', logoScale: 1, texture: 0.25, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: OndeLogo,
  Poster: OndePoster,
};
