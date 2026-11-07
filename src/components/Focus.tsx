import { useEffect, useState } from 'react';
import { CONCEPTS, SERIES } from '../concepts';
import type { ConceptDef, LogoVariant } from '../data/types';
import { download, slug, toSvgDocument } from '../lib/exporter';
import { sheetsFor, useStudio, type Route, type Sheet } from '../state/store';
import { Applications, LogoTests, PhoneMock } from './Applications';
import { LogoArt, PosterArt, posterElement, useConceptColors } from './Artwork';
import { ContentEditor, CreativeControls } from './Editor';
import { useExport } from './ExportDialog';
import { ExportPanel, useJobs } from './ExportPanel';
import { Note, Print } from './Print';
import { Strip } from './Strip';

type Tool = 'create' | 'content' | 'export';

const SHEET_LABEL: Record<Sheet, string> = {
  affiche: 'Affiche 2:3',
  carre: 'Carré 1:1',
  anime: 'Affiche animée',
  logos: 'Logos',
  tests: 'Tests',
  applications: 'Applications',
  systeme: 'Système',
};

const TOOLS: { key: Tool; label: string; kbd: string }[] = [
  { key: 'create', label: 'Réglages', kbd: 'R' },
  { key: 'content', label: 'Texte', kbd: 'T' },
  { key: 'export', label: 'Export', kbd: 'E' },
];

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
};

export function Focus({ def, sheet: asked = 'affiche', go }: { def: ConceptDef; sheet?: Sheet; go: (r: Route) => void }) {
  const { content, settings, photo, favorites, compare, toggleFavorite, toggleCompare } = useStudio();
  const SHEETS = sheetsFor(def);
  const sheet = SHEETS.includes(asked) ? asked : 'affiche';
  const saveAnimated = async (format: 'portrait' | 'square') => {
    const svg = await toSvgDocument(posterElement(def, content, s, photo, format, true));
    download(svg, `${slug(content.brand)}_${def.index}-${def.id}_affiche-animee-${format === 'portrait' ? '2x3' : '1x1'}.svg`);
  };
  const [tool, setTool] = useState<Tool | null>(null);
  const s = settings[def.id];
  const colors = useConceptColors(def);
  const open = useExport();
  const { logo, poster } = useJobs(def);
  const i = CONCEPTS.findIndex((c) => c.id === def.id);
  const fav = favorites.includes(def.id);
  const cmp = compare.includes(def.id);
  const toSheet = (sh: Sheet) => go({ name: 'concept', id: def.id, sheet: sh });
  const toConcept = (k: number) => go({ name: 'concept', id: CONCEPTS[(k + CONCEPTS.length) % CONCEPTS.length].id, sheet: asked });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowright') toConcept(i + 1);
      else if (k === 'arrowleft') toConcept(i - 1);
      else if (k === 'arrowdown' || k === 'arrowup') {
        const j = SHEETS.indexOf(sheet) + (k === 'arrowdown' ? 1 : -1);
        if (j >= 0 && j < SHEETS.length) {
          e.preventDefault();
          toSheet(SHEETS[j]);
        }
      } else if (k === 'f') toggleFavorite(def.id);
      else if (k === 'c') toggleCompare(def.id);
      else if (k === 'r' || k === 't' || k === 'e') {
        const t = TOOLS.find((x) => x.kbd.toLowerCase() === k)!.key;
        setTool((cur) => (cur === t ? null : t));
      } else if (k === 'escape') setTool(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const logoSheets: { label: string; variant: LogoVariant; layout?: 'stacked' | 'line' }[] = [
    { label: 'Principal — empilé', variant: 'primary', layout: 'stacked' },
    { label: 'Principal — en ligne', variant: 'primary', layout: 'line' },
    { label: 'Secondaire', variant: 'secondary' },
    { label: 'Symbole', variant: 'symbol' },
  ];

  return (
    <div className={`focus ${tool ? 'with-tool' : ''}`}>
      <aside className="anno">
        <p className="anno-idx">
          PL.{def.index}
          <span>/{String(CONCEPTS.length).padStart(2, '0')}</span>
        </p>
        <h1>{def.name}</h1>
        <p className="anno-short">{def.short}</p>
        <p className="anno-desc">{def.description}</p>
        <div className="anno-block">
          <Note k="Fond" v={{ paper: 'Ivoire', dark: 'Noir', accent: 'Couleur' }[s.background]} />
          <Note k="Accent" v={s.accent.toUpperCase()} />
          <Note k="Titre" v={{ stacked: 'Empilé', line: 'En ligne', symbol: 'Symbole', badge: 'Logo tournant' }[s.titleLayout]} />
          <Note k="Logo" v={`${Math.round(s.logoScale * 100)} %`} />
          <Note k="Grain" v={`${Math.round(s.texture * 100)} %`} />
          <Note k="Photo" v={s.photo ? 'Oui' : 'Non'} />
        </div>
        <ul className="anno-palette">
          {def.palette.map((p) => (
            <li key={p.hex}>
              <i style={{ background: p.hex }} />
              <span>{p.hex.toUpperCase()}</span>
              <small>{p.name}</small>
            </li>
          ))}
        </ul>
        <div className="anno-marks">
          <button className={`mark ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(def.id)} aria-pressed={fav}>
            {fav ? '★' : '☆'} Favori <kbd>F</kbd>
          </button>
          <button className={`mark ${cmp ? 'on' : ''}`} onClick={() => toggleCompare(def.id)} aria-pressed={cmp}>
            ⇆ {cmp ? 'Sur la table' : 'Comparer'} <kbd>C</kbd>
          </button>
        </div>
        <div className="anno-keys">
          <p>
            <kbd>←</kbd>
            <kbd>→</kbd> pistes
          </p>
          <p>
            <kbd>↑</kbd>
            <kbd>↓</kbd> planches
          </p>
          <p>
            <kbd>R</kbd>
            <kbd>T</kbd>
            <kbd>E</kbd> outils
          </p>
        </div>
      </aside>

      <section className="stage">
        <nav className="sheets" aria-label="Planches">
          {SHEETS.map((sh, k) => (
            <button key={sh} className={sh === sheet ? 'on' : ''} onClick={() => toSheet(sh)}>
              <span>{String.fromCharCode(65 + k)}</span>
              {SHEET_LABEL[sh]}
            </button>
          ))}
        </nav>

        <div className={`stage-body sheet-${sheet}`}>
          {sheet === 'affiche' && (
            <div className="sheet-poster">
              <Print dims={{ w: '1000 px', h: '1500 px' }} className="hero-print">
                <PosterArt def={def} format="portrait" />
              </Print>
              <div className="sheet-side">
                <Note k="Format" v="2:3 vertical" />
                <Note k="Artboard" v="1000 × 1500" />
                <Note k="Export" v="→ 4000 × 6000" />
                <button className="tbtn solid" onClick={() => open(poster('portrait'))}>
                  Exporter ce tirage
                </button>
              </div>
            </div>
          )}

          {sheet === 'carre' && (
            <div className="sheet-poster">
              <Print dims={{ w: '1000 px', h: '1000 px' }} className="hero-print square">
                <PosterArt def={def} format="square" />
              </Print>
              <div className="sheet-side">
                <Note k="Format" v="1:1 Instagram" />
                <Note k="Artboard" v="1000 × 1000" />
                <button className="tbtn solid" onClick={() => open(poster('square'))}>
                  Exporter ce tirage
                </button>
                <PhoneMock def={def} format="square" />
              </div>
            </div>
          )}

          {sheet === 'anime' && def.Live && (
            <div className="sheet-live">
              <def.Live content={content} settings={s} />
            </div>
          )}

          {sheet === 'anime' && !def.Live && (
            <div className="sheet-poster">
              <Print dims={{ w: '1000 px', h: '1500 px' }} className="hero-print">
                <PosterArt def={def} format="portrait" animated />
              </Print>
              <div className="sheet-side">
                <Note k="Série" v={SERIES.find((x) => x.id === def.series)?.name ?? ''} />
                <Note k="Mouvement" v="Boucle continue" />
                <Note k="Texte" v="Fixe" />
                <Note k="Fichier" v="SVG animé (SMIL)" />
                <button className="tbtn solid" onClick={() => saveAnimated('portrait')}>
                  Télécharger 2:3 animé
                </button>
                <button className="tbtn" onClick={() => saveAnimated('square')}>
                  Télécharger 1:1 animé
                </button>
                <div className="anim-square">
                  <PosterArt def={def} format="square" animated />
                </div>
                <small className="anim-hint">Le SVG s’ouvre et s’anime dans n’importe quel navigateur. Pour Instagram, enregistrez-le en vidéo (Cmd + Maj + 5).</small>
              </div>
            </div>
          )}

          {sheet === 'logos' && (
            <div className="sheet-scroll">
              <div className="logo-sheet">
                {logoSheets.map((l) => (
                  <figure key={l.label}>
                    <Print>
                      <LogoArt def={def} variant={l.variant} layout={l.layout} />
                    </Print>
                    <figcaption>
                      <span>{l.label}</span>
                      <button className="tbtn" onClick={() => open(logo(l.variant, 'concept', l.layout))}>
                        Exporter
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
              {def.Explorations && (
                <div className="explore-wrap" style={{ background: colors.bg }}>
                  <p className="sheet-label" style={{ color: colors.fg }}>
                    Interprétations du signe
                  </p>
                  <def.Explorations tone={{ fg: colors.fg, accent: colors.accent }} />
                </div>
              )}
            </div>
          )}

          {sheet === 'tests' && (
            <div className="sheet-scroll">
              <LogoTests def={def} settings={s} />
            </div>
          )}

          {sheet === 'applications' && (
            <div className="sheet-scroll">
              <Applications def={def} />
            </div>
          )}

          {sheet === 'systeme' && (
            <div className="sheet-scroll system">
              <section>
                <p className="sheet-label">Palette</p>
                <ul className="swatches-big">
                  {def.palette.map((p) => (
                    <li key={p.hex}>
                      <i style={{ background: p.hex }} />
                      <b>{p.name}</b>
                      <span>{p.hex.toUpperCase()}</span>
                      <small>{p.role}</small>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <p className="sheet-label">Typographie</p>
                <ul className="type-specs">
                  {def.typography.map((t) => (
                    <li key={t.role}>
                      <p className="type-meta">
                        {t.role} — {t.family}
                        {t.custom && <em> · dessin original</em>}
                      </p>
                      {t.custom ? (
                        <div className="type-custom">
                          <LogoArt def={def} variant="secondary" bg="transparent" tone={{ fg: '#ece7dd', accent: s.accent }} />
                        </div>
                      ) : (
                        <p className="type-sample" style={{ fontFamily: t.css, fontWeight: t.weight, fontStyle: t.italic ? 'italic' : undefined }}>
                          {t.sample}
                        </p>
                      )}
                      <small>{t.note}</small>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rationale">
                <p className="sheet-label">Intention</p>
                {def.rationale.map((p, k) => (
                  <p key={k}>
                    <span>{String(k + 1).padStart(2, '0')}</span>
                    {p}
                  </p>
                ))}
              </section>
            </div>
          )}
        </div>
      </section>

      {tool && (
        <aside className="drawer" aria-label="Outils">
          <div className="drawer-tabs" role="tablist">
            {TOOLS.map((t) => (
              <button key={t.key} role="tab" aria-selected={tool === t.key} className={tool === t.key ? 'on' : ''} onClick={() => setTool(t.key)}>
                {t.label}
              </button>
            ))}
            <button className="drawer-close" onClick={() => setTool(null)} aria-label="Fermer">
              ✕
            </button>
          </div>
          <div className="drawer-body">
            {tool === 'create' && <CreativeControls def={def} />}
            {tool === 'content' && <ContentEditor />}
            {tool === 'export' && <ExportPanel def={def} />}
          </div>
        </aside>
      )}

      <div className="rail" role="toolbar" aria-label="Outils">
        {TOOLS.map((t) => (
          <button key={t.key} className={tool === t.key ? 'on' : ''} onClick={() => setTool(tool === t.key ? null : t.key)} title={`${t.label} (${t.kbd})`}>
            <kbd>{t.kbd}</kbd>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <Strip current={def.id} onPick={(id) => go({ name: 'concept', id, sheet })} />
    </div>
  );
}
