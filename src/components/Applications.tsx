import { useMemo } from 'react';
import type { ConceptDef, CreativeSettings } from '../data/types';
import { useStudio } from '../state/store';
import { logoElement, posterElement, testTones, useConceptColors } from './Artwork';
import { useExport } from './ExportDialog';
import { useJobs } from './ExportPanel';

/** Brand applications: avatar, wristband, stage projection, Instagram on a phone. */
export function Applications({ def }: { def: ConceptDef }) {
  const { content, settings } = useStudio();
  const colors = useConceptColors(def);
  const s = settings[def.id];
  const sym = (fg: string, accent: string) => logoElement(def, 'symbol', content.brand, { fg, accent });
  const sec = (fg: string, accent: string) => logoElement(def, 'secondary', content.brand, { fg, accent });
  const prim = (fg: string, accent: string) => logoElement(def, 'primary', content.brand, { fg, accent }, 'line');

  return (
    <div className="apps">
      <figure className="app">
        <div className="app-stage avatar-stage">
          <div className="avatar" style={{ background: s.accent }}>
            {sym(def.base.paper, def.base.ink)}
          </div>
          <div className="avatar small" style={{ background: def.base.ink }}>
            {sym(def.base.paper, s.accent)}
          </div>
          <div className="avatar tiny" style={{ background: def.base.paper }}>
            {sym(def.base.ink, s.accent)}
          </div>
        </div>
        <figcaption>Photo de profil — 160, 64 et 32 px</figcaption>
      </figure>

      <figure className="app">
        <div className="app-stage band-stage">
          <div className="band" style={{ background: colors.background === 'paper' ? def.base.ink : colors.bg }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="band-logo">
                {sec(def.base.paper, colors.background === 'accent' ? def.base.paper : s.accent)}
              </div>
            ))}
            <div className="band-clasp" />
          </div>
          <div className="band alt" style={{ background: s.accent }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="band-sym">
                {sym(def.base.paper, def.base.ink)}
              </div>
            ))}
          </div>
        </div>
        <figcaption>Bracelets tissés</figcaption>
      </figure>

      <figure className="app wide">
        <div className="app-stage scene-stage">
          <svg viewBox="0 0 800 400" className="stage-svg" aria-hidden>
            <defs>
              <radialGradient id={`beam-${def.id}`} cx="0.5" cy="1" r="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="800" height="400" fill="#070707" />
            <path d="M400 400L120 0H680Z" fill={`url(#beam-${def.id})`} />
            <rect x="170" y="60" width="460" height="230" fill={s.background === 'accent' ? s.accent : def.base.ink} stroke="#222" />
            <path d="M0 400C40 340 60 330 90 360S140 330 170 352 230 320 260 350 320 330 350 356 420 324 450 352 520 330 550 350 610 322 640 354 700 330 730 352 780 336 800 360V400Z" fill="#000" />
          </svg>
          <div className="stage-logo">{prim(def.base.paper, s.background === 'accent' ? def.base.ink : s.accent)}</div>
        </div>
        <figcaption>Projection de scène — logo en ligne</figcaption>
      </figure>

      <PhoneMock def={def} />
    </div>
  );
}

export function PhoneMock({ def, format = 'square' }: { def: ConceptDef; format?: 'square' | 'portrait' }) {
  const { content, settings, photo } = useStudio();
  const s = settings[def.id];
  const poster = useMemo(() => posterElement(def, content, s, photo, format), [def, content, s, photo, format]);
  return (
    <figure className="app">
      <div className="app-stage phone-stage">
        <div className="phone">
          <div className="phone-bar">
            <span className="phone-avatar" style={{ background: s.accent }}>
              {logoElement(def, 'symbol', content.brand, { fg: def.base.paper, accent: def.base.ink })}
            </span>
            <b>{content.brand.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}</b>
          </div>
          <div className={`phone-post ${format}`}>{poster}</div>
          <div className="phone-actions">♡ ◯ ➤</div>
        </div>
      </div>
      <figcaption>{format === 'square' ? 'Post Instagram — aperçu mobile' : 'Affiche — aperçu mobile'}</figcaption>
    </figure>
  );
}

/** Logo legibility tests: 4 grounds × 3 variants + small sizes. */
export function LogoTests({ def, settings }: { def: ConceptDef; settings: CreativeSettings }) {
  const { content } = useStudio();
  const open = useExport();
  const { logo } = useJobs(def);
  const grounds = testTones(def, settings);
  return (
    <div className="tests">
      <div className="test-grid">
        {grounds.map((g) => (
          <div key={g.key} className="test-col">
            <p className="label">{g.label}</p>
            {(['primary', 'secondary', 'symbol'] as const).map((v) => (
              <div key={v} className={`test-cell ${v}`} style={{ background: g.bg }}>
                {logoElement(def, v, content.brand, g.tone)}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="small-sizes">
        <p className="label">Petites tailles</p>
        <div className="sizes-row">
          {[16, 24, 32, 48, 64].map((px) => (
            <div key={px} className="size-cell">
              <div style={{ width: px, height: px }}>{logoElement(def, 'symbol', content.brand, grounds[0].tone)}</div>
              <small>{px}px</small>
            </div>
          ))}
          {[80, 120, 180].map((px) => (
            <div key={px} className="size-cell">
              <div style={{ width: px }}>{logoElement(def, 'secondary', content.brand, grounds[0].tone)}</div>
              <small>{px}px</small>
            </div>
          ))}
        </div>
      </div>
      <button className="btn small" onClick={() => open(logo('symbol', 'black'))}>
        Exporter le symbole monochrome
      </button>
    </div>
  );
}
