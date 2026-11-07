import { useState } from 'react';
import { CONCEPTS, SERIES } from '../concepts';
import type { ConceptDef } from '../data/types';
import { useStudio, type Route } from '../state/store';
import { PosterArt } from './Artwork';
import { Print } from './Print';

const TILTS = [-0.9, 0.6, -0.4, 0.8, -0.7, 0.5];

/** The prints laid out on the table. */
export function Table({ go }: { go: (r: Route) => void }) {
  const { favorites, compare, toggleFavorite, toggleCompare } = useStudio();
  const [onlyFav, setOnlyFav] = useState(false);
  const list = onlyFav ? CONCEPTS.filter((c) => favorites.includes(c.id)) : CONCEPTS;
  const main = list.filter((c) => !c.series);

  const item = (def: ConceptDef) => {
    const fav = favorites.includes(def.id);
    const cmp = compare.includes(def.id);
    return (
      <article key={def.id} className="spread-item">
        <button className="spread-hit" onClick={() => go({ name: 'concept', id: def.id, sheet: def.series ? 'anime' : undefined })} aria-label={`Examiner ${def.name}`}>
          <Print tilt={TILTS[CONCEPTS.indexOf(def) % TILTS.length]}>
            <PosterArt def={def} format="portrait" />
          </Print>
          {def.series && <span className="anim-badge">▶ Animée</span>}
        </button>
        <div className="spread-caption">
          <span className="idx">{def.index}</span>
          <div>
            <h2>{def.name}</h2>
            <p>{def.short}</p>
          </div>
        </div>
        <ul className="ticks" aria-label="Palette">
          {def.palette.map((p) => (
            <li key={p.hex} style={{ background: p.hex }} title={`${p.name} ${p.hex}`} />
          ))}
        </ul>
        <div className="spread-actions">
          <button className={`mark ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(def.id)} aria-pressed={fav}>
            {fav ? '★ Favori' : '☆ Favori'}
          </button>
          <button className={`mark ${cmp ? 'on' : ''}`} onClick={() => toggleCompare(def.id)} aria-pressed={cmp}>
            {cmp ? '⇆ Sur la table' : '⇆ Comparer'}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="table-view">
      <header className="table-head">
        <p>
          <b>{CONCEPTS.length} pistes d’identité</b> posées sur la table. Cliquez un tirage pour l’examiner — ou tapez <kbd>1</kbd>…<kbd>9</kbd>.
        </p>
        <div className="table-filters">
          <button className={`tbtn ${!onlyFav ? 'on' : ''}`} onClick={() => setOnlyFav(false)}>
            Tous · {String(CONCEPTS.length).padStart(2, '0')}
          </button>
          <button className={`tbtn ${onlyFav ? 'on' : ''}`} onClick={() => setOnlyFav(true)}>
            ★ Favoris · {String(favorites.length).padStart(2, '0')}
          </button>
          <button className="tbtn" onClick={() => go({ name: 'compare' })}>
            ⇆ Comparer · {String(compare.length).padStart(2, '0')}
          </button>
        </div>
      </header>

      {list.length === 0 && <p className="table-empty">Aucun favori. Marquez un tirage avec ★.</p>}

      {SERIES.map((se) => {
        const items = list.filter((c) => c.series === se.id);
        if (!items.length) return null;
        return (
          <section key={se.id} className={`series series-${se.id}`}>
            <header className="series-head">
              <p className="series-kicker">
                Série spéciale · {items[0].index}–{items[items.length - 1].index} · {String(items.length).padStart(2, '0')} affiches animées
              </p>
              <h2>{se.name}</h2>
              <p>{se.blurb}</p>
            </header>
            <div className="spread spread-series" style={{ ['--n' as string]: items.length }}>{items.map(item)}</div>
          </section>
        );
      })}

      {main.length > 0 && main.length < list.length && <p className="series-sep">Les pistes d’identité · {String(main.length).padStart(2, '0')}</p>}
      <div className="spread">{main.map(item)}</div>
    </div>
  );
}
