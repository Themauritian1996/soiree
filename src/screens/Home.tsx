import { useEffect, useMemo, useState } from 'react';
import { Settings as Cog, KeyRound, ChevronRight, RefreshCw, Cloud, HardDrive } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Avatar, Cover, Ring, Sheet, Seg, useToast } from '../components/ui';
import { blend } from '../lib/scoring';
import { demoItems, demoProfiles } from '../lib/demo';
import type { Item, Kind } from '../lib/types';
import { KIND_META } from '../lib/vocab';
import { fmtPlayers, fmtTime, fmtRuntime } from '../lib/util';
import { t, ti, tp } from '../lib/i18n';
import { fetchDeals } from '../lib/deals';
import { LangSwitch } from '../lib/i18n';

const greet = () => {
  const h = new Date().getHours();
  return h < 5 ? t('Encore debout') : h < 12 ? t('Bon matin') : h < 17 ? t('Bon après-midi') : t('Bonsoir');
};

export default function Home() {
  const { active, items, profiles, settings, setActive, importData, mode, household } = useStore();
  const nav = useNav();
  const toast = useToast();
  const [switcher, setSwitcher] = useState(false);
  const [random, setRandom] = useState(false);

  const counts = useMemo(() => ({
    game: items.filter((i) => i.kind === 'game' && i.status === 'owned').length,
    movie: items.filter((i) => i.kind === 'movie').length,
    series: items.filter((i) => i.kind === 'series').length,
  }), [items]);

  const forYou = useMemo(() => {
    if (!active) return [];
    const all = (['game', 'movie', 'series'] as Kind[]).flatMap((k) => blend([{ p: active, w: 100 }], items, { kind: k }).slice(0, 3));
    return all.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [active, items]);

  const recent = items.slice(0, 10);

  const [dealCount, setDealCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetchDeals(household?.id).then((d) => { if (alive) setDealCount(d.deals.length); });
    return () => { alive = false; };
  }, [household?.id]);

  const loadDemo = async () => {
    const ps = demoProfiles();
    const hasProfiles = profiles.some((p) => p.prefs && Object.keys(p.prefs.game || {}).length);
    await importData({ items: demoItems(), profiles: hasProfiles ? undefined : ps }, !hasProfiles);
    if (!hasProfiles) setActive(ps[0].id);
    toast(t('Collection de démo chargée'));
  };

  return (
    <div className="page">
      <div className="top">
        <button className="row grow" style={{ gap: 12, textAlign: 'left', minWidth: 0 }} onClick={() => setSwitcher(true)}>
          {active && <Avatar p={active} size="lg" />}
          <div style={{ minWidth: 0 }}>
            <div className="sub" style={{ marginTop: 0 }}>{greet()},</div>
            <h1 className="ellipsis" style={{ fontSize: 24 }}>{active?.name || t('toi')} <ChevronRight size={18} style={{ verticalAlign: 'middle', opacity: .5 }} /></h1>
          </div>
        </button>
        <div className="row gap6" style={{ flexShrink: 0 }}>
          <LangSwitch compact />
          <button className="icon-btn" onClick={() => nav.push({ t: 'settings' })} aria-label={t('Réglages')}><Cog size={20} /></button>
        </div>
      </div>

      {!settings.geminiKey && (
        <button className="card click row mt8" style={{ width: '100%', textAlign: 'left', marginBottom: 16, borderColor: 'color-mix(in srgb, var(--c-suggest) 40%, transparent)' }} onClick={() => nav.push({ t: 'settings' })}>
          <KeyRound size={20} color="var(--c-suggest)" />
          <div className="grow small"><b>{t('Active l’IA')}</b><div className="muted">{t('Ajoute ta clé Gemini pour scanner tes photos, obtenir les règles et les fun facts.')}</div></div>
          <ChevronRight size={18} className="dim" />
        </button>
      )}

      <div className="grid2">
        <button className="hero-card" style={{ '--g1': '#FF6B4A', '--g2': '#EC4899' } as any} onClick={() => nav.push({ t: 'party' })}>
          <span className="big-emoji">🎉</span>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.8)' }}>{t('Des amis arrivent')}</span>
          <div><h3>{t('Soirée entre amis')}</h3><p>{t('Un quiz par invité, le bon jeu pour le groupe')}</p></div>
        </button>
        <button className="hero-card" style={{ '--g1': '#8B5CF6', '--g2': '#22D3EE' } as any} onClick={() => nav.push({ t: 'blend' })}>
          <span className="big-emoji">💞</span>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.8)' }}>{t('En couple')}</span>
          <div><h3>{t('Mélange')}</h3><p>{profiles.length >= 2 ? t('{a} × {b}, dosé en %', { a: profiles[0].name, b: profiles[1].name }) : t('Vos goûts, dosés en %')}</p></div>
        </button>
        <button className="hero-card" style={{ '--g1': '#0EA5E9', '--g2': '#34D399' } as any} onClick={() => nav.push({ t: 'scan' })}>
          <span className="big-emoji">📸</span>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.8)' }}>{t('Ajouter')}</span>
          <div><h3>{t('Scanner')}</h3><p>{t('Photo de l’étagère ou d’une liste')}</p></div>
        </button>
        <button className="hero-card" style={{ '--g1': '#F59E0B', '--g2': '#EF4444' } as any} onClick={() => setRandom(true)}>
          <span className="big-emoji">🎰</span>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.8)' }}>{t('Indécis ?')}</span>
          <div><h3>{t('Au hasard')}</h3><p>{t('Laisse le destin choisir')}</p></div>
        </button>
        <button className="hero-card" style={{ '--g1': '#F43F5E', '--g2': '#F59E0B' } as any} onClick={() => nav.push({ t: 'deals' })}>
          <span className="big-emoji">🔥</span>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.8)' }}>{t('Bons plans')}</span>
          <div><h3>{t('Aubaines')}</h3><p>{dealCount == null ? t('Vérification des prix…') : dealCount > 0 ? tp(dealCount, '{n} aubaine en ce moment', '{n} aubaines en ce moment') : t('La veille vérifie les prix tous les 3 jours')}</p></div>
          {dealCount != null && dealCount > 0 && (
            <span style={{ position: 'absolute', top: 10, right: 12, background: '#fff', color: '#7c2d12', borderRadius: 99, padding: '2px 10px', fontWeight: 800, fontSize: 13 }}>{dealCount}</span>
          )}
        </button>
      </div>

      <div className="grid3 mt20">
        {(['game', 'movie', 'series'] as Kind[]).map((k) => (
          <button key={k} className="card tight click glow" style={{ '--accent': KIND_META[k].color, textAlign: 'left' } as any}
            onClick={() => { nav.setLibKind(k); nav.setTab('library'); }}>
            <div style={{ fontSize: 22 }}>{KIND_META[k].emoji}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, marginTop: 4 }}>{counts[k]}</div>
            <div className="small muted">{KIND_META[k].label}</div>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card mt20 center" style={{ padding: 24 }}>
          <div style={{ fontSize: 44 }}>📦</div>
          <h3 className="mt8">{t('Ta collection est vide')}</h3>
          <p className="muted small mt8">{t('Prends en photo ton étagère de jeux ou de DVD : l’IA reconnaît les titres et crée les fiches.')}</p>
          <div className="row mt20" style={{ justifyContent: 'center' }}>
            <button className="btn accent" style={{ '--accent': 'var(--c-game)' } as any} onClick={() => nav.push({ t: 'scan' })}>📸 {t('Scanner')}</button>
            <button className="btn" onClick={loadDemo}>{t('Voir une démo')}</button>
          </div>
        </div>
      ) : (
        <>
          {forYou.length > 0 && (
            <>
              <div className="section-title"><h2>{t('Pour {name} ce soir', { name: active?.name })}</h2><span className="tiny dim">{t('selon tes goûts')}</span></div>
              <div className="scroll-x">
                {forYou.map(({ item, score }) => (
                  <button key={item.id} style={{ width: 128, flexShrink: 0, textAlign: 'left' }} onClick={() => nav.push({ t: 'item', id: item.id })}>
                    <div style={{ position: 'relative' }}>
                      <Cover item={item} style={{ width: 128, aspectRatio: item.kind === 'game' ? '1' : '2/3' }} />
                      <div style={{ position: 'absolute', left: 6, top: 6, background: 'rgba(0,0,0,.6)', borderRadius: 99, backdropFilter: 'blur(6px)' }}>
                        <Ring value={score} size={38} color={KIND_META[item.kind].color} />
                      </div>
                    </div>
                    <div className="small mt8 ellipsis" style={{ fontWeight: 600 }}>{ti(item)}</div>
                    <div className="tiny dim">{KIND_META[item.kind].single}</div>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="section-title"><h2>{t('Ajoutés récemment')}</h2><button className="small muted" onClick={() => nav.setTab('library')}>{t('Tout voir')}</button></div>
          <div className="scroll-x">
            {recent.map((item) => (
              <button key={item.id} style={{ width: 96, flexShrink: 0, textAlign: 'left' }} onClick={() => nav.push({ t: 'item', id: item.id })}>
                <Cover item={item} style={{ width: 96 }} badge={!item.enriched && !item.enrichError ? '…' : undefined} />
                <div className="tiny mt8 ellipsis" style={{ fontWeight: 600 }}>{ti(item)}</div>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="tiny dim center mt28">{household.name}</p>

      {switcher && (
        <Sheet title={t('Qui utilise l’app ?')} onClose={() => setSwitcher(false)}>
          <div className="col">
            {profiles.map((p) => (
              <button key={p.id} className="inv-row" style={{ borderColor: p.id === active?.id ? p.color : undefined }} onClick={() => { setActive(p.id); setSwitcher(false); }}>
                <Avatar p={p} /><b className="grow">{p.name}</b>{p.guest && <span className="chip static">{t('Invité')}</span>}
              </button>
            ))}
            <button className="btn mt8" onClick={() => { setSwitcher(false); nav.push({ t: 'profile' }); }}>+ {t('Nouveau profil')}</button>
          </div>
        </Sheet>
      )}
      {random && <RandomPick onClose={() => setRandom(false)} />}
    </div>
  );
}

function RandomPick({ onClose }: { onClose: () => void }) {
  const { items } = useStore();
  const nav = useNav();
  const [kind, setKind] = useState<Kind>('game');
  const [pick, setPick] = useState<Item | null>(null);
  const [spinning, setSpinning] = useState(false);
  const pool = items.filter((i) => i.kind === kind && i.status !== 'wishlist');

  const spin = () => {
    if (!pool.length) return;
    setSpinning(true);
    let n = 0;
    const iv = setInterval(() => {
      setPick(pool[Math.floor(Math.random() * pool.length)]);
      if (++n > 14) { clearInterval(iv); setSpinning(false); try { navigator.vibrate?.(40); } catch { /* */ } }
    }, 70 + n * 6);
  };

  return (
    <Sheet title={t('Au hasard')} onClose={onClose} accent="var(--c-suggest)">
      <Seg value={kind} onChange={(k) => { setKind(k); setPick(null); }} options={(['game', 'movie', 'series'] as Kind[]).map((k) => ({ v: k, label: `${KIND_META[k].emoji} ${KIND_META[k].label}`, c: KIND_META[k].color }))} />
      <div className="center mt20" style={{ minHeight: 280 }}>
        {pick ? (
          <button onClick={() => !spinning && nav.push({ t: 'item', id: pick.id })} style={{ display: 'inline-block' }}>
            <Cover item={pick} style={{ width: 170, margin: '0 auto', transform: spinning ? 'scale(.94)' : 'scale(1)', transition: 'transform .2s' }} />
            <h2 className="mt12">{ti(pick)}</h2>
            <p className="muted small">{pick.kind === 'game' ? [fmtPlayers(pick.minPlayers, pick.maxPlayers), fmtTime(pick.minTime, pick.maxTime)].filter(Boolean).join(' · ') : [pick.year, fmtRuntime(pick.runtime)].filter(Boolean).join(' · ')}</p>
          </button>
        ) : (
          <div style={{ fontSize: 90, paddingTop: 50 }}>{pool.length ? '🎰' : '🫙'}</div>
        )}
      </div>
      <button className="btn primary block mt12" onClick={spin} disabled={spinning || !pool.length}><RefreshCw size={18} /> {pick ? t('Relancer') : t('Lancer')}</button>
    </Sheet>
  );
}
