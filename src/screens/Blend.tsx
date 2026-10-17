import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Plus, Users, Clock } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Avatar, Cover, Ring, Seg, Sheet, Spinner, Stepper, useToast } from '../components/ui';
import { blend, type Ranked } from '../lib/scoring';
import { aiSuggest, type AiSuggest } from '../lib/gemini';
import type { Item, Kind, Profile } from '../lib/types';
import { KIND_META } from '../lib/vocab';
import { fmtRuntime, fmtTime, norm, uid } from '../lib/util';
import { t, ti } from '../lib/i18n';

export default function Blend({ initialKind, onClose }: { initialKind?: Kind; onClose: () => void }) {
  const { profiles, items } = useStore();
  const real = profiles.filter((p) => !p.guest);
  const [sel, setSel] = useState<string[]>(() => (real.length >= 2 ? real : profiles).slice(0, 2).map((p) => p.id));
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [kind, setKind] = useState<Kind>(initialKind || 'game');
  const [players, setPlayers] = useState(2);
  const [minutes, setMinutes] = useState(0);

  const who = sel.map((id) => profiles.find((p) => p.id === id)!).filter(Boolean);
  const w = (id: string) => weights[id] ?? 50;
  useEffect(() => { setPlayers(Math.max(2, who.length)); }, [sel.length]);

  const ranked = useMemo(() => blend(who.map((p) => ({ p, w: w(p.id) })), items, { kind, players: kind === 'game' ? players : undefined, maxMinutes: minutes || undefined }),
    [who, weights, items, kind, players, minutes]);

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const two = who.length === 2;
  const pct = two ? Math.round((w(who[0].id) / (w(who[0].id) + w(who[1].id))) * 100) : 0;

  return (
    <Sheet title={t('Mélange de goûts')} onClose={onClose} full accent="var(--c-movie)">
      <div className="eyebrow">{t('Qui choisit ?')}</div>
      <div className="scroll-x mt8">
        {profiles.map((p) => (
          <button key={p.id} className={`chip ${sel.includes(p.id) ? 'on' : ''}`} style={{ '--accent': p.color, height: 40, paddingLeft: 6 } as any} onClick={() => toggle(p.id)}>
            <Avatar p={p} size="sm" /> {p.name}
          </button>
        ))}
      </div>

      {who.length === 0 && <p className="muted mt20">{t('Choisis au moins un profil.')}</p>}

      {two && (
        <div className="card mt20">
          <div className="row between small">
            <span className="row gap6"><Avatar p={who[0]} size="sm" /><b>{pct}%</b></span>
            <span className="muted tiny">{t('glisse pour pencher d’un côté')}</span>
            <span className="row gap6"><b>{100 - pct}%</b><Avatar p={who[1]} size="sm" /></span>
          </div>
          <div className="blend-track mt12" style={{ background: who[1].color }}>
            <div style={{ width: `${pct}%`, background: who[0].color }}>{pct > 18 ? who[0].name : ''}</div>
            <div style={{ flex: 1, justifyContent: 'flex-end' }}>{100 - pct > 18 ? who[1].name : ''}</div>
            <span className="blend-thumb" style={{ left: `${pct}%` }} />
            <input className="blend-range" type="range" min={0} max={100} value={pct}
              onChange={(e) => setWeights({ ...weights, [who[0].id]: +e.target.value, [who[1].id]: 100 - +e.target.value })} />
          </div>
          <div className="row between mt12">
            {[[100, 0], [70, 30], [50, 50], [30, 70], [0, 100]].map(([a, b]) => (
              <button key={a} className={`chip static ${pct === a ? 'on' : ''}`} onClick={() => setWeights({ ...weights, [who[0].id]: a, [who[1].id]: b })}>{a}/{b}</button>
            ))}
          </div>
        </div>
      )}
      {who.length > 2 && (
        <div className="card mt20 col gap14">
          {who.map((p) => {
            const total = who.reduce((a, x) => a + w(x.id), 0) || 1;
            return (
              <div key={p.id} className="row" style={{ '--accent': p.color } as any}>
                <Avatar p={p} size="sm" />
                <input type="range" min={0} max={100} value={w(p.id)} onChange={(e) => setWeights({ ...weights, [p.id]: +e.target.value })} className="grow" />
                <b style={{ width: 44, textAlign: 'right' }}>{Math.round((w(p.id) / total) * 100)}%</b>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt20"><Seg value={kind} onChange={setKind} options={(['game', 'movie', 'series'] as Kind[]).map((k) => ({ v: k, label: `${KIND_META[k].emoji} ${KIND_META[k].label}`, c: KIND_META[k].color }))} /></div>
      <div className="grid2 mt12">
        {kind === 'game' ? <Stepper value={players} onChange={setPlayers} min={1} max={12} label={t('joueurs')} /> : <div />}
        <select className="input" value={minutes} onChange={(e) => setMinutes(+e.target.value)}>
          <option value={0}>{t('Temps : peu importe')}</option>
          {[20, 30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{t('Max')} {fmtRuntime(m)}</option>)}
        </select>
      </div>

      {who.length > 0 && <Results ranked={ranked} who={who.map((p) => ({ p, w: w(p.id) }))} kind={kind}
        context={`${kind === 'game' ? `${players} players` : ''}${minutes ? `, max ${minutes} min` : ''}`} />}
    </Sheet>
  );
}

export function Results({ ranked, who, kind, context, guestsNote }: {
  ranked: Ranked[]; who: { p: Profile; w: number }[]; kind: Kind; context: string; guestsNote?: string;
}) {
  const { settings, items, addItems } = useStore();
  const nav = useNav();
  const toast = useToast();
  const [ai, setAi] = useState<AiSuggest | null>(null);
  const [busy, setBusy] = useState(false);
  const accent = KIND_META[kind].color;

  const askAi = async () => {
    setBusy(true);
    try {
      setAi(await aiSuggest(settings, { kind, who: who.length ? who : [], candidates: ranked.map((r) => r.item), allItems: items, context: context + (guestsNote ? `. Guests: ${guestsNote}` : '') }));
    } catch (e: any) { toast(e.message, true); } finally { setBusy(false); }
  };

  const addWish = async (title: string, year?: number) => {
    const it: Item = { id: uid(14), kind, title, year, addedAt: Date.now(), status: kind === 'game' ? 'wishlist' : 'watchlist', enriched: false };
    await addItems([it]);
    toast(kind === 'game' ? t('« {title} » ajouté à ta liste de souhaits', { title }) : t('« {title} » ajouté à « à voir »', { title }));
  };

  const top = ranked.slice(0, 12);
  return (
    <div className="mt20" style={{ '--accent': accent } as any}>
      <div className="section-title" style={{ marginTop: 0 }}><h2>{t('Meilleurs choix')}</h2><span className="tiny dim">{t('{n} compatibles', { n: ranked.length })}</span></div>
      {top.length === 0 ? (
        <div className="card muted small">{t('Rien dans la collection ne correspond à ces critères. Élargis le temps ou le nombre de joueurs, ou demande des idées à l’IA.')}</div>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {top.map((r, i) => (
            <button key={r.item.id} className="inv-row" onClick={() => nav.push({ t: 'item', id: r.item.id })} style={i === 0 ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 10%, var(--s1))` } : undefined}>
              <Cover item={r.item} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row gap6"><b className="ellipsis">{i === 0 ? '🏆 ' : ''}{ti(r.item)}</b></div>
                <div className="meta" style={{ marginTop: 2 }}>
                  {r.item.kind === 'game'
                    ? <><span><Users size={12} />{r.item.minPlayers === r.item.maxPlayers ? r.item.minPlayers : `${r.item.minPlayers}–${r.item.maxPlayers}`}</span><span><Clock size={12} />{fmtTime(r.item.minTime, r.item.maxTime)}</span></>
                    : <><span>{r.item.year}</span><span><Clock size={12} />{fmtRuntime(r.item.runtime)}</span></>}
                </div>
                <div className="row gap6" style={{ marginTop: 6 }}>
                  {r.per.map(({ p, s }) => (
                    <div key={p.id} className="row" style={{ gap: 4, flex: 1, minWidth: 0 }} title={`${p.name} : ${s}%`}>
                      <span style={{ fontSize: 12 }}>{p.emoji}</span>
                      <div className="bar grow" style={{ '--pc': p.color, height: 5 } as any}><div style={{ width: `${s}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <Ring value={r.score} color={accent} />
            </button>
          ))}
        </div>
      )}

      <div className="card mt20 glow" style={{ '--accent': 'var(--c-suggest)' } as any}>
        <div className="row between">
          <div><h3>✨ {t('L’avis de l’IA')}</h3><p className="small muted">{t('Explication du choix + 3 découvertes hors collection')}</p></div>
          <button className="btn sm accent" style={{ '--accent': 'var(--c-suggest)', color: '#000' } as any} onClick={askAi} disabled={busy || !settings.geminiKey}>
            {busy ? <Spinner size={14} /> : <Sparkles size={15} />} {ai ? t('Relancer') : t('Demander')}
          </button>
        </div>
        {!settings.geminiKey && <p className="tiny dim mt8">{t('Ajoute ta clé Gemini dans Réglages.')}</p>}
        {ai && (
          <div className="col mt12 gap14">
            {ai.comment && <p style={{ fontStyle: 'italic' }}>« {ai.comment} »</p>}
            {ai.picks?.map((p, i) => {
              const it = items.find((x) => norm(x.title) === norm(p.title) || norm(ti(x)) === norm(p.title));
              return (
                <button key={i} className="row" style={{ textAlign: 'left', alignItems: 'flex-start' }} onClick={() => it && nav.push({ t: 'item', id: it.id })}>
                  <span style={{ fontSize: 20 }}>{['🥇', '🥈', '🥉'][i] || '•'}</span>
                  <div><b>{p.title}</b><p className="small muted">{p.why}</p></div>
                </button>
              );
            })}
            {!!ai.discover?.length && (
              <>
                <div className="eyebrow">{t('À découvrir')}</div>
                {ai.discover.map((d, i) => (
                  <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 20 }}>🔭</span>
                    <div className="grow"><b>{d.title}</b>{d.year ? <span className="dim small"> ({d.year})</span> : null}<p className="small muted">{d.why}</p></div>
                    <button className="icon-btn sm" onClick={() => addWish(d.title, d.year)} aria-label={t('Ajouter')}><Plus size={16} /></button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
