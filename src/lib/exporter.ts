/**
 * Real exports: artwork components are rendered to standalone SVG markup
 * (same React components as on screen), fonts are embedded, and PNGs are
 * rasterised from that SVG at the requested pixel size — never a screenshot.
 */
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { embeddedFontCss } from './fonts';

export async function toSvgDocument(node: ReactElement, size?: { width: number; height: number }): Promise<string> {
  let svg = renderToStaticMarkup(node);
  if (!svg.startsWith('<svg')) throw new Error('Le composant exporté ne produit pas un élément <svg>.');
  const openEnd = svg.indexOf('>');
  let open = svg.slice(0, openEnd);
  if (!open.includes('xmlns=')) open = open.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  if (size) {
    open = open.replace(/\s(width|height)="[^"]*"/g, '');
    open += ` width="${size.width}" height="${size.height}"`;
  }
  const css = await embeddedFontCss(svg);
  const style = css ? `<defs><style>${css}</style></defs>` : '';
  svg = open + '>' + style + svg.slice(openEnd + 1);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + svg;
}

export function svgSize(svgDoc: string): { width: number; height: number } {
  const vb = /viewBox="([\d.\-\s]+)"/.exec(svgDoc);
  if (!vb) return { width: 1000, height: 1000 };
  const [, , w, h] = vb[1].trim().split(/\s+/).map(Number);
  return { width: w, height: h };
}

export async function rasterize(svgDoc: string, width: number, height: number, background?: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svgDoc], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    img.width = width;
    img.height = height;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Le navigateur n’a pas pu lire le SVG exporté.'));
      img.src = url;
    });
    // Give embedded @font-face data a moment to be applied inside the image document.
    await new Promise((r) => setTimeout(r, 120));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponible.');
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Résolution trop élevée pour ce navigateur.'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function download(data: Blob | string, filename: string) {
  const blob = typeof data === 'string' ? new Blob([data], { type: 'image/svg+xml;charset=utf-8' }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'une-autre';
