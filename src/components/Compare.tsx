import { useState } from 'react';
import { CONCEPT_BY_ID } from '../concepts';
import { useStudio, type Route } from '../state/store';
import { LogoArt, PosterArt, testTones } from './Artwork';
import { Print } from './Print';
import { Strip } from './Strip';

type View = 'portrait' | 'square' | 'logos';

/** Up to three prints pulled out side by side on the table. */
export function Compare({ go }: { go: (r: Route) => void }) {
  const { compare, toggleCompare, favorites, toggleFavorite, settings } = useStudio();
  const [view, setView] = useState<View>('portrait');
  const picked = compare.map((id) => CONCEPT_BY_ID[id]);

  return (
    <div className="compare-view">
      <header className="table-head">
        <p>
          <b>Comparaison</b> — {picked.length} tirage{picked.length > 1 ? 's' : ''} sur la table (3 max.). Choisissez-les dans la planche contact.
        </p>
        <div className="table-filters" role="radiogroup" aria-label="Vue">
          {(
            [
              ['portrait', 'Affiches 2:3'],
              ['square', 'Carrés 1:1'],
              ['logos', 'Logos'],
            ] as [View, string][]
          ).map(([k, l]) => (
            <button key={k} role="radio" aria-checked={view === k} className={`tbtn ${view === k ? 'on' : ''}`} onClick={() => setView(k)}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <div className={`compare-table n${picked.length}`}>
        {picked.length < 2 && <p className="table-empty">Posez au moins deux tirages sur la table : cliquez-les dans la planche ci-dessous.</p>}
        {picked.map((def) => (
          <section key={def.id} className="compare-col">
            {view === 'logos' ? (
              <div className="compare-logos">
                <Print>
                  <LogoArt def={def} variant="primary" layout="stacked" />
                </Print>
                <Print>
                  <LogoArt def={def} variant="secondary" />
                </Print>
                <div className="sym-row">
                  {testTones(def, settings[def.id]).map((g) => (
                    <LogoArt key={g.key} def={def} variant="symbol" bg={g.bg} tone={g.tone} />
                  ))}
                </div>
              </div>
            ) : (
              <Print className={view}>
                <PosterArt def={def} format={view} />
              </Print>
            )}
            <div className="spread-caption">
              <span className="idx">{def.index}</span>
              <div>
                <h2>{def.name}</h2>
                <p>{def.short}</p>
              </div>
            </div>
            <div className="spread-actions">
              <button className={`mark ${favorites.includes(def.id) ? 'on' : ''}`} onClick={() => toggleFavorite(def.id)}>
                {favorites.includes(def.id) ? '★ Favori' : '☆ Favori'}
              </button>
              <button className="mark" onClick={() => go({ name: 'concept', id: def.id })}>
                Examiner →
              </button>
              <button className="mark" onClick={() => toggleCompare(def.id)}>
                Retirer
              </button>
            </div>
          </section>
        ))}
      </div>

      <Strip mode="select" onPick={toggleCompare} />
    </div>
  );
}
