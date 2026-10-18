import type { Item, Kind, Prefs, Profile } from './types';
import { clamp } from './util';

/** Préférences effectives = choix explicites + ce qu'on apprend des notes données. */
export function effectivePrefs(p: Profile, items: Item[]): Prefs {
  const learnedG: Record<string, number[]> = {};
  const learnedM: Record<string, number[]> = {};
  for (const [id, n] of Object.entries(p.ratings || {})) {
    const it = items.find((i) => i.id === id);
    if (!it) continue;
    const d = n - 3; // -2..2
    (it.categories || []).forEach((c) => (learnedG[c] ||= []).push(d));
    [...(it.genres || []), ...(it.moods || [])].forEach((c) => (learnedM[c] ||= []).push(d));
  }
  const merge = (base: Record<string, number>, learned: Record<string, number[]>) => {
    const out = { ...base };
    for (const [k, arr] of Object.entries(learned)) {
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      out[k] = clamp((out[k] || 0) + avg * 0.6, -2, 2);
    }
    return out;
  };
  return { ...p.prefs, game: merge(p.prefs.game || {}, learnedG), media: merge({ ...(p.prefs.media || {}), ...(p.prefs.moods || {}) }, learnedM) };
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export function scoreWithPrefs(prefs: Prefs, item: Item, rating?: number): number {
  let s = 52;
  if (item.kind === 'game') {
    const cats = item.categories || [];
    s += mean(cats.map((c) => prefs.game?.[c] || 0)) * 14;
    // une catégorie détestée pèse lourd
    if (cats.some((c) => (prefs.game?.[c] || 0) <= -2)) s -= 10;
    if (item.weight) s -= Math.abs(item.weight - (prefs.weight || 2.5)) * 6;
    const t = item.minTime || item.maxTime;
    if (t && prefs.maxTime && t > prefs.maxTime) s -= 18 * Math.min(1, (t - prefs.maxTime) / prefs.maxTime);
  } else {
    const g = item.genres || [];
    const m = item.moods || [];
    s += mean(g.map((c) => prefs.media?.[c] || 0)) * 14;
    s += mean(m.map((c) => prefs.media?.[c] ?? prefs.moods?.[c] ?? 0)) * 7;
    if (g.some((c) => (prefs.media?.[c] || 0) <= -2)) s -= 10;
  }
  if (rating) s = s * 0.35 + rating * 20 * 0.65;
  return clamp(Math.round(s), 3, 99);
}

export function profileScore(p: Profile, item: Item, items: Item[]) {
  return scoreWithPrefs(effectivePrefs(p, items), item, p.ratings?.[item.id]);
}

export interface Ranked { item: Item; score: number; per: { p: Profile; s: number }[] }

export interface Constraints { players?: number; maxMinutes?: number; kind: Kind; includeWishlist?: boolean; minAge?: number; scope?: 'all' | 'wish' | 'have' }

export function fits(item: Item, c: Constraints) {
  if (item.kind !== c.kind) return false;
  const wish = item.status === 'wishlist' || item.status === 'watchlist';
  if (c.scope === 'wish' && !wish) return false;
  if (c.scope === 'have' && wish) return false;
  if (!c.scope && !c.includeWishlist && wish) return false;
  if (c.players && item.kind === 'game') {
    if (item.minPlayers && c.players < item.minPlayers) return false;
    if (item.maxPlayers && c.players > item.maxPlayers) return false;
  }
  if (c.maxMinutes) {
    const t = item.kind === 'game' ? item.minTime || item.maxTime : item.kind === 'movie' ? item.runtime : undefined;
    if (t && t > c.maxMinutes * 1.15) return false;
  }
  return true;
}

/** Mélange pondéré : weights en % (pas besoin de sommer à 100). */
export function blend(who: { p: Profile; w: number }[], items: Item[], c: Constraints, extraPrefs: { prefs: Prefs; w: number }[] = []): Ranked[] {
  const total = who.reduce((a, b) => a + b.w, 0) + extraPrefs.reduce((a, b) => a + b.w, 0) || 1;
  const eff = who.map(({ p, w }) => ({ p, w, prefs: effectivePrefs(p, items) }));
  return items.filter((i) => fits(i, c)).map((item) => {
    const per = eff.map(({ p, prefs }) => ({ p, s: scoreWithPrefs(prefs, item, p.ratings?.[item.id]) }));
    const extra = extraPrefs.map(({ prefs }) => scoreWithPrefs(prefs, item));
    let score = (per.reduce((a, x, i) => a + x.s * eff[i].w, 0) + extra.reduce((a, s, i) => a + s * extraPrefs[i].w, 0)) / total;
    // équité : on évite ce que quelqu'un d'important déteste
    per.forEach((x, i) => { if (eff[i].w / total >= 0.2 && x.s < 35) score -= (35 - x.s) * 0.4; });
    // petit bonus pour ce qu'on n'a pas fait depuis longtemps
    if (!item.lastPlayed) score += 2;
    else if (Date.now() - item.lastPlayed < 7 * 864e5) score -= 6;
    // sweet spot du nombre de joueurs
    if (c.players && item.bestPlayers && item.bestPlayers.split(/[,\s–-]+/).includes(String(c.players))) score += 4;
    return { item, score: clamp(Math.round(score), 1, 99), per };
  }).sort((a, b) => b.score - a.score);
}

/** Convertit les réponses du quiz (somme de tags) en préférences. */
export function prefsFromTags(tags: Record<string, number>, answered: number, kind: 'game' | 'media'): Prefs {
  const n = Math.max(1, answered / 4);
  const scaled: Record<string, number> = {};
  for (const [k, v] of Object.entries(tags)) if (!k.startsWith('_')) scaled[k] = clamp(v / n, -2, 2);
  const lourd = (tags._lourd || 0) / n;
  const long = (tags._long || 0) / n;
  return {
    game: kind === 'game' ? scaled : {},
    media: kind === 'media' ? scaled : {},
    moods: {},
    weight: clamp(2.4 + lourd * 0.9, 1, 5),
    maxTime: clamp(Math.round(75 + long * 40), 20, 240),
  };
}
