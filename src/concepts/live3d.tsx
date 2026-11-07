import { useEffect, useState, type FC } from 'react';
import { cachedStill, Live3D, loadParams, renderStill, type LiveParams } from '../components/Live3D';
import type { ConceptDef, CreativeSettings, EventContent, PosterProps } from '../data/types';
import { Artboard } from '../graphics/posterKit';
import { InfoLayer, RUBAN } from './matiere';
import { neonlogo, rubanrouge } from './logo';
import { corail, mercure, rubanhalo, rubanorbite } from './matiere';

/**
 * Série 63–67 — « 3D temps réel ». Five presets of the same live engine:
 * the "?" as a real volume that turns and breaks into shards, the UNE AUTRE ?
 * ring orbiting it, Ruban's layout on top — every parameter editable live.
 * Stills, table thumbnails and SVG exports reuse the closest SVG poster.
 */

const BASE: LiveParams = {
  bg: '#050a24',
  glow: '#1636d8',
  body: '#e6eaf6',
  dot: '#e6eaf6',
  ring: '#ff1f1f',
  text: '#f4f6fb',
  matter: 'argile',
  roughness: 0.55,
  metalness: 0.12,
  shards: 0.9,
  spike: 0.34,
  motion: 'balancier',
  speed: 1,
  swing: 0.95,
  size: 1.06,
  ringOn: true,
  ringSize: 1,
  ringTilt: 0.32,
  ringSpeed: 1,
  textOn: true,
  loop: 14,
};

const SERIES = 'live3d';
const live = (id: string, preset: LiveParams) =>
  function LivePreset({ content, settings }: { content: EventContent; settings: CreativeSettings }) {
    return <Live3D id={id} content={content} settings={settings} preset={preset} />;
  };

/** Cover = a real still of the 3D scene with the current settings (falls back to the SVG poster while it renders). */
function livePoster(id: string, preset: LiveParams, Fallback: FC<PosterProps>): FC<PosterProps> {
  return function LivePoster(props: PosterProps) {
    const { content, settings, format } = props;
    const p = loadParams(id, preset);
    const [url, setUrl] = useState<string | null>(() => cachedStill(content.brand, p));
    const key = JSON.stringify(p) + content.brand;
    useEffect(() => {
      let alive = true;
      renderStill(content.brand, p).then((u) => alive && u && setUrl(u));
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    if (!url) return <Fallback {...props} />;
    const sq = format === 'square';
    const H = sq ? 1000 : 1500;
    return (
      <Artboard format={format} colors={{ ...props.colors, background: 'dark', bg: p.bg }} texture={0} label={`${content.brand} — 3D`}>
        <image href={url} x={0} y={sq ? -250 : 0} width={1000} height={1500} preserveAspectRatio="xMidYMid slice" />
        {p.textOn && <InfoLayer st={RUBAN.st} content={content} settings={settings} fg={p.text} accent={p.dot} shadow="#000000" sq={sq} on={!!props.animated} seal={p.ringMode === 'halo' ? undefined : p.ring} />}
        <rect width={1000} height={H} fill="none" />
      </Artboard>
    );
  };
}

const make = (from: ConceptDef, id: ConceptDef['id'], index: string, name: string, short: string, description: string, preset: LiveParams): ConceptDef => ({
  ...from,
  id,
  index,
  series: SERIES,
  name,
  short,
  description,
  rationale: [
    'Le « ? » est un vrai volume 3D : il tourne, sa silhouette change, sa surface se hérisse en éclats puis redevient lisse. L’anneau UNE AUTRE ? tourne autour et passe réellement derrière puis devant.',
    'Tout se règle en direct sur la planche « Affiche animée » : couleurs (y compris le point du « ? »), matière, éclats, rotation, vitesse, tailles, anneau, texte — et la vidéo enregistrée reprend exactement le réglage.',
    'La mise en page de Ruban reste par-dessus ; la vignette et l’export SVG utilisent l’affiche fixe la plus proche.',
  ],
  Poster: livePoster(id, preset, from.Poster),
  Live: live(id, preset),
});

export const live1 = make(rubanorbite, 'live1', '63', '3D · Ruban', 'Argile bleue, anneau rouge', 'Le « ? » en argile claire sur le bleu de Ruban, éclats deux fois par boucle, anneau UNE AUTRE ? rouge autour.', BASE);
export const live2 = make(rubanrouge, 'live2', '64', '3D · Chrome rouge', 'Chrome, point rouge, tour complet', 'Le « ? » en chrome qui fait un tour complet sur lui-même, le point en rouge, sur un rouge presque noir.', {
  ...BASE,
  bg: '#120204',
  glow: '#ff1f1f',
  body: '#ffd9d4',
  dot: '#ff1f1f',
  text: '#fff1ef',
  matter: 'chrome',
  roughness: 0.14,
  metalness: 1,
  shards: 0.55,
  spike: 0.26,
  motion: 'tour',
  speed: 0.8,
});
export const live3 = make(corail, 'live3', '65', '3D · Corail', 'Sable poreux, vert d’eau', 'Le « ? » couleur sable, très hérissé, sur le vert d’eau profond de Corail ; anneau crème, point rouge.', {
  ...BASE,
  bg: '#04241f',
  glow: '#0f8a78',
  body: '#f2c9a8',
  dot: '#ff1f1f',
  ring: '#ffe6cf',
  text: '#ffeedd',
  roughness: 0.85,
  metalness: 0,
  shards: 1.25,
  spike: 0.45,
  swing: 0.7,
});
export const live4 = make(mercure, 'live4', '66', '3D · Mercure', 'Chrome liquide, presque lisse', 'Le « ? » en chrome liquide sur noir, qui ondule à peine ; anneau blanc, lumière rouge.', {
  ...BASE,
  bg: '#030304',
  glow: '#7a0a0a',
  body: '#ffffff',
  dot: '#ffffff',
  ring: '#ffffff',
  text: '#f4f4f6',
  matter: 'chrome',
  roughness: 0.04,
  metalness: 1,
  shards: 0.35,
  spike: 0.1,
  speed: 0.7,
  ringTilt: 0.2,
});
export const live5 = make(neonlogo, 'live5', '67', '3D · Néon', 'Un « ? » qui brille', 'Le « ? » lumineux comme un tube de néon rouge, le point blanc, sur un mur noir ; l’anneau tourne plus vite.', {
  ...BASE,
  bg: '#070606',
  glow: '#ff1f1f',
  body: '#ff1f1f',
  dot: '#ffffff',
  text: '#ffecec',
  matter: 'neon',
  roughness: 0.4,
  metalness: 0,
  shards: 0.45,
  spike: 0.2,
  ringSpeed: 1.6,
});


/** Ruban · Halo — the circular logo (without its "?") turning in the middle, the "?" in 3D at its centre. */
const HALO: LiveParams = {
  ...BASE,
  ringMode: 'halo',
  ringTilt: 0,
  ringSize: 1,
  ringSpeed: 1,
  size: 0.78,
  qY: -0.05,
  shape: 'tube',
  swing: 0.6,
  haloWeight: 14,
  haloFill: false,
  haloDot: true,
  haloGlow: 0.6,
};
export const rubanhalo3d: ConceptDef = {
  ...rubanhalo,
  short: 'Le logo en cercle qui tourne, le « ? » en 3D au centre',
  description: 'Le vrai logo UNE AUTRE en cercle — sans son « ? » — tourne lentement au milieu de l’affiche ; au centre, le « ? » est un vrai volume 3D animé. Format, matière, tailles et couleurs se règlent en direct.',
  rationale: [
    'L’anneau dit UNE AUTRE, le volume au centre répond « ? » : le logo se complète avec l’objet.',
    'Sur la planche « Affiche animée » : format du « ? » (tube, gonflé, fil, perles, facettes, ruban plat), matière (argile, chrome, satin, néon, verre, velours, irisé, liquide), taille et hauteur du « ? », taille, trait, lueur et vitesse de l’anneau, couleurs, texte.',
    'La vidéo enregistrée reprend exactement le réglage choisi.',
  ],
  Poster: livePoster('rubanhalo', HALO, rubanhalo.Poster),
  Live: live('rubanhalo', HALO),
};
