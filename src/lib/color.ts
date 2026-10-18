// Couleur dominante d'une image (pour colorer la « tranche » de la boîte dans l'étagère).
import { gradFor, hash } from './util';

const mem = new Map<string, string>();
const LS = 'soiree.colors';
let saved: Record<string, string> = {};
try { saved = JSON.parse(localStorage.getItem(LS) || '{}'); } catch { /* */ }
let saveTimer: any;
const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(saved)); } catch { /* */ } }, 800); };

const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Renvoie la couleur en cache (ou null) ; lance le calcul en arrière-plan. */
export function cachedColor(key: string, src?: string, cb?: (c: string) => void): string | null {
  const k = key + '|' + (src ? hash(src) : 0);
  if (mem.has(k)) return mem.get(k)!;
  if (saved[k]) { mem.set(k, saved[k]); return saved[k]; }
  if (!src) return null;
  const img = new Image();
  if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = 24; c.height = 24;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, 24, 24);
      const d = ctx.getImageData(0, 0, 24, 24).data;
      // moyenne pondérée par la saturation pour éviter le gris délavé
      let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const R = d[i], G = d[i + 1], B = d[i + 2];
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        const sat = mx ? (mx - mn) / mx : 0;
        const wt = 0.15 + sat * sat + (mx > 40 && mx < 235 ? 0.2 : 0);
        r += R * wt; g += G * wt; b += B * wt; w += wt;
      }
      let [R, G, B] = [r / w, g / w, b / w];
      // un peu plus profond pour que le texte reste lisible
      const k2 = 0.82;
      R *= k2; G *= k2; B *= k2;
      const hex = toHex(R, G, B);
      mem.set(k, hex); saved[k] = hex; persist();
      cb?.(hex);
    } catch { /* image sans CORS : on garde le dégradé */ }
  };
  img.src = src;
  return null;
}

export function fallbackColors(title: string) { return gradFor(title); }

/** Texte clair ou foncé selon la luminance du fond. */
export function inkFor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return L > 0.62 ? '#14141c' : '#ffffff';
}
