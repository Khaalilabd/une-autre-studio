import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { download, rasterize, svgSize, toSvgDocument } from '../lib/exporter';

export interface ExportJob {
  title: string;
  filename: string;
  element: ReactElement;
  kind: 'logo' | 'poster';
  /** Optional solid background for PNG (logos default to transparent). */
  background?: string;
}

const Ctx = createContext<(job: ExportJob) => void>(() => undefined);
export const useExport = () => useContext(Ctx);

const SCALES = {
  poster: [
    { label: '1× — 1000 px', value: 1 },
    { label: '2× — 2000 px', value: 2 },
    { label: '3× — 3000 px (impression A3)', value: 3 },
    { label: '4× — 4000 px', value: 4 },
  ],
  logo: [
    { label: '1000 px', value: 1000 },
    { label: '2000 px', value: 2000 },
    { label: '4000 px', value: 4000 },
  ],
};

export function ExportProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<ExportJob | null>(null);
  const open = useCallback((j: ExportJob) => setJob(j), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {job && <ExportDialog job={job} onClose={() => setJob(null)} />}
    </Ctx.Provider>
  );
}

function ExportDialog({ job, onClose }: { job: ExportJob; onClose: () => void }) {
  const [scale, setScale] = useState(job.kind === 'poster' ? 2 : 2000);
  const [transparent, setTransparent] = useState(!job.background);
  const [svgDoc, setSvgDoc] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob; w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    toSvgDocument(job.element)
      .then((doc) => !cancelled && setSvgDoc(doc))
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [job]);

  useEffect(() => {
    if (!svgDoc) return;
    let cancelled = false;
    let url: string | null = null;
    setBusy(true);
    const { width, height } = svgSize(svgDoc);
    const w = job.kind === 'poster' ? Math.round(width * scale) : scale;
    const h = Math.round((w * height) / width);
    rasterize(svgDoc, w, h, transparent ? undefined : job.background ?? '#ffffff')
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview({ url, blob, w, h });
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [svgDoc, scale, transparent, job]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    dialog.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} Mo` : `${Math.round(n / 1e3)} Ko`);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Exporter — ${job.title}`} tabIndex={-1} ref={dialog}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">Export</p>
            <h2>{job.title}</h2>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className={`export-preview ${transparent ? 'checker' : ''}`}>
            {preview && <img src={preview.url} alt={`Aperçu PNG — ${job.title}`} style={{ opacity: busy ? 0.4 : 1 }} />}
            {!preview && !error && <p className="muted">Rendu en cours…</p>}
            {error && <p className="error">{error}</p>}
          </div>
          <div className="export-options">
            <label className="field">
              <span>Résolution PNG</span>
              <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                {SCALES[job.kind].map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            {job.kind === 'logo' && (
              <label className="check">
                <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
                <span>Fond transparent</span>
              </label>
            )}
            <dl className="specs">
              <dt>PNG</dt>
              <dd>{preview ? `${preview.w} × ${preview.h} px · ${kb(preview.blob.size)}` : '—'}</dd>
              <dt>SVG</dt>
              <dd>{svgDoc ? `vectoriel · polices intégrées · ${kb(svgDoc.length)}` : '—'}</dd>
            </dl>
            <div className="row">
              <button className="btn primary" disabled={!preview || busy} onClick={() => preview && download(preview.blob, `${job.filename}.png`)}>
                Télécharger PNG
              </button>
              <button className="btn" disabled={!svgDoc} onClick={() => svgDoc && download(svgDoc, `${job.filename}.svg`)}>
                Télécharger SVG
              </button>
            </div>
            <p className="hint">
              Le PNG est rendu à partir du SVG à la taille exacte demandée (pas une capture d’écran). Le SVG conserve les tracés vectoriels ; les
              textes restent des textes avec les polices embarquées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Direct (no-dialog) export helpers, used by "download all". */
export async function quickExport(job: ExportJob, format: 'svg' | 'png', px?: number) {
  const doc = await toSvgDocument(job.element);
  if (format === 'svg') return download(doc, `${job.filename}.svg`);
  const { width, height } = svgSize(doc);
  const w = px ?? (job.kind === 'poster' ? width * 2 : 2000);
  const blob = await rasterize(doc, w, Math.round((w * height) / width), job.background);
  download(blob, `${job.filename}.png`);
}
