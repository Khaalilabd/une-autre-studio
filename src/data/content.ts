import type { Colors, ConceptDef, CreativeSettings, EventContent } from './types';

/**
 * Demo content taken from the reference poster. All of it is editable in the
 * studio; nothing else (artists, partners, facts) is invented.
 */
export const DEFAULT_CONTENT: EventContent = {
  brand: 'UNE AUTRE ?',
  signature: 'MÊME LIEU\nMÊMES GENS\nUNE AUTRE EXPÉRIENCE',
  pillars: 'MUSIC · ART · DRINKS · PEOPLE',
  manifesto: 'A DIFFERENT TRACK\nA DIFFERENT VIBE\nA DIFFERENT EDITION',
  edition: '1ÈRE ÉDITION',
  editionNumber: '01',
  venue: 'MARRACAS MARACAS',
  date: '12 JUILLET 2025',
  lineupTitle: 'LINE UP',
  lineup: [
    { id: 'a', name: 'RAYHANE', detail: 'B2B KARIM SIALA' },
    { id: 'b', name: 'FIRAS KOBBI', detail: 'B2B LUIGI' },
    { id: 'c', name: 'UNE AUTRE ? CREW', detail: 'CLOSING' },
  ],
  mentions: '',
  coords: '',
};

export const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** "UNE AUTRE ?" → { words: ['UNE','AUTRE'], question: true } */
export function splitBrand(brand: string) {
  const trimmed = brand.trim();
  const question = /\?\s*$/.test(trimmed);
  const words = trimmed.replace(/\?\s*$/, '').trim().split(/\s+/).filter(Boolean);
  return { words: words.length ? words : ['?'], question, base: words.join(' ') };
}

/** First token of the date (usually the day) for typographic emphasis. */
export function splitDate(date: string) {
  const parts = date.trim().split(/\s+/);
  return { head: parts[0] ?? '', tail: parts.slice(1).join(' ') };
}

export function resolveColors(def: ConceptDef, s: CreativeSettings): Colors {
  const { paper, ink } = def.base;
  if (s.background === 'dark') return { bg: ink, fg: paper, accent: s.accent, paper, ink, background: 'dark' };
  if (s.background === 'accent') return { bg: s.accent, fg: paper, accent: ink, paper, ink, background: 'accent' };
  return { bg: paper, fg: ink, accent: s.accent, paper, ink, background: 'paper' };
}

export const POSTER_SIZE = {
  portrait: { width: 1000, height: 1500 },
  square: { width: 1000, height: 1000 },
} as const;
