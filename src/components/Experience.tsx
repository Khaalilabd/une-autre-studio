import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONCEPTS } from '../concepts';
import { resolveColors, splitBrand } from '../data/content';
import { CHAPTERS } from '../data/experience';
import type { ConceptDef, Colors, EventContent } from '../data/types';
import { Grain } from '../graphics/common';
import { FONT } from '../lib/fonts';
import { artworkBitmap } from '../lib/textures';
import { useStudio, type Route } from '../state/store';
import { posterElement } from './Artwork';
import { PosterStage } from './PosterStage';

const AUDIO_SRC = `${import.meta.env.BASE_URL}audio/une-autre-ambiance.mp3`;

/** Back of the sheet: the primary logo, as a printed verso. */
function Verso({ def, content, colors, texture }: { def: ConceptDef; content: EventContent; colors: Colors; texture: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1500" width={1000} height={1500}>
      <rect width={1000} height={1500} fill={colors.bg} />
      <def.Logo variant="primary" layout="stacked" brand={content.brand} tone={{ fg: colors.fg, accent: colors.accent }} x={80} y={330} width={840} height={760} />
      <line x1={80} x2={920} y1={1340} y2={1340} stroke={colors.fg} strokeWidth={1} opacity={0.5} />
      <text x={80} y={1388} fontFamily={FONT.mono} fontSize={18} letterSpacing={4} fill={colors.fg} opacity={0.8}>
        {`PISTE ${def.index} — ${def.name.toUpperCase()}`}
      </text>
      <text x={920} y={1388} textAnchor="end" fontFamily={FONT.mono} fontSize={18} letterSpacing={4} fill={colors.fg} opacity={0.8}>
        {content.edition}
      </text>
      <Grain width={1000} height={1500} amount={texture * 0.8} color={colors.background === 'paper' ? '#3a2c1a' : colors.paper} seed={9} />
    </svg>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

export function Experience({ go }: { go: (r: Route) => void }) {
  const { content, settings, photo, favorites, toggleFavorite } = useStudio();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [touring, setTouring] = useState(false);
  const [sound, setSound] = useState(false);
  const [audioOk, setAudioOk] = useState(true);
  const [art, setArt] = useState<{ key: string; front: ImageBitmap | null; back: ImageBitmap | null }>({ key: '', front: null, back: null });
  const audio = useRef<HTMLAudioElement | null>(null);
  const wheelLock = useRef(0);

  const def = CONCEPTS[index];
  const ch = CHAPTERS[def.id];
  const s = settings[def.id];
  const artKey = useMemo(() => `${def.id}|${JSON.stringify(s)}|${JSON.stringify(content)}|${photo ? photo.length : 0}`, [def.id, s, content, photo]);

  // Build the real artwork bitmaps for the current chapter, then warm up the others.
  useEffect(() => {
    let alive = true;
    const build = (d: ConceptDef) => {
      const st = settings[d.id];
      const key = `${d.id}|${JSON.stringify(st)}|${JSON.stringify(content)}|${photo ? photo.length : 0}`;
      const c = resolveColors(d, st);
      return Promise.all([
        artworkBitmap('f' + key, posterElement(d, content, st, photo, 'portrait'), 1000, 1500),
        artworkBitmap('b' + key, <Verso def={d} content={content} colors={c} texture={st.texture} />, 1000, 1500),
      ]);
    };
    build(def).then(([front, back]) => {
      if (!alive) return;
      setArt({ key: artKey, front, back });
      CONCEPTS.filter((c) => c.id !== def.id).reduce((p, c) => p.then(() => build(c)).then(() => undefined), Promise.resolve());
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artKey]);

  const goTo = useCallback((i: number) => {
    setIndex(((i % CONCEPTS.length) + CONCEPTS.length) % CONCEPTS.length);
    setFlipped(false);
  }, []);
  const stopTour = useCallback(() => setTouring(false), []);

  // Wheel / keyboard chapter navigation.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 18) return;
      const now = Date.now();
      if (now < wheelLock.current) return;
      wheelLock.current = now + 950;
      stopTour();
      goTo(index + (e.deltaY > 0 ? 1 : -1));
    };
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        stopTour();
        goTo(index + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        stopTour();
        goTo(index - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'Enter') go({ name: 'concept', id: def.id });
    };
    // Vertical swipe on touch screens.
    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchY === null) return;
      const dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) > 60) {
        stopTour();
        goTo(index + (dy > 0 ? 1 : -1));
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [index, goTo, stopTour, go, def.id]);

  // Guided tour: recto → verso → next chapter.
  useEffect(() => {
    if (!touring) return;
    const a = setTimeout(() => setFlipped(true), 4200);
    const b = setTimeout(() => goTo(index + 1), 7400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [touring, index, goTo]);

  // Ambient music (optional file in public/audio).
  useEffect(() => {
    const el = new Audio(AUDIO_SRC);
    el.loop = true;
    el.volume = 0;
    el.addEventListener('error', () => setAudioOk(false));
    audio.current = el;
    return () => {
      el.pause();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    let raf = 0;
    const target = sound ? 0.35 : 0;
    if (sound) el.play().catch(() => setSound(false));
    const fade = () => {
      el.volume = Math.max(0, Math.min(1, el.volume + (target - el.volume) * 0.08));
      if (Math.abs(el.volume - target) > 0.01) raf = requestAnimationFrame(fade);
      else if (!sound) el.pause();
    };
    raf = requestAnimationFrame(fade);
    return () => cancelAnimationFrame(raf);
  }, [sound]);

  const startTour = () => {
    if (touring) return setTouring(false);
    setTouring(true);
    if (audioOk) setSound(true);
  };

  const { base } = splitBrand(content.brand);
  const fav = favorites.includes(def.id);

  return (
    <div className="xp" style={{ ['--tint-a' as string]: ch.tint[0], ['--tint-b' as string]: ch.tint[1] }}>
      <div className="xp-bg" aria-hidden />
      <PosterStage front={art.front} back={art.back} chapterKey={art.key.split('|')[0]} rim={ch.rim} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />

      <header className="xp-nav">
        <a className="xp-brand" href="#/">
          {base.toUpperCase()}
          <span>?</span>
        </a>
        <nav>
          <button onClick={() => go({ name: 'atelier' })}>Les {CONCEPTS.length} pistes</button>
          <button onClick={() => go({ name: 'concept', id: def.id })}>L’atelier</button>
          <button onClick={() => go({ name: 'compare' })}>Comparer</button>
          <button onClick={() => go({ name: 'concept', id: def.id, sheet: 'logos' })}>Système de logo</button>
        </nav>
        <div className="xp-nav-right">
          <span className="xp-lang">
            <b>FR</b> / EN
          </span>
          <button className="xp-cta" onClick={() => go({ name: 'concept', id: def.id })}>
            Ouvrir l’atelier <i>↗</i>
          </button>
        </div>
      </header>

      <aside className="xp-rail" aria-label="Chapitres">
        <span className="xp-rail-num">{pad(index + 1)}</span>
        <ol>
          {CONCEPTS.map((c, i) => (
            <li key={c.id} className={i === index ? 'on' : ''}>
              <button
                onClick={() => {
                  stopTour();
                  goTo(i);
                }}
                aria-label={`${c.index} ${c.name}`}
              >
                <i />
              </button>
            </li>
          ))}
        </ol>
        <span className="xp-rail-label">Les pistes</span>
      </aside>

      <section className="xp-copy" key={def.id}>
        <p className="xp-eyebrow">Identité visuelle · piste {def.index} / {pad(CONCEPTS.length)}</p>
        <h1 style={{ fontSize: `calc(clamp(54px, 6.4vw, 118px) * ${Math.min(1, 9.5 / Math.max(...ch.title.map((l) => l.length)))})` }}>
          {ch.title.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </h1>
        <p className="xp-lede">{def.description}</p>
        <button className={`xp-play ${touring ? 'on' : ''}`} onClick={startTour}>
          <span className="xp-play-icon">{touring ? '❚❚' : '▶'}</span>
          <span>
            <b>{touring ? 'Visite en cours' : 'Lancer la visite'}</b>
            <small>{audioOk ? 'Visite guidée · avec musique' : 'Visite guidée des pistes'}</small>
          </span>
        </button>
        <p className="xp-scroll">↓ Faire défiler pour explorer</p>
      </section>

      <section className="xp-side" key={def.id + 'side'}>
        <p className="xp-tagline">{ch.tagline}</p>
        <p className="xp-meta">
          {def.short}
          <br />
          {flipped ? 'Verso · logo principal' : 'Recto · affiche 2:3'}
        </p>
        <button className={`xp-fav ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(def.id)}>
          {fav ? '★ Dans mes favoris' : '☆ Ajouter aux favoris'}
        </button>
      </section>

      <footer className="xp-foot">
        <div className="xp-face">
          <span>{pad(index + 1)}</span>
          <i />
          <button className={!flipped ? 'on' : ''} onClick={() => setFlipped(false)}>
            L’affiche
          </button>
          <button className={flipped ? 'on' : ''} onClick={() => setFlipped(true)}>
            Le logo
          </button>
        </div>
        <p className="xp-hint">Cliquez le tirage pour le retourner · glissez pour le faire tourner</p>
        {audioOk && (
          <button className={`xp-sound ${sound ? 'on' : ''}`} onClick={() => setSound((v) => !v)} aria-label={sound ? 'Couper la musique' : 'Activer la musique'}>
            <span />
            <span />
            <span />
            <span />
          </button>
        )}
      </footer>
    </div>
  );
}
