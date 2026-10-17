import { useRef, useState } from 'react';
import { Camera, Images, Check, KeyRound, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Sheet, Seg, Spinner, useToast } from '../components/ui';
import { scanPhoto } from '../lib/gemini';
import { cropBox, fileToImage, resize, dataUrlToImage } from '../lib/image';
import type { Detected, Item, Kind } from '../lib/types';
import { KIND_META } from '../lib/vocab';
import { norm, uid } from '../lib/util';
import { t, tp } from '../lib/i18n';

interface Shot { src: string; w: number; h: number; found: Detected[]; error?: string; done: boolean }

export default function Scan({ kind, onClose }: { kind?: Kind; onClose: () => void }) {
  const { settings, items, addItems } = useStore();
  const nav = useNav();
  const toast = useToast();
  const [focus, setFocus] = useState<'game' | 'media' | 'auto'>(kind === 'game' ? 'game' : kind ? 'media' : 'auto');
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [asWish, setAsWish] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const owned = new Set(items.map((i) => norm(i.title)));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const startIndex = shots.length;
    const fresh: Shot[] = [];
    for (const f of Array.from(files).slice(0, 8)) {
      try {
        const img = await fileToImage(f);
        const src = resize(img, 1600, 0.85);
        const small = await dataUrlToImage(src);
        fresh.push({ src, w: small.naturalWidth, h: small.naturalHeight, found: [], done: false });
      } catch { toast(t('Image illisible'), true); }
    }
    setShots((s) => [...s, ...fresh]);
    for (let k = 0; k < fresh.length; k++) {
      const idx = startIndex + k;
      try {
        const res = await scanPhoto(settings, fresh[k].src, focus);
        const img = await dataUrlToImage(fresh[k].src);
        const found: Detected[] = res.map((r) => ({
          ...r,
          kind: focus === 'game' ? 'game' : focus === 'media' && r.kind === 'game' ? 'movie' : r.kind,
          crop: r.box ? cropBox(img, r.box) : undefined,
          selected: !owned.has(norm(r.title)),
        }));
        setShots((s) => s.map((x, i) => (i === idx ? { ...x, found, done: true } : x)));
      } catch (e: any) {
        setShots((s) => s.map((x, i) => (i === idx ? { ...x, error: e.message, done: true } : x)));
      }
    }
    setBusy(false);
  };

  const update = (si: number, fi: number, patch: Partial<Detected>) =>
    setShots((s) => s.map((x, i) => (i === si ? { ...x, found: x.found.map((f, j) => (j === fi ? { ...f, ...patch } : f)) } : x)));

  const selected = shots.flatMap((s) => s.found.filter((f) => f.selected && f.title.trim()));

  const save = async () => {
    const seen = new Set<string>();
    const now = Date.now();
    const newItems: Item[] = [];
    selected.forEach((d, i) => {
      const k = norm(d.title);
      if (seen.has(k)) return;
      seen.add(k);
      newItems.push({
        id: uid(14), kind: d.kind, title: d.title.trim(), image: d.crop || undefined, addedAt: now - i,
        status: asWish ? (d.kind === 'game' ? 'wishlist' : 'watchlist') : 'owned',
        format: d.kind === 'game' ? 'Boîte' : undefined, enriched: false, playCount: 0,
      });
    });
    await addItems(newItems);
    toast(tp(newItems.length, '{n} titre ajouté — les fiches se complètent en arrière-plan', '{n} titres ajoutés — les fiches se complètent en arrière-plan'));
    onClose();
  };

  return (
    <Sheet title={t('Scanner ma collection')} onClose={onClose} full accent="var(--c-series)">
      {!settings.geminiKey ? (
        <div className="card center" style={{ padding: 28 }}>
          <KeyRound size={36} color="var(--c-suggest)" />
          <h3 className="mt12">{t('Clé Gemini requise')}</h3>
          <p className="muted small mt8">{t('La reconnaissance des titres sur photo utilise l’API Gemini de Google (gratuite avec un compte Google AI Studio).')}</p>
          <button className="btn primary mt20" onClick={() => { onClose(); nav.push({ t: 'settings' }); }}>{t('Ouvrir les réglages')}</button>
        </div>
      ) : (
        <>
          <Seg value={focus} onChange={setFocus} options={[
            { v: 'game', label: `🎲 ${t('Jeux')}`, c: 'var(--c-game)' },
            { v: 'media', label: `🎬 ${t('Films & séries')}`, c: 'var(--c-movie)' },
            { v: 'auto', label: `✨ ${t('Mixte')}`, c: 'var(--c-suggest)' },
          ]} />
          <div className="grid2 mt12">
            <button className="btn accent" style={{ '--accent': 'var(--c-series)', height: 56 } as any} onClick={() => camRef.current?.click()} disabled={busy}><Camera size={20} /> {t('Photo')}</button>
            <button className="btn" style={{ height: 56 }} onClick={() => galRef.current?.click()} disabled={busy}><Images size={20} /> {t('Galerie')}</button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
          <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
          {shots.length === 0 && (
            <div className="card mt20 small muted">
              <b style={{ color: 'var(--tx)' }}>{t('Astuces pour un bon scan')}</b>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>{t('Photographie l’étagère de face, bien éclairée, tranches lisibles.')}</li>
                <li>{t('Une rangée à la fois donne de meilleurs résultats qu’un mur complet.')}</li>
                <li>{t('Une liste manuscrite ou une capture d’écran fonctionne aussi.')}</li>
                <li>{t('Tu pourras corriger chaque titre avant de l’ajouter.')}</li>
              </ul>
            </div>
          )}

          {shots.map((s, si) => (
            <div key={si} className="mt20">
              <div className="scan-wrap">
                <img src={s.src} alt="" />
                {s.found.map((f, fi) => f.box && (
                  <button key={fi} className={`scan-box ${f.selected ? '' : 'off'}`} onClick={() => update(si, fi, { selected: !f.selected })}
                    style={{ top: `${f.box[0] / 10}%`, left: `${f.box[1] / 10}%`, height: `${(f.box[2] - f.box[0]) / 10}%`, width: `${(f.box[3] - f.box[1]) / 10}%` }}>
                    <span>{fi + 1}</span>
                  </button>
                ))}
                {!s.done && (
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.45)' }}>
                    <div className="row" style={{ background: 'var(--s2)', padding: '10px 16px', borderRadius: 99 }}><Spinner /> {t('Lecture des titres…')}</div>
                  </div>
                )}
              </div>
              {s.error && <div className="card mt12 row small" style={{ borderColor: 'var(--bad)' }}><AlertTriangle size={18} color="var(--bad)" />{s.error}</div>}
              {s.done && !s.error && s.found.length === 0 && <p className="muted small mt12">{t('Aucun titre reconnu sur cette photo. Essaie plus près ou mieux éclairé.')}</p>}
              <div className="col mt12" style={{ gap: 8 }}>
                {s.found.map((f, fi) => {
                  const dup = owned.has(norm(f.title));
                  return (
                    <div key={fi} className="inv-row" style={{ opacity: f.selected ? 1 : 0.55 }}>
                      <button className={`check ${f.selected ? 'on' : ''}`} onClick={() => update(si, fi, { selected: !f.selected })}>{f.selected && <Check size={15} strokeWidth={3} />}</button>
                      {f.crop ? <img src={f.crop} alt="" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 9 }} /> : <div className="tiny dim" style={{ width: 22 }}>{fi + 1}</div>}
                      <div className="grow" style={{ minWidth: 0 }}>
                        <input className="input" style={{ height: 36, padding: '0 10px' }} value={f.title} onChange={(e) => update(si, fi, { title: e.target.value })} />
                        <div className="row gap6 mt8" style={{ marginTop: 5 }}>
                          {(['game', 'movie', 'series'] as Kind[]).map((k) => (
                            <button key={k} className={`chip static ${f.kind === k ? 'on' : ''}`} style={{ '--accent': KIND_META[k].color, height: 22, fontSize: 11 } as any} onClick={() => update(si, fi, { kind: k })}>
                              {KIND_META[k].emoji} {k === 'game' ? t('Jeu') : k === 'movie' ? t('Film') : t('Série')}
                            </button>
                          ))}
                          {dup && <span className="tiny" style={{ color: 'var(--c-suggest)' }}>{t('déjà là')}</span>}
                          {f.confidence !== undefined && f.confidence < 0.6 && <span className="tiny dim">{t('incertain')}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {selected.length > 0 && (
            <div style={{ position: 'sticky', bottom: 0, paddingTop: 16, background: 'linear-gradient(transparent, var(--bg2) 30%)' }}>
              <div className="row between small mt8" style={{ marginBottom: 10 }}>
                <span className="muted">{selected[0]?.kind === 'game' ? t('Ajouter comme souhaits plutôt que possédés') : t('Ajouter comme « à voir » plutôt que possédés')}</span>
                <button className={`toggle ${asWish ? 'on' : ''}`} onClick={() => setAsWish(!asWish)} />
              </div>
              <button className="btn primary block" onClick={save} disabled={busy}>{tp(selected.length, 'Ajouter {n} titre', 'Ajouter {n} titres')}</button>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
