import { useRef, useState } from 'react';
import { ArrowLeft, Users, Clock, Baby, Brain, Play, Check, Trash2, RefreshCw, Pencil, Camera, Send, Heart, Film, Tv, Star, Sparkles, Handshake, ExternalLink, Trophy, Radio } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Avatar, Cover, Sheet, Stars, Spinner, useToast } from '../components/ui';
import { askAbout, enrich, translateItem } from '../lib/gemini';
import { tmdbLookup } from '../lib/tmdb';
import { profileScore } from '../lib/scoring';
import { fileToImage, resize } from '../lib/image';
import type { Item } from '../lib/types';
import { FORMATS, GAME_CATEGORIES, KIND_META, MEDIA_GENRES, MOODS } from '../lib/vocab';
import { fmtRuntime } from '../lib/util';
import { links } from '../lib/meta';
import LogPlay from '../components/LogPlay';
import { t, tv, ti, L, getLang } from '../lib/i18n';

export default function ItemDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { items, profiles, settings, updateItem, deleteItem, rate } = useStore();
  const nav = useNav();
  const toast = useToast();
  const item = items.find((i) => i.id === id);
  const [tab, setTab] = useState<'info' | 'rules' | 'facts' | 'ask' | 'notes'>('info');
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [logging, setLogging] = useState(false);
  const [lending, setLending] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  if (!item) return null;
  const accent = KIND_META[item.kind].color;
  const isGame = item.kind === 'game';
  const wish = item.status === 'wishlist' || item.status === 'watchlist';
  const lx = L(item);

  const translate = async () => {
    setTranslating(true);
    try {
      const lang = getLang();
      const loc = await translateItem(settings, item, lang);
      await updateItem(item.id, { loc: { ...(item.loc || {}), [lang]: loc } });
    } catch (e: any) { toast(e.message, true); } finally { setTranslating(false); }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await enrich(settings, item.kind, item.title, item.year ? `(${item.year})` : '');
      let tm = null;
      try { tm = await tmdbLookup(settings, item.kind, r.originalTitle || r.title || item.title, r.year); } catch { /* */ }
      await updateItem(item.id, { ...r, ...(tm || {}), image: tm?.image || item.image });
      toast(t('Fiche mise à jour'));
    } catch (e: any) { toast(e.message, true); } finally { setRefreshing(false); }
  };

  const markPlayed = async () => {
    await updateItem(item.id, { playCount: (item.playCount || 0) + 1, lastPlayed: Date.now(), status: item.kind !== 'game' && item.status === 'watchlist' ? 'seen' : item.status });
    toast(isGame ? t('Partie notée 🎲') : t('Marqué comme vu 🍿'));
  };

  const onPhoto = async (f?: File) => {
    if (!f) return;
    const img = await fileToImage(f);
    await updateItem(item.id, { image: resize(img, 500, 0.82) });
  };

  const tabs = isGame
    ? ([['info', t('Aperçu')], ['rules', t('Règles')], ['facts', t('Fun facts')], ['ask', t('Questions')], ['notes', t('Notes')]] as const)
    : ([['info', t('Aperçu')], ['facts', t('Fun facts')], ['ask', t('Questions')], ['notes', t('Notes')]] as const);

  return (
    <Sheet onClose={onClose} full accent={accent}>
      <div className="detail-hero">
        {item.image && <div className="bgimg" style={{ backgroundImage: `url(${item.image})` }} />}
        {!item.image && <div className="bgimg" style={{ background: `radial-gradient(circle at 30% 30%, ${accent}, transparent 70%)` }} />}
        <div className="row between" style={{ position: 'absolute', top: 'calc(var(--safe-t) + 10px)', left: 18, right: 18 }}>
          <button className="icon-btn" onClick={onClose} aria-label={t('Retour')} style={{ background: 'var(--scrim)' }}><ArrowLeft size={20} /></button>
          <div className="row gap6">
            <button className="icon-btn" style={{ background: 'var(--scrim)' }} onClick={() => photoRef.current?.click()} aria-label={t('Photo')}><Camera size={18} /></button>
            <button className="icon-btn" style={{ background: 'var(--scrim)' }} onClick={() => setEditing(true)} aria-label={t('Modifier')}><Pencil size={18} /></button>
          </div>
        </div>
        <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        <div className="row" style={{ alignItems: 'flex-end', gap: 16 }}>
          <Cover item={item} style={{ width: isGame ? 120 : 104, boxShadow: '0 16px 30px -10px rgba(0,0,0,.7)' }} />
          <div className="grow" style={{ minWidth: 0 }}>
            <span className="eyebrow" style={{ color: accent }}>{KIND_META[item.kind].single}{wish ? ` · ${t('souhait')}` : ''}</span>
            <h1 style={{ fontSize: 25, marginTop: 4 }}>{lx.title}</h1>
            <p className="muted small mt8" style={{ marginTop: 4 }}>
              {[item.originalTitle && item.originalTitle !== lx.title ? item.originalTitle : null, item.year, isGame ? item.designer : item.director].filter(Boolean).join(' · ')}
            </p>
            {item.tmdbRating ? <p className="small mt8 row gap4" style={{ marginTop: 4 }}><Star size={14} color="var(--c-suggest)" fill="var(--c-suggest)" /> {item.tmdbRating}/10 TMDB</p> : null}
          </div>
        </div>
      </div>

      {!item.enriched && !item.enrichError && settings.geminiKey && (
        <div className="card row small mt12"><Spinner size={16} /> {t('L’IA prépare la fiche…')}</div>
      )}
      {item.enrichError && (
        <div className="card row small mt12" style={{ borderColor: 'color-mix(in srgb, var(--bad) 50%, transparent)' }}>
          <span className="grow">{t('Fiche incomplète :')} {item.enrichError}</span>
          <button className="btn sm" onClick={refresh} disabled={refreshing}>{refreshing ? <Spinner size={14} /> : t('Réessayer')}</button>
        </div>
      )}

      <div className="grid-4 mt12" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {isGame ? (
          <>
            <div className="stat"><Users size={16} color={accent} /><b>{item.minPlayers ? `${item.minPlayers}${item.maxPlayers && item.maxPlayers !== item.minPlayers ? `–${item.maxPlayers}` : ''}` : '?'}</b><small>{t('joueurs')}{item.bestPlayers ? ` (${t('idéal')} ${item.bestPlayers})` : ''}</small></div>
            <div className="stat"><Clock size={16} color={accent} /><b>{item.minTime || item.maxTime || '?'}{item.maxTime && item.minTime && item.maxTime !== item.minTime ? `–${item.maxTime}` : ''}</b><small>minutes</small></div>
            <div className="stat"><Baby size={16} color={accent} /><b>{item.minAge ? `${item.minAge}+` : '?'}</b><small>{t('âge')}</small></div>
            <div className="stat"><Brain size={16} color={accent} /><b>{item.weight ? item.weight.toFixed(1) : '?'}</b><small>{t('complexité /5')}</small></div>
          </>
        ) : (
          <>
            <div className="stat">{item.kind === 'movie' ? <Film size={16} color={accent} /> : <Tv size={16} color={accent} />}<b>{item.year || '?'}</b><small>{t('année')}</small></div>
            <div className="stat"><Clock size={16} color={accent} /><b style={{ fontSize: 15 }}>{item.runtime ? fmtRuntime(item.runtime) : '?'}</b><small>{item.kind === 'series' ? t('par épisode') : t('durée')}</small></div>
            <div className="stat"><b>{item.kind === 'series' ? item.seasons || '?' : item.format ? tv(item.format) : '—'}</b><small>{item.kind === 'series' ? t('saisons') : t('format')}</small></div>
            <div className="stat"><Baby size={16} color={accent} /><b>{item.minAge ? `${item.minAge}+` : '—'}</b><small>{t('âge')}</small></div>
          </>
        )}
      </div>

      <div className="grid2 mt12">
        <button className="btn accent" onClick={() => setLogging(true)}><Check size={18} /> {isGame ? t('On y a joué') : t('Vu')}{item.playCount ? ` (${item.playCount})` : ''}</button>
        {isGame ? (
          <button className="btn" onClick={() => nav.push({ t: 'tool', tool: 'score' })}><Play size={18} /> {t('Feuille de score')}</button>
        ) : (
          <button className="btn" onClick={() => updateItem(item.id, { status: wish ? 'owned' : 'watchlist' })}><Heart size={18} /> {wish ? t('Je l’ai') : t('À voir')}</button>
        )}
      </div>

      {item.lentTo ? (
        <div className="card row mt12" style={{ borderColor: 'color-mix(in srgb, var(--c-suggest) 50%, transparent)' }}>
          <Handshake size={20} color="var(--c-suggest)" />
          <div className="grow small"><b>{t('Prêté à {name}', { name: item.lentTo })}</b>{item.lentAt ? <div className="dim tiny">{t('depuis le {d}', { d: new Date(item.lentAt).toLocaleDateString(getLang() === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'long' }) })}</div> : null}</div>
          <button className="btn sm" onClick={() => updateItem(item.id, { lentTo: null, lentAt: null } as any).then(() => toast(t('Retour enregistré')))}>{t('Il est revenu')}</button>
        </div>
      ) : (
        <button className="btn sm mt12" onClick={() => setLending(true)}><Handshake size={15} /> {t('Prêter à quelqu’un')}</button>
      )}

      {item.whereToWatch && (
        <p className="small mt12 row gap6"><Radio size={15} color={accent} /> {t('Diffusé sur')} <b>{item.whereToWatch}</b></p>
      )}

      <div className="scroll-x mt12">
        {links(item).map((l) => (
          <a key={l.url} className="chip" href={l.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>{l.icon} {l.label} <ExternalLink size={12} /></a>
        ))}
      </div>

      <History item={item} />

      {/* Qui aimerait ? */}
      {profiles.length > 0 && (
        <div className="card mt20">
          <div className="row between"><h3>{t('Qui aimerait ?')}</h3><span className="tiny dim">{t('touche les étoiles pour noter')}</span></div>
          <div className="col mt12" style={{ gap: 14 }}>
            {profiles.map((p) => {
              const s = profileScore(p, item, items);
              return (
                <div key={p.id} className="row" style={{ gap: 12 }}>
                  <Avatar p={p} size="sm" />
                  <div className="grow">
                    <div className="row between small"><b>{p.name}</b><span style={{ color: p.color, fontWeight: 700 }}>{s}%</span></div>
                    <div className="bar mt8" style={{ '--pc': p.color, marginTop: 5 } as any}><div style={{ width: `${s}%` }} /></div>
                  </div>
                  <Stars value={p.ratings?.[item.id] || 0} onChange={(n) => rate(p.id, item.id, n)} size={15} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lx.missing && (
        <div className="card row small mt20" style={{ borderColor: 'color-mix(in srgb, var(--accent) 45%, transparent)' }}>
          <span className="grow">{t('Une partie de cette fiche n’existe qu’en français.')}</span>
          <button className="btn sm" onClick={translate} disabled={translating || !settings.geminiKey}>{translating ? <Spinner size={14} /> : '🌐'} {t('Traduire')}</button>
        </div>
      )}

      <div className="tab-line">
        {tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'info' && <Overview item={item} />}
      {tab === 'rules' && <RulesView item={item} onRefresh={refresh} refreshing={refreshing} />}
      {tab === 'facts' && (
        <div className="col">
          {(lx.funFacts || []).length ? lx.funFacts!.map((f, i) => (
            <div key={i} className="fact"><span style={{ fontSize: 22 }}>{['💡', '🤯', '🎯', '🏆', '🔍'][i % 5]}</span><p>{f}</p></div>
          )) : <p className="muted small">{t('Pas encore de fun facts.')}</p>}
        </div>
      )}
      {tab === 'ask' && <AskBox item={item} />}
      {tab === 'notes' && (
        <textarea className="input" rows={6} placeholder={t('Variantes maison, extensions possédées, qui a gagné…')} defaultValue={item.notes || ''}
          onBlur={(e) => e.target.value !== (item.notes || '') && updateItem(item.id, { notes: e.target.value })} />
      )}

      <hr />
      <div className="row wrap gap6">
        <button className="btn sm" onClick={refresh} disabled={refreshing || !settings.geminiKey}>{refreshing ? <Spinner size={14} /> : <RefreshCw size={15} />} {t('Régénérer la fiche')}</button>
        {isGame && <button className="btn sm" onClick={() => updateItem(item.id, { status: wish ? 'owned' : 'wishlist' })}>{wish ? t('Je l’ai maintenant') : t('Déplacer en souhaits')}</button>}
        <button className="btn sm danger" onClick={async () => { if (confirm(t('Retirer « {title} » de la collection ?', { title: lx.title }))) { await deleteItem(item.id); onClose(); } }}><Trash2 size={15} /> {t('Retirer')}</button>
      </div>

      {editing && <EditItem item={item} onClose={() => setEditing(false)} />}
      {logging && <LogPlay item={item} onClose={() => setLogging(false)} />}
      {lending && <LendSheet onClose={() => setLending(false)} onSave={(name) => updateItem(item.id, { lentTo: name, lentAt: Date.now() }).then(() => { setLending(false); toast(t('Prêt noté')); })} />}
    </Sheet>
  );
}

function LendSheet({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <Sheet title={t('Prêter à quelqu’un')} onClose={onClose} accent="var(--c-suggest)">
      <input className="input" autoFocus placeholder={t('Nom de la personne')} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name.trim())} />
      <button className="btn primary block mt12" disabled={!name.trim()} onClick={() => onSave(name.trim())}>{t('Enregistrer')}</button>
    </Sheet>
  );
}

function History({ item }: { item: Item }) {
  const { plays, profiles, deletePlay } = useStore();
  const mine = plays.filter((p) => p.itemId === item.id).slice(0, 6);
  if (!mine.length) return null;
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name || id;
  return (
    <div className="card mt20">
      <h3>{item.kind === 'game' ? t('Dernières parties') : t('Visionnements')}</h3>
      <div className="col mt12" style={{ gap: 10 }}>
        {mine.map((p) => (
          <div key={p.id} className="row small" style={{ alignItems: 'flex-start' }}>
            <span className="dim tiny" style={{ width: 70, flexShrink: 0, paddingTop: 2 }}>{new Date(p.date).toLocaleDateString(getLang() === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' })}</span>
            <div className="grow">
              {p.winners.length > 0 && <div><Trophy size={13} color="var(--c-suggest)" style={{ verticalAlign: -2 }} /> <b>{p.winners.map(nameOf).join(', ')}</b></div>}
              <div className="muted">{p.players.map((x) => `${nameOf(x)}${p.scores?.[x] != null ? ` (${p.scores[x]})` : ''}`).join(' · ')}</div>
              {p.notes && <div className="dim tiny">{p.notes}</div>}
            </div>
            <button className="dim tiny" onClick={() => deletePlay(p.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Overview({ item }: { item: Item }) {
  const tags = item.kind === 'game' ? item.categories : item.genres;
  const lx = L(item);
  return (
    <div className="col gap14">
      {lx.summary && <p style={{ fontSize: 15.5 }}>{lx.summary}</p>}
      {!!tags?.length && <div className="chips">{tags.map((c) => <span key={c} className="chip static on">{tv(c)}</span>)}{item.moods?.map((m) => <span key={m} className="chip static">{MOODS.find((x) => x.key === m)?.emoji} {tv(m)}</span>)}</div>}
      {item.kind === 'game' && !!lx.mechanics?.length && (
        <div><div className="eyebrow">{t('Mécaniques')}</div><p className="mt8 muted">{lx.mechanics.join(' · ')}</p></div>
      )}
      {item.kind === 'game' && item.publisher && <div><div className="eyebrow">{t('Éditeur')}</div><p className="mt8 muted">{item.publisher}</p></div>}
      {item.kind !== 'game' && !!item.cast?.length && (
        <div>
          <div className="eyebrow">{t('Distribution')}</div>
          <div className="scroll-x mt12">
            {item.cast.map((c) => (
              <div key={c} style={{ width: 82, flexShrink: 0, textAlign: 'center' }}>
                <div className="avatar lg" style={{ '--pc': 'var(--c-movie)', margin: '0 auto', fontSize: 20, fontFamily: 'var(--display)', fontWeight: 700 } as any}>{c.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
                <div className="tiny mt8">{c}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {item.kind !== 'game' && item.director && <div><div className="eyebrow">{item.kind === 'series' ? t('Création') : t('Réalisation')}</div><p className="mt8 muted">{item.director}</p></div>}
      {item.lastPlayed && <p className="tiny dim">{t('Dernière fois :')} {new Date(item.lastPlayed).toLocaleDateString(getLang() === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
    </div>
  );
}

function RulesView({ item, onRefresh, refreshing }: { item: Item; onRefresh: () => void; refreshing: boolean }) {
  const r = L(item).rules;
  if (!r) return (
    <div className="empty"><div className="em">📖</div><p>{t('Les règles n’ont pas encore été générées.')}</p>
      <button className="btn mt12" onClick={onRefresh} disabled={refreshing}>{refreshing ? <Spinner size={16} /> : <Sparkles size={16} />} {t('Générer les règles')}</button></div>
  );
  const Block = ({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) => (
    <div className="card"><h3>{emoji} {title}</h3><div className="mt8 muted" style={{ color: 'var(--tx)' }}>{children}</div></div>
  );
  return (
    <div className="col rules gap14">
      {r.goal && <Block title={t('But du jeu')} emoji="🎯">{r.goal}</Block>}
      {!!r.setup?.length && <Block title={t('Mise en place')} emoji="🧩"><ol>{r.setup.map((s, i) => <li key={i}>{s}</li>)}</ol></Block>}
      {!!r.turn?.length && <Block title={t('Déroulement d’un tour')} emoji="🔁"><ol>{r.turn.map((s, i) => <li key={i}>{s}</li>)}</ol></Block>}
      {r.end && <Block title={t('Fin de partie')} emoji="🏁">{r.end}</Block>}
      {!!r.tips?.length && <Block title={t('Conseils')} emoji="💡"><ul>{r.tips.map((s, i) => <li key={i}>{s}</li>)}</ul></Block>}
      {!!r.variants?.length && <Block title={t('Variantes')} emoji="🔀"><ul>{r.variants.map((s, i) => <li key={i}>{s}</li>)}</ul></Block>}
      <p className="tiny dim">{t('Résumé généré par IA : en cas de doute, le livret officiel a toujours raison.')}</p>
    </div>
  );
}

function AskBox({ item }: { item: Item }) {
  const { settings } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<{ q: string; a: string }[]>([]);
  const ideas = item.kind === 'game'
    ? [t('Explique-moi le jeu en 1 minute'), t('Comment ça marche à 2 joueurs ?'), t('Quelle est l’erreur de règle la plus fréquente ?'), t('Une stratégie pour gagner ma première partie ?')]
    : [t('Faut-il avoir vu autre chose avant ?'), t('C’est adapté pour un ado ?'), t('Si on a aimé ça, quoi regarder ensuite ?'), t('Des clins d’œil à repérer ?')];
  const ask = async (question: string) => {
    if (!question.trim()) return;
    setBusy(true);
    try {
      const a = await askAbout(settings, item, question, hist.slice(-3));
      setHist((h) => [...h, { q: question, a }]);
      setQ('');
    } catch (e: any) { toast(e.message, true); } finally { setBusy(false); }
  };
  return (
    <div className="col">
      {hist.length === 0 && <div className="chips">{ideas.map((i) => <button key={i} className="chip" onClick={() => ask(i)} disabled={busy}>{i}</button>)}</div>}
      {hist.map((h, i) => (
        <div key={i} className="col" style={{ gap: 8 }}>
          <div style={{ alignSelf: 'flex-end', background: 'var(--accent)', color: '#fff', padding: '9px 13px', borderRadius: '16px 16px 4px 16px', maxWidth: '85%' }}>{h.q}</div>
          <div className="card answer" style={{ borderRadius: '16px 16px 16px 4px' }}>{h.a}</div>
        </div>
      ))}
      {busy && <div className="row small muted"><Spinner size={16} /> {t('Réflexion…')}</div>}
      <div className="row mt8">
        <input className="input grow" placeholder={t('Pose ta question…')} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(q)} />
        <button className="icon-btn" style={{ background: 'var(--accent)', border: 0 }} onClick={() => ask(q)} disabled={busy || !q.trim()}><Send size={18} /></button>
      </div>
    </div>
  );
}

function EditItem({ item, onClose }: { item: Item; onClose: () => void }) {
  const { updateItem } = useStore();
  // Le titre modifié est celui de la langue affichée
  const enTitle = getLang() === 'en' && !!item.loc?.en;
  const [d, setD] = useState<Item>({ ...item, title: ti(item) });
  const isGame = item.kind === 'game';
  const n = (v: string) => (v === '' ? undefined : Number(v));
  const tags = isGame ? GAME_CATEGORIES : MEDIA_GENRES;
  const field = isGame ? 'categories' : 'genres';
  const cur = (d[field] || []) as string[];
  return (
    <Sheet title={t('Modifier')} onClose={onClose}>
      <div className="col gap14">
        <div className="field"><label>{t('Titre')}</label><input className="input" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></div>
        <div className="grid2">
          <div className="field"><label>{t('Année')}</label><input className="input" inputMode="numeric" value={d.year ?? ''} onChange={(e) => setD({ ...d, year: n(e.target.value) })} /></div>
          <div className="field"><label>{t('Âge min.')}</label><input className="input" inputMode="numeric" value={d.minAge ?? ''} onChange={(e) => setD({ ...d, minAge: n(e.target.value) })} /></div>
        </div>
        {isGame ? (
          <>
            <div className="grid2">
              <div className="field"><label>{t('Joueurs min.')}</label><input className="input" inputMode="numeric" value={d.minPlayers ?? ''} onChange={(e) => setD({ ...d, minPlayers: n(e.target.value) })} /></div>
              <div className="field"><label>{t('Joueurs max.')}</label><input className="input" inputMode="numeric" value={d.maxPlayers ?? ''} onChange={(e) => setD({ ...d, maxPlayers: n(e.target.value) })} /></div>
              <div className="field"><label>{t('Durée min. (min)')}</label><input className="input" inputMode="numeric" value={d.minTime ?? ''} onChange={(e) => setD({ ...d, minTime: n(e.target.value) })} /></div>
              <div className="field"><label>{t('Durée max. (min)')}</label><input className="input" inputMode="numeric" value={d.maxTime ?? ''} onChange={(e) => setD({ ...d, maxTime: n(e.target.value) })} /></div>
            </div>
            <div className="field"><label>{t('Complexité')} : {d.weight?.toFixed(1) ?? '—'} / 5</label><input type="range" min={1} max={5} step={0.1} value={d.weight ?? 2.5} onChange={(e) => setD({ ...d, weight: +e.target.value })} /></div>
          </>
        ) : (
          <>
            <div className="grid2">
              <div className="field"><label>{t('Durée (min)')}</label><input className="input" inputMode="numeric" value={d.runtime ?? ''} onChange={(e) => setD({ ...d, runtime: n(e.target.value) })} /></div>
              {item.kind === 'series' && <div className="field"><label>{t('Saisons')}</label><input className="input" inputMode="numeric" value={d.seasons ?? ''} onChange={(e) => setD({ ...d, seasons: n(e.target.value) })} /></div>}
            </div>
            <div className="field"><label>{t('Format')}</label><div className="chips">{FORMATS.map((f) => <button key={f} className={`chip ${d.format === f ? 'on' : ''}`} onClick={() => setD({ ...d, format: f })}>{tv(f)}</button>)}</div></div>
          </>
        )}
        <div className="field"><label>{isGame ? t('Types') : t('Genres')}</label>
          <div className="chips">{tags.map((tg) => (
            <button key={tg.key} className={`chip ${cur.includes(tg.key) ? 'on' : ''}`} onClick={() => setD({ ...d, [field]: cur.includes(tg.key) ? cur.filter((x) => x !== tg.key) : [...cur, tg.key] })}>{tg.emoji} {tv(tg.key)}</button>
          ))}</div>
        </div>
        <button className="btn primary" onClick={async () => {
          const patch: Partial<Item> = enTitle ? { ...d, title: item.title, loc: { ...item.loc, en: { ...item.loc!.en, title: d.title } } } : d;
          await updateItem(item.id, patch); onClose();
        }}>{t('Enregistrer')}</button>
      </div>
    </Sheet>
  );
}
