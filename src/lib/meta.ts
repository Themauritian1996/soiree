// Sources gratuites SANS clé : TVmaze (séries) et Wikipédia (films, jeux).
// Elles complètent les fiches (affiche, résumé, saisons, diffuseur) même sans Gemini.
import type { Item, Kind } from './types';
import { getLang } from './i18n';

const strip = (h = '') => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function getJSON(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** TVmaze — séries télé (affiche, saisons, durée, diffuseur, distribution). */
export async function tvmaze(title: string): Promise<Partial<Item> | null> {
  try {
    const s = await getJSON(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}&embed[]=cast&embed[]=seasons`);
    if (!s?.id) return null;
    const cast = (s._embedded?.cast || []).slice(0, 6).map((c: any) => c.person?.name).filter(Boolean);
    const seasons = (s._embedded?.seasons || []).filter((x: any) => x.number > 0).length || undefined;
    return {
      image: s.image?.original || s.image?.medium || undefined,
      year: s.premiered ? +s.premiered.slice(0, 4) : undefined,
      runtime: s.averageRuntime || s.runtime || undefined,
      seasons,
      cast: cast.length ? cast : undefined,
      tmdbRating: s.rating?.average || undefined,
      whereToWatch: s.webChannel?.name || s.network?.name || undefined,
      externalUrl: s.officialSite || s.url,
      imdbId: s.externals?.imdb || undefined,
      summaryEn: strip(s.summary) || undefined,
    } as Partial<Item>;
  } catch { return null; }
}

/** Nettoie une URL d'image : retire les paramètres utm_* (ajoutés par l'API Wikimedia
 *  depuis 2025) et rejette les SVG (logos/icônes génériques). Retourne undefined si inutilisable. */
export function cleanImg(u?: string): string | undefined {
  if (!u || /\.svg/i.test(u)) return undefined;
  try {
    const url = new URL(u);
    let changed = false;
    for (const k of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(k)) { url.searchParams.delete(k); changed = true; }
    }
    return changed ? url.toString() : u;
  } catch { return u; }
}

/** Wikipédia — image principale + résumé, dans la langue de l'app (repli EN). */
export async function wikipedia(kind: Kind, title: string, year?: number): Promise<Partial<Item> | null> {
  const tries: [string, string][] = [];
  const lang = getLang();
  const hint = (l: string) => kind === 'game' ? (l === 'fr' ? 'jeu de société' : 'board game') : kind === 'series' ? (l === 'fr' ? 'série télévisée' : 'TV series') : (l === 'fr' ? 'film' : 'film');
  for (const l of lang === 'fr' ? ['fr', 'en'] : ['en', 'fr']) tries.push([l, `${title} ${hint(l)}${year && kind !== 'game' ? ' ' + year : ''}`]);
  for (const [l, q] of tries) {
    try {
      const url = `https://${l}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=pageimages|extracts|info&inprop=url&piprop=original|thumbnail&pithumbsize=600&exintro=1&explaintext=1&exsentences=3`;
      const d = await getJSON(url);
      const pages = (Object.values(d?.query?.pages || {}) as any[])
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        .filter((p) => !/homonymie|disambiguation/i.test(p.title || ''));
      // Pour les jeux : n'accepter que les pages qui parlent vraiment d'un jeu
      // (évite les homonymes, ex. « Gaudí » l'architecte au lieu du jeu).
      // Mieux vaut aucune image qu'une mauvaise.
      const p = kind === 'game'
        ? pages.find((p) => /jeu de société|board game|jeu de plateau|jeu de cartes|card game/i.test(p.extract || ''))
        : pages[0];
      if (!p) continue;
      const img = cleanImg(p.thumbnail?.source || p.original?.source);
      return { image: img, wikiUrl: p.fullurl, wikiSummary: p.extract || undefined } as Partial<Item>;
    } catch { /* langue suivante */ }
  }
  return null;
}

/** Complète une fiche avec les sources gratuites (ne remplace pas ce qui existe). */
export async function freeLookup(item: Pick<Item, 'kind' | 'title' | 'year' | 'originalTitle'>): Promise<Partial<Item>> {
  const out: Partial<Item> = {};
  if (item.kind === 'series') {
    const tv = (await tvmaze(item.originalTitle || item.title)) || (item.originalTitle ? await tvmaze(item.title) : null);
    if (tv) Object.assign(out, tv);
  }
  if (!out.image || !out.wikiUrl) {
    const w = await wikipedia(item.kind, item.originalTitle || item.title, item.year);
    if (w) { if (!out.image) out.image = w.image; out.wikiUrl = w.wikiUrl; out.wikiSummary = w.wikiSummary; }
  }
  return out;
}

// ---------------------------------------------------------------- Liens utiles
/** JustWatch Canada (fonctionne en FR et EN). */
export const whereToWatchUrl = (item: Item) => `https://www.justwatch.com/ca/search?q=${encodeURIComponent(item.originalTitle || item.title)}`;

/** Ouvre un lien externe : navigateur intégré dans l'APK, nouvel onglet sur le site. */
export async function openUrl(url: string) {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, toolbarColor: '#0B0B10' });
      return;
    }
  } catch { /* repli web */ }
  const w = window.open(url, '_blank', 'noopener');
  if (!w) location.href = url;
}

export function links(item: Item) {
  const q = encodeURIComponent(item.originalTitle || item.title);
  const en = getLang() === 'en';
  if (item.kind === 'game') {
    return [
      { label: en ? 'How to play (video)' : 'Comment jouer (vidéo)', url: `https://www.youtube.com/results?search_query=${q}+${en ? 'how+to+play' : 'règles+comment+jouer'}`, icon: '▶️' },
      { label: 'BoardGameGeek', url: `https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=${q}`, icon: '🎲' },
      ...(item.wikiUrl ? [{ label: 'Wikipédia', url: item.wikiUrl, icon: '📖' }] : []),
    ];
  }
  return [
    { label: en ? 'Trailer' : 'Bande-annonce', url: `https://www.youtube.com/results?search_query=${q}+${item.year || ''}+${en ? 'trailer' : 'bande+annonce'}`, icon: '▶️' },
    { label: 'IMDb', url: item.imdbId ? `https://www.imdb.com/title/${item.imdbId}/` : `https://www.imdb.com/find/?q=${q}`, icon: '⭐' },
    { label: en ? 'Where to watch' : 'Où le voir', url: whereToWatchUrl(item), icon: '📡' },
    ...(item.wikiUrl ? [{ label: 'Wikipédia', url: item.wikiUrl, icon: '📖' }] : []),
  ];
}
