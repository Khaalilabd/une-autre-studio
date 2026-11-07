import { useEffect, useMemo, useRef, useState } from 'react';
import { ringLayout } from '../graphics/ringLogo';
import { useStudio } from '../state/store';
import { drawScattered, fitScatter } from './Scatter';
import { drawTeaser, renderClip } from './Teaser';

/**
 * Reels glitch — three 9:16 teasers (11 s) built from the same material: the name
 * (neon lettering or the round face), the ring, the tunnel, a giant "?", the date,
 * optional photos. Each reel is a different treatment: liquid ink, broken neon,
 * lost TV signal. Everything is editable.
 */

type Ctx2 = CanvasRenderingContext2D;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const rnd = (i: number, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const hex = (h: string) => {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const REEL = { W: 1080, H: 1920, DUR: 11 };
const { W, H } = REEL;
/** per-frame knobs, set from the selected reel's settings before each draw */
let BEAT = 0.5;
/** every text is drawn in this pure red; the final pass finds it and paints it in the text colour */
const TEXT = '#ff0000';
const FX = { glitch: 1, grain: 0.12, scan: 1, name: 1, contrast: 1.35, fade: true };

export type Tone = 'noir' | 'bleu' | 'couleur';
export interface ReelSettings {
  brand: string;
  kicker: string;
  date: string;
  tone: Tone;
  color: string;
  letter: 'eparpille' | 'rond';
  seed: number;
  /** tempo of the cuts, in BPM */
  bpm: number;
  /** length of the reel in seconds (the whole timeline stretches) */
  dur: number;
  /** 0 = clean, 1 = normal, 2 = heavy */
  glitch: number;
  grain: number;
  /** TV lines, 0–2 */
  scan: number;
  contrast: number;
  /** size of the name, 0.6–1.5 */
  nameSize: number;
  fade: boolean;
  /** colour of every text in the reel (name, date, small lines) */
  textColor: string;
}

/* ------------------------------------------------------------------ canvases & helpers */

const canvases: Record<string, HTMLCanvasElement> = {};
function off(key: string, w: number, h: number) {
  let c = canvases[key];
  if (!c) c = canvases[key] = document.createElement('canvas');
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}
function cover(ctx: Ctx2, im: HTMLImageElement) {
  const k = Math.max(W / im.naturalWidth, H / im.naturalHeight);
  const w = im.naturalWidth * k;
  const h = im.naturalHeight * k;
  ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
}
function grain(ctx: Ctx2, alpha: number, seed: number) {
  const g = off('r-grain', 360, 640);
  if (!g.dataset.ok) {
    const gc = g.getContext('2d')!;
    const d = gc.createImageData(360, 640);
    for (let i = 0; i < d.data.length; i += 4) {
      d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.random() * 255;
      d.data[i + 3] = 255;
    }
    gc.putImageData(d, 0, 0);
    g.dataset.ok = '1';
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(g, -rnd(seed, 1) * 200, -rnd(seed, 2) * 300, W + 400, H + 600);
  ctx.restore();
}
function line(ctx: Ctx2, s: string, x: number, y: number, font: string, color: string, alpha = 1, track = 0, maxW = 0, align: CanvasTextAlign = 'center') {
  if (!s) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  (ctx as Ctx2 & { letterSpacing?: string }).letterSpacing = `${track}px`;
  const w = ctx.measureText(s).width;
  if (maxW && w > maxW) {
    ctx.translate(x, y);
    ctx.scale(maxW / w, 1);
    ctx.fillText(s, 0, 0);
  } else ctx.fillText(s, x, y);
  ctx.restore();
}
function fillRing(ctx: Ctx2, brand: string, R: number, color: string) {
  const lay = ringLayout(brand, R, R * 0.46);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  for (const g of lay.glyphs) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate((g.rot * Math.PI) / 180);
    ctx.font = `700 ${g.size}px Fredoka`;
    ctx.fillText(g.ch, 0, g.size * 0.35);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(-R, -R * 0.2, R * 0.46 * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

/** the name: neon lettering (centred on y) or the round face (baseline at y + size*0.35) */
function word(ctx: Ctx2, st: ReelSettings, text: string, x: number, y: number, size0: number, color: string, lit?: (i: number) => number) {
  const size = size0 * FX.name;
  if (st.letter === 'eparpille' && text) {
    const black = color === '#000';
    const parts = text.trim().split(/\s+/);
    const lines = parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : [text];
    const h = Math.min(...lines.map((l, j) => fitScatter(l, st.seed + j, W * 0.84 * Math.max(1, FX.name), size * 1.25)));
    const n0 = [...lines[0]].filter((c) => c !== ' ').length;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    lines.forEach((l, j) => {
      const yy = lines.length > 1 ? y + (j ? 0.95 : -0.95) * h : y;
      drawScattered(ctx, l, x, yy, h, { seed: st.seed + j, color: TEXT, flat: black, glow: 1.1, lit: lit ? (i) => lit(i + (j ? n0 : 0)) : undefined });
    });
    ctx.restore();
  } else line(ctx, text, x, y + size * 0.35, `700 ${size}px Fredoka`, TEXT, 1, -size * 0.02, W * 0.9);
}

/** liquid ink, computed small and blown up */
function liquid(s: Ctx2, t: number) {
  const L = off('r-liq', 108, 192);
  const lc = L.getContext('2d')!;
  const d = lc.createImageData(108, 192);
  for (let y = 0; y < 192; y++)
    for (let x = 0; x < 108; x++) {
      const v = Math.sin(x * 0.11 + Math.sin(y * 0.06 + t * 1.4) * 2.4 + t * 0.8) + Math.sin(y * 0.08 + Math.sin(x * 0.07 - t * 1.1) * 2.6) + 0.6 * Math.sin((x + y) * 0.05 + t * 2);
      const g = 128 + 127 * Math.tanh(v * 2.2);
      const i = (y * 108 + x) * 4;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = g;
      d.data[i + 3] = 255;
    }
  lc.putImageData(d, 0, 0);
  s.imageSmoothingEnabled = true;
  s.drawImage(L, 0, 0, W, H);
}
/** TV snow */
function snow(ctx: Ctx2, seed: number, alpha = 1) {
  const N = off('r-snow', 216, 384);
  const nc = N.getContext('2d')!;
  const d = nc.createImageData(216, 384);
  let x = seed * 9301 + 49297;
  for (let i = 0; i < d.data.length; i += 4) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const v = (x >> 16) & 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  nc.putImageData(d, 0, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(N, 0, 0, W, H);
  ctx.restore();
}
function scanlines(ctx: Ctx2, alpha0: number, offset = 0) {
  const alpha = Math.min(0.9, alpha0 * FX.scan);
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = offset % 6; y < H; y += 6) ctx.fillRect(0, y, W, 3);
  ctx.restore();
}

type Shot = 'liquid' | 'tunnel' | 'ring' | 'q' | 'date' | 'word' | 'inverse' | 'photo' | 'black' | 'end';

function source(s: Ctx2, kind: Shot, t: number, st: ReelSettings, photos: HTMLImageElement[], k: number, lit?: (i: number) => number) {
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalAlpha = 1;
  s.globalCompositeOperation = 'source-over';
  s.filter = 'none';
  s.fillStyle = '#000';
  s.fillRect(0, 0, W, H);
  if (kind === 'liquid') {
    liquid(s, t);
    s.fillStyle = 'rgba(0,0,0,0.25)';
    s.fillRect(0, 0, W, H);
    word(s, st, st.brand, W / 2, H * 0.5, 190, '#fff', lit);
  } else if (kind === 'tunnel') {
    drawTeaser(s, 4.6 + ((t * 1.5) % 5), W, H, st.brand, '#ffffff');
  } else if (kind === 'ring') {
    s.save();
    s.translate(W / 2, H / 2);
    s.rotate(t * 0.9);
    fillRing(s, st.brand, W * 0.4, '#fff');
    s.restore();
  } else if (kind === 'q') {
    if (st.letter === 'eparpille') word(s, st, '?', W / 2, H / 2, 1100, '#fff');
    else {
      s.save();
      s.translate(W / 2, H / 2);
      s.rotate(Math.sin(t * 3) * 0.2 + (k % 2 ? Math.PI : 0));
      s.font = '700 1500px Fredoka';
      s.textAlign = 'center';
      s.fillStyle = TEXT;
      s.fillText('?', 0, 520);
      s.restore();
    }
  } else if (kind === 'date') {
    line(s, st.date.toUpperCase(), W / 2, H * 0.5 + 40, '700 120px Fredoka', TEXT, 1, 0, W * 0.88);
  } else if (kind === 'word') {
    liquid(s, t * 0.5);
    s.fillStyle = 'rgba(0,0,0,0.72)';
    s.fillRect(0, 0, W, H);
    word(s, st, st.brand, W / 2, H * 0.5, 200, '#fff', lit);
  } else if (kind === 'inverse') {
    s.fillStyle = '#fff';
    s.fillRect(0, 0, W, H);
    word(s, st, st.brand, W / 2, H * 0.5, 200, '#000');
  } else if (kind === 'photo') {
    const im = photos[k % Math.max(1, photos.length)];
    if (im) {
      // photos in grey, so only the text carries colour into the final pass
      s.filter = 'grayscale(1)';
      cover(s, im);
      s.filter = 'none';
    } else liquid(s, t + k);
  } else if (kind === 'end') {
    word(s, st, st.brand, W / 2, H * 0.47, 190, '#fff', lit);
    line(s, [st.kicker, st.date].filter(Boolean).join('  ·  ').toUpperCase(), W / 2, H * 0.47 + (st.letter === 'eparpille' ? 360 : 190), '500 34px "IBM Plex Mono"', TEXT, 0.85, 6, W - 160);
  }
}

function mosaic(ctx: Ctx2, S: HTMLCanvasElement, b0: number) {
  const b = 1 + (b0 - 1) * FX.glitch;
  if (b < 1.5) {
    ctx.drawImage(S, 0, 0);
    return;
  }
  const w = Math.max(2, Math.round(W / b));
  const h = Math.max(2, Math.round(H / b));
  const P = off('r-mos', w, h);
  P.getContext('2d')!.drawImage(S, 0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(P, 0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
}
function warp(ctx: Ctx2, S: HTMLCanvasElement, amp0: number, t: number) {
  const amp = amp0 * FX.glitch;
  for (let y = 0; y < H; y += 8) {
    const dx = amp * Math.sin(y * 0.009 + t * 5) + amp * 0.45 * Math.sin(y * 0.031 - t * 9);
    ctx.drawImage(S, 0, y, W, 8, dx, y, W, 8);
  }
}
function slices(ctx: Ctx2, S: HTMLCanvasElement, n0: number, amp0: number, seed: number) {
  const n = Math.round(n0 * FX.glitch);
  const amp = amp0 * FX.glitch;
  for (let i = 0; i < n; i++) {
    const y = rnd(i, seed) * H;
    const h = 8 + rnd(i + 50, seed) * 90;
    ctx.drawImage(S, 0, y, W, h, (rnd(i + 99, seed) - 0.5) * 2 * amp, y, W, h);
  }
}
function blocks(ctx: Ctx2, S: HTMLCanvasElement, n0: number, seed: number) {
  const n = Math.round(n0 * FX.glitch);
  const P = off('r-blk', 24, 24);
  const pc = P.getContext('2d')!;
  for (let i = 0; i < n; i++) {
    const sz = 60 + rnd(i, seed) * 220;
    const x = rnd(i + 7, seed) * (W - sz);
    const y = rnd(i + 13, seed) * (H - sz);
    pc.drawImage(S, x + (rnd(i + 21, seed) - 0.5) * 160, y, sz, sz, 0, 0, 24, 24);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(P, x, y, sz, sz);
    ctx.imageSmoothingEnabled = true;
  }
}
/** double image, shifted sideways (a black-and-white RGB split) */
function ghost(ctx: Ctx2, S: HTMLCanvasElement, dx0: number, alpha: number) {
  const dx = dx0 * FX.glitch;
  if (Math.abs(dx) < 0.5) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha;
  ctx.drawImage(S, dx, 0);
  ctx.drawImage(S, -dx, 0);
  ctx.restore();
}
function ignite(t: number, a: number, d: number, i: number) {
  if (t < a) return 0;
  if (t > a + d) return 1;
  return rnd(Math.floor((t - a) * 24) + i * 7, i + 1) > 0.5 - ((t - a) / d) * 0.45 ? 1 : 0.05;
}

/** start a frame: black, returns the source canvas and beat info */
function begin(ctx: Ctx2, t: number) {
  const S = off('r-src', W, H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const beat = Math.floor(t / BEAT);
  const ph = (t % BEAT) / BEAT;
  return { S, s: S.getContext('2d')!, beat, ph, hit: Math.exp(-ph * 6), fr: Math.floor(t * 30) };
}
/** grey + contrast while drawing fx() */
function bw(ctx: Ctx2, fx: () => void) {
  ctx.save();
  ctx.filter = `contrast(${FX.contrast})`;
  fx();
  ctx.restore();
}
/** final pass: grey picture toned (black & white / blue / free colour), text found by its red and painted in the text colour */
function finish(ctx: Ctx2, t: number, st: ReelSettings) {
  const mixN = (h: string, to: number, k: number) => hex(h).map((v) => v + (to - v) * k);
  const lo = st.tone === 'bleu' ? hex('#030b33') : st.tone === 'couleur' ? mixN(st.color, 0, 0.82) : [0, 0, 0];
  const hi = st.tone === 'bleu' ? hex('#c9d5ff') : st.tone === 'couleur' ? mixN(st.color, 255, 0.55) : [255, 255, 255];
  const tc = hex(st.textColor || '#ffffff');
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const base = (d[i + 1] + d[i + 2]) * 0.5;
    let a = (r - base - 24) / 170;
    a = a < 0 ? 0 : a > 1 ? 1 : a;
    const v = base / 255;
    const br = lo[0] + (hi[0] - lo[0]) * v;
    const bg = lo[1] + (hi[1] - lo[1]) * v;
    const bb = lo[2] + (hi[2] - lo[2]) * v;
    // the text keeps its brightness: its hot core goes a little whiter than its glow
    const lift = v * 0.6;
    d[i] = br * (1 - a) + (tc[0] + (255 - tc[0]) * lift) * a;
    d[i + 1] = bg * (1 - a) + (tc[1] + (255 - tc[1]) * lift) * a;
    d[i + 2] = bb * (1 - a) + (tc[2] + (255 - tc[2]) * lift) * a;
  }
  ctx.putImageData(img, 0, 0);
  if (FX.grain > 0.005) grain(ctx, FX.grain, Math.floor(t * 30));
  const fo = FX.fade ? clamp((t - (REEL.DUR - 0.45)) / 0.45) : 0;
  if (fo > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fo})`;
    ctx.fillRect(0, 0, W, H);
  }
}
const letterCount = (st: ReelSettings) => [...st.brand].filter((c) => c !== ' ').length;

/* ------------------------------------------------------------------ 1 · Encre (the original glitch reel) */

function reelEncre(ctx: Ctx2, t: number, st: ReelSettings, photos: HTMLImageElement[]) {
  const { S, s, beat, ph, hit } = begin(ctx, t);
  let overlay: null | (() => void) = null;
  if (t < 1.6) {
    source(s, 'liquid', t, st, photos, 0);
    bw(ctx, () => warp(ctx, S, 90 * (1 - t / 1.8) + 20 * hit, t));
    bw(ctx, () => blocks(ctx, S, Math.round(10 * hit), beat));
  } else if (t < 2.6) {
    source(s, 'tunnel', t, st, photos, 0);
    bw(ctx, () => mosaic(ctx, S, 6 + 54 * hit));
    bw(ctx, () => blocks(ctx, S, 14, beat + 3));
  } else if (t < 3.0) {
    source(s, photos.length ? 'photo' : 'q', t, st, photos, 0);
    bw(ctx, () => {
      ctx.drawImage(S, 0, 0);
      slices(ctx, S, 26, 260, Math.floor(t * 30));
    });
  } else if (t < 4.2) {
    if ((t < 3.25 && Math.floor(t * 30) % 3 === 0) || t >= 3.25) {
      source(s, 'date', t, st, photos, 0);
      const tear = t < 3.6 ? 1 : 0.25 + 0.75 * hit;
      bw(ctx, () => {
        ctx.drawImage(S, (1 - ease((t - 3) / 0.5)) * -120, 0);
        slices(ctx, S, Math.round(18 * tear), 340 * tear, Math.floor(t * 30));
      });
    }
  } else if (t < 5.4) {
    source(s, 'ring', t, st, photos, 0);
    bw(ctx, () => mosaic(ctx, S, 2 + 70 * (1 - ease((t - 4.2) / 0.9))));
    bw(ctx, () => blocks(ctx, S, Math.round(8 * hit), beat + 9));
  } else if (t < 6.4) {
    source(s, 'word', t, st, photos, 0);
    bw(ctx, () => {
      ctx.drawImage(S, 0, 0);
      if (hit > 0.5) slices(ctx, S, 10, 120, beat);
    });
    if (ph < 0.08) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(0, 0, W, H);
    }
  } else if (t < 7.6) {
    source(s, 'tunnel', t + 2, st, photos, 1);
    bw(ctx, () => warp(ctx, S, 140, t));
    overlay = () => word(ctx, st, st.brand, W * 0.3 - (t - 6.4) * 80, H * 0.38, 260, '#fff');
  } else if (t < 9.2) {
    const k = Math.floor(t / (BEAT / 2));
    const seq: Shot[] = ['q', 'ring', 'inverse', 'tunnel', photos.length ? 'photo' : 'liquid', 'q'];
    source(s, seq[k % seq.length], t, st, photos, k);
    bw(ctx, () => {
      ctx.drawImage(S, 0, 0);
      slices(ctx, S, 12, 200, k);
      blocks(ctx, S, 6, k + 1);
    });
  } else {
    source(s, 'end', t, st, photos, 0);
    const b = 2 + 60 * (1 - ease((t - 9.2) / 0.6));
    bw(ctx, () => {
      if (b > 3) mosaic(ctx, S, b);
      else ctx.drawImage(S, 0, 0);
      if (hit > 0.7 && t < 10.4) slices(ctx, S, 5, 80, beat);
    });
  }
  if (overlay) bw(ctx, overlay);
  finish(ctx, t, st);
}

/* ------------------------------------------------------------------ 2 · Néon cassé */

function reelNeon(ctx: Ctx2, t: number, st: ReelSettings, photos: HTMLImageElement[]) {
  const { S, s, beat, hit, fr } = begin(ctx, t);
  const n = letterCount(st);
  if (t < 2.6) {
    // the letters ignite one by one, stuttering
    source(s, 'black', t, st, photos, 0);
    word(s, st, st.brand, W / 2, H * 0.5, 200, '#fff', (i) => ignite(t, 0.25 + i * (1.9 / n), 0.35, i));
    bw(ctx, () => {
      ctx.drawImage(S, 0, 0);
      ghost(ctx, S, 10 + 18 * hit, 0.45);
      if (rnd(fr, 3) > 0.82) slices(ctx, S, 6, 90, fr);
    });
  } else if (t < 3.6) {
    source(s, 'tunnel', t, st, photos, 0);
    bw(ctx, () => {
      warp(ctx, S, 22, t);
      ghost(ctx, S, 26 * hit, 0.5);
    });
  } else if (t < 4.8) {
    // close-up sliding across the big letters
    source(s, 'black', t, st, photos, 0);
    word(s, st, st.brand, W / 2, H * 0.5, 200, '#fff');
    const z = 3.2;
    const sw = W / z;
    const sh = H / z;
    const p = ease((t - 3.6) / 1.2);
    bw(ctx, () => {
      ctx.drawImage(S, W * 0.06 + (W * 0.88 - sw) * p, H * 0.5 - sh / 2, sw, sh, 0, 0, W, H);
      if (hit > 0.6) slices(ctx, ctx.canvas, 8, 160, beat);
    });
  } else if (t < 5.8) {
    source(s, 'ring', t, st, photos, 0);
    const on = rnd(Math.floor(t * 14), 5) > 0.3;
    if (on)
      bw(ctx, () => {
        ctx.drawImage(S, 0, 0);
        ghost(ctx, S, 16, 0.55);
      });
  } else if (t < 7.2) {
    // the date typed like teletext, block cursor
    const str = st.date.toUpperCase();
    const k = Math.round(clamp((t - 5.9) / 0.9) * str.length);
    source(s, 'black', t, st, photos, 0);
    s.font = '500 96px "IBM Plex Mono"';
    s.textAlign = 'left';
    const full = s.measureText(str).width;
    const sc = Math.min(1, (W * 0.86) / full);
    s.save();
    s.translate(W / 2 - (full * sc) / 2, H * 0.52);
    s.scale(sc, sc);
    s.fillStyle = TEXT;
    s.fillText(str.slice(0, k), 0, 0);
    if (Math.floor(t * 4) % 2 === 0) s.fillRect(s.measureText(str.slice(0, k)).width + 10, -76, 52, 90);
    s.restore();
    line(s, st.kicker.toUpperCase(), W / 2, H * 0.52 - 120, '500 30px "IBM Plex Mono"', TEXT, 0.7, 8);
    bw(ctx, () => {
      ctx.drawImage(S, 0, 0);
      ghost(ctx, S, 6, 0.4);
    });
  } else if (t < 9.2) {
    const k = Math.floor(t / (BEAT / 2));
    const seq: Shot[] = ['word', 'inverse', 'q', 'tunnel', photos.length ? 'photo' : 'ring'];
    source(s, seq[k % seq.length], t, st, photos, k);
    bw(ctx, () => {
      ctx.drawImage(S, 0, 0);
      ghost(ctx, S, 30 * hit, 0.5);
      slices(ctx, S, 8, 180, k);
    });
  } else {
    // end: everything lit, one letter keeps buzzing
    const bad = Math.floor(rnd(st.seed, 4) * n);
    source(s, 'end', t, st, photos, 0, (i) => (i === bad && rnd(fr, 9) > 0.6 ? 0.1 : 1));
    bw(ctx, () => {
      ctx.drawImage(S, 0, 0);
      ghost(ctx, S, 4 + 10 * hit * (t < 9.6 ? 1 : 0.3), 0.35);
    });
  }
  scanlines(ctx, 0.16, Math.floor(t * 40));
  finish(ctx, t, st);
}

/* ------------------------------------------------------------------ 3 · Signal perdu */

function reelSignal(ctx: Ctx2, t: number, st: ReelSettings, photos: HTMLImageElement[]) {
  const { S, s, fr } = begin(ctx, t);
  const osd = (txt: string) => line(ctx, txt, 70, 150, '500 46px "IBM Plex Mono"', TEXT, 0.9, 4, 0, 'left');
  const bar = (p: number) => {
    const y = ((p % 1) + 1) % 1 * (H + 400) - 200;
    const g = ctx.createLinearGradient(0, y - 160, 0, y + 160);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 160, W, 320);
  };
  if (t < 1) {
    snow(ctx, fr);
  } else if (t < 2.5) {
    source(s, 'word', t, st, photos, 0);
    const roll = ((t - 1) * 1300) % H;
    bw(ctx, () => {
      ctx.drawImage(S, 0, -roll);
      ctx.drawImage(S, 0, H - roll);
    });
    ctx.globalCompositeOperation = 'screen';
    snow(ctx, fr, 0.45 * (1 - (t - 1) / 1.5) + 0.12);
    ctx.globalCompositeOperation = 'source-over';
  } else if (t < 3) {
    osd('CH 01');
  } else if (t < 4.5) {
    source(s, 'tunnel', t, st, photos, 0);
    bw(ctx, () => warp(ctx, S, 70, t));
    bar(t * 0.7);
    osd('CH 01');
  } else if (t < 5) {
    snow(ctx, fr);
  } else if (t < 6.5) {
    source(s, 'ring', t, st, photos, 0);
    bw(ctx, () => ctx.drawImage(S, 0, Math.sin(t * 40) * 6));
    bar(t * 0.9 + 0.3);
    ctx.globalCompositeOperation = 'screen';
    snow(ctx, fr, 0.18);
    ctx.globalCompositeOperation = 'source-over';
    osd('CH 01');
  } else if (t < 7.3) {
    const str = st.date.toUpperCase();
    line(ctx, str.slice(0, Math.round(clamp((t - 6.5) / 0.6) * str.length)), W / 2, H * 0.52, '500 70px "IBM Plex Mono"', TEXT, 1, 2, W * 0.86);
    osd('CH 01');
  } else if (t < 9.2) {
    const k = Math.floor(t / (BEAT / 2));
    const local = (t % (BEAT / 2)) / (BEAT / 2);
    if (local < 0.28) snow(ctx, fr);
    else {
      const seq: Shot[] = ['q', photos.length ? 'photo' : 'liquid', 'inverse', 'tunnel', 'word'];
      source(s, seq[k % seq.length], t, st, photos, k);
      bw(ctx, () => ctx.drawImage(S, 0, 0));
      osd(`CH 0${(k % 8) + 1}`);
    }
  } else {
    // end card, then the CRT switches off
    source(s, 'end', t, st, photos, 0);
    const off1 = clamp((t - 10.45) / 0.22);
    const off2 = clamp((t - 10.67) / 0.18);
    bw(ctx, () => {
      if (off1 <= 0) ctx.drawImage(S, 0, 0);
      else {
        const hh = Math.max(4, H * (1 - off1));
        const ww = W * (1 - off2 * 0.98);
        ctx.filter = 'grayscale(1) brightness(1.8)';
        ctx.drawImage(S, (W - ww) / 2, (H - hh) / 2, ww, hh);
      }
    });
    if (off1 <= 0) {
      ctx.globalCompositeOperation = 'screen';
      snow(ctx, fr, 0.1);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  scanlines(ctx, 0.22, 0);
  // screen curvature: darker corners
  const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, H * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  finish(ctx, t, st);
}

/* ------------------------------------------------------------------ list */

export const REELS: { id: string; name: string; idea: string; still: number; draw: (ctx: Ctx2, t: number, st: ReelSettings, photos: HTMLImageElement[]) => void }[] = [
  { id: 'encre', name: 'Encre', idea: 'Le reel glitch d’origine : le nom fond dans une encre liquide, le tunnel en pixels, la date qui flashe sur le noir, l’anneau qui sort des pixels, une rafale de plans, la carte finale.', still: 5.8, draw: reelEncre },
  { id: 'neon', name: 'Néon cassé', idea: 'Les lettres s’allument une à une en grésillant, image doublée comme un signal qui décroche. Gros plan qui glisse sur les lettres, la date tapée lettre par lettre, rafale sur le tempo. À la fin, une lettre continue de clignoter.', still: 2.4, draw: reelNeon },
  { id: 'signal', name: 'Signal perdu', idea: 'Une vieille télé : neige, image qui défile verticalement, « CH 01 » à l’écran, barre lumineuse qui descend. Zapping sur le tempo, puis la télé s’éteint sur la carte finale.', still: 3.8, draw: reelSignal },
];

/** draw reel r at real time t (seconds) with its settings */
export function drawReel(r: (typeof REELS)[number], ctx: Ctx2, t: number, st: ReelSettings, photos: HTMLImageElement[]) {
  const k = REEL.DUR / Math.max(4, st.dur);
  BEAT = (60 / Math.max(60, st.bpm)) * k;
  FX.glitch = st.glitch;
  FX.grain = st.grain;
  FX.scan = st.scan;
  FX.name = st.nameSize;
  FX.contrast = st.contrast;
  FX.fade = st.fade;
  r.draw(ctx, Math.min(REEL.DUR - 0.001, t * k), st, photos);
}

/* ------------------------------------------------------------------ UI */

const KEY = 'une-autre:reels';
const COLORS: [string, string][] = [
  ['#3d6bff', 'Bleu éd. 01'],
  ['#ff2b2b', 'Rouge'],
  ['#ff4fa8', 'Rose'],
  ['#ffae3a', 'Ambre'],
  ['#41ffa0', 'Vert'],
];

const TEXT_COLORS: [string, string][] = [
  ['#ffffff', 'Blanc'],
  ['#3d6bff', 'Bleu éd. 01'],
  ['#7fa0ff', 'Bleu clair'],
  ['#ff2b2b', 'Rouge'],
  ['#ff5a1f', 'Orange'],
  ['#ff4fa8', 'Rose'],
  ['#ffd23f', 'Jaune'],
  ['#41ffa0', 'Vert'],
];

async function loadImage(file: File) {
  const im = new Image();
  im.src = URL.createObjectURL(file);
  await im.decode().catch(() => undefined);
  return im;
}

type AllSettings = Record<string, ReelSettings>;

export function GlitchReels() {
  const { content } = useStudio();
  const base: ReelSettings = useMemo(
    () => ({
      brand: content.brand || 'UNE AUTRE ?',
      kicker: `Édition ${content.editionNumber}`,
      date: content.date,
      tone: 'bleu',
      color: '#3d6bff',
      letter: 'eparpille',
      seed: 3,
      bpm: 120,
      dur: 11,
      glitch: 1,
      grain: 0.12,
      scan: 1,
      contrast: 1.35,
      nameSize: 1,
      fade: true,
      textColor: '#ffffff',
    }),
    [content],
  );
  const [all, setAll] = useState<AllSettings>(() => {
    let saved: Record<string, Partial<ReelSettings>> = {};
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
      // older format: one settings object shared by every reel
      saved = raw && typeof raw.brand === 'string' ? Object.fromEntries(REELS.map((r) => [r.id, raw])) : raw ?? {};
    } catch {
      /* ignore */
    }
    return Object.fromEntries(
      REELS.map((r) => {
        const st = { ...base, ...(saved[r.id] ?? {}) } as ReelSettings;
        if (st.letter !== 'rond') st.letter = 'eparpille';
        // check hook: #...&tc=ff5a1f forces a text colour
        const tc = /[?&]tc=([0-9a-f]{6})/i.exec(location.hash)?.[1];
        if (tc) st.textColor = `#${tc}`;
        return [r.id, st];
      }),
    );
  });
  const [sel, setSel] = useState(REELS[0].id);
  const reel = REELS.find((r) => r.id === sel) ?? REELS[0];
  const st = all[reel.id];
  const [photos, setPhotos] = useState<Record<string, HTMLImageElement[]>>({});
  const ph = photos[reel.id] ?? [];
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [outs, setOuts] = useState<Record<string, string>>({});
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ st, ph, reel, time });
  live.current = { st, ph, reel, time };
  const hash = location.hash;
  const fixedT = Number(/[?&]rt=([\d.]+)/.exec(hash)?.[1] ?? NaN);

  const save = (n: AllSettings) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(n));
    } catch {
      /* ignore */
    }
    return n;
  };
  const set = <K extends keyof ReelSettings>(k: K, v: ReelSettings[K]) => setAll((o) => save({ ...o, [reel.id]: { ...o[reel.id], [k]: v } }));
  const resetThis = () => setAll((o) => save({ ...o, [reel.id]: { ...base } }));
  const copyToOthers = () => {
    if (!confirm('Appliquer les réglages de ce reel aux autres reels ?')) return;
    setAll((o) => save(Object.fromEntries(REELS.map((r) => [r.id, { ...o[reel.id] }]))));
  };

  useEffect(() => {
    Promise.all(['700 100px Fredoka', '600 100px Fredoka', '500 30px "IBM Plex Mono"'].map((f) => document.fonts.load(f))).then(() => setReady(true));
  }, []);

  // paused (or fixed time): draw the frame under the cursor
  useEffect(() => {
    if (!ready || (playing && !Number.isFinite(fixedT))) return;
    const ctx = canvas.current?.getContext('2d', { willReadFrequently: true });
    if (ctx) drawReel(reel, ctx, Number.isFinite(fixedT) ? fixedT : time, st, ph);
  }, [ready, playing, fixedT, time, st, ph, reel]);
  // playing: loop over the reel's duration, always with the latest settings
  useEffect(() => {
    if (!ready || !playing || Number.isFinite(fixedT)) return;
    const ctx = canvas.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    let raf = 0;
    let last = 0;
    let t0 = performance.now() - live.current.time * 1000;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      const L = live.current;
      let t = (now - t0) / 1000;
      if (t >= L.st.dur) {
        t0 = now;
        t = 0;
      }
      drawReel(L.reel, ctx, t, L.st, L.ph);
      setTime(t);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, playing, reel.id, fixedT]);

  const make = async (id: string) => {
    const r = REELS.find((x) => x.id === id)!;
    const cur = all[id];
    const curPh = photos[id] ?? [];
    setBusy(id);
    setProgress(0);
    const wasPlaying = playing;
    setPlaying(false);
    try {
      const res = await renderClip({ W, H, dur: cur.dur, audio: true, onProgress: setProgress, draw: (ctx, t) => drawReel(r, ctx, t, cur, curPh) });
      setOuts((o) => ({ ...o, [id]: URL.createObjectURL(res.blob) }));
      const port = /[?&]upload=(\d+)/.exec(location.hash)?.[1];
      if (port) await fetch(`http://127.0.0.1:${port}/UNE-AUTRE_reel-${id}.mp4`, { method: 'POST', body: res.blob });
    } finally {
      setBusy('');
      setPlaying(wasPlaying);
    }
  };
  // headless export: #/extra?reels=<id|1>&upload=<port>
  useEffect(() => {
    const want = /[?&]reels=(\w+)/.exec(hash)?.[1];
    if (!ready || !want) return;
    (async () => {
      for (const r of REELS) if (want === '1' || want === r.id) await make(r.id);
      document.title = 'REELS_DONE';
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const field = (k: 'brand' | 'kicker' | 'date', label: string, hint = '') => (
    <label className="lt-field">
      <span>{label}</span>
      <input value={st[k]} placeholder={hint} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  const slider = (k: 'bpm' | 'dur' | 'glitch' | 'grain' | 'scan' | 'contrast' | 'nameSize', label: string, min: number, max: number, step: number, fmt: (v: number) => string) => (
    <label className="rl-slider">
      <span>
        {label} <b>{fmt(st[k])}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={st[k]} onChange={(e) => set(k, Number(e.target.value))} />
    </label>
  );
  const pct = (v: number) => `${Math.round(v * 100)} %`;

  return (
    <section className="series">
      <header className="series-head">
        <p className="series-kicker">Reels teaser · 9:16 · 1080 × 1920</p>
        <h2>Reels glitch</h2>
        <p>Choisissez le reel à modifier. Tous les réglages à droite ne s’appliquent qu’à lui : textes, lettres, couleur, tempo, durée, effets, photos. Ils sont gardés dans ce navigateur.</p>
      </header>

      <div className="rl-pick">
        <span>Reel à modifier</span>
        {REELS.map((r, i) => (
          <button key={r.id} className={r.id === reel.id ? 'on' : ''} onClick={() => setSel(r.id)}>
            R{String(i + 1).padStart(2, '0')} · {r.name}
          </button>
        ))}
      </div>

      <div className="rl-edit">
        <div className="rl-stage">
          <canvas ref={canvas} width={W} height={H} onClick={() => setPlaying((p) => !p)} />
          <div className="rl-transport">
            <button className="tbtn" onClick={() => setPlaying((p) => !p)}>
              {playing ? 'Pause' : 'Lecture'}
            </button>
            <input
              type="range"
              min={0}
              max={st.dur}
              step={0.01}
              value={Math.min(time, st.dur)}
              onChange={(e) => {
                setPlaying(false);
                setTime(Number(e.target.value));
              }}
            />
            <span>
              {time.toFixed(1)} / {st.dur} s
            </span>
          </div>
          <p className="rl-idea">{reel.idea}</p>
        </div>

        <div className="rl-panel">
          <h3>Textes</h3>
          {field('brand', 'Nom')}
          {field('kicker', 'Petite ligne', 'Édition 01')}
          {field('date', 'Date', 'Samedi 12 décembre')}

          <h3>Le nom</h3>
          <div className="wb-actions">
            <button className={`tbtn${st.letter === 'eparpille' ? ' solid' : ''}`} onClick={() => set('letter', 'eparpille')}>
              Lettres éparpillées
            </button>
            <button className={`tbtn${st.letter === 'rond' ? ' solid' : ''}`} onClick={() => set('letter', 'rond')}>
              Police ronde
            </button>
          </div>
          {st.letter === 'eparpille' && (
            <button className="tbtn" onClick={() => set('seed', (st.seed % 97) + 1)}>
              Mélanger les lettres · n° {st.seed}
            </button>
          )}
          {slider('nameSize', 'Taille du nom', 0.6, 1.5, 0.05, pct)}

          <h3>Couleur du texte</h3>
          <div className="lt-sw">
            {TEXT_COLORS.map(([c, n]) => (
              <button key={c} title={n} className={st.textColor === c ? 'on' : ''} style={{ background: c }} onClick={() => set('textColor', c)} />
            ))}
            <input type="color" value={st.textColor} onChange={(e) => set('textColor', e.target.value)} title="Couleur libre" />
          </div>

          <h3>Couleur de l’image</h3>
          <div className="wb-actions">
            <button className={`tbtn${st.tone === 'bleu' ? ' solid' : ''}`} onClick={() => set('tone', 'bleu')}>
              Bleu éd. 01
            </button>
            <button className={`tbtn${st.tone === 'noir' ? ' solid' : ''}`} onClick={() => set('tone', 'noir')}>
              Noir & blanc
            </button>
            <button className={`tbtn${st.tone === 'couleur' ? ' solid' : ''}`} onClick={() => set('tone', 'couleur')}>
              Couleur libre
            </button>
          </div>
          {st.tone === 'couleur' && (
            <div className="lt-sw">
              {COLORS.map(([c, n]) => (
                <button key={c} title={n} className={st.color === c ? 'on' : ''} style={{ background: c }} onClick={() => set('color', c)} />
              ))}
              <input type="color" value={st.color} onChange={(e) => set('color', e.target.value)} />
            </div>
          )}
          {slider('contrast', 'Contraste', 0.8, 2.5, 0.05, (v) => v.toFixed(2))}

          <h3>Rythme</h3>
          {slider('bpm', 'Tempo des coupes', 90, 140, 1, (v) => `${v} BPM`)}
          {slider('dur', 'Durée', 6, 20, 0.5, (v) => `${v} s`)}

          <h3>Effets</h3>
          {slider('glitch', 'Intensité du glitch', 0, 2, 0.05, pct)}
          {slider('grain', 'Grain', 0, 0.35, 0.01, (v) => pct(v / 0.35))}
          {slider('scan', 'Lignes TV', 0, 2, 0.05, pct)}
          <label className="lt-check">
            <input type="checkbox" checked={st.fade} onChange={(e) => set('fade', e.target.checked)} /> Fondu au noir à la fin
          </label>

          <h3>Photos (plans du reel)</h3>
          <div className="wb-actions">
            <label className="tbtn">
              Ajouter ({ph.length})
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={async (e) => {
                  const add = await Promise.all([...(e.target.files ?? [])].map(loadImage));
                  setPhotos((o) => ({ ...o, [reel.id]: [...(o[reel.id] ?? []), ...add] }));
                }}
              />
            </label>
            {ph.length > 0 && (
              <button className="tbtn" onClick={() => setPhotos((o) => ({ ...o, [reel.id]: [] }))}>
                Retirer
              </button>
            )}
          </div>

          <h3>Export</h3>
          <div className="wb-actions">
            <button className="tbtn solid" disabled={!!busy || !ready} onClick={() => make(reel.id)}>
              {busy === reel.id ? `Calcul… ${Math.round(progress * 100)} %` : 'Générer le MP4'}
            </button>
            {outs[reel.id] && (
              <a className="tbtn" href={outs[reel.id]} download={`UNE-AUTRE_reel-${reel.id}.mp4`}>
                Télécharger
              </a>
            )}
          </div>
          <div className="wb-actions">
            <button className="tbtn" onClick={resetThis}>
              Réinitialiser ce reel
            </button>
            <button className="tbtn" onClick={copyToOthers}>
              Copier vers les autres reels
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
