# UNE AUTRE ? — Studio d'identité

Studio React + TypeScript + Vite pour explorer, comparer, personnaliser et exporter **17 pistes d'identité visuelle** pour UNE AUTRE ?. Tout est dessiné en code (SVG + WebGL) dans le navigateur : logos, affiches, textures, « photographie », présentation 3D.

## Lancer le projet

```bash
npm install      # une seule fois par ordinateur (Node.js 20+ requis)
npm run dev      # puis ouvrir l'adresse affichée (http://localhost:5173)
npm run build    # build de production dans dist/
```

Sur un autre ordinateur : `git clone …`, puis `npm install` et `npm run dev`. Ensuite, `git pull` pour récupérer les dernières modifications.

## Ce que contient le studio

- **Présentation** (`#/`) : chapitres immersifs, affiche en 3D (recto affiche / verso logo), visite guidée avec musique.
- **Atelier** (`#/atelier`, `#/c/<piste>`) : planches Affiche 2:3, Carré 1:1, Logos, Tests, Applications, Système ; réglages en direct, édition du contenu, export SVG / PNG haute définition.
- **Comparer** (`#/compare`) : jusqu'à trois pistes côte à côte.

| N° | Piste | | N° | Piste |
| --- | --- | --- | --- | --- |
| 01 | Ink / Gesture | | 10 | Collage / Zine |
| 02 | Red Signal | | 11 | Onde / Fréquence |
| 03 | Editorial Luxe | | 12 | Guilloché / Club |
| 04 | Brutalist Culture | | 13 | Anneau |
| 05 | Abstract Question | | 14 | Loco Néon |
| 06 | Mediterranean Nocturne | | 15 | Vinyle |
| 07 | Riso / Halftone | | 16 | Écho |
| 08 | Néon | | 17 | Sticker |
| 09 | Swiss Rhythm | | | |

## Structure

| Chemin | Rôle |
| --- | --- |
| `src/data/content.ts` | Contenu de démonstration (source unique), couleurs, formats |
| `src/data/experience.ts` | Textes et ambiances de la présentation |
| `src/concepts/*.tsx` | Une piste = config + `Logo` (3 variantes) + `Poster` (2:3 et 1:1). `anneau.tsx` regroupe la famille 13–17 |
| `src/concepts/index.ts` | Registre : ajouter une piste ici |
| `src/lib/strokeFont.ts`, `blockFont.ts` | Alphabets originaux « Trajet » et « Bloc » |
| `src/lib/brush.ts`, `generators.ts` | Pinceau, trames, ondes, guillochis, papier déchiré |
| `src/graphics/` | Textures, photo SVG, outils de lettrage (arcs, néon, contours) |
| `src/lib/exporter.ts`, `fonts.ts` | Export SVG avec polices embarquées, rendu PNG |
| `src/components/` | Interface : présentation 3D, atelier, éditeur, export, comparaison |

## Ressources

- Polices locales : Inter, IBM Plex Mono, Cormorant Garamond, Anton, Syne (`@fontsource`), General Sans et Gambetta (Fontshare, licence ITF FFL dans `src/assets/fonts/`).
- `public/audio/une-autre-ambiance.mp3` : musique d'ambiance de la démo (« Des Larmes Dans L'Eau », Tahos & Alex Esser). Usage de démonstration privée uniquement : à retirer ou à licencier avant toute mise en ligne publique.
