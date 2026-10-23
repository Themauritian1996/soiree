import type { Item, Kind, Settings } from './types';
import { getLang } from './i18n';

const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';

async function get(settings: Settings, path: string, params: Record<string, string>) {
  const key = settings.tmdbKey?.trim();
  if (!key) return null;
  const isBearer = key.startsWith('eyJ');
  const q = new URLSearchParams({ language: getLang() === 'en' ? 'en-CA' : 'fr-CA', ...params, ...(isBearer ? {} : { api_key: key }) });
  const res = await fetch(`${BASE}${path}?${q}`, { headers: isBearer ? { Authorization: `Bearer ${key}` } : {} });
  if (!res.ok) throw new Error(res.status === 401 ? 'Clé TMDB invalide' : `TMDB ${res.status}`);
  return res.json();
}

/** Affiche + infos fiables depuis TMDB (si une clé est configurée). */
export async function tmdbLookup(settings: Settings, kind: Kind, title: string, year?: number): Promise<Partial<Item> | null> {
  if (kind === 'game' || !settings.tmdbKey) return null;
  const type = kind === 'series' ? 'tv' : 'movie';
  const params: Record<string, string> = { query: title };
  if (year) params[type === 'tv' ? 'first_air_date_year' : 'year'] = String(year);
  let r = await get(settings, `/search/${type}`, params);
  if (!r?.results?.length && year) r = await get(settings, `/search/${type}`, { query: title });
  const hit = r?.results?.[0];
  if (!hit) return null;
  const out: Partial<Item> = {
    tmdbId: hit.id,
    image: hit.poster_path ? IMG + hit.poster_path : undefined,
    tmdbRating: hit.vote_average ? Math.round(hit.vote_average * 10) / 10 : undefined,
    // Anime : animation (genre TMDB 16) en langue originale japonaise
    anime: hit.original_language === 'ja' && (hit.genre_ids || []).includes(16) ? true : undefined,
  };
  try {
    const d = await get(settings, `/${type}/${hit.id}`, { append_to_response: 'credits' });
    if (d) {
      out.runtime = d.runtime || d.episode_run_time?.[0] || undefined;
      out.seasons = d.number_of_seasons || undefined;
      const cast = (d.credits?.cast || []).slice(0, 6).map((c: any) => c.name);
      if (cast.length) out.cast = cast;
      const dir = type === 'movie' ? d.credits?.crew?.find((c: any) => c.job === 'Director')?.name : d.created_by?.map((c: any) => c.name).join(', ');
      if (dir) out.director = dir;
      const date = d.release_date || d.first_air_date;
      if (date) out.year = +date.slice(0, 4);
    }
  } catch { /* infos de base suffisent */ }
  return out;
}
