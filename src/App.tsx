import { useEffect, useRef, useState } from 'react';
import { Home as HomeIcon, Library as LibIcon, Sparkles, Dices, Users, Loader2 } from 'lucide-react';
import { useStore } from './lib/store';
import { useNav, type Tab } from './lib/nav';
import { enrich, NoKeyError, onGeminiStatus } from './lib/gemini';
import { tmdbLookup } from './lib/tmdb';
import { freeLookup } from './lib/meta';
import type { Item } from './lib/types';
import { sleep } from './lib/util';
import Login from './screens/Login';
import Home from './screens/Home';
import Library from './screens/Library';
import ItemDetail from './screens/ItemDetail';
import Scan from './screens/Scan';
import AddManual from './screens/AddManual';
import Suggest from './screens/Suggest';
import Party from './screens/Party';
import Blend from './screens/Blend';
import Deals from './screens/Deals';
import Tools, { ToolScreen } from './screens/Tools';
import Profiles, { ProfileEditor } from './screens/Profiles';
import Settings from './screens/Settings';
import { Spinner } from './components/ui';
import { t } from './lib/i18n';

const TABS: { id: Tab; label: string; icon: any; c: string }[] = [
  { id: 'home', label: 'Accueil', icon: HomeIcon, c: 'var(--tx)' },
  { id: 'library', label: 'Collection', icon: LibIcon, c: 'var(--c-game)' },
  { id: 'suggest', label: 'Suggestions', icon: Sparkles, c: 'var(--c-suggest)' },
  { id: 'tools', label: 'Outils', icon: Dices, c: 'var(--c-tools)' },
  { id: 'profiles', label: 'Profils', icon: Users, c: 'var(--c-profile)' },
];

export default function App() {
  const { mode } = useStore();
  const nav = useNav();

  // Bouton « retour » Android : ferme la feuille ouverte, sinon revient à l'accueil
  const navRef = useRef(nav);
  navRef.current = nav;
  useEffect(() => {
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App: CapApp } = await import('@capacitor/app');
        const h = await CapApp.addListener('backButton', () => {
          const n = navRef.current;
          if (n.stack.length) n.pop();
          else if (n.tab !== 'home') n.setTab('home');
          else CapApp.minimizeApp();
        });
        remove = () => h.remove();
      } catch { /* web */ }
    })();
    return () => remove?.();
  }, []);

  if (mode === 'loading') return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><Spinner size={30} /></div>;
  if (mode === 'signedOut') return <Login />;

  return (
    <div className="app">
      {nav.tab === 'home' && <Home />}
      {nav.tab === 'library' && <Library />}
      {nav.tab === 'suggest' && <Suggest />}
      {nav.tab === 'tools' && <Tools />}
      {nav.tab === 'profiles' && <Profiles />}

      <nav className="nav">
        {TABS.map((tab) => (
          <button key={tab.id} className={nav.tab === tab.id ? 'on' : ''} style={{ '--c': tab.c } as any} onClick={() => nav.setTab(tab.id)}>
            <tab.icon size={21} strokeWidth={nav.tab === tab.id ? 2.4 : 1.9} />
            {t(tab.label)}
          </button>
        ))}
      </nav>

      {nav.stack.map((r, i) => {
        const key = `${i}-${r.t}`;
        const close = nav.pop;
        switch (r.t) {
          case 'item': return <ItemDetail key={key} id={r.id} onClose={close} />;
          case 'scan': return <Scan key={key} kind={r.kind} onClose={close} />;
          case 'add': return <AddManual key={key} kind={r.kind} onClose={close} />;
          case 'profile': return <ProfileEditor key={key} id={r.id} onClose={close} />;
          case 'settings': return <Settings key={key} onClose={close} />;
          case 'party': return <Party key={key} initialKind={r.kind} onClose={close} />;
          case 'blend': return <Blend key={key} initialKind={r.kind} onClose={close} />;
          case 'deals': return <Deals key={key} onClose={close} />;
          case 'tool': return <ToolScreen key={key} tool={r.tool} players={r.players} onClose={close} />;
        }
      })}
      <Enricher />
      <GeminiStatus />
    </div>
  );
}

/** Petit bandeau quand Gemini est surchargé et qu'on bascule de modèle. */
function GeminiStatus() {
  const [msg, setMsg] = useState('');
  useEffect(() => { onGeminiStatus(setMsg); return () => onGeminiStatus(null); }, []);
  if (!msg) return null;
  return (
    <div className="float-pill" style={{ position: 'fixed', bottom: 'calc(var(--safe-b) + var(--kb, 0px) + 140px)', left: '50%', transform: 'translateX(-50%)', zIndex: 90 }}>
      <div className="row gap6 small" style={{ background: 'var(--s3)', border: '1px solid var(--line2)', borderRadius: 99, padding: '7px 14px', whiteSpace: 'nowrap' }}>
        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {msg}
      </div>
    </div>
  );
}

/** File d'attente : complète les fiches ajoutées (Gemini + TMDB si clés, sinon TVmaze / Wikipédia gratuits). */
function Enricher() {
  const { items, settings, updateItem } = useStore();
  const busy = useRef(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const needsAi = (i: Item) => !i.enriched && !i.enrichError && !!settings.geminiKey;
  const pending = items.filter((i) => needsAi(i) || !i.freeLookupDone);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (busy.current || !pending.length) return;
    busy.current = true;
    (async () => {
      try {
        const it = pending[0];
        setCurrent(it.title);
      let patch: Partial<Item> = {};
      let base: Item = it;
      if (needsAi(it)) {
        try {
          const r = await enrich(settingsRef.current, it.kind, it.title, it.year ? `(${it.year})` : '');
          let tm = null;
          try { tm = await tmdbLookup(settingsRef.current, it.kind, r.originalTitle || r.title || it.title, r.year); } catch { /* TMDB optionnel */ }
          patch = { ...r, ...(tm || {}), title: r.title || it.title, image: tm?.image || it.image };
        } catch (e: any) {
          if (!(e instanceof NoKeyError)) patch = { enrichError: e?.message || t('Erreur') };
        }
        base = { ...it, ...patch };
      }
      if (!base.freeLookupDone) {
        try {
          const f = await freeLookup(base);
          const cropOnly = !base.image || base.image.startsWith('data:');
          const extra: Partial<Item> = { freeLookupDone: true };
          // Une vraie affiche (film/série) vaut mieux qu'un recadrage de photo
          if (f.image && (!base.image || (cropOnly && base.kind !== 'game'))) extra.image = f.image;
          if (!base.summary && f.wikiSummary) extra.summary = f.wikiSummary;
          for (const k of ['year', 'runtime', 'seasons', 'cast', 'tmdbRating', 'whereToWatch', 'imdbId', 'wikiUrl', 'externalUrl', 'anime'] as const) {
            if ((base as any)[k] == null && (f as any)[k] != null) (extra as any)[k] = (f as any)[k];
          }
          patch = { ...patch, ...extra };
        } catch { patch = { ...patch, freeLookupDone: true }; }
      }
      await updateItem(it.id, patch);
      await sleep(300);
      } finally {
        // La file ne doit jamais se figer : même si updateItem lève, on libère busy.
        setCurrent(null);
        busy.current = false;
        setTick((x) => x + 1);
      }
    })();
  }, [pending.length, settings.geminiKey, tick]);

  if (!current) return null;
  return (
    <div className="float-pill" style={{ position: 'fixed', bottom: 'calc(var(--safe-b) + var(--kb, 0px) + 92px)', left: 16, zIndex: 50, maxWidth: 'calc(100% - 32px)' }}>
      <div className="row gap6 small" style={{ background: 'var(--s3)', border: '1px solid var(--line2)', borderRadius: 99, padding: '6px 12px 6px 9px', maxWidth: 260 }}>
        <Loader2 size={15} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        <span className="ellipsis">{t('Fiche :')} {current}{pending.length > 1 ? ` (+${pending.length - 1})` : ''}</span>
      </div>
    </div>
  );
}
