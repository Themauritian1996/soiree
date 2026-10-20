// Veille prix « 🔥 Aubaines » : deals écrits par le scan (tous les 3 jours)
// dans Firestore (households/{hid}/deals/current).
// fetchDeals() ne lève jamais : en échec, retourne { deals: [], updatedAt: null }.
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getLang } from './i18n';

export interface Deal {
  id: string;
  title: string;
  store: string;
  price: number;
  regularPrice?: number;
  url: string;
  dropPct?: number;
  checkedAt?: string;
}

export interface DealsFile {
  updatedAt: string | null;
  deals: Deal[];
}

const CACHE_MS = 6 * 3600 * 1000;

let cache: { at: number; data: DealsFile } | null = null;
const EMPTY: DealsFile = { updatedAt: null, deals: [] };

function sanitize(d: any): DealsFile {
  return {
    updatedAt: typeof d?.updatedAt === 'string' ? d.updatedAt : null,
    deals: Array.isArray(d?.deals)
      ? d.deals.filter((x: any) => x && typeof x.title === 'string' && typeof x.price === 'number')
      : [],
  };
}

/** Récupère les aubaines du household (cache mémoire 6 h). Ne lève jamais. */
export async function fetchDeals(householdId?: string): Promise<DealsFile> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.data;
  // Sécurité : ne jamais rester bloqué plus de 8 s (sinon l'écran reste vide).
  try {
    const data = await Promise.race([
      loadDeals(householdId),
      new Promise<DealsFile>((res) => setTimeout(() => res(EMPTY), 8000)),
    ]);
    cache = { at: now, data };
    return data;
  } catch {
    return EMPTY;
  }
}

async function loadDeals(householdId?: string): Promise<DealsFile> {
  // Firestore d'abord (écrit par la veille), repli sur le deals.json du site.
  if (db && householdId) {
    try {
      const snap = await getDoc(doc(db, 'households', householdId, 'deals', 'current'));
      if (snap.exists()) return sanitize(snap.data());
    } catch { /* repli JSON */ }
  }
  try {
    const r = await fetch('https://themauritian1996.github.io/soiree/deals.json', { cache: 'no-store' });
    if (r.ok) return sanitize(await r.json());
  } catch { /* rien */ }
  return EMPTY;
}

/** Prix en $ CA selon la langue de l'app. */
export function fmtPrice(p: number): string {
  try {
    return new Intl.NumberFormat(getLang() === 'en' ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD' }).format(p);
  } catch { return `${p.toFixed(2)} $`; }
}
