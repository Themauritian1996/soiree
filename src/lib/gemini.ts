import type { Item, Kind, Lang, LocText, Profile, Settings } from './types';
import { GAME_CATEGORIES, MEDIA_GENRES, MOODS } from './vocab';
import { sleep } from './util';
import { getLang, L, t } from './i18n';

export const DEFAULT_MODEL = 'gemini-flash-latest';
export const MODEL_OPTIONS = () => [
  { id: 'gemini-flash-latest', label: t('Flash (dernier) — recommandé') },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-flash-lite-latest', label: t('Flash-Lite (plus rapide, moins précis)') },
  { id: 'gemini-pro-latest', label: t('Pro (plus lent, plus précis)') },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

export class NoKeyError extends Error {
  constructor() { super(t("Ajoute ta clé Gemini dans Réglages pour utiliser l'IA.")); }
}

const langName = (l: Lang = getLang()) => (l === 'en' ? 'English (casual, North American)' : 'French (Québec, casual)');

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

async function call(settings: Settings, parts: Part[], opts: { json?: boolean; temperature?: number } = {}): Promise<string> {
  const key = settings.geminiKey?.trim();
  if (!key) throw new NoKeyError();
  const model = settings.geminiModel || DEFAULT_MODEL;
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      ...(opts.json !== false ? { responseMimeType: 'application/json' } : {}),
    },
  };
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(res.status === 429 ? t('Limite de requêtes Gemini atteinte — réessaie dans une minute.') : t('Gemini indisponible ({n})', { n: res.status }));
        await sleep(1500 * (attempt + 1));
        continue;
      }
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || `Error ${res.status}`;
        if (/API key not valid|API_KEY_INVALID/i.test(msg)) throw new FatalError(t('Clé Gemini invalide (Réglages).'));
        if (/not found|is not supported/i.test(msg)) throw new FatalError(t('Modèle « {m} » indisponible — choisis-en un autre dans Réglages.', { m: model }));
        throw new Error(msg);
      }
      const cand = data?.candidates?.[0];
      const text = (cand?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');
      if (!text) throw new FatalError(cand?.finishReason === 'SAFETY' ? t('Réponse bloquée par le filtre Gemini.') : t('Réponse vide de Gemini.'));
      return text;
    } catch (e: any) {
      lastErr = e;
      if (e instanceof NoKeyError || e instanceof FatalError) throw e;
      await sleep(800 * (attempt + 1));
    }
  }
  throw lastErr || new Error(t('Échec Gemini'));
}
class FatalError extends Error {}

function parseJSON<T>(text: string): T {
  const tx = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(tx); } catch { /* */ }
  const s = Math.min(...['{', '['].map((c) => { const i = tx.indexOf(c); return i < 0 ? Infinity : i; }));
  const e = Math.max(tx.lastIndexOf('}'), tx.lastIndexOf(']'));
  if (s !== Infinity && e > s) return JSON.parse(tx.slice(s, e + 1));
  throw new Error(t('Réponse IA illisible'));
}

const imgPart = (dataUrl: string): Part => {
  const [meta, data] = dataUrl.split(',');
  return { inline_data: { mime_type: meta.match(/data:(.*?);/)?.[1] || 'image/jpeg', data } };
};

const GAME_CATS = GAME_CATEGORIES.map((c) => c.key).join(', ');
const GENRES = MEDIA_GENRES.map((g) => g.key).join(', ');
const MOOD_KEYS = MOODS.map((m) => m.key).join(', ');

// ---------------------------------------------------------------- Scan photo
export async function scanPhoto(settings: Settings, dataUrl: string, focus: 'game' | 'media' | 'auto') {
  const focusTxt = focus === 'game' ? 'Mostly board games are expected.' : focus === 'media' ? 'Mostly DVDs / Blu-rays / box sets of movies and TV series are expected.' : '';
  const prompt = `You are cataloguing a home collection from a photo. The photo can show a shelf or pile of board-game boxes and/or DVD/Blu-ray cases (spines or covers), OR a written/printed/screen list of titles. ${focusTxt}
Identify EVERY distinct item whose title you can read or confidently recognise. For each item return:
- "title": the official, commonly used title as printed (keep the printed language; fix obvious OCR mistakes; drop words like "édition", "the board game" unless part of the real title)
- "kind": "game" for board/card games, "movie" for films, "series" for TV series/seasons/box sets
- "box_2d": [ymin, xmin, ymax, xmax] normalised 0-1000 around the visible item (omit if the photo is a written list)
- "confidence": 0-1
Skip duplicates, ignore non-collection objects.
Answer ONLY with JSON: {"items":[{"title":"","kind":"game","box_2d":[0,0,0,0],"confidence":0.9}]}`;
  const txt = await call(settings, [imgPart(dataUrl), { text: prompt }], { temperature: 0.1 });
  const r = parseJSON<{ items: { title: string; kind: Kind; box_2d?: number[]; confidence?: number }[] }>(txt);
  return (r.items || []).filter((i) => i.title && i.title.trim()).map((i) => ({
    title: i.title.trim(),
    kind: (['game', 'movie', 'series'].includes(i.kind) ? i.kind : 'game') as Kind,
    box: Array.isArray(i.box_2d) && i.box_2d.length === 4 ? (i.box_2d as [number, number, number, number]) : undefined,
    confidence: i.confidence,
  }));
}

// ---------------------------------------------------------------- Fiches (bilingues)
const RULES_SHAPE = `"rules": {"goal":"1-2 sentences","setup":["concrete setup steps"],"turn":["a turn, step by step"],"end":"end of game and scoring","tips":["3-4 beginner strategy tips"],"variants":["official or popular variants, e.g. 2-player rules"]}`;

export async function enrich(settings: Settings, kind: Kind, title: string, extra = ''): Promise<Partial<Item>> {
  if (kind === 'game') {
    const prompt = `You are a board-game expert. Give the complete sheet for the board game "${title}" ${extra}.
Answer ONLY with JSON in this exact shape. Language-neutral fields once, then all text in BOTH French (Québec) and English:
{
 "originalTitle": "original title", "year": 2017, "designer": "", "publisher": "",
 "minPlayers": 2, "maxPlayers": 4, "bestPlayers": "3", "minTime": 30, "maxTime": 60, "minAge": 10,
 "weight": 2.3,
 "categories": ["1 to 4 of EXACTLY these French labels: ${GAME_CATS}"],
 "fr": { "title": "official French title if it exists, else original", "summary": "2-3 catchy sentences", "mechanics": ["3-6 mechanics"], ${RULES_SHAPE}, "funFacts": ["3-5 true, surprising facts"] },
 "en": { "title": "official English title", "summary": "", "mechanics": [], "rules": {}, "funFacts": [] }
}
"weight" = complexity 1 (very simple) to 5 (very heavy), like BoardGameGeek. Explain rules clearly for someone who never played. The "en" object has the same structure and content as "fr", written in English. Do not invent facts: stay general if unsure.`;
    const r = parseJSON<any>(await call(settings, [{ text: prompt }], { temperature: 0.3 }));
    return sanitizeGame(r);
  }
  const what = kind === 'series' ? 'TV series' : 'movie';
  const prompt = `Give the sheet for the ${what} "${title}" ${extra}. Answer ONLY with JSON:
{
 "originalTitle": "", "year": 2010,
 ${kind === 'series' ? '"seasons": 5, "runtime": 45,' : '"runtime": 148,'}
 "director": "${kind === 'series' ? 'creator(s)' : 'director'}",
 "cast": ["6 main actors"],
 "genres": ["1 to 3 of EXACTLY these French labels: ${GENRES}"],
 "moods": ["1 to 3 of EXACTLY these French labels: ${MOOD_KEYS}"],
 "minAge": 13,
 "fr": { "title": "French title (Québec release title if known)", "summary": "spoiler-free synopsis, 2-3 sentences", "funFacts": ["3-5 true behind-the-scenes or surprising facts"] },
 "en": { "title": "English title", "summary": "", "funFacts": [] }
}
"runtime" in minutes (${kind === 'series' ? 'average episode length' : 'film length'}). "en" mirrors "fr" in English. Do not invent facts.`;
  const r = parseJSON<any>(await call(settings, [{ text: prompt }], { temperature: 0.3 }));
  return sanitizeMedia(r);
}

const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() && !isNaN(+v) ? +v : undefined);
const arr = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : undefined);
const cleanRules = (r: any) => (r && typeof r === 'object' && (r.goal || r.setup || r.turn)
  ? { goal: r.goal, setup: arr(r.setup), turn: arr(r.turn), end: r.end, tips: arr(r.tips), variants: arr(r.variants) } : undefined);
const cleanLoc = (o: any): LocText | undefined => (o && typeof o === 'object'
  ? { title: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : undefined, summary: o.summary || undefined, mechanics: arr(o.mechanics), rules: cleanRules(o.rules), funFacts: arr(o.funFacts) }
  : undefined);

function withLoc(r: any): Partial<Item> {
  // compatibilité : on accepte aussi l'ancien format à plat (français)
  const fr = cleanLoc(r.fr) || cleanLoc(r);
  const en = cleanLoc(r.en);
  return {
    title: fr?.title || r.title, summary: fr?.summary, mechanics: fr?.mechanics, rules: fr?.rules, funFacts: fr?.funFacts,
    loc: { ...(fr ? { fr } : {}), ...(en && (en.summary || en.funFacts) ? { en } : {}) },
  };
}

function sanitizeGame(r: any): Partial<Item> {
  const cats = new Set(GAME_CATEGORIES.map((c) => c.key));
  return {
    ...withLoc(r),
    originalTitle: r.originalTitle || undefined, year: num(r.year), designer: r.designer || undefined,
    publisher: r.publisher || undefined, minPlayers: num(r.minPlayers), maxPlayers: num(r.maxPlayers),
    bestPlayers: r.bestPlayers ? String(r.bestPlayers) : undefined, minTime: num(r.minTime), maxTime: num(r.maxTime),
    minAge: num(r.minAge), weight: num(r.weight), categories: (arr(r.categories) || []).filter((c: string) => cats.has(c)),
    enriched: true, enrichError: undefined,
  };
}
function sanitizeMedia(r: any): Partial<Item> {
  const g = new Set(MEDIA_GENRES.map((c) => c.key));
  const m = new Set(MOODS.map((c) => c.key));
  return {
    ...withLoc(r),
    originalTitle: r.originalTitle || undefined, year: num(r.year), runtime: num(r.runtime), seasons: num(r.seasons),
    director: r.director || undefined, cast: arr(r.cast), genres: (arr(r.genres) || []).filter((x: string) => g.has(x)),
    moods: (arr(r.moods) || []).filter((x: string) => m.has(x)), minAge: num(r.minAge),
    enriched: true, enrichError: undefined,
  };
}

/** Traduit une fiche existante vers la langue demandée (fiches anciennes ou démo). */
export async function translateItem(settings: Settings, item: Item, to: Lang): Promise<LocText> {
  const src = item.loc?.[to === 'en' ? 'fr' : 'en'] || { title: item.title, summary: item.summary, mechanics: item.mechanics, rules: item.rules, funFacts: item.funFacts };
  const prompt = `Translate this ${item.kind === 'game' ? 'board-game' : item.kind === 'movie' ? 'movie' : 'TV series'} sheet into ${langName(to)}. For "title", use the official ${to === 'en' ? 'English' : 'French'} title of "${item.originalTitle || item.title}" if it exists. Keep the exact same JSON structure, answer ONLY with JSON.
${JSON.stringify(src)}`;
  return cleanLoc(parseJSON<any>(await call(settings, [{ text: prompt }], { temperature: 0.2 }))) || {};
}

// ---------------------------------------------------------------- Quiz
export interface QuizOption { label: string; emoji?: string; tags: Record<string, number> }
export interface QuizQuestion { q: string; options: QuizOption[] }

export async function generateQuiz(settings: Settings, kind: 'game' | 'media', people: number, minutes: number, vibe = ''): Promise<QuizQuestion[]> {
  const vocab = kind === 'game'
    ? `${GAME_CATS}, plus the special tags "_lourd" (+ = wants something complex, - = simple) and "_long" (+ = long game OK)`
    : `${GENRES}, ${MOOD_KEYS}, plus "_long" (+ = long movie OK, - = short/episode)`;
  const prompt = `Create a short, fun quiz (5 questions) written in ${langName()} to find out what a guest feels like ${kind === 'game' ? 'playing as a board game' : 'watching (movie or series)'} tonight.
Context: ${people} people, about ${minutes} minutes available. ${vibe ? `Theme: ${vibe}.` : ''}
Make questions playful and imaginative (not "which genre do you like?" directly), 3 or 4 choices each, each with an emoji.
Each choice has "tags": an object whose keys are ONLY among these (keep them exactly as written, in French): ${vocab}; values between -2 and 2.
JSON only: {"questions":[{"q":"","options":[{"label":"","emoji":"","tags":{"Party":2}}]}]}`;
  const r = parseJSON<{ questions: QuizQuestion[] }>(await call(settings, [{ text: prompt }], { temperature: 0.9 }));
  return (r.questions || []).filter((q) => q.q && q.options?.length >= 2).slice(0, 6);
}

// ---------------------------------------------------------------- Suggestions IA
export interface AiPick { title: string; why: string }
export interface AiSuggest { comment: string; picks: AiPick[]; discover: { title: string; year?: number; why: string }[] }

export function profileBrief(p: Profile, items: Item[]) {
  const top = (o: Record<string, number>) => Object.entries(o).filter(([, v]) => v !== 0).map(([k, v]) => `${k}${v > 0 ? '+' : '-'}${Math.abs(v)}`).join(', ');
  const rated = Object.entries(p.ratings).map(([id, n]) => { const it = items.find((i) => i.id === id); return it ? `${it.title} (${n}/5)` : null; }).filter(Boolean).slice(0, 25).join('; ');
  return `${p.name}: games[${top(p.prefs.game) || '—'}], preferred complexity ${p.prefs.weight}/5, max time ${p.prefs.maxTime} min, movies/series[${top(p.prefs.media) || '—'}], moods[${top(p.prefs.moods) || '—'}]${p.prefs.about ? `, notes: ${p.prefs.about}` : ''}${rated ? `, ratings given: ${rated}` : ''}`;
}

export async function aiSuggest(settings: Settings, args: {
  kind: Kind; who: { p: Profile; w: number }[]; candidates: Item[]; allItems: Item[]; context: string;
}): Promise<AiSuggest> {
  const label = args.kind === 'game' ? 'board game' : args.kind === 'movie' ? 'movie' : 'TV series';
  const lib = args.candidates.slice(0, 20).map((i) => `- ${L(i).title}${i.year ? ` (${i.year})` : ''}: ${[...(i.categories || []), ...(i.genres || [])].join('/')}`).join('\n');
  const owned = args.allItems.filter((i) => i.kind === args.kind).map((i) => L(i).title).join(', ');
  const prompt = `We are choosing the next ${label}. Blend of tastes (weights):
${args.who.map(({ p, w }) => `• ${Math.round(w)}% — ${profileBrief(p, args.allItems)}`).join('\n')}
Context: ${args.context}
Candidates already at home (ranked by the algorithm):
${lib || '(none)'}
Answer in ${langName()}, warm tone, JSON only:
{"comment":"1-2 sentences about this blend of tastes","picks":[{"title":"EXACT title of a candidate","why":"why, mentioning the people according to their weight"}],"discover":[{"title":"","year":2020,"why":""}]}
picks = the 3 best candidates from the list. discover = 3 ${label}s to discover that are NOT in: ${owned || '(nothing)'}.`;
  return parseJSON<AiSuggest>(await call(settings, [{ text: prompt }], { temperature: 0.7 }));
}

// ---------------------------------------------------------------- Questions sur un titre
export async function askAbout(settings: Settings, item: Item, question: string, history: { q: string; a: string }[] = []) {
  const l = L(item);
  const ctx = item.kind === 'game'
    ? `Board game "${l.title}". Known rules: ${JSON.stringify(l.rules || {})}`
    : `${item.kind === 'movie' ? 'Movie' : 'TV series'} "${l.title}" (${item.year || ''}).`;
  const hist = history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join('\n');
  const prompt = `${ctx}\n${hist ? `Previous exchange:\n${hist}\n` : ''}Question: ${question}\nAnswer in ${langName()}, clearly and briefly (max 8 sentences), no spoilers unless explicitly asked. If a rule is ambiguous, say so and give the most common official interpretation.`;
  return call(settings, [{ text: prompt }], { json: false, temperature: 0.3 });
}

export async function testKey(settings: Settings) {
  const tx = await call(settings, [{ text: 'Reply only: {"ok":true}' }], { temperature: 0 });
  return parseJSON<{ ok: boolean }>(tx).ok;
}
