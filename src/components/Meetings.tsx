import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CONCEPT_BY_ID } from '../concepts';
import type { ConceptId } from '../data/types';
import { useStudio } from '../state/store';
import { posterElement } from './Artwork';
import { DESIGNS } from './Wristbands';

/**
 * Réunions staff — agenda built from the meeting goals: votes (main poster,
 * wristbands), task split (tees, wristbands), décor checklist, budget, one
 * month of media planning. Every decision and task carries a "check" date;
 * the timeline gathers them so nothing is forgotten. Saved in this browser.
 */

type Status = 'à discuter' | 'validé' | 'à revoir';
interface VoteOpt {
  id: string;
  label: string;
  ref?: string;
  votes: number;
}
interface Vote {
  options: VoteOpt[];
  decision: string;
}
interface Task {
  id: string;
  task: string;
  who: string;
  due: string;
  done: boolean;
}
interface CheckRow {
  id: string;
  label: string;
  status: Status;
  who: string;
  check: string;
  note: string;
}
interface BudgetRow {
  id: string;
  poste: string;
  amount: number;
  ok: boolean;
}
interface Post {
  id: string;
  date: string;
  type: string;
  title: string;
  done: boolean;
}
interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
  attendees: string;
  eventDate: string;
  poster: Vote;
  bands: Vote;
  tasks: Task[];
  decor: CheckRow[];
  budget: BudgetRow[];
  currency: string;
  teasers: 1 | 2;
  posts: Post[];
  checks: Record<string, string>;
  done: Record<string, boolean>;
  notes: string;
}

const KEY = 'une-autre:meetings';
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmt = (iso: string) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');

const POSTERS: [ConceptId, string][] = [
  ['rubansceau', 'Ruban'],
  ['rubanrouge', 'Ruban rouge'],
  ['live3', '3D · Corail'],
  ['tunnel', 'Tunnel'],
  ['neonlogo', 'Néon'],
  ['verre', 'Verre'],
  ['lumiere', 'Lumière'],
  ['soleil', 'Soleil'],
  ['souffle', 'Souffle'],
];
const BANDS = ['anneau', 'anneauq', 'nuit', 'billet', 'neon', 'ruban'];

const AGENDA: { id: string; n: string; title: string; goal: string }[] = [
  { id: 'poster', n: '1', title: 'Affiche principale', goal: 'Vote et validation du design final.' },
  { id: 'bands', n: '2', title: 'Bracelets', goal: 'Vote et validation du design des bracelets.' },
  { id: 'tasks', n: '3', title: 'Répartition des tâches', goal: 'Attribution des responsabilités : T-shirts et bracelets.' },
  { id: 'decor', n: '4', title: 'Décoration et scénographie', goal: 'Décoration générale, éclairage LED, graphismes et visuels 3D, autres éléments.' },
  { id: 'budget', n: '5', title: 'Budget', goal: 'Estimation et validation du budget prévisionnel.' },
  { id: 'media', n: '6', title: 'Planification du contenu média', goal: 'Planning de communication sur un mois · nombre de teasers (1 ou 2).' },
];

function mediaPlan(eventDate: string, teasers: 1 | 2): Post[] {
  if (!eventDate) return [];
  const p = (d: number, type: string, title: string): Post => ({ id: uid(), date: addDays(eventDate, d), type, title, done: false });
  return [
    p(-30, 'Teaser', 'Teaser 1 · le « ? » de l’édition (vidéo courte, sans infos)'),
    ...(teasers === 2 ? [p(-23, 'Teaser', 'Teaser 2 · révélation de la palette et du thème')] : []),
    p(-21, 'Affiche', 'Affiche officielle + date'),
    p(-18, 'Stories', 'Le concept : house, afro house, disco, indie dance'),
    p(-14, 'Annonce', 'Programmation / le show du crew (DJ, guitare, voix)'),
    p(-10, 'Vidéo', 'Le crew en répétition'),
    p(-7, 'Stories', 'Bracelets d’entrée : prévente'),
    p(-4, 'Stories', '« Objectif ? » : la nuit sans écran expliquée'),
    p(-1, 'Rappel', 'Demain · infos pratiques'),
    p(0, 'Live', 'Le soir : stories du crew uniquement'),
    p(1, 'Récap', 'Photos de la nuit'),
    p(5, 'Vidéo', 'Aftermovie + 1re Live Session'),
  ];
}

function newMeeting(): Meeting {
  const date = today();
  const ev = addDays(date, 30);
  const check = (d: number) => addDays(date, d);
  return {
    id: uid(),
    title: 'Réunion staff · Édition 01',
    date,
    time: '19:00',
    place: '',
    attendees: '',
    eventDate: ev,
    poster: { options: POSTERS.map(([ref, label]) => ({ id: uid(), label, ref, votes: 0 })), decision: '' },
    bands: { options: BANDS.map((ref) => ({ id: uid(), label: DESIGNS.find((d) => d.id === ref)?.name ?? ref, ref, votes: 0 })), decision: '' },
    tasks: [
      { id: uid(), task: 'T-shirts : choisir les modèles et les tailles du crew', who: '', due: check(7), done: false },
      { id: uid(), task: 'T-shirts : devis et commande (sérigraphie / DTF)', who: '', due: check(10), done: false },
      { id: uid(), task: 'T-shirts DJ : prénoms à imprimer', who: '', due: check(10), done: false },
      { id: uid(), task: 'Bracelets : fichier final + quantité', who: '', due: check(7), done: false },
      { id: uid(), task: 'Bracelets : commande fabricant (délai 2–3 semaines)', who: '', due: check(9), done: false },
      { id: uid(), task: 'Stickers « Objectif ? » : impression', who: '', due: check(14), done: false },
    ],
    decor: [
      { id: uid(), label: 'Décoration générale', status: 'à discuter', who: '', check: check(14), note: '' },
      { id: uid(), label: 'Éclairage LED (couleur de l’édition)', status: 'à discuter', who: '', check: check(14), note: '' },
      { id: uid(), label: 'Graphismes et visuels 3D (écrans, boucles)', status: 'à discuter', who: '', check: check(18), note: '' },
      { id: uid(), label: 'Enseigne néon / logo', status: 'à discuter', who: '', check: check(18), note: '' },
      { id: uid(), label: 'Autres éléments de décoration', status: 'à discuter', who: '', check: check(18), note: '' },
    ],
    budget: ['Affiches & impression', 'Bracelets tissu', 'T-shirts crew', 'Stickers « Objectif ? »', 'Décoration', 'Éclairage LED', 'Visuels 3D / écrans', 'Photo & vidéo', 'Divers'].map((poste) => ({ id: uid(), poste, amount: 0, ok: false })),
    currency: 'TND',
    teasers: 1,
    posts: mediaPlan(ev, 1),
    checks: { poster: check(3), bands: check(3), tasks: check(7), decor: check(14), budget: check(7), media: check(5) },
    done: {},
    notes: '',
  };
}

function load(): Meeting[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Meeting[]) : [];
    return list.length ? list : [newMeeting()];
  } catch {
    return [newMeeting()];
  }
}

/* ---------- small inputs ---------- */

const Txt = ({ v, on, ph, wide }: { v: string; on: (s: string) => void; ph?: string; wide?: boolean }) => <input className={`mt-in ${wide ? 'wide' : ''}`} value={v} placeholder={ph} onChange={(e) => on(e.target.value)} />;
const DateIn = ({ v, on }: { v: string; on: (s: string) => void }) => <input type="date" className="mt-in date" value={v} onChange={(e) => on(e.target.value)} />;

function Section({ m, id, set, children }: { m: Meeting; id: string; set: (f: (m: Meeting) => Meeting) => void; children: ReactNode }) {
  const a = AGENDA.find((x) => x.id === id)!;
  const done = !!m.done[id];
  return (
    <section className={`mt-sec ${done ? 'done' : ''}`}>
      <header>
        <span className="mt-n">{a.n}</span>
        <div>
          <h3>{a.title}</h3>
          <p>{a.goal}</p>
        </div>
        <label className="mt-check">
          Check
          <DateIn v={m.checks[id] ?? ''} on={(v) => set((x) => ({ ...x, checks: { ...x.checks, [id]: v } }))} />
        </label>
        <label className="mt-tick">
          <input type="checkbox" checked={done} onChange={(e) => set((x) => ({ ...x, done: { ...x.done, [id]: e.target.checked } }))} />
          Traité
        </label>
      </header>
      <div className="mt-body">{children}</div>
    </section>
  );
}

function VoteBlock({ vote, onChange, thumb, wide }: { vote: Vote; onChange: (v: Vote) => void; thumb: (o: VoteOpt) => ReactNode; wide?: boolean }) {
  const max = Math.max(1, ...vote.options.map((o) => o.votes));
  const top = vote.options.reduce((a, b) => (b.votes > a.votes ? b : a), vote.options[0]);
  const setVotes = (id: string, d: number) => onChange({ ...vote, options: vote.options.map((o) => (o.id === id ? { ...o, votes: Math.max(0, o.votes + d) } : o)) });
  return (
    <div>
      <div className={`mt-votes ${wide ? 'wide' : ''}`}>
        {vote.options.map((o) => (
          <article key={o.id} className={vote.decision === o.label ? 'win' : ''}>
            <div className="mt-thumb">{thumb(o)}</div>
            <b>{o.label}</b>
            <div className="mt-bar">
              <i style={{ width: `${(o.votes / max) * 100}%` }} />
            </div>
            <div className="mt-vote-ctl">
              <button onClick={() => setVotes(o.id, -1)}>−</button>
              <span>{o.votes}</span>
              <button onClick={() => setVotes(o.id, 1)}>+</button>
            </div>
            <button className="mt-pick" onClick={() => onChange({ ...vote, decision: vote.decision === o.label ? '' : o.label })}>
              {vote.decision === o.label ? 'Validé ✓' : 'Valider'}
            </button>
          </article>
        ))}
      </div>
      <p className="mt-result">
        {vote.decision ? (
          <>
            Décision : <b>{vote.decision}</b>
          </>
        ) : top && top.votes > 0 ? (
          <>
            En tête : <b>{top.label}</b> ({top.votes} voix) · cliquez « Valider » pour arrêter le choix
          </>
        ) : (
          'Ajoutez les voix avec + / −, puis validez le choix.'
        )}
      </p>
    </div>
  );
}

/* ======================================================================= */

export function Meetings() {
  const { content, settings, photo } = useStudio();
  const [list, setList] = useState<Meeting[]>(load);
  const [cur, setCur] = useState(list[0].id);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* storage unavailable: the page keeps working for this session */
    }
  }, [list]);
  const m = list.find((x) => x.id === cur) ?? list[0];
  const set = (f: (m: Meeting) => Meeting) => setList((l) => l.map((x) => (x.id === m.id ? f(x) : x)));

  const total = m.budget.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const totalOk = m.budget.filter((r) => r.ok).reduce((a, r) => a + (Number(r.amount) || 0), 0);

  // every dated thing to verify, sorted
  const checks = useMemo(() => {
    const out: { date: string; what: string; where: string; done: boolean }[] = [];
    AGENDA.forEach((a) => m.checks[a.id] && out.push({ date: m.checks[a.id], what: a.title, where: 'Ordre du jour', done: !!m.done[a.id] }));
    m.tasks.forEach((t) => t.due && out.push({ date: t.due, what: t.task + (t.who ? ` — ${t.who}` : ''), where: 'Tâche', done: t.done }));
    m.decor.forEach((r) => r.check && out.push({ date: r.check, what: r.label + (r.who ? ` — ${r.who}` : ''), where: 'Déco', done: r.status === 'validé' }));
    m.posts.forEach((p) => out.push({ date: p.date, what: `${p.type} · ${p.title}`, where: 'Média', done: p.done }));
    if (m.eventDate) out.push({ date: m.eventDate, what: `La soirée · ${content.brand}`, where: 'Événement', done: false });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [m, content.brand]);
  const now = today();
  const progress = Math.round((AGENDA.filter((a) => m.done[a.id]).length / AGENDA.length) * 100);

  const posterThumb = (o: VoteOpt) => {
    const def = o.ref ? CONCEPT_BY_ID[o.ref as ConceptId] : undefined;
    return def ? <div className="art poster portrait">{posterElement(def, content, settings[def.id], photo, 'portrait', false)}</div> : null;
  };
  const bandThumb = (o: VoteOpt) => {
    const d = DESIGNS.find((x) => x.id === o.ref);
    return d ? (
      <svg viewBox="0 0 3500 150" className="mt-band">
        <d.Band content={content} pal={d.pal} />
      </svg>
    ) : null;
  };

  return (
    <div className="table-view meetings">
      <section className="series">
        <header className="series-head mt-head">
          <p className="series-kicker">Réunions staff · ordre du jour · checks</p>
          <h2>{m.title || 'Réunion'}</h2>
          <div className="mt-meta">
            <label>
              Titre <Txt v={m.title} on={(v) => set((x) => ({ ...x, title: v }))} wide />
            </label>
            <label>
              Date <DateIn v={m.date} on={(v) => set((x) => ({ ...x, date: v }))} />
            </label>
            <label>
              Heure <input type="time" className="mt-in date" value={m.time} onChange={(e) => set((x) => ({ ...x, time: e.target.value }))} />
            </label>
            <label>
              Lieu <Txt v={m.place} on={(v) => set((x) => ({ ...x, place: v }))} ph="À définir" />
            </label>
            <label>
              Présents <Txt v={m.attendees} on={(v) => set((x) => ({ ...x, attendees: v }))} ph="Prénoms, séparés par des virgules" wide />
            </label>
            <label>
              Date de la soirée <DateIn v={m.eventDate} on={(v) => set((x) => ({ ...x, eventDate: v }))} />
            </label>
          </div>
          <div className="mt-actions">
            <select className="mt-in" value={m.id} onChange={(e) => setCur(e.target.value)}>
              {list.map((x) => (
                <option key={x.id} value={x.id}>
                  {fmt(x.date)} · {x.title}
                </option>
              ))}
            </select>
            <button
              className="tbtn"
              onClick={() => {
                const n = newMeeting();
                setList((l) => [n, ...l]);
                setCur(n.id);
              }}
            >
              + Nouvelle réunion
            </button>
            <button className="tbtn" onClick={() => window.print()}>
              Imprimer le compte rendu
            </button>
            {list.length > 1 && (
              <button
                className="tbtn"
                onClick={() => {
                  if (!confirm('Supprimer cette réunion ?')) return;
                  const rest = list.filter((x) => x.id !== m.id);
                  setList(rest);
                  setCur(rest[0].id);
                }}
              >
                Supprimer
              </button>
            )}
            <span className="mt-progress">
              <i style={{ width: `${progress}%` }} /> <b>{progress} %</b> de l’ordre du jour traité
            </span>
          </div>
        </header>

        <div className="mt-layout">
          <div className="mt-main">
            <Section m={m} id="poster" set={set}>
              <VoteBlock vote={m.poster} onChange={(poster) => set((x) => ({ ...x, poster }))} thumb={posterThumb} />
            </Section>

            <Section m={m} id="bands" set={set}>
              <VoteBlock vote={m.bands} onChange={(bands) => set((x) => ({ ...x, bands }))} thumb={bandThumb} wide />
            </Section>

            <Section m={m} id="tasks" set={set}>
              <table className="mt-table">
                <thead>
                  <tr>
                    <th>Fait</th>
                    <th>Tâche</th>
                    <th>Responsable</th>
                    <th>À vérifier le</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {m.tasks.map((t) => {
                    const up = (p: Partial<Task>) => set((x) => ({ ...x, tasks: x.tasks.map((k) => (k.id === t.id ? { ...k, ...p } : k)) }));
                    return (
                      <tr key={t.id} className={t.done ? 'ok' : t.due && t.due < now ? 'late' : ''}>
                        <td>
                          <input type="checkbox" checked={t.done} onChange={(e) => up({ done: e.target.checked })} />
                        </td>
                        <td>
                          <Txt v={t.task} on={(v) => up({ task: v })} wide />
                        </td>
                        <td>
                          <Txt v={t.who} on={(v) => up({ who: v })} ph="Qui ?" />
                        </td>
                        <td>
                          <DateIn v={t.due} on={(v) => up({ due: v })} />
                        </td>
                        <td>
                          <button className="mt-x" onClick={() => set((x) => ({ ...x, tasks: x.tasks.filter((k) => k.id !== t.id) }))} title="Retirer">
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button className="tbtn mt-add" onClick={() => set((x) => ({ ...x, tasks: [...x.tasks, { id: uid(), task: '', who: '', due: addDays(x.date, 7), done: false }] }))}>
                + Ajouter une tâche
              </button>
            </Section>

            <Section m={m} id="decor" set={set}>
              <table className="mt-table">
                <thead>
                  <tr>
                    <th>Élément</th>
                    <th>Statut</th>
                    <th>Responsable</th>
                    <th>Check</th>
                    <th>Note</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {m.decor.map((r) => {
                    const up = (p: Partial<CheckRow>) => set((x) => ({ ...x, decor: x.decor.map((k) => (k.id === r.id ? { ...k, ...p } : k)) }));
                    return (
                      <tr key={r.id} className={r.status === 'validé' ? 'ok' : r.status === 'à revoir' ? 'warn' : ''}>
                        <td>
                          <Txt v={r.label} on={(v) => up({ label: v })} wide />
                        </td>
                        <td>
                          <div className="mt-status">
                            {(['à discuter', 'validé', 'à revoir'] as Status[]).map((st) => (
                              <button key={st} className={r.status === st ? 'on' : ''} onClick={() => up({ status: st })}>
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <Txt v={r.who} on={(v) => up({ who: v })} ph="Qui ?" />
                        </td>
                        <td>
                          <DateIn v={r.check} on={(v) => up({ check: v })} />
                        </td>
                        <td>
                          <Txt v={r.note} on={(v) => up({ note: v })} ph="…" />
                        </td>
                        <td>
                          <button className="mt-x" onClick={() => set((x) => ({ ...x, decor: x.decor.filter((k) => k.id !== r.id) }))} title="Retirer">
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button className="tbtn mt-add" onClick={() => set((x) => ({ ...x, decor: [...x.decor, { id: uid(), label: '', status: 'à discuter', who: '', check: addDays(x.date, 14), note: '' }] }))}>
                + Ajouter un élément
              </button>
            </Section>

            <Section m={m} id="budget" set={set}>
              <table className="mt-table">
                <thead>
                  <tr>
                    <th>Poste</th>
                    <th className="num">Estimation ({m.currency})</th>
                    <th>Validé</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {m.budget.map((r) => {
                    const up = (p: Partial<BudgetRow>) => set((x) => ({ ...x, budget: x.budget.map((k) => (k.id === r.id ? { ...k, ...p } : k)) }));
                    return (
                      <tr key={r.id} className={r.ok ? 'ok' : ''}>
                        <td>
                          <Txt v={r.poste} on={(v) => up({ poste: v })} wide />
                        </td>
                        <td className="num">
                          <input type="number" min={0} step={10} className="mt-in num" value={r.amount || ''} placeholder="0" onChange={(e) => up({ amount: Number(e.target.value) })} />
                        </td>
                        <td>
                          <input type="checkbox" checked={r.ok} onChange={(e) => up({ ok: e.target.checked })} />
                        </td>
                        <td>
                          <button className="mt-x" onClick={() => set((x) => ({ ...x, budget: x.budget.filter((k) => k.id !== r.id) }))} title="Retirer">
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total prévisionnel</td>
                    <td className="num">
                      <b>
                        {total.toLocaleString('fr-FR')} {m.currency}
                      </b>
                    </td>
                    <td colSpan={2}>
                      dont validé : {totalOk.toLocaleString('fr-FR')} {m.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
              <div className="mt-row">
                <button className="tbtn mt-add" onClick={() => set((x) => ({ ...x, budget: [...x.budget, { id: uid(), poste: '', amount: 0, ok: false }] }))}>
                  + Ajouter un poste
                </button>
                <label>
                  Devise <Txt v={m.currency} on={(v) => set((x) => ({ ...x, currency: v }))} />
                </label>
              </div>
            </Section>

            <Section m={m} id="media" set={set}>
              <div className="mt-row">
                <span>Nombre de teasers :</span>
                <div className="mt-status">
                  {([1, 2] as const).map((n) => (
                    <button key={n} className={m.teasers === n ? 'on' : ''} onClick={() => set((x) => ({ ...x, teasers: n }))}>
                      {n} teaser{n > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                <button
                  className="tbtn"
                  onClick={() => {
                    if (m.posts.some((p) => p.done) && !confirm('Recalculer le planning ? Les publications cochées seront remplacées.')) return;
                    set((x) => ({ ...x, posts: mediaPlan(x.eventDate, x.teasers) }));
                  }}
                >
                  Générer le planning (1 mois avant la soirée)
                </button>
              </div>
              <table className="mt-table">
                <thead>
                  <tr>
                    <th>Publié</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Contenu</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...m.posts]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((p) => {
                      const up = (q: Partial<Post>) => set((x) => ({ ...x, posts: x.posts.map((k) => (k.id === p.id ? { ...k, ...q } : k)) }));
                      return (
                        <tr key={p.id} className={p.done ? 'ok' : p.date < now ? 'late' : ''}>
                          <td>
                            <input type="checkbox" checked={p.done} onChange={(e) => up({ done: e.target.checked })} />
                          </td>
                          <td>
                            <DateIn v={p.date} on={(v) => up({ date: v })} />
                          </td>
                          <td>
                            <Txt v={p.type} on={(v) => up({ type: v })} />
                          </td>
                          <td>
                            <Txt v={p.title} on={(v) => up({ title: v })} wide />
                          </td>
                          <td>
                            <button className="mt-x" onClick={() => set((x) => ({ ...x, posts: x.posts.filter((k) => k.id !== p.id) }))} title="Retirer">
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <button className="tbtn mt-add" onClick={() => set((x) => ({ ...x, posts: [...x.posts, { id: uid(), date: x.date, type: 'Post', title: '', done: false }] }))}>
                + Ajouter une publication
              </button>
            </Section>

            <section className="mt-sec">
              <header>
                <span className="mt-n">✎</span>
                <div>
                  <h3>Notes de réunion</h3>
                  <p>Décisions, remarques, points à reprendre la prochaine fois.</p>
                </div>
              </header>
              <div className="mt-body">
                <textarea className="mt-notes" value={m.notes} onChange={(e) => set((x) => ({ ...x, notes: e.target.value }))} placeholder="…" />
              </div>
            </section>
          </div>

          <aside className="mt-side">
            <h4>Checks à vérifier</h4>
            <p className="mt-side-sub">Toutes les dates de la réunion, dans l’ordre. En rouge : dépassé et pas encore fait.</p>
            <ol className="mt-timeline">
              {checks.map((c, i) => (
                <li key={i} className={c.done ? 'ok' : c.date < now ? 'late' : c.date === now ? 'today' : ''}>
                  <time>{fmt(c.date)}</time>
                  <span>{c.where}</span>
                  <b>{c.what}</b>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
    </div>
  );
}
