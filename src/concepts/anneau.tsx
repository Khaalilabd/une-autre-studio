/**
 * Family 13–17 — variations on the existing UNE AUTRE ? mark (hollow capitals set
 * on a ring, open dots) and on hand-drawn neon lettering.
 */
import type { FC, ReactNode } from 'react';
import { lines, splitBrand, splitDate } from '../data/content';
import type { Colors, ConceptDef, CreativeSettings, EventContent, LogoProps, PosterProps, Tone } from '../data/types';
import { hexToRgb } from '../graphics/common';
import { arcLayout, arcPath, Glow, lineLayout, OutlineGlyphs, Wobble, type ArcGlyph } from '../graphics/outline';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { fitMeasured } from '../lib/measure';
import { f1, rng } from '../lib/rng';

const isDark = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return r * 0.3 + g * 0.59 + b * 0.11 < 128;
};
/** Text colour that stays visible on the accent, even in monochrome tests. */
const onAccent = (t: Tone) => (t.fg === t.accent ? (isDark(t.fg) ? '#ffffff' : '#000000') : t.fg);

type Dims = (variant: LogoProps['variant'], layout: 'stacked' | 'line', brand: string) => { w: number; h: number };

/* ======================================================================= */
/* 13 — ANNEAU                                                             */
/* ======================================================================= */

const ringDims: Dims = (variant, layout, brand) => {
  const { base, question } = splitBrand(brand);
  if (variant === 'symbol') return { w: 260, h: 260 };
  const size = variant === 'secondary' ? 72 : 110;
  if (variant === 'secondary' || layout === 'line') return { w: lineLayout(base, size).width + (question ? size * 1.1 : 0) + 110, h: size * 1.7 };
  return { w: 560, h: 560 };
};

function RingLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const { words, question, base } = splitBrand(brand);
  const c = tone.accent;
  const d = ringDims(variant, layout, brand);
  const box = { x, y, width: width ?? d.w, height: height ?? d.h, viewBox: `0 0 ${f1(d.w)} ${f1(d.h)}` };

  if (variant === 'symbol') {
    return (
      <svg {...box}>
        <circle cx={130} cy={130} r={118} fill="none" stroke={c} strokeWidth={3} />
        <OutlineGlyphs glyphs={[{ ch: '?', x: 0, y: 0, rot: 10 }]} cx={134} cy={126} size={190} color={c} sw={7} />
      </svg>
    );
  }
  if (variant === 'secondary' || layout === 'line') {
    const size = variant === 'secondary' ? 72 : 110;
    const sw = variant === 'secondary' ? 3.2 : 5;
    const l = lineLayout(base, size);
    return (
      <svg {...box}>
        <circle cx={26} cy={d.h / 2} r={size * 0.11} fill="none" stroke={c} strokeWidth={sw} />
        <OutlineGlyphs glyphs={l.glyphs} cx={60} cy={d.h / 2} size={size} color={c} sw={sw} />
        {question && <OutlineGlyphs glyphs={[{ ch: '?', x: 0, y: 0, rot: 10 }]} cx={60 + l.width + size * 0.55} cy={d.h / 2 - size * 0.06} size={size * 1.2} color={c} sw={sw} />}
      </svg>
    );
  }
  const cx = 280;
  const cy = 280;
  const r = 158;
  const top = arcLayout(words[0] ?? base, 96, r, words.length > 1 ? -112 : -90, 'top');
  const bottom = words.length > 1 ? arcLayout(words.slice(1).join(' '), 96, r, 104, 'bottom') : [];
  const qa = (-6 * Math.PI) / 180;
  return (
    <svg {...box}>
      <g fill="none" stroke={c} strokeWidth={3} strokeLinecap="round">
        <path d={arcPath(cx, cy, r + 70, 58, 124)} />
        <path d={arcPath(cx, cy, r - 2, 186, 196)} />
        <path d={arcPath(cx, cy, r + 4, 18, 30)} />
      </g>
      <circle cx={cx + Math.cos(Math.PI) * r} cy={cy} r={13} fill="none" stroke={c} strokeWidth={5} />
      <OutlineGlyphs glyphs={[...top, ...bottom]} cx={cx} cy={cy} size={96} color={c} sw={5.5} />
      {question && <OutlineGlyphs glyphs={[{ ch: '?', x: Math.cos(qa) * r * 1.02, y: Math.sin(qa) * r - 6, rot: 14 }]} cx={cx} cy={cy} size={150} color={c} sw={5.5} />}
    </svg>
  );
}

/* ======================================================================= */
/* 14 — LOCO NÉON                                                          */
/* ======================================================================= */

const locoDims: Dims = (variant, layout, brand) => {
  const { words, question, base } = splitBrand(brand);
  if (variant === 'symbol') return { w: 260, h: 260 };
  const size = 130;
  const q = question ? ' ?' : '';
  if (variant === 'secondary' || layout === 'line' || words.length < 2) return { w: lineLayout(base + q, size).width + 120, h: size * 1.9 };
  const a = lineLayout(words[0], size).width;
  const b = lineLayout(words.slice(1).join(' ') + q, size).width;
  return { w: Math.max(a, b) + 120, h: size * 3.2 };
};

function LocoLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const { words, question, base } = splitBrand(brand);
  const d = locoDims(variant, layout, brand);
  const box = { x, y, width: width ?? d.w, height: height ?? d.h, viewBox: `0 0 ${f1(d.w)} ${f1(d.h)}` };
  const color = tone.fg;
  const size = 130;
  const q = question ? ' ?' : '';
  const draw = (rows: { g: ArcGlyph[]; x: number; y: number }[], sw: number) => (w: number) =>
    rows.map((r, i) => <OutlineGlyphs key={i} glyphs={r.g} cx={r.x} cy={r.y} size={size} color={color} sw={w * (sw / 6)} />);

  if (variant === 'symbol') {
    return (
      <svg {...box}>
        <Wobble amount={6}>
          <Glow sw={4}>{(w) => <OutlineGlyphs glyphs={[{ ch: '?', x: 0, y: 0, rot: -8 }]} cx={130} cy={128} size={200} color={color} sw={w} />}</Glow>
        </Wobble>
      </svg>
    );
  }
  const stacked = variant === 'primary' && layout !== 'line' && words.length > 1;
  const rows = stacked
    ? [
        { g: lineLayout(words[0], size, 3, 1).glyphs, x: 60 + (d.w - 120 - lineLayout(words[0], size).width) / 2, y: size * 0.95 },
        { g: lineLayout(words.slice(1).join(' ') + q, size, 7, 1).glyphs, x: 60, y: size * 2.25 },
      ]
    : [{ g: lineLayout(base + q, size, 5, variant === 'secondary' ? 0.5 : 1).glyphs, x: 60, y: d.h / 2 }];
  if (variant === 'secondary') {
    return (
      <svg {...box}>
        <Wobble amount={5}>{draw(rows, 6)(6)}</Wobble>
      </svg>
    );
  }
  return (
    <svg {...box}>
      <Wobble amount={7}>
        <Glow sw={4.5}>{draw(rows, 6)}</Glow>
      </Wobble>
    </svg>
  );
}

/* ======================================================================= */
/* 15 — VINYLE                                                             */
/* ======================================================================= */

const vinylDims: Dims = (variant, layout, brand) => {
  const { base, question } = splitBrand(brand);
  if (variant === 'symbol' || (variant === 'primary' && layout !== 'line')) return { w: 500, h: 500 };
  const size = variant === 'secondary' ? 70 : 100;
  return { w: (variant === 'primary' ? 230 : 0) + lineLayout(base + (question ? ' ?' : ''), size).width + 70, h: variant === 'primary' ? 230 : size * 1.6 };
};

function Record({ cx, cy, r, tone, brand, text = true }: { cx: number; cy: number; r: number; tone: Tone; brand: string; text?: boolean }) {
  const { base, question } = splitBrand(brand);
  const label = base.toUpperCase() + (question ? ' ?' : '');
  const k = r / 230;
  const ring = text ? arcLayout(`${label} · ${label} · `, 34 * k, r * 0.88, -90, 'top', 0.08, true) : [];
  const ink = onAccent(tone);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={tone.accent} strokeWidth={Math.max(1.5, 4 * k)} />
      <g fill="none" stroke={tone.accent} strokeWidth={Math.max(0.5, 0.9 * k)} opacity={0.45}>
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={i} cx={cx} cy={cy} r={r * (0.47 + i * 0.026)} />
        ))}
      </g>
      {text && <OutlineGlyphs glyphs={ring} cx={cx} cy={cy} size={34 * k} color={tone.accent} sw={Math.max(1, 2.2 * k)} />}
      <circle cx={cx} cy={cy} r={r * 0.4} fill={tone.accent} />
      <OutlineGlyphs glyphs={[{ ch: '?', x: 0, y: 0, rot: 0 }]} cx={cx} cy={cy - r * 0.02} size={r * 0.56} color={ink} sw={Math.max(1.5, 4.5 * k)} />
      <circle cx={cx + r * 0.2} cy={cy + r * 0.2} r={r * 0.03} fill="none" stroke={ink} strokeWidth={Math.max(1, 2 * k)} />
    </g>
  );
}

function VinylLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const { base, question } = splitBrand(brand);
  const d = vinylDims(variant, layout, brand);
  const box = { x, y, width: width ?? d.w, height: height ?? d.h, viewBox: `0 0 ${f1(d.w)} ${f1(d.h)}` };
  if (variant === 'symbol') {
    return (
      <svg {...box}>
        <Record cx={250} cy={250} r={235} tone={tone} brand={brand} text={false} />
      </svg>
    );
  }
  if (variant === 'primary' && layout !== 'line') {
    return (
      <svg {...box}>
        <Record cx={250} cy={250} r={240} tone={tone} brand={brand} />
      </svg>
    );
  }
  const size = variant === 'secondary' ? 70 : 100;
  const l = lineLayout(base + (question ? ' ?' : ''), size);
  const x0 = variant === 'primary' ? 230 : 30;
  return (
    <svg {...box}>
      {variant === 'primary' && <Record cx={115} cy={115} r={105} tone={tone} brand={brand} text={false} />}
      <OutlineGlyphs glyphs={l.glyphs} cx={x0} cy={d.h / 2} size={size} color={tone.accent} sw={variant === 'secondary' ? 3 : 4.5} />
    </svg>
  );
}

/* ======================================================================= */
/* 16 — ÉCHO                                                               */
/* ======================================================================= */

const echoDims: Dims = (variant, layout, brand) => {
  const { words, question, base } = splitBrand(brand);
  if (variant === 'symbol') return { w: 300, h: 300 };
  const size = variant === 'secondary' ? 80 : 130;
  const q = question ? ' ?' : '';
  if (variant === 'secondary' || layout === 'line' || words.length < 2) return { w: lineLayout(base + q, size).width + 140, h: size * 1.9 };
  return { w: Math.max(lineLayout(words[0], size).width, lineLayout(words.slice(1).join(' ') + q, size).width) + 140, h: size * 3.1 };
};

function Echo({ children, n = 7, dx = 7, dy = 6, color }: { children: (color: string, sw: number) => ReactNode; n?: number; dx?: number; dy?: number; color: string }) {
  return (
    <g>
      {Array.from({ length: n }, (_, k) => n - k).map((i) => (
        <g key={i} transform={`translate(${i * dx} ${i * dy})`} opacity={0.75 * (1 - i / (n + 1))}>
          {children(color, 1.6)}
        </g>
      ))}
      {children(color, 5)}
    </g>
  );
}

function EchoLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const { words, question, base } = splitBrand(brand);
  const d = echoDims(variant, layout, brand);
  const box = { x, y, width: width ?? d.w, height: height ?? d.h, viewBox: `0 0 ${f1(d.w)} ${f1(d.h)}` };
  const q = question ? ' ?' : '';
  if (variant === 'symbol') {
    return (
      <svg {...box}>
        <Echo color={tone.accent} dx={8} dy={7}>
          {(c, sw) => <OutlineGlyphs glyphs={[{ ch: '?', x: 0, y: 0, rot: 0 }]} cx={118} cy={118} size={210} color={c} sw={sw * 1.3} />}
        </Echo>
      </svg>
    );
  }
  const size = variant === 'secondary' ? 80 : 130;
  const stacked = variant === 'primary' && layout !== 'line' && words.length > 1;
  const rows = stacked
    ? [
        { g: lineLayout(words[0], size).glyphs, y: size * 0.9 },
        { g: lineLayout(words.slice(1).join(' ') + q, size).glyphs, y: size * 2.05 },
      ]
    : [{ g: lineLayout(base + q, size).glyphs, y: d.h / 2 - 10 }];
  const draw = (c: string, sw: number) => rows.map((r, i) => <OutlineGlyphs key={i} glyphs={r.g} cx={30} cy={r.y} size={size} color={c} sw={sw} />);
  if (variant === 'secondary') return <svg {...box}>{draw(tone.accent, 3.6)}</svg>;
  return (
    <svg {...box}>
      <Echo color={tone.accent} n={stacked ? 7 : 6}>
        {draw}
      </Echo>
    </svg>
  );
}

/* ======================================================================= */
/* 17 — STICKER                                                            */
/* ======================================================================= */

const stickerDims: Dims = (variant, layout, brand) => {
  const { base, question } = splitBrand(brand);
  if (variant === 'symbol' || (variant === 'primary' && layout !== 'line')) return { w: 500, h: 500 };
  const size = variant === 'secondary' ? 84 : 100;
  return { w: lineLayout(base + (question ? ' ?' : ''), size).width + (variant === 'primary' ? 150 : 60), h: variant === 'primary' ? 230 : size * 1.7 };
};

function StickerLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  const { words, question, base } = splitBrand(brand);
  const d = stickerDims(variant, layout, brand);
  const box = { x, y, width: width ?? d.w, height: height ?? d.h, viewBox: `0 0 ${f1(d.w)} ${f1(d.h)}` };
  const ink = onAccent(tone);
  const q = question ? ' ?' : '';

  if (variant === 'symbol') {
    return (
      <svg {...box}>
        <g transform="rotate(-8 250 250)">
          <circle cx={250} cy={250} r={228} fill={tone.accent} stroke={ink} strokeWidth={16} />
          <OutlineGlyphs glyphs={[{ ch: '?', x: 0, y: 0, rot: 0 }]} cx={250} cy={240} size={330} color={tone.accent} sw={16} fill={ink} paint="stroke" />
        </g>
      </svg>
    );
  }
  if (variant === 'secondary') {
    const l = lineLayout(base + q, 84);
    return (
      <svg {...box}>
        <OutlineGlyphs glyphs={l.glyphs} cx={30} cy={d.h / 2} size={84} color={ink} sw={14} fill={tone.accent} paint="stroke" />
      </svg>
    );
  }
  if (layout === 'line') {
    const l = lineLayout(base + q, 100);
    return (
      <svg {...box}>
        <rect x={10} y={10} width={d.w - 20} height={d.h - 20} rx={(d.h - 20) / 2} fill={tone.accent} stroke={ink} strokeWidth={12} transform={`rotate(-3 ${d.w / 2} ${d.h / 2})`} />
        <OutlineGlyphs glyphs={l.glyphs} cx={75} cy={d.h / 2} size={100} color={ink} sw={0.01} fill={ink} />
      </svg>
    );
  }
  const r = 150;
  const top = arcLayout(words[0] ?? base, 80, r, -90, 'top', 0.1);
  const bottom = words.length > 1 ? arcLayout(words.slice(1).join(' '), 80, r, 90, 'bottom', 0.1) : [];
  return (
    <svg {...box}>
      <g transform="rotate(-8 250 250)">
        <circle cx={250} cy={250} r={232} fill={tone.accent} stroke={ink} strokeWidth={14} />
        <circle cx={250} cy={250} r={206} fill="none" stroke={ink} strokeWidth={2.5} strokeDasharray="2 10" strokeLinecap="round" />
        <OutlineGlyphs glyphs={[...top, ...bottom]} cx={250} cy={250} size={80} color={ink} sw={0.01} fill={ink} />
        <circle cx={250 - r} cy={250} r={10} fill="none" stroke={ink} strokeWidth={4} />
        <circle cx={250 + r} cy={250} r={10} fill="none" stroke={ink} strokeWidth={4} />
        {question && <OutlineGlyphs glyphs={[{ ch: '?', x: 0, y: 0, rot: 0 }]} cx={250} cy={244} size={170} color={ink} sw={6} />}
      </g>
    </svg>
  );
}

/* ======================================================================= */
/* Shared poster frame for the family                                      */
/* ======================================================================= */

interface FamilySpec {
  Logo: FC<LogoProps>;
  dims: Dims;
  /** Mark box (portrait / square). */
  box: { portrait: { x: number; y: number; w: number; h: number }; square: { x: number; y: number; w: number; h: number } };
  infoAlign: 'center' | 'left';
  decorate?: (p: { colors: Colors; sq: boolean; W: number; H: number; content: EventContent; settings: CreativeSettings; tone: Tone }) => ReactNode;
}

function Info({ content, colors, settings, sq, align }: { content: EventContent; colors: Colors; settings: CreativeSettings; sq: boolean; align: 'center' | 'left' }) {
  const fg = colors.fg;
  const acc = colors.accent;
  const { head, tail } = splitDate(content.date);
  const split = settings.infoLayout === 'split';
  const W = 1000;
  const top = sq ? 730 : 1080;
  const nameSize = sq ? 26 : 38;
  const gap = sq ? 42 : 64;
  if (split) {
    return (
      <g>
        <text x={80} y={top} fontFamily={FONT.mono} fontSize={13} letterSpacing={4} fill={acc}>
          {content.lineupTitle}
        </text>
        {content.lineup.map((a, i) => (
          <g key={a.id}>
            <text x={80} y={top + 44 + i * gap} fontFamily={FONT.sans} fontWeight={700} fontSize={fitMeasured(a.name, 520, { family: "'General Sans'", size: nameSize, weight: 700 })} fill={fg}>
              {a.name}
            </text>
            <text x={82} y={top + 44 + i * gap + (sq ? 18 : 24)} fontFamily={FONT.mono} fontSize={sq ? 11 : 13} letterSpacing={2} fill={fg} opacity={0.7}>
              {a.detail}
            </text>
          </g>
        ))}
        <OutlineGlyphs glyphs={lineLayout(head, sq ? 110 : 150).glyphs} cx={W - 80 - lineLayout(head, sq ? 110 : 150).width} cy={top + (sq ? 70 : 90)} size={sq ? 110 : 150} color={acc} sw={3.5} />
        <text x={W - 80} y={top + (sq ? 150 : 200)} textAnchor="end" fontFamily={FONT.mono} fontSize={14} letterSpacing={4} fill={fg}>
          {tail}
        </text>
      </g>
    );
  }
  const x = align === 'center' ? W / 2 : 80;
  const anchor = align === 'center' ? 'middle' : 'start';
  return (
    <g textAnchor={anchor}>
      <text x={x} y={top} fontFamily={FONT.mono} fontSize={14} letterSpacing={4} fill={acc}>
        {content.lineupTitle} — {content.date}
      </text>
      {content.lineup.map((a, i) => (
        <text key={a.id} x={x} y={top + 50 + i * (sq ? 40 : 54)} fontFamily={FONT.sans} fontWeight={700} fontSize={fitMeasured(`${a.name} ${a.detail}`, 840, { family: "'General Sans'", size: nameSize, weight: 700 })} fill={fg}>
          {a.name}
          <tspan fontFamily={FONT.mono} fontWeight={400} fontSize={sq ? 12 : 14} letterSpacing={2} opacity={0.7} dx={12}>
            {a.detail}
          </tspan>
        </text>
      ))}
    </g>
  );
}

function makePoster(spec: FamilySpec): FC<PosterProps> {
  return function FamilyPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
    const tone: Tone = { fg: colors.fg, accent: colors.background === 'accent' ? colors.paper : colors.accent };
    const sq = format === 'square';
    const W = 1000;
    const H = sq ? 1000 : 1500;
    const fg = colors.fg;
    const layout = settings.titleLayout;
    const variant = layout === 'symbol' ? 'symbol' : 'primary';
    const lay = layout === 'line' ? 'line' : 'stacked';
    const d = spec.dims(variant, lay, content.brand);
    const b = spec.box[sq ? 'square' : 'portrait'];
    const k = Math.min(b.w / d.w, b.h / d.h) * settings.logoScale * (layout === 'symbol' ? 0.82 : 1);
    const mw = d.w * k;
    const mh = d.h * k;
    const sig = lines(content.signature);
    return (
      <Artboard format={format} colors={colors} texture={settings.texture * 0.6} label={`${content.brand} — ${spec.Logo.name}`}>
        {settings.photo && (
          <g opacity={0.32}>
            <Photo width={W} height={H} kind="crowd" src={photoSrc} shadow={colors.bg} light={tone.accent} grain={0.5} />
          </g>
        )}
        {spec.decorate?.({ colors, sq, W, H, content, settings, tone })}
        <spec.Logo variant={variant} layout={lay} brand={content.brand} tone={tone} x={b.x + (b.w - mw) / 2} y={b.y + (b.h - mh) / 2} width={mw} height={mh} />
        <text x={80} y={sq ? 60 : 76} fontFamily={FONT.mono} fontSize={12} letterSpacing={4} fill={fg} opacity={0.75}>
          N° {content.editionNumber} · {content.edition}
        </text>
        <text x={W - 80} y={sq ? 60 : 76} textAnchor="end" fontFamily={FONT.mono} fontSize={12} letterSpacing={4} fill={fg} opacity={0.75}>
          {content.pillars}
        </text>
        {!sq && (
          <text x={W / 2} y={1010} textAnchor="middle" fontFamily={FONT.gambetta} fontStyle="italic" fontSize={28} fill={fg} opacity={0.9}>
            {sig.join(' · ').toLowerCase()}
          </text>
        )}
        <Info content={content} colors={{ ...colors, accent: tone.accent }} settings={settings} sq={sq} align={spec.infoAlign} />
        <line x1={80} x2={W - 80} y1={H - (sq ? 70 : 96)} y2={H - (sq ? 70 : 96)} stroke={fg} strokeOpacity={0.35} />
        <text x={80} y={H - (sq ? 38 : 56)} fontFamily={FONT.mono} fontSize={14} letterSpacing={5} fill={fg}>
          {content.venue}
        </text>
        <text x={W - 80} y={H - (sq ? 38 : 56)} textAnchor="end" fontFamily={FONT.mono} fontSize={11} letterSpacing={2} fill={fg} opacity={0.7}>
          {content.mentions || lines(content.manifesto)[0]}
        </text>
      </Artboard>
    );
  };
}

/* decorations ----------------------------------------------------------- */

const ringDecor: FamilySpec['decorate'] = ({ sq, tone }) => (
  <g fill="none" stroke={tone.accent} strokeWidth={1.2} opacity={0.35}>
    <circle cx={500} cy={sq ? 420 : 560} r={sq ? 380 : 440} strokeDasharray="2 12" strokeLinecap="round" />
  </g>
);

const locoDecor: FamilySpec['decorate'] = ({ sq, tone, W, H }) => {
  const r = rng(8);
  const dots = Array.from({ length: 9 }, () => ({ x: 60 + r() * (W - 120), y: 120 + r() * ((sq ? 0.6 : 0.55) * H), s: 8 + r() * 16 }));
  return (
    <Wobble amount={4}>
      <Glow sw={2}>
        {(w) => (
          <g fill="none" stroke={tone.fg} strokeWidth={w}>
            {dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.s} />
            ))}
          </g>
        )}
      </Glow>
    </Wobble>
  );
};

const vinylDecor: FamilySpec['decorate'] = ({ sq, tone }) => (
  <g fill="none" stroke={tone.accent} opacity={0.18}>
    {Array.from({ length: 14 }, (_, i) => (
      <circle key={i} cx={500} cy={sq ? 420 : 540} r={(sq ? 400 : 470) + i * 18} strokeWidth={0.8} />
    ))}
  </g>
);

const echoDecor: FamilySpec['decorate'] = ({ sq, tone, W }) => (
  <g stroke={tone.accent} strokeWidth={1} opacity={0.25}>
    {Array.from({ length: 18 }, (_, i) => (
      <line key={i} x1={-50 + i * 70} y1={sq ? 120 : 130} x2={-50 + i * 70 + (sq ? 300 : 420)} y2={sq ? 720 : 960} />
    ))}
    <line x1={0} x2={W} y1={sq ? 740 : 980} y2={sq ? 740 : 980} />
  </g>
);

const stickerDecor: FamilySpec['decorate'] = ({ sq, tone, content }) => {
  const r = rng(31);
  const spots = sq
    ? [
        { x: 860, y: 170, s: 120 },
        { x: 120, y: 640, s: 90 },
        { x: 880, y: 640, s: 80 },
      ]
    : [
        { x: 840, y: 180, s: 150 },
        { x: 140, y: 860, s: 110 },
        { x: 860, y: 860, s: 120 },
        { x: 150, y: 220, s: 80 },
      ];
  return (
    <g>
      {spots.map((p, i) => (
        <g key={i} transform={`rotate(${f1((r() - 0.5) * 40)} ${p.x} ${p.y})`}>
          <StickerLogo variant="symbol" brand={content.brand} tone={tone} x={p.x - p.s / 2} y={p.y - p.s / 2} width={p.s} height={p.s} />
        </g>
      ))}
    </g>
  );
};

/* ======================================================================= */
/* Definitions                                                             */
/* ======================================================================= */

const BASE = { paper: '#f4efe6', ink: '#050505' };
const RED = '#ff1f1f';

const familyTypography = (custom: string, note: string): ConceptDef['typography'] => [
  { role: 'Logo', family: custom, css: '', sample: 'UNE AUTRE ?', note, custom: true },
  { role: 'Programmation', family: 'General Sans', css: FONT.sans, weight: 700, sample: 'RAYHANE', note: 'Grotesque grasse, la même que les lettres creuses.' },
  { role: 'Infos', family: 'IBM Plex Mono', css: FONT.mono, weight: 400, sample: 'MARRACAS MARACAS', note: 'Mentions, dates, lieu.' },
];

export const anneau: ConceptDef = {
  id: 'anneau',
  index: '13',
  name: 'Anneau',
  short: 'Le logo actuel, affiné',
  description: 'Le logo existant de UNE AUTRE ?, redessiné proprement : capitales creuses posées sur un cercle, points ouverts et arcs fins.',
  rationale: [
    'Point de départ : le logo déjà utilisé par la marque. On garde ce qui le rend reconnaissable — lettres creuses rouges, « UNE » en haut, « AUTRE » en bas, le « ? » à droite — et on le reconstruit géométriquement : chaque lettre est calculée sur un vrai cercle.',
    'Les petits cercles ouverts et les arcs fins deviennent un système : ils peuvent ponctuer une story, encadrer une date, rythmer une affiche.',
    'C’est la piste de continuité : elle installe la marque sans rien casser de ce que le public connaît déjà.',
  ],
  base: BASE,
  palette: [
    { name: 'Noir', hex: '#050505', role: 'Fond' },
    { name: 'Rouge enseigne', hex: RED, role: 'Lettres creuses, arcs' },
    { name: 'Blanc cassé', hex: '#f4efe6', role: 'Texte d’information' },
  ],
  typography: familyTypography('Capitales creuses', 'Lettres au trait, posées une à une sur le cercle.'),
  defaults: { accent: RED, background: 'dark', titleLayout: 'stacked', logoScale: 1, texture: 0.25, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: RingLogo,
  Poster: makePoster({
    Logo: RingLogo,
    dims: ringDims,
    box: { portrait: { x: 120, y: 130, w: 760, h: 760 }, square: { x: 200, y: 90, w: 600, h: 600 } },
    infoAlign: 'center',
    decorate: ringDecor,
  }),
};

export const loco: ConceptDef = {
  id: 'loco',
  index: '14',
  name: 'Loco Néon',
  short: 'Néon dessiné, rouge, rebond',
  description: 'Des lettres au trait qui rebondissent, dessinées à la main en néon blanc sur fond rouge. Joyeux, nocturne, instantané.',
  rationale: [
    'Inspiration des enseignes dessinées à la main : chaque lettre a sa propre inclinaison et sa hauteur, le trait tremble légèrement (filtre de tracé à main levée), et brille comme un néon.',
    'Fond rouge plein, néon blanc : un code immédiatement lisible dans un fil Instagram, qui reste propre à UNE AUTRE ? grâce aux lettres creuses de la marque.',
    'Version secondaire « néon éteint » pour les usages imprimés ; le symbole est un « ? » qui grésille.',
  ],
  base: BASE,
  palette: [
    { name: 'Rouge plein', hex: '#d60000', role: 'Fond dominant' },
    { name: 'Néon blanc', hex: '#f4efe6', role: 'Lettres, halo' },
    { name: 'Noir', hex: '#050505', role: 'Contrepoint' },
  ],
  typography: familyTypography('Néon à main levée', 'Lettres creuses, rebond aléatoire, tracé tremblé, halo.'),
  defaults: { accent: '#d60000', background: 'accent', titleLayout: 'stacked', logoScale: 1, texture: 0.2, photo: false, infoLayout: 'stack', format: 'portrait' },
  Logo: LocoLogo,
  Poster: makePoster({
    Logo: LocoLogo,
    dims: locoDims,
    box: { portrait: { x: 70, y: 180, w: 860, h: 640 }, square: { x: 90, y: 110, w: 820, h: 520 } },
    infoAlign: 'center',
    decorate: locoDecor,
  }),
};

export const vinyle: ConceptDef = {
  id: 'vinyle',
  index: '15',
  name: 'Vinyle',
  short: 'Disque, sillons, étiquette',
  description: 'Le nom tourne autour d’un disque : sillons, texte en boucle, et un « ? » au trait sur l’étiquette rouge.',
  rationale: [
    'Le cercle du logo actuel devient un vinyle : le nom tourne en boucle sur le bord, comme une gravure, et l’étiquette centrale porte le « ? ».',
    'Le symbole (le disque sans texte) fonctionne en avatar, en sticker de platine ou en animation qui tourne en story.',
    'Les sillons continuent sur l’affiche : la musique est le sujet, pas un décor.',
  ],
  base: BASE,
  palette: [
    { name: 'Noir vinyle', hex: '#050505', role: 'Fond' },
    { name: 'Rouge étiquette', hex: '#ff2a1f', role: 'Étiquette, texte gravé' },
    { name: 'Blanc cassé', hex: '#f4efe6', role: 'Informations' },
  ],
  typography: familyTypography('Texte en boucle', 'Capitales creuses réparties sur toute la circonférence.'),
  defaults: { accent: '#ff2a1f', background: 'dark', titleLayout: 'stacked', logoScale: 1, texture: 0.25, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: VinylLogo,
  Poster: makePoster({
    Logo: VinylLogo,
    dims: vinylDims,
    box: { portrait: { x: 130, y: 150, w: 740, h: 780 }, square: { x: 210, y: 90, w: 580, h: 600 } },
    infoAlign: 'left',
    decorate: vinylDecor,
  }),
};

export const echo: ConceptDef = {
  id: 'echo',
  index: '16',
  name: 'Écho',
  short: 'Réverb, mouvement, trace',
  description: 'Les lettres creuses laissent derrière elles des échos qui s’effacent, comme une réverbération ou un mouvement de lumière.',
  rationale: [
    'Chaque lettre est répétée en traits fins, décalée et de plus en plus transparente : une réverbération visuelle, l’équivalent graphique d’un delay.',
    'L’écho donne de la profondeur sans 3D ni dégradé, et reste au trait — fidèle au style de la marque.',
    'Version secondaire sans écho, symbole « ? » en réverbération ; l’affiche prolonge le mouvement avec des diagonales.',
  ],
  base: BASE,
  palette: [
    { name: 'Noir', hex: '#050505', role: 'Fond' },
    { name: 'Rouge écho', hex: '#ff2d2d', role: 'Lettres et échos' },
    { name: 'Blanc cassé', hex: '#f4efe6', role: 'Informations' },
  ],
  typography: familyTypography('Lettres en écho', 'Contours répétés en dégradé d’opacité.'),
  defaults: { accent: '#ff2d2d', background: 'dark', titleLayout: 'stacked', logoScale: 1, texture: 0.25, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: EchoLogo,
  Poster: makePoster({
    Logo: EchoLogo,
    dims: echoDims,
    box: { portrait: { x: 70, y: 220, w: 860, h: 640 }, square: { x: 80, y: 120, w: 840, h: 520 } },
    infoAlign: 'left',
    decorate: echoDecor,
  }),
};

export const sticker: ConceptDef = {
  id: 'sticker',
  index: '17',
  name: 'Sticker',
  short: 'Badge, contour blanc, collé',
  description: 'La marque en stickers : badge rond rouge à liseré blanc, lettres pleines contourées, petits « ? » collés un peu partout.',
  rationale: [
    'Le cercle du logo devient un vrai sticker — fond rouge, liseré blanc épais, texte en arc, pointillés de découpe. Il se colle sur une platine, un frigo, un téléphone.',
    'Les lettres passent du creux au plein avec un contour blanc : plus lisibles de loin, très efficaces en story et en merchandising.',
    'L’affiche est une planche de stickers : le badge principal et des petits « ? » collés de travers.',
  ],
  base: BASE,
  palette: [
    { name: 'Noir', hex: '#050505', role: 'Fond' },
    { name: 'Rouge sticker', hex: '#ff1f1f', role: 'Badges' },
    { name: 'Blanc liseré', hex: '#f4efe6', role: 'Contours, lettres' },
  ],
  typography: familyTypography('Lettres sticker', 'Capitales pleines, contour blanc (paint-order).'),
  defaults: { accent: '#ff1f1f', background: 'dark', titleLayout: 'stacked', logoScale: 1, texture: 0.25, photo: false, infoLayout: 'split', format: 'portrait' },
  Logo: StickerLogo,
  Poster: makePoster({
    Logo: StickerLogo,
    dims: stickerDims,
    box: { portrait: { x: 170, y: 170, w: 660, h: 660 }, square: { x: 240, y: 90, w: 520, h: 520 } },
    infoAlign: 'center',
    decorate: stickerDecor,
  }),
};
