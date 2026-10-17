import { useState } from 'react';
import { Plus, Settings as Cog, Copy, LogOut, Home as HomeIcon, Link2, ChevronRight, Share2 } from 'lucide-react';
import { useStore, newProfile } from '../lib/store';
import { useNav } from '../lib/nav';
import { Avatar, Cover, Sheet, Stars, useToast, Toggle } from '../components/ui';
import type { Profile } from '../lib/types';
import { GAME_CATEGORIES, MEDIA_GENRES, MOODS, PROFILE_COLORS, PROFILE_EMOJIS } from '../lib/vocab';
import { effectivePrefs } from '../lib/scoring';
import { t, tp, tv, ti } from '../lib/i18n';

export default function Profiles() {
  const { profiles, items, active, setActive, mode, household, user, signOut, joinHousehold, renameHousehold } = useStore();
  const nav = useNav();
  const toast = useToast();
  const [join, setJoin] = useState(false);
  const [code, setCode] = useState('');

  const tasteLine = (p: Profile) => {
    const e = effectivePrefs(p, items);
    const top = [...Object.entries(e.game), ...Object.entries(e.media)].filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);
    return top.length ? top.map(tv).join(' · ') : t('Goûts à définir');
  };

  const share = async () => {
    const text = t('Rejoins notre foyer « {name} » dans Soirée avec ce code : {code}', { name: household.name, code: household.id });
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(household.id); toast(t('Code copié')); } } catch { /* annulé */ }
  };

  return (
    <div className="page" style={{ '--accent': 'var(--c-profile)' } as any}>
      <div className="top">
        <div><h1>{t('Profils')}</h1><div className="sub">{t('Les goûts de chacun guident les suggestions')}</div></div>
        <button className="icon-btn" onClick={() => nav.push({ t: 'settings' })} aria-label={t('Réglages')}><Cog size={20} /></button>
      </div>

      <div className="col" style={{ gap: 10 }}>
        {profiles.map((p) => (
          <button key={p.id} className="card click row" style={{ textAlign: 'left', borderColor: p.id === active?.id ? p.color : undefined, background: `color-mix(in srgb, ${p.color} 7%, var(--s1))` }} onClick={() => nav.push({ t: 'profile', id: p.id })}>
            <Avatar p={p} size="lg" />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row gap6"><h3>{p.name}</h3>{p.guest && <span className="chip static">{t('Invité')}</span>}{p.id === active?.id && <span className="chip static on" style={{ '--accent': p.color } as any}>{t('Actif')}</span>}</div>
              <p className="small muted ellipsis mt8" style={{ marginTop: 3 }}>{tasteLine(p)}</p>
              <p className="tiny dim">{tp(Object.keys(p.ratings || {}).length, '{n} note donnée', '{n} notes données')}</p>
            </div>
            <ChevronRight size={18} className="dim" />
          </button>
        ))}
        <button className="btn block" onClick={() => nav.push({ t: 'profile' })}><Plus size={18} /> {t('Nouveau profil')}</button>
      </div>

      {active && profiles.length > 1 && (
        <p className="tiny dim center mt12">{t('Profil actif sur cet appareil :')} <b>{active.name}</b> · <button className="small" style={{ color: 'var(--c-profile)' }} onClick={() => {
          const i = profiles.findIndex((p) => p.id === active.id); setActive(profiles[(i + 1) % profiles.length].id);
        }}>{t('changer')}</button></p>
      )}

      <div className="section-title"><h2>{t('Foyer')}</h2></div>
      <div className="card col">
        <div className="row"><HomeIcon size={20} color="var(--c-profile)" />
          <input className="input grow" style={{ height: 40 }} defaultValue={household.name} onBlur={(e) => e.target.value.trim() && e.target.value !== household.name && renameHousehold(e.target.value.trim())} />
        </div>
        {mode === 'cloud' ? (
          <>
            <p className="small muted">{t('Connecté : {email}. Partage ce code avec ta conjointe pour qu’elle rejoigne la même collection depuis son téléphone.', { email: user?.email || '' })}</p>
            <div className="row"><code className="kbd grow">{household.id}</code>
              <button className="icon-btn sm" onClick={() => { navigator.clipboard?.writeText(household.id); toast(t('Code copié')); }}><Copy size={16} /></button>
              <button className="icon-btn sm" onClick={share}><Share2 size={16} /></button>
            </div>
            <p className="tiny dim">{tp(household.members.length, '{n} membre connecté', '{n} membres connectés')}</p>
            <div className="row wrap gap6">
              <button className="btn sm" onClick={() => setJoin(true)}><Link2 size={15} /> {t('Rejoindre un autre foyer')}</button>
              <button className="btn sm danger" onClick={signOut}><LogOut size={15} /> {t('Déconnexion')}</button>
            </div>
          </>
        ) : (
          <>
            <p className="small muted">{t('Mode local : les données restent sur cet appareil. Connecte-toi pour synchroniser et partager avec ta conjointe.')}</p>
            <button className="btn sm" onClick={signOut}><LogOut size={15} /> {t('Aller à l’écran de connexion')}</button>
          </>
        )}
      </div>

      {join && (
        <Sheet title={t('Rejoindre un foyer')} onClose={() => setJoin(false)}>
          <p className="small muted">{t('Colle le code reçu. Tu verras la collection et les profils de ce foyer (ta collection actuelle restera dans l’ancien foyer).')}</p>
          <input className="input mt12" placeholder={t('Code du foyer')} value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn primary block mt12" disabled={code.trim().length < 10} onClick={async () => {
            try { await joinHousehold(code); toast(t('Foyer rejoint 🎉')); setJoin(false); } catch (e: any) { toast(e.message?.includes('permission') ? t('Code invalide') : e.message, true); }
          }}>{t('Rejoindre')}</button>
        </Sheet>
      )}
    </div>
  );
}

const cycle = (v: number) => (v === 0 ? 1 : v === 1 ? 2 : v === 2 ? -1 : v === -1 ? -2 : 0);
const icon = (v: number) => (v === 2 ? '❤️' : v === 1 ? '👍' : v === -1 ? '👎' : v === -2 ? '🚫' : '');

function TriChips({ list, value, onChange }: { list: { key: string; emoji: string }[]; value: Record<string, number>; onChange: (v: Record<string, number>) => void }) {
  return (
    <div className="chips">
      {list.map((c) => {
        const v = value[c.key] || 0;
        return (
          <button key={c.key} className="tri" data-v={v} onClick={() => { const n = { ...value, [c.key]: cycle(v) }; if (!n[c.key]) delete n[c.key]; onChange(n); }}>
            {c.emoji} {tv(c.key)} {icon(v)}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileEditor({ id, onClose }: { id?: string; onClose: () => void }) {
  const { profiles, items, saveProfile, deleteProfile, rate, setActive } = useStore();
  const nav = useNav();
  const existing = profiles.find((p) => p.id === id);
  const [p, setP] = useState<Profile>(() => existing || newProfile('', profiles.length));
  const [tab, setTab] = useState<'game' | 'media' | 'ratings'>('game');
  const set = (patch: Partial<Profile>) => setP({ ...p, ...patch });
  const setPrefs = (patch: Partial<Profile['prefs']>) => setP({ ...p, prefs: { ...p.prefs, ...patch } });
  const rated = Object.entries(p.ratings || {}).map(([iid, n]) => ({ it: items.find((i) => i.id === iid), n })).filter((x) => x.it);

  const save = async () => {
    await saveProfile({ ...p, name: p.name.trim() || t('Sans nom') });
    if (!existing) setActive(p.id);
    onClose();
  };

  return (
    <Sheet title={existing ? existing.name : t('Nouveau profil')} onClose={onClose} full accent={p.color}>
      <div className="row" style={{ gap: 14 }}>
        <Avatar p={p} size="lg" />
        <input className="input grow" style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--display)', height: 54 }} placeholder={t('Prénom')} value={p.name} onChange={(e) => set({ name: e.target.value })} autoFocus={!existing} />
      </div>
      <div className="scroll-x mt12">{PROFILE_EMOJIS.map((e) => <button key={e} style={{ fontSize: 26, opacity: p.emoji === e ? 1 : 0.4, flexShrink: 0 }} onClick={() => set({ emoji: e })}>{e}</button>)}</div>
      <div className="row mt12 gap6">{PROFILE_COLORS.map((c) => <button key={c} onClick={() => set({ color: c })} style={{ width: 30, height: 30, borderRadius: 10, background: c, outline: p.color === c ? '3px solid #fff' : 'none', outlineOffset: 2 }} />)}</div>
      <div className="row between mt12 small"><span className="muted">{t('Profil d’invité (ami de passage)')}</span><Toggle on={!!p.guest} onChange={(v) => set({ guest: v })} color={p.color} /></div>

      <div className="tab-line">
        <button className={tab === 'game' ? 'on' : ''} onClick={() => setTab('game')}>🎲 {t('Jeux')}</button>
        <button className={tab === 'media' ? 'on' : ''} onClick={() => setTab('media')}>🍿 {t('Films & séries')}</button>
        <button className={tab === 'ratings' ? 'on' : ''} onClick={() => setTab('ratings')}>⭐ {t('Notes')} ({rated.length})</button>
      </div>
      <p className="tiny dim" style={{ marginBottom: 12 }}>{t('Touche une étiquette pour passer de 👍 à ❤️ à 👎 à 🚫. Les notes en étoiles affinent aussi le profil automatiquement.')}</p>

      {tab === 'game' && (
        <div className="col gap20">
          <TriChips list={GAME_CATEGORIES} value={p.prefs.game} onChange={(game) => setPrefs({ game })} />
          <div className="field"><label>{t('Complexité préférée :')} {p.prefs.weight.toFixed(1)} / 5 {p.prefs.weight < 1.8 ? t('(simple)') : p.prefs.weight < 2.8 ? t('(moyen)') : t('(costaud)')}</label>
            <input type="range" min={1} max={5} step={0.1} value={p.prefs.weight} onChange={(e) => setPrefs({ weight: +e.target.value })} /></div>
          <div className="field"><label>{t('Partie idéale : jusqu’à {n} min', { n: p.prefs.maxTime })}</label>
            <input type="range" min={15} max={240} step={15} value={p.prefs.maxTime} onChange={(e) => setPrefs({ maxTime: +e.target.value })} /></div>
        </div>
      )}
      {tab === 'media' && (
        <div className="col gap20">
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>{t('Genres')}</div><TriChips list={MEDIA_GENRES} value={p.prefs.media} onChange={(media) => setPrefs({ media })} /></div>
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>{t('Ambiances')}</div><TriChips list={MOODS} value={p.prefs.moods} onChange={(moods) => setPrefs({ moods })} /></div>
        </div>
      )}
      {tab === 'ratings' && (
        <div className="col" style={{ gap: 8 }}>
          {rated.length === 0 && <p className="muted small">{t('Ouvre un jeu ou un film et donne-lui des étoiles : le profil apprend tout seul.')}</p>}
          {rated.map(({ it, n }) => (
            <div key={it!.id} className="inv-row">
              <button onClick={() => nav.push({ t: 'item', id: it!.id })}><Cover item={it!} style={{ width: 44 }} /></button>
              <b className="grow ellipsis small">{ti(it!)}</b>
              <Stars value={n} size={15} onChange={(v) => { rate(p.id, it!.id, v); const r = { ...p.ratings }; if (v) r[it!.id] = v; else delete r[it!.id]; set({ ratings: r }); }} />
            </div>
          ))}
        </div>
      )}

      <div className="field mt20"><label>{t('Pour l’IA : ce que j’aime (optionnel)')}</label>
        <textarea className="input" rows={3} placeholder={t('Ex. : j’adore les jeux de bluff, pas de films trop gores, fan de Villeneuve…')} value={p.prefs.about || ''} onChange={(e) => setPrefs({ about: e.target.value })} />
      </div>

      <div className="row mt20" style={{ position: 'sticky', bottom: 0, paddingTop: 10, background: 'var(--bg2)' }}>
        {existing && profiles.length > 1 && <button className="btn danger" onClick={async () => { if (confirm(t('Supprimer le profil {name} ?', { name: existing.name }))) { await deleteProfile(existing.id); onClose(); } }}>{t('Supprimer')}</button>}
        <button className="btn primary grow" onClick={save}>{t('Enregistrer')}</button>
      </div>
    </Sheet>
  );
}
