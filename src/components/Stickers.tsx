import { useState, type ReactNode } from 'react';
import { RingLogo } from '../graphics/ringLogo';
import { FONT } from '../lib/fonts';
import { download, rasterize, slug, toSvgDocument } from '../lib/exporter';
import { useStudio } from '../state/store';
import { ColorRow } from './Wristbands';

/**
 * « Objectif ? » — our take on the phone-free night. Not a ban but an
 * invitation: at the door a sticker covers the rear camera ("l'objectif"),
 * the crew films for everyone, the guest just lives the night. Six designs,
 * three die-cut formats sized for camera blocks, a phone mock-up and print
 * files (SVG with cut line, PNG 300 dpi).
 */

type Shape = 'rond' | 'carre' | 'gelule';
const SHAPES: { id: Shape; label: string; mm: [number, number]; fits: string }[] = [
  { id: 'rond', label: 'Rond Ø 30 mm', mm: [30, 30], fits: 'Un ou deux objectifs' },
  { id: 'carre', label: 'Carré arrondi 42 mm', mm: [42, 42], fits: 'Grands blocs photo (3 objectifs)' },
  { id: 'gelule', label: 'Gélule 22 × 58 mm', mm: [22, 58], fits: 'Objectifs alignés à la verticale' },
];

interface Pal {
  bg: string;
  fg: string;
  accent: string;
}
interface StickerDesign {
  id: string;
  name: string;
  idea: string;
  pal: Pal;
  ring: (brand: string, n: string) => string;
  /** centre motif, drawn in a box centred on (0,0) with radius r */
  Mark: (p: { r: number; pal: Pal; brand: string; n: string }) => JSX.Element;
}

const Q = ({ r, fill, stroke, sw }: { r: number; fill: string; stroke?: string; sw?: number }) => (
  <text y={r * 0.42} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={r * 1.55} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
    ?
  </text>
);

const DESIGNS: StickerDesign[] = [
  {
    id: 'objectif',
    name: 'Objectif ?',
    idea: 'Le sticker principal. Un gros « ? » blanc sur rouge, et autour la phrase qui donne son nom au concept : l’objectif ce soir ? être là.',
    pal: { bg: '#ff1f1f', fg: '#ffffff', accent: '#111111' },
    ring: () => 'L’OBJECTIF CE SOIR ? ÊTRE LÀ · ',
    Mark: ({ r, pal }) => <Q r={r} fill={pal.fg} />,
  },
  {
    id: 'oeil',
    name: 'Œil fermé',
    idea: 'Un œil fermé, dessiné au trait, sur le bleu nuit : l’objectif se repose, toi tu regardes la piste.',
    pal: { bg: '#050a24', fg: '#f2f5ff', accent: '#ff1f1f' },
    ring: () => 'RIEN À FILMER · TOUT À VIVRE · ',
    Mark: ({ r, pal }) => (
      <g fill="none" stroke={pal.fg} strokeWidth={r * 0.09} strokeLinecap="round">
        <path d={`M${-r * 0.75} ${-r * 0.1}Q0 ${r * 0.55} ${r * 0.75} ${-r * 0.1}`} />
        {[-0.5, -0.2, 0.12, 0.42].map((t, i) => {
          const x = t * r;
          const y = r * 0.1 + (1 - Math.abs(t) * 1.6) * r * 0.22;
          return <path key={i} d={`M${x} ${y}L${x + t * r * 0.25} ${y + r * 0.28}`} />;
        })}
        <circle cx={r * 0.5} cy={-r * 0.48} r={r * 0.08} fill={pal.accent} stroke="none" />
      </g>
    ),
  },
  {
    id: 'anneau',
    name: 'Anneau',
    idea: 'Le vrai logo en anneau rouge, et en son centre un point plein qui vient se poser pile sur l’objectif. Sobre, reconnaissable, à collectionner.',
    pal: { bg: '#0b0b0b', fg: '#ffffff', accent: '#ff1f1f' },
    ring: () => '',
    Mark: ({ r, pal, brand }) => (
      <g>
        <RingLogo brand={brand} cx={0} cy={0} R={r * 0.74} cap={r * 0.34} stroke={pal.accent} weight={r * 0.045} />
        <circle r={r * 0.18} fill={pal.accent} />
      </g>
    ),
  },
  {
    id: 'ici',
    name: 'Ici & maintenant',
    idea: 'Aux couleurs de l’édition : ICI en grand, « maintenant » écrit à la main. Le sticker change de couleur à chaque édition, comme l’affiche.',
    pal: { bg: '#1636d8', fg: '#ffffff', accent: '#050a24' },
    ring: (b, n) => `${b} · ÉDITION ${n} · VIS-LE EN VRAI · `,
    Mark: ({ r, pal }) => (
      <g textAnchor="middle">
        <text y={r * 0.12} fontFamily={FONT.round} fontWeight={700} fontSize={r * 0.82} fill={pal.fg}>
          ICI
        </text>
        <text y={r * 0.62} fontFamily={FONT.script} fontSize={r * 0.62} fill={pal.fg}>
          maintenant
        </text>
      </g>
    ),
  },
  {
    id: 'onfilme',
    name: 'On filme pour toi',
    idea: 'La promesse qui rend la règle facile : le crew enregistre les sets et la nuit, tu retrouves tout le lendemain dans les Live Sessions.',
    pal: { bg: '#f4efe6', fg: '#111111', accent: '#ff1f1f' },
    ring: () => 'LE CREW ENREGISTRE · TOI, TU DANSES · ',
    Mark: ({ r, pal }) => (
      <g textAnchor="middle">
        <circle cx={-r * 0.42} cy={-r * 0.38} r={r * 0.13} fill={pal.accent} />
        <text x={r * 0.1} y={-r * 0.27} fontFamily={FONT.mono} fontWeight={500} fontSize={r * 0.3} letterSpacing={r * 0.06} fill={pal.fg}>
          REC
        </text>
        <text y={r * 0.2} fontFamily={FONT.round} fontWeight={700} fontSize={r * 0.36} fill={pal.fg}>
          ON FILME
        </text>
        <text y={r * 0.58} fontFamily={FONT.round} fontWeight={700} fontSize={r * 0.36} fill={pal.accent}>
          POUR TOI
        </text>
      </g>
    ),
  },
  {
    id: 'sceau',
    name: 'Sceau ?',
    idea: 'Version inviolable : en vinyle « VOID », si on le décolle il laisse un motif de « ? » sur le téléphone. Numéroté comme le bracelet d’entrée.',
    pal: { bg: '#ffffff', fg: '#111111', accent: '#ff1f1f' },
    ring: (_b, n) => `DÉCOLLÉ, IL LAISSE UN ? · N°${n} · `,
    Mark: ({ r, pal, n }) => (
      <g textAnchor="middle">
        {Array.from({ length: 16 }, (_, i) => {
          const x = ((i % 4) - 1.5) * r * 0.42;
          const y = (Math.floor(i / 4) - 1.5) * r * 0.42;
          return Math.hypot(x, y) < r * 0.72 ? (
            <text key={i} x={x} y={y + r * 0.08} fontFamily={FONT.round} fontWeight={700} fontSize={r * 0.26} fill={pal.accent} opacity={0.25}>
              ?
            </text>
          ) : null;
        })}
        <circle r={r * 0.42} fill="none" stroke={pal.accent} strokeWidth={r * 0.06} />
        <Q r={r * 0.4} fill={pal.accent} />
        <text y={r * 0.74} fontFamily={FONT.mono} fontWeight={500} fontSize={r * 0.15} letterSpacing={r * 0.03} fill={pal.fg}>
          N°{n} · 0001
        </text>
      </g>
    ),
  },
];

/* ---------- the sticker itself (units = mm × 10) ---------- */

function shapePath(shape: Shape, w: number, h: number) {
  if (shape === 'rond') return `M${w / 2} 0A${w / 2} ${h / 2} 0 1 1 ${w / 2 - 0.01} 0Z`;
  const rr = shape === 'carre' ? w * 0.26 : w / 2;
  return `M${rr} 0H${w - rr}A${rr} ${rr} 0 0 1 ${w} ${rr}V${h - rr}A${rr} ${rr} 0 0 1 ${w - rr} ${h}H${rr}A${rr} ${rr} 0 0 1 0 ${h - rr}V${rr}A${rr} ${rr} 0 0 1 ${rr} 0Z`;
}

function StickerArt({ d, pal, shape, brand, n, cut = false, uid, box }: { d: StickerDesign; pal: Pal; shape: Shape; brand: string; n: string; cut?: boolean; uid: string; box?: { x: number; y: number; w: number } }) {
  const [mw, mh] = SHAPES.find((s) => s.id === shape)!.mm;
  const w = mw * 10;
  const h = mh * 10;
  const bleed = 20;
  const once = d.ring(brand, n);
  const tr0 = Math.min(mw, mh) * 10 * 0.41;
  const fsRing = tr0 * 0.17;
  // repeat the phrase so the letters sit at a natural spacing around the ring
  const reps = once ? Math.max(1, Math.round((2 * Math.PI * tr0) / (once.length * fsRing * 0.62))) : 0;
  const ringText = once.repeat(reps);
  const pill = shape === 'gelule';
  const cx = w / 2;
  const cy = pill ? w / 2 + 10 : h / 2;
  const r = pill ? w * 0.38 : Math.min(w, h) * 0.3;
  const tr = Math.min(w, h) * 0.41;
  const ring = `M${cx - tr} ${cy}A${tr} ${tr} 0 1 1 ${cx + tr} ${cy}A${tr} ${tr} 0 1 1 ${cx - tr} ${cy}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-bleed} ${-bleed} ${w + bleed * 2} ${h + bleed * 2}`} {...(box ? { x: box.x, y: box.y, width: box.w, height: (box.w * (mh + 4)) / (mw + 4) } : { width: mw + 4 + 'mm', height: mh + 4 + 'mm' })} className="stk-art">
      <defs>
        <clipPath id={`${uid}-c`}>
          <path d={shapePath(shape, w, h)} transform={`translate(${-bleed / 2} ${-bleed / 2}) scale(${(w + bleed) / w} ${(h + bleed) / h})`} />
        </clipPath>
        {!pill && ringText && <path id={`${uid}-r`} d={ring} />}
      </defs>
      <g clipPath={`url(#${uid}-c)`}>
        <rect x={-bleed} y={-bleed} width={w + bleed * 2} height={h + bleed * 2} fill={pal.bg} />
        <g transform={`translate(${cx} ${cy})`}>
          <d.Mark r={pill ? r * 0.9 : ringText ? r : r * 1.25} pal={pal} brand={brand} n={n} />
        </g>
        {!pill && ringText && (
          <text fontFamily={FONT.mono} fontWeight={500} fontSize={fsRing} fill={pal.fg} dominantBaseline="central">
            <textPath href={`#${uid}-r`} textLength={2 * Math.PI * tr - 4} lengthAdjust="spacing">
              {ringText}
            </textPath>
          </text>
        )}
        {pill && (
          <g>
            {(() => {
              const t = (once || `${brand} · `).replace(/ · $/, '');
              const avail = h - w - 50;
              const fs = Math.min(w * 0.13, avail / (t.length * 0.66));
              return (
                <text transform={`translate(${cx} ${w + 30}) rotate(90)`} fontFamily={FONT.mono} fontWeight={500} fontSize={fs} letterSpacing={fs * 0.04} fill={pal.fg} dominantBaseline="central">
                  {t}
                </text>
              );
            })()}
          </g>
        )}
      </g>
      {cut && <path d={shapePath(shape, w, h)} fill="none" stroke="#ff00ff" strokeWidth={1.5} strokeDasharray="6 4" />}
    </svg>
  );
}

/* ---------- phone mock-up (generic phone, no brand) ---------- */

function PhoneMock({ children, shape }: { children: ReactNode; shape: Shape }) {
  const pill = shape === 'gelule';
  return (
    <svg viewBox="0 0 320 560" className="stk-phone" role="img" aria-label="Dos de téléphone avec le sticker sur l’objectif">
      <defs>
        <filter id="stk-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1.5" dy="3" stdDeviation="3" floodOpacity=".5" />
        </filter>
        <linearGradient id="stk-ph" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#3a3c42" />
          <stop offset="1" stopColor="#1c1d21" />
        </linearGradient>
      </defs>
      <rect x="20" y="10" width="280" height="540" rx="46" fill="url(#stk-ph)" stroke="#55575e" strokeWidth="2" />
      <rect x="24" y="14" width="272" height="532" rx="42" fill="none" stroke="#000" strokeOpacity=".4" />
      {pill ? (
        <g>
          <rect x="40" y="40" width="66" height="176" rx="33" fill="#141518" stroke="#2c2e33" strokeWidth="2" />
          {[73, 128, 183].map((y) => (
            <circle key={y} cx="73" cy={y} r="22" fill="#08090b" stroke="#33353b" strokeWidth="3" />
          ))}
        </g>
      ) : shape === 'carre' ? (
        <g>
          <rect x="36" y="36" width="150" height="150" rx="38" fill="#141518" stroke="#2c2e33" strokeWidth="2" />
          {[
            [78, 78],
            [78, 144],
            [144, 111],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="28" fill="#08090b" stroke="#33353b" strokeWidth="3" />
          ))}
        </g>
      ) : (
        <g>
          <rect x="40" y="40" width="112" height="112" rx="30" fill="#141518" stroke="#2c2e33" strokeWidth="2" />
          <circle cx="96" cy="96" r="32" fill="#08090b" stroke="#33353b" strokeWidth="3" />
        </g>
      )}
      <circle cx={pill ? 130 : 200} cy={pill ? 60 : 60} r="7" fill="#d9d6c6" opacity=".6" />
      {children}
    </svg>
  );
}

/* ======================================================================= */

export function Stickers() {
  const { content } = useStudio();
  const [sel, setSel] = useState(DESIGNS[0].id);
  const d = DESIGNS.find((x) => x.id === sel)!;
  const [shape, setShape] = useState<Shape>(((/[?&]shape=(rond|carre|gelule)/.exec(location.hash)?.[1]) as Shape) ?? 'rond');
  const [pal, setPal] = useState<Pal>(d.pal);
  const [busy, setBusy] = useState(false);
  const pick = (id: string) => {
    const x = DESIGNS.find((k) => k.id === id)!;
    setSel(id);
    setPal(x.pal);
  };
  const sh = SHAPES.find((s) => s.id === shape)!;
  const n = content.editionNumber;
  const base = `${slug(content.brand)}_sticker-${d.id}-${shape}`;
  const art = (cut: boolean) => <StickerArt d={d} pal={pal} shape={shape} brand={content.brand} n={n} cut={cut} uid={`dl-${d.id}`} />;
  const png = async () => {
    setBusy(true);
    try {
      const doc = await toSvgDocument(art(false));
      const [w, h] = sh.mm;
      download(await rasterize(doc, Math.round(((w + 4) / 25.4) * 300), Math.round(((h + 4) / 25.4) * 300)), `${base}_300dpi.png`);
    } finally {
      setBusy(false);
    }
  };
  const svg = async () => download(await toSvgDocument(art(true)), `${base}_decoupe.svg`);

  // where the sticker lands on the mock (over the main lens / the camera block)
  const place = shape === 'gelule' ? { x: 38, y: 34, w: 70 } : shape === 'carre' ? { x: 30, y: 30, w: 162 } : { x: 54, y: 54, w: 84 };
  const flatOnly = location.hash.includes('flat');

  return (
    <div className="table-view bracelets stickers">
      <section className="series">
        <header className="series-head">
          <p className="series-kicker">Stickers · « Objectif ? » · la nuit sans écran</p>
          <h2>Objectif ? Être là.</h2>
          <p>
            Pas une interdiction : une invitation. À l’entrée, avec le bracelet, l’équipe colle un sticker sur l’objectif arrière du téléphone. Le téléphone reste utilisable (messages, appels, taxi), mais on ne filme plus : le crew enregistre les sets et la nuit, et tout le monde retrouve les vidéos le lendemain. Le sticker, lui, se garde comme un souvenir de l’édition.
          </p>
        </header>

        {!flatOnly && (
          <div className="stk-names">
            <article className="on">
              <span>Notre nom</span>
              <h3>Objectif ?</h3>
              <p>« Objectif », c’est la lentille de la caméra et le but de la soirée. Le « ? » du nom fait le reste : l’objectif ce soir ? Être là.</p>
            </article>
            <article>
              <span>Autre piste</span>
              <h3>Hors champ</h3>
              <p>Ce qui se passe ici reste hors du cadre. Plus cinéma, plus mystérieux.</p>
            </article>
            <article>
              <span>Autre piste</span>
              <h3>On filme pour toi</h3>
              <p>On part de la promesse plutôt que de la règle : le crew enregistre, toi tu danses.</p>
            </article>
          </div>
        )}

        <div className="wb-studio">
          <div className="wb-stage stk-stage">
            <div className="stk-hero">
              <div className="stk-big">{art(false)}</div>
              <PhoneMock shape={shape}>
                <g filter="url(#stk-shadow)">
                  <StickerArt d={d} pal={pal} shape={shape} brand={content.brand} n={n} uid="ph" box={place} />
                </g>
              </PhoneMock>
            </div>
            <div className="stk-sheet">
              {DESIGNS.map((x) => (
                <button key={x.id} className={x.id === sel ? 'on' : ''} onClick={() => pick(x.id)}>
                  <StickerArt d={x} pal={x.id === sel ? pal : x.pal} shape={shape} brand={content.brand} n={n} uid={`sh-${x.id}`} />
                  <span>{x.name}</span>
                </button>
              ))}
            </div>
          </div>
          <aside className="live-controls wb-controls">
            <section>
              <h4>Design</h4>
              <p className="wb-idea">
                <b>{d.name}</b> — {d.idea}
              </p>
            </section>
            <section>
              <h4>Format</h4>
              <div className="lc-choice stk-shapes">
                {SHAPES.map((s) => (
                  <button key={s.id} className={s.id === shape ? 'on' : ''} onClick={() => setShape(s.id)}>
                    {s.label}
                    <small>{s.fits}</small>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h4>Couleurs</h4>
              <ColorRow label="Fond" value={pal.bg} onChange={(bg) => setPal({ ...pal, bg })} />
              <ColorRow label="Texte" value={pal.fg} onChange={(fg) => setPal({ ...pal, fg })} />
              <ColorRow label="Accent" value={pal.accent} onChange={(accent) => setPal({ ...pal, accent })} />
            </section>
            <section>
              <h4>Fichiers d’impression</h4>
              <dl className="wb-spec">
                <div>
                  <dt>Format</dt>
                  <dd>
                    {sh.label}, fond perdu 2 mm
                  </dd>
                </div>
                <div>
                  <dt>Matière</dt>
                  <dd>Vinyle adhésif amovible, sans résidu (ne marque pas le téléphone) ; option « VOID » inviolable</dd>
                </div>
                <div>
                  <dt>Découpe</dt>
                  <dd>À la forme (trait magenta dans le SVG), en planches ou en rouleau pour l’entrée</dd>
                </div>
              </dl>
              <div className="wb-actions">
                <button className="tbtn solid" disabled={busy} onClick={png}>
                  PNG 300 dpi
                </button>
                <button className="tbtn" onClick={svg}>
                  SVG + découpe
                </button>
              </div>
            </section>
          </aside>
        </div>

        <div className="stk-steps">
          {[
            ['À l’entrée', 'Bracelet au poignet, sticker sur l’objectif arrière. Dix secondes, avec le sourire.'],
            ['Pendant la nuit', 'Le téléphone reste dans la poche. Le crew filme les sets et les moments forts.'],
            ['Le lendemain', 'Vidéos, photos et Live Sessions publiées : chacun reçoit sa nuit, sans l’avoir filmée.'],
            ['À la sortie', 'Le sticker se décolle sans trace et se garde : une couleur par édition, à collectionner.'],
          ].map(([h, p], i) => (
            <article key={h}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <h3>{h}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
