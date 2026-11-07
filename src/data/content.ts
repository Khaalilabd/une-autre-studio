import type { Colors, ConceptDef, CreativeSettings, EventContent } from './types';

/**
 * Demo content taken from the reference poster. All of it is editable in the
 * studio; nothing else (artists, partners, facts) is invented.
 */
export const DEFAULT_CONTENT: EventContent = {
  brand: 'UNE AUTRE ?',
  editionAccent: '#1636d8',
  signature: 'DE LIEU EN LIEU\nUN MÊME ESPRIT\nUNE AUTRE EXPÉRIENCE',
  pillars: 'MUSIC · ART · DRINKS · PEOPLE',
  manifesto: 'A DIFFERENT TRACK\nA DIFFERENT VIBE\nA DIFFERENT EDITION',
  edition: '1ÈRE ÉDITION',
  editionNumber: '01',
  venue: 'EXEMPLE DE LIEU (À CONFIRMER)',
  date: 'DATE À CONFIRMER',
  hours: '22:00 — 04:00',
  lineupTitle: 'PROGRAMMATION · PISTES',
  lineup: [
    { id: 'a', name: 'RAYHANE · KARIMA SIALA', detail: 'GÉNÉRATION ICONIQUE · EXEMPLES DE DJ' },
    { id: 'b', name: 'FIRAS KOBBI · LUIGI · BOUAZIZ', detail: 'NOUVELLE GÉNÉRATION · EXEMPLES DE DJ' },
    { id: 'c', name: 'UNE AUTRE ? CREW', detail: 'LE CREW · DJ SET + GUITARE + VOIX · SHOW LIVE' },
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
