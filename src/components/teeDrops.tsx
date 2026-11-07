import type { ReactNode } from 'react';
import { RingLogo } from '../graphics/ringLogo';
import { FONT } from '../lib/fonts';
import { fitMeasured, measure } from '../lib/measure';
import type { Ink, TeeDesign } from './Crew';

/**
 * Drop 01 — five illustrated crew tees, built like streetwear drops: a small
 * mark on the chest, a full composition on the back. Each one tells a piece
 * of the concept (the night, the question, the recorded sets, Tunisian summer
 * nights, the live show). Print areas: front 280 × 340 mm, back 300 × 400 mm.
 */

const FW = 280;
const BW = 300;

const K = ({ k, w, h, children }: { k: number; w: number; h: number; children: ReactNode }) => (
  <g transform={`translate(${w / 2} ${h * 0.12}) scale(${k}) translate(${-w / 2} ${-h * 0.12})`}>{children}</g>
);

const mono = (x: number, y: number, t: string, size: number, fill: string, anchor: 'start' | 'middle' | 'end' = 'middle', track = 0.22) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={FONT.mono} fontWeight={500} fontSize={size} letterSpacing={size * track} fill={fill}>
    {t}
  </text>
);
const caps = (x: number, y: number, t: string, size: number, fill: string) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONT.serif} fontWeight={600} fontSize={size} letterSpacing={size * 0.32} fill={fill}>
    {t}
  </text>
);
const script = (x: number, y: number, t: string, size: number, fill: string, o: { rot?: number; knock?: string; maxW?: number } = {}) => {
  const fs = o.maxW ? fitMeasured(t, o.maxW, { family: "'Mrs Saint Delafield'", size, weight: 400 }) : size;
  return (
    <text x={x} y={y} textAnchor="middle" fontFamily={FONT.script} fontSize={fs} fill={fill} transform={o.rot ? `rotate(${o.rot} ${x} ${y})` : undefined} stroke={o.knock} strokeWidth={o.knock ? fs * 0.09 : undefined} paintOrder="stroke" strokeLinejoin="round">
      {t}
    </text>
  );
};
const star = (x: number, y: number, s: number) => `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;
const darken = (hex: string, k: number) => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
const lower = (brand: string) => brand.trim().toLowerCase();

/* ---------- 1 · disco ball, engraved in one ink ---------- */

function DiscoBall({ cx, cy, r, ink, step = 15, id, line = 0.7 }: { cx: number; cy: number; r: number; ink: string; step?: number; id: string; line?: number }) {
  const tilt = (22 * Math.PI) / 180;
  const L = [-0.45, 0.62, 0.64];
  const P = (lat: number, lon: number) => {
    const p = (lat * Math.PI) / 180;
    const t = (lon * Math.PI) / 180;
    const x = Math.cos(p) * Math.sin(t);
    const y = Math.sin(p);
    const z = Math.cos(p) * Math.cos(t);
    const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
    const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
    return { x, y: y2, z: z2 };
  };
  const quads: { d: string; b: number; z: number; c: { x: number; y: number } }[] = [];
  for (let lat = -90; lat < 90; lat += step) {
    for (let lon = -180; lon < 180; lon += step) {
      const pts = [P(lat, lon), P(lat, lon + step), P(lat + step, lon + step), P(lat + step, lon)];
      const m = P(lat + step / 2, lon + step / 2);
      if (m.z < -0.05) continue;
      const b = m.x * L[0] + m.y * L[1] + m.z * L[2];
      const d = pts.map((q, i) => `${i ? 'L' : 'M'}${(cx + r * q.x).toFixed(2)} ${(cy - r * q.y).toFixed(2)}`).join('') + 'Z';
      quads.push({ d, b, z: m.z, c: { x: cx + r * m.x, y: cy - r * m.y } });
    }
  }
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {quads.map((q, i) => (
          <path key={i} d={q.d} fill={q.b < 0.05 ? ink : q.b < 0.4 ? ink : 'none'} fillOpacity={q.b < 0.05 ? 1 : q.b < 0.4 ? 0.42 : 0} stroke={ink} strokeWidth={line} strokeLinejoin="round" />
        ))}
      </g>
      {quads
        .filter((q) => q.b > 0.9 && q.z > 0.3)
        .slice(0, 4)
        .map((q, i) => (
          <path key={i} d={star(q.c.x, q.c.y, r * 0.11)} fill={ink} />
        ))}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth={line * 2.2} />
    </g>
  );
}

const disco: TeeDesign = {
  id: 'disco',
  name: 'Boule à facettes',
  idea: 'Drop 01 · Une boule à facettes gravée à l’encre unique, « une autre ? » à la main par-dessus et les six couleurs musicales du concept en dessous. Le t-shirt de la première édition, dans son bleu.',
  shirt: '#f3f1ec',
  ink: '#1636d8',
  accent: '#0e1a52',
  Front: ({ content, ink, scale }) => (
    <K k={scale} w={FW} h={340}>
      <path d="M205 30V46" stroke={ink} strokeWidth={1} />
      <DiscoBall cx={205} cy={64} r={18} ink={ink} step={22.5} id="disco-f" line={0.6} />
      {script(205, 104, lower(content.brand), 24, ink)}
    </K>
  ),
  Back: ({ content, ink, accent, scale }) => (
    <K k={scale} w={BW} h={400}>
      {caps(150, 34, `ÉDITION ${content.editionNumber} — TUNISIE`, 12, accent)}
      <path d="M150 44V96" stroke={ink} strokeWidth={1.4} />
      <rect x={144} y={90} width={12} height={8} rx={1.5} fill={ink} />
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        const r0 = 102;
        const r1 = i % 3 === 0 ? 124 : i % 3 === 1 ? 112 : 108;
        return <path key={i} d={`M${150 + r0 * Math.cos(a)} ${188 + r0 * Math.sin(a)}L${150 + r1 * Math.cos(a)} ${188 + r1 * Math.sin(a)}`} stroke={ink} strokeWidth={i % 3 === 0 ? 1.6 : 1} strokeLinecap="round" />;
      })}
      <DiscoBall cx={150} cy={188} r={90} ink={ink} id="disco-b" />
      <path d={star(46, 92, 10)} fill={ink} />
      <path d={star(258, 262, 8)} fill={ink} />
      <path d={star(252, 104, 5)} fill={ink} />
      {script(150, 306, lower(content.brand), 86, ink, { rot: -6, knock: '#f3f1ec', maxW: 280 })}
      {mono(150, 342, 'HOUSE · AFRO HOUSE · DISCO HOUSE', 8.5, accent)}
      {mono(150, 357, 'INDIE DANCE · GROOVE · HOUSE DANCE', 8.5, accent)}
      <path d="M118 374H182" stroke={accent} strokeWidth={0.8} />
      {mono(150, 390, `${content.brand} · CREW`, 7.5, accent)}
    </K>
  ),
};

/* ---------- 2 · puffy "on en fait une autre ?" ---------- */

function Puffy({ text, x, y, size, fill, shade, knock, maxW, seed = 0 }: { text: string; x: number; y: number; size: number; fill: string; shade: string; knock: string; maxW: number; seed?: number }) {
  const font = { family: "'Bagel Fat One'", size, weight: 400 };
  let fs = size;
  const total = (s: number) => [...text].reduce((a, c) => a + measure(c, { ...font, size: s }) * 0.9, 0);
  while (total(fs) > maxW && fs > 10) fs -= 1;
  const rot = [-7, 5, -3, 8, -5, 4, -8, 3];
  const dy = [0, -5, 3, -2, 4, -4, 2, 0];
  let cur = x - total(fs) / 2;
  const glyphs = [...text].map((c, i) => {
    const w = measure(c, { ...font, size: fs }) * 0.9;
    const g = { c, x: cur + w / 2, y: y + dy[(i + seed) % dy.length] * (fs / 100), r: rot[(i + seed) % rot.length] };
    cur += w;
    return g;
  });
  const T = (g: (typeof glyphs)[0], dx: number, ddy: number, f: string, stroke?: string, sw = 0) => (
    <text x={g.x + dx} y={g.y + ddy} textAnchor="middle" fontFamily={FONT.puff} fontSize={fs} fill={f} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" paintOrder="stroke" transform={`rotate(${g.r} ${g.x} ${g.y - fs * 0.3})`}>
      {g.c}
    </text>
  );
  return (
    <g>
      {glyphs.map((g, i) => (
        <g key={i}>
          {T(g, fs * 0.035, fs * 0.05, shade, knock, fs * 0.07)}
          {T(g, 0, 0, fill)}
        </g>
      ))}
    </g>
  );
}

const puffy: TeeDesign = {
  id: 'encore',
  name: 'On en fait une autre ?',
  idea: 'Drop 01 · La phrase qu’on se dit à 4 h du matin, en lettres gonflées qui dansent. Petit texte sur un côté, petit « ? » gonflé sur le cœur : un vrai t-shirt de merch, pas un uniforme.',
  shirt: '#111111',
  ink: '#ffd84a',
  accent: '#ffffff',
  Front: ({ content, ink, accent, scale }) => (
    <K k={scale} w={FW} h={340}>
      <text x={42} y={74} fontFamily={FONT.round} fontWeight={700} fontSize={11} letterSpacing={1} fill={accent}>
        {content.brand.toUpperCase()}
      </text>
      <text x={42} y={84} fontFamily={FONT.mono} fontSize={5.6} letterSpacing={0.8} fill={accent}>
        Crew Edition© · N°{content.editionNumber}
      </text>
      <Puffy text="?" x={208} y={92} size={52} fill={ink} shade={darken(ink, 0.35)} knock="#111111" maxW={60} />
    </K>
  ),
  Back: ({ content, ink, accent, scale }) => (
    <K k={scale} w={BW} h={400}>
      {script(132, 70, 'on en fait', 54, accent, { rot: -8 })}
      <Puffy text="une" x={150} y={170} size={112} fill={ink} shade={darken(ink, 0.35)} knock="#111111" maxW={200} />
      <Puffy text="autre?" x={150} y={262} size={104} fill={ink} shade={darken(ink, 0.35)} knock="#111111" maxW={286} seed={3} />
      <RingLogo brand={content.brand} cx={150} cy={326} R={34} cap={15} stroke={accent} weight={2} />
      {mono(150, 382, `CREW · ÉDITION ${content.editionNumber}`, 8, accent)}
    </K>
  ),
};

/* ---------- 3 · side A / side B, recorded live ---------- */

const TRACKS: [string, string, string][] = [
  ['A1', 'House', '122'],
  ['A2', 'Afro House', '120'],
  ['A3', 'Disco House', '123'],
  ['B1', 'Indie Dance', '118'],
  ['B2', 'Groove', '112'],
  ['B3', 'House Dance', '125'],
];

const vinyl: TeeDesign = {
  id: 'sessions',
  name: 'Live Sessions',
  idea: 'Drop 01 · Une pochette, un vinyle qui en sort et une tracklist Face A / Face B avec les styles du concept et leur tempo : chaque set est enregistré, le t-shirt le raconte.',
  shirt: '#ece4d3',
  ink: '#14204a',
  accent: '#e8412c',
  Front: ({ content, ink, accent, scale }) => (
    <K k={scale} w={FW} h={340}>
      <circle cx={186} cy={63} r={4.2} fill={accent} />
      {mono(194, 66, 'REC', 9, ink, 'start', 0.3)}
      {mono(184, 80, 'LIVE SESSIONS', 6, ink, 'start', 0.3)}
      {mono(184, 90, `${content.brand} · ${content.editionNumber}`, 5, ink, 'start', 0.3)}
    </K>
  ),
  Back: ({ content, ink, accent, scale }) => (
    <K k={scale} w={BW} h={400}>
      <g>
        <circle cx={196} cy={102} r={74} fill={ink} />
        {Array.from({ length: 16 }, (_, i) => (
          <circle key={i} cx={196} cy={102} r={30 + i * 2.7} fill="none" stroke="#ece4d3" strokeOpacity={0.22} strokeWidth={0.5} />
        ))}
        <path d="M150 60A66 66 0 0 1 250 70" fill="none" stroke="#ece4d3" strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" />
        <circle cx={196} cy={102} r={24} fill={accent} />
        <text x={196} y={113} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={30} fill="#ece4d3">
          ?
        </text>
        <circle cx={196} cy={102} r={2.2} fill={ink} />
      </g>
      <rect x={34} y={28} width={148} height={148} fill={ink} />
      <rect x={40} y={34} width={136} height={136} fill="none" stroke="#ece4d3" strokeOpacity={0.25} strokeWidth={1} />
      <RingLogo brand={content.brand} cx={108} cy={98} R={44} cap={20} stroke="#ece4d3" weight={1.8} />
      {mono(108, 166, `LIVE SESSIONS · VOL.${content.editionNumber}`, 6, '#ece4d3')}
      <text x={34} y={210} fontFamily={FONT.round} fontWeight={700} fontSize={23} fill={ink}>
        {content.brand.toUpperCase()}
      </text>
      <circle cx={260} cy={202} r={5} fill={accent} />
      {mono(250, 206, 'REC', 8, accent, 'end', 0.3)}
      {[0, 1].map((side) => (
        <g key={side}>
          {mono(34, 232 + side * 72, side ? 'FACE B' : 'FACE A', 8, accent, 'start', 0.35)}
          {TRACKS.slice(side * 3, side * 3 + 3).map(([code, title, bpm], i) => {
            const y = 249 + side * 72 + i * 16;
            return (
              <g key={code}>
                {mono(34, y, code, 8, ink, 'start', 0.1)}
                <text x={56} y={y} fontFamily={FONT.sans} fontWeight={600} fontSize={12} fill={ink}>
                  {title}
                </text>
                <path d={`M${60 + measure(title, { family: "'General Sans'", size: 12, weight: 600 })} ${y - 1}H236`} stroke={ink} strokeWidth={1} strokeDasharray="0.1 4" strokeLinecap="round" />
                {mono(266, y, `${bpm} BPM`, 7.5, ink, 'end', 0.1)}
              </g>
            );
          })}
        </g>
      ))}
      {script(150, 392, 'enregistré en live, à chaque édition', 30, accent, { maxW: 250 })}
    </K>
  ),
};

/* ---------- 4 · mashmoum (Tunisian jasmine bouquet) ---------- */

function Jasmine({ x, y, r, rot, fill, line, heart }: { x: number; y: number; r: number; rot: number; fill: string; line: string; heart: string }) {
  const petal = `M0 0C${r * 0.42} ${-r * 0.22} ${r * 0.44} ${-r * 0.78} 0 ${-r}C${-r * 0.44} ${-r * 0.78} ${-r * 0.42} ${-r * 0.22} 0 0Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d={petal} transform={`rotate(${a})`} fill={fill} stroke={line} strokeWidth={Math.max(0.5, r * 0.07)} strokeLinejoin="round" />
      ))}
      <circle r={r * 0.16} fill={heart} />
    </g>
  );
}

function Mashmoum({ cx, cy, R, fill, line, heart, thread, stems, n = 46 }: { cx: number; cy: number; R: number; fill: string; line: string; heart: string; thread: string; stems: string; n?: number }) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const flowers = Array.from({ length: n }, (_, i) => {
    const t = Math.sqrt((i + 0.5) / n);
    const a = i * golden;
    return { x: cx + R * t * Math.cos(a), y: cy + R * 0.82 * t * Math.sin(a), d: t, rot: (a * 180) / Math.PI };
  }).sort((p, q) => q.d - p.d);
  const base = cy + R * 0.82 + R * 0.05;
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const sx = cx - R * 0.55 + (i * R * 1.1) / 8;
        return <path key={i} d={`M${sx} ${cy + R * 0.3}Q${cx + (sx - cx) * 0.3} ${base + R * 0.35} ${cx + (i - 4) * 1.3} ${base + R * 1.05}`} fill="none" stroke={stems} strokeWidth={1.2} strokeLinecap="round" />;
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const y = base + R * 0.48 + i * 4.2;
        return <path key={i} d={`M${cx - 9 + i * 0.4} ${y + 2}L${cx + 9 - i * 0.4} ${y - 2}`} stroke={thread} strokeWidth={2.2} strokeLinecap="round" />;
      })}
      <path d={`M${cx + 8} ${base + R * 0.6}C${cx + 40} ${base + R * 0.7} ${cx + 30} ${base + R * 1.1} ${cx + 52} ${base + R * 1.2}`} fill="none" stroke={thread} strokeWidth={1.6} strokeLinecap="round" />
      {flowers.map((f, i) => {
        const s = R * 0.2 * (1 - 0.32 * f.d * f.d);
        return f.d > 0.93 && i % 2 ? (
          <ellipse key={i} cx={f.x} cy={f.y} rx={s * 0.32} ry={s * 0.7} transform={`rotate(${f.rot + 90} ${f.x} ${f.y})`} fill={fill} stroke={line} strokeWidth={0.8} />
        ) : (
          <Jasmine key={i} x={f.x} y={f.y} r={s} rot={f.rot} fill={fill} line={line} heart={heart} />
        );
      })}
    </g>
  );
}

const mashmoum: TeeDesign = {
  id: 'mashmoum',
  name: 'Mashmoum',
  idea: 'Drop 01 · Le bouquet de jasmin des nuits d’été tunisiennes, dessiné fleur par fleur, noué d’un fil rouge : « une autre nuit ? » à la main en dessous. Une signature locale que personne d’autre n’a.',
  shirt: '#121212',
  ink: '#f4efe2',
  accent: '#e2342b',
  Front: ({ content, ink, accent, scale }) => (
    <K k={scale} w={FW} h={340}>
      <Jasmine x={205} y={62} r={13} rot={12} fill={ink} line="#121212" heart="#e8c46a" />
      <path d="M205 75Q207 86 203 94" fill="none" stroke={accent} strokeWidth={1.4} strokeLinecap="round" />
      {script(205, 110, `${lower(content.brand)}`, 20, ink)}
    </K>
  ),
  Back: ({ content, ink, accent, scale }) => (
    <K k={scale} w={BW} h={400}>
      {caps(150, 34, 'LES NUITS D’ÉTÉ', 12, ink)}
      <Mashmoum cx={150} cy={128} R={88} fill={ink} line="#121212" heart="#e8c46a" thread={accent} stems={ink} />
      {script(150, 352, `${lower(content.brand).replace(/\s*\?$/, '')} nuit ?`, 62, ink, { rot: -5, maxW: 270 })}
      {mono(150, 386, `TUNISIE · ÉDITION ${content.editionNumber}`, 8, accent)}
    </K>
  ),
};

/* ---------- 5 · the crew show patch ---------- */

function Patch({ cx, cy, R, fill, line, text, inkText, id, children }: { cx: number; cy: number; R: number; fill: string; line: string; text: string; inkText: string; id: string; children?: ReactNode }) {
  const n = 22;
  const pts = Array.from({ length: n * 8 }, (_, i) => {
    const a = (i / (n * 8)) * Math.PI * 2;
    const rr = R + R * 0.035 * Math.cos(n * a);
    return `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join('') + 'Z';
  const tr = R * 0.78;
  return (
    <g>
      <path d={pts} fill={fill} stroke={line} strokeWidth={R * 0.045} strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r={R * 0.9} fill="none" stroke={line} strokeWidth={R * 0.012} strokeDasharray={`${R * 0.03} ${R * 0.025}`} />
      <circle cx={cx} cy={cy} r={R * 0.62} fill="none" stroke={line} strokeWidth={R * 0.02} />
      <defs>
        <path id={id} d={`M${cx - tr} ${cy}A${tr} ${tr} 0 1 1 ${cx + tr} ${cy}A${tr} ${tr} 0 1 1 ${cx - tr} ${cy}`} />
      </defs>
      <text fontFamily={FONT.round} fontWeight={700} fontSize={R * 0.15} letterSpacing={R * 0.02} fill={inkText} dominantBaseline="central">
        <textPath href={`#${id}`} startOffset="0" textLength={2 * Math.PI * tr - R * 0.05} lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
      {children}
    </g>
  );
}

const patch: TeeDesign = {
  id: 'show',
  name: 'Le show',
  idea: 'Drop 01 · Un écusson brodé façon patch : MIXÉ · JOUÉ · CHANTÉ tout autour, un gros « ? » gonflé au centre, DJ — GUITARE — VOIX dessous. Le t-shirt qui dit que le crew ne fait pas qu’un DJ set.',
  shirt: '#f3f1ec',
  ink: '#1b1b1b',
  accent: '#ff6a2b',
  Front: ({ ink, accent, scale }) => (
    <K k={scale} w={FW} h={340}>
      <g transform="rotate(-8 205 72)">
        <Patch cx={205} cy={72} R={24} fill={accent} line={ink} text="LIVE · LIVE · LIVE · LIVE · " inkText={ink} id="patch-f">
          <Puffy text="?" x={205} y={84} size={30} fill="#ffffff" shade={ink} knock={accent} maxW={30} />
        </Patch>
      </g>
    </K>
  ),
  Back: ({ content, ink, accent, scale }) => (
    <K k={scale} w={BW} h={400}>
      <g transform="rotate(-8 150 160)">
        <Patch cx={150} cy={160} R={124} fill={accent} line={ink} text="MIXÉ · JOUÉ · CHANTÉ · EN LIVE · MIXÉ · JOUÉ · CHANTÉ · EN LIVE · " inkText={ink} id="patch-b">
          <Puffy text="?" x={150} y={212} size={150} fill="#ffffff" shade={ink} knock={accent} maxW={140} />
        </Patch>
      </g>
      <text x={150} y={334} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={fitMeasured('DJ — GUITARE — VOIX', 270, { family: "'Fredoka'", size: 32, weight: 700 })} fill={ink}>
        DJ — GUITARE — VOIX
      </text>
      {mono(150, 360, `LE SHOW DU CREW · ${content.brand}`, 8, ink)}
      {mono(150, 380, `ÉDITION ${content.editionNumber}`, 7, accent)}
    </K>
  ),
};

/* ---------- 6 · que des « ? » (à l’endroit et à l’envers), le logo au milieu ---------- */

function QField({ w, h, cx, cy, hole, ink, cell = 30, seed = 0 }: { w: number; h: number; cx: number; cy: number; hole: number; ink: string; cell?: number; seed?: number }) {
  const sizes = [40, 30, 46, 34, 26, 42];
  const jit = [-12, 8, -4, 14, -9, 5, -15, 10];
  const out: JSX.Element[] = [];
  const cols = Math.floor(w / cell);
  const rows = Math.floor(h / cell);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * cell + (r % 2 ? cell * 0.25 : -cell * 0.25) + (w - cols * cell) / 2;
      const y = (r + 0.5) * cell + (h - rows * cell) / 2;
      if (Math.hypot(x - cx, y - cy) < hole) continue;
      const i = r * cols + c + seed;
      const size = sizes[i % sizes.length];
      const flip = (r + c) % 2 === 1;
      const filled = i % 9 === 4;
      out.push(
        <text key={`${r}-${c}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(flip ? 180 : 0) + jit[i % jit.length]})`} y={size * 0.36} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={size} fill={filled ? ink : 'none'} stroke={ink} strokeWidth={size > 36 ? 2 : 1.6} strokeLinejoin="round">
          ?
        </text>,
      );
    }
  return <g>{out}</g>;
}

const questions: TeeDesign = {
  id: 'questions',
  name: 'Que des « ? »',
  idea: 'Tout le dos couvert de « ? » en contour, un sur deux à l’envers, quelques-uns pleins — et au milieu, dans un cercle vide, le logo UNE AUTRE en anneau. Devant : un « ? » à l’endroit et un à l’envers sur le cœur.',
  shirt: '#0d0d0d',
  ink: '#ff1f1f',
  accent: '#ffffff',
  Front: ({ ink, scale }) => (
    <K k={scale} w={FW} h={340}>
      <text x={192} y={90} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={46} fill="none" stroke={ink} strokeWidth={1.8} strokeLinejoin="round">
        ?
      </text>
      <text transform="translate(222 74) rotate(180)" y={16} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={46} fill={ink}>
        ?
      </text>
    </K>
  ),
  Back: ({ content, ink, accent, scale }) => (
    <K k={scale} w={BW} h={400}>
      <QField w={BW} h={400} cx={150} cy={190} hole={104} ink={ink} cell={40} />
      <circle cx={150} cy={190} r={94} fill="none" stroke={ink} strokeWidth={1.4} strokeDasharray="2 6" strokeLinecap="round" />
      <RingLogo brand={content.brand} cx={150} cy={190} R={68} cap={32} stroke={accent} weight={3.2} />
    </K>
  ),
};

export const DROPS: TeeDesign[] = [questions, disco, puffy, vinyl, mashmoum, patch];


/* ======================================================================= */
/* Crew DJ only — four pieces built on the real ring logo and its "?"      */
/* ======================================================================= */

const djName = (p: Ink) => (p.name.trim() ? p.name.trim().toUpperCase() : 'DJ');

const resident: TeeDesign = {
  id: 'resident',
  name: 'Résident',
  idea: 'Réservé aux DJ du crew · Le vrai logo en anneau rouge posé sur des sillons de vinyle, un disque « DJ » au centre, RESIDENT DJ dessous et la mention CREW ONLY · NOT FOR SALE. Le prénom du DJ s’imprime si vous le renseignez.',
  shirt: '#0d0d0d',
  ink: '#ffffff',
  accent: '#ff1f1f',
  Front: ({ content, accent, scale }) => (
    <K k={scale} w={FW} h={340}>
      <RingLogo brand={content.brand} cx={205} cy={74} R={30} cap={14} stroke={accent} weight={2.2} />
    </K>
  ),
  Back: (p) => {
    const { content, ink, accent, scale } = p;
    return (
      <K k={scale} w={BW} h={400}>
        {Array.from({ length: 13 }, (_, i) => (
          <circle key={i} cx={150} cy={150} r={64 + i * 6.5} fill="none" stroke={ink} strokeOpacity={i % 4 === 0 ? 0.35 : 0.14} strokeWidth={i % 4 === 0 ? 1.2 : 0.7} />
        ))}
        <RingLogo brand={content.brand} cx={150} cy={150} R={104} cap={47} stroke={accent} weight={4.2} />
        <circle cx={150} cy={150} r={33} fill={accent} />
        <text x={150} y={161} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={30} fill={ink}>
          DJ
        </text>
        <circle cx={150} cy={150} r={2.4} fill="#0d0d0d" />
        <text x={150} y={318} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={fitMeasured('RESIDENT DJ', 270, { family: "'Fredoka'", size: 46, weight: 700 })} fill={ink}>
          RESIDENT DJ
        </text>
        {mono(150, 344, djName(p) === 'DJ' ? content.brand : djName(p), 10, ink)}
        {mono(150, 372, `CREW ONLY · NOT FOR SALE · N°${content.editionNumber}`, 7.5, accent)}
      </K>
    );
  },
};

const platine: TeeDesign = {
  id: 'platine',
  name: 'Platine',
  idea: 'Réservé aux DJ du crew · Une platine vue de dessus, dessinée au trait : le macaron du disque, c’est le logo UNE AUTRE ? en rouge. Bras, pitch, bouton start — et « selected by the crew » écrit à la main.',
  shirt: '#f3f1ec',
  ink: '#121212',
  accent: '#ff1f1f',
  Front: ({ ink, accent, scale }) => (
    <K k={scale} w={FW} h={340}>
      <circle cx={205} cy={70} r={17} fill="none" stroke={ink} strokeWidth={1.6} />
      <text x={205} y={79} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={24} fill={accent}>
        ?
      </text>
      {mono(205, 102, 'DJ CREW', 6, ink)}
    </K>
  ),
  Back: ({ content, ink, accent, scale }) => (
    <K k={scale} w={BW} h={400}>
      <rect x={18} y={34} width={264} height={240} rx={16} fill="none" stroke={ink} strokeWidth={2.4} />
      <rect x={26} y={42} width={248} height={224} rx={11} fill="none" stroke={ink} strokeWidth={0.8} strokeOpacity={0.5} />
      <circle cx={128} cy={154} r={100} fill="none" stroke={ink} strokeWidth={2.2} />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <circle key={i} cx={128 + 104.5 * Math.cos(a)} cy={154 + 104.5 * Math.sin(a)} r={1.3} fill={ink} />;
      })}
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={128} cy={154} r={66 + i * 3.6} fill="none" stroke={ink} strokeOpacity={0.35} strokeWidth={0.6} />
      ))}
      <circle cx={128} cy={154} r={62} fill={accent} fillOpacity={0.08} stroke={accent} strokeWidth={1} />
      <RingLogo brand={content.brand} cx={128} cy={154} R={45} cap={20} stroke={accent} weight={2.2} />
      <circle cx={128} cy={154} r={3.4} fill={ink} />
      {/* tonearm */}
      <circle cx={246} cy={70} r={14} fill="none" stroke={ink} strokeWidth={2} />
      <circle cx={246} cy={70} r={5} fill={ink} />
      <path d="M246 70L252 150Q254 186 214 214" fill="none" stroke={ink} strokeWidth={3.4} strokeLinecap="round" />
      <rect x={198} y={206} width={22} height={13} rx={2.5} transform="rotate(-38 209 212)" fill={ink} />
      {/* pitch + start */}
      <rect x={252} y={176} width={12} height={74} rx={3} fill="none" stroke={ink} strokeWidth={1.4} />
      <rect x={250} y={220} width={16} height={7} rx={1.5} fill={accent} />
      <rect x={34} y={238} width={30} height={18} rx={3} fill="none" stroke={ink} strokeWidth={1.6} />
      {mono(49, 251, 'START', 5, ink)}
      <circle cx={84} cy={247} r={4} fill={accent} />
      {script(150, 318, 'selected by the crew', 46, accent, { rot: -4, maxW: 270 })}
      {mono(150, 352, `${content.brand} · DJ CREW · ÉDITION ${content.editionNumber}`, 7.5, ink)}
      {mono(150, 372, 'RÉSERVÉ AUX DJ DU CREW', 6.5, ink)}
    </K>
  ),
};

const rotation: TeeDesign = {
  id: 'rotation',
  name: 'Rotation',
  idea: 'Réservé aux DJ du crew · Neuf fois le logo, chacun tourné un peu plus que le précédent : les images de l’anneau qui tourne sur les affiches. Un seul est plein, en blanc — le vôtre. Gros « ? » blanc sur le cœur.',
  shirt: '#e3121b',
  ink: '#111111',
  accent: '#ffffff',
  Front: ({ accent, ink, scale }) => (
    <K k={scale} w={FW} h={340}>
      <text x={205} y={112} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={76} fill={accent}>
        ?
      </text>
      {mono(205, 128, 'DJ CREW', 6, ink)}
    </K>
  ),
  Back: (p) => {
    const { content, ink, accent, scale } = p;
    return (
      <K k={scale} w={BW} h={400}>
        {Array.from({ length: 9 }, (_, i) => {
          const cx = 54 + (i % 3) * 96;
          const cy = 56 + Math.floor(i / 3) * 98;
          const on = i === 4;
          return (
            <g key={i} transform={`rotate(${i * 30} ${cx} ${cy})`}>
              <RingLogo brand={content.brand} cx={cx} cy={cy} R={34} cap={16} stroke={on ? accent : ink} fill={on ? accent : 'none'} weight={on ? 2.4 : 1.8} />
            </g>
          );
        })}
        <text x={150} y={348} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={fitMeasured('UNE AUTRE, PUIS UNE AUTRE', 270, { family: "'Fredoka'", size: 22, weight: 700 })} fill={ink}>
          UNE AUTRE, PUIS UNE AUTRE
        </text>
        {mono(150, 372, `${djName(p)} · CREW ONLY · N°${content.editionNumber}`, 7.5, accent)}
      </K>
    );
  },
};

const sceau: TeeDesign = {
  id: 'sceau',
  name: 'Sceau',
  idea: 'Réservé aux DJ du crew · Le logo devient un sceau officiel : double cercle, « DJ CREW ONLY · RÉSERVÉ AU CREW » tout autour, l’anneau rouge au centre et le prénom du DJ. NOT FOR SALE en contour dessous.',
  shirt: '#0b1240',
  ink: '#e6eaf6',
  accent: '#ff1f1f',
  Front: ({ content, ink, accent, scale }) => (
    <K k={scale} w={FW} h={340}>
      <circle cx={205} cy={74} r={33} fill="none" stroke={ink} strokeWidth={1.4} />
      <circle cx={205} cy={74} r={29} fill="none" stroke={ink} strokeWidth={0.6} />
      <RingLogo brand={content.brand} cx={205} cy={74} R={19} cap={9} stroke={accent} weight={1.5} />
    </K>
  ),
  Back: (p) => {
    const { content, ink, accent, scale } = p;
    const tr = 121;
    return (
      <K k={scale} w={BW} h={400}>
        <circle cx={150} cy={158} r={134} fill="none" stroke={ink} strokeWidth={2.4} />
        <circle cx={150} cy={158} r={108} fill="none" stroke={ink} strokeWidth={1} />
        <defs>
          <path id="sceau-arc" d={`M${150 - tr} 158A${tr} ${tr} 0 1 1 ${150 + tr} 158A${tr} ${tr} 0 1 1 ${150 - tr} 158`} />
        </defs>
        <text fontFamily={FONT.mono} fontWeight={500} fontSize={10.5} letterSpacing={3} fill={ink} dominantBaseline="central">
          <textPath href="#sceau-arc" textLength={2 * Math.PI * tr - 8} lengthAdjust="spacing">
            {`DJ CREW ONLY ✦ RÉSERVÉ AU CREW ✦ ÉDITION ${content.editionNumber} ✦ TUNISIE ✦ `}
          </textPath>
        </text>
        <RingLogo brand={content.brand} cx={150} cy={158} R={72} cap={33} stroke={accent} weight={3.2} />
        <text x={150} y={166} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={fitMeasured(djName(p), 70, { family: "'Fredoka'", size: 24, weight: 700 })} fill={ink}>
          {djName(p)}
        </text>
        <text x={150} y={340} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={fitMeasured('NOT FOR SALE', 270, { family: "'Fredoka'", size: 44, weight: 700 })} fill="none" stroke={ink} strokeWidth={1.6} strokeLinejoin="round">
          NOT FOR SALE
        </text>
        {mono(150, 368, `${content.brand} · DJ CREW`, 8, accent)}
      </K>
    );
  },
};

/** Tees only the crew DJs wear. */
export const DJ_DROPS: TeeDesign[] = [resident, platine, rotation, sceau];

/* ======================================================================= */
/* product mock-up: oversized boxy tee, folds and shadow                    */
/* ======================================================================= */

const BODY = (neck: number) =>
  `M-96 -372Q0 ${neck} 96 -372L262 -336Q318 -306 352 -232L404 -128Q352 -96 298 -86L282 -146Q278 80 286 310Q0 322 -286 310Q-278 80 -282 -146L-298 -86Q-352 -96 -404 -128L-352 -232Q-318 -306 -262 -336Z`;

export function TeeMock({ d, p, shirt, side, background = 'transparent', label = true }: { d: TeeDesign; p: Ink; shirt: string; side: 'front' | 'back'; background?: string; label?: boolean }) {
  const id = `tm-${d.id}-${side}`;
  const lum = (() => {
    const n = parseInt(shirt.replace('#', '').slice(0, 6), 16);
    return (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  })();
  const light = lum > 0.6;
  const front = side === 'front';
  const area = front ? { w: 280, h: 340 } : { w: 300, h: 400 };
  const k = 0.95;
  const top = front ? -322 : -338;
  return (
    <svg viewBox="-420 -400 840 780" className="tee-mock" role="img" aria-label={`${d.name}, ${front ? 'devant' : 'dos'}`}>
      {background !== 'transparent' && <rect x={-420} y={-400} width={840} height={780} fill={background} />}
      <defs>
        <clipPath id={`${id}-c`}>
          <path d={BODY(front ? -300 : -350)} />
        </clipPath>
        <filter id={`${id}-b`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={`${id}-s`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <linearGradient id={`${id}-g`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity={light ? 0.1 : 0.3} />
          <stop offset="0.18" stopColor="#000" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity={light ? 0.05 : 0.06} />
          <stop offset="0.82" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={light ? 0.12 : 0.32} />
        </linearGradient>
      </defs>
      <ellipse cx={0} cy={326} rx={310} ry={16} fill="#000" opacity={0.22} filter={`url(#${id}-s)`} />
      {/* inside of the back neck, seen through the opening */}
      {front && <path d="M-96 -372Q0 -352 96 -372Q0 -300 -96 -372Z" fill={darken(shirt, light ? 0.16 : 0.35)} />}
      <path d={BODY(front ? -300 : -350)} fill={shirt} />
      <g clipPath={`url(#${id}-c)`}>
        <svg x={-(area.w * k) / 2} y={top} width={area.w * k} height={area.h * k} viewBox={`0 0 ${area.w} ${area.h}`} overflow="visible" style={{ mixBlendMode: light ? 'multiply' : 'normal' }}>
          {front ? <d.Front {...p} /> : <d.Back {...p} />}
        </svg>
        {/* fabric light & folds over the print */}
        <rect x={-420} y={-400} width={840} height={780} fill={`url(#${id}-g)`} />
        <g filter={`url(#${id}-b)`} fill="none" strokeLinecap="round">
          <path d="M-236 -300Q-190 -150 -215 40T-200 300" stroke="#000" strokeOpacity={light ? 0.07 : 0.25} strokeWidth="26" />
          <path d="M220 -280Q180 -60 224 120T200 300" stroke="#000" strokeOpacity={light ? 0.06 : 0.22} strokeWidth="22" />
          <path d="M-140 190Q-60 260 40 300" stroke="#000" strokeOpacity={light ? 0.05 : 0.18} strokeWidth="20" />
          <path d="M-60 -260Q20 -120 -10 40" stroke="#fff" strokeOpacity={light ? 0.35 : 0.05} strokeWidth="40" />
          <path d="M-318 -236L-268 -150" stroke="#000" strokeOpacity={light ? 0.08 : 0.25} strokeWidth="30" />
          <path d="M318 -236L268 -150" stroke="#000" strokeOpacity={light ? 0.08 : 0.25} strokeWidth="30" />
        </g>
        {/* seams & hems */}
        <g fill="none" stroke="#000" strokeOpacity={light ? 0.14 : 0.45} strokeWidth="2">
          <path d="M262 -336Q276 -240 282 -146M-262 -336Q-276 -240 -282 -146" />
          <path d="M-280 290Q0 302 280 290" strokeDasharray="6 5" strokeWidth="1.5" />
          <path d="M404 -128Q352 -96 298 -86M-404 -128Q-352 -96 -298 -86" transform="translate(0 -16)" strokeDasharray="6 5" strokeWidth="1.5" />
        </g>
      </g>
      {/* rib collar */}
      <path d={front ? 'M-96 -372Q0 -300 96 -372' : 'M-96 -372Q0 -350 96 -372'} fill="none" stroke={darken(shirt, light ? 0.06 : 0.12)} strokeWidth="20" strokeLinecap="round" />
      <path d={front ? 'M-88 -364Q0 -298 88 -364' : 'M-88 -364Q0 -344 88 -364'} fill="none" stroke="#000" strokeOpacity={light ? 0.12 : 0.4} strokeWidth="1.5" />
      {label && (
        <text x={0} y={362} textAnchor="middle" fontFamily={FONT.mono} fontSize={13} letterSpacing={4} fill={light ? '#8d887d' : '#8d887d'}>
          {front ? 'DEVANT' : 'DOS'}
        </text>
      )}
    </svg>
  );
}
