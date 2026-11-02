/**
 * "Trajet" — an original single-stroke skeleton alphabet drawn for the project.
 * Cap height = 100 units, baseline at y = 100. Each glyph is a centre-line that
 * concepts render differently: brush/nib (Ink), heavy geometric monoline
 * (Red Signal), hairline (Abstract), etc.
 */
type Glyph = { w: number; d: string };

const G: Record<string, Glyph> = {
  A: { w: 64, d: 'M0 100L32 0L64 100M13 64H51' },
  B: { w: 58, d: 'M0 100V0H30C48 0 55 11 55 24C55 38 45 47 29 47H0M29 47C48 47 58 58 58 73C58 89 48 100 31 100H0' },
  C: { w: 66, d: 'M66 18C58 6 47 0 35 0C14 0 0 20 0 50C0 80 14 100 35 100C47 100 58 94 66 82' },
  D: { w: 64, d: 'M0 0V100H24C50 100 64 80 64 50C64 20 50 0 24 0Z' },
  E: { w: 54, d: 'M54 0H0V100H54M0 48H44' },
  F: { w: 54, d: 'M54 0H0V100M0 48H44' },
  G: { w: 66, d: 'M66 18C58 6 47 0 35 0C14 0 0 20 0 50C0 80 14 100 35 100C53 100 66 88 66 66V54H38' },
  H: { w: 60, d: 'M0 0V100M60 0V100M0 48H60' },
  I: { w: 0, d: 'M0 0V100' },
  J: { w: 40, d: 'M40 0V72C40 90 30 100 18 100C8 100 0 92 0 82' },
  K: { w: 58, d: 'M0 0V100M56 0L0 62M19 41L58 100' },
  L: { w: 50, d: 'M0 0V100H50' },
  M: { w: 74, d: 'M0 100V0L37 72L74 0V100' },
  N: { w: 60, d: 'M0 100V0L60 100V0' },
  O: { w: 70, d: 'M35 0C14 0 0 20 0 50C0 80 14 100 35 100C56 100 70 80 70 50C70 20 56 0 35 0Z' },
  P: { w: 58, d: 'M0 100V0H31C49 0 58 12 58 28C58 44 49 56 31 56H0' },
  Q: { w: 72, d: 'M35 0C14 0 0 20 0 50C0 80 14 100 35 100C56 100 70 80 70 50C70 20 56 0 35 0ZM42 70L72 106' },
  R: { w: 60, d: 'M0 100V0H31C49 0 58 12 58 28C58 44 49 54 31 54H0M29 54L60 100' },
  S: { w: 60, d: 'M57 16C51 6 42 0 30 0C14 0 4 10 4 24C4 56 60 42 60 74C60 90 49 100 31 100C17 100 6 94 0 82' },
  T: { w: 64, d: 'M0 0H64M32 0V100' },
  U: { w: 60, d: 'M0 0V64C0 86 12 100 30 100C48 100 60 86 60 64V0' },
  V: { w: 64, d: 'M0 0L32 100L64 0' },
  W: { w: 90, d: 'M0 0L22 100L45 22L68 100L90 0' },
  X: { w: 60, d: 'M0 0L60 100M60 0L0 100' },
  Y: { w: 64, d: 'M0 0L32 52L64 0M32 52V100' },
  Z: { w: 60, d: 'M0 0H60L0 100H60' },
  '0': { w: 58, d: 'M29 0C11 0 0 20 0 50C0 80 11 100 29 100C47 100 58 80 58 50C58 20 47 0 29 0Z' },
  '1': { w: 30, d: 'M4 18L30 0V100' },
  '2': { w: 58, d: 'M2 22C4 8 16 0 30 0C46 0 56 10 56 26C56 48 20 70 0 100H58' },
  '3': { w: 58, d: 'M4 12C10 4 19 0 30 0C46 0 55 10 55 24C55 38 45 46 28 46C47 46 58 58 58 72C58 90 45 100 29 100C16 100 6 94 0 84' },
  '4': { w: 62, d: 'M46 100V0L0 70H62' },
  '5': { w: 58, d: 'M54 0H8L4 44C12 38 22 36 31 36C47 36 58 50 58 68C58 88 45 100 29 100C16 100 6 94 0 84' },
  '6': { w: 58, d: 'M52 6C46 2 38 0 32 0C12 0 2 22 2 52C2 82 13 100 31 100C47 100 58 88 58 68C58 48 47 38 31 38C18 38 7 46 2 58' },
  '7': { w: 58, d: 'M0 0H58L20 100' },
  '8': { w: 58, d: 'M29 46C14 46 5 36 5 23C5 10 15 0 29 0C43 0 53 10 53 23C53 36 44 46 29 46C12 46 1 58 1 73C1 90 13 100 29 100C45 100 57 90 57 73C57 58 46 46 29 46Z' },
  '9': { w: 58, d: 'M8 94C14 98 21 100 27 100C47 100 57 78 57 48C57 18 46 0 28 0C12 0 0 12 0 32C0 52 12 62 27 62C41 62 52 54 57 42' },
  '?': { w: 56, d: 'M1 24C1 10 13 0 28 0C44 0 56 10 56 26C56 40 46 48 36 54C30 58 28 64 28 74M28 97L28 97.01' },
  '!': { w: 0, d: 'M0 0V72M0 97L0 97.01' },
  '.': { w: 0, d: 'M0 97L0 97.01' },
  ',': { w: 4, d: 'M4 94L0 110' },
  '-': { w: 34, d: 'M0 58H34' },
  "'": { w: 0, d: 'M0 0V24' },
  '/': { w: 44, d: 'M44 0L0 100' },
  '&': { w: 66, d: 'M66 100L10 30C4 22 4 18 4 14C4 6 12 0 22 0C32 0 40 6 40 16C40 30 0 46 0 72C0 90 12 100 28 100C46 100 56 86 62 70' },
  '·': { w: 0, d: 'M0 56L0 56.01' },
};

const ACCENTS: Record<string, (w: number) => string> = {
  '́': (w) => `M${w / 2 - 8} -12L${w / 2 + 10} -30`,
  '̀': (w) => `M${w / 2 - 10} -30L${w / 2 + 8} -12`,
  '̂': (w) => `M${w / 2 - 16} -12L${w / 2} -28L${w / 2 + 16} -12`,
  '̈': (w) => `M${w / 2 - 14} -18L${w / 2 - 14} -17.99M${w / 2 + 14} -18L${w / 2 + 14} -17.99`,
  '̧': (w) => `M${w / 2} 100L${w / 2 + 8} 116L${w / 2 - 6} 124`,
};

export interface PlacedGlyph {
  char: string;
  d: string;
  x: number;
  w: number;
}

export interface StrokeLayout {
  glyphs: PlacedGlyph[];
  width: number;
}

/** Lays out text with the Trajet skeleton alphabet. Unsupported characters become spaces. */
export function layoutStroke(text: string, tracking = 26, space = 44): StrokeLayout {
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  const chars = [...text.toUpperCase().normalize('NFD')];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (ACCENTS[c]) continue;
    const g = G[c];
    if (!g) {
      x += space;
      continue;
    }
    let d = g.d;
    let j = i + 1;
    while (j < chars.length && ACCENTS[chars[j]]) d += ACCENTS[chars[j++]](g.w);
    glyphs.push({ char: c, d, x, w: g.w });
    x += g.w + tracking;
  }
  return { glyphs, width: Math.max(0, x - tracking) };
}

export const QUESTION_GLYPH = G['?'];
