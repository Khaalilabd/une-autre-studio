import { useState, type ReactNode } from 'react';
import * as THREE from 'three';
import type { EventContent } from '../data/types';
import { RingLogo } from '../graphics/ringLogo';
import { FONT } from '../lib/fonts';
import { fitMeasured } from '../lib/measure';
import { download, rasterize, slug, toSvgDocument } from '../lib/exporter';
import { useStudio } from '../state/store';
import { svgTexture, Viewer3D } from './Viewer3D';
import { ColorRow } from './Wristbands';
import { DJ_DROPS, DROPS, TeeMock } from './teeDrops';

/**
 * Crew T-shirts: ten print designs (front + back) shown on a 3D tee you can
 * turn, with shirt colour, inks, role, name and print scale editable, and the
 * print files (transparent PNG / SVG) ready for the screen-printer.
 */

const RED = '#ff1f1f';
// print areas, in mm (1 unit = 1 mm)
const FRONT = { w: 280, h: 340 };
const BACK = { w: 300, h: 400 };

export interface Ink {
  content: EventContent;
  ink: string;
  accent: string;
  role: string;
  name: string;
  scale: number;
}

export interface TeeDesign {
  id: string;
  name: string;
  idea: string;
  shirt: string;
  ink: string;
  accent: string;
  Front: (p: Ink) => JSX.Element;
  Back: (p: Ink) => JSX.Element;
}

const Scaled = ({ w, h, k, children }: { w: number; h: number; k: number; children: ReactNode }) => <g transform={`translate(${w / 2} ${h * 0.12}) scale(${k}) translate(${-w / 2} ${-h * 0.12})`}>{children}</g>;
const round = (x: number, y: number, t: string, size: number, fill: string, o: { anchor?: 'start' | 'middle' | 'end'; outline?: boolean; weight?: number; maxW?: number } = {}) => {
  const fs = o.maxW ? fitMeasured(t, o.maxW, { family: "'Fredoka'", size, weight: o.weight ?? 700 }) : size;
  return (
    <text x={x} y={y} textAnchor={o.anchor ?? 'middle'} fontFamily={FONT.round} fontWeight={o.weight ?? 700} fontSize={fs} fill={o.outline ? 'none' : fill} stroke={o.outline ? fill : undefined} strokeWidth={o.outline ? fs * 0.045 : undefined} strokeLinejoin="round">
      {t}
    </text>
  );
};
const mono = (x: number, y: number, t: string, size: number, fill: string) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={size} letterSpacing={size * 0.25} fill={fill}>
    {t}
  </text>
);

const BASICS: TeeDesign[] = [
  {
    id: 'anneau',
    name: 'Anneau',
    idea: 'Le logo en petit sur le cœur, en grand dans le dos avec CREW et le rôle. Le t-shirt d’équipe classique, impeccable.',
    shirt: '#111111',
    ink: '#ffffff',
    accent: RED,
    Front: ({ content, accent, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        <RingLogo brand={content.brand} cx={205} cy={70} R={34} cap={16} stroke={accent} weight={2.4} />
      </Scaled>
    ),
    Back: ({ content, ink, accent, role, scale }) => (
      <Scaled w={BACK.w} h={BACK.h} k={scale}>
        <RingLogo brand={content.brand} cx={150} cy={140} R={92} cap={42} stroke={accent} weight={4} />
        {round(150, 300, 'CREW', 74, ink)}
        {mono(150, 338, role.toUpperCase(), 14, ink)}
        {mono(150, 364, `N°${content.editionNumber}`, 12, accent)}
      </Scaled>
    ),
  },
  {
    id: 'staff',
    name: 'Staff',
    idea: 'UNE AUTRE ? en contour sur la poitrine, CREW énorme dans le dos avec le rôle et le prénom : on repère l’équipe de loin dans la foule.',
    shirt: '#e3121b',
    ink: '#ffffff',
    accent: '#111111',
    Front: ({ content, ink, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        {round(140, 110, content.brand.toUpperCase(), 56, ink, { outline: true, maxW: 240 })}
      </Scaled>
    ),
    Back: ({ content, ink, accent, role, name, scale }) => (
      <Scaled w={BACK.w} h={BACK.h} k={scale}>
        {round(150, 170, 'CREW', 128, ink)}
        {round(150, 236, role.toUpperCase(), 52, accent, { maxW: 260 })}
        {name && mono(150, 276, name.toUpperCase(), 16, ink)}
        <RingLogo brand={content.brand} cx={150} cy={340} R={28} cap={13} stroke={ink} weight={1.8} />
      </Scaled>
    ),
  },
  {
    id: 'ruban',
    name: 'Ruban',
    idea: 'Le grand « ? » de Ruban sur la poitrine, son point en rouge ; dans le dos, l’anneau et CREW en contour. Le t-shirt assorti aux affiches.',
    shirt: '#0b1240',
    ink: '#e6eaf6',
    accent: RED,
    Front: ({ ink, accent, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        <text x={140} y={250} textAnchor="middle" fontFamily={FONT.round} fontWeight={700} fontSize={270} fill={ink}>
          ?
        </text>
        <circle cx={140} cy={220} r={21} fill={accent} />
      </Scaled>
    ),
    Back: ({ content, ink, accent, role, scale }) => (
      <Scaled w={BACK.w} h={BACK.h} k={scale}>
        <RingLogo brand={content.brand} cx={150} cy={120} R={70} cap={32} stroke={accent} weight={3} />
        {round(150, 262, 'CREW', 92, ink, { outline: true })}
        {mono(150, 300, role.toUpperCase(), 14, ink)}
      </Scaled>
    ),
  },
  {
    id: 'signature',
    name: 'Signature',
    idea: 'Un petit « ? » cerclé à la place de la poche ; dans le dos, la promesse en trois lignes, la dernière en rouge. Sobre et fort.',
    shirt: '#f4efe6',
    ink: '#111111',
    accent: RED,
    Front: ({ accent, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        <circle cx={205} cy={66} r={22} fill="none" stroke={accent} strokeWidth={3} />
        {round(205, 78, '?', 34, accent)}
      </Scaled>
    ),
    Back: ({ content, ink, accent, role, scale }) => {
      const sig = content.signature
        .split('\n')
        .map((l) => l.trim().toUpperCase())
        .filter(Boolean);
      const rows = sig.length ? sig : ['MÊME LIEU', 'MÊMES GENS', 'UNE AUTRE EXPÉRIENCE'];
      return (
        <Scaled w={BACK.w} h={BACK.h} k={scale}>
          {rows.map((r, i) => (
            <text key={i} x={150} y={110 + i * 64} textAnchor="middle" fontFamily={FONT.sans} fontWeight={700} fontSize={fitMeasured(r, 270, { family: "'General Sans'", size: 58, weight: 700, tracking: -1.5 })} letterSpacing={-1.5} fill={i === rows.length - 1 ? accent : ink}>
              {r}
            </text>
          ))}
          {mono(150, 330, `CREW · ${role.toUpperCase()} · N°${content.editionNumber}`, 12, ink)}
        </Scaled>
      );
    },
  },
  {
    id: 'neon',
    name: 'Néon',
    idea: 'L’anneau du logo en grand sur la poitrine, double contour comme un tube de néon ; dans le dos, juste CREW sous le col.',
    shirt: '#0b0b0b',
    ink: '#ffffff',
    accent: RED,
    Front: ({ content, accent, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        <RingLogo brand={content.brand} cx={140} cy={150} R={92} cap={42} stroke={accent} weight={7} />
        <RingLogo brand={content.brand} cx={140} cy={150} R={92} cap={42} stroke="#ffd0d0" weight={1.8} />
      </Scaled>
    ),
    Back: ({ ink, accent, role, scale }) => (
      <Scaled w={BACK.w} h={BACK.h} k={scale}>
        {round(150, 60, 'CREW', 40, ink)}
        {mono(150, 84, role.toUpperCase(), 11, accent)}
      </Scaled>
    ),
  },
  {
    id: 'ondes',
    name: 'Ondes',
    idea: 'Un motif sonore circulaire, presque technique : un petit détail sur le cœur et une grande empreinte abstraite au dos.',
    shirt: '#172034',
    ink: '#e8e4d9',
    accent: '#54a9ca',
    Front: ({ ink, accent, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={187 + i * 7} y={65 - [0, 8, 15, 5, 0][i]} width="3" height={[13, 29, 43, 23, 12][i]} rx="1.5" fill={i === 2 ? accent : ink} />)}
        {mono(204, 102, 'UA / 01', 6, ink)}
      </Scaled>
    ),
    Back: ({ content, ink, accent, scale }) => (
      <Scaled w={BACK.w} h={BACK.h} k={scale}>
        <circle cx="150" cy="177" r="78" fill="none" stroke={ink} strokeWidth="1.5" opacity=".55" />
        <circle cx="150" cy="177" r="59" fill="none" stroke={accent} strokeWidth="2" opacity=".8" />
        <circle cx="150" cy="177" r="35" fill="none" stroke={ink} strokeWidth="1.5" opacity=".5" />
        <path d="M72 177 Q84 177 91 157 T108 177 T125 198 T142 149 T159 203 T176 161 T193 177 T210 193 T228 177" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <circle cx="150" cy="177" r="5" fill={accent} />
        <path d="M150 99V125M150 229V255M72 177H98M202 177H228M95 122L113 140M187 214L205 232M205 122L187 140M113 214L95 232" stroke={accent} strokeWidth="2" />
        {mono(150, 292, 'UNE AUTRE ?  /  FREQUENCE 01', 9, ink)}
        {mono(150, 326, `${content.editionNumber} · SIGNAL SONORE`, 8, accent)}
      </Scaled>
    ),
  },
  {
    id: 'cablage',
    name: 'Câblage',
    idea: 'Des lignes de câbles qui se croisent et se branchent : l’image d’un crew où chaque voix et chaque instrument trouve sa place.',
    shirt: '#e6e1d5',
    ink: '#263c38',
    accent: '#cf5e43',
    Front: ({ ink, accent, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        <path d="M190 54 C190 79 218 67 218 89 C218 99 208 101 202 95" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        <circle cx="202" cy="92" r="5" fill={accent} />
        <path d="M202 97v8m-5 0h10" stroke={accent} strokeWidth="2" />
      </Scaled>
    ),
    Back: ({ content, ink, accent, scale }) => (
      <Scaled w={BACK.w} h={BACK.h} k={scale}>
        <path d="M53 88 C238 88 64 132 246 132 C76 132 235 176 54 176 C232 176 66 220 246 220 C75 220 232 264 54 264" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <path d="M53 88 C238 88 64 132 246 132 C76 132 235 176 54 176 C232 176 66 220 246 220 C75 220 232 264 54 264" fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="2 7" />
        {[[53, 88], [246, 132], [54, 176], [246, 220], [54, 264]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="8" fill={i % 2 ? accent : ink} /><circle cx={x} cy={y} r="3" fill="#e6e1d5" /></g>)}
        {mono(150, 314, 'GUITARE · VOIX · DJ', 10, ink)}
        {mono(150, 344, `${content.brand} · N°${content.editionNumber}`, 8, accent)}
      </Scaled>
    ),
  },
  {
    id: 'modulation',
    name: 'Modulation',
    idea: 'Des lignes continues et décalées, comme plusieurs couches sonores qui se répondent sans former un slogan.',
    shirt: '#d9d4c6',
    ink: '#313d2e',
    accent: '#bd563d',
    Front: ({ ink, accent, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        <path d="M187 62 C195 49 203 49 211 62 S227 75 235 62" fill="none" stroke={ink} strokeWidth="3" />
        <path d="M187 72 C195 59 203 59 211 72 S227 85 235 72" fill="none" stroke={accent} strokeWidth="2" />
        <path d="M187 82 C195 69 203 69 211 82 S227 95 235 82" fill="none" stroke={ink} strokeWidth="1.5" />
      </Scaled>
    ),
    Back: ({ content, ink, accent, scale }) => (
      <Scaled w={BACK.w} h={BACK.h} k={scale}>
        <path d="M48 110 C80 52 114 52 148 110 S216 168 250 110" fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" />
        <path d="M48 132 C80 74 114 74 148 132 S216 190 250 132" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" />
        <path d="M48 154 C80 96 114 96 148 154 S216 212 250 154" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M48 176 C80 118 114 118 148 176 S216 234 250 176" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M53 256H247" stroke={ink} strokeWidth="1" />
        {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={69 + i * 32} cy="256" r={i === 3 ? 5 : 2.5} fill={i === 3 ? accent : ink} />)}
        {mono(150, 300, 'MIX / MORPH / REPEAT', 9, ink)}
        {mono(150, 332, `${content.brand} · ${content.editionNumber}`, 8, accent)}
      </Scaled>
    ),
  },
  {
    id: 'matrice',
    name: 'Matrice',
    idea: 'Un code graphique construit comme une petite table de mixage : répétitions, contrastes et repères décentrés.',
    shirt: '#252623',
    ink: '#e8e1cf',
    accent: '#b5c77a',
    Front: ({ ink, accent, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        <path d="M190 54h34v27h-34z" fill="none" stroke={ink} strokeWidth="2" />
        <path d="M196 75V64M203 75V59M210 75V68M217 75V62" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </Scaled>
    ),
    Back: ({ content, ink, accent, scale }) => (
      <Scaled w={BACK.w} h={BACK.h} k={scale}>
        {Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, col) => {
          const x = 56 + col * 27;
          const y = 73 + row * 27;
          const active = (row * 3 + col * 5 + row * col) % 4 === 0;
          const emphasis = (row === 3 && col === 3) || (row + col === 6);
          return <rect key={`${row}-${col}`} x={x} y={y} width={emphasis ? 17 : 10} height={emphasis ? 17 : 10} rx={emphasis ? 4 : 1} fill={active ? accent : 'none'} stroke={active ? accent : ink} strokeWidth="1.5" opacity={active ? 1 : .55} />;
        }))}
        <path d="M72 292H228" stroke={ink} strokeWidth="1" />
        <path d="M78 306h22m8 0h40m8 0h18m8 0h34" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        {mono(150, 336, `${content.brand} · N°${content.editionNumber}`, 8, ink)}
      </Scaled>
    ),
  },
  {
    id: 'eclats',
    name: 'Éclats',
    idea: 'Des formes facettées donnent une empreinte énergique, pensée pour la scène plutôt que pour un simple uniforme.',
    shirt: '#27334b',
    ink: '#e8e4d9',
    accent: '#f0a36f',
    Front: ({ ink, accent, scale }) => (
      <Scaled w={FRONT.w} h={FRONT.h} k={scale}>
        <path d="M204 55L220 70L211 89L193 84L190 66Z" fill="none" stroke={ink} strokeWidth="2" />
        <path d="M204 55L211 72L220 70M211 72L193 84M211 72L211 89" fill="none" stroke={accent} strokeWidth="2" />
      </Scaled>
    ),
    Back: ({ content, ink, accent, scale }) => (
      <Scaled w={BACK.w} h={BACK.h} k={scale}>
        <path d="M150 69L181 132L235 120L198 172L236 216L177 209L150 276L124 208L66 221L105 174L69 124L126 134Z" fill="none" stroke={ink} strokeWidth="2" />
        <path d="M150 69L150 169L181 132ZM150 169L235 120L181 132ZM150 169L198 172L236 216ZM150 169L177 209L150 276ZM150 169L124 208L66 221ZM150 169L105 174L69 124ZM150 169L126 134L150 69Z" fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M150 69V169M66 221L150 169L236 216M69 124L150 169L235 120" stroke={ink} strokeWidth="1" opacity=".7" />
        <circle cx="150" cy="169" r="5" fill={accent} />
        {mono(150, 316, 'STAGE / 01', 9, ink)}
        {mono(150, 344, `${content.brand} · ${content.editionNumber}`, 8, accent)}
      </Scaled>
    ),
  },
];

/** Drop 01 first (illustrated merch), then the earlier crew basics. */
export const TEE_DESIGNS: TeeDesign[] = [...DJ_DROPS, ...DROPS, ...BASICS];
export const isDrop = (d: TeeDesign) => DROPS.includes(d);
export const isDj = (d: TeeDesign) => DJ_DROPS.includes(d);

const frontSvg = (d: TeeDesign, p: Ink) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${FRONT.w} ${FRONT.h}`} width={FRONT.w} height={FRONT.h}>
    <d.Front {...p} />
  </svg>
);
const backSvg = (d: TeeDesign, p: Ink) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${BACK.w} ${BACK.h}`} width={BACK.w} height={BACK.h}>
    <d.Back {...p} />
  </svg>
);

/* ======================================================================= */
/* 3D tee                                                                   */
/* ======================================================================= */

/** T-shirt silhouette in cm (right half mirrored), extruded with a soft bevel. */
function teeGeometry() {
  const R: [number, number][] = [
    [25, -38],
    [26.2, -36.6],
    [25.4, 22.5],
    [29.5, 17.2],
    [35.5, 24.2],
    [22, 35.3],
    [9.2, 37.6],
  ];
  const s = new THREE.Shape();
  s.moveTo(0, -38);
  R.forEach(([x, y]) => s.lineTo(x, y));
  s.quadraticCurveTo(4, 31.5, 0, 31.4);
  s.quadraticCurveTo(-4, 31.5, -9.2, 37.6);
  [...R].reverse().forEach(([x, y]) => s.lineTo(-x, y));
  s.lineTo(0, -38);
  const g = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: true, bevelThickness: 1.7, bevelSize: 1.7, bevelSegments: 8, curveSegments: 32 });
  g.translate(0, 0, -1.5);
  g.scale(0.1, 0.1, 0.1);
  g.computeVertexNormals();
  return g;
}
const FACE = 0.1 * (1.5 + 1.7) + 0.004;

export type View = 'tour' | 'devant' | 'dos';

export function Tee3D({ d, p, shirt, view }: { d: TeeDesign; p: Ink; shirt: string; view: View }) {
  return (
    <Viewer3D
      className="tee-viewer"
      background="#141518"
      camera={[0, 0.6, 19]}
      target={[0, 0.1, 0]}
      autoRotate={view === 'tour'}
      deps={[d.id, shirt, JSON.stringify({ ...p, content: undefined }), p.content, view]}
      setup={({ scene, renderer, controls, camera }) => {
        const floor = scene.getObjectByName('floor');
        if (floor) floor.position.y = -4.4;
        if (view !== 'tour') {
          camera.position.set(0, 0.6, view === 'devant' ? 19 : -19);
          controls.update();
        }
        const group = new THREE.Group();
        scene.add(group);
        const geo = teeGeometry();
        const mat = new THREE.MeshPhysicalMaterial({ color: shirt, roughness: 0.92, sheen: 0.35, sheenRoughness: 0.85, sheenColor: new THREE.Color(shirt).lerp(new THREE.Color('#ffffff'), 0.15), envMapIntensity: 0.35 });
        const body = new THREE.Mesh(geo, mat);
        body.castShadow = true;
        group.add(body);
        let alive = true;
        const extra: (() => void)[] = [];
        const decal = (node: JSX.Element, w: number, h: number, cy: number, back: boolean) =>
          svgTexture(node, Math.round(w * 5), Math.round(h * 5), renderer).then((tex) => {
            if (!alive) return tex.dispose();
            const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(w / 100, h / 100), m);
            plane.position.set(0, cy, back ? -FACE : FACE);
            if (back) plane.rotation.y = Math.PI;
            group.add(plane);
            extra.push(() => {
              tex.dispose();
              m.dispose();
              plane.geometry.dispose();
            });
          });
        decal(frontSvg(d, p), FRONT.w, FRONT.h, 1.65, false);
        decal(backSvg(d, p), BACK.w, BACK.h, 1.15, true);
        return () => {
          alive = false;
          scene.remove(group);
          geo.dispose();
          mat.dispose();
          extra.forEach((f) => f());
        };
      }}
    />
  );
}

/* ======================================================================= */
/* flat previews + page                                                     */
/* ======================================================================= */

const TEE_PATH =
  'M0 380L250 380L262 366L254 -225L295 -172L355 -242L220 -353L92 -376Q40 -315 0 -314Q-40 -315 -92 -376L-220 -353L-355 -242L-295 -172L-254 -225L-262 366L-250 380Z';

export function FlatTee({ d, p, shirt, side, background = '#1a1b1f' }: { d: TeeDesign; p: Ink; shirt: string; side: 'front' | 'back'; background?: string }) {
  const area = side === 'front' ? FRONT : BACK;
  const cy = side === 'front' ? -165 : -115;
  return (
    <svg viewBox="-400 -400 800 800" className="tee-flat">
      <rect x={-400} y={-400} width={800} height={800} fill={background} />
      <path d={TEE_PATH} fill="#000000" opacity={0.4} transform="translate(8 14)" />
      <path d={TEE_PATH} fill={shirt} />
      {side === 'back' && <path d="M-92 -376Q0 -350 92 -376" fill="none" stroke="#000000" strokeOpacity={0.25} strokeWidth={6} />}
      <svg x={-area.w / 2} y={cy - area.h / 2} width={area.w} height={area.h} viewBox={`0 0 ${area.w} ${area.h}`} overflow="visible">
        {side === 'front' ? <d.Front {...p} /> : <d.Back {...p} />}
      </svg>
      <text x={0} y={395} textAnchor="middle" fontFamily={FONT.mono} fontSize={14} letterSpacing={4} fill="#8d887d">
        {side === 'front' ? 'DEVANT' : 'DOS'} · ZONE {area.w / 10} × {area.h / 10} CM
      </text>
    </svg>
  );
}

const SHIRTS: [string, string][] = [
  ['#111111', 'Noir'],
  ['#f4efe6', 'Crème'],
  ['#ffffff', 'Blanc'],
  ['#e3121b', 'Rouge'],
  ['#0b1240', 'Bleu nuit'],
];

export function Crew() {
  const { content } = useStudio();
  const [sel, setSel] = useState(TEE_DESIGNS[0].id);
  const d = TEE_DESIGNS.find((x) => x.id === sel)!;
  const [shirt, setShirt] = useState(d.shirt);
  const [ink, setInk] = useState(d.ink);
  const [accent, setAccent] = useState(d.accent);
  const [role, setRole] = useState('Bar');
  const [name, setName] = useState('');
  const [scale, setScale] = useState(1);
  const [view, setView] = useState<View>('tour');
  const [busy, setBusy] = useState(false);
  const p: Ink = { content, ink, accent, role, name, scale };
  const pick = (id: string) => {
    const x = TEE_DESIGNS.find((k) => k.id === id)!;
    setSel(id);
    setShirt(x.shirt);
    setInk(x.ink);
    setAccent(x.accent);
  };
  const base = `${slug(content.brand)}_tshirt-crew-${d.id}`;
  const png = async (side: 'front' | 'back') => {
    setBusy(true);
    try {
      const a = side === 'front' ? FRONT : BACK;
      const doc = await toSvgDocument(side === 'front' ? frontSvg(d, p) : backSvg(d, p));
      download(await rasterize(doc, Math.round((a.w / 25.4) * 300), Math.round((a.h / 25.4) * 300)), `${base}_${side === 'front' ? 'devant' : 'dos'}_300dpi.png`);
    } finally {
      setBusy(false);
    }
  };
  const svg = async (side: 'front' | 'back') => {
    const a = side === 'front' ? FRONT : BACK;
    let doc = await toSvgDocument(side === 'front' ? frontSvg(d, p) : backSvg(d, p));
    doc = doc.replace(/<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, `<svg$1 width="${a.w}mm" height="${a.h}mm"`);
    download(doc, `${base}_${side === 'front' ? 'devant' : 'dos'}.svg`);
  };
  return (
    <div className="table-view bracelets">
      {!location.hash.includes('drops') && <section className="series">
        <header className="series-head">
          <p className="series-kicker">T-shirts Crew · {String(TEE_DESIGNS.length).padStart(2, '0')} prototypes · 3D</p>
          <h2>L’équipe, habillée UNE AUTRE ?</h2>
          <p>Le crew porte l’identité : choisissez un design, la couleur du t-shirt et des encres, écrivez le rôle et le prénom, tournez le t-shirt en 3D pour voir devant et dos. Les fichiers d’impression (PNG transparent 300 dpi ou SVG à l’échelle) sont prêts pour la sérigraphie ou le DTF.</p>
        </header>
        <div className="wb-studio">
          <div className="wb-stage">
            <Tee3D d={d} p={p} shirt={shirt} view={view} />
            <div className="tee-flats">
              <TeeMock d={d} p={p} shirt={shirt} side="front" />
              <TeeMock d={d} p={p} shirt={shirt} side="back" />
            </div>
          </div>
          <aside className="live-controls wb-controls">
            <section>
              <h4>Design</h4>
              <div className="tee-picks">
                {TEE_DESIGNS.map((x) => (
                  <button key={x.id} className={x.id === sel ? 'on' : ''} onClick={() => pick(x.id)}>
                    <TeeMock d={x} p={{ ...p, ink: x.ink, accent: x.accent }} shirt={x.shirt} side="back" label={false} />
                    <span>
                      {isDj(x) && <small>DJ crew · </small>}
                      {isDrop(x) && <small>Drop 01 · </small>}
                      {x.name}
                    </span>
                  </button>
                ))}
              </div>
              <p className="wb-idea">{d.idea}</p>
            </section>
            <section>
              <h4>Couleurs</h4>
              <div className="lc-row">
                <span>T-shirt</span>
                <div className="lc-choice">
                  {SHIRTS.map(([c, l]) => (
                    <button key={c} className={c === shirt ? 'on' : ''} onClick={() => setShirt(c)} title={l}>
                      <i style={{ background: c }} className="tee-swatch" />
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <ColorRow label="T-shirt (libre)" value={shirt} onChange={setShirt} />
              <ColorRow label="Encre" value={ink} onChange={setInk} />
              <ColorRow label="Accent" value={accent} onChange={setAccent} />
            </section>
            <section>
              <h4>Texte</h4>
              <label className="lc-row">
                <span>Rôle</span>
                <input className="tee-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Bar, Sécurité, DJ…" />
              </label>
              <label className="lc-row">
                <span>Prénom</span>
                <input className="tee-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="(facultatif)" />
              </label>
              <label className="lc-row">
                <span>Taille du visuel</span>
                <input type="range" min={0.7} max={1.2} step={0.01} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
                <code>{Math.round(scale * 100)} %</code>
              </label>
            </section>
            <section>
              <h4>Vue 3D</h4>
              <div className="lc-row">
                <span>Caméra</span>
                <div className="lc-choice">
                  {(
                    [
                      ['tour', 'Tour auto'],
                      ['devant', 'Devant'],
                      ['dos', 'Dos'],
                    ] as [View, string][]
                  ).map(([v, l]) => (
                    <button key={v} className={v === view ? 'on' : ''} onClick={() => setView(v)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <section>
              <h4>Fichiers d’impression</h4>
              <dl className="wb-spec">
                <div>
                  <dt>Devant</dt>
                  <dd>Zone 28 × 34 cm</dd>
                </div>
                <div>
                  <dt>Dos</dt>
                  <dd>Zone 30 × 40 cm</dd>
                </div>
                <div>
                  <dt>Technique</dt>
                  <dd>Sérigraphie (1–2 couleurs) ou DTF ; PNG à fond transparent</dd>
                </div>
              </dl>
              <div className="wb-actions">
                <button className="tbtn solid" disabled={busy} onClick={() => png('front')}>
                  Devant PNG
                </button>
                <button className="tbtn solid" disabled={busy} onClick={() => png('back')}>
                  Dos PNG
                </button>
                <button className="tbtn" onClick={() => svg('front')}>
                  Devant SVG
                </button>
                <button className="tbtn" onClick={() => svg('back')}>
                  Dos SVG
                </button>
              </div>
            </section>
          </aside>
        </div>
      </section>}
      <section className="series drop-book">
        <header className="series-head">
          <p className="series-kicker">Réservé aux DJ du crew · {DJ_DROPS.length} t-shirts · logo en anneau</p>
          <h2>Seuls les DJ du crew les portent</h2>
          <p>Quatre pièces construites sur le vrai logo UNE AUTRE ? et son « ? ». Jamais vendues : elles signalent les DJ du crew sur scène. Écrivez un prénom dans le panneau au-dessus, il s’imprime sur Résident, Rotation et Sceau.</p>
        </header>
        <div className="drop-grid">
          {DJ_DROPS.map((x, i) => (
            <button key={x.id} className={`drop-card ${x.id === sel ? 'on' : ''}`} onClick={() => { pick(x.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <div className="drop-shots">
                <TeeMock d={x} p={{ ...p, ink: x.ink, accent: x.accent, scale: 1 }} shirt={x.shirt} side="front" label={false} />
                <TeeMock d={x} p={{ ...p, ink: x.ink, accent: x.accent, scale: 1 }} shirt={x.shirt} side="back" label={false} />
              </div>
              <div className="drop-meta">
                <span>DJ {String(i + 1).padStart(2, '0')}</span>
                <h3>{x.name}</h3>
                <p>{x.idea.replace(/^Réservé aux DJ du crew · /, '')}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="series drop-book">
        <header className="series-head">
          <p className="series-kicker">Drop 01 · {DROPS.length} t-shirts illustrés · devant / dos</p>
          <h2>Le merch, comme une vraie marque</h2>
          <p>Des pièces pensées comme un drop streetwear : petit signe sur le cœur, composition forte dans le dos, chacune raconte une part du concept. Cliquez une pièce pour la régler et la voir en 3D au-dessus.</p>
        </header>
        <div className="drop-grid">
          {DROPS.map((x, i) => (
            <button key={x.id} className={`drop-card ${x.id === sel ? 'on' : ''}`} onClick={() => { pick(x.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <div className="drop-shots">
                <TeeMock d={x} p={{ ...p, ink: x.ink, accent: x.accent, role: 'Crew', name: '', scale: 1 }} shirt={x.shirt} side="front" label={false} />
                <TeeMock d={x} p={{ ...p, ink: x.ink, accent: x.accent, role: 'Crew', name: '', scale: 1 }} shirt={x.shirt} side="back" label={false} />
              </div>
              <div className="drop-meta">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <h3>{x.name}</h3>
                <p>{x.idea.replace(/^Drop 01 · /, '')}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
