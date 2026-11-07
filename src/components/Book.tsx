import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { CONCEPT_BY_ID } from '../concepts';
import { posterElement } from './Artwork';
import { lines } from '../data/content';
import type { ConceptDef, ConceptId, EventContent } from '../data/types';
import { RingLogo } from '../graphics/ringLogo';
import { FONT } from '../lib/fonts';
import { useStudio } from '../state/store';
import { DROPS, TeeMock } from './teeDrops';
import { Band3D, DESIGNS } from './Wristbands';

/**
 * Book master — the presentation sent to partner venues. Twelve A4 landscape
 * pages: concept, reasons, identity, music, the crew show, the edition system
 * (one theme + one palette per edition), the edition programme with recorded
 * sets, on-site merch and the future. No DJ names, no venue names: the book
 * is meant for every venue in Tunisia we approach.
 */

const TOTAL = 12;

/** One colour vision per edition. Edition 01 opens in blue. */
const EDITIONS: { n: string; name: string; theme: string; line: string; poster: ConceptId; accent: string; pal: [string, string][] }[] = [
  { n: '01', name: 'Bleu nuit', theme: 'La première question', line: 'L’ouverture : un bleu outremer profond, l’heure où la nuit commence vraiment.', poster: 'rubansceau', accent: '#1636d8', pal: [['#1636D8', 'Outremer'], ['#050A24', 'Nuit'], ['#F2F5FF', 'Argent']] },
  { n: '02', name: 'Rouge fièvre', theme: 'La montée', line: 'Le rouge du logo prend toute la place : énergie, chaleur, piste pleine.', poster: 'rubanrouge', accent: '#ff1f1f', pal: [['#FF1F1F', 'Rouge'], ['#111111', 'Noir'], ['#F4EFE6', 'Crème']] },
  { n: '03', name: 'Corail', theme: 'Soleil couchant', line: 'Une édition d’été, douce et dorée, pensée pour les terrasses et les fins de journée.', poster: 'live3', accent: '#ff6a4d', pal: [['#FF6A4D', 'Corail'], ['#2A0F12', 'Grenat'], ['#FFE3D6', 'Pêche']] },
  { n: '04', name: 'Mercure', theme: 'Métal liquide', line: 'Chrome et argent, une nuit plus froide et plus électronique, côté indie dance.', poster: 'live4', accent: '#aeb6c2', pal: [['#C9CED6', 'Chrome'], ['#0B0C10', 'Graphite'], ['#7E8796', 'Acier']] },
  { n: '05', name: 'Jasmin', theme: 'Les nuits d’été', line: 'Le blanc du jasmin et le vert profond : une édition qui parle de la Tunisie.', poster: 'rubanhalo', accent: '#3fbf8a', pal: [['#F4EFE2', 'Jasmin'], ['#0F2A22', 'Cyprès'], ['#3FBF8A', 'Menthe']] },
];

/** The visions for the editions after the first one: the posters chosen in the studio, in their own palette. */
const NEXT: { n: string; id: ConceptId; name: string; theme: string; line: string; dot: string }[] = [
  { n: '02', id: 'live3', name: '3D · Corail', theme: 'La matière', line: 'Un « ? » sculpté couleur sable sur un vert d’eau profond : une édition d’été, en 3D.', dot: '#e9b48f' },
  { n: '03', id: 'tunnel', name: 'Tunnel', theme: 'À l’infini', line: 'Le logo en anneaux sans fin : hypnotique en story, en boucle sur les écrans de scène.', dot: '#ff1f1f' },
  { n: '04', id: 'neonlogo', name: 'Néon', theme: 'L’enseigne', line: 'Le logo devient un vrai tube de néon, accroché dans le lieu comme une enseigne.', dot: '#ff9c9c' },
  { n: '05', id: 'verre', name: 'Verre', theme: 'Transparence', line: 'Un grand « ? » de verre qui tord les rayures émeraude du décor.', dot: '#1f9e6e' },
  { n: '06', id: 'lumiere', name: 'Lumière', theme: 'Bleu électrique', line: 'Des capitales dessinées à la main qui sautillent et brillent sur un aplat bleu.', dot: '#2b4bff' },
  { n: '07', id: 'soleil', name: 'Soleil', theme: 'Plein été', line: 'Jaune plein et marqueur noir : le nom tourne autour d’un soleil dessiné.', dot: '#ffd400' },
  { n: '08', id: 'souffle', name: 'Souffle', theme: 'La respiration', line: 'Mille particules vert acide qui forment le « ? », se dispersent et reviennent.', dot: '#b6ff3b' },
];

const GENRES: { name: string; bpm: string; lo: number; hi: number; what: string }[] = [
  { name: 'House', bpm: '120 – 124', lo: 120, hi: 124, what: 'Le socle. Un kick régulier, des basses rondes, la base de toutes nos nuits.' },
  { name: 'Afro House', bpm: '118 – 122', lo: 118, hi: 122, what: 'Percussions, voix et chaleur : la partie la plus organique, idéale avec le live.' },
  { name: 'Disco House', bpm: '120 – 124', lo: 120, hi: 124, what: 'Cordes, samples disco, filtres : le moment où tout le monde chante.' },
  { name: 'Indie Dance', bpm: '112 – 122', lo: 112, hi: 122, what: 'Synthés, guitares, une mélancolie qui danse. Notre couleur la plus singulière.' },
  { name: 'Groove', bpm: '105 – 118', lo: 105, hi: 118, what: 'Basses funk et swing pour ouvrir la nuit et laisser respirer la piste.' },
  { name: 'House Dance', bpm: '122 – 126', lo: 122, hi: 126, what: 'Pianos, refrains, énergie : le pic de la soirée, les bras en l’air.' },
];

/** Hours "22:00 — 04:00" split into n points (labels). */
function marks(hours: string, n: number) {
  const m = /(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/.exec(hours);
  if (!m) return Array.from({ length: n }, () => '');
  const a = +m[1] * 60 + +m[2];
  let b = +m[3] * 60 + +m[4];
  if (b <= a) b += 24 * 60;
  return Array.from({ length: n }, (_, i) => {
    const t = a + ((b - a) * i) / (n - 1);
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(Math.round(t % 60)).padStart(2, '0')}`;
  });
}

/** The book never names DJs or a venue: posters show the music and the edition instead. */
function bookContent(c: EventContent, n = c.editionNumber): EventContent {
  return {
    ...c,
    editionNumber: n,
    edition: `ÉDITION ${n}`,
    venue: 'LIEU PARTENAIRE · TUNISIE',
    date: 'DATE À VENIR',
    lineupTitle: 'LA MUSIQUE',
    lineup: [
      { id: 'a', name: 'HOUSE · AFRO HOUSE', detail: '' },
      { id: 'b', name: 'DISCO HOUSE · INDIE DANCE', detail: '' },
      { id: 'c', name: 'UNE AUTRE ? CREW LIVE', detail: 'DJ · GUITARE · VOIX' },
    ],
  };
}

/** Mix a hex colour toward white (k = 0…1), for accents set on the night background. */
function lift(hex: string, k: number) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function Statement({ children }: { children: ReactNode }) {
  return <p className="bk-statement">{children}</p>;
}

function usePrintStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const before = () => flushSync(() => setStill(true));
    const after = () => setStill(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
  return still;
}

function Page({ n, title, kicker, tone = 'dark', children, className = '' }: { n: number; title?: ReactNode; kicker?: string; tone?: 'dark' | 'light' | 'accent'; children: ReactNode; className?: string }) {
  const { content } = useStudio();
  const only = Number(/[?&]p=(\d+)/.exec(location.hash)?.[1] ?? 0);
  if (only && only !== n) return null;
  const style: CSSProperties & { '--bk-accent': string } = { '--bk-accent': content.editionAccent };
  return (
    <section className={`book-page bk-${tone} ${className}`} style={style}>
      {title && (
        <header className="bk-head">
          {kicker && <p className="bk-kicker">{kicker}</p>}
          <h2>{title}</h2>
        </header>
      )}
      {children}
      <footer className="bk-foot">
        <span>{content.brand} — Dossier de présentation</span>
        <span>
          {String(n).padStart(2, '0')} / {TOTAL}
        </span>
      </footer>
    </section>
  );
}

const Ring = ({ brand, size, spin, color, weight = 4 }: { brand: string; size: number; spin?: boolean; color: string; weight?: number }) => (
  <svg viewBox="0 0 400 400" width={size} height={size} className="bk-ring" aria-label={brand}>
    <g>
      {spin && <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="30s" repeatCount="indefinite" />}
      <RingLogo brand={brand} cx={200} cy={200} R={130} cap={60} stroke={color} weight={weight} />
    </g>
  </svg>
);

function Poster({ id, animated = false, accent, format = 'portrait', n }: { id: ConceptId; animated?: boolean; accent?: string; format?: 'portrait' | 'square'; n?: string }) {
  const { content: raw, settings, photo } = useStudio();
  const content = bookContent(raw, n);
  const def: ConceptDef | undefined = CONCEPT_BY_ID[id];
  if (!def) return null;
  const s = { ...settings[def.id], ...(accent ? { accent } : {}) };
  return <div className={`bk-poster ${format}`}>{posterElement(def, content, s, photo, format, animated)}</div>;
}

const Swatch = ({ hex, name }: { hex: string; name: string }) => (
  <div className="bk-sw">
    <i style={{ background: hex }} />
    <b>{name}</b>
    <small>{hex}</small>
  </div>
);

/* ---------- graphics ---------- */

function NightCurve({ hours, accent }: { hours: string; accent: string }) {
  const t = marks(hours, 7);
  const W = 640;
  const H = 230;
  const pts = [18, 30, 46, 62, 80, 92, 58];
  const X = (i: number) => 30 + (i * (W - 60)) / 6;
  const Y = (v: number) => H - 40 - (v / 100) * (H - 70);
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join('');
  const smooth = pts
    .map((v, i) => {
      if (!i) return `M${X(0)} ${Y(v)}`;
      const x0 = X(i - 1);
      const x1 = X(i);
      return `C${x0 + (x1 - x0) / 2} ${Y(pts[i - 1])} ${x0 + (x1 - x0) / 2} ${Y(v)} ${x1} ${Y(v)}`;
    })
    .join('');
  const phases = ['Groove · Indie Dance', 'Afro House', 'Disco House', 'Show live du crew', 'House · House Dance', 'Clôture House'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bk-curve" role="img" aria-label="Courbe d’énergie d’une nuit">
      <defs>
        <linearGradient id="bk-curve-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.55" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {t.map((_, i) => (
        <path key={i} d={`M${X(i)} 20V${H - 40}`} stroke="currentColor" strokeOpacity="0.12" />
      ))}
      <path d={`${smooth}L${X(6)} ${H - 40}L${X(0)} ${H - 40}Z`} fill="url(#bk-curve-g)" />
      <path d={smooth} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d={d} fill="none" stroke="none" />
      {phases.map((p, i) => (
        <text key={p} x={(X(i) + X(i + 1)) / 2} y={Y(Math.max(pts[i], pts[i + 1])) - 14} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={11.5} fill="currentColor">
          {p}
        </text>
      ))}
      <circle cx={(X(3) + X(4)) / 2} cy={Y(71)} r="6" fill={accent} />
      <circle cx={(X(3) + X(4)) / 2} cy={Y(71)} r="12" fill="none" stroke={accent} strokeOpacity="0.5">
        <animate attributeName="r" values="8;18;8" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
      </circle>
      {t.map((l, i) => (
        <text key={i} x={X(i)} y={H - 16} textAnchor="middle" fontFamily={FONT.mono} fontSize={11} fill="currentColor" fillOpacity="0.6">
          {l}
        </text>
      ))}
      <text x={30} y={14} fontFamily={FONT.mono} fontSize={10} letterSpacing={2} fill="currentColor" fillOpacity="0.5">
        ÉNERGIE DE LA PISTE
      </text>
    </svg>
  );
}

function StagePlan({ accent }: { accent: string }) {
  const crowd = Array.from({ length: 120 }, (_, i) => {
    const row = Math.floor(i / 20);
    const col = i % 20;
    return { x: 60 + col * 26 + (row % 2) * 13 + Math.sin(i * 7.1) * 4, y: 250 + row * 20 + Math.cos(i * 3.3) * 3 };
  });
  return (
    <svg viewBox="0 0 600 380" className="bk-stage" role="img" aria-label="Plan de scène : DJ au centre, guitare à gauche, voix à droite">
      {[-1, 1].map((s) => (
        <path key={s} d={`M${300 + s * 230} 20L${300 + s * 80} 220L${300 + s * 170} 220Z`} fill={accent} opacity="0.12">
          <animate attributeName="opacity" values="0.06;0.2;0.06" dur={s > 0 ? '3s' : '3.7s'} repeatCount="indefinite" />
        </path>
      ))}
      <rect x="70" y="60" width="460" height="160" rx="10" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 6" />
      <text x="82" y="80" fontFamily={FONT.mono} fontSize="10" letterSpacing="2" fill="currentColor" fillOpacity="0.55">
        SCÈNE
      </text>
      {/* DJ booth */}
      <rect x="225" y="110" width="150" height="62" rx="8" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.6" />
      <circle cx="257" cy="141" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="343" cy="141" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="288" y="122" width="24" height="38" rx="3" fill="none" stroke={accent} strokeWidth="2" />
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 257 141" to="360 257 141" dur="1.8s" repeatCount="indefinite" />
        <path d="M257 141L257 123" stroke={accent} strokeWidth="2" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 343 141" to="360 343 141" dur="1.8s" repeatCount="indefinite" />
        <path d="M343 141L343 123" stroke={accent} strokeWidth="2" />
      </g>
      <text x="300" y="196" textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize="15" fill="currentColor">
        DJ
      </text>
      {/* guitar */}
      <g transform="translate(140 140) rotate(-35)">
        <ellipse cx="0" cy="14" rx="15" ry="18" fill="none" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="0" cy="-6" rx="11" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="0" cy="8" r="4" fill={accent} />
        <path d="M0 -18V-52M-4 -52H4" stroke="currentColor" strokeWidth="3" />
      </g>
      <text x="140" y="196" textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize="15" fill="currentColor">
        GUITARE
      </text>
      {/* mic */}
      <g transform="translate(460 140)">
        <circle cx="0" cy="-18" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M0 -9V22M-12 22H12" stroke="currentColor" strokeWidth="2" />
        <circle cx="0" cy="-18" r="3" fill={accent} />
      </g>
      <text x="460" y="196" textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize="15" fill="currentColor">
        VOIX
      </text>
      {crowd.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="4" fill="currentColor" fillOpacity={0.25 + ((i * 37) % 10) / 30}>
          {i % 9 === 0 && <animate attributeName="cy" values={`${c.y};${c.y - 5};${c.y}`} dur="0.5s" begin={`${(i % 5) * 0.1}s`} repeatCount="indefinite" />}
        </circle>
      ))}
      <text x="300" y="372" textAnchor="middle" fontFamily={FONT.mono} fontSize="10" letterSpacing="2" fill="currentColor" fillOpacity="0.55">
        LA PISTE
      </text>
    </svg>
  );
}

/** Instagram grid for the opening edition: everything follows the edition palette. */
function Feed({ accent }: { accent: string }) {
  const { content } = useStudio();
  const tile = (children: ReactNode, cls = '') => <div className={`bk-tile ${cls}`}>{children}</div>;
  return (
    <div className="bk-phone">
      <div className="bk-phone-top">
        <i />
        <b>une.autre.tn</b>
        <small>Édition {content.editionNumber}</small>
      </div>
      <div className="bk-feed">
        {tile(<Poster id="rubansceau" accent={accent} format="square" />, 'img')}
        {tile(<span className="bk-t-big">01</span>, 'solid')}
        {tile(<Ring brand={content.brand} size={96} color={accent} weight={5} />, 'ink')}
        {tile(
          <span className="bk-t-list">
            House
            <br />
            Afro House
            <br />
            Disco House
            <br />
            Indie Dance
          </span>,
          'paper',
        )}
        {tile(<Poster id="rubanorbite" accent={accent} format="square" />, 'img')}
        {tile(
          <span className="bk-t-rec">
            <i /> REC
            <br />
            <small>Live sessions</small>
          </span>,
          'ink',
        )}
        {tile(<span className="bk-t-mid">DJ — GUITARE — VOIX</span>, 'solid')}
        {tile(<span className="bk-t-q">?</span>, 'paper')}
        {tile(<Poster id="rubanhalo" accent={accent} format="square" />, 'img')}
      </div>
    </div>
  );
}

/* ======================================================================= */

export function Book() {
  const { content: raw } = useStudio();
  const content = bookContent(raw);
  const still = usePrintStill();
  const anim = !still;
  const accent = content.editionAccent;
  const hi = lift(accent, 0.38);
  const sig = lines(content.signature);
  const band = DESIGNS.find((d) => d.id === 'nuit') ?? DESIGNS[0];
  const tp = (d: (typeof DROPS)[0]) => ({ content, ink: d.ink, accent: d.accent, role: 'Crew', name: '', scale: 1 });
  const disco = { ...DROPS[0] };
  const discoInk = { ...tp(disco), ink: accent };
  const solo = location.hash.includes('solo');
  const m = marks(content.hours, 7);

  return (
    <div className={`book ${solo ? 'solo' : ''}`}>
      <div className="book-bar">
        <p>
          <b>Book master</b> — {TOTAL} pages animées à présenter à l’écran (plein écran : <kbd>Cmd</kbd> + <kbd>Ctrl</kbd> + <kbd>F</kbd>). PDF haute définition : <code>exports/UNE-AUTRE_book-master.pdf</code>. La couleur de l’édition se règle dans le panneau Texte.
        </p>
        <button className="tbtn" onClick={() => window.print()}>
          Impression rapide
        </button>
      </div>

      {/* 1 — cover */}
      <Page n={1} className="bk-cover">
        <div className="bk-cover-l">
          <p className="bk-kicker">Dossier de présentation · Lieux partenaires · Tunisie</p>
          <div className="bk-cover-ring">
            <Ring brand={content.brand} size={330} spin={anim} color={hi} weight={4.5} />
          </div>
          <h1>
            {sig.map((l, i) => (
              <span key={i} className={i === sig.length - 1 ? 'acc' : ''}>
                {l}
              </span>
            ))}
          </h1>
          <p className="bk-lead">Un concept de soirées club qui voyage de lieu en lieu. House, afro house, disco house, indie dance : DJ sets, guitare et voix en live, et une nouvelle vision à chaque édition.</p>
        </div>
        <div className="bk-cover-r">
          <Poster id="rubansceau" animated={anim} accent={accent} />
          <p className="bk-caption">Édition {content.editionNumber} · « Bleu nuit » — affiche animée</p>
        </div>
      </Page>

      {/* 2 — manifesto + contents */}
      <Page n={2} tone="light" className="bk-manifesto">
        <div className="bk-man-l">
          <p className="bk-kicker">Le manifeste</p>
          <h2 className="bk-quote">
            « On en fait <em>une autre ?</em> »
          </h2>
          <p className="bk-big">C’est la question qu’on se pose quand la nuit est trop belle pour s’arrêter. Un autre son, une autre rencontre, une autre nuit.</p>
          <p>
            <b>{content.brand}</b> est né de cette envie : faire de chaque soirée un moment qu’on a envie de revivre, et revenir à chaque fois avec quelque chose de nouveau. Le nom est une question, et chaque édition y répond à sa façon.
          </p>
          <div className="bk-manifest-lines">
            {lines(content.manifesto).map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <p className="bk-pillars">{content.pillars}</p>
        </div>
        <div className="bk-man-r">
          <p className="bk-kicker">Sommaire</p>
          <ol className="bk-toc">
            {['Le concept', 'Pourquoi UNE AUTRE ?', 'L’identité', 'La direction musicale', 'Le show du crew', 'Une édition, une vision', 'Les prochaines éditions', 'Le programme d’une édition', 'Sur place : bracelet & merch', 'Demain'].map((t, i) => (
              <li key={t}>
                <span>{String(i + 3).padStart(2, '0')}</span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      </Page>

      {/* 3 — the concept */}
      <Page n={3} kicker="01 — Le concept" title={<>Une soirée club nomade,<br />une identité qui ne change pas.</>}>
        <div className="bk-cols3">
          {[
            ['Nomade', 'UNE AUTRE ? n’appartient pas à un seul lieu. Chaque édition investit un lieu partenaire en Tunisie, pour une nuit, avec toute son identité.'],
            ['Musical', 'Une direction claire : house, afro house, disco house, indie dance et groove. Une musique qui fait danser sans jamais être banale.'],
            ['Vivant', 'Plus qu’un DJ set : le crew mixe avec une guitare et une voix en live. Chaque nuit a son moment de show.'],
          ].map(([h, p], i) => (
            <article key={h} className="bk-card">
              <span className="bk-num">0{i + 1}</span>
              <h3>{h}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
        <div className="bk-route">
          <p className="bk-col-title">De lieu en lieu</p>
          <div className="bk-route-line">
            {[{ n: '01', dot: accent, name: EDITIONS[0].name }, ...NEXT].map((e, i) => (
              <div key={e.n} className="bk-stop">
                <i style={{ background: e.dot }} />
                <b>Édition {e.n}</b>
                <small>{i === 0 ? 'Bleu nuit' : e.name}</small>
              </div>
            ))}
            <div className="bk-stop more">
              <i>?</i>
              <b>Une autre</b>
              <small>…</small>
            </div>
          </div>
        </div>
        <div className="bk-facts">
          <div>
            <dt>Format</dt>
            <dd>Soirée club · {content.hours}</dd>
          </div>
          <div>
            <dt>Lieux</dt>
            <dd>Lieux partenaires en Tunisie · un par édition</dd>
          </div>
          <div>
            <dt>Musique</dt>
            <dd>House · Afro House · Disco House · Indie Dance · Groove · House Dance</dd>
          </div>
          <div>
            <dt>Sur scène</dt>
            <dd>DJ sets · guitare live · voix live · invités</dd>
          </div>
          <div>
            <dt>Chaque édition</dt>
            <dd>Un thème, une palette, une affiche, des sets enregistrés</dd>
          </div>
        </div>
      </Page>

      {/* 4 — why */}
      <Page n={4} tone="light" kicker="02 — Pourquoi UNE AUTRE ?" title="Ce que le concept apporte à votre lieu">
        <div className="bk-why">
          <div>
            <h3 className="bk-col-title">Pour le lieu</h3>
            <ul className="bk-checks">
              <li>
                <b>Une soirée clé en main.</b> Programmation, show, communication, billetterie par bracelet : nous arrivons avec tout.
              </li>
              <li>
                <b>Une identité qui attire.</b> Un univers visuel fort et reconnaissable, qui donne envie de venir et de partager.
              </li>
              <li>
                <b>Du contenu tourné chez vous.</b> Sets enregistrés, vidéos, photos : votre lieu apparaît dans tout ce que nous publions après l’édition.
              </li>
              <li>
                <b>Une nuit différente.</b> Le live (guitare, voix) transforme une soirée DJ en expérience dont on parle.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="bk-col-title">Pourquoi nous</h3>
            <ul className="bk-checks">
              <li>
                <b>Un crew qui joue, pas seulement qui passe des disques.</b> DJ, guitariste, vocaliste : le show fait partie du concept.
              </li>
              <li>
                <b>Deux générations réunies.</b> Des artistes qui ont construit la scène tunisienne et la nouvelle vague qui la fait bouger aujourd’hui.
              </li>
              <li>
                <b>Un studio intégré.</b> Affiches animées, vidéos, bracelets, merch : tout est conçu par l’équipe, dans une seule identité.
              </li>
              <li>
                <b>Une vision long terme.</b> Des éditions qui se suivent, une communauté qui revient, et des invités internationaux à terme.
              </li>
            </ul>
          </div>
          <div className="bk-why-q">
            <Ring brand={content.brand} size={210} spin={anim} color={accent} />
          </div>
        </div>
        <Statement>
          Vous accueillez la nuit. <em>Nous apportons tout le reste.</em>
        </Statement>
      </Page>

      {/* 5 — identity */}
      <Page n={5} kicker="03 — L’identité" title="Un nom qui pose une question">
        <div className="bk-id">
          <div className="bk-id-logo">
            <Ring brand={content.brand} size={230} spin={anim} color={hi} />
            <h3>Le logo en anneau</h3>
            <p>Des capitales rondes posées en cercle, le « ? » debout à droite. Il tourne sur les affiches et les vidéos, et reste lisible en sceau sur un bracelet ou un t-shirt.</p>
          </div>
          <div className="bk-id-q">
            <div className="bk-qmark">?</div>
            <h3>Le signe « ? »</h3>
            <p>Le point d’interrogation devient l’objet de chaque affiche : sculpté, en ruban, en 3D, en matière. C’est lui qu’on reconnaît dans un fil Instagram.</p>
          </div>
          <div className="bk-id-sys">
            <h3>Fixe</h3>
            <div className="bk-sws">
              <Swatch hex="#050A24" name="Nuit" />
              <Swatch hex="#F2F5FF" name="Argent" />
            </div>
            <h3>Change à chaque édition</h3>
            <div className="bk-sws">
              <Swatch hex={accent.toUpperCase()} name={`Édition ${content.editionNumber}`} />
            </div>
            <h3>Typographies</h3>
            <div className="bk-type">
              <p style={{ fontFamily: FONT.round, fontWeight: 700, fontSize: 22 }}>Fredoka — logo &amp; titres</p>
              <p style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 16 }}>General Sans — textes &amp; infos</p>
              <p style={{ fontFamily: FONT.mono, fontSize: 12, letterSpacing: '0.12em' }}>IBM PLEX MONO — DÉTAILS</p>
              <p style={{ fontFamily: FONT.script, fontSize: 30, lineHeight: 1 }}>une autre ? — l’écriture du merch</p>
            </div>
          </div>
          <div className="bk-id-apps">
            <Poster id="rubansceau" accent={accent} />
            <Poster id="rubanorbite" animated={anim} accent={accent} />
            <div className="bk-id-tee">
              <TeeMock d={disco} p={discoInk} shirt={disco.shirt} side="back" label={false} />
            </div>
          </div>
        </div>
      </Page>

      {/* 6 — music */}
      <Page n={6} tone="light" kicker="04 — La direction musicale" title="Six couleurs, une seule nuit">
        <div className="bk-music">
          <div className="bk-genres">
            {GENRES.map((g) => (
              <article key={g.name}>
                <header>
                  <h3>{g.name}</h3>
                  <span>{g.bpm} BPM</span>
                </header>
                <div className="bk-bpm">
                  <i style={{ left: `${((g.lo - 104) / 24) * 100}%`, width: `${((g.hi - g.lo) / 24) * 100}%` }} />
                </div>
                <p>{g.what}</p>
              </article>
            ))}
          </div>
          <div className="bk-night">
            <h3 className="bk-col-title">La courbe d’une nuit</h3>
            <NightCurve hours={content.hours} accent={accent} />
            <p className="bk-note">Une nuit construite comme un récit : on ouvre en douceur, on monte avec les percussions, le show live du crew arrive au cœur de la nuit, puis le pic et la clôture. Tempos donnés à titre de repère.</p>
          </div>
        </div>
        <Statement>
          Ni commercial, ni élitiste : <em>une house qui fait danser tout le monde.</em>
        </Statement>
      </Page>

      {/* 7 — crew show */}
      <Page n={7} kicker="05 — Le show du crew" title={<>Mixé, joué, chanté.<br />En live.</>} className="bk-show">
        <div className="bk-show-grid">
          <div className="bk-roles">
            {[
              ['DJ', 'Le fil de la nuit. Il construit la progression et ouvre l’espace au live.'],
              ['Guitare', 'Des riffs et des mélodies jouées par-dessus les morceaux : afro house, indie dance, disco.'],
              ['Voix', 'Des refrains, des improvisations, des appels au public. La piste chante avec nous.'],
              ['Le show', 'Un moment fort à chaque édition : entrée des musiciens, lumière, et une surprise propre à la nuit.'],
            ].map(([h, p], i) => (
              <article key={h}>
                <span className="bk-num">0{i + 1}</span>
                <div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="bk-stage-wrap">
            <StagePlan accent={accent} />
            <p className="bk-note">Installation légère : une cabine DJ, une guitare branchée sur la table de mixage, un micro sans fil. Elle s’adapte à la scène de chaque lieu.</p>
          </div>
        </div>
        <div className="bk-moments">
          {[
            ['Entrée', 'Les musiciens rejoignent la cabine, la lumière passe à la couleur de l’édition'],
            ['Refrains', 'La voix pose des hooks sur la house, la piste reprend avec elle'],
            ['Solo', 'La guitare prend la main sur un morceau afro house ou indie dance'],
            ['Final', 'Tout le crew ensemble, puis la question : une autre ?'],
          ].map(([h, p], i) => (
            <div key={h}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <b>{h}</b>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </Page>

      {/* 8 — edition system */}
      <Page n={8} tone="light" kicker="06 — Une édition, une vision" title="Chaque édition a son thème et sa palette">
        <div className="bk-system">
          <div className="bk-sys-l">
            <p className="bk-big">Le logo et l’esprit restent les mêmes. Le thème, la couleur et l’affiche changent à chaque édition, et tout le contenu suit la palette.</p>
            <ol className="bk-flow">
              {['L’affiche', 'Le feed Instagram', 'Les stories & vidéos', 'Le bracelet d’entrée', 'Le merch', 'La lumière sur scène'].map((t, i) => (
                <li key={t}>
                  <i style={{ background: accent, opacity: 1 - i * 0.12 }} />
                  {t}
                </li>
              ))}
            </ol>
            <div className="bk-ed01">
              <p className="bk-kicker">Édition {content.editionNumber} · « {EDITIONS[0].name} » · {EDITIONS[0].theme}</p>
              <div className="bk-sws">
                {EDITIONS[0].pal.map(([h, n]) => (
                  <Swatch key={h} hex={h} name={n} />
                ))}
              </div>
            </div>
          </div>
          <Poster id="rubansceau" animated={anim} accent={accent} />
          <Feed accent={accent} />
        </div>
      </Page>

      {/* 9 — next editions */}
      <Page n={9} kicker="07 — Les prochaines éditions" title="Sept visions pour la suite">
        <div className="bk-eds seven">
          {NEXT.map((e) => {
            const def = CONCEPT_BY_ID[e.id];
            return (
              <article key={e.n} className="bk-ed">
                <Poster id={e.id} n={e.n} animated={anim && e.id !== 'neonlogo'} />
                <p className="bk-ed-n" style={{ color: e.dot }}>
                  Édition {e.n}
                </p>
                <h3>{e.name}</h3>
                <p className="bk-ed-theme">{e.theme}</p>
                <div className="bk-ed-pal">
                  {(def?.palette ?? []).slice(0, 3).map((sw) => (
                    <i key={sw.hex} style={{ background: sw.hex }} />
                  ))}
                  <i style={{ background: e.dot }} />
                </div>
                <p>{e.line}</p>
              </article>
            );
          })}
        </div>
        <p className="bk-note bk-eds-note">Pistes créatives : chaque édition choisit son affiche, son thème et sa palette selon la saison et le lieu partenaire. Le feed et les stories suivent cette palette.</p>
      </Page>

      {/* 10 — programme */}
      <Page n={10} tone="light" kicker="08 — Le programme d’une édition" title="Avant, pendant, après : une édition dure trois semaines">
        <div className="bk-prog">
          {[
            { h: 'Avant', s: 'J-21 → J-1', items: ['Teaser animé : le « ? » de l’édition', 'Révélation du thème et de la palette', 'Affiche officielle et annonce de la programmation', 'Stories, vidéos courtes, contenu du crew en répétition', 'Bracelets d’entrée en prévente'] },
            { h: 'Le soir', s: m[0] ? `${m[0]} → ${m[6]}` : 'La nuit', items: ['Ouverture groove et indie dance', 'Montée afro house et disco house', 'Show live du crew : DJ, guitare, voix', 'Pic house dance', 'Clôture, et la question : une autre ?'] },
            { h: 'Après', s: 'J+1 → J+14', items: ['Les DJ sets enregistrés, publiés en « Live Sessions »', 'Aftermovie et photos de la nuit', 'Récap de l’édition, le lieu partenaire mis en avant', 'Teaser de l’édition suivante'] },
          ].map((c, i) => (
            <article key={c.h} className={i === 1 ? 'mid' : ''}>
              <header>
                <span className="bk-num">0{i + 1}</span>
                <h3>{c.h}</h3>
                <small>{c.s}</small>
              </header>
              <ul>
                {c.items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="bk-rec">
          <span className="bk-rec-dot" />
          <div className="bk-rec-tee">
            <TeeMock d={DROPS[2]} p={tp(DROPS[2])} shirt={DROPS[2].shirt} side="back" label={false} />
          </div>
          <p>
            <b>Les sets sont enregistrés.</b> La plupart des DJ sets et des moments live sont filmés et enregistrés à chaque édition : ils deviennent la série « UNE AUTRE ? Live Sessions », un contenu qui fait vivre le concept, et le lieu, entre deux éditions.
          </p>
        </div>
      </Page>

      {/* 11 — on site */}
      <Page n={11} kicker="09 — Sur place" title="Le lieu habillé UNE AUTRE ?">
        <div className="bk-site">
          <div className="bk-site-band">
            <div className="bk-3d">
              <Band3D d={band} pal={band.pal} clasp={band.clasp} stand="poignet" spin={anim} content={content} />
            </div>
            <h3>Le bracelet d’entrée</h3>
            <p>Tissu imprimé, fermé par une bague inviolable : c’est le billet. Numéroté, aux couleurs de l’édition, on le garde au poignet après la nuit.</p>
          </div>
          <div className="bk-site-merch">
            <div className="bk-tees">
              {[DROPS[1], DROPS[3], DROPS[4]].map((d) => (
                <TeeMock key={d.id} d={d} p={tp(d)} shirt={d.shirt} side="back" label={false} />
              ))}
            </div>
            <h3>Le merch du crew — Drop 01</h3>
            <p>Des t-shirts oversize illustrés, pensés comme une vraie marque : portés par le crew, proposés au public. Chaque pièce raconte une part du concept.</p>
          </div>
        </div>
        <div className="bk-strip">
          <svg viewBox="0 0 3500 150">
            <band.Band content={content} pal={band.pal} />
          </svg>
          <p>Bracelet « {band.name} » à plat · 350 × 15 mm</p>
        </div>
      </Page>

      {/* 12 — future */}
      <Page n={12} className="bk-future">
        <div className="bk-fut-l">
          <p className="bk-kicker">10 — Demain</p>
          <h2 className="bk-fut-title">
            Une autre ville.
            <br />
            Une autre saison.
            <br />
            <span>Un autre invité.</span>
          </h2>
          <ul className="bk-checks">
            <li>
              <b>Des artistes internationaux.</b> Faire venir des noms qui comptent sur la scène house et afro house, aux côtés de la scène tunisienne.
            </li>
            <li>
              <b>Une tournée de lieux.</b> De Tunis aux villes de la côte en été : le concept voyage, la communauté suit.
            </li>
            <li>
              <b>Les Live Sessions.</b> Une série de sets enregistrés qui fait connaître le concept au-delà de la nuit.
            </li>
            <li>
              <b>Des formats spéciaux.</b> Coucher de soleil, éditions d’été, collaborations avec des artistes visuels et des marques locales.
            </li>
          </ul>
        </div>
        <div className="bk-fut-r">
          <Ring brand={content.brand} size={240} spin={anim} color={hi} />
          <div className="bk-next">
            <h3>Travaillons ensemble</h3>
            <ol>
              <li>Une rencontre pour découvrir votre lieu</li>
              <li>Le choix d’une date et du thème de l’édition</li>
              <li>Le lancement de la communication trois semaines avant</li>
            </ol>
            <p className="bk-contact">Contact · à compléter</p>
          </div>
        </div>
        <div className="bk-fut-strip">
          {[{ n: '01', dot: accent }, ...NEXT].map((e) => (
            <i key={e.n} style={{ background: e.dot }}>
              <span>{e.n}</span>
            </i>
          ))}
          <i className="q">
            <span>une autre ?</span>
          </i>
        </div>
      </Page>
    </div>
  );
}
