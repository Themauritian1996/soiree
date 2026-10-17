import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Avatar, Cover, Empty } from './ui';
import { t, ti, getLang } from '../lib/i18n';
import { KIND_META } from '../lib/vocab';

/** Journal des parties et statistiques du foyer. */
export default function Stats() {
  const { plays, items, profiles } = useStore();
  const nav = useNav();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const winsBy = useMemo(() => {
    const m = new Map<string, { wins: number; games: number }>();
    plays.forEach((p) => {
      const it = byId.get(p.itemId);
      if (it?.kind !== 'game') return;
      p.players.forEach((x) => { const v = m.get(x) || { wins: 0, games: 0 }; v.games++; m.set(x, v); });
      p.winners.forEach((x) => { const v = m.get(x) || { wins: 0, games: 0 }; v.wins++; m.set(x, v); });
    });
    return [...m.entries()].sort((a, b) => b[1].wins - a[1].wins || b[1].games - a[1].games);
  }, [plays, byId]);

  const top = useMemo(() => {
    const c = new Map<string, number>();
    plays.forEach((p) => c.set(p.itemId, (c.get(p.itemId) || 0) + 1));
    return [...c.entries()].map(([id, n]) => ({ it: byId.get(id), n })).filter((x) => x.it).sort((a, b) => b.n - a.n).slice(0, 6);
  }, [plays, byId]);

  const lent = items.filter((i) => i.lentTo);
  const minutes = plays.reduce((a, p) => a + (p.durationMin || 0), 0);
  const nameOf = (id: string) => profiles.find((p) => p.id === id);
  const fmtD = (d: number) => new Date(d).toLocaleDateString(getLang() === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' });

  if (!plays.length && !lent.length) {
    return <Empty emoji="📒" title={t('Le journal est vide')}>{t('Ouvre un jeu ou un film et touche « On y a joué » ou « Vu » pour noter une partie, les gagnants et les scores.')}</Empty>;
  }

  return (
    <div className="col gap20">
      <div className="grid3">
        <div className="stat"><b>{plays.filter((p) => byId.get(p.itemId)?.kind === 'game').length}</b><small>{t('parties')}</small></div>
        <div className="stat"><b>{plays.filter((p) => byId.get(p.itemId)?.kind !== 'game').length}</b><small>{t('visionnements')}</small></div>
        <div className="stat"><b>{Math.round(minutes / 60)} h</b><small>{t('de plaisir')}</small></div>
      </div>

      {winsBy.length > 0 && (
        <div className="card">
          <h3><Trophy size={16} color="var(--c-suggest)" style={{ verticalAlign: -2 }} /> {t('Classement des victoires')}</h3>
          <div className="col mt12" style={{ gap: 10 }}>
            {winsBy.slice(0, 8).map(([id, v], i) => {
              const p = nameOf(id);
              const pct = v.games ? Math.round((v.wins / v.games) * 100) : 0;
              return (
                <div key={id} className="row">
                  <span style={{ width: 22, fontWeight: 700 }}>{['🥇', '🥈', '🥉'][i] || i + 1}</span>
                  {p ? <Avatar p={p} size="sm" /> : <span className="avatar sm" style={{ '--pc': 'var(--tx3)' } as any}>👤</span>}
                  <div className="grow">
                    <div className="row between small"><b>{p?.name || id}</b><span className="muted">{v.wins} / {v.games} · {pct}%</span></div>
                    <div className="bar" style={{ '--pc': p?.color || 'var(--c-suggest)', marginTop: 4 } as any}><div style={{ width: `${pct}%` }} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {top.length > 0 && (
        <div>
          <div className="eyebrow">{t('Les plus joués / vus')}</div>
          <div className="scroll-x mt8">
            {top.map(({ it, n }) => (
              <button key={it!.id} style={{ width: 96, flexShrink: 0, textAlign: 'left' }} onClick={() => nav.push({ t: 'item', id: it!.id })}>
                <Cover item={it!} style={{ width: 96 }} badge={`×${n}`} />
                <div className="tiny mt8 ellipsis" style={{ fontWeight: 600 }}>{ti(it!)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {lent.length > 0 && (
        <div className="card">
          <h3>🤝 {t('Prêtés en ce moment')}</h3>
          <div className="col mt12" style={{ gap: 8 }}>
            {lent.map((i) => (
              <button key={i.id} className="row small" style={{ textAlign: 'left' }} onClick={() => nav.push({ t: 'item', id: i.id })}>
                <span>{KIND_META[i.kind].emoji}</span><b className="grow ellipsis">{ti(i)}</b><span className="muted">{i.lentTo}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {plays.length > 0 && (
        <div>
          <div className="eyebrow">{t('Journal')}</div>
          <div className="col mt8" style={{ gap: 8 }}>
            {plays.slice(0, 40).map((p) => {
              const it = byId.get(p.itemId);
              if (!it) return null;
              return (
                <button key={p.id} className="inv-row" onClick={() => nav.push({ t: 'item', id: it.id })}>
                  <Cover item={it} style={{ width: 44 }} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row between"><b className="ellipsis small">{ti(it)}</b><span className="tiny dim">{fmtD(p.date)}</span></div>
                    <div className="tiny muted ellipsis">
                      {p.winners.length ? `🏆 ${p.winners.map((w) => nameOf(w)?.name || w).join(', ')} · ` : ''}{p.players.map((x) => nameOf(x)?.name || x).join(', ')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
