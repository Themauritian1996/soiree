export function fileToImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Image illisible'));
    img.src = url;
  });
}

export function dataUrlToImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Image illisible'));
    img.src = src;
  });
}

/** Redimensionne une image (côté max) et retourne un dataURL JPEG. */
export function resize(img: HTMLImageElement, max = 1600, q = 0.85): string {
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * s);
  c.height = Math.round(img.naturalHeight * s);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}

/** Découpe la zone [ymin,xmin,ymax,xmax] (0-1000) et la retourne en vignette. */
export function cropBox(img: HTMLImageElement, box: [number, number, number, number], max = 360, pad = 0.02): string {
  const W = img.naturalWidth, H = img.naturalHeight;
  let [y0, x0, y1, x1] = box.map((v) => v / 1000);
  y0 = Math.max(0, y0 - pad); x0 = Math.max(0, x0 - pad); y1 = Math.min(1, y1 + pad); x1 = Math.min(1, x1 + pad);
  let sw = (x1 - x0) * W, sh = (y1 - y0) * H;
  if (sw < 4 || sh < 4) return '';
  // tranche de boîte (étroite et haute) : on la tourne pour une vignette lisible
  const rotate = sh > sw * 2.2;
  const s = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas');
  const w = Math.round(sw * s), h = Math.round(sh * s);
  c.width = rotate ? h : w;
  c.height = rotate ? w : h;
  const ctx = c.getContext('2d')!;
  if (rotate) { ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2); }
  ctx.drawImage(img, x0 * W, y0 * H, sw, sh, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.8);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
