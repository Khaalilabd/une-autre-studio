import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { useEffect, useRef, useState } from 'react';
import { ringLayout } from '../graphics/ringLogo';
import { useStudio } from '../state/store';

/* WebCodecs audio types are missing from this TS lib version. */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const AudioEncoder: any;
declare const AudioData: any;

/**
 * Teaser vidéo — the Tunnel poster (PL.52) as a 15 s clip with no text over it:
 * the ring lights up, the tunnel starts to breathe, dives on the beat (120 BPM),
 * strobes into a drop, cuts to black, then a single ring stays and only its
 * "?" is left glowing. Drawn frame by frame on a canvas and encoded to MP4
 * (H.264 + AAC from the project ambience track) with WebCodecs — no realtime
 * capture, so every frame is exact.
 */

export const TEASER_FORMATS = {
  story: { w: 1080, h: 1920, label: 'Story / Reel 9:16' },
  post: { w: 1080, h: 1350, label: 'Post 4:5' },
  carre: { w: 1080, h: 1080, label: 'Carré 1:1' },
} as const;
type Fmt = keyof typeof TEASER_FORMATS;

const DUR = 15;
const FPS = 30;
const BEAT = 0.5; // 120 BPM
const K = 0.58; // ring-to-ring scale, as in the poster

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const hexRgb = (h: string) => {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
/** cheap deterministic flicker (neon ignition) */
const flick = (t: number, seed: number) => (Math.sin(t * 91 + seed * 13) * Math.sin(t * 37 + seed) > -0.15 ? 1 : 0.25);

/** depth travelled into the tunnel, in rings */
function depth(t: number) {
  if (t < 1.5) return 0;
  if (t < 4) return 0.15 * (t - 1.5) * (t - 1.5);
  const p4 = 0.15 * 2.5 * 2.5;
  if (t < 10) {
    const b = (t - 4) / BEAT;
    return p4 + Math.floor(b) * 0.5 + 0.5 * easeOut(b % 1);
  }
  const p10 = p4 + 6;
  const u = Math.min(t, 12.5) - 10;
  return p10 + 2 * u + 1.6 * u * u;
}

type Layout = ReturnType<typeof ringLayout>;

export function drawRing(ctx: CanvasRenderingContext2D, lay: Layout, R: number, color: number[], alpha: number, width: number, onlyQ = 0) {
  const cap = R * 0.46;
  ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    ctx.lineWidth = pass ? width : width * 3.2;
    for (const g of lay.glyphs) {
      const a = alpha * (onlyQ && g.ch !== '?' ? 1 - onlyQ : 1) * (pass ? 1 : 0.22);
      if (a <= 0.003) continue;
      ctx.strokeStyle = rgba(color, a);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate((g.rot * Math.PI) / 180);
      ctx.font = `700 ${g.size}px Fredoka`;
      ctx.strokeText(g.ch, 0, g.size * 0.35);
      ctx.restore();
    }
    const da = alpha * (1 - onlyQ) * (pass ? 1 : 0.22);
    if (da > 0.003) {
      ctx.strokeStyle = rgba(color, da);
      ctx.beginPath();
      ctx.arc(-R, -R * 0.2, cap * 0.16, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** One frame of the teaser at time t (seconds). */
export function drawTeaser(ctx: CanvasRenderingContext2D, t: number, W: number, H: number, brand: string, accent: string) {
  const R = Math.min(W, H) * 0.34;
  const lay = ringLayout(brand, R, R * 0.46);
  const col = hexRgb(accent);
  const white = [255, 240, 240];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const beatPhase = t >= 4 && t < 12.5 ? ((t - 4) / BEAT) % 1 : 1;
  const pulse = t >= 4 && t < 12.5 ? Math.exp(-beatPhase * 5) : 0;

  if (t < 12.5) {
    // the tunnel
    const p = depth(t);
    const j0 = Math.floor(p) - 2;
    ctx.save();
    // a little camera shake on the drop
    const shake = t > 10 ? (t - 10) * 3 : 0;
    ctx.translate(W / 2 + Math.sin(t * 53) * shake, H / 2 + Math.cos(t * 47) * shake);
    for (let j = j0 + 14; j >= j0; j--) {
      const s = Math.pow(K, j - p);
      if (s > 6 || s < 0.004) continue;
      // rings light up one after another at the start, from the centre outwards
      const ign = t < 2.4 ? clamp((t - 0.3 - Math.max(0, j) * 0.2) / 0.4) * flick(t, j) : 1;
      const far = clamp(1 - Math.log(1 / s) / Math.log(1 / Math.pow(K, 9)));
      const near = s > 2.2 ? clamp(1 - (s - 2.2) / 2.5) : 1;
      const alpha = ign * near * (0.18 + 0.82 * far) * (1 + pulse * 0.6);
      if (alpha <= 0.01) continue;
      const rot = (j % 2 ? 14 : 0) + (t > 4 ? (j % 2 ? 1 : -1) * (t - 4) * 4 : 0);
      ctx.save();
      ctx.scale(s, s);
      ctx.rotate((rot * Math.PI) / 180);
      const c = pulse > 0.5 && j === Math.round(p) ? white : col;
      drawRing(ctx, lay, R, c, Math.min(1, alpha), (R * 0.022 * (1 + pulse * 0.4)) / Math.max(0.35, s));
      ctx.restore();
    }
    ctx.restore();
    // strobe on the drop
    if (t > 10 && t < 12.5) {
      const b = ((t - 10) / (BEAT / 2)) % 1;
      const f = Math.exp(-b * 9) * 0.55;
      ctx.fillStyle = `rgba(255,255,255,${f})`;
      ctx.fillRect(0, 0, W, H);
    }
  } else if (t >= 12.65) {
    // the cut: one ring alone, then only its "?" stays
    const u = t - 12.65;
    const on = clamp(u / 0.35) * (u < 0.6 ? flick(t, 3) : 1);
    const onlyQ = clamp((t - 13.6) / 0.9);
    const fadeOut = 1 - clamp((t - 14.6) / 0.4);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(((u * 10) * Math.PI) / 180);
    drawRing(ctx, lay, R, col, on * fadeOut, R * 0.026, onlyQ);
    ctx.restore();
  }

  // vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Render any canvas animation to an MP4 blob (H.264, + AAC ambience if available). */
export async function renderClip(opts: { W: number; H: number; dur: number; audio: boolean; draw: (ctx: CanvasRenderingContext2D, t: number) => void; onProgress?: (p: number) => void }) {
  const { W, H } = opts;
  const DUR = opts.dur;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await document.fonts.load('700 100px Fredoka');

  // audio: the project ambience, first 15 s with a fade-out
  let audioBuf: AudioBuffer | null = null;
  let aacOk = false;
  if (opts.audio && 'AudioEncoder' in window) {
    try {
      const raw = await (await fetch('/audio/une-autre-ambiance.mp3')).arrayBuffer();
      const ac = new OfflineAudioContext(2, 48000 * DUR, 48000);
      audioBuf = await ac.decodeAudioData(raw);
      aacOk = (await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 })).supported ?? false;
    } catch {
      audioBuf = null;
    }
  }

  const vcfgs = ['avc1.640028', 'avc1.4d0028', 'avc1.42002a'].map((codec) => ({ codec, width: W, height: H, bitrate: 10_000_000, framerate: FPS }));
  let vcfg: VideoEncoderConfig | null = null;
  for (const c of vcfgs) {
    if ((await VideoEncoder.isConfigSupported(c)).supported) {
      vcfg = c;
      break;
    }
  }
  if (!vcfg) throw new Error('Encodeur H.264 indisponible dans ce navigateur');

  const withAudio = !!(audioBuf && aacOk);
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H, frameRate: FPS },
    ...(withAudio ? { audio: { codec: 'aac' as const, sampleRate: 48000, numberOfChannels: 2 } } : {}),
    fastStart: 'in-memory',
  });
  const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => console.error(e) });
  venc.configure(vcfg);

  const N = DUR * FPS;
  for (let i = 0; i < N; i++) {
    opts.draw(ctx, i / FPS);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    if (venc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
    if (i % 10 === 0) opts.onProgress?.(i / N);
  }
  await venc.flush();

  if (withAudio && audioBuf) {
    const aenc = new AudioEncoder({ output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta), error: (e: unknown) => console.error(e) });
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
    const SR = 48000;
    const total = Math.min(audioBuf.length, SR * DUR);
    const chans = [0, 1].map((c) => audioBuf!.getChannelData(Math.min(c, audioBuf!.numberOfChannels - 1)));
    const step = 1024;
    for (let s = 0; s < total; s += step) {
      const n = Math.min(step, total - s);
      const data = new Float32Array(n * 2);
      for (let c = 0; c < 2; c++)
        for (let k = 0; k < n; k++) {
          const tt = (s + k) / SR;
          const fade = Math.min(1, tt / 0.5) * Math.min(1, (DUR - tt) / 1.2);
          data[c * n + k] = chans[c][s + k] * Math.max(0, fade);
        }
      const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((s * 1e6) / SR), data });
      aenc.encode(ad);
      ad.close();
    }
    await aenc.flush();
  }
  muxer.finalize();
  opts.onProgress?.(1);
  return { blob: new Blob([(muxer.target as ArrayBufferTarget).buffer], { type: 'video/mp4' }), withAudio, size: `${W}×${H}` };
}

/** The Tunnel teaser clip. */
export function renderTeaser(opts: { fmt: Fmt; brand: string; accent: string; audio: boolean; onProgress?: (p: number) => void }) {
  const { w: W, h: H } = TEASER_FORMATS[opts.fmt];
  return renderClip({ W, H, dur: DUR, audio: opts.audio, onProgress: opts.onProgress, draw: (ctx, t) => drawTeaser(ctx, t, W, H, opts.brand, opts.accent) });
}

/* ======================================================================= */

const COLORS: [string, string][] = [
  ['#ff1f1f', 'Rouge (affiche)'],
  ['#1636d8', 'Bleu édition 01'],
  ['#ff9c9c', 'Néon rose'],
  ['#f2f5ff', 'Argent'],
];

export function Teaser() {
  const { content } = useStudio();
  const [fmt, setFmt] = useState<Fmt>(((/[?&]fmt=(story|post|carre)/.exec(location.hash)?.[1]) as Fmt) ?? 'story');
  const [accent, setAccent] = useState('#ff1f1f');
  const [audio, setAudio] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [out, setOut] = useState<{ url: string; withAudio: boolean; size: string } | null>(null);
  const [err, setErr] = useState('');
  const cv = useRef<HTMLCanvasElement>(null);
  const { w: W, h: H } = TEASER_FORMATS[fmt];

  // live preview, looping
  useEffect(() => {
    const c = cv.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const t0 = performance.now();
    // #/teaser?still=<seconds> freezes the preview on one frame (checks)
    const still = Number(/[?&]still=([\d.]+)/.exec(location.hash)?.[1] ?? NaN);
    const loop = () => {
      const t = Number.isFinite(still) ? still : ((performance.now() - t0) / 1000) % DUR;
      drawTeaser(ctx, t, W, H, content.brand, accent);
      raf = requestAnimationFrame(loop);
    };
    document.fonts.load('700 100px Fredoka').then(() => (raf = requestAnimationFrame(loop)));
    return () => cancelAnimationFrame(raf);
  }, [W, H, accent, content.brand]);

  const make = async () => {
    setBusy(true);
    setErr('');
    setProgress(0);
    try {
      const r = await renderTeaser({ fmt, brand: content.brand, accent, audio, onProgress: setProgress });
      if (out) URL.revokeObjectURL(out.url);
      setOut({ url: URL.createObjectURL(r.blob), withAudio: r.withAudio, size: r.size });
      // headless export hook: #/teaser?upload=<port>
      const port = /[?&]upload=(\d+)/.exec(location.hash)?.[1];
      if (port) await fetch(`http://127.0.0.1:${port}/UNE-AUTRE_teaser-tunnel_${fmt}.mp4`, { method: 'POST', body: r.blob });
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (/[?&]auto=1/.test(location.hash)) void make();
    // run once on mount for the headless export
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="table-view bracelets teaser">
      <section className="series">
        <header className="series-head">
          <p className="series-kicker">Teaser vidéo · PL.52 Tunnel · 15 s · 0 texte</p>
          <h2>Le tunnel, en teaser</h2>
          <p>
            Aucune info, aucun texte : seulement le logo. Il s’allume anneau par anneau, le tunnel respire puis plonge sur le tempo (120 BPM), part en strobe sur le drop, coupe au noir — et il ne reste qu’un anneau, puis son « ? ». La vidéo est calculée image par image et téléchargée en MP4, prête pour Instagram et WhatsApp.
          </p>
        </header>
        <div className="wb-studio">
          <div className="wb-stage tz-stage">
            <canvas ref={cv} width={W} height={H} className={`tz-canvas ${fmt}`} />
            {out && (
              <div className="tz-out">
                <video src={out.url} controls playsInline loop className={fmt} />
                <a className="tbtn solid" href={out.url} download={`UNE-AUTRE_teaser-tunnel_${fmt}.mp4`}>
                  Télécharger le MP4
                </a>
                <p>
                  {out.size} · 30 i/s · H.264 {out.withAudio ? '+ son (ambiance du projet)' : '· sans son'}
                </p>
              </div>
            )}
          </div>
          <aside className="live-controls wb-controls">
            <section>
              <h4>Format</h4>
              <div className="lc-choice stk-shapes">
                {(Object.keys(TEASER_FORMATS) as Fmt[]).map((k) => (
                  <button key={k} className={k === fmt ? 'on' : ''} onClick={() => setFmt(k)}>
                    {TEASER_FORMATS[k].label}
                    <small>
                      {TEASER_FORMATS[k].w} × {TEASER_FORMATS[k].h}
                    </small>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h4>Couleur du néon</h4>
              <div className="lc-choice">
                {COLORS.map(([c, l]) => (
                  <button key={c} className={c === accent ? 'on' : ''} onClick={() => setAccent(c)}>
                    <i className="tee-swatch" style={{ background: c }} />
                    {l}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h4>Son</h4>
              <label className="lc-row">
                <span>Musique</span>
                <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} />
                <code>ambiance du projet</code>
              </label>
            </section>
            <section>
              <h4>Le déroulé</h4>
              <dl className="wb-spec">
                {[
                  ['0 – 1,5 s', 'Noir, les anneaux s’allument en grésillant'],
                  ['1,5 – 4 s', 'Le tunnel se met à bouger'],
                  ['4 – 10 s', 'Plongée sur chaque temps, pulsation'],
                  ['10 – 12,5 s', 'Le drop : accélération et strobe'],
                  ['12,5 – 15 s', 'Coupure, un seul anneau, puis le « ? »'],
                ].map(([a, b]) => (
                  <div key={a}>
                    <dt>{a}</dt>
                    <dd>{b}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section>
              <button className="tbtn solid" disabled={busy} onClick={make}>
                {busy ? `Calcul… ${Math.round(progress * 100)} %` : 'Générer la vidéo MP4'}
              </button>
              {err && <p className="wb-idea">{err}</p>}
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
