/**
 * Local font registry. Files ship with the app (@fontsource packages), so the studio
 * works offline. The same registry is used to embed fonts into exported SVG/PNG.
 */
import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import inter500 from '@fontsource/inter/files/inter-latin-500-normal.woff2?url';
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url';
import mono400 from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url';
import mono500 from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2?url';
import serif300 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-normal.woff2?url';
import serif400 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';
import serif500 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2?url';
import serif600 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2?url';
import serif300i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-italic.woff2?url';
import serif400i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2?url';
import serif500i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2?url';
import anton400 from '@fontsource/anton/files/anton-latin-400-normal.woff2?url';
import syne500 from '@fontsource/syne/files/syne-latin-500-normal.woff2?url';
import syne700 from '@fontsource/syne/files/syne-latin-700-normal.woff2?url';
import syne800 from '@fontsource/syne/files/syne-latin-800-normal.woff2?url';
import generalSans from '../assets/fonts/GeneralSans-Variable.woff2?url';
import generalSansItalic from '../assets/fonts/GeneralSans-VariableItalic.woff2?url';
import gambetta from '../assets/fonts/Gambetta-Variable.woff2?url';
import gambettaItalic from '../assets/fonts/Gambetta-VariableItalic.woff2?url';

interface Face {
  family: string;
  /** A number, or a range like '200 700' for variable fonts. */
  weight: number | string;
  style: 'normal' | 'italic';
  url: string;
}

const FACES: Face[] = [
  { family: 'Inter', weight: 400, style: 'normal', url: inter400 },
  { family: 'Inter', weight: 500, style: 'normal', url: inter500 },
  { family: 'Inter', weight: 600, style: 'normal', url: inter600 },
  { family: 'IBM Plex Mono', weight: 400, style: 'normal', url: mono400 },
  { family: 'IBM Plex Mono', weight: 500, style: 'normal', url: mono500 },
  { family: 'Cormorant Garamond', weight: 300, style: 'normal', url: serif300 },
  { family: 'Cormorant Garamond', weight: 400, style: 'normal', url: serif400 },
  { family: 'Cormorant Garamond', weight: 500, style: 'normal', url: serif500 },
  { family: 'Cormorant Garamond', weight: 600, style: 'normal', url: serif600 },
  { family: 'Cormorant Garamond', weight: 300, style: 'italic', url: serif300i },
  { family: 'Cormorant Garamond', weight: 400, style: 'italic', url: serif400i },
  { family: 'Cormorant Garamond', weight: 500, style: 'italic', url: serif500i },
  { family: 'Anton', weight: 400, style: 'normal', url: anton400 },
  { family: 'Syne', weight: 500, style: 'normal', url: syne500 },
  { family: 'Syne', weight: 700, style: 'normal', url: syne700 },
  { family: 'Syne', weight: 800, style: 'normal', url: syne800 },
  { family: 'General Sans', weight: '200 700', style: 'normal', url: generalSans },
  { family: 'General Sans', weight: '200 700', style: 'italic', url: generalSansItalic },
  { family: 'Gambetta', weight: '300 700', style: 'normal', url: gambetta },
  { family: 'Gambetta', weight: '300 700', style: 'italic', url: gambettaItalic },
];

/** Font stacks used inside the SVG artwork. */
export const FONT = {
  ui: "'Inter', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  serif: "'Cormorant Garamond', Georgia, serif",
  condensed: "'Anton', Impact, sans-serif",
  display: "'Syne', 'Inter', sans-serif",
  sans: "'General Sans', 'Inter', sans-serif",
  gambetta: "'Gambetta', Georgia, serif",
};

const faceRule = (f: Face, src: string) =>
  `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:block;src:url(${src}) format('woff2');}`;

export function installFonts() {
  const style = document.createElement('style');
  style.dataset.fonts = 'studio';
  style.textContent = FACES.map((f) => faceRule(f, f.url)).join('\n');
  document.head.appendChild(style);
  return Promise.all(FACES.map((f) => document.fonts.load(`${f.style} ${typeof f.weight === 'number' ? f.weight : 400} 16px '${f.family}'`))).catch(() => undefined);
}

const cache = new Map<string, Promise<string>>();

function toDataUrl(url: string): Promise<string> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((r) => r.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(String(fr.result).replace(/^data:[^;]*;/, 'data:font/woff2;'));
              fr.onerror = reject;
              fr.readAsDataURL(blob);
            }),
        ),
    );
  }
  return cache.get(url)!;
}

/** @font-face rules (base64-embedded) for every family referenced in the markup. */
export async function embeddedFontCss(markup: string): Promise<string> {
  const used = FACES.filter((f) => markup.includes(f.family));
  const rules = await Promise.all(used.map(async (f) => faceRule(f, await toDataUrl(f.url))));
  return rules.join('');
}
