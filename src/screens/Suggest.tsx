import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Avatar, Seg, Stepper } from '../components/ui';
import { blend } from '../lib/scoring';
import { Results } from './Blend';
import type { Kind } from '../lib/types';
import { KIND_META } from '../lib/vocab';
import { fmtRuntime } from '../lib/util';
import { t } from '../lib/i18n';

export default function Suggest() {
  const { active, items, profiles, setActive } = useStore();
  const nav = useNav();
  const [kind, setKind] = useState<Kind>('game');
  const [players, setPlayers] = useState(2);
  const [minutes, setMinutes] = useState(0);

  const ranked = useMemo(() => (active ? blend([{ p: active, w: 100 }], items, { kind, players: kind === 'game' ? players : undefined, maxMinutes: minutes || undefined }) : []),
    [active, items, kind, players, minutes]);

  return (
    <div className="page" style={{ '--accent': 'var(--c-suggest)' } as any}>
      <div className="top"><div><h1>{t('Suggestions')}</h1><div className="sub">{t('Qu’est-ce qu’on fait ce soir ?')}</div></div></div>

      <div className="col">
        <button className="hero-card" style={{ '--g1': '#FF6B4A', '--g2': '#F59E0B', minHeight: 110 } as any} onClick={() => nav.push({ t: 'party' })}>
          <span className="big-emoji">🎉</span>
          <div><h3>{t('Soirée entre amis')}</h3><p>{t('Quiz rapide pour chaque invité → le jeu, le film ou la série idéale pour le groupe')}</p></div>
        </button>
        <button className="hero-card" style={{ '--g1': '#8B5CF6', '--g2': '#EC4899', minHeight: 110 } as any} onClick={() => nav.push({ t: 'blend', kind })}>
          <span className="big-emoji">💞</span>
          <div><h3>{t('Mélange de profils')}</h3><p>{t('Combinez vos goûts et faites pencher la balance : 70 % toi, 30 % l’autre…')}</p></div>
        </button>
      </div>

      <div className="section-title">
        <h2>{t('Juste pour moi')}</h2>
        <div className="scroll-x" style={{ margin: 0, padding: 0, maxWidth: '55%' }}>
          {profiles.map((p) => (
            <button key={p.id} onClick={() => setActive(p.id)} style={{ opacity: p.id === active?.id ? 1 : 0.4, flexShrink: 0 }} title={p.name}><Avatar p={p} size="sm" /></button>
          ))}
        </div>
      </div>
      <Seg value={kind} onChange={setKind} options={(['game', 'movie', 'series'] as Kind[]).map((k) => ({ v: k, label: `${KIND_META[k].emoji} ${KIND_META[k].label}`, c: KIND_META[k].color }))} />
      <div className="grid2 mt12">
        {kind === 'game' ? <Stepper value={players} onChange={setPlayers} min={1} max={12} label={t('joueurs')} /> : <div />}
        <select className="input" value={minutes} onChange={(e) => setMinutes(+e.target.value)}>
          <option value={0}>{t('Temps : peu importe')}</option>
          {[20, 30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{t('Max')} {fmtRuntime(m)}</option>)}
        </select>
      </div>
      {active ? (
        <Results ranked={ranked} who={[{ p: active, w: 100 }]} kind={kind} context={`for ${active.name}${kind === 'game' ? `, ${players} players` : ''}${minutes ? `, max ${minutes} min` : ''}`} />
      ) : (
        <button className="card click row mt20" onClick={() => nav.push({ t: 'profile' })}><span className="grow">{t('Crée ton profil pour des suggestions personnalisées')}</span><ChevronRight size={18} /></button>
      )}
    </div>
  );
}
