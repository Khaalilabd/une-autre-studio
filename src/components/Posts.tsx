import { useEffect, useRef, useState } from 'react';
import type { EventContent } from '../data/types';
import { ringLayout } from '../graphics/ringLogo';
import { toSvgDocument } from '../lib/exporter';
import { useStudio } from '../state/store';
import { drawRing, drawTeaser, hexRgb, renderClip } from './Teaser';
import { DESIGNS } from './Wristbands';
import { GlitchReels } from './Reels';

/**
 * Posts d'annonce — four animated Instagram posts (4:5, 1080 × 1350, 8 s loops)
 * announcing the edition: save the date, the question, the tunnel info card,
 * the wristband pre-sale. Texts come from the Texte panel (date, hours, venue).
 * Exported as MP4 with the same frame-exact encoder as the teaser.
 */

const W = 1080;
const H = 1350;
const DUR = 8;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
/** fade in over [a, a+d], fade out over the last 0.6 s so the loop is clean */
const life = (t: number, a: number, d = 0.5) => ease((t - a) / d) * (1 - ease((t - (DUR - 0.6)) / 0.5));
const GENRES = 'HOUSE · AFRO HOUSE · DISCO HOUSE · INDIE DANCE';

interface Ctx {
  ctx: CanvasRenderingContext2D;
  t: number;
  c: EventContent;
  img: Record<string, HTMLImageElement>;
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, alpha = 1, opts: { align?: CanvasTextAlign; track?: number; maxW?: number } = {}) {
  if (alpha <= 0.002 || !s) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'alphabetic';
  // letter spacing (Chrome supports ctx.letterSpacing)
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${opts.track ?? 0}px`;
  if (opts.maxW) {
    const w = ctx.measureText(s).width;
    if (w > opts.maxW) {
      ctx.translate(x, y);
      ctx.scale(opts.maxW / w, 1);
      ctx.fillText(s, 0, 0);
      ctx.restore();
      return;
    }
  }
  ctx.fillText(s, x, y);
  ctx.restore();
}
/** reveal a string letter by letter between a and a+d */
const typed = (s: string, t: number, a: number, d: number) => s.slice(0, Math.round(clamp((t - a) / d) * s.length));

/* ---------- 1 · Save the date (blue, ring turning) ---------- */

function saveTheDate({ ctx, t, c }: Ctx) {
  const blue = '#1636d8';
  ctx.fillStyle = '#050a24';
  ctx.fillRect(0, 0, W, H);
  const glow = 0.55 + 0.15 * Math.sin((t / DUR) * Math.PI * 4);
  const g = ctx.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.4, W * 0.8);
  g.addColorStop(0, `rgba(22,54,216,${glow})`);
  g.addColorStop(1, 'rgba(5,10,36,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const R = 260;
  const lay = ringLayout(c.brand, R, R * 0.46);
  ctx.save();
  ctx.translate(W / 2, H * 0.43);
  ctx.rotate((t / DUR) * Math.PI * 2);
  drawRing(ctx, lay, R, hexRgb('#f2f5ff'), 1, 7);
  ctx.restore();
  text(ctx, typed(`ÉDITION ${c.editionNumber} · SAVE THE DATE`, t, 0.3, 1), W / 2, 96, '500 30px "IBM Plex Mono"', '#9fb0ff', life(t, 0.3, 0.2), { track: 6 });
  const up = (1 - ease((t - 1) / 0.7)) * 60;
  text(ctx, c.date.toUpperCase(), W / 2, H * 0.79 + up, '700 104px Fredoka', '#ffffff', life(t, 1, 0.7), { maxW: W - 140 });
  text(ctx, c.hours, W / 2, H * 0.86, '500 40px "IBM Plex Mono"', '#9fb0ff', life(t, 1.6), { track: 4 });
  text(ctx, c.venue.toUpperCase(), W / 2, H * 0.915, '500 30px "IBM Plex Mono"', '#ffffff', life(t, 1.9), { track: 5, maxW: W - 160 });
  ctx.fillStyle = blue;
  ctx.globalAlpha = life(t, 2.2);
  ctx.fillRect(W / 2 - 60, H * 0.945, 120, 4);
  ctx.globalAlpha = 1;
}

/* ---------- 2 · La question (a giant "?" drawing itself) ---------- */

function question({ ctx, t, c }: Ctx) {
  const red = '#ff1f1f';
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  const fade = 1 - ease((t - (DUR - 0.6)) / 0.5);
  ctx.save();
  ctx.font = '700 820px Fredoka';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 10;
  const L = 5200;
  ctx.setLineDash([L, L]);
  ctx.lineDashOffset = L * (1 - ease(t / 2.4));
  ctx.strokeStyle = `rgba(255,31,31,${fade})`;
  ctx.strokeText('?', W / 2, H * 0.62);
  ctx.setLineDash([]);
  ctx.globalAlpha = ease((t - 2.4) / 0.4) * fade;
  ctx.fillStyle = red;
  ctx.fillText('?', W / 2, H * 0.62);
  ctx.restore();
  // the open dot of the logo bouncing in
  const by = H * 0.62 - 40 - Math.abs(Math.sin(clamp((t - 2.4) / 1.2) * Math.PI * 2)) * 80 * (1 - clamp((t - 2.4) / 1.2));
  if (t > 2.4) {
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(W * 0.2, by, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  text(ctx, typed(c.brand.toUpperCase(), t, 3, 0.9), W / 2, H * 0.77, '700 110px Fredoka', '#ffffff', fade);
  text(ctx, `ÉDITION ${c.editionNumber}`, W / 2, H * 0.835, '500 34px "IBM Plex Mono"', red, life(t, 4.1), { track: 8 });
  text(ctx, `${c.date.toUpperCase()} · ${c.hours}`, W / 2, H * 0.885, '500 30px "IBM Plex Mono"', '#ffffff', life(t, 4.5), { track: 4, maxW: W - 120 });
  text(ctx, c.venue.toUpperCase(), W / 2, H * 0.93, '500 28px "IBM Plex Mono"', '#9a9a9a', life(t, 4.9), { track: 4, maxW: W - 120 });
}

/* ---------- 3 · Tunnel + info card ---------- */

function tunnel({ ctx, t, c }: Ctx) {
  // two beats of the teaser dive, looped (the tunnel is self-similar every two rings)
  drawTeaser(ctx, 4.5 + ((t * 2) % 4) / 2, W, H, c.brand, '#ff1f1f');
  const g = ctx.createLinearGradient(0, H * 0.5, 0, H);
  g.addColorStop(0, 'rgba(5,5,5,0)');
  g.addColorStop(0.45, 'rgba(5,5,5,0.88)');
  g.addColorStop(1, 'rgba(5,5,5,0.96)');
  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.5, W, H * 0.5);
  const beat = Math.exp(-((t % 0.5) / 0.5) * 5);
  text(ctx, c.brand.toUpperCase(), W / 2, H * 0.78, '400 150px Anton', '#ffffff', life(t, 0.2, 0.4), { maxW: W - 120 });
  text(ctx, c.date.toUpperCase(), W / 2, H * 0.845, '700 64px Fredoka', `rgba(255,${60 + beat * 120},${60 + beat * 120},1)`, life(t, 0.6), { maxW: W - 120 });
  text(ctx, `${c.hours}  ·  ${c.venue.toUpperCase()}`, W / 2, H * 0.9, '500 28px "IBM Plex Mono"', '#ffffff', life(t, 0.9), { track: 4, maxW: W - 120 });
  text(ctx, GENRES, W / 2, H * 0.945, '500 24px "IBM Plex Mono"', '#ff6b6b', life(t, 1.2), { track: 4, maxW: W - 120 });
}

/* ---------- 4 · Prévente bracelets (bands sliding) ---------- */

function presale({ ctx, t, c, img }: Ctx) {
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(0, 0, W, H);
  const band = (im: HTMLImageElement | undefined, y: number, rot: number, speed: number, h = 120) => {
    if (!im) return;
    const w = (im.width / im.height) * h;
    const off = (((t / DUR) * speed * w) % w + w) % w;
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 14;
    for (let k = -2; k <= 1; k++) ctx.drawImage(im, -W + k * w + off, -h / 2, w, h);
    ctx.restore();
  };
  band(img.anneauq, H * 0.17, -9, 1, 180);
  band(img.anneau, H * 0.37, 6, -1, 180);
  const pop = ease((t - 0.6) / 0.5);
  ctx.save();
  ctx.translate(W / 2, H * 0.63);
  ctx.scale(0.9 + 0.1 * pop, 0.9 + 0.1 * pop);
  text(ctx, 'PRÉVENTE', 0, 0, '400 190px Anton', '#ffffff', life(t, 0.6, 0.4));
  ctx.restore();
  text(ctx, 'BRACELETS D’ENTRÉE · TISSU · NUMÉROTÉS', W / 2, H * 0.69, '500 30px "IBM Plex Mono"', '#ff1f1f', life(t, 1.1), { track: 5, maxW: W - 120 });
  text(ctx, `${c.date.toUpperCase()} · ${c.hours}`, W / 2, H * 0.76, '700 56px Fredoka', '#ffffff', life(t, 1.4), { maxW: W - 120 });
  text(ctx, c.venue.toUpperCase(), W / 2, H * 0.81, '500 28px "IBM Plex Mono"', '#9a9a9a', life(t, 1.7), { track: 4, maxW: W - 120 });
  const n = String(1 + Math.floor(clamp((t - 1.8) / 4) * 299)).padStart(4, '0');
  text(ctx, `N°${c.editionNumber} · ${n}`, W / 2, H * 0.9, '500 44px "IBM Plex Mono"', '#ffffff', life(t, 1.8), { track: 6 });
  text(ctx, 'LIEN EN BIO', W / 2, H * 0.95, '500 24px "IBM Plex Mono"', '#ff1f1f', life(t, 2.2), { track: 8 });
}

const POSTS: { id: string; name: string; idea: string; draw: (p: Ctx) => void }[] = [
  { id: 'savethedate', name: 'Save the date', idea: 'Bleu de l’édition 01 : l’anneau tourne en grand, la date monte, puis l’horaire et le lieu. Le premier post, pour réserver la soirée dans les têtes.', draw: saveTheDate },
  { id: 'question', name: 'La question', idea: 'Noir et rouge : un « ? » géant se dessine trait par trait, se remplit, le petit rond tombe et rebondit, puis UNE AUTRE ? s’écrit et les infos apparaissent.', draw: question },
  { id: 'tunnel', name: 'Tunnel · infos', idea: 'La suite du teaser : le tunnel plonge sur le tempo derrière une fiche nette — nom, date qui pulse au rythme, horaire, lieu, styles musicaux.', draw: tunnel },
  { id: 'prevente', name: 'Prévente bracelets', idea: 'Les bracelets Anneau ? et Anneau défilent en travers, PRÉVENTE apparaît, le numéro d’entrée tourne comme un compteur, « lien en bio ».', draw: presale },
];

async function bandImages(c: EventContent) {
  const out: Record<string, HTMLImageElement> = {};
  for (const id of ['anneau', 'anneauq']) {
    const d = DESIGNS.find((x) => x.id === id);
    if (!d) continue;
    const doc = await toSvgDocument(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3500 150" width={3500} height={150}>
        <d.Band content={c} pal={d.pal} />
      </svg>,
    );
    const url = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }));
    const im = new Image();
    await new Promise<void>((res) => {
      im.onload = () => res();
      im.onerror = () => res();
      im.src = url;
    });
    out[id] = im;
  }
  return out;
}

export function Posts() {
  const { content } = useStudio();
  const [img, setImg] = useState<Record<string, HTMLImageElement>>({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [outs, setOuts] = useState<Record<string, string>>({});
  const refs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const still = Number(/[?&]still=([\d.]+)/.exec(location.hash)?.[1] ?? NaN);

  useEffect(() => {
    let live = true;
    Promise.all([document.fonts.load('700 100px Fredoka'), document.fonts.load('400 100px Anton'), document.fonts.load('500 30px "IBM Plex Mono"'), bandImages(content)]).then(([, , , im]) => {
      if (!live) return;
      setImg(im);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [content]);

  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const t = Number.isFinite(still) ? still : ((performance.now() - t0) / 1000) % DUR;
      for (const p of POSTS) {
        const cv = refs.current[p.id];
        const ctx = cv?.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          p.draw({ ctx, t, c: content, img });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, img, content, still]);

  const make = async (id: string) => {
    const p = POSTS.find((x) => x.id === id)!;
    setBusy(id);
    setProgress(0);
    try {
      const r = await renderClip({ W, H, dur: DUR, audio: true, onProgress: setProgress, draw: (ctx, t) => p.draw({ ctx, t, c: content, img }) });
      const url = URL.createObjectURL(r.blob);
      setOuts((o) => ({ ...o, [id]: url }));
      const port = /[?&]upload=(\d+)/.exec(location.hash)?.[1];
      if (port) await fetch(`http://127.0.0.1:${port}/UNE-AUTRE_post-${id}.mp4`, { method: 'POST', body: r.blob });
    } finally {
      setBusy('');
    }
  };
  // headless export: #/annonces?auto=1&upload=<port>
  useEffect(() => {
    if (!ready || !/[?&]auto=1/.test(location.hash)) return;
    (async () => {
      for (const p of POSTS) await make(p.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="table-view bracelets annonces">
      <GlitchReels />
      <section className="series">
        <header className="series-head">
          <p className="series-kicker">Posts d’annonce · 4:5 · 1080 × 1350 · boucles de 8 s</p>
          <h2>Posts animés</h2>
          <p>Quatre posts animés pour le feed, à publier après le teaser. Date, horaire et lieu viennent du panneau Texte. Chaque post se télécharge en MP4 (avec l’ambiance du projet), prêt pour Instagram.</p>
        </header>
        <div className="ps-grid">
          {POSTS.map((p, i) => (
            <article key={p.id} className="ps-card">
              <canvas
                ref={(el) => {
                  refs.current[p.id] = el;
                }}
                width={W}
                height={H}
              />
              <div className="ps-meta">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <h3>{p.name}</h3>
                <p>{p.idea}</p>
                <div className="wb-actions">
                  <button className="tbtn solid" disabled={!!busy || !ready} onClick={() => make(p.id)}>
                    {busy === p.id ? `Calcul… ${Math.round(progress * 100)} %` : 'Générer le MP4'}
                  </button>
                  {outs[p.id] && (
                    <a className="tbtn" href={outs[p.id]} download={`UNE-AUTRE_post-${p.id}.mp4`}>
                      Télécharger
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
