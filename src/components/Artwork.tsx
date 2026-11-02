import type { ReactElement } from 'react';
import { resolveColors } from '../data/content';
import type { ConceptDef, CreativeSettings, EventContent, LogoVariant, PosterFormat, Tone } from '../data/types';
import { useStudio } from '../state/store';

/** Pure element builders — used both for on-screen rendering and for export. */
export function posterElement(def: ConceptDef, content: EventContent, settings: CreativeSettings, photo: string | null, format?: PosterFormat): ReactElement {
  const colors = resolveColors(def, settings);
  return <def.Poster content={content} settings={settings} colors={colors} format={format ?? settings.format} photoSrc={photo} />;
}

export function logoElement(def: ConceptDef, variant: LogoVariant, brand: string, tone: Tone, layout?: 'stacked' | 'line'): ReactElement {
  return <def.Logo variant={variant} brand={brand} tone={tone} layout={layout} />;
}

export function useConceptColors(def: ConceptDef) {
  const { settings } = useStudio();
  return resolveColors(def, settings[def.id]);
}

export function PosterArt({ def, format, className }: { def: ConceptDef; format?: PosterFormat; className?: string }) {
  const { content, settings, photo } = useStudio();
  const f = format ?? settings[def.id].format;
  return <div className={`art poster ${f} ${className ?? ''}`}>{posterElement(def, content, settings[def.id], photo, f)}</div>;
}

export function LogoArt({ def, variant, layout, tone, bg, className }: { def: ConceptDef; variant: LogoVariant; layout?: 'stacked' | 'line'; tone?: Tone; bg?: string; className?: string }) {
  const { content } = useStudio();
  const colors = useConceptColors(def);
  const t = tone ?? { fg: colors.fg, accent: colors.accent };
  return (
    <div className={`art logo ${className ?? ''}`} style={{ background: bg ?? colors.bg }}>
      {logoElement(def, variant, content.brand, t, layout)}
    </div>
  );
}

/** The four standard test grounds required by the brief. */
export function testTones(def: ConceptDef, settings: CreativeSettings) {
  const { paper, ink } = def.base;
  const accent = settings.accent;
  return [
    { key: 'ivory', label: 'Fond ivoire', bg: paper, tone: { fg: ink, accent } },
    { key: 'black', label: 'Fond noir', bg: ink, tone: { fg: paper, accent } },
    { key: 'red', label: 'Fond rouge', bg: accent, tone: { fg: paper, accent: ink } },
    { key: 'mono', label: 'Monochrome', bg: '#ffffff', tone: { fg: '#000000', accent: '#000000' } },
  ];
}
