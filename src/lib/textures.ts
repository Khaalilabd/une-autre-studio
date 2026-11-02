/**
 * Turns poster / logo artwork into bitmaps for the 3D scene, through the same
 * SVG export pipeline (fonts embedded) — what you see in 3D is the real artwork.
 */
import type { ReactElement } from 'react';
import { rasterize, toSvgDocument } from './exporter';

const cache = new Map<string, Promise<ImageBitmap>>();

export function artworkBitmap(key: string, element: ReactElement, width: number, height: number): Promise<ImageBitmap> {
  let hit = cache.get(key);
  if (!hit) {
    hit = toSvgDocument(element)
      .then((svg) => rasterize(svg, width, height))
      .then((blob) => createImageBitmap(blob, { imageOrientation: 'flipY' }));
    hit.catch(() => cache.delete(key));
    cache.set(key, hit);
    if (cache.size > 40) cache.delete(cache.keys().next().value as string);
  }
  return hit;
}
