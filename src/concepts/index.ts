import type { ConceptDef, ConceptId } from '../data/types';
import { anneau, echo, loco, sticker, vinyle } from './anneau';
import { brutalist } from './brutalist';
import { club } from './club';
import { collage } from './collage';
import { editorial } from './editorial';
import { essaie } from './essaie';
import { ink } from './ink';
import { live1, live2, live3, live4, live5, rubanhalo3d } from './live3d';
import { medaille, neonlogo, orbite, rubanrouge, tunnel } from './logo';
import { harissa, lumiere, menthe, nuitrose, soleil } from './main';
import { corail, mercure, noeud, ruban, rubanorbite, rubansceau, souffle } from './matiere';
import { eclipse, ombre, relief, remplissage, verre } from './signe';
import { ballon, bulle, glacon, gobo, origami } from './signe2';
import { anamorphose, censure, motscroises, motsmeles, phrase, point } from './regard';
import { neon } from './neon';
import { nocturne } from './nocturne';
import { onde } from './onde';
import { question } from './question';
import { riso } from './riso';
import { bab, bracelet, facettes, machmoum, reflet, thermique } from './scene';
import { signal } from './signal';
import { swiss } from './swiss';

/** Add a new creative direction by writing one config + Logo + Poster and listing it here. */
export const CONCEPTS: ConceptDef[] = [ink, signal, editorial, brutalist, question, nocturne, riso, neon, swiss, collage, onde, club, anneau, loco, vinyle, echo, sticker, facettes, bab, machmoum, thermique, bracelet, reflet, ruban, mercure, corail, noeud, souffle, anamorphose, motscroises, motsmeles, phrase, point, censure, lumiere, harissa, nuitrose, menthe, soleil, essaie, relief, eclipse, verre, remplissage, ombre, gobo, glacon, bulle, origami, ballon, rubanrouge, neonlogo, tunnel, medaille, orbite, rubanorbite, rubanhalo3d, rubansceau, live1, live2, live3, live4, live5];

/** Special series, newest first; each gets its own block on the table and an animated sheet. */
export const SERIES = [
  {
    id: 'live3d',
    name: '3D temps réel',
    blurb: 'Le « ? » en vrai volume 3D qui tourne et se hérisse en éclats, l\'anneau UNE AUTRE ? en orbite, la mise en page de Ruban par-dessus. Cinq points de départ — ouvrez-en un : tout se règle en direct (couleurs, point du « ? », matière, éclats, rotation, tailles, anneau) et la vidéo s\'enregistre telle quelle.',
  },
  {
    id: 'rubanid',
    name: 'Ruban × UNE AUTRE ?',
    blurb: 'Ruban, inchangé — son « ? » sculpté, son animation, sa mise en page — avec l\'identité de la marque qui tourne autour : un anneau UNE AUTRE ? en orbite, un grand halo-logo, ou le sceau du logo à la place du badge.',
  },
  {
    id: 'logo',
    name: 'Le logo vivant',
    blurb: 'Le vrai logo UNE AUTRE ? — l\'anneau de capitales rondes en contour rouge — traité comme Ruban : un seul objet, un fond profond, une boucle lente et propre. Sculpté, en néon, en tunnel infini, frappé sur une médaille, en orbite autour du « ? ».',
  },
  {
    id: 'signe',
    name: 'Le signe',
    blurb: 'Le « ? » du nom comme objet de chaque affiche — l\'esprit de Ruban, sans rien lui emprunter : une matière différente à chaque fois (relief, éclipse, verre, liquide, ombre), une seule couleur, une mise en page propre à chaque piste, et une animation lente qui a un sens.',
  },
  {
    id: 'main',
    name: 'À main levée',
    blurb: 'Des affiches de club vivantes : écriture dessinée à la main, couleurs franches, ou un anneau animé autour du « ? ». Changez les couleurs, le fond, le grain et les informations de chaque piste.',
  },
  {
    id: 'regard',
    name: 'Énigmes',
    blurb: 'Noir, minimal, typographique : la marque comme un jeu. Une anamorphose, puis cinq affiches sombres qui partagent la même empreinte — noir, os, un seul rouge. Peu de choses, mais un signe qu\'on reconnaît sans lire. Chaque piste a sa version animée.',
  },
  {
    id: 'matiere',
    name: 'Matière vivante',
    blurb: 'Un seul objet sculpté, une seule couleur profonde, une typo nette posée dessus. Chaque piste a son affiche principale et sa version animée : la matière mute en boucle, le texte reste fixe.',
  },
];

export const CONCEPT_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c])) as Record<ConceptId, ConceptDef>;
