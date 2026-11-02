import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CONCEPTS } from '../concepts';
import { DEFAULT_CONTENT } from '../data/content';
import type { ConceptId, CreativeSettings, EventContent } from '../data/types';

interface Persisted {
  content: EventContent;
  settings: Record<ConceptId, CreativeSettings>;
  favorites: ConceptId[];
  compare: ConceptId[];
  photo: string | null;
}

const KEY = 'une-autre-studio/v1';

const defaults = (): Persisted => ({
  content: structuredClone(DEFAULT_CONTENT),
  settings: Object.fromEntries(CONCEPTS.map((c) => [c.id, { ...c.defaults }])) as Record<ConceptId, CreativeSettings>,
  favorites: [],
  compare: ['ink', 'signal'],
  photo: null,
});

function load(): Persisted {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Persisted>;
    const ids = new Set(CONCEPTS.map((c) => c.id));
    return {
      content: { ...base.content, ...saved.content, lineup: saved.content?.lineup ?? base.content.lineup },
      settings: Object.fromEntries(CONCEPTS.map((c) => [c.id, { ...c.defaults, ...saved.settings?.[c.id] }])) as Persisted['settings'],
      favorites: (saved.favorites ?? []).filter((id) => ids.has(id)),
      compare: (saved.compare ?? base.compare).filter((id) => ids.has(id)),
      photo: saved.photo ?? null,
    };
  } catch {
    return base;
  }
}

interface Store extends Persisted {
  setContent: (patch: Partial<EventContent>) => void;
  setSettings: (id: ConceptId, patch: Partial<CreativeSettings>) => void;
  resetConcept: (id: ConceptId) => void;
  resetContent: () => void;
  resetAll: () => void;
  toggleFavorite: (id: ConceptId) => void;
  toggleCompare: (id: ConceptId) => void;
  setPhoto: (src: string | null) => void;
  storageWarning: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);
  const [storageWarning, setWarning] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        setWarning(false);
      } catch {
        // Usually a large uploaded photo exceeding quota: keep everything but the photo.
        try {
          localStorage.setItem(KEY, JSON.stringify({ ...state, photo: null }));
        } catch {
          /* storage unavailable */
        }
        setWarning(true);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [state]);

  const setContent = useCallback((patch: Partial<EventContent>) => setState((s) => ({ ...s, content: { ...s.content, ...patch } })), []);
  const setSettings = useCallback(
    (id: ConceptId, patch: Partial<CreativeSettings>) => setState((s) => ({ ...s, settings: { ...s.settings, [id]: { ...s.settings[id], ...patch } } })),
    [],
  );
  const resetConcept = useCallback((id: ConceptId) => {
    const def = CONCEPTS.find((c) => c.id === id)!;
    setState((s) => ({ ...s, settings: { ...s.settings, [id]: { ...def.defaults } } }));
  }, []);
  const resetContent = useCallback(() => setState((s) => ({ ...s, content: structuredClone(DEFAULT_CONTENT) })), []);
  const resetAll = useCallback(() => setState(defaults()), []);
  const toggleFavorite = useCallback(
    (id: ConceptId) => setState((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] })),
    [],
  );
  const toggleCompare = useCallback(
    (id: ConceptId) =>
      setState((s) => {
        if (s.compare.includes(id)) return { ...s, compare: s.compare.filter((c) => c !== id) };
        const next = [...s.compare, id];
        return { ...s, compare: next.length > 3 ? next.slice(next.length - 3) : next };
      }),
    [],
  );
  const setPhoto = useCallback((photo: string | null) => setState((s) => ({ ...s, photo })), []);

  const value = useMemo<Store>(
    () => ({ ...state, setContent, setSettings, resetConcept, resetContent, resetAll, toggleFavorite, toggleCompare, setPhoto, storageWarning }),
    [state, setContent, setSettings, resetConcept, resetContent, resetAll, toggleFavorite, toggleCompare, setPhoto, storageWarning],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudio() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStudio outside provider');
  return s;
}

/* Hash routing: #/ · #/c/<id>[/<sheet>] · #/compare */
export const SHEETS = ['affiche', 'carre', 'logos', 'tests', 'applications', 'systeme'] as const;
export type Sheet = (typeof SHEETS)[number];
export type Route = { name: 'overview' } | { name: 'atelier' } | { name: 'concept'; id: ConceptId; sheet?: Sheet } | { name: 'compare' };

function parse(hash: string): Route {
  const m = /^#\/c\/([a-z]+)(?:\/([a-z]+))?/.exec(hash);
  if (m && CONCEPTS.some((c) => c.id === m[1])) {
    const sheet = SHEETS.includes(m[2] as Sheet) ? (m[2] as Sheet) : undefined;
    return { name: 'concept', id: m[1] as ConceptId, sheet };
  }
  if (hash.startsWith('#/compare')) return { name: 'compare' };
  if (hash.startsWith('#/atelier')) return { name: 'atelier' };
  return { name: 'overview' };
}

export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r: Route) => {
    location.hash =
      r.name === 'concept' ? `#/c/${r.id}${r.sheet ? '/' + r.sheet : ''}` : r.name === 'compare' ? '#/compare' : r.name === 'atelier' ? '#/atelier' : '#/';
  }, []);
  return [route, go];
}
