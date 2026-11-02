import { CONCEPTS } from '../concepts';
import type { ConceptId } from '../data/types';
import { useStudio } from '../state/store';
import { PosterArt } from './Artwork';

/** Contact strip: every direction as a small print; used for navigation and selection. */
export function Strip({ current, onPick, mode = 'nav' }: { current?: ConceptId; onPick: (id: ConceptId) => void; mode?: 'nav' | 'select' }) {
  const { favorites, compare } = useStudio();
  return (
    <nav className="strip" aria-label={mode === 'nav' ? 'Planche contact' : 'Tirages sur la table'}>
      {CONCEPTS.map((c, i) => {
        const on = mode === 'nav' ? c.id === current : compare.includes(c.id);
        return (
          <button key={c.id} className={`frame ${on ? 'on' : ''}`} onClick={() => onPick(c.id)} aria-pressed={on} title={`${c.index} ${c.name} — touche ${i + 1}`}>
            <span className="frame-num">
              {c.index}
              {favorites.includes(c.id) && <em>★</em>}
              {mode === 'nav' && compare.includes(c.id) && <em className="cmp">⇆</em>}
            </span>
            <PosterArt def={c} format="portrait" />
            <span className="frame-name">{c.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
