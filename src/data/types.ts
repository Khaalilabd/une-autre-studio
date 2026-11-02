import type { FC } from 'react';

export type ConceptId =
  | 'ink'
  | 'signal'
  | 'editorial'
  | 'brutalist'
  | 'question'
  | 'nocturne'
  | 'riso'
  | 'neon'
  | 'swiss'
  | 'collage'
  | 'onde'
  | 'club'
  | 'anneau'
  | 'loco'
  | 'vinyle'
  | 'echo'
  | 'sticker'
  | 'glossy'
  | 'clubnight'
  | 'gourmand'
  | 'sunset'
  | 'horizon'
  | 'chrome';

export interface LineupSlot {
  id: string;
  name: string;
  detail: string;
}

/** Single source of truth for every piece of text printed on the artwork. */
export interface EventContent {
  brand: string;
  signature: string;
  pillars: string;
  manifesto: string;
  edition: string;
  editionNumber: string;
  venue: string;
  date: string;
  lineupTitle: string;
  lineup: LineupSlot[];
  mentions: string;
  coords: string;
}

export type Background = 'paper' | 'dark' | 'accent';
export type TitleLayout = 'stacked' | 'line' | 'symbol';
export type InfoLayout = 'split' | 'stack';
export type PosterFormat = 'portrait' | 'square';

export interface CreativeSettings {
  accent: string;
  background: Background;
  titleLayout: TitleLayout;
  logoScale: number;
  texture: number;
  photo: boolean;
  infoLayout: InfoLayout;
  format: PosterFormat;
}

export interface Colors {
  bg: string;
  fg: string;
  accent: string;
  paper: string;
  ink: string;
  background: Background;
}

export type LogoVariant = 'primary' | 'secondary' | 'symbol';

export interface Tone {
  fg: string;
  accent: string;
}

export interface LogoProps {
  variant: LogoVariant;
  brand: string;
  tone: Tone;
  layout?: 'stacked' | 'line';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface PosterProps {
  content: EventContent;
  settings: CreativeSettings;
  colors: Colors;
  format: PosterFormat;
  photoSrc: string | null;
}

export interface Swatch {
  name: string;
  hex: string;
  role: string;
}

export interface TypeSpec {
  role: string;
  family: string;
  css: string;
  weight?: number;
  italic?: boolean;
  sample: string;
  note: string;
  custom?: boolean;
}

export interface ConceptDef {
  id: ConceptId;
  index: string;
  name: string;
  short: string;
  description: string;
  rationale: string[];
  base: { paper: string; ink: string };
  palette: Swatch[];
  typography: TypeSpec[];
  defaults: CreativeSettings;
  Logo: FC<LogoProps>;
  Poster: FC<PosterProps>;
  Explorations?: FC<{ tone: Tone }>;
}
