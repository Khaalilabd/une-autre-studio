import type { FC } from 'react';
import type { ConceptDef, LogoProps, PosterProps } from '../data/types';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';

function OrbitMark({ cx, cy, radius, color, animated }: { cx: number; cy: number; radius: number; color: string; animated: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth="2" opacity="0.35" />
      <g>
        {animated && <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy};360 ${cx} ${cy}`} dur="18s" repeatCount="indefinite" />}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth="10" strokeDasharray="900 700" strokeLinecap="round" />
        <circle cx={cx} cy={cy - radius} r="15" fill={color} />
      </g>
      <text x={cx} y={cy + radius * 0.34} textAnchor="middle" fill={color} fontFamily={FONT.round} fontSize={radius * 1.65} fontWeight="600">
        ?
      </text>
    </g>
  );
}

const EssaieLogo: FC<LogoProps> = ({ variant, brand, tone, x, y, width, height }) => (
  <svg viewBox="0 0 400 400" x={x} y={y} width={width ?? 400} height={height ?? 400}>
    <OrbitMark cx={200} cy={185} radius={variant === 'symbol' ? 120 : 105} color={tone.accent} animated={false} />
    {variant !== 'symbol' && (
      <text x="200" y="370" textAnchor="middle" fill={tone.fg} fontFamily={FONT.sans} fontSize="24" fontWeight="600" letterSpacing="3">
        {brand}
      </text>
    )}
  </svg>
);

const EssaiePoster: FC<PosterProps> = ({ content, settings, colors, format, animated = false }) => {
  const square = format === 'square';
  const width = 1000;
  const height = square ? 1000 : 1500;
  const cx = width / 2;
  const cy = square ? 340 : 505;
  const radius = (square ? 185 : 255) * settings.logoScale;
  const infoY = Math.max(square ? 595 : 880, cy + radius + 70);
  const foreground = colors.fg;
  const orbitColor = colors.background === 'accent' ? foreground : settings.accent;
  const artistFontSize = square ? 32 : 40;
  const artists = content.lineup.filter((artist) => artist.name.trim());

  return (
    <Artboard format={format} colors={colors} texture={settings.texture} label={`${content.brand} — ESSSAIE`}>
      <text x="70" y="82" fill={foreground} fontFamily={FONT.mono} fontSize="22" letterSpacing="3">
        {content.brand}
      </text>
      <text x="930" y="82" textAnchor="end" fill={foreground} fontFamily={FONT.mono} fontSize="18" letterSpacing="3" opacity="0.75">
        ESSSAIE · 40
      </text>
      <OrbitMark cx={cx} cy={cy} radius={radius} color={orbitColor} animated={animated} />
      <line x1="70" x2="930" y1={infoY - 44} y2={infoY - 44} stroke={foreground} strokeWidth="1" opacity="0.45" />
      <text x={cx} y={infoY} textAnchor="middle" fill={foreground} fontFamily={FONT.mono} fontSize={square ? 24 : 30} letterSpacing="3">
        {content.date} · {content.hours}
      </text>
      {artists.map((artist, i) => (
        <text key={artist.id} x={cx} y={infoY + 68 + i * (square ? 48 : 62)} textAnchor="middle" fill={foreground} fontFamily={FONT.sans} fontSize={artistFontSize} fontWeight="600" textLength={Math.min(820, Math.max(100, artist.name.length * artistFontSize * 0.62))} lengthAdjust="spacingAndGlyphs">
          {artist.name}
        </text>
      ))}
      <text x={cx} y={height - (square ? 64 : 105)} textAnchor="middle" fill={foreground} fontFamily={FONT.mono} fontSize={square ? 19 : 23} letterSpacing="2">
        {content.venue}
      </text>
      {!square && (
        <text x={cx} y={height - 62} textAnchor="middle" fill={foreground} fontFamily={FONT.mono} fontSize="16" letterSpacing="3" opacity="0.7">
          {content.edition}
        </text>
      )}
    </Artboard>
  );
};

const BASE = { paper: '#f6f1e7', ink: '#0b0710' };

export const essaie: ConceptDef = {
  id: 'essaie',
  index: '40',
  series: 'main',
  name: 'ESSSAIE',
  short: 'Un anneau tourne autour du « ? »',
  description: 'Une affiche à part, inspirée de la simplicité de Lumière : un grand cercle animé entoure un « ? » central. Le fond, la couleur, le grain et les textes restent modifiables.',
  rationale: [
    'Lumière reste une piste intacte ; ESSSAIE est un nouvel exemple à explorer, pas un remplacement.',
    'Un anneau segmenté et son point en orbite rendent la rotation visible autour du « ? ».',
    'Changez le fond, l’accent, le grain, la taille du signe et le contenu de l’affiche dans les réglages.',
  ],
  base: BASE,
  palette: [
    { name: 'Bleu électrique', hex: '#1f3cff', role: 'Fond' },
    { name: 'Ivoire', hex: '#f6f1e7', role: 'Signe' },
  ],
  typography: [
    { role: 'Signe', family: 'Fredoka', css: FONT.round, weight: 600, sample: '?', note: 'Un « ? » rond au centre de l’anneau.' },
    { role: 'Informations', family: 'General Sans', css: FONT.sans, weight: 600, sample: 'DATE · ARTISTES · LIEU', note: 'Les textes de l’affiche sont modifiables dans l’onglet Texte.' },
  ],
  defaults: { accent: '#1f3cff', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.15, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: EssaieLogo,
  Poster: EssaiePoster,
};
