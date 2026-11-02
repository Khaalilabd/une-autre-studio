import { lines, splitBrand, splitDate } from '../data/content';
import type { ConceptDef, LogoProps, PosterProps, Tone } from '../data/types';
import { useUid } from '../graphics/common';
import { Photo } from '../graphics/Photo';
import { Artboard } from '../graphics/posterKit';
import { FONT } from '../lib/fonts';
import { fitMeasured, measure } from '../lib/measure';
import { f1 } from '../lib/rng';

/**
 * The emblem: a 3/4 hook + stem, and the dot of the "?" set free as a planet on
 * a tilted orbit. Geometry is parametric (centre cx, cy of the hook, radius r).
 */
const TILT = -14;
const orbitOf = (cx: number, cy: number, r: number) => ({ ox: cx, oy: cy + r * 1.2, rx: r * 1.55, ry: r * 0.5 });
const hookPath = (cx: number, cy: number, r: number, tail = 0.38) =>
  `M${f1(cx - r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 1 1 ${f1(cx)} ${f1(cy + r)}V${f1(cy + r + r * tail)}`;

function Emblem({ cx, cy, r, sw, fg, accent, orbit = true, orbitWidth = 1.5 }: { cx: number; cy: number; r: number; sw: number; fg: string; accent: string; orbit?: boolean; orbitWidth?: number }) {
  const o = orbitOf(cx, cy, r);
  const t = (TILT * Math.PI) / 180;
  const dx = -Math.sin(t) * o.ry;
  const dy = Math.cos(t) * o.ry;
  return (
    <g>
      {orbit && <ellipse cx={o.ox} cy={o.oy} rx={o.rx} ry={o.ry} fill="none" stroke={fg} strokeWidth={orbitWidth} transform={`rotate(${TILT} ${o.ox} ${o.oy})`} />}
      <path d={hookPath(cx, cy, r)} fill="none" stroke={fg} strokeWidth={sw} strokeLinecap="round" />
      <circle cx={f1(o.ox + dx)} cy={f1(o.oy + dy)} r={f1(Math.max(sw * 0.62, r * 0.17))} fill={accent} />
    </g>
  );
}

const DISPLAY = "'Syne'";

function QuestionLogo({ variant, brand, tone, layout = 'stacked', x, y, width, height }: LogoProps) {
  useUid();
  const { base, question } = splitBrand(brand);
  const word = base.toLowerCase();

  if (variant === 'symbol') {
    return (
      <svg viewBox="0 0 220 220" x={x} y={y} width={width ?? 220} height={height ?? 220}>
        <Emblem cx={110} cy={82} r={58} sw={20} fg={tone.fg} accent={tone.accent} orbitWidth={3} />
      </svg>
    );
  }

  if (variant === 'secondary') {
    const size = 80;
    const tw = measure(word, { family: DISPLAY, size, weight: 700, tracking: -2 });
    const W = tw + (question ? 82 : 0) + 20;
    return (
      <svg viewBox={`0 0 ${f1(W)} 120`} x={x} y={y} width={width ?? W} height={height ?? 120}>
        <text x={6} y={86} fontFamily={FONT.display} fontWeight={700} fontSize={size} letterSpacing={-2} fill={tone.fg}>
          {word}
        </text>
        {question && <Emblem cx={tw + 46} cy={42} r={22} sw={11} fg={tone.fg} accent={tone.accent} orbit={false} />}
      </svg>
    );
  }

  const size = 64;
  const tw = measure(word, { family: DISPLAY, size, weight: 500, tracking: 1 });
  if (layout === 'line') {
    const W = 240 + tw + 40;
    return (
      <svg viewBox={`0 0 ${f1(W)} 230`} x={x} y={y} width={width ?? W} height={height ?? 230}>
        <Emblem cx={115} cy={86} r={58} sw={20} fg={tone.fg} accent={tone.accent} orbitWidth={3} />
        <text x={240} y={140} fontFamily={FONT.display} fontWeight={500} fontSize={size} letterSpacing={1} fill={tone.fg}>
          {word}
        </text>
      </svg>
    );
  }
  const W = Math.max(320, tw + 40);
  return (
    <svg viewBox={`0 0 ${f1(W)} 340`} x={x} y={y} width={width ?? W} height={height ?? 340}>
      <Emblem cx={W / 2} cy={92} r={64} sw={22} fg={tone.fg} accent={tone.accent} orbitWidth={3} />
      <text x={W / 2} y={318} textAnchor="middle" fontFamily={FONT.display} fontWeight={500} fontSize={size} letterSpacing={1} fill={tone.fg}>
        {word}
      </text>
    </svg>
  );
}

const lineAspect = (brand: string) => {
  const tw = measure(splitBrand(brand).base.toLowerCase(), { family: DISPLAY, size: 64, weight: 500, tracking: 1 });
  return 230 / (240 + tw + 40);
};

/** Five interpretations of the sign, shown in the concept detail. */
function Explorations({ tone }: { tone: Tone }) {
  const cell = 200;
  const items: { label: string; node: JSX.Element }[] = [
    { label: 'Orbite', node: <Emblem cx={100} cy={74} r={46} sw={16} fg={tone.fg} accent={tone.accent} orbitWidth={2.5} /> },
    {
      label: 'Trajectoire',
      node: (
        <g fill="none" stroke={tone.fg} strokeLinecap="round">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <path key={k} d={hookPath(100, 78, 30 + k * 7, 0.5 - k * 0.04)} strokeWidth={2.2} opacity={1 - k * 0.13} />
          ))}
          <circle cx={100} cy={170} r={9} fill={tone.accent} stroke="none" />
        </g>
      ),
    },
    {
      label: 'Sculpture',
      node: (
        <g fill="none" strokeLinecap="round">
          {[6, 5, 4, 3, 2, 1, 0].map((k) => (
            <path key={k} d={hookPath(100 + k * 3, 70 + k * 4, 42, 0.45)} stroke={k === 0 ? tone.fg : tone.fg} strokeWidth={18} opacity={k === 0 ? 1 : 0.12 + (6 - k) * 0.05} />
          ))}
          <rect x={92} y={160} width={16} height={16} fill={tone.accent} transform="rotate(45 100 168)" />
        </g>
      ),
    },
    {
      label: 'Rotation',
      node: (
        <g fill="none" stroke={tone.fg}>
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={hookPath(100, 90, 52, 0)} strokeWidth={k === 0 ? 14 : 1.2} transform={`rotate(${k * 90} 100 90)`} opacity={k === 0 ? 1 : 0.5} strokeLinecap="round" />
          ))}
          <circle cx={100} cy={90} r={10} fill={tone.accent} stroke="none" />
        </g>
      ),
    },
    {
      label: 'Points',
      node: (
        <g fill={tone.fg}>
          {Array.from({ length: 34 }, (_, i) => {
            const t = i / 33;
            const a = Math.PI + t * Math.PI * 1.5;
            const px = t < 0.82 ? 100 + Math.cos(a) * 46 : 100;
            const py = t < 0.82 ? 76 + Math.sin(a) * 46 : 76 + 46 + (t - 0.82) * 160;
            return <circle key={i} cx={f1(px)} cy={f1(py)} r={2 + t * 5} />;
          })}
          <circle cx={100} cy={172} r={10} fill={tone.accent} />
        </g>
      ),
    },
  ];
  return (
    <div className="explorations">
      {items.map((it) => (
        <figure key={it.label}>
          <svg viewBox={`0 0 ${cell} ${cell}`}>{it.node}</svg>
          <figcaption>{it.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function QuestionPoster({ content, settings, colors, format, photoSrc }: PosterProps) {
  const id = useUid('qp');
  const sq = format === 'square';
  const fg = colors.fg;
  const s = settings.logoScale;
  const sig = lines(content.signature);
  const man = lines(content.manifesto);
  const { head, tail } = splitDate(content.date);
  const { base, question } = splitBrand(content.brand);
  const split = settings.infoLayout === 'split';
  const mono = { fontFamily: FONT.mono, fill: fg } as const;
  const layout = settings.titleLayout;

  const field = (cx: number, cy: number, r: number) => {
    const ringText = `${content.brand} · ${content.edition} · ${content.date} · `;
    return (
      <g>
        <defs>
          <path id={id + 'ring'} d={`M${cx} ${cy - r * 2.05}a${r * 2.05} ${r * 2.05} 0 1 1 -0.01 0`} />
          <clipPath id={id + 'lens'}>
            <circle cx={cx} cy={cy} r={r - 14 * s} />
          </clipPath>
        </defs>
        {settings.photo && (
          <g clipPath={`url(#${id}lens)`}>
            <Photo x={cx - r} y={cy - r} width={2 * r} height={2 * r} kind="stage" src={photoSrc} shadow={colors.ink} light={colors.paper} grain={0.6} />
          </g>
        )}
        {Array.from({ length: 10 }, (_, k) => (
          <path key={k} d={hookPath(cx, cy, r + 26 + k * 22, 0.25)} fill="none" stroke={fg} strokeWidth={1} opacity={0.75 - k * 0.06} />
        ))}
        {[-26, -8, 12].map((tilt, k) => {
          const o = orbitOf(cx, cy, r);
          return <ellipse key={k} cx={o.ox} cy={o.oy} rx={o.rx * (1.1 + k * 0.28)} ry={o.ry * (1 + k * 0.3)} fill="none" stroke={fg} strokeWidth={0.8} strokeDasharray={k === 1 ? '2 8' : undefined} transform={`rotate(${tilt} ${o.ox} ${o.oy})`} opacity={0.6} />;
        })}
        <Emblem cx={cx} cy={cy} r={r} sw={r * 0.3} fg={fg} accent={colors.accent} orbitWidth={2} />
        <text {...mono} fontSize={13} letterSpacing={5} opacity={0.9}>
          <textPath href={`#${id}ring`}>{ringText.repeat(Math.max(1, Math.floor((2 * Math.PI * r * 2.05) / (ringText.length * 12.8))))}</textPath>
        </text>
      </g>
    );
  };

  const lineup = (x: number, y: number, w: number, cols: number) => (
    <g>
      <text x={x} y={y} {...mono} fontSize={13} letterSpacing={4} opacity={0.8}>
        {content.lineupTitle}
      </text>
      {content.lineup.map((a, i) => {
        const col = cols === 1 ? 0 : i % cols;
        const row = cols === 1 ? i : Math.floor(i / cols);
        const cw = w / cols;
        const xx = x + col * cw;
        const yy = y + 50 + row * 88;
        return (
          <g key={a.id}>
            <circle cx={xx + 5} cy={yy - 12} r={5} fill={i === content.lineup.length - 1 ? colors.accent : 'none'} stroke={fg} strokeWidth={1.2} />
            <text x={xx + 22} y={yy} fontFamily={FONT.display} fontWeight={700} fontSize={fitMeasured(a.name, cw - 40, { family: DISPLAY, size: 36, weight: 700 })} fill={fg}>
              {a.name}
            </text>
            <text x={xx + 22} y={yy + 28} {...mono} fontSize={13} letterSpacing={2} opacity={0.8}>
              {a.detail}
            </text>
          </g>
        );
      })}
    </g>
  );

  const wordmark = (x: number, y: number, maxW: number, size: number) => {
    const word = base.toLowerCase();
    const fs = fitMeasured(word, maxW - (question ? size * 0.8 : 0), { family: DISPLAY, size, weight: 800, tracking: -size * 0.03 });
    const tw = measure(word, { family: DISPLAY, size: fs, weight: 800, tracking: -fs * 0.03 });
    return (
      <g>
        <text x={x} y={y} fontFamily={FONT.display} fontWeight={800} fontSize={fs} letterSpacing={-fs * 0.03} fill={fg}>
          {word}
        </text>
        {question && <Emblem cx={x + tw + fs * 0.36} cy={y - fs * 0.56} r={fs * 0.17} sw={fs * 0.09} fg={fg} accent={colors.accent} orbit={false} />}
      </g>
    );
  };

  if (sq) {
    return (
      <Artboard format={format} colors={colors} texture={settings.texture * 0.6} label={`${content.brand} — carré`}>
        {layout === 'line' ? (
          <>
            {field(310, 320, 140 * s)}
            {wordmark(50, 740, 900, 170)}
          </>
        ) : (
          field(330, 380, (layout === 'symbol' ? 190 : 160) * s)
        )}
        {layout === 'stacked' && wordmark(50, 790, 560, 110)}
        <text x={950} y={70} textAnchor="end" {...mono} fontSize={13} letterSpacing={3}>
          {content.edition}
        </text>
        {layout !== 'line' && lineup(690, 190, 270, 1)}
        <text x={layout === 'line' ? 650 : 690} y={layout === 'line' ? 140 : 600} fontFamily={FONT.display} fontWeight={800} fontSize={90} fill={colors.accent === colors.ink ? fg : colors.accent}>
          {head}
        </text>
        <text x={layout === 'line' ? 652 : 692} y={layout === 'line' ? 172 : 632} {...mono} fontSize={14} letterSpacing={3}>
          {tail}
        </text>
        {layout === 'line' && lineup(650, 260, 300, 1)}
        <line x1={50} x2={950} y1={880} y2={880} stroke={fg} strokeWidth={1} />
        <text x={50} y={930} {...mono} fontSize={14} letterSpacing={3}>
          {content.venue}
        </text>
        <text x={950} y={930} textAnchor="end" {...mono} fontSize={12} letterSpacing={2}>
          {content.pillars}
        </text>
      </Artboard>
    );
  }

  return (
    <Artboard format={format} colors={colors} texture={settings.texture * 0.6} label={`${content.brand} — affiche`}>
      <text x={60} y={74} {...mono} fontSize={13} letterSpacing={3}>
        N° {content.editionNumber}
      </text>
      <text x={940} y={74} textAnchor="end" {...mono} fontSize={13} letterSpacing={3}>
        {content.edition}
      </text>
      {layout === 'line' ? (
        <>
          {field(500, 380, 150 * s)}
          {wordmark(54, 880, 892, 200)}
        </>
      ) : (
        field(500, 440, (layout === 'symbol' ? 230 : 190) * s)
      )}
      {layout === 'stacked' && wordmark(56, 1000, 888, 150)}
      <text x={60} y={layout === 'line' ? 950 : 1060} {...mono} fontSize={15} letterSpacing={3}>
        {sig.join(' / ')}
      </text>
      {split ? (
        <>
          {lineup(60, 1140, 560, 1)}
          <line x1={650} x2={650} y1={1120} y2={1400} stroke={fg} strokeWidth={1} />
          <text x={680} y={1240} fontFamily={FONT.display} fontWeight={800} fontSize={fitMeasured(head, 260, { family: DISPLAY, size: 150, weight: 800 })} fill={colors.accent === colors.ink ? fg : colors.accent}>
            {head}
          </text>
          <text x={684} y={1282} {...mono} fontSize={16} letterSpacing={3}>
            {tail}
          </text>
          {man.map((m, i) => (
            <text key={i} x={684} y={1330 + i * 22} {...mono} fontSize={11} letterSpacing={2} opacity={0.7}>
              {m}
            </text>
          ))}
        </>
      ) : (
        <>
          {lineup(60, 1140, 880, 2)}
          <text x={940} y={1394} textAnchor="end" fontFamily={FONT.display} fontWeight={800} fontSize={fitMeasured(content.date, 880, { family: DISPLAY, size: 46, weight: 800 })} fill={colors.accent === colors.ink ? fg : colors.accent}>
            {content.date}
          </text>
        </>
      )}
      <line x1={60} x2={940} y1={1420} y2={1420} stroke={fg} strokeWidth={1} />
      <text x={60} y={1458} {...mono} fontSize={14} letterSpacing={3}>
        {content.venue}
      </text>
      <text x={940} y={1458} textAnchor="end" {...mono} fontSize={13} letterSpacing={2}>
        {content.mentions || content.pillars}
      </text>
    </Artboard>
  );
}

export const question: ConceptDef = {
  id: 'question',
  index: '05',
  name: 'Abstract Question',
  short: 'Le signe, l’orbite',
  description: 'Le « ? » devient l’emblème : un crochet, et son point libéré sur une orbite. Curiosité, mouvement, retour.',
  rationale: [
    'Le point du « ? » quitte la ligne et devient une planète en orbite : chaque édition est une révolution, le même lieu vu sous un autre angle.',
    'Le symbole tient seul (avatar, bracelet, projection) et se décline : orbite, trajectoire, sculpture, rotation, points — un système, pas un dessin figé.',
    'L’affiche est un champ de forces : sillons concentriques comme un vinyle, orbites, texte circulaire. La photographie apparaît comme à travers un objectif, au cœur du signe.',
  ],
  base: { paper: '#f0ebe1', ink: '#0b0b0c' },
  palette: [
    { name: 'Nuit', hex: '#0b0b0c', role: 'Fond' },
    { name: 'Ivoire', hex: '#f0ebe1', role: 'Signe, texte' },
    { name: 'Planète', hex: '#e0262f', role: 'Point en orbite' },
  ],
  typography: [
    { role: 'Emblème', family: 'Orbite', css: '', sample: '?', note: 'Signe paramétrique : crochet + orbite + point.', custom: true },
    { role: 'Wordmark', family: 'Syne', css: FONT.display, weight: 800, sample: 'une autre', note: 'Minuscules serrées, approche négative.' },
    { role: 'Infos', family: 'IBM Plex Mono', css: FONT.mono, weight: 400, sample: 'MÊME LIEU / MÊMES GENS', note: 'Texte circulaire, mentions.' },
  ],
  defaults: {
    accent: '#e0262f',
    background: 'dark',
    titleLayout: 'stacked',
    logoScale: 1,
    texture: 0.35,
    photo: false,
    infoLayout: 'split',
    format: 'portrait',
  },
  Logo: QuestionLogo,
  Poster: QuestionPoster,
  Explorations,
};

export { lineAspect as questionLineAspect };
