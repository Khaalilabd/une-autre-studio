import { useState } from 'react';
import type { ConceptDef, LogoVariant, PosterFormat, Tone } from '../data/types';
import { slug } from '../lib/exporter';
import { useStudio } from '../state/store';
import { logoElement, posterElement, useConceptColors } from './Artwork';
import { quickExport, useExport, type ExportJob } from './ExportDialog';

type ToneKey = 'concept' | 'ink' | 'paper' | 'black' | 'white';

export function useJobs(def: ConceptDef) {
  const { content, settings, photo } = useStudio();
  const colors = useConceptColors(def);
  const s = settings[def.id];
  const base = `${slug(content.brand)}_${def.index}-${def.id}`;

  const tones: Record<ToneKey, { label: string; tone: Tone }> = {
    concept: { label: 'Couleurs du réglage actuel', tone: { fg: colors.fg, accent: colors.accent } },
    ink: { label: 'Encre + accent (fonds clairs)', tone: { fg: def.base.ink, accent: s.accent } },
    paper: { label: 'Ivoire + accent (fonds sombres)', tone: { fg: def.base.paper, accent: s.accent } },
    black: { label: 'Monochrome noir', tone: { fg: '#000000', accent: '#000000' } },
    white: { label: 'Monochrome blanc', tone: { fg: '#ffffff', accent: '#ffffff' } },
  };

  const poster = (format: PosterFormat): ExportJob => ({
    title: `${def.name} — affiche ${format === 'portrait' ? 'verticale 2:3' : 'carrée 1:1'}`,
    filename: `${base}_affiche-${format === 'portrait' ? '2x3' : '1x1'}`,
    element: posterElement(def, content, s, photo, format),
    kind: 'poster',
    background: colors.bg,
  });

  const logo = (variant: LogoVariant, toneKey: ToneKey, layout?: 'stacked' | 'line'): ExportJob => ({
    title: `${def.name} — logo ${variant === 'primary' ? `principal (${layout === 'line' ? 'en ligne' : 'empilé'})` : variant === 'secondary' ? 'secondaire' : 'symbole'}`,
    filename: `${base}_logo-${variant}${layout === 'line' ? '-ligne' : ''}_${toneKey}`,
    element: logoElement(def, variant, content.brand, tones[toneKey].tone, layout),
    kind: 'logo',
  });

  return { tones, poster, logo };
}

export function ExportPanel({ def }: { def: ConceptDef }) {
  const open = useExport();
  const { tones, poster, logo } = useJobs(def);
  const [toneKey, setToneKey] = useState<ToneKey>('ink');
  const [progress, setProgress] = useState<string | null>(null);

  const logos: { label: string; variant: LogoVariant; layout?: 'stacked' | 'line' }[] = [
    { label: 'Logo principal — empilé', variant: 'primary', layout: 'stacked' },
    { label: 'Logo principal — en ligne', variant: 'primary', layout: 'line' },
    { label: 'Logo secondaire', variant: 'secondary' },
    { label: 'Symbole', variant: 'symbol' },
  ];

  const all = async () => {
    const jobs: [ExportJob, 'svg' | 'png'][] = [
      [poster('portrait'), 'png'],
      [poster('square'), 'png'],
      ...logos.flatMap((l) => [[logo(l.variant, toneKey, l.layout), 'svg'] as [ExportJob, 'svg'], [logo(l.variant, toneKey, l.layout), 'png'] as [ExportJob, 'png']]),
    ];
    try {
      for (let i = 0; i < jobs.length; i++) {
        setProgress(`${i + 1} / ${jobs.length}`);
        await quickExport(jobs[i][0], jobs[i][1]);
        await new Promise((r) => setTimeout(r, 350));
      }
      setProgress('Terminé');
    } catch (e) {
      setProgress(`Erreur : ${(e as Error).message}`);
    }
    setTimeout(() => setProgress(null), 2500);
  };

  return (
    <div className="panel-section">
      <h3 className="panel-title">Affiches</h3>
      <div className="export-list">
        <button className="export-item" onClick={() => open(poster('portrait'))}>
          <span>Affiche verticale 2:3</span>
          <small>PNG jusqu’à 4000 × 6000 · SVG</small>
        </button>
        <button className="export-item" onClick={() => open(poster('square'))}>
          <span>Instagram carré 1:1</span>
          <small>PNG jusqu’à 4000 × 4000 · SVG</small>
        </button>
      </div>
      <h3 className="panel-title">Logos</h3>
      <label className="field">
        <span>Couleurs du logo exporté</span>
        <select value={toneKey} onChange={(e) => setToneKey(e.target.value as ToneKey)}>
          {Object.entries(tones).map(([k, t]) => (
            <option key={k} value={k}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <div className="export-list">
        {logos.map((l) => (
          <button key={l.label} className="export-item" onClick={() => open(logo(l.variant, toneKey, l.layout))}>
            <span>{l.label}</span>
            <small>SVG · PNG transparent</small>
          </button>
        ))}
      </div>
      <button className="btn" onClick={all} disabled={!!progress && progress !== 'Terminé'}>
        {progress ? `Téléchargement ${progress}` : 'Tout télécharger (10 fichiers)'}
      </button>
      <p className="hint">Le navigateur peut demander l’autorisation de télécharger plusieurs fichiers.</p>
    </div>
  );
}
