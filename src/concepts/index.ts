import type { ConceptDef, ConceptId } from '../data/types';
import { anneau, echo, loco, sticker, vinyle } from './anneau';
import { brutalist } from './brutalist';
import { club } from './club';
import { collage } from './collage';
import { editorial } from './editorial';
import { ink } from './ink';
import { neon } from './neon';
import { nocturne } from './nocturne';
import { onde } from './onde';
import { question } from './question';
import { riso } from './riso';
import { signal } from './signal';
import { swiss } from './swiss';

/** Add a new creative direction by writing one config + Logo + Poster and listing it here. */
export const CONCEPTS: ConceptDef[] = [ink, signal, editorial, brutalist, question, nocturne, riso, neon, swiss, collage, onde, club, anneau, loco, vinyle, echo, sticker];

export const CONCEPT_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c])) as Record<ConceptId, ConceptDef>;
