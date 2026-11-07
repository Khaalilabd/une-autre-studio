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
  | 'facettes'
  | 'bab'
  | 'machmoum'
  | 'thermique'
  | 'bracelet'
  | 'reflet'
  | 'ruban'
  | 'mercure'
  | 'corail'
  | 'noeud'
  | 'souffle'
  | 'anamorphose'
  | 'motscroises'
  | 'motsmeles'
  | 'phrase'
  | 'point'
  | 'censure'
  | 'lumiere'
  | 'essaie'
  | 'harissa'
  | 'nuitrose'
  | 'menthe'
  | 'soleil'
  | 'relief'
  | 'eclipse'
  | 'verre'
  | 'remplissage'
  | 'ombre'
  | 'gobo'
  | 'glacon'
  | 'bulle'
  | 'origami'
  | 'ballon'
  | 'rubanrouge'
  | 'rubanrougefond'
  | 'neonlogo'
  | 'tunnel'
  | 'medaille'
  | 'orbite'
  | 'rubanorbite'
  | 'rubanhalo'
  | 'rubansceau'
  | 'live1'
  | 'live2'
  | 'live3'
  | 'live4'
  | 'live5';

export interface LineupSlot {
  id: string;
  name: string;
  detail: string;
}

/** Single source of truth for every piece of text printed on the artwork. */
export interface EventContent {
  brand: string;
  editionAccent: string;
  signature: string;
  pillars: string;
  manifesto: string;
  edition: string;
  editionNumber: string;
  venue: string;
  date: string;
  /** Opening hours, e.g. "22:00 — 04:00" (shown by the hand-lettered series). */
  hours: string;
  lineupTitle: string;
  lineup: LineupSlot[];
  mentions: string;
  coords: string;
}

export type Background = 'paper' | 'dark' | 'accent';
export type TitleLayout = 'stacked' | 'line' | 'symbol' | 'badge';
export type InfoLayout = 'split' | 'stack';
export type PosterFormat = 'portrait' | 'square';

export interface CreativeSettings {
  accent: string;
  textColor?: string;
  background: Background;
  titleLayout: TitleLayout;
  logoScale: number;
  texture: number;
  photo: boolean;
  infoLayout: InfoLayout;
  format: PosterFormat;
  lineupScale?: number;
  lineupOffset?: number;
  sculptureScale?: number;
  sculptureMetalDeep?: string;
  sculptureMetalMid?: string;
  sculptureMetalLight?: string;
  // Position controls
  sculptureX?: number;
  sculptureY?: number;
  logoPositionX?: number;
  logoPositionY?: number;
  textBlockX?: number;
  textBlockY?: number;
  badgeX?: number;
  badgeY?: number;
  // Badge controls
  badgeScale?: number;
  badgeRotationSpeed?: number;
  badgeVisible?: boolean;
  // Font controls
  badgeFont?: string;
  titleFont?: string;
  logoFont?: string;
  // Hand-drawn text style (like Lumière)
  useHandDrawn?: boolean;
  handWeight?: number;
  handBounce?: number;
  handTremor?: number;
  // Logo rotation animation
  logoRotate?: boolean;
  logoRotationSpeed?: number;
  // Logo orbit animation (like Ruban Orbite)
  logoOrbit?: boolean;
  logoOrbitRadius?: number;
  logoOrbitTilt?: number;
  logoOrbitSpeed?: number;
  // Simple logo rotation (spin on itself)
  logoSpin?: boolean;
  logoSpinSpeed?: number;
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
  /** Live SMIL motion (special series only); the still frame is the same poster. */
  animated?: boolean;
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
  /** Special series the direction belongs to (shown apart on the table, has an animated sheet). */
  series?: string;
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
  /** Real-time 3D version (replaces the SMIL animation on the animated sheet, records video). */
  Live?: FC<{ content: EventContent; settings: CreativeSettings }>;
}
