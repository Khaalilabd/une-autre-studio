import type { ConceptId } from './types';

/** Copy and atmosphere for the immersive presentation (one chapter per direction). */
export const CHAPTERS: Record<ConceptId, { title: string[]; tagline: string; tint: [string, string]; rim: string }> = {
  ink: { title: ['Ink /', 'Gesture.'], tagline: 'Le geste avant le mot.', tint: ['#2b2219', '#0a0908'], rim: '#c9a27a' },
  signal: { title: ['Red', 'Signal.'], tagline: 'Une question qui tourne.', tint: ['#3d0b10', '#0b0405'], rim: '#ff4a4a' },
  editorial: { title: ['Editorial', 'Luxe.'], tagline: 'Le luxe, c’est le silence.', tint: ['#2a2824', '#0b0b0a'], rim: '#e8dcc4' },
  brutalist: { title: ['Brutalist', 'Culture.'], tagline: 'Lisible à vingt mètres.', tint: ['#2a1d1d', '#090808'], rim: '#ff3b2f' },
  question: { title: ['Abstract', 'Question.'], tagline: 'Le point s’est échappé.', tint: ['#13233b', '#04070d'], rim: '#6f9cff' },
  nocturne: { title: ['Mediterranean', 'Nocturne.'], tagline: 'Même nuit, autre fenêtre.', tint: ['#1d1b31', '#06060b'], rim: '#ff6a4d' },
  riso: { title: ['Riso /', 'Halftone.'], tagline: 'Une question, mille points.', tint: ['#3a1416', '#0b0606'], rim: '#ff5a4f' },
  neon: { title: ['Néon.'], tagline: 'La nuit comme enseigne.', tint: ['#2a0f2a', '#07040a'], rim: '#ff2d55' },
  swiss: { title: ['Swiss', 'Rhythm.'], tagline: 'Chaque nom, un cercle.', tint: ['#24262b', '#08090b'], rim: '#ff3b30' },
  collage: { title: ['Collage /', 'Zine.'], tagline: 'Découpé, collé, signé.', tint: ['#2d2a24', '#0b0a08'], rim: '#ffb26b' },
  onde: { title: ['Onde /', 'Fréquence.'], tagline: 'Le son dessine la question.', tint: ['#101a26', '#030507'], rim: '#7fd1ff' },
  club: { title: ['Guilloché /', 'Club.'], tagline: 'Un club, pas une liste.', tint: ['#2e0f12', '#090304'], rim: '#e6c58f' },
  anneau: { title: ['Anneau.'], tagline: 'Le cercle qu’on connaît, affiné.', tint: ['#2a0707', '#050303'], rim: '#ff1f1f' },
  loco: { title: ['Loco', 'Néon.'], tagline: 'Dessiné à la main, allumé la nuit.', tint: ['#4a0606', '#120202'], rim: '#ffffff' },
  vinyle: { title: ['Vinyle.'], tagline: 'Le nom tourne, la nuit aussi.', tint: ['#2a0b0b', '#050303'], rim: '#ff2a1f' },
  echo: { title: ['Écho.'], tagline: 'Ce qui résonne après.', tint: ['#250808', '#050303'], rim: '#ff2d2d' },
  sticker: { title: ['Sticker.'], tagline: 'À coller partout.', tint: ['#2a0a0a', '#060303'], rim: '#ff1f1f' },
  glossy: { title: ['Glossy.'], tagline: 'Le signe, en trois dimensions.', tint: ['#4a0a10', '#120204'], rim: '#ff5a5f' },
  clubnight: { title: ['Club.'], tagline: 'Sous les lumières de la salle.', tint: ['#3a0b0b', '#0b0202'], rim: '#ffd9a8' },
  gourmand: { title: ['Gourmand.'], tagline: 'Sucré, solaire, à croquer.', tint: ['#5a1a06', '#1a0502'], rim: '#ffb21a' },
  sunset: { title: ['Sunset.'], tagline: 'Quand le soleil touche la mer.', tint: ['#3a1e36', '#0d0610'], rim: '#ff8a3d' },
  horizon: { title: ['Horizon.'], tagline: 'Une fenêtre sur la même mer.', tint: ['#3a1a0a', '#0d0603'], rim: '#ffb36b' },
  chrome: { title: ['Chrome.'], tagline: 'Ça brille, et ça se voit.', tint: ['#202430', '#050506'], rim: '#dfe6ff' },
};
