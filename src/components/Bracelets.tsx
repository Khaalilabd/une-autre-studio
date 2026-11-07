import { useMemo, type ReactNode } from 'react';
import type { EventContent } from '../data/types';
import { useUid } from '../graphics/common';
import { RingLogo } from '../graphics/ringLogo';
import { FONT } from '../lib/fonts';
import { f1 } from '../lib/rng';
import { useStudio } from '../state/store';
import { Band3D, DESIGNS, FabricPasses, type StandKind } from './Wristbands';

/**
 * Bracelets — entry wristbands (no paper/cardboard) and hand-made gift
 * bracelets, all carrying the ring logo. Each one is drawn as a mock-up
 * (some animated where the material does something: UV ink, NFC, reflective
 * print) with a production sheet next to it.
 */

const RED = '#ff1f1f';
const VW = 800;
const VH = 520;

interface Item {
  id: string;
  name: string;
  tag: string;
  Art: (p: { content: EventContent }) => JSX.Element;
  matter: string;
  special: string;
  why: string;
}

/* ---------- shared drawing helpers ---------- */

function Surface({ tone, children }: { tone: string; children: ReactNode }) {
  const id = useUid('sf');
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} role="img">
      <defs>
        <radialGradient id={id} cx="0.4" cy="0.35" r="0.9">
          <stop offset="0" stopColor={tone} />
          <stop offset="1" stopColor="#050505" />
        </radialGradient>
        <filter id={id + 'n'} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} />
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0" />
        </filter>
      </defs>
      <rect width={VW} height={VH} fill={`url(#${id})`} />
      <rect width={VW} height={VH} filter={`url(#${id}n)`} />
      {children}
    </svg>
  );
}

function Shadow({ children, dx = 10, dy = 16, sd = 10, opacity = 0.55 }: { children: ReactNode; dx?: number; dy?: number; sd?: number; opacity?: number }) {
  const id = useUid('sh');
  return (
    <g>
      <defs>
        <filter id={id} x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation={sd} />
        </filter>
      </defs>
      <g transform={`translate(${dx} ${dy})`} filter={`url(#${id})`} opacity={opacity}>
        {children}
      </g>
    </g>
  );
}

/** A twisted cord along a path. */
function Cord({ d, color, w = 9 }: { d: string; color: string; w?: number }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={color} strokeWidth={w} />
      <path d={d} stroke="#ffffff" strokeOpacity={0.22} strokeWidth={w} strokeDasharray={`${w * 0.5} ${w * 0.7}`} />
      <path d={d} stroke="#000000" strokeOpacity={0.25} strokeWidth={w * 0.3} transform={`translate(0 ${w * 0.25})`} />
    </g>
  );
}

/** Macramé sliding knot: tight wraps around the cords. */
function Knot({ x, y, color, n = 7, rot = 0 }: { x: number; y: number; color: string; n?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={-n * 5 + i * 10} y={-11} width={9} height={22} rx={4.5} fill={color} stroke="#000000" strokeOpacity={0.35} />
      ))}
    </g>
  );
}

function Wood({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#b98353" />
      <stop offset="0.5" stopColor="#8a5a33" />
      <stop offset="1" stopColor="#5e3a1f" />
    </linearGradient>
  );
}

function Brass({ id }: { id: string }) {
  return (
    <radialGradient id={id} cx="0.35" cy="0.3" r="0.85">
      <stop offset="0" stopColor="#fff1c2" />
      <stop offset="0.45" stopColor="#d9a845" />
      <stop offset="1" stopColor="#7a5418" />
    </radialGradient>
  );
}

/** Charm swing (gift pieces hang and move a little). */
const Swing = ({ x, y, deg = 6, dur = 3 }: { x: number; y: number; deg?: number; dur?: number }) => (
  <animateTransform attributeName="transform" type="rotate" values={`${-deg} ${x} ${y};${deg} ${x} ${y};${-deg} ${x} ${y}`} dur={`${dur}s`} calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" repeatCount="indefinite" />
);

/* ======================================================================= */
/* entry wristbands                                                         */
/* ======================================================================= */

/** Flat strap, slightly curved, with a woven pattern of logos. */
function Strap({ y, h, color, thread, content, logos = true, sheen }: { y: number; h: number; color: string; thread: string; content: EventContent; logos?: boolean; sheen?: string }) {
  const id = useUid('st');
  const d = `M40 ${y}C260 ${y - 40} 540 ${y - 40} 740 ${y}L740 ${y + h}C540 ${y + h - 40} 260 ${y + h - 40} 40 ${y + h}Z`;
  const label = `${content.brand} · N°${content.editionNumber} · `;
  return (
    <g>
      <defs>
        <clipPath id={id + 'c'}>
          <path d={d} />
        </clipPath>
        <pattern id={id + 'w'} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width={6} height={6} fill={color} />
          <rect width={3} height={6} fill="#ffffff" opacity={0.05} />
        </pattern>
        <path id={id + 'p'} d={`M60 ${y + h * 0.5 + 6}C270 ${y + h * 0.5 - 34} 530 ${y + h * 0.5 - 34} 720 ${y + h * 0.5 + 6}`} />
        {sheen && (
          <linearGradient id={id + 's'} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={sheen} stopOpacity={0} />
            <stop offset="0.5" stopColor={sheen} stopOpacity={0.9} />
            <stop offset="1" stopColor={sheen} stopOpacity={0} />
          </linearGradient>
        )}
      </defs>
      <Shadow>
        <path d={d} fill="#000000" />
      </Shadow>
      <path d={d} fill={`url(#${id}w)`} />
      <g clipPath={`url(#${id}c)`}>
        <path d={`M40 ${y + 5}C260 ${y - 35} 540 ${y - 35} 740 ${y + 5}`} stroke={thread} strokeWidth={2} fill="none" strokeDasharray="4 3" opacity={0.8} />
        <path d={`M40 ${y + h - 5}C260 ${y + h - 45} 540 ${y + h - 45} 740 ${y + h - 5}`} stroke={thread} strokeWidth={2} fill="none" strokeDasharray="4 3" opacity={0.8} />
        {logos ? (
          <text fontFamily={FONT.round} fontWeight={700} fontSize={h * 0.42} letterSpacing={3} fill="none" stroke={thread} strokeWidth={1.6}>
            <textPath href={`#${id}p`}>{(label + '◯ ').repeat(4)}</textPath>
          </text>
        ) : null}
        {sheen && (
          <rect x={-300} y={y - 60} width={260} height={h + 120} fill={`url(#${id}s)`} transform="skewX(-20)">
            <animate attributeName="x" values="-300;900" dur="2.8s" repeatCount="indefinite" />
          </rect>
        )}
      </g>
    </g>
  );
}

function Bead({ x, y, r = 22, label }: { x: number; y: number; r?: number; label?: string }) {
  const id = useUid('bd');
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f5f7" />
          <stop offset="0.45" stopColor="#a9adb5" />
          <stop offset="1" stopColor="#4d5058" />
        </linearGradient>
      </defs>
      <rect x={x - r * 1.3} y={y - r} width={r * 2.6} height={r * 2} rx={r * 0.5} fill={`url(#${id})`} stroke="#2a2c31" strokeWidth={1.5} />
      {label && (
        <text x={x} y={y + r * 0.42} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={r * 1.2} fill="none" stroke="#2a2c31" strokeWidth={1.6}>
          {label}
        </text>
      )}
    </g>
  );
}

function JacquardArt({ content }: { content: EventContent }) {
  return (
    <Surface tone="#2a1414">
      <Strap y={210} h={92} color="#0c0c0c" thread={RED} content={content} />
      <path d="M740 210L790 256L740 302Z" fill="#0c0c0c" />
      <Bead x={690} y={252} r={30} label="?" />
      <text x={400} y={420} textAnchor="middle" fontFamily={FONT.mono} fontSize={16} letterSpacing={4} fill="#ffffff" opacity={0.6}>
        TISSAGE JACQUARD · PERLE ALU INVIOLABLE
      </text>
    </Surface>
  );
}

/** Silicone band seen in perspective, text debossed with UV-reactive ink. */
function SiliconeArt({ content }: { content: EventContent }) {
  const id = useUid('si');
  const cx = 400;
  const cy = 260;
  const rx = 260;
  const ry = 120;
  const ring = `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
  const label = `${content.brand}  ◯  N°${content.editionNumber}  ◯  `;
  return (
    <Surface tone="#1d1030">
      <defs>
        <path id={id} d={`M${cx - rx + 8} ${cy + 6}A${rx - 8} ${ry - 4} 0 0 0 ${cx + rx - 8} ${cy + 6}`} />
        <filter id={id + 'g'} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation={5} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={VW} height={VH} fill="#3a0a6a" opacity={0}>
        <animate attributeName="opacity" values="0;0;0.55;0.55;0" keyTimes="0;0.4;0.5;0.9;1" dur="6s" repeatCount="indefinite" />
      </rect>
      <Shadow dy={30} sd={18}>
        <path d={ring} fill="none" stroke="#000000" strokeWidth={56} />
      </Shadow>
      <path d={ring} fill="none" stroke="#111114" strokeWidth={56} />
      <path d={ring} fill="none" stroke="#ffffff" strokeOpacity={0.12} strokeWidth={4} transform="translate(0 -22)" />
      <text fontFamily={FONT.round} fontWeight={700} fontSize={30} letterSpacing={4} fill="#1b1b1f" stroke="#000000" strokeWidth={1}>
        <textPath href={`#${id}`} startOffset="6%">
          {label}
        </textPath>
      </text>
      <g filter={`url(#${id}g)`} opacity={0}>
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.4;0.5;0.9;1" dur="6s" repeatCount="indefinite" />
        <text fontFamily={FONT.round} fontWeight={700} fontSize={30} letterSpacing={4} fill="#ff4fd1">
          <textPath href={`#${id}`} startOffset="6%">
            {label}
          </textPath>
        </text>
      </g>
      <text x={400} y={470} textAnchor="middle" fontFamily={FONT.mono} fontSize={16} letterSpacing={4} fill="#ffffff" opacity={0.6}>
        JOUR · LUMIÈRE NOIRE (UV)
      </text>
    </Surface>
  );
}

function NfcArt({ content }: { content: EventContent }) {
  const id = useUid('nf');
  return (
    <Surface tone="#141a24">
      <Strap y={232} h={62} color="#101010" thread="#5a5a5a" content={content} logos={false} />
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ff8a8a" />
          <stop offset="0.5" stopColor={RED} />
          <stop offset="1" stopColor="#6a0606" />
        </radialGradient>
      </defs>
      {[0, 1, 2].map((k) => (
        <circle key={k} cx={400} cy={250} r={110} fill="none" stroke={RED} strokeWidth={3} opacity={0}>
          <animate attributeName="r" values="110;240" dur="2.4s" begin={`${k * 0.8}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0" dur="2.4s" begin={`${k * 0.8}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <Shadow dy={18}>
        <circle cx={400} cy={250} r={112} fill="#000000" />
      </Shadow>
      <circle cx={400} cy={250} r={112} fill={`url(#${id})`} stroke="#4a0404" strokeWidth={3} />
      <circle cx={400} cy={250} r={98} fill="none" stroke="#ffffff" strokeOpacity={0.3} strokeWidth={2} />
      <RingLogo brand={content.brand} cx={400} cy={250} R={64} cap={30} stroke="#5a0505" fill="#ff5a5a" weight={1.5} />
      <text x={400} y={450} textAnchor="middle" fontFamily={FONT.mono} fontSize={16} letterSpacing={4} fill="#ffffff" opacity={0.6}>
        ENTRÉE · VESTIAIRE · BAR — SANS CONTACT
      </text>
    </Surface>
  );
}

function ReflectArt({ content }: { content: EventContent }) {
  return (
    <Surface tone="#2a0808">
      <Strap y={200} h={84} color="#b30f12" thread="#ff6b6b" content={content} sheen="#ffffff" />
      <path d="M40 200L0 242L40 284Z" fill="#b30f12" />
      <path d="M740 200L780 242L740 284Z" fill="#b30f12" />
      <text x={400} y={420} textAnchor="middle" fontFamily={FONT.mono} fontSize={16} letterSpacing={4} fill="#ffffff" opacity={0.6}>
        ENCRE RÉTRO-RÉFLÉCHISSANTE · S’ALLUME AU FLASH
      </text>
    </Surface>
  );
}

/* ======================================================================= */
/* hand-made gifts                                                          */
/* ======================================================================= */

/** Bracelet loop seen from above: an open ellipse of cord with a knot. */
const loopPath = (cx: number, cy: number, rx: number, ry: number) => `M${cx - 40} ${cy + ry}C${cx - rx * 1.1} ${cy + ry} ${cx - rx} ${cy - ry} ${cx} ${cy - ry}C${cx + rx} ${cy - ry} ${cx + rx * 1.1} ${cy + ry} ${cx + 40} ${cy + ry}`;

function WoodQArt() {
  const id = useUid('wq');
  return (
    <Surface tone="#3a2a10">
      <defs>
        <Wood id={id} />
      </defs>
      <Cord d={loopPath(400, 230, 260, 150)} color={RED} />
      <Knot x={400} y={380} color={RED} />
      <path d="M362 382C330 420 320 440 300 470M438 382C470 420 480 440 500 470" fill="none" stroke={RED} strokeWidth={6} strokeLinecap="round" />
      <g>
        <Swing x={400} y={80} />
        <line x1={400} y1={80} x2={400} y2={112} stroke="#d9a845" strokeWidth={4} />
        <circle cx={400} cy={80} r={8} fill="none" stroke="#d9a845" strokeWidth={4} />
        <Shadow dx={8} dy={10} sd={6}>
          <text x={400} y={290} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={240} fill="#000000">
            ?
          </text>
        </Shadow>
        <text x={404} y={294} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={240} fill="#3a220f">
          ?
        </text>
        <text x={400} y={290} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={240} fill={`url(#${id})`} stroke={RED} strokeWidth={5}>
          ?
        </text>
      </g>
    </Surface>
  );
}

function MedalArt({ content }: { content: EventContent }) {
  const id = useUid('md');
  return (
    <Surface tone="#2a2418">
      <defs>
        <Brass id={id} />
      </defs>
      <Cord d={loopPath(400, 250, 280, 150)} color="#111111" w={7} />
      <circle cx={250} cy={355} r={11} fill={RED} />
      <circle cx={550} cy={355} r={11} fill={RED} />
      <Knot x={400} y={400} color="#111111" />
      <g>
        <Swing x={400} y={110} deg={4} dur={3.6} />
        <Shadow dy={14} sd={8}>
          <circle cx={400} cy={240} r={120} fill="#000000" />
        </Shadow>
        <circle cx={400} cy={240} r={120} fill={`url(#${id})`} stroke="#6a4a14" strokeWidth={3} />
        <circle cx={400} cy={240} r={106} fill="none" stroke="#6a4a14" strokeOpacity={0.6} strokeWidth={2} />
        <RingLogo brand={content.brand} cx={400} cy={240} R={68} cap={32} stroke="#5a3c0c" weight={2.2} />
        <circle cx={400} cy={114} r={10} fill="none" stroke="#d9a845" strokeWidth={4} />
      </g>
    </Surface>
  );
}

function BeadsArt({ content }: { content: EventContent }) {
  const letters = useMemo(() => {
    const t = content.brand.toUpperCase().replace(/\s+/g, '·');
    return [...t].filter((c) => c.trim());
  }, [content.brand]);
  const n = Math.max(18, letters.length + 8);
  const cx = 400;
  const cy = 260;
  const rx = 250;
  const ry = 170;
  const start = Math.floor((n - letters.length) / 2) + Math.round(n * 0.25);
  return (
    <Surface tone="#2a1a14">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#d8d2c8" strokeWidth={2} opacity={0.6} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + Math.PI / 2;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        const k = (i - start + n) % n;
        const ch = k < letters.length ? letters[k] : '';
        const q = ch === '?';
        return (
          <g key={i}>
            <circle cx={f1(x + 3)} cy={f1(y + 5)} r={24} fill="#000000" opacity={0.4} />
            <circle cx={f1(x)} cy={f1(y)} r={24} fill={q ? RED : ch ? '#f2eee6' : '#141414'} stroke="#000000" strokeOpacity={0.4} />
            <circle cx={f1(x - 8)} cy={f1(y - 9)} r={6} fill="#ffffff" opacity={0.35} />
            {ch && ch !== '·' && (
              <text x={f1(x)} y={f1(y + 9)} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={26} fill={q ? '#ffffff' : '#111111'}>
                {ch}
              </text>
            )}
          </g>
        );
      })}
    </Surface>
  );
}

function CollectionArt({ content }: { content: EventContent }) {
  const id = useUid('co');
  const colors = [RED, '#111111', '#d8c3a0', '#1d4fd8'];
  const ed = Number(content.editionNumber) || 1;
  return (
    <Surface tone="#2c2a14">
      <defs>
        <Wood id={id} />
      </defs>
      {colors.map((c, i) => {
        const y = 140 + i * 78;
        const d = `M40 ${y + 30}C220 ${y - 20} 580 ${y - 20} 760 ${y + 30}`;
        const tx = 200 + i * 130;
        return (
          <g key={i}>
            <Cord d={d} color={c} w={8} />
            <g transform={`translate(${tx} ${y + 4})`}>
              <Shadow dx={5} dy={7} sd={4}>
                <circle r={34} fill="#000000" />
              </Shadow>
              <circle r={34} fill={`url(#${id})`} stroke="#3a220f" strokeWidth={2} />
              <circle r={27} fill="none" stroke={c === '#111111' ? '#3a220f' : c} strokeWidth={3} />
              <text y={9} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={24} fill="#2a1608">
                {String(ed + i).padStart(2, '0')}
              </text>
            </g>
          </g>
        );
      })}
    </Surface>
  );
}

function JasminArt() {
  return (
    <Surface tone="#1a2a22">
      <Cord d={loopPath(400, 250, 260, 140)} color={RED} w={5} />
      <Knot x={400} y={390} color={RED} n={5} />
      <g>
        <Swing x={400} y={110} deg={7} dur={2.8} />
        <line x1={400} y1={110} x2={400} y2={150} stroke="#d9a845" strokeWidth={3} />
        <g transform="translate(400 220)">
          <Shadow dx={6} dy={10} sd={6}>
            {[0, 1, 2, 3, 4].map((k) => (
              <ellipse key={k} cx={0} cy={-46} rx={26} ry={46} transform={`rotate(${k * 72})`} fill="#000000" />
            ))}
          </Shadow>
          {[0, 1, 2, 3, 4].map((k) => (
            <ellipse key={k} cx={0} cy={-46} rx={26} ry={46} transform={`rotate(${k * 72 + 10})`} fill="#fbf8f1" stroke="#cfc6b4" strokeWidth={2} />
          ))}
          <circle r={18} fill="#f2c84b" />
          <text y={9} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={26} fill={RED}>
            ?
          </text>
        </g>
      </g>
      <circle cx={300} cy={372} r={10} fill={RED} />
      <circle cx={500} cy={372} r={10} fill={RED} />
    </Surface>
  );
}

/* ======================================================================= */
/* page                                                                     */
/* ======================================================================= */

const ENTRY: Item[] = [
  {
    id: 'jacquard',
    name: 'Tissé jacquard',
    tag: 'Entrée · standard',
    Art: JacquardArt,
    matter: 'Ruban polyester tissé jacquard 15 mm, noir, fils rouges. Fermeture par perle en aluminium gravée « ? », sertie à l’entrée : inviolable, impossible à repasser à quelqu’un.',
    special: 'Le logo en anneau est tissé dans la trame (pas imprimé) et se répète tout autour du poignet, avec le numéro d’édition. Une couleur de fil par édition.',
    why: 'Il se garde des mois au poignet après la soirée : c’est de la visibilité gratuite, et on le reconnaît sans lire.',
  },
  {
    id: 'uv',
    name: 'Silicone lumière noire',
    tag: 'Entrée · effet spécial',
    Art: SiliconeArt,
    matter: 'Bracelet silicone noir mat, texte en creux rempli d’encre réactive aux UV.',
    special: 'De jour, le bracelet est presque muet. Sous la lumière noire de la salle, UNE AUTRE ? s’allume en rose néon — le bracelet « s’active » quand on entre.',
    why: 'Le même objet, une autre expérience : exactement la promesse de la marque, au poignet.',
  },
  {
    id: 'nfc',
    name: 'Médaille NFC',
    tag: 'Entrée · sans contact',
    Art: NfcArt,
    matter: 'Sangle tissée noire + médaille ronde (silicone ou époxy) contenant une puce NFC programmable.',
    special: 'Entrée, vestiaire et bar sans contact avec le même bracelet. La médaille porte l’anneau UNE AUTRE ? en relief ; le dos change à chaque édition.',
    why: 'Fluidifie la file, réduit la fraude, et la médaille reprend l’affiche Médaille : tout se répond.',
  },
  {
    id: 'reflect',
    name: 'Satin réfléchissant',
    tag: 'Entrée · photos',
    Art: ReflectArt,
    matter: 'Ruban satin rouge, motif de logos imprimé en encre rétro-réfléchissante, deux pointes coupées en biais.',
    special: 'À l’œil, un ruban rouge sobre. Au flash d’un téléphone, le motif explose en blanc sur la photo.',
    why: 'Chaque story prise dans la soirée fait apparaître la marque — le bracelet devient une pub.',
  },
];

const GIFTS: Item[] = [
  {
    id: 'woodq',
    name: 'Le « ? » en bois',
    tag: 'Cadeau · fait main',
    Art: WoodQArt,
    matter: 'Cordon ciré rouge tressé, nœud coulissant macramé, breloque « ? » découpée au laser dans du bois, chant laqué rouge, anneau laiton.',
    special: 'Le « ? » est dessiné dans la police ronde du logo. Ajustable, il s’offre à tous les âges.',
    why: 'L’équivalent de vos citrons en bois : un petit objet simple que tout le monde veut, avec le signe de la marque.',
  },
  {
    id: 'medal',
    name: 'La médaille anneau',
    tag: 'Cadeau · fait main',
    Art: MedalArt,
    matter: 'Disque laiton gravé (ou bois gravé au laser), anneau UNE AUTRE ? en creux, cordon noir, deux perles rouges.',
    special: 'Le logo complet tient sur la médaille ; au dos, la date de la soirée gravée.',
    why: 'Le cadeau « premium » pour les artistes, le staff et les fidèles.',
  },
  {
    id: 'beads',
    name: 'Perles lettres',
    tag: 'Cadeau · fait main',
    Art: BeadsArt,
    matter: 'Perles noires et crème sur élastique, une perle par lettre, la perle du « ? » en rouge.',
    special: 'Le nom se lit tout autour du poignet, comme le logo se lit tout autour de l’anneau.',
    why: 'Facile et peu coûteux à produire en grand nombre, à faire sur place en atelier pendant la soirée.',
  },
  {
    id: 'collection',
    name: 'La collection',
    tag: 'Cadeau · par édition',
    Art: CollectionArt,
    matter: 'Un cordon d’une couleur différente à chaque édition, avec un jeton en bois numéroté (01, 02, 03…).',
    special: 'On les empile au poignet, édition après édition : le bras raconte combien de fois on est venu.',
    why: 'La fidélité rendue visible — comme sur votre photo de référence, mais avec notre système de numéros.',
  },
  {
    id: 'jasmin',
    name: 'Jasmin',
    tag: 'Cadeau · été',
    Art: JasminArt,
    matter: 'Fil rouge fin, petite fleur de jasmin émaillée blanche, cœur jaune marqué d’un « ? » rouge, deux perles rouges.',
    special: 'Le jasmin des nuits tunisiennes, devenu bijou de la marque.',
    why: 'Le cadeau des éditions d’été, qu’on garde comme un souvenir.',
  },
];

function Card({ item, content }: { item: Item; content: EventContent }) {
  return (
    <article className="bracelet-card">
      <div className="bracelet-art">
        <item.Art content={content} />
      </div>
      <div className="bracelet-text">
        <p className="bracelet-tag">{item.tag}</p>
        <h3>{item.name}</h3>
        <dl>
          <dt>Matière</dt>
          <dd>{item.matter}</dd>
          <dt>Le détail spécial</dt>
          <dd>{item.special}</dd>
          <dt>Pourquoi</dt>
          <dd>{item.why}</dd>
        </dl>
      </div>
    </article>
  );
}

export function Bracelets() {
  const { content } = useStudio();
  // #/bracelets?flat=<id> — the flat print file only (quick preview, no 3D)
  const flat = /[?&]flat=([a-z0-9,]+)/.exec(location.hash)?.[1];
  const fds = flat ? DESIGNS.filter((d) => flat.split(',').includes(d.id)) : [];
  // #/bracelets?view=<id>&stand=table — one 3D band only (quick preview)
  const view = /[?&]view=([a-z0-9]+)/.exec(location.hash)?.[1];
  const vd = view && DESIGNS.find((d) => d.id === view);
  if (vd) {
    const st = (/[?&]stand=([a-z]+)/.exec(location.hash)?.[1] ?? 'poignet') as StandKind;
    return (
      <div className="table-view bracelets" style={{ padding: 0, height: '100vh' }}>
        <div style={{ height: '100vh' }} className="wb-solo">
          <Band3D d={vd} pal={vd.pal} clasp={vd.clasp} stand={st} spin={false} content={content} />
        </div>
      </div>
    );
  }
  if (fds.length)
    return (
      <div className="table-view bracelets" style={{ padding: 24, display: 'grid', gap: 14 }}>
        {fds.map((fd) => (
          <svg key={fd.id} viewBox="0 0 3500 150" style={{ width: '100%', display: 'block' }}>
            <fd.Band content={content} pal={fd.pal} />
          </svg>
        ))}
      </div>
    );
  return (
    <div className="table-view bracelets">
      <FabricPasses />
      <section className="series">
        <header className="series-head">
          <p className="series-kicker">Bracelets cadeaux · {String(GIFTS.length).padStart(2, '0')} propositions · faits main</p>
          <h2>À offrir, à garder</h2>
          <p>Des petits objets faits main, simples et désirables, qui portent l’identité : le « ? » rond du logo, la médaille anneau, les perles lettres, une couleur par édition, le jasmin.</p>
        </header>
        <div className="bracelet-grid">
          {GIFTS.map((it) => (
            <Card key={it.id} item={it} content={content} />
          ))}
        </div>
      </section>
      <section className="series">
        <header className="series-head">
          <p className="series-kicker">Autres matières · {String(ENTRY.length).padStart(2, '0')} options spéciales</p>
          <h2>Options spéciales</h2>
          <p>Le bracelet est le premier objet de la soirée et celui qu’on garde le plus longtemps. Chaque proposition porte l’anneau UNE AUTRE ? et un effet que le carton ne peut pas offrir : tissé, lumière noire, sans contact, réfléchissant.</p>
        </header>
        <div className="bracelet-grid">
          {ENTRY.map((it) => (
            <Card key={it.id} item={it} content={content} />
          ))}
        </div>
      </section>
    </div>
  );
}
