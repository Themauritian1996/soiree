import { useState } from 'react';
import { useStore } from '../lib/store';
import { Seg, Sheet, useToast } from '../components/ui';
import type { Item, Kind } from '../lib/types';
import { FORMATS, KIND_META } from '../lib/vocab';
import { norm, uid } from '../lib/util';
import { t, tp, tv } from '../lib/i18n';

export default function AddManual({ kind: initial, onClose }: { kind: Kind; onClose: () => void }) {
  const { addItems, items, settings } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>(initial);
  const [text, setText] = useState('');
  const [wish, setWish] = useState(false);
  const [format, setFormat] = useState<string>(initial === 'game' ? 'Boîte' : 'DVD');

  const titles = text.split('\n').map((t) => t.trim()).filter(Boolean);
  const owned = new Set(items.map((i) => norm(i.title)));

  const save = async () => {
    const now = Date.now();
    const list: Item[] = titles.filter((t) => !owned.has(norm(t))).map((title, i) => ({
      id: uid(14), kind, title, addedAt: now - i, enriched: false, playCount: 0,
      status: wish ? (kind === 'game' ? 'wishlist' : 'watchlist') : 'owned',
      format: kind === 'game' ? 'Boîte' : format,
    }));
    await addItems(list);
    const skipped = titles.length - list.length;
    toast(tp(list.length, '{n} ajouté', '{n} ajoutés') + (skipped ? ` (${tp(skipped, '{n} déjà présent', '{n} déjà présents')})` : ''));
    onClose();
  };

  return (
    <Sheet title={t('Ajouter à la main')} onClose={onClose} accent={KIND_META[kind].color}>
      <Seg value={kind} onChange={(k) => { setKind(k); setFormat(k === 'game' ? 'Boîte' : 'DVD'); }} options={(['game', 'movie', 'series'] as Kind[]).map((k) => ({ v: k, label: `${KIND_META[k].emoji} ${KIND_META[k].label}`, c: KIND_META[k].color }))} />
      <div className="field mt12">
        <label>{t('Un titre par ligne')}</label>
        <textarea className="input" rows={6} autoFocus placeholder={kind === 'game' ? 'Catan\nAzul\nLes Aventuriers du Rail' : kind === 'movie' ? 'Inception\nIncendies' : 'Breaking Bad\nThe Office'} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {kind !== 'game' && !wish && (
        <div className="chips mt12">
          {FORMATS.map((f) => <button key={f} className={`chip ${format === f ? 'on' : ''}`} onClick={() => setFormat(f)}>{tv(f)}</button>)}
        </div>
      )}
      <div className="row between mt20">
        <span className="small">{kind === 'game' ? t('Liste de souhaits (pas encore à la maison)') : t('À voir (pas dans la collection)')}</span>
        <button className={`toggle ${wish ? 'on' : ''}`} onClick={() => setWish(!wish)} />
      </div>
      {!settings.geminiKey && <p className="tiny dim mt12">{t('Sans clé Gemini, les fiches (règles, acteurs, fun facts) ne se rempliront pas automatiquement.')}</p>}
      <button className="btn primary block mt20" disabled={!titles.length} onClick={save}>{t('Ajouter')} {titles.length || ''}</button>
    </Sheet>
  );
}
