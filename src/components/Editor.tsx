import { useRef, useState } from 'react';
import type { ConceptDef, CreativeSettings, LineupSlot } from '../data/types';
import { useStudio } from '../state/store';

function Field({ label, value, onChange, multiline, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} rows={3} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function ContentEditor() {
  const { content, setContent, resetContent } = useStudio();
  const setSlot = (id: string, patch: Partial<LineupSlot>) => setContent({ lineup: content.lineup.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const move = (i: number, d: -1 | 1) => {
    const next = [...content.lineup];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setContent({ lineup: next });
  };
  return (
    <div className="panel-section">
      <p className="hint">Ces champs sont partagés par toutes les pistes et tous les formats.</p>
      <Field label="Nom de la marque" value={content.brand} onChange={(brand) => setContent({ brand })} hint="Le « ? » final est détecté et dessiné par chaque logo." />
      <Field label="Signature" value={content.signature} onChange={(signature) => setContent({ signature })} multiline />
      <Field label="Manifeste" value={content.manifesto} onChange={(manifesto) => setContent({ manifesto })} multiline />
      <Field label="Piliers" value={content.pillars} onChange={(pillars) => setContent({ pillars })} />
      <div className="field-row">
        <Field label="Édition" value={content.edition} onChange={(edition) => setContent({ edition })} />
        <Field label="N°" value={content.editionNumber} onChange={(editionNumber) => setContent({ editionNumber })} />
      </div>
      <Field label="Lieu" value={content.venue} onChange={(venue) => setContent({ venue })} />
      <Field label="Date" value={content.date} onChange={(date) => setContent({ date })} hint="Le premier mot (le jour) est mis en exergue sur certaines affiches." />
      <Field label="Titre de la programmation" value={content.lineupTitle} onChange={(lineupTitle) => setContent({ lineupTitle })} />
      <fieldset className="lineup-editor">
        <legend>Artistes</legend>
        {content.lineup.map((s, i) => (
          <div className="slot" key={s.id}>
            <input aria-label={`Artiste ${i + 1}`} value={s.name} onChange={(e) => setSlot(s.id, { name: e.target.value })} />
            <input aria-label={`Détail ${i + 1}`} value={s.detail} placeholder="B2B …, CLOSING…" onChange={(e) => setSlot(s.id, { detail: e.target.value })} />
            <div className="slot-actions">
              <button className="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">
                ↑
              </button>
              <button className="icon" onClick={() => move(i, 1)} disabled={i === content.lineup.length - 1} aria-label="Descendre">
                ↓
              </button>
              <button className="icon" onClick={() => setContent({ lineup: content.lineup.filter((x) => x.id !== s.id) })} disabled={content.lineup.length <= 1} aria-label="Supprimer">
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          className="btn small"
          disabled={content.lineup.length >= 4}
          onClick={() => setContent({ lineup: [...content.lineup, { id: Math.random().toString(36).slice(2, 8), name: 'ARTISTE', detail: '' }] })}
        >
          + Ajouter un artiste {content.lineup.length >= 4 && '(4 max.)'}
        </button>
      </fieldset>
      <Field label="Mentions secondaires" value={content.mentions} onChange={(mentions) => setContent({ mentions })} placeholder="Facultatif — ex. entrée, partenaires…" />
      <Field label="Coordonnées / annotation" value={content.coords} onChange={(coords) => setContent({ coords })} placeholder="Facultatif — ex. coordonnées GPS du lieu" />
      <button className="btn ghost small" onClick={resetContent}>
        Réinitialiser le contenu de démonstration
      </button>
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const ACCENTS = ['#b3121b', '#c8141e', '#e0262f', '#9e1b22', '#a3161d', '#d1121c', '#1f1f1f', '#b48a3c'];

/** Downscales an uploaded photo so it stays light in storage and in exports. */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1800;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = url;
  });
}

export function CreativeControls({ def }: { def: ConceptDef }) {
  const { settings, setSettings, resetConcept, photo, setPhoto, storageWarning } = useStudio();
  const s = settings[def.id];
  const set = (patch: Partial<CreativeSettings>) => setSettings(def.id, patch);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  return (
    <div className="panel-section">
      <div className="field">
        <span>Couleur dominante</span>
        <div className="swatches">
          {ACCENTS.map((c) => (
            <button key={c} className={`swatch-btn ${s.accent.toLowerCase() === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ accent: c })} aria-label={`Couleur ${c}`} />
          ))}
          <input type="color" value={s.accent} onChange={(e) => set({ accent: e.target.value })} aria-label="Couleur personnalisée" />
        </div>
      </div>
      <Segmented
        label="Fond"
        value={s.background}
        onChange={(background) => set({ background })}
        options={[
          { value: 'paper', label: 'Ivoire' },
          { value: 'dark', label: 'Noir' },
          { value: 'accent', label: 'Couleur' },
        ]}
      />
      <Segmented
        label="Disposition du titre"
        value={s.titleLayout}
        onChange={(titleLayout) => set({ titleLayout })}
        options={[
          { value: 'stacked', label: 'Empilé' },
          { value: 'line', label: 'En ligne' },
          { value: 'symbol', label: 'Symbole' },
        ]}
      />
      <label className="field">
        <span>
          Taille du logo <output>{Math.round(s.logoScale * 100)} %</output>
        </span>
        <input type="range" min={0.6} max={1.3} step={0.02} value={s.logoScale} onChange={(e) => set({ logoScale: Number(e.target.value) })} />
      </label>
      <label className="field">
        <span>
          Texture / grain <output>{Math.round(s.texture * 100)} %</output>
        </span>
        <input type="range" min={0} max={1} step={0.05} value={s.texture} onChange={(e) => set({ texture: Number(e.target.value) })} />
      </label>
      <Segmented
        label="Informations"
        value={s.infoLayout}
        onChange={(infoLayout) => set({ infoLayout })}
        options={[
          { value: 'split', label: 'Colonnes' },
          { value: 'stack', label: 'Liste' },
        ]}
      />
      <Segmented
        label="Format principal"
        value={s.format}
        onChange={(format) => set({ format })}
        options={[
          { value: 'portrait', label: 'Vertical 2:3' },
          { value: 'square', label: 'Carré 1:1' },
        ]}
      />
      <div className="field">
        <span>Photographie</span>
        <label className="check">
          <input type="checkbox" checked={s.photo} onChange={(e) => set({ photo: e.target.checked })} />
          <span>Afficher la photographie</span>
        </label>
        <div className="row">
          <button className="btn small" onClick={() => fileRef.current?.click()}>
            {photo ? 'Remplacer la photo' : 'Importer une photo'}
          </button>
          {photo && (
            <button className="btn ghost small" onClick={() => setPhoto(null)}>
              Revenir à l’illustration
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              setPhoto(await readPhoto(f));
              setPhotoError(null);
              if (!s.photo) set({ photo: true });
            } catch (err) {
              setPhotoError((err as Error).message);
            }
          }}
        />
        <small>
          Sans import, une scène nocturne originale dessinée en SVG est utilisée. La photo importée est partagée par tous les concepts et traitée
          en duotone.
        </small>
        {photoError && <small className="error">{photoError}</small>}
        {storageWarning && <small className="error">Photo trop lourde pour être mémorisée : elle sera perdue au rechargement.</small>}
      </div>
      <button className="btn ghost small" onClick={() => resetConcept(def.id)}>
        Réinitialiser les réglages de ce concept
      </button>
    </div>
  );
}
