import { useEffect, useMemo, useRef, useState } from 'react';
import { useStudio } from '../state/store';
import { Posts } from './Posts';
import { drawScattered, fitScatter, rgba } from './Scatter';
import { Teaser } from './Teaser';
import { GlitchReels } from './Reels';

/**
 * Extra — everything for social media in one place:
 *   Reels (video): glitch reels, the tunnel teaser, the animated posts.
 *   Posts (images): 4:5 posts with the scattered name, colours under control.
 */

type Ctx2 = CanvasRenderingContext2D;
const PW = 1080;
const PH = 1350;

interface PostSettings {
  brand: string;
  kicker: string;
  date: string;
  hours: string;
  venue: string;
  nameColor: string;
  bg: string;
  seed: number;
  glow: number;
}

const NAME_COLORS: [string, string][] = [
  ['#3d6bff', 'Bleu éd. 01'],
  ['#ff5a1f', 'Orange'],
  ['#ff2b2b', 'Rouge'],
  ['#ff4fa8', 'Rose'],
  ['#ffd23f', 'Jaune'],
  ['#41ffa0', 'Vert'],
  ['#f4f1ea', 'Blanc'],
];
const BG_COLORS: [string, string][] = [
  ['#050407', 'Noir'],
  ['#02061c', 'Bleu nuit'],
  ['#1a0503', 'Brun rouge'],
  ['#0d0d10', 'Graphite'],
  ['#f2efe8', 'Papier'],
];
const GENRES = ['House', 'Afro House', 'Disco House', 'Indie Dance', 'Groove', 'House Dance'];

const isLight = (h: string) => {
  const n = parseInt(h.replace('#', ''), 16);
  return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 > 150;
};

function text(ctx: Ctx2, s: string, x: number, y: number, font: string, color: string, alpha = 1, track = 0, maxW = 0, align: CanvasTextAlign = 'center') {
  if (!s) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  (ctx as Ctx2 & { letterSpacing?: string }).letterSpacing = `${track}px`;
  const w = ctx.measureText(s).width;
  if (maxW && w > maxW) {
    ctx.translate(x, y);
    ctx.scale(maxW / w, 1);
    ctx.fillText(s, 0, 0);
  } else ctx.fillText(s, x, y);
  ctx.restore();
}

/** background: the chosen colour, a haze lit by the name, grain-free so it prints clean */
function ground(ctx: Ctx2, s: PostSettings, cy: number, strength = 1) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, PW, PH);
  if (!isLight(s.bg)) {
    const g = ctx.createRadialGradient(PW / 2, cy, 0, PW / 2, cy, PW * 0.85);
    g.addColorStop(0, rgba(s.nameColor, 0.32 * strength));
    g.addColorStop(0.55, rgba(s.nameColor, 0.08 * strength));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PW, PH);
  }
}
const ink = (s: PostSettings) => (isLight(s.bg) ? '#111' : '#f4f1ea');
/** name on two lines (UNE / AUTRE ?) */
function name(ctx: Ctx2, s: PostSettings, cy: number, maxH: number) {
  const parts = s.brand.trim().split(/\s+/);
  const lines = parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : [s.brand];
  const h = Math.min(...lines.map((l, j) => fitScatter(l, s.seed + j, PW * 0.82, maxH)));
  const flat = isLight(s.bg);
  lines.forEach((l, j) => drawScattered(ctx, l, PW / 2, lines.length > 1 ? cy + (j ? 0.78 : -0.78) * h : cy, h, { seed: s.seed + j, color: s.nameColor, glow: s.glow, flat }));
  return h;
}
function footer(ctx: Ctx2, s: PostSettings) {
  text(ctx, [s.hours, s.venue].filter(Boolean).join('  ·  ').toUpperCase(), PW / 2, PH - 80, '500 24px "IBM Plex Mono"', ink(s), 0.7, 4, PW - 160);
}

interface ImagePost {
  id: string;
  name: string;
  idea: string;
  draw: (ctx: Ctx2, s: PostSettings) => void;
}
const IMAGE_POSTS: ImagePost[] = [
  {
    id: 'nom',
    name: 'Le nom',
    idea: 'Le nom seul, éparpillé en grand. Le post qui pose l’identité, à mettre en premier dans le feed.',
    draw: (ctx, s) => {
      ground(ctx, s, PH * 0.45);
      name(ctx, s, PH * 0.45, 300);
      text(ctx, s.kicker.toUpperCase(), PW / 2, PH - 90, '500 26px "IBM Plex Mono"', ink(s), 0.75, 8);
    },
  },
  {
    id: 'date',
    name: 'La date',
    idea: 'Le nom en haut, la date en gros au milieu, l’horaire et le lieu en bas. Le post d’annonce.',
    draw: (ctx, s) => {
      ground(ctx, s, PH * 0.3);
      name(ctx, s, PH * 0.3, 200);
      text(ctx, s.kicker.toUpperCase(), PW / 2, PH * 0.62, '500 26px "IBM Plex Mono"', ink(s), 0.75, 8);
      text(ctx, s.date.toUpperCase(), PW / 2, PH * 0.72, '700 96px Fredoka', ink(s), 1, 0, PW - 140);
      footer(ctx, s);
    },
  },
  {
    id: 'question',
    name: 'Le « ? »',
    idea: 'Un « ? » géant allumé dans la couleur choisie, le nom éparpillé en petit au-dessus. Se reconnaît de loin.',
    draw: (ctx, s) => {
      ground(ctx, s, PH * 0.56, 1.2);
      name(ctx, s, PH * 0.17, 110);
      drawScattered(ctx, '?', PW / 2, PH * 0.56, 620, { seed: s.seed + 9, color: s.nameColor, glow: s.glow, spread: 0.4, flat: isLight(s.bg) });
      text(ctx, [s.kicker, s.date].filter(Boolean).join('  ·  ').toUpperCase(), PW / 2, PH - 80, '500 26px "IBM Plex Mono"', ink(s), 0.75, 6, PW - 160);
    },
  },
  {
    id: 'son',
    name: 'Le son',
    idea: 'Le nom en haut, puis la direction musicale, une ligne par style. Pour présenter l’univers avant la date.',
    draw: (ctx, s) => {
      ground(ctx, s, PH * 0.26);
      name(ctx, s, PH * 0.24, 180);
      GENRES.forEach((g, i) => text(ctx, g, PW / 2, PH * 0.53 + i * 84, '600 60px Fredoka', ink(s), 1 - i * 0.08));
      text(ctx, s.kicker.toUpperCase(), PW / 2, PH - 80, '500 24px "IBM Plex Mono"', ink(s), 0.7, 8);
    },
  },
];

const KEY = 'une-autre:posts-images';

function ImagePosts() {
  const { content } = useStudio();
  const defaults: PostSettings = useMemo(
    () => ({ brand: content.brand || 'UNE AUTRE ?', kicker: `Édition ${content.editionNumber}`, date: content.date, hours: content.hours, venue: content.venue, nameColor: '#3d6bff', bg: '#050407', seed: 5, glow: 1 }),
    [content],
  );
  const [s, setS] = useState<PostSettings>(() => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
    } catch {
      return defaults;
    }
  });
  const [ready, setReady] = useState(false);
  const refs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const set = <K extends keyof PostSettings>(k: K, v: PostSettings[K]) =>
    setS((o) => {
      const n = { ...o, [k]: v };
      try {
        localStorage.setItem(KEY, JSON.stringify(n));
      } catch {
        /* ignore */
      }
      return n;
    });

  useEffect(() => {
    Promise.all(['600 60px Fredoka', '700 60px Fredoka', '500 24px "IBM Plex Mono"'].map((f) => document.fonts.load(f))).then(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready) return;
    for (const p of IMAGE_POSTS) {
      const ctx = refs.current[p.id]?.getContext('2d');
      if (ctx) p.draw(ctx, s);
    }
  }, [ready, s]);

  const png = async (p: ImagePost) => {
    const cv = document.createElement('canvas');
    cv.width = PW;
    cv.height = PH;
    p.draw(cv.getContext('2d')!, s);
    const blob: Blob = await new Promise((r) => cv.toBlob((b) => r(b!), 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `UNE-AUTRE_post-${p.id}.png`;
    a.click();
  };
  const field = (k: 'brand' | 'kicker' | 'date' | 'hours' | 'venue', label: string) => (
    <label className="lt-field">
      <span>{label}</span>
      <input value={s[k]} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  const swatches = (k: 'nameColor' | 'bg', list: [string, string][]) => (
    <div className="lt-sw">
      {list.map(([c, n]) => (
        <button key={c} title={n} className={s[k] === c ? 'on' : ''} style={{ background: c }} onClick={() => set(k, c)} />
      ))}
      <input type="color" value={s[k]} onChange={(e) => set(k, e.target.value)} title="Couleur libre" />
    </div>
  );

  return (
    <section className="series">
      <header className="series-head">
        <p className="series-kicker">Posts · images 4:5 · 1080 × 1350</p>
        <h2>Posts</h2>
        <p>Le nom est éparpillé lettre par lettre : chaque lettre a sa hauteur, sa taille et son inclinaison. Choisissez la couleur du nom et celle du fond pour tester, tout se met à jour. « Mélanger » redistribue les lettres.</p>
      </header>
      <div className="lt-bar">
        {field('brand', 'Nom')}
        {field('kicker', 'Petite ligne')}
        {field('date', 'Date')}
        {field('hours', 'Horaire')}
        {field('venue', 'Lieu')}
      </div>
      <div className="lt-bar">
        <div className="lt-group">
          <span>Couleur du nom</span>
          {swatches('nameColor', NAME_COLORS)}
        </div>
        <div className="lt-group">
          <span>Fond</span>
          {swatches('bg', BG_COLORS)}
        </div>
        <label className="lt-group">
          <span>Lueur</span>
          <input type="range" min={0} max={2} step={0.1} value={s.glow} onChange={(e) => set('glow', Number(e.target.value))} />
        </label>
        <button className="tbtn solid" onClick={() => set('seed', (s.seed % 97) + 1)}>
          Mélanger les lettres · n° {s.seed}
        </button>
        <button className="tbtn" onClick={() => setS(defaults)}>
          Réglages d’origine
        </button>
      </div>
      <div className="ps-grid">
        {IMAGE_POSTS.map((p, i) => (
          <article key={p.id} className="ps-card">
            <canvas
              ref={(el) => {
                refs.current[p.id] = el;
              }}
              width={PW}
              height={PH}
            />
            <div className="ps-meta">
              <span>P{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.name}</h3>
              <p>{p.idea}</p>
              <div className="wb-actions">
                <button className="tbtn solid" disabled={!ready} onClick={() => png(p)}>
                  Télécharger le PNG
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Extra() {
  const [tab, setTab] = useState<'reels' | 'posts'>(/[?&]tab=posts/.test(location.hash) ? 'posts' : 'reels');
  const pick = (t: 'reels' | 'posts') => {
    setTab(t);
    history.replaceState(null, '', `#/extra?tab=${t}`);
  };
  return (
    <div className="extra">
      <div className="ex-tabs">
        <button className={tab === 'reels' ? 'on' : ''} onClick={() => pick('reels')}>
          Reels <small>vidéo</small>
        </button>
        <button className={tab === 'posts' ? 'on' : ''} onClick={() => pick('posts')}>
          Posts <small>images</small>
        </button>
      </div>
      {/[?&]only=reels/.test(location.hash) ? (
        // light preview used for checks: only the reel editor
        <div className="table-view bracelets">
          <GlitchReels />
        </div>
      ) : tab === 'reels' ? (
        <>
          <Posts />
          <Teaser />
        </>
      ) : (
        <div className="table-view bracelets">
          <ImagePosts />
        </div>
      )}
    </div>
  );
}
