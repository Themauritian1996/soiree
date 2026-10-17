import { t } from './i18n';

export const uid = (n = 12) => {
  const a = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const r = crypto.getRandomValues(new Uint8Array(n));
  for (let i = 0; i < n; i++) s += a[r[i] % a.length];
  return s;
};

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const GRADS = [
  ['#FF6B4A', '#FFB547'], ['#8B5CF6', '#EC4899'], ['#22D3EE', '#3B82F6'], ['#34D399', '#0EA5E9'],
  ['#F59E0B', '#EF4444'], ['#EC4899', '#F97316'], ['#6366F1', '#22D3EE'], ['#A3E635', '#10B981'],
  ['#F43F5E', '#8B5CF6'], ['#14B8A6', '#A3E635'],
];
export const gradFor = (s: string) => GRADS[hash(s) % GRADS.length];

export const fmtTime = (a?: number, b?: number) => {
  if (!a && !b) return '';
  if (a && b && a !== b) return `${a}–${b} min`;
  return `${a || b} min`;
};
export const fmtPlayers = (a?: number, b?: number) => {
  if (!a && !b) return '';
  if (a && b && a !== b) return t('{a}–{b} joueurs', { a, b });
  const n = a || b || 0;
  return n === 1 ? t('1 joueur') : t('{n} joueurs', { n });
};
export const fmtRuntime = (m?: number) => (m ? (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}` : `${m} min`) : '');

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function lsGet<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
}
export function lsSet(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}

export const vibrate = (ms: number | number[] = 15) => { try { navigator.vibrate?.(ms); } catch { /* */ } };

export function stripUndefined<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
