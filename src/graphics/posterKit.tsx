import type { ReactNode } from 'react';
import { POSTER_SIZE } from '../data/content';
import type { Colors, PosterFormat } from '../data/types';
import { Grain } from './common';

/** Root of every poster: fixed artboard size per format, background, optional paper grain. */
export function Artboard({
  format,
  colors,
  texture,
  children,
  grainColor,
  label,
}: {
  format: PosterFormat;
  colors: Colors;
  texture: number;
  children: ReactNode;
  grainColor?: string;
  label: string;
}) {
  const { width, height } = POSTER_SIZE[format];
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
      <rect width={width} height={height} fill={colors.bg} />
      {children}
      <Grain width={width} height={height} amount={colors.background === 'paper' ? texture : texture * 0.7} color={grainColor ?? (colors.background === 'paper' ? '#3a2c1a' : colors.paper)} seed={5} mottle={colors.background === 'paper'} />
    </svg>
  );
}

/** Splits a date into tokens; used by posters that set the day large. */
export const yearOf = (date: string) => /\b(\d{4})\b/.exec(date)?.[1] ?? '';
