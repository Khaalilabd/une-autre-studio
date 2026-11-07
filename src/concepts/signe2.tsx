/**
 * « Le signe », suite — 45–49. Five more matters for the "?" of the name:
 * projected light, ice, soap bubble, folded paper, foil balloon. Same rules:
 * one hue, the sign as hero, a layout of its own, a slow clean loop.
 */
import { useMemo, type FC, type ReactNode } from 'react';
import type { ConceptDef, PosterProps, Tone } from '../data/types';
import { useUid } from '../graphics/common';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { fitMeasured } from '../lib/measure';
import type { Pt } from '../lib/pathSample';
import { f1, rng } from '../lib/rng';
import { Brand, makeLogo, Mono, type WordStyle } from './regard';
import { mix } from './scene';
import { names, numDate, sans, sign, SignShape, signStyle, type Sign } from './signe';

const W = 1000;
const dims = (format: string) => ({ sq: format === 'square', H: format === 'square' ? 1000 : 1500 });
const noSymbol = <T extends { titleLayout: string }>(s: T): T => (s.titleLayout === 'symbol' ? { ...s, titleLayout: 'line' } : s);

/** Ring of the sign (outline only), for rims and edges. */
function RimMask({ id, g, H, inset, dx = 0, dy = 0 }: { id: string; g: Sign; H: number; inset: number; dx?: number; dy?: number }) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
      <SignShape g={g} color="#ffffff" />
      <g transform={`translate(${f1(dx)} ${f1(dy)})`}>
        <SignShape g={g} color="#000000" extra={-inset} />
      </g>
    </mask>
  );
}

function ShapeMask({ id, g, H }: { id: string; g: Sign; H: number }) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
      <SignShape g={g} color="#ffffff" />
    </mask>
  );
}

function Blur({ sd, children, opacity, transform }: { sd: number; children: ReactNode; opacity?: number; transform?: string }) {
  const id = useUid('b2');
  return (
    <g opacity={opacity} transform={transform}>
      <defs>
        <filter id={id} filterUnits="userSpaceOnUse" x={-300} y={-300} width={1600} height={2100}>
          <feGaussianBlur stdDeviation={sd} />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>{children}</g>
    </g>
  );
}

/* ======================================================================= */
/* 45 — GOBO : the sign projected on a wall, the beam sweeping              */
/* ======================================================================= */

function Gobo({ g, light, on }: { g: Sign; light: string; on: boolean }) {
  const id = useUid('gb');
  const ax = W / 2;
  const ay = -220;
  const { x0, x1, y0, y1 } = g.box;
  const dust = useMemo(() => {
    const r = rng(45);
    return Array.from({ length: 80 }, () => {
      const t = r();
      const y = ay + (y1 - ay) * (0.25 + 0.75 * t);
      const half = ((x1 - x0) / 2 + 40) * ((y - ay) / (y1 - ay));
      return { x: ax + (r() * 2 - 1) * half, y, r: 0.8 + r() * 2.4, d: 6 + r() * 8, b: r() * 8 };
    });
  }, [x0, x1, y1]);
  return (
    <g>
      <defs>
        <linearGradient id={id + 'b'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} stopOpacity={0.02} />
          <stop offset="1" stopColor={light} stopOpacity={0.2} />
        </linearGradient>
      </defs>
      <g>
        {on && <animateTransform attributeName="transform" type="rotate" values={`0 ${ax} ${ay};7 ${ax} ${ay};0 ${ax} ${ay};-7 ${ax} ${ay};0 ${ax} ${ay}`} keyTimes="0;0.25;0.5;0.75;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1" dur="16s" repeatCount="indefinite" />}
        <Blur sd={70} opacity={0.35}>
          <SignShape g={g} color={light} extra={g.w * 0.9} />
        </Blur>
        <Blur sd={26}>
          <path d={`M${ax} ${ay}L${f1(x1 + 30)} ${f1(y0)}L${f1(x1 + 40)} ${f1(y1)}L${f1(x0 - 40)} ${f1(y1)}L${f1(x0 - 30)} ${f1(y0)}Z`} fill={`url(#${id}b)`} />
        </Blur>
        <Blur sd={5}>
          <SignShape g={g} color={mix(light, '#ffffff', 0.15)} />
        </Blur>
        <Blur sd={12} opacity={0.8}>
          <SignShape g={g} color="#ffffff" extra={-g.w * 0.45} />
        </Blur>
        <g fill={mix(light, '#ffffff', 0.5)}>
          {dust.map((d, i) => (
            <circle key={i} cx={f1(d.x)} cy={f1(d.y)} r={f1(d.r)} opacity={0.6}>
              {on && <animate attributeName="cy" values={`${f1(d.y)};${f1(d.y - 60)};${f1(d.y)}`} dur={`${f1(d.d)}s`} begin={`${f1(-d.b)}s`} repeatCount="indefinite" />}
              {on && <animate attributeName="opacity" values="0.1;0.8;0.1" dur={`${f1(d.d * 0.6)}s`} begin={`${f1(-d.b)}s`} repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
      </g>
    </g>
  );
}

function GoboPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const { sq, H } = dims(format);
  const bg = colors.background === 'paper' ? '#14161c' : colors.background === 'accent' ? mix(settings.accent, '#000000', 0.82) : '#07080b';
  const fg = '#eef4f8';
  const g = useMemo(() => sign(W / 2, sq ? 430 : 600, (sq ? 520 : 720) * settings.logoScale, 0.16), [sq, settings.logoScale]);
  const M = sq ? 50 : 64;
  const ns = names(content);
  const ly = H - (sq ? 230 : 330);
  return (
    <Artboard format={format} colors={{ ...colors, background: 'dark', bg }} texture={settings.texture} label={`${content.brand} — gobo`}>
      <Gobo g={g} light={settings.accent} on={animated} />
      <Mono x={M} y={sq ? 56 : 72} size={sq ? 12 : 14} fill={fg} opacity={0.8}>
        CUE {content.editionNumber} · GOBO « ? » · 100 %
      </Mono>
      <Brand st={signStyle} content={content} settings={noSymbol(settings)} tone={{ fg, accent: settings.accent }} x={W - M - 300} y={sq ? 36 : 50} maxW={300} maxH={sq ? 34 : 42} anchor="start" />
      {ns.map((n, i) => (
        <g key={i}>{sans(M, ly + i * (sq ? 50 : 66), n, sq ? 44 : 60, fg, { maxW: 600, spacing: -0.02 })}</g>
      ))}
      <line x1={W - M - 260} x2={W - M - 260} y1={ly - (sq ? 36 : 50)} y2={ly + (sq ? 110 : 150)} stroke={settings.accent} strokeOpacity={0.7} />
      {[numDate(content.date), content.hours, content.venue].map((t, i) => (
        <g key={i}>{sans(W - M - 240, ly + i * (sq ? 40 : 54), t, sq ? 20 : 26, fg, { weight: 500, maxW: 240 })}</g>
      ))}
      <Mono x={M} y={H - (sq ? 36 : 52)} size={sq ? 11 : 13} fill={fg} opacity={0.6}>
        {content.edition} · {content.pillars}
      </Mono>
    </Artboard>
  );
}

/* ======================================================================= */
/* 46 — GLAÇON : the sign carved in ice, melting drop by drop              */
/* ======================================================================= */

function Ice({ g, H, tint, bg, on }: { g: Sign; H: number; tint: string; bg: string; on: boolean }) {
  const id = useUid('ic');
  const cracks = useMemo(() => {
    const r = rng(46);
    return Array.from({ length: 12 }, () => {
      const p = g.pts[Math.floor(r() * g.pts.length)];
      const a = r() * Math.PI * 2;
      const l = g.w * (0.2 + r() * 0.35);
      const m: Pt = [p[0] + Math.cos(a) * l * 0.5 + (r() - 0.5) * 12, p[1] + Math.sin(a) * l * 0.5 + (r() - 0.5) * 12];
      return `M${f1(p[0] - Math.cos(a) * l * 0.3)} ${f1(p[1] - Math.sin(a) * l * 0.3)}L${f1(m[0])} ${f1(m[1])}L${f1(p[0] + Math.cos(a + 0.4) * l)} ${f1(p[1] + Math.sin(a + 0.4) * l)}`;
    });
  }, [g]);
  const bubbles = useMemo(() => {
    const r = rng(47);
    return Array.from({ length: 26 }, () => {
      const p = g.pts[Math.floor(r() * g.pts.length)];
      return { x: p[0] + (r() - 0.5) * g.w * 0.6, y: p[1] + (r() - 0.5) * g.w * 0.6, r: 1.5 + r() * 4 };
    });
  }, [g]);
  const drops = [0, 1, 2];
  return (
    <g>
      <defs>
        <ShapeMask id={id + 'm'} g={g} H={H} />
        <RimMask id={id + 'r'} g={g} H={H} inset={g.w * 0.12} dx={g.w * 0.04} dy={g.w * 0.05} />
        <filter id={id + 'f'} filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={46}>
            {on && <animate attributeName="baseFrequency" values="0.035;0.042;0.035" dur="7s" repeatCount="indefinite" />}
          </feTurbulence>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1.6 0 0 0 -0.55" />
        </filter>
      </defs>
      <Blur sd={30} opacity={0.5} transform={`translate(${f1(g.w * 0.3)} ${f1(g.w * 0.4)})`}>
        <SignShape g={g} color={mix(bg, '#000000', 0.5)} />
      </Blur>
      <SignShape g={g} color={mix(tint, '#ffffff', 0.55)} />
      <g mask={`url(#${id}m)`}>
        <rect width={W} height={H} fill={mix(tint, '#ffffff', 0.2)} opacity={0.35} />
        <Blur sd={16} opacity={0.75}>
          <SignShape g={g} color="#ffffff" extra={-g.w * 0.4} />
        </Blur>
        <rect width={W} height={H} filter={`url(#${id}f)`} opacity={0.5} />
        <g fill="none" stroke="#ffffff" strokeWidth={1.6} strokeOpacity={0.8} strokeLinecap="round">
          {cracks.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g fill="#ffffff" fillOpacity={0.7}>
          {bubbles.map((b, i) => (
            <circle key={i} cx={f1(b.x)} cy={f1(b.y)} r={f1(b.r)} />
          ))}
        </g>
        <path d={g.hook} transform={`translate(${f1(-g.w * 0.22)} ${f1(-g.w * 0.2)})`} fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={g.w * 0.07} strokeLinecap="round" />
      </g>
      <g mask={`url(#${id}r)`}>
        <rect width={W} height={H} fill="#ffffff" opacity={0.9} />
      </g>
      {drops.map((k) => {
        const x = g.dot[0] + (k - 1) * g.w * 0.22;
        const y = g.base - 4;
        return (
          <g key={k}>
            <ellipse cx={x} cy={y} rx={7} ry={10} fill={mix(tint, '#ffffff', 0.5)} opacity={k === 1 ? 0.9 : 0}>
              {on && (
                <>
                  <animate attributeName="cy" values={`${y};${y};${H + 30}`} keyTimes="0;0.6;1" calcMode="spline" keySplines="0 0 1 1;0.6 0 1 1" dur={`${3 + k}s`} begin={`${-k * 1.3}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.9;0.9" keyTimes="0;0.3;1" dur={`${3 + k}s`} begin={`${-k * 1.3}s`} repeatCount="indefinite" />
                </>
              )}
            </ellipse>
          </g>
        );
      })}
    </g>
  );
}

function Condensation({ H, tint, n = 60 }: { H: number; tint: string; n?: number }) {
  const drops = useMemo(() => {
    const r = rng(460);
    return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, r: 1.5 + r() * r() * 7 }));
  }, [H, n]);
  return (
    <g>
      {drops.map((d, i) => (
        <g key={i}>
          <circle cx={f1(d.x)} cy={f1(d.y)} r={f1(d.r)} fill={mix(tint, '#ffffff', 0.3)} opacity={0.22} />
          <circle cx={f1(d.x - d.r * 0.3)} cy={f1(d.y - d.r * 0.3)} r={f1(d.r * 0.3)} fill="#ffffff" opacity={0.5} />
        </g>
      ))}
    </g>
  );
}

function GlaconPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const { sq, H } = dims(format);
  const bg = colors.background === 'paper' ? colors.paper : colors.background === 'dark' ? '#03161a' : settings.accent;
  const tint = colors.background === 'accent' ? mix(settings.accent, '#ffffff', 0.45) : settings.accent;
  const fg = colors.background === 'paper' ? colors.ink : '#f0fbfc';
  const g = useMemo(() => sign(W / 2, sq ? 400 : 560, (sq ? 500 : 700) * settings.logoScale, 0.19), [sq, settings.logoScale]);
  const M = sq ? 120 : 140;
  const ns = names(content);
  const y0 = H - (sq ? 250 : 360);
  const row = (i: number, k: string, v: string) => {
    const y = y0 + (ns.length ? 0 : 0) + i * (sq ? 34 : 44);
    return (
      <g key={k}>
        <Mono x={M} y={y} size={sq ? 13 : 16} fill={fg} spacing={0.14}>
          {k}
        </Mono>
        <line x1={M + (sq ? 120 : 150)} x2={W - M - (sq ? 250 : 300)} y1={y - 4} y2={y - 4} stroke={fg} strokeOpacity={0.5} strokeDasharray="1 7" strokeLinecap="round" strokeWidth={2} />
        <Mono x={W - M} y={y} size={sq ? 13 : 16} fill={fg} anchor="end" spacing={0.08}>
          {v}
        </Mono>
      </g>
    );
  };
  return (
    <Artboard format={format} colors={{ ...colors, bg }} texture={settings.texture * 0.5} label={`${content.brand} — glaçon`}>
      <Condensation H={H} tint={tint} />
      <Ice g={g} H={H} tint={tint} bg={bg} on={animated} />
      <Brand st={signStyle} content={content} settings={noSymbol(settings)} tone={{ fg, accent: fg }} x={W / 2} y={sq ? 40 : 60} maxW={360} maxH={sq ? 40 : 52} />
      <Mono x={W / 2} y={sq ? 110 : 140} size={sq ? 11 : 13} fill={fg} anchor="middle" spacing={0.3} opacity={0.75}>
        SERVI FRAPPÉ · −4 °C
      </Mono>
      <g textAnchor="middle">
        {sans(W / 2, y0 - (sq ? 60 : 84), ns.join(' · '), sq ? 30 : 40, fg, { anchor: 'middle', maxW: W - 160 })}
      </g>
      {row(0, 'DATE', numDate(content.date))}
      {row(1, 'HORAIRES', content.hours)}
      {row(2, 'LIEU', content.venue)}
      {row(3, 'ÉDITION', content.edition)}
    </Artboard>
  );
}

/* ======================================================================= */
/* 47 — BULLE : an iridescent soap-bubble sign, floating                    */
/* ======================================================================= */

const FILM = ['#ff8fd8', '#7fe8ff', '#fff3a0', '#b48cff', '#7fffc4', '#ff8fd8'];

function Bubble({ g, H, on }: { g: Sign; H: number; on: boolean }) {
  const id = useUid('bu');
  const cx = (g.box.x0 + g.box.x1) / 2;
  const cy = (g.box.y0 + g.box.y1) / 2;
  const small = useMemo(() => {
    const r = rng(470);
    return Array.from({ length: 9 }, () => ({ x: 80 + r() * 840, r: 10 + r() * 34, d: 9 + r() * 8, b: r() * 12 }));
  }, []);
  const grad = (gid: string) => (
    <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={g.box.x0} y1={g.box.y0} x2={g.box.x1} y2={g.box.y1}>
      {FILM.map((c, i) => (
        <stop key={i} offset={i / (FILM.length - 1)} stopColor={c} />
      ))}
      {on && <animateTransform attributeName="gradientTransform" type="rotate" values={`0 ${f1(cx)} ${f1(cy)};360 ${f1(cx)} ${f1(cy)}`} dur="10s" repeatCount="indefinite" />}
    </linearGradient>
  );
  return (
    <g>
      <defs>
        {grad(id + 'g')}
        <RimMask id={id + 'r'} g={g} H={H} inset={g.w * 0.22} />
        <RimMask id={id + 'h'} g={g} H={H} inset={g.w * 0.1} dx={g.w * 0.06} dy={g.w * 0.08} />
      </defs>
      <g>
        {on && <animateTransform attributeName="transform" type="translate" values="0 0;0 -26;0 0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="6s" repeatCount="indefinite" />}
        <SignShape g={g} color={`url(#${id}g)`} />
        <g opacity={0.82}>
          <SignShape g={g} color="#160626" extra={-g.w * 0.1} />
        </g>
        <g mask={`url(#${id}r)`}>
          <rect width={W} height={H} fill={`url(#${id}g)`} opacity={0.9} />
        </g>
        <g mask={`url(#${id}h)`}>
          <rect width={W} height={H} fill="#ffffff" opacity={0.55} />
        </g>
        <path d={g.hook} transform={`translate(${f1(-g.w * 0.18)} ${f1(-g.w * 0.16)})`} fill="none" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={g.w * 0.05} strokeLinecap="round" strokeDasharray={`${f1(g.w * 0.9)} ${f1(g.w * 3)}`} />
        <circle cx={g.dot[0] - g.w * 0.2} cy={g.dot[1] - g.w * 0.2} r={g.w * 0.1} fill="#ffffff" opacity={0.8} />
      </g>
      {small.map((b, i) => (
        <g key={i}>
          <circle cx={f1(b.x)} cy={f1(H * 0.2 + ((i * 137) % (H * 0.7)))} r={f1(b.r)} fill="none" stroke={`url(#${id}g)`} strokeWidth={2.5} opacity={0.8}>
            {on && <animate attributeName="cy" values={`${H + 60};-60`} dur={`${f1(b.d)}s`} begin={`${f1(-b.b)}s`} repeatCount="indefinite" />}
          </circle>
        </g>
      ))}
    </g>
  );
}

function BullePoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const { sq, H } = dims(format);
  const bg = colors.background === 'paper' ? '#efe7f4' : colors.background === 'accent' ? settings.accent : '#160626';
  const fg = colors.background === 'paper' ? '#1c0a2e' : '#f6efff';
  const g = useMemo(() => sign(sq ? 600 : 590, sq ? 520 : 780, (sq ? 500 : 720) * settings.logoScale, 0.2), [sq, settings.logoScale]);
  const M = sq ? 50 : 64;
  const ns = names(content);
  return (
    <Artboard format={format} colors={{ ...colors, background: colors.background === 'paper' ? 'paper' : 'dark', bg }} texture={settings.texture} label={`${content.brand} — bulle`}>
      <Bubble g={g} H={H} on={animated} />
      {ns.map((n, i) => (
        <g key={i}>{sans(M, (sq ? 90 : 120) + i * (sq ? 46 : 62), n, sq ? 38 : 52, fg, { maxW: 500, spacing: -0.02 })}</g>
      ))}
      {sans(M, H - (sq ? 130 : 176), numDate(content.date), sq ? 30 : 40, fg, { maxW: 360 })}
      {sans(M, H - (sq ? 96 : 130), content.hours, sq ? 20 : 26, fg, { weight: 500, maxW: 360 })}
      {sans(M, H - (sq ? 66 : 92), content.venue, sq ? 20 : 26, fg, { weight: 500, maxW: 360 })}
      <Brand st={signStyle} content={content} settings={noSymbol(settings)} tone={{ fg, accent: FILM[1] }} x={W - M - 280} y={H - (sq ? 92 : 124)} maxW={280} maxH={sq ? 36 : 46} anchor="start" />
    </Artboard>
  );
}

/* ======================================================================= */
/* 48 — ORIGAMI : the sign folded from a strip of paper                     */
/* ======================================================================= */

function folds(g: Sign, step: number) {
  const pts = g.pts.filter((_, i) => i % step === 0).concat([g.pts[g.pts.length - 1]]);
  const half = g.w / 2;
  const norm = (i: number): Pt => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const quads: { d: string; k: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const na = norm(i);
    const nb = norm(i + 1);
    // the strip twists at each fold: alternate which edge is wider
    const wa = i % 2 ? half * 0.82 : half;
    const wb = i % 2 ? half : half * 0.82;
    const d = `M${f1(ax + na[0] * wa)} ${f1(ay + na[1] * wa)}L${f1(bx + nb[0] * wb)} ${f1(by + nb[1] * wb)}L${f1(bx - nb[0] * wb)} ${f1(by - nb[1] * wb)}L${f1(ax - na[0] * wa)} ${f1(ay - na[1] * wa)}Z`;
    const ang = Math.atan2(by - ay, bx - ax);
    quads.push({ d, k: (Math.sin(ang * 2 + 0.6) + 1) / 2 });
  }
  return quads;
}

function Origami({ g, paper, shade, on }: { g: Sign; paper: string; shade: string; on: boolean }) {
  const quads = useMemo(() => folds(g, 7), [g]);
  const r = g.w * 0.66;
  const [dx, dy] = g.dot;
  const tri = (a: number) => `M${dx} ${dy}L${f1(dx + Math.cos(a) * r)} ${f1(dy + Math.sin(a) * r)}L${f1(dx + Math.cos(a + Math.PI / 2) * r)} ${f1(dy + Math.sin(a + Math.PI / 2) * r)}Z`;
  const tone = (k: number) => mix(paper, shade, 0.08 + k * 0.42);
  return (
    <g>
      <Blur sd={18} opacity={0.35} transform={`translate(${f1(g.w * 0.2)} ${f1(g.w * 0.28)})`}>
        {quads.map((q, i) => (
          <path key={i} d={q.d} fill="#000000" />
        ))}
        <path d={[0, 1, 2, 3].map((k) => tri(-Math.PI / 4 + (k * Math.PI) / 2)).join('')} fill="#000000" />
      </Blur>
      {quads.map((q, i) => (
        <path key={i} d={q.d} fill={tone(q.k)} stroke={mix(paper, shade, 0.55)} strokeWidth={1} strokeLinejoin="round">
          {on && <animate attributeName="fill" values={`${tone(q.k)};${tone(1 - q.k)};${tone(q.k)}`} dur="3.2s" begin={`${f1(-i * 0.16)}s`} repeatCount="indefinite" />}
        </path>
      ))}
      {[0, 1, 2, 3].map((k) => {
        const t = [0.1, 0.45, 0.25, 0.6][k];
        return (
          <path key={k} d={tri(-Math.PI / 4 + (k * Math.PI) / 2)} fill={tone(t)} stroke={mix(paper, shade, 0.55)} strokeWidth={1}>
            {on && <animate attributeName="fill" values={`${tone(t)};${tone(1 - t)};${tone(t)}`} dur="3.2s" begin={`${f1(-k * 0.4)}s`} repeatCount="indefinite" />}
          </path>
        );
      })}
    </g>
  );
}

function OrigamiPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const { sq, H } = dims(format);
  const bg = colors.background === 'paper' ? colors.paper : colors.background === 'dark' ? mix(settings.accent, '#000000', 0.75) : settings.accent;
  const fg = colors.background === 'paper' ? colors.ink : '#1d1306';
  const ink = colors.background === 'dark' ? '#fff6e6' : fg;
  const g = useMemo(() => sign(W / 2, sq ? 410 : 590, (sq ? 520 : 740) * settings.logoScale, 0.2), [sq, settings.logoScale]);
  const M = sq ? 50 : 64;
  const ns = names(content);
  const steps = [numDate(content.date), content.hours, content.venue];
  const colW = (W - M * 2) / 3;
  const sy = H - (sq ? 110 : 150);
  return (
    <Artboard format={format} colors={{ ...colors, bg }} texture={settings.texture} label={`${content.brand} — origami`}>
      <Origami g={g} paper="#fffaf0" shade={mix(bg, '#000000', 0.35)} on={animated} />
      <Brand st={signStyle} content={content} settings={noSymbol(settings)} tone={{ fg: ink, accent: ink }} x={M - 4} y={sq ? 40 : 56} maxW={340} maxH={sq ? 40 : 52} anchor="start" />
      <Mono x={W - M} y={sq ? 68 : 88} size={sq ? 12 : 14} fill={ink} anchor="end">
        PLIAGE N°{content.editionNumber}
      </Mono>
      {sans(W / 2, sy - (sq ? 110 : 150), ns.join(' · '), sq ? 30 : 40, ink, { anchor: 'middle', maxW: W - M * 2 })}
      <line x1={M} x2={W - M} y1={sy - (sq ? 70 : 92)} y2={sy - (sq ? 70 : 92)} stroke={ink} strokeDasharray="10 8" strokeOpacity={0.6} />
      {steps.map((t, i) => (
        <g key={i}>
          <circle cx={M + colW * i + 16} cy={sy - 8} r={16} fill="none" stroke={ink} strokeWidth={1.6} />
          <text x={M + colW * i + 16} y={sy - 2} textAnchor="middle" fontFamily={FONT.mono} fontSize={15} fill={ink}>
            {i + 1}
          </text>
          {sans(M + colW * i + 44, sy, t, sq ? 20 : 24, ink, { maxW: colW - 56 })}
        </g>
      ))}
      <Mono x={M} y={H - (sq ? 36 : 52)} size={sq ? 11 : 13} fill={ink} opacity={0.7}>
        {content.edition} · PLIER ICI, OUVRIR LÀ-BAS
      </Mono>
    </Artboard>
  );
}

/* ======================================================================= */
/* 49 — BALLON : a foil party balloon, floating on its string              */
/* ======================================================================= */

function Balloon({ g, H, tint, on }: { g: Sign; H: number; tint: string; on: boolean }) {
  const id = useUid('bl');
  const dark = mix('#5c5866', tint, 0.25);
  const mid = mix('#c9c6d0', tint, 0.2);
  const layers = 7;
  const crimps = useMemo(() => [0.18, 0.42, 0.66, 0.9].map((t) => {
    const i = Math.floor(t * (g.pts.length - 2));
    const [ax, ay] = g.pts[i];
    const [bx, by] = g.pts[i + 1];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / l;
    const ny = (bx - ax) / l;
    const h = g.w * 0.48;
    return `M${f1(ax + nx * h)} ${f1(ay + ny * h)}Q${f1(ax + (bx - ax) * 3)} ${f1(ay + (by - ay) * 3)} ${f1(ax - nx * h)} ${f1(ay - ny * h)}`;
  }), [g]);
  const sx = g.dot[0];
  const sy = g.base - 6;
  const string = (k: number) => `M${sx} ${sy}C${sx + 40 * k} ${sy + 120} ${sx - 50 * k} ${sy + 240} ${sx + 20 * k} ${H + 20}`;
  return (
    <g>
      <defs>
        <radialGradient id={id + 'd'} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
      </defs>
      <g>
        {on && <animateTransform attributeName="transform" type="translate" values="0 0;0 -34;0 0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="5s" repeatCount="indefinite" />}
        <path d={string(1)} fill="none" stroke={mix(tint, '#000000', 0.4)} strokeWidth={2.2}>
          {on && <animate attributeName="d" values={`${string(1)};${string(-1)};${string(1)}`} dur="5s" repeatCount="indefinite" />}
        </path>
        <g>
          {on && <animateTransform attributeName="transform" type="rotate" values={`-3 ${sx} ${sy};3 ${sx} ${sy};-3 ${sx} ${sy}`} dur="7s" repeatCount="indefinite" />}
          <Blur sd={30} opacity={0.35} transform={`translate(${f1(g.w * 0.25)} ${f1(g.w * 0.5)})`}>
            <SignShape g={g} color="#000000" />
          </Blur>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={g.hook} stroke={dark} strokeWidth={g.w * 1.04} />
            <path d={g.hook} stroke={mix(tint, '#ffffff', 0.2)} strokeWidth={g.w * 0.9} transform={`translate(${f1(g.w * 0.06)} ${f1(g.w * 0.08)})`} />
            {Array.from({ length: layers }, (_, k) => {
              const t = k / (layers - 1);
              return <path key={k} d={g.hook} stroke={mix(mid, '#ffffff', t * t)} strokeWidth={g.w * (0.92 - t * 0.72)} transform={`translate(${f1(-t * g.w * 0.12)} ${f1(-t * g.w * 0.15)})`} />;
            })}
            <path d={g.hook} stroke="#ffffff" strokeWidth={g.w * 0.06} transform={`translate(${f1(-g.w * 0.2)} ${f1(-g.w * 0.24)})`} />
            <path d={g.hook} stroke={dark} strokeOpacity={0.35} strokeWidth={1.5} />
            {crimps.map((d, i) => (
              <path key={i} d={d} stroke={dark} strokeOpacity={0.45} strokeWidth={2.5} />
            ))}
          </g>
          <circle cx={g.dot[0]} cy={g.dot[1]} r={g.w * 0.62} fill={`url(#${id}d)`} />
          <circle cx={g.dot[0] - g.w * 0.2} cy={g.dot[1] - g.w * 0.22} r={g.w * 0.1} fill="#ffffff" opacity={0.9} />
        </g>
      </g>
    </g>
  );
}

const inviteStyle: WordStyle = { css: FONT.gambetta, family: "'Gambetta'", weight: 500, italic: true, lower: true, tracking: -0.01 };

function BallonPoster({ content, settings, colors, format, animated = false }: PosterProps) {
  const { sq, H } = dims(format);
  const bg = colors.background === 'paper' ? colors.paper : colors.background === 'dark' ? mix(settings.accent, '#000000', 0.8) : settings.accent;
  const fg = colors.background === 'dark' ? '#ffeaf4' : '#3a0b22';
  const g = useMemo(() => sign(W / 2, sq ? 380 : 540, (sq ? 500 : 700) * settings.logoScale, 0.19), [sq, settings.logoScale]);
  const M = sq ? 50 : 64;
  const ns = names(content);
  const y0 = H - (sq ? 230 : 320);
  return (
    <Artboard format={format} colors={{ ...colors, bg }} texture={settings.texture} label={`${content.brand} — ballon`}>
      <Balloon g={g} H={H} tint={settings.accent} on={animated} />
      <Mono x={W / 2} y={sq ? 56 : 76} size={sq ? 12 : 14} fill={fg} anchor="middle" spacing={0.4}>
        VOUS ÊTES INVITÉS
      </Mono>
      <g>
        <rect x={M - 16} y={y0 - (sq ? 54 : 70)} width={W - (M - 16) * 2} height={sq ? 200 : 270} rx={24} fill={bg} opacity={0.85} />
        {ns.map((n, i) => (
          <text key={i} x={W / 2} y={y0 + i * (sq ? 44 : 58)} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={fitMeasured(n, W - M * 2 - 40, { family: "'General Sans'", size: sq ? 38 : 50, weight: 600 })} fill={fg}>
            {n}
          </text>
        ))}
        <Mono x={W / 2} y={y0 + ns.length * (sq ? 44 : 58) + (sq ? 6 : 10)} size={sq ? 13 : 16} fill={fg} anchor="middle" spacing={0.2}>
          {numDate(content.date)} · {content.hours} · {content.venue}
        </Mono>
      </g>
      <Brand st={inviteStyle} content={content} settings={noSymbol(settings)} tone={{ fg, accent: fg }} x={W / 2} y={H - (sq ? 70 : 100)} maxW={360} maxH={sq ? 44 : 56} />
    </Artboard>
  );
}

/* ======================================================================= */
/* symbols + definitions                                                   */
/* ======================================================================= */

const sym = (render: (g: Sign, tone: Tone) => JSX.Element): FC<{ tone: Tone }> =>
  function SignSymbol({ tone }) {
    const g = useMemo(() => sign(150, 140, 230, 0.18), []);
    return render(g, tone);
  };

const GoboSymbol = sym((g, t) => (
  <g>
    <rect width={300} height={300} fill="#07080b" />
    <Blur sd={4}>
      <SignShape g={g} color={t.accent} />
    </Blur>
  </g>
));
const IceSymbol = sym((g, t) => <Ice g={g} H={300} tint={t.accent} bg="#03161a" on={false} />);
const BubbleSymbol = sym((g) => <Bubble g={g} H={300} on={false} />);
const OrigamiSymbol = sym((g, t) => <Origami g={g} paper="#fffaf0" shade={mix(t.accent, '#000000', 0.35)} on={false} />);
const BalloonSymbol = sym((g, t) => <Balloon g={g} H={300} tint={t.accent} on={false} />);

const SERIES = 'signe';
const BASE = { paper: '#f4efe6', ink: '#0b0a09' };
const ANIM = 'Une seule couleur, un seul objet — et une animation lente, en boucle parfaite, où le texte ne bouge jamais.';
const typo = (note: string): ConceptDef['typography'] => [
  { role: 'Le signe', family: '« ? » du nom', css: FONT.sans, weight: 600, sample: '?', note: 'Le point d’interrogation de la marque est l’objet de chaque affiche.', custom: true },
  { role: 'Texte', family: 'General Sans', css: FONT.sans, weight: 600, sample: 'RAYHANE · FIRAS KOBBI', note },
  { role: 'Annotations', family: 'IBM Plex Mono', css: FONT.mono, weight: 500, sample: 'DATE · HORAIRES · LIEU', note: 'Petites capitales espacées.' },
];

export const gobo: ConceptDef = {
  id: 'gobo',
  index: '45',
  series: SERIES,
  name: 'Gobo',
  short: 'Le « ? » projeté en lumière',
  description: 'Le « ? » n’est pas un objet : c’est une lumière, projetée sur un mur noir par un projecteur de scène, avec son faisceau et sa poussière. Animée, le faisceau balaie lentement la salle.',
  rationale: [
    'Le gobo, c’est le pochoir qu’on glisse dans un projecteur : le signe de la marque devient littéralement l’éclairage de la soirée — et pourra l’être pour de vrai, dans la salle.',
    'Mise en page de feuille de conduite lumière (« CUE 01 · GOBO ? · 100 % »), DJ à gauche, infos dans une colonne à droite.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Noir salle', hex: '#07080b', role: 'Fond' },
    { name: 'Lumière froide', hex: '#7fd4ff', role: 'Le signe, le faisceau' },
    { name: 'Blanc', hex: '#eef4f8', role: 'Texte' },
  ],
  typography: typo('DJ en grand à gauche, colonne d’infos à droite.'),
  defaults: { accent: '#7fd4ff', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.3, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(signStyle, GoboSymbol),
  Poster: GoboPoster,
};

export const glacon: ConceptDef = {
  id: 'glacon',
  index: '46',
  series: SERIES,
  name: 'Glaçon',
  short: 'Le « ? » taillé dans la glace',
  description: 'Un « ? » en glace, fêlé, plein de bulles d’air, sur un turquoise glacé couvert de buée. Animée, il fond goutte à goutte et le givre scintille.',
  rationale: [
    'La fraîcheur d’une nuit d’été, et un clin d’œil au bar : le signe devient le glaçon du verre.',
    'Mise en page de carte de cocktails : une ligne pour chaque info, reliée par des pointillés (DATE ······ 12.07.2025).',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Turquoise glacé', hex: '#0fa3b1', role: 'Fond' },
    { name: 'Glace', hex: '#e6fbfd', role: 'Le signe' },
    { name: 'Blanc', hex: '#f0fbfc', role: 'Texte' },
  ],
  typography: typo('Carte de bar : lignes pointillées.'),
  defaults: { accent: '#0fa3b1', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(signStyle, IceSymbol),
  Poster: GlaconPoster,
};

export const bulle: ConceptDef = {
  id: 'bulle',
  index: '47',
  series: SERIES,
  name: 'Bulle',
  short: 'Le « ? » en bulle de savon',
  description: 'Un « ? » en bulle de savon irisée qui flotte sur un violet nuit, entouré de petites bulles. Animée, il monte et redescend doucement, et ses reflets changent de couleur sans arrêt.',
  rationale: [
    'Légère, éphémère, joyeuse : la bulle dit qu’une soirée ne se répète jamais deux fois pareille.',
    'Les DJ en haut à gauche, les infos en bas à gauche, la marque en bas à droite : le signe occupe la diagonale.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Violet nuit', hex: '#160626', role: 'Fond' },
    { name: 'Irisé', hex: '#7fe8ff', role: 'Reflets' },
    { name: 'Rose film', hex: '#ff8fd8', role: 'Reflets' },
  ],
  typography: typo('DJ en haut, infos en bas, en diagonale du signe.'),
  defaults: { accent: '#6b2bd9', background: 'dark', titleLayout: 'line', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(signStyle, BubbleSymbol),
  Poster: BullePoster,
};

export const origami: ConceptDef = {
  id: 'origami',
  index: '48',
  series: SERIES,
  name: 'Origami',
  short: 'Le « ? » plié dans une bande de papier',
  description: 'Un « ? » plié dans une bande de papier blanc, facette par facette, sur un safran plein. Animée, la lumière passe sur les plis comme une vague.',
  rationale: [
    'Le même papier, plié autrement, devient autre chose : l’idée de la marque, faite à la main.',
    'Mise en page de notice de pliage : étapes numérotées (① date ② horaires ③ lieu), ligne de pliage en pointillés.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Safran', hex: '#f2a900', role: 'Fond' },
    { name: 'Papier', hex: '#fffaf0', role: 'Le signe' },
    { name: 'Encre', hex: '#1d1306', role: 'Texte' },
  ],
  typography: typo('Notice de pliage : étapes numérotées.'),
  defaults: { accent: '#f2a900', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.25, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(signStyle, OrigamiSymbol),
  Poster: OrigamiPoster,
};

export const ballon: ConceptDef = {
  id: 'ballon',
  index: '49',
  series: SERIES,
  name: 'Ballon',
  short: 'Le « ? » en ballon de fête',
  description: 'Un « ? » en ballon métallique, comme les lettres gonflées des anniversaires, qui flotte au bout de sa ficelle sur un rose bonbon. Animé, il monte, se balance et sa ficelle ondule.',
  rationale: [
    'La fête au premier degré, avec élégance : un objet que tout le monde connaît, détourné en signe de la marque.',
    'Mise en page de carton d’invitation : « VOUS ÊTES INVITÉS » en haut, le line-up sur un cartouche, la marque en italique pour signer.',
    ANIM,
  ],
  base: BASE,
  palette: [
    { name: 'Rose bonbon', hex: '#ff6fae', role: 'Fond' },
    { name: 'Argent', hex: '#c9c6d0', role: 'Ballon' },
    { name: 'Framboise', hex: '#3a0b22', role: 'Texte' },
  ],
  typography: typo('Carton d’invitation, signature en italique.'),
  defaults: { accent: '#ff6fae', background: 'accent', titleLayout: 'line', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: makeLogo(inviteStyle, BalloonSymbol),
  Poster: BallonPoster,
};
