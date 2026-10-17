import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Item, Lang, LocText } from './types';
import { EN } from './i18n-en';

const lsGet = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } };

// ------------------------------------------------------------------ Langue
// Les textes sources sont en français ; EN[clé française] donne l'anglais.
let current: Lang = lsGet<Lang>('soiree.lang', (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
export const getLang = () => current;

/** Traduit une phrase (clé = texte français). Variables : {n}, {name}… */
export function t(fr: string, vars?: Record<string, string | number | undefined>): string {
  let s = current === 'en' ? EN[fr] ?? fr : fr;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v ?? ''));
  return s;
}
/** Pluriel simple : tp(n, 'jeu', 'jeux') — les deux formes sont des clés françaises. */
export const tp = (n: number, one: string, many: string, vars?: Record<string, string | number>) => t(n > 1 ? many : one, { n, ...vars });

// Étiquettes du vocabulaire (clés de données en français)
const VOCAB_EN: Record<string, string> = {
  Stratégie: 'Strategy', Party: 'Party', Coopératif: 'Co-op', Famille: 'Family', Ambiance: 'Social', Déduction: 'Deduction', Mots: 'Words',
  Cartes: 'Cards', 'Deck-building': 'Deck-building', Placement: 'Worker placement', Abstrait: 'Abstract', Dés: 'Dice', Rapidité: 'Speed',
  Aventure: 'Adventure', Enchères: 'Auction', Duel: 'Two-player', Puzzle: 'Puzzle', Connaissances: 'Trivia',
  Action: 'Action', Comédie: 'Comedy', Drame: 'Drama', Romance: 'Romance', 'Science-fiction': 'Sci-fi', Fantastique: 'Fantasy',
  Thriller: 'Thriller', Horreur: 'Horror', Policier: 'Crime', Animation: 'Animation', Documentaire: 'Documentary', Historique: 'Historical',
  Familial: 'Family', Musical: 'Musical', Guerre: 'War', Western: 'Western', Téléréalité: 'Reality TV',
  Léger: 'Light', Intense: 'Intense', Réflexion: 'Thoughtful', Émouvant: 'Moving', 'Feel-good': 'Feel-good', Frissons: 'Chills', Épique: 'Epic', Cocooning: 'Cozy',
  DVD: 'DVD', 'Blu-ray': 'Blu-ray', '4K': '4K', Numérique: 'Digital', Streaming: 'Streaming', Boîte: 'Box',
};
export const tv = (key: string) => (current === 'en' ? VOCAB_EN[key] ?? key : key);

/** Textes d'une fiche dans la langue courante (repli sur l'autre langue). */
export function L(item: Item): Required<Pick<LocText, 'title'>> & LocText & { missing: boolean } {
  const base: LocText = { title: item.title, summary: item.summary, rules: item.rules, funFacts: item.funFacts, mechanics: item.mechanics };
  const loc = item.loc?.[current];
  // Les champs de premier niveau sont en français (fiches anciennes / démo)
  const fr = { ...base, ...(item.loc?.fr || {}) };
  if (current === 'fr') return { ...fr, title: fr.title || item.title, missing: false };
  const en = loc || {};
  const lacks = (a: unknown, b: unknown) => !!a && !b;
  return {
    title: en.title || item.title,
    summary: en.summary ?? fr.summary, rules: en.rules ?? fr.rules, funFacts: en.funFacts ?? fr.funFacts, mechanics: en.mechanics ?? fr.mechanics,
    missing: lacks(fr.summary, en.summary) || lacks(fr.rules, en.rules) || lacks(fr.funFacts, en.funFacts),
  };
}
export const ti = (item: Item) => L(item).title;

// ------------------------------------------------------------------ Thème
export type Theme = 'dark' | 'light' | 'system';
function applyTheme(th: Theme) {
  const dark = th === 'dark' || (th === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B0B10' : '#F3F4F8');
}

interface Ctx { lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void }
const PrefCtx = createContext<Ctx>(null as any);
export const useUi = () => useContext(PrefCtx);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);
  const [theme, setThemeState] = useState<Theme>(() => lsGet<Theme>('soiree.theme', 'dark'));
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = () => applyTheme('system');
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, [theme]);
  const setLang = (l: Lang) => { current = l; lsSet('soiree.lang', l); setLangState(l); };
  const setTheme = (t: Theme) => { lsSet('soiree.theme', t); setThemeState(t); };
  return <PrefCtx.Provider value={{ lang, setLang, theme, setTheme }}>{children}</PrefCtx.Provider>;
}

/** Petit sélecteur FR | EN réutilisable */
export function LangSwitch({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useUi();
  return (
    <div className="seg" style={{ padding: 3, width: compact ? 96 : undefined }}>
      {(['fr', 'en'] as Lang[]).map((l) => (
        <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)} style={{ height: 30 }}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}
