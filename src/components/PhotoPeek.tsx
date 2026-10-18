import { useRef, useState } from 'react';
import { X, ArrowRight, Check, ImagePlus, Users, Clock, Brain } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Cover } from './ui';
import LogPlay from './LogPlay';
import type { Item } from '../lib/types';
import { t, ti, tv, L } from '../lib/i18n';
import { fmtRuntime, fmtTime } from '../lib/util';
import { fileToImage, resize } from '../lib/image';
import { KIND_META } from '../lib/vocab';

/** Aperçu plein écran : la photo de la boîte / l'affiche, avec accès rapide à la fiche. */
export default function PhotoPeek({ item, onClose }: { item: Item; onClose: () => void }) {
  const nav = useNav();
  const { updateItem } = useStore();
  const [logging, setLogging] = useState(false);
  const [zoom, setZoom] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isGame = item.kind === 'game';
  const accent = KIND_META[item.kind].color;
  const summary = L(item).summary;

  const onPhoto = async (f?: File) => {
    if (!f) return;
    const img = await fileToImage(f);
    await updateItem(item.id, { image: resize(img, 900, 0.85) });
  };

  return (
    <div className="peek" onClick={onClose} style={{ '--accent': accent } as any}>
      {item.image && <div className="peek-bg" style={{ backgroundImage: `url(${item.image})` }} />}
      <button className="icon-btn peek-close" onClick={onClose} aria-label={t('Fermer')}><X size={20} /></button>
      <div className="peek-card" onClick={(e) => e.stopPropagation()}>
        <div className={`peek-photo ${zoom ? 'zoom' : ''}`} onClick={() => item.image && setZoom(!zoom)}>
          {item.image ? <img src={item.image} alt={ti(item)} /> : <Cover item={item} style={{ width: isGame ? 220 : 180, margin: '0 auto' }} />}
        </div>
        <div className="peek-info">
          <span className="eyebrow" style={{ color: accent }}>{KIND_META[item.kind].single}{item.year ? ` · ${item.year}` : ''}</span>
          <h2 style={{ fontSize: 24, marginTop: 4 }}>{ti(item)}</h2>
          <div className="meta mt8">
            {isGame ? (
              <>
                {item.maxPlayers ? <span><Users size={13} />{item.minPlayers && item.minPlayers !== item.maxPlayers ? `${item.minPlayers}–${item.maxPlayers}` : item.maxPlayers}</span> : null}
                {item.minTime || item.maxTime ? <span><Clock size={13} />{fmtTime(item.minTime, item.maxTime)}</span> : null}
                {item.weight ? <span><Brain size={13} />{item.weight.toFixed(1)} / 5</span> : null}
              </>
            ) : (
              <>
                {item.runtime ? <span><Clock size={13} />{fmtRuntime(item.runtime)}</span> : null}
                {item.seasons ? <span>{item.seasons} {t('saisons')}</span> : null}
                {item.format ? <span>{tv(item.format)}</span> : null}
              </>
            )}
          </div>
          {summary && <p className="small muted mt8 clamp3">{summary}</p>}
          <div className="row mt12" style={{ gap: 8 }}>
            <button className="btn accent grow" onClick={() => { onClose(); nav.push({ t: 'item', id: item.id }); }}>{t('Voir la fiche')} <ArrowRight size={17} /></button>
            <button className="icon-btn" style={{ height: 46, width: 46 }} onClick={() => setLogging(true)} aria-label={isGame ? t('On y a joué') : t('Vu')}><Check size={19} /></button>
            {!item.image && <button className="icon-btn" style={{ height: 46, width: 46 }} onClick={() => fileRef.current?.click()} aria-label={t('Ajouter une photo')}><ImagePlus size={19} /></button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        </div>
      </div>
      {logging && <div onClick={(e) => e.stopPropagation()}><LogPlay item={item} onClose={() => setLogging(false)} /></div>}
    </div>
  );
}
