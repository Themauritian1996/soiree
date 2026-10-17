import { useState } from 'react';
import { Trophy, Check } from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar, Sheet, Stars, useToast } from './ui';
import type { Item, Play } from '../lib/types';
import { t, ti } from '../lib/i18n';
import { uid } from '../lib/util';

/** Noter une partie (jeu) ou un visionnement : qui était là, qui a gagné, note. */
export default function LogPlay({ item, onClose }: { item: Item; onClose: () => void }) {
  const { profiles, active, addPlay, updateItem, rate } = useStore();
  const toast = useToast();
  const isGame = item.kind === 'game';
  const [players, setPlayers] = useState<string[]>(() => profiles.filter((p) => !p.guest).slice(0, 2).map((p) => p.id));
  const [guests, setGuests] = useState('');
  const [winners, setWinners] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [minutes, setMinutes] = useState<string>(item.maxTime ? String(item.maxTime) : item.runtime ? String(item.runtime) : '');
  const [notes, setNotes] = useState('');
  const [stars, setStars] = useState(0);

  const guestList = guests.split(',').map((s) => s.trim()).filter(Boolean);
  const everyone = [...players, ...guestList];
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name || id;
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = async () => {
    const sc: Record<string, number> = {};
    Object.entries(scores).forEach(([k, v]) => { if (v.trim() && !isNaN(+v)) sc[k] = +v; });
    const play: Play = {
      id: uid(14), itemId: item.id, date: Date.now(), players: everyone, winners: winners.filter((w) => everyone.includes(w)),
      scores: Object.keys(sc).length ? sc : undefined, durationMin: minutes ? +minutes : undefined, notes: notes.trim() || undefined, rating: stars || undefined,
    };
    await addPlay(play);
    await updateItem(item.id, {
      playCount: (item.playCount || 0) + 1, lastPlayed: play.date,
      status: !isGame && item.status === 'watchlist' ? 'seen' : item.status,
    });
    if (stars && active) await rate(active.id, item.id, stars);
    toast(isGame ? t('Partie notée 🎲') : t('Marqué comme vu 🍿'));
    onClose();
  };

  return (
    <Sheet title={isGame ? t('Noter une partie') : t('Noter un visionnement')} onClose={onClose} accent={isGame ? 'var(--c-game)' : 'var(--c-movie)'}>
      <p className="muted small" style={{ marginTop: -8, marginBottom: 14 }}>{ti(item)}</p>
      <div className="eyebrow">{isGame ? t('Joueurs') : t('Avec qui ?')}</div>
      <div className="chips mt8">
        {profiles.map((p) => (
          <button key={p.id} className={`chip ${players.includes(p.id) ? 'on' : ''}`} style={{ '--accent': p.color, height: 40, paddingLeft: 6 } as any} onClick={() => setPlayers(toggle(players, p.id))}>
            <Avatar p={p} size="sm" /> {p.name}
          </button>
        ))}
      </div>
      <input className="input mt12" placeholder={t('Invités (séparés par des virgules)')} value={guests} onChange={(e) => setGuests(e.target.value)} />

      {isGame && everyone.length > 0 && (
        <>
          <div className="eyebrow mt20">{t('Qui a gagné ?')}</div>
          <div className="col mt8" style={{ gap: 6 }}>
            {everyone.map((id) => (
              <div key={id} className="row" style={{ gap: 8 }}>
                <button className={`chip grow ${winners.includes(id) ? 'on' : ''}`} style={{ '--accent': 'var(--c-suggest)', justifyContent: 'flex-start' } as any} onClick={() => setWinners(toggle(winners, id))}>
                  {winners.includes(id) ? <Trophy size={14} /> : null} {nameOf(id)}
                </button>
                <input className="input" style={{ width: 90, height: 36 }} inputMode="numeric" placeholder={t('Score')} value={scores[id] || ''} onChange={(e) => setScores({ ...scores, [id]: e.target.value })} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="grid2 mt20">
        <div className="field"><label>{t('Durée (min)')}</label><input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>
        <div className="field"><label>{t('Ma note')}</label><div style={{ paddingTop: 8 }}><Stars value={stars} onChange={setStars} /></div></div>
      </div>
      <textarea className="input mt12" rows={2} placeholder={t('Notes (variante, moments drôles…)')} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button className="btn primary block mt20" onClick={save}><Check size={18} /> {t('Enregistrer')}</button>
    </Sheet>
  );
}
