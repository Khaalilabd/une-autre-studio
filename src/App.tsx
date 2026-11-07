import { useEffect } from 'react';
import { CONCEPTS, CONCEPT_BY_ID } from './concepts';
import { Book } from './components/Book';
import { Bracelets } from './components/Bracelets';
import { Compare } from './components/Compare';
import { Crew } from './components/Crew';
import { Stickers } from './components/Stickers';
import { Meetings } from './components/Meetings';
import { Extra } from './components/Extra';
import { Experience } from './components/Experience';
import { ExportProvider } from './components/ExportDialog';
import { Focus } from './components/Focus';
import { Table } from './components/Table';
import { StudioProvider, useRoute, useStudio } from './state/store';

function Shell() {
  const [route, go] = useRoute();
  const { compare, favorites, resetAll } = useStudio();

  // 1–9 open a direction from anywhere; G returns to the table.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (route.name === 'overview') return;
      if (n >= 1 && n <= CONCEPTS.length) go({ name: 'concept', id: CONCEPTS[n - 1].id, sheet: route.name === 'concept' ? route.sheet : undefined });
      else if (e.key.toLowerCase() === 'g') go({ name: 'atelier' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, route]);

  return (
    <div className={`app route-${route.name}`}>
      {route.name === 'overview' && <Experience go={go} />}
      {route.name !== 'overview' && (
      <header className="topbar">
        <a className="brand" href="#/atelier">
          <span className="brand-q">?</span>
          UNE AUTRE <i>/</i> <span className="brand-studio">Studio</span>
        </a>
        <nav className="topnav">
          <a href="#/">Présentation</a>
          <a href="#/atelier" className={route.name === 'atelier' ? 'on' : ''}>
            Les pistes <kbd>G</kbd>
          </a>
          <a href="#/bracelets" className={route.name === 'bracelets' ? 'on' : ''}>
            Bracelets
          </a>
          <a href="#/book" className={route.name === 'book' ? 'on' : ''}>
            Book
          </a>
          <a href="#/crew" className={route.name === 'crew' ? 'on' : ''}>
            Crew
          </a>
          <a href="#/stickers" className={route.name === 'stickers' ? 'on' : ''}>
            Stickers
          </a>
          <a href="#/reunions" className={route.name === 'reunions' ? 'on' : ''}>
            Réunions
          </a>
          <a href="#/extra" className={route.name === 'extra' ? 'on' : ''}>
            Extra
          </a>
          <a href="#/compare" className={route.name === 'compare' ? 'on' : ''}>
            Comparer [{compare.length}]
          </a>
          <span className="topnav-dim">★ {favorites.length}</span>
          <button
            className="topnav-dim"
            onClick={() => {
              if (confirm('Réinitialiser tout le studio (contenu, réglages, favoris, photo) ?')) resetAll();
            }}
          >
            Réinitialiser
          </button>
        </nav>
      </header>
      )}
      {route.name === 'atelier' && <Table go={go} />}
      {route.name === 'compare' && <Compare go={go} />}
      {route.name === 'bracelets' && <Bracelets />}
      {route.name === 'crew' && <Crew />}
      {route.name === 'stickers' && <Stickers />}
      {route.name === 'reunions' && <Meetings />}
      {route.name === 'extra' && <Extra />}
      {route.name === 'book' && <Book />}
      {route.name === 'concept' && <Focus def={CONCEPT_BY_ID[route.id]} sheet={route.sheet} go={go} />}
    </div>
  );
}

export default function App() {
  return (
    <StudioProvider>
      <ExportProvider>
        <Shell />
      </ExportProvider>
    </StudioProvider>
  );
}
