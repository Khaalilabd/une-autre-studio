import { useRef, useState, useEffect } from 'react';
import type { ConceptDef, CreativeSettings } from '../data/types';
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
        <label className="field">
          <span>Couleur de l’édition</span>
          <input type="color" value={content.editionAccent} onChange={(e) => setContent({ editionAccent: e.target.value })} />
          <small>La palette de cette soirée se décline sur l’affiche, le feed et les stories. Bleu outremer pour la première édition.</small>
        </label>
        <Field label="Lieu" value={content.venue} onChange={(venue) => setContent({ venue })} />
      <Field label="Date" value={content.date} onChange={(date) => setContent({ date })} hint="Le premier mot (le jour) est mis en exergue sur certaines affiches." />
      <Field label="Horaires" value={content.hours} onChange={(hours) => setContent({ hours })} hint="Exemple à remplacer par les vrais horaires." />
      <Field label="Titre de la programmation" value={content.lineupTitle} onChange={(lineupTitle) => setContent({ lineupTitle })} />
      <Field 
        label="Artistes / DJs (un par ligne)" 
        value={content.lineupText ?? ''} 
        onChange={(lineupText) => setContent({ lineupText })} 
        multiline 
        placeholder="Écrivez chaque artiste sur une ligne :&#10;Feki Station&#10;Crew&#10;Firas Kobbi"
        hint="✨ Chaque ligne = un artiste affiché sur l'affiche. Simple et direct !"
      />
      <div className="field">
        <span>Mode d'affichage des artistes</span>
        <div className="segmented" role="radiogroup" aria-label="Mode d'affichage">
          <button 
            role="radio" 
            aria-checked={!content.lineupStacked} 
            className={!content.lineupStacked ? 'on' : ''} 
            onClick={() => setContent({ lineupStacked: false })}
          >
            Avec + (Artiste 1 + Artiste 2)
          </button>
          <button 
            role="radio" 
            aria-checked={!!content.lineupStacked} 
            className={content.lineupStacked ? 'on' : ''} 
            onClick={() => setContent({ lineupStacked: true })}
          >
            Empilé (lignes séparées)
          </button>
        </div>
        <small>Choisissez comment afficher vos artistes : joints avec "+" ou chacun sur sa ligne.</small>
      </div>
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
  const { settings, setSettings, resetConcept, photo, setPhoto, storageWarning, content } = useStudio();
  const s = settings[def.id];
  const set = (patch: Partial<CreativeSettings>) => setSettings(def.id, patch);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  // Show "Saved" indicator when settings change
  useEffect(() => {
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [s]);

  return (
    <div className="panel-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '8px 12px', backgroundColor: showSaved ? '#10b981' : '#f3f4f6', borderRadius: '6px', transition: 'all 0.3s' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: showSaved ? '#fff' : '#6b7280' }}>
          {showSaved ? '✓ Modifications sauvegardées !' : '⚙️ Réglages de l\'affiche'}
        </span>
        {storageWarning && (
          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>
            ⚠️ Attention: Sauvegarde limitée
          </span>
        )}
      </div>
      <div className="field">
        <span>Couleur dominante</span>
        <div className="swatches">
          {ACCENTS.map((c) => (
            <button key={c} className={`swatch-btn ${s.accent.toLowerCase() === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ accent: c })} aria-label={`Couleur ${c}`} />
          ))}
          <input type="color" value={s.accent} onChange={(e) => set({ accent: e.target.value })} aria-label="Couleur personnalisée" />
        </div>
      </div>
      {def.id === 'lumiere' && (
        <label className="field">
          <span>Couleur du texte</span>
          <input type="color" value={s.textColor ?? '#ffffff'} onChange={(e) => set({ textColor: e.target.value })} />
        </label>
      )}
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
          { value: 'badge', label: 'Logo tournant' },
        ]}
      />
      {(s.titleLayout === 'stacked' || s.titleLayout === 'line' || s.titleLayout === 'symbol') && (
        <div className="field">
          <span>Police d'écriture du logo (titre en haut)</span>
          <select 
            value={s.logoFont ?? 'sans'} 
            onChange={(e) => set({ logoFont: e.target.value })}
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              marginTop: '6px', 
              borderRadius: '6px', 
              border: '1.5px solid #d1d5db',
              fontSize: '14px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <optgroup label="★ À MAIN LEVÉE - Style Manuscrit">
              <option value="script">Mrs Saint Delafield - Cursive élégante</option>
              <option value="gambetta">Gambetta Italic - Serif manuscrite</option>
            </optgroup>
            <optgroup label="✦ MODERNE & LUMINEUSE - Grasses & Impactantes">
              <option value="sans">General Sans - Grotesque (défaut)</option>
              <option value="display">Syne - Display contemporain</option>
              <option value="puff">Bagel Fat One - Gonflée & joyeuse</option>
              <option value="condensed">Anton - Condensée & forte</option>
            </optgroup>
            <optgroup label="○ DOUCE & SOLAIRE - Arrondies & Chaleureuses">
              <option value="round">Fredoka - Arrondie & amicale</option>
            </optgroup>
            <optgroup label="◇ CLASSIQUE & RAFFINÉE - Serif & Élégance">
              <option value="serif">Cormorant Garamond - Classique</option>
            </optgroup>
            <optgroup label="▪ TECHNIQUE - Monospace">
              <option value="mono">IBM Plex Mono - Code & précision</option>
            </optgroup>
          </select>
          <small style={{ display: 'block', marginTop: '8px', lineHeight: '1.4', color: '#6b7280' }}>
            🎨 Change la police du logo/titre en haut de l'affiche <strong>"UNE AUTRE ?"</strong>. 
            L'effet "gonflé" reste, seule la police change. Essayez Script ou Gambetta pour un style manuscrit !
          </small>
        </div>
      )}
      <div className="field">
        <span>Police d'écriture du texte principal</span>
        <select 
          value={s.titleFont ?? 'sans'} 
          onChange={(e) => set({ titleFont: e.target.value })}
          style={{ 
            width: '100%', 
            padding: '10px 12px', 
            marginTop: '6px', 
            borderRadius: '6px', 
            border: '1.5px solid #d1d5db',
            fontSize: '14px',
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
        >
          <optgroup label="★ À MAIN LEVÉE - Style Manuscrit">
            <option value="script">Mrs Saint Delafield - Cursive élégante</option>
            <option value="gambetta">Gambetta Italic - Serif manuscrite</option>
          </optgroup>
          <optgroup label="✦ MODERNE & LUMINEUSE - Grasses & Impactantes">
            <option value="sans">General Sans - Grotesque (défaut)</option>
            <option value="display">Syne - Display contemporain</option>
            <option value="puff">Bagel Fat One - Gonflée & joyeuse</option>
            <option value="condensed">Anton - Condensée & forte</option>
          </optgroup>
          <optgroup label="○ DOUCE & SOLAIRE - Arrondies & Chaleureuses">
            <option value="round">Fredoka - Arrondie & amicale</option>
          </optgroup>
          <optgroup label="◇ CLASSIQUE & RAFFINÉE - Serif & Élégance">
            <option value="serif">Cormorant Garamond - Classique</option>
          </optgroup>
          <optgroup label="▪ TECHNIQUE - Monospace">
            <option value="mono">IBM Plex Mono - Code & précision</option>
          </optgroup>
        </select>
        <small style={{ display: 'block', marginTop: '8px', lineHeight: '1.4', color: '#6b7280' }}>
          💡 <strong>Affecte :</strong> Les noms des artistes (lineup), le titre en haut, et toutes les informations de l'événement. 
          Pour un style manuscrit inspiré de <em>Lumière</em>, <em>Soleil</em>, <em>Menthe</em>, essayez Mrs Saint Delafield ou Gambetta.
        </small>
      </div>
      <div className="field" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
        <span>✨ Style écriture à la main (comme Lumière)</span>
        <label className="check">
          <input 
            type="checkbox" 
            checked={s.useHandDrawn ?? false} 
            onChange={(e) => set({ useHandDrawn: e.target.checked })} 
          />
          <span>Activer l'écriture manuscrite animée</span>
        </label>
        <small style={{ display: 'block', marginTop: '8px', lineHeight: '1.4', color: '#6b7280' }}>
          🎨 Transforme <strong>TOUT</strong> en lettres tracées à la main qui dansent et brillent : 
          le <strong>logo "UNE AUTRE ?"</strong> en haut + tous les textes (artistes, date, lieu...).
          Chaque lettre est redessinée avec un tremblement naturel et s'anime en vague.
          Style 100% <em>Lumière</em>, <em>Soleil</em>, <em>Menthe</em> !
        </small>
        {s.useHandDrawn && (
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              <small>Épaisseur du trait <output>{s.handWeight ?? 15}</output></small>
              <input 
                type="range" 
                min={8} 
                max={24} 
                step={1} 
                value={s.handWeight ?? 15} 
                onChange={(e) => set({ handWeight: Number(e.target.value) })} 
                style={{ width: '100%' }}
              />
              <small style={{ color: '#6b7280' }}>Affecte le logo ET le texte</small>
            </label>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              <small>Mouvement / danse <output>{((s.handBounce ?? 0.9) * 100).toFixed(0)}%</output></small>
              <input 
                type="range" 
                min={0} 
                max={1.5} 
                step={0.1} 
                value={s.handBounce ?? 0.9} 
                onChange={(e) => set({ handBounce: Number(e.target.value) })} 
                style={{ width: '100%' }}
              />
              <small style={{ color: '#6b7280' }}>Plus haut = animation plus expressive</small>
            </label>
            <label style={{ display: 'block' }}>
              <small>Tremblement naturel <output>{(s.handTremor ?? 1.6).toFixed(1)}</output></small>
              <input 
                type="range" 
                min={0.5} 
                max={3} 
                step={0.1} 
                value={s.handTremor ?? 1.6} 
                onChange={(e) => set({ handTremor: Number(e.target.value) })} 
                style={{ width: '100%' }}
              />
              <small style={{ color: '#6b7280' }}>Donne cet aspect organique "fait main"</small>
            </label>
          </div>
        )}
      </div>
      <label className="field">
        <span>
          Taille du logo <output>{Math.round(s.logoScale * 100)} %</output>
        </span>
        <input type="range" min={0.6} max={1.3} step={0.02} value={s.logoScale} onChange={(e) => set({ logoScale: Number(e.target.value) })} />
      </label>
      <div className="field">
        <span>🔄 Rotation du logo (tourne sur lui-même)</span>
        <label className="check">
          <input 
            type="checkbox" 
            checked={s.logoSpin ?? false} 
            onChange={(e) => set({ logoSpin: e.target.checked })} 
          />
          <span>Faire tourner le logo en continu</span>
        </label>
        {s.logoSpin && (
          <div style={{ marginTop: '8px' }}>
            <label>
              <small>Vitesse de rotation <output>{s.logoSpinSpeed ?? 20}s</output></small>
              <input 
                type="range" 
                min={5} 
                max={60} 
                step={1} 
                value={s.logoSpinSpeed ?? 20} 
                onChange={(e) => set({ logoSpinSpeed: Number(e.target.value) })} 
                style={{ width: '100%' }}
              />
              <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Plus petit = plus rapide | Plus grand = plus lent
              </small>
            </label>
          </div>
        )}
        <small style={{ display: 'block', marginTop: '8px', lineHeight: '1.4', color: '#6b7280' }}>
          🎯 Le logo "UNE AUTRE ?" en haut tourne sur lui-même comme une roue (rotation 360°).
        </small>
      </div>
      <div className="field">
        <span>🌍 Animation du logo en orbite</span>
        <label className="check">
          <input 
            type="checkbox" 
            checked={s.logoOrbit ?? false} 
            onChange={(e) => set({ logoOrbit: e.target.checked })} 
          />
          <span>Faire tourner le logo en orbite autour du "?"</span>
        </label>
        {s.logoOrbit && (
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              <small>Rayon de l'orbite <output>{s.logoOrbitRadius ?? 420}px</output></small>
              <input 
                type="range" 
                min={250} 
                max={550} 
                step={10} 
                value={s.logoOrbitRadius ?? 420} 
                onChange={(e) => set({ logoOrbitRadius: Number(e.target.value) })} 
                style={{ width: '100%' }}
              />
              <small style={{ color: '#6b7280' }}>Distance du logo par rapport au centre</small>
            </label>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              <small>Inclinaison de l'orbite <output>{s.logoOrbitTilt ?? -9}°</output></small>
              <input 
                type="range" 
                min={-45} 
                max={45} 
                step={1} 
                value={s.logoOrbitTilt ?? -9} 
                onChange={(e) => set({ logoOrbitTilt: Number(e.target.value) })} 
                style={{ width: '100%' }}
              />
              <small style={{ color: '#6b7280' }}>Angle d'inclinaison de l'anneau</small>
            </label>
            <label style={{ display: 'block' }}>
              <small>Vitesse de rotation <output>{s.logoOrbitSpeed ?? 3.2}s</output></small>
              <input 
                type="range" 
                min={1} 
                max={10} 
                step={0.2} 
                value={s.logoOrbitSpeed ?? 3.2} 
                onChange={(e) => set({ logoOrbitSpeed: Number(e.target.value) })} 
                style={{ width: '100%' }}
              />
              <small style={{ color: '#6b7280' }}>Plus petit = plus rapide</small>
            </label>
          </div>
        )}
        <small style={{ display: 'block', marginTop: '8px', lineHeight: '1.4', color: '#6b7280' }}>
          🌍 Comme dans <strong>"Ruban · Orbite"</strong> : le logo "UNE AUTRE ?" tourne en anneau incliné autour du "?" sculpté.
          La moitié arrière passe derrière (estompée), la moitié avant devant (lumineuse).
        </small>
      </div>
      
      {/* Contrôles de taille et position pour chaque ligne du lineup */}
      {(() => {
        const lines = content.lineupText && content.lineupText.trim() 
          ? content.lineupText.split('\n').filter(l => l.trim())
          : content.lineup.map(a => a.name);
        
        if (lines.length === 0) return null;
        
        return (
          <div className="field" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>🎚️ Contrôles individuels du lineup</span>
            <small style={{ display: 'block', marginBottom: '12px', marginTop: '6px', color: '#6b7280' }}>
              ✅ {lines.length} {lines.length === 1 ? 'ligne détectée' : 'lignes détectées'}. Ajustez la taille et la position de chaque ligne individuellement.
            </small>
            <div style={{ display: 'grid', gap: '12px' }}>
              {lines.map((line, i) => (
                <div key={i} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <strong style={{ display: 'block', marginBottom: '10px', fontSize: '13px', color: '#374151' }}>
                    📌 Ligne {i + 1}: {line.substring(0, 30)}{line.length > 30 ? '...' : ''}
                  </strong>
                  
                  <label style={{ display: 'block', marginBottom: '8px' }}>
                    <small>Taille <output>{(s.lineupCustomSizes?.[i] ?? 100).toFixed(0)}%</output></small>
                    <input 
                      type="range" 
                      min={30} 
                      max={200} 
                      step={5} 
                      value={s.lineupCustomSizes?.[i] ?? 100} 
                      onChange={(e) => {
                        const newSizes = { ...(s.lineupCustomSizes ?? {}) };
                        newSizes[i] = Number(e.target.value);
                        set({ lineupCustomSizes: newSizes });
                      }} 
                      style={{ width: '100%' }}
                    />
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <label style={{ display: 'block' }}>
                      <small>Position X <output>{((s.lineupIndividualSizes?.[i] as any)?.x ?? 0)}px</output></small>
                      <input 
                        type="range" 
                        min={-400} 
                        max={400} 
                        step={5} 
                        value={((s.lineupIndividualSizes?.[i] as any)?.x ?? 0)} 
                        onChange={(e) => {
                          const newSizes = [...(s.lineupIndividualSizes ?? [])];
                          newSizes[i] = { ...(newSizes[i] as any ?? {}), x: Number(e.target.value) };
                          set({ lineupIndividualSizes: newSizes });
                        }} 
                        style={{ width: '100%' }}
                      />
                    </label>
                    
                    <label style={{ display: 'block' }}>
                      <small>Position Y <output>{(s.lineupIndividualOffsets?.[i] ?? 0)}px</output></small>
                      <input 
                        type="range" 
                        min={-200} 
                        max={200} 
                        step={5} 
                        value={s.lineupIndividualOffsets?.[i] ?? 0} 
                        onChange={(e) => {
                          const newOffsets = [...(s.lineupIndividualOffsets ?? [])];
                          newOffsets[i] = Number(e.target.value);
                          set({ lineupIndividualOffsets: newOffsets });
                        }} 
                        style={{ width: '100%' }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      
      {def.id === 'rubanrouge' && (
        <>
          <label className="field">
            <span>
              Taille des artistes <output>{Math.round((s.lineupScale ?? 1) * 100)} %</output>
            </span>
            <input type="range" min={0.65} max={1.3} step={0.05} value={s.lineupScale ?? 1} onChange={(e) => set({ lineupScale: Number(e.target.value) })} />
            <small>Les noms restent ajustés à la largeur disponible.</small>
          </label>
          <label className="field">
            <span>
              Position verticale du texte <output>{s.lineupOffset ?? 0} px</output>
            </span>
            <input type="range" min={-180} max={180} step={5} value={s.lineupOffset ?? 0} onChange={(e) => set({ lineupOffset: Number(e.target.value) })} />
            <small>Déplace ensemble les artistes et les informations, sans les faire sortir de l’affiche.</small>
          </label>
        </>
      )}
      {(def.id === 'rubansceau' || def.id === 'rubanorbite' || def.id === 'rubanhalo' || def.id === 'ruban') && (
        <>
          <label className="field">
            <span>
              Taille du graphique 3D <output>{Math.round((s.sculptureScale ?? 1) * 100)} %</output>
            </span>
            <input type="range" min={0.5} max={1.5} step={0.05} value={s.sculptureScale ?? 1} onChange={(e) => set({ sculptureScale: Number(e.target.value) })} />
            <small>Ajuste la taille du « ? » sculpté en 3D.</small>
          </label>
          <div className="field">
            <span>Position du graphique 3D</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>Horizontal (X) <output>{s.sculptureX ?? 0}px</output></small>
                <input type="range" min={-400} max={400} step={10} value={s.sculptureX ?? 0} onChange={(e) => set({ sculptureX: Number(e.target.value) })} />
              </label>
              <label style={{ flex: 1 }}>
                <small>Vertical (Y) <output>{s.sculptureY ?? 0}px</output></small>
                <input type="range" min={-400} max={400} step={10} value={s.sculptureY ?? 0} onChange={(e) => set({ sculptureY: Number(e.target.value) })} />
              </label>
            </div>
            <small>Déplacez le « ? » sculpté librement dans l'affiche.</small>
          </div>
          <div className="field">
            <span>Position du titre en haut</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>Horizontal (X) <output>{s.logoPositionX ?? 0}px</output></small>
                <input type="range" min={-400} max={400} step={10} value={s.logoPositionX ?? 0} onChange={(e) => set({ logoPositionX: Number(e.target.value) })} />
              </label>
              <label style={{ flex: 1 }}>
                <small>Vertical (Y) <output>{s.logoPositionY ?? 0}px</output></small>
                <input type="range" min={-300} max={600} step={10} value={s.logoPositionY ?? 0} onChange={(e) => set({ logoPositionY: Number(e.target.value) })} />
              </label>
            </div>
            <small>Déplacez le titre (texte ou logo tournant selon la disposition choisie).</small>
          </div>
          <div className="field">
            <span>Logo tournant avec le nom de la marque</span>
            <label className="check">
              <input type="checkbox" checked={s.badgeVisible !== false} onChange={(e) => set({ badgeVisible: e.target.checked })} />
              <span>Afficher le logo tournant</span>
            </label>
            <div style={{ marginTop: '12px' }}>
              <label>
                <small>Police d'écriture du badge tournant</small>
                <select 
                  value={s.badgeFont ?? 'sans'} 
                  onChange={(e) => set({ badgeFont: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    marginTop: '6px', 
                    borderRadius: '6px', 
                    border: '1.5px solid #d1d5db',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <optgroup label="★ À MAIN LEVÉE - Style Manuscrit">
                    <option value="script">Mrs Saint Delafield - Cursive élégante</option>
                    <option value="gambetta">Gambetta Italic - Serif manuscrite</option>
                  </optgroup>
                  <optgroup label="✦ MODERNE & LUMINEUSE - Grasses & Impactantes">
                    <option value="sans">General Sans - Grotesque (défaut)</option>
                    <option value="display">Syne - Display contemporain</option>
                    <option value="puff">Bagel Fat One - Gonflée & joyeuse</option>
                    <option value="condensed">Anton - Condensée & forte</option>
                  </optgroup>
                  <optgroup label="○ DOUCE & SOLAIRE - Arrondies & Chaleureuses">
                    <option value="round">Fredoka - Arrondie & amicale</option>
                  </optgroup>
                  <optgroup label="◇ CLASSIQUE & RAFFINÉE - Serif & Élégance">
                    <option value="serif">Cormorant Garamond - Classique</option>
                  </optgroup>
                  <optgroup label="▪ TECHNIQUE - Monospace">
                    <option value="mono">IBM Plex Mono - Code & précision</option>
                  </optgroup>
                </select>
                <small style={{ display: 'block', marginTop: '8px', lineHeight: '1.4', color: '#6b7280' }}>
                  💡 <strong>Conseil :</strong> Pour un style "À main levée" inspiré des thèmes <em>Lumière</em>, <em>Soleil</em>, <em>Menthe</em>, 
                  essayez les polices manuscrites (Mrs Saint Delafield, Gambetta) ou arrondies (Fredoka).
                </small>
              </label>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>Position X <output>{s.badgeX ?? 0}px</output></small>
                <input 
                  type="range" 
                  min={-500} 
                  max={800} 
                  step={10} 
                  value={s.badgeX ?? 0} 
                  onChange={(e) => set({ badgeX: Number(e.target.value) })} 
                  disabled={s.badgeVisible === false}
                />
              </label>
              <label style={{ flex: 1 }}>
                <small>Position Y <output>{s.badgeY ?? 0}px</output></small>
                <input 
                  type="range" 
                  min={-1000} 
                  max={400} 
                  step={10} 
                  value={s.badgeY ?? 0} 
                  onChange={(e) => set({ badgeY: Number(e.target.value) })} 
                  disabled={s.badgeVisible === false}
                />
              </label>
            </div>
            <div style={{ marginTop: '8px' }}>
              <label>
                <small>Taille <output>{Math.round((s.badgeScale ?? 1) * 100)}%</output></small>
                <input 
                  type="range" 
                  min={0.5} 
                  max={3} 
                  step={0.1} 
                  value={s.badgeScale ?? 1} 
                  onChange={(e) => set({ badgeScale: Number(e.target.value) })} 
                  disabled={s.badgeVisible === false}
                />
              </label>
            </div>
            <div style={{ marginTop: '8px' }}>
              <label>
                <small>Vitesse de rotation <output>{s.badgeRotationSpeed ?? 24}s</output></small>
                <input 
                  type="range" 
                  min={5} 
                  max={60} 
                  step={1} 
                  value={s.badgeRotationSpeed ?? 24} 
                  onChange={(e) => set({ badgeRotationSpeed: Number(e.target.value) })} 
                  disabled={s.badgeVisible === false}
                />
              </label>
            </div>
            <small>Le logo circulaire avec le nom de votre marque qui tourne. Placez-le où vous voulez : en bas à gauche (défaut), au centre, en haut, etc.</small>
          </div>
          <div className="field">
            <span>Position du bloc de texte (artistes et infos)</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>Horizontal (X) <output>{s.textBlockX ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={10} value={s.textBlockX ?? 0} onChange={(e) => set({ textBlockX: Number(e.target.value) })} />
              </label>
              <label style={{ flex: 1 }}>
                <small>Vertical (Y) <output>{s.textBlockY ?? 0}px</output></small>
                <input type="range" min={-400} max={400} step={10} value={s.textBlockY ?? 0} onChange={(e) => set({ textBlockY: Number(e.target.value) })} />
              </label>
            </div>
            <small>Déplacez le bloc avec les noms des DJ/artistes et les informations de l'événement.</small>
          </div>
          <div className="field">
            <span>Couleur du métal 3D</span>
            <label className="check">
              <input type="checkbox" checked={!!s.sculptureMetalDeep} onChange={(e) => {
                if (e.target.checked) {
                  set({ sculptureMetalDeep: '#050a2e', sculptureMetalMid: '#5a6a9e', sculptureMetalLight: '#f2f5ff' });
                } else {
                  set({ sculptureMetalDeep: undefined, sculptureMetalMid: undefined, sculptureMetalLight: undefined });
                }
              }} />
              <span>Personnaliser la couleur du métal</span>
            </label>
            {s.sculptureMetalDeep && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <label style={{ flex: 1 }}>
                  <small>Profond</small>
                  <input type="color" value={s.sculptureMetalDeep} onChange={(e) => set({ sculptureMetalDeep: e.target.value })} />
                </label>
                <label style={{ flex: 1 }}>
                  <small>Moyen</small>
                  <input type="color" value={s.sculptureMetalMid ?? '#5a6a9e'} onChange={(e) => set({ sculptureMetalMid: e.target.value })} />
                </label>
                <label style={{ flex: 1 }}>
                  <small>Lumière</small>
                  <input type="color" value={s.sculptureMetalLight ?? '#f2f5ff'} onChange={(e) => set({ sculptureMetalLight: e.target.value })} />
                </label>
              </div>
            )}
            <small>Personnalisez les trois tons du métal sculpté.</small>
          </div>
          <button 
            className="btn ghost small" 
            onClick={() => set({ 
              sculptureX: 0, 
              sculptureY: 0, 
              logoPositionX: 0, 
              logoPositionY: 0, 
              textBlockX: 0, 
              textBlockY: 0,
              badgeX: 0,
              badgeY: 0,
              badgeScale: 1,
              badgeRotationSpeed: 24,
              badgeVisible: true
            })}
          >
            Réinitialiser toutes les positions et le badge
          </button>
        </>
      )}
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
      <div className="field" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
        <span>📋 Disposition du lineup (artistes/DJs)</span>
        <Segmented
          label=""
          value={s.lineupLayout ?? 'joined'}
          onChange={(lineupLayout: 'joined' | 'stacked') => set({ lineupLayout })}
          options={[
            { value: 'joined', label: 'Joints (+)' },
            { value: 'stacked', label: 'Lignes séparées' },
          ]}
        />
        <small style={{ display: 'block', marginTop: '8px', lineHeight: '1.4', color: '#6b7280' }}>
          <strong>Joints :</strong> Tous les artistes sur 1-2 lignes séparés par " + "<br/>
          <strong>Lignes séparées :</strong> Chaque artiste sur sa propre ligne
        </small>
        
        {s.lineupLayout === 'stacked' && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <label style={{ display: 'block', marginBottom: '12px' }}>
              <small>Espacement entre les lignes <output>{s.lineupLineSpacing ?? 100}px</output></small>
              <input 
                type="range" 
                min={40} 
                max={200} 
                step={5} 
                value={s.lineupLineSpacing ?? 100} 
                onChange={(e) => set({ lineupLineSpacing: Number(e.target.value) })} 
                style={{ width: '100%' }}
              />
            </label>
            
            <div style={{ marginTop: '12px' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Contrôles individuels par ligne :</strong>
              {content.lineup.map((artist, i) => (
                <div key={artist.id} style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '6px', color: '#374151' }}>
                    Ligne {i + 1}: {artist.name}
                  </div>
                  <label style={{ display: 'block', marginBottom: '6px' }}>
                    <small>Taille <output>{Math.round((s.lineupIndividualSizes?.[i] ?? 84) * 100 / 84)}%</output></small>
                    <input 
                      type="range" 
                      min={40} 
                      max={120} 
                      step={2} 
                      value={s.lineupIndividualSizes?.[i] ?? 84} 
                      onChange={(e) => {
                        const sizes = [...(s.lineupIndividualSizes ?? content.lineup.map(() => 84))];
                        sizes[i] = Number(e.target.value);
                        set({ lineupIndividualSizes: sizes });
                      }} 
                      style={{ width: '100%' }}
                    />
                  </label>
                  <label style={{ display: 'block' }}>
                    <small>Position Y <output>{s.lineupIndividualOffsets?.[i] ?? 0}px</output></small>
                    <input 
                      type="range" 
                      min={-100} 
                      max={100} 
                      step={5} 
                      value={s.lineupIndividualOffsets?.[i] ?? 0} 
                      onChange={(e) => {
                        const offsets = [...(s.lineupIndividualOffsets ?? content.lineup.map(() => 0))];
                        offsets[i] = Number(e.target.value);
                        set({ lineupIndividualOffsets: offsets });
                      }} 
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
      
      <div className="field" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '20px', marginTop: '20px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>📍 Position des éléments de texte</span>
        <small style={{ display: 'block', marginTop: '8px', marginBottom: '16px', lineHeight: '1.4', color: '#6b7280' }}>
          Déplacez individuellement chaque élément : Lieu, Date, Horaires, Piliers, Mentions, Signature.
        </small>
        
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#374151' }}>📍 Lieu</strong>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>X <output>{s.venueX ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.venueX ?? 0} onChange={(e) => set({ venueX: Number(e.target.value) })} />
              </label>
              <label style={{ flex: 1 }}>
                <small>Y <output>{s.venueY ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.venueY ?? 0} onChange={(e) => set({ venueY: Number(e.target.value) })} />
              </label>
            </div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#374151' }}>📅 Date</strong>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>X <output>{s.dateX ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.dateX ?? 0} onChange={(e) => set({ dateX: Number(e.target.value) })} />
              </label>
              <label style={{ flex: 1 }}>
                <small>Y <output>{s.dateY ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.dateY ?? 0} onChange={(e) => set({ dateY: Number(e.target.value) })} />
              </label>
            </div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#374151' }}>⏰ Horaires</strong>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>X <output>{s.hoursX ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.hoursX ?? 0} onChange={(e) => set({ hoursX: Number(e.target.value) })} />
              </label>
              <label style={{ flex: 1 }}>
                <small>Y <output>{s.hoursY ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.hoursY ?? 0} onChange={(e) => set({ hoursY: Number(e.target.value) })} />
              </label>
            </div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#374151' }}>🎯 Piliers</strong>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>X <output>{s.pillarsX ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.pillarsX ?? 0} onChange={(e) => set({ pillarsX: Number(e.target.value) })} />
              </label>
              <label style={{ flex: 1 }}>
                <small>Y <output>{s.pillarsY ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.pillarsY ?? 0} onChange={(e) => set({ pillarsY: Number(e.target.value) })} />
              </label>
            </div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#374151' }}>📝 Mentions</strong>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>X <output>{s.mentionsX ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.mentionsX ?? 0} onChange={(e) => set({ mentionsX: Number(e.target.value) })} />
              </label>
              <label style={{ flex: 1 }}>
                <small>Y <output>{s.mentionsY ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.mentionsY ?? 0} onChange={(e) => set({ mentionsY: Number(e.target.value) })} />
              </label>
            </div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#374151' }}>✍️ Signature</strong>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1 }}>
                <small>X <output>{s.signatureX ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.signatureX ?? 0} onChange={(e) => set({ signatureX: Number(e.target.value) })} />
              </label>
              <label style={{ flex: 1 }}>
                <small>Y <output>{s.signatureY ?? 0}px</output></small>
                <input type="range" min={-300} max={300} step={5} value={s.signatureY ?? 0} onChange={(e) => set({ signatureY: Number(e.target.value) })} />
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <button className="btn ghost small" onClick={() => resetConcept(def.id)}>
        Réinitialiser les réglages de ce concept
      </button>
    </div>
  );
}
