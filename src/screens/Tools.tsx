import { useEffect, useRef, useState } from 'react';
import { Lock, Unlock, RotateCcw, Plus, Minus, Trash2, Play, Pause, Crown, Shuffle, X, Pencil, ArrowUpDown } from 'lucide-react';
import { useNav, type ToolId } from '../lib/nav';
import { useStore } from '../lib/store';
import { Sheet, Stepper, Toggle } from '../components/ui';
import { PROFILE_COLORS } from '../lib/vocab';
import { lsGet, lsSet, uid, vibrate } from '../lib/util';
import { t as tr } from '../lib/i18n';

function usePersist<T>(key: string, init: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => lsGet(`soiree.tool.${key}`, init));
  useEffect(() => { lsSet(`soiree.tool.${key}`, v); }, [key, v]);
  return [v, setV];
}

const TOOLS: { id: ToolId; title: string; desc: string; emoji: string; g: [string, string] }[] = [
  { id: 'dice', title: 'Dés', desc: 'd4 à d100, dés personnalisés, pile ou face', emoji: '🎲', g: ['#34D399', '#0EA5E9'] },
  { id: 'score', title: 'Feuille de score', desc: 'Pointage par joueur, manches', emoji: '🏆', g: ['#F59E0B', '#EF4444'] },
  { id: 'counters', title: 'Compteurs', desc: 'Ressources, points de vie, jetons…', emoji: '🧮', g: ['#8B5CF6', '#EC4899'] },
  { id: 'timer', title: 'Minuterie', desc: 'Sablier, temps par tour', emoji: '⏳', g: ['#22D3EE', '#6366F1'] },
  { id: 'chooser', title: 'Premier joueur', desc: 'Tout le monde pose un doigt !', emoji: '👆', g: ['#EC4899', '#F97316'] },
  { id: 'teams', title: 'Équipes', desc: 'Former des équipes au hasard', emoji: '🤝', g: ['#A3E635', '#10B981'] },
];

export default function Tools() {
  const nav = useNav();
  return (
    <div className="page">
      <div className="top"><div><h1>{tr('Outils de jeu')}</h1><div className="sub">{tr('Tout ce qu’il faut autour de la table')}</div></div></div>
      <div className="grid2 grid-auto">
        {TOOLS.map((t) => (
          <button key={t.id} className="hero-card" style={{ '--g1': t.g[0], '--g2': t.g[1], minHeight: 150 } as any} onClick={() => nav.push({ t: 'tool', tool: t.id })}>
            <span className="big-emoji" style={{ fontSize: 64 }}>{t.emoji}</span>
            <span />
            <div><h3>{tr(t.title)}</h3><p style={{ maxWidth: '85%' }}>{tr(t.desc)}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToolScreen({ tool, onClose }: { tool: ToolId; players?: string[]; onClose: () => void }) {
  const t = TOOLS.find((x) => x.id === tool)!;
  if (tool === 'chooser') return <Chooser onClose={onClose} />;
  return (
    <Sheet title={`${t.emoji} ${tr(t.title)}`} onClose={onClose} full accent={t.g[0]}>
      {tool === 'dice' && <Dice />}
      {tool === 'score' && <Score />}
      {tool === 'counters' && <Counters />}
      {tool === 'timer' && <Timer />}
      {tool === 'teams' && <Teams />}
    </Sheet>
  );
}

// ------------------------------------------------------------------ Dés
interface Die { id: string; faces: number | string[]; color: string; value: number | string; locked?: boolean }
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const mkDie = (faces: number | string[], i: number): Die => ({ id: uid(6), faces, color: PROFILE_COLORS[i % PROFILE_COLORS.length], value: typeof faces === 'number' ? faces : faces[0] });
const rollFace = (d: Die) => (typeof d.faces === 'number' ? 1 + Math.floor(Math.random() * d.faces) : d.faces[Math.floor(Math.random() * d.faces.length)]);

function Dice() {
  const [dice, setDice] = usePersist<Die[]>('dice', [mkDie(6, 0), mkDie(6, 1)]);
  const [hist, setHist] = usePersist<string[]>('dicehist', []);
  const [rolling, setRolling] = useState(0);
  const [custom, setCustom] = useState('');
  const [edit, setEdit] = useState(false);

  const roll = () => {
    vibrate([10, 30, 10]);
    const next = dice.map((d) => (d.locked ? d : { ...d, value: rollFace(d) }));
    setDice(next);
    setRolling((r) => r + 1);
    const nums = next.filter((d) => typeof d.value === 'number').map((d) => d.value as number);
    const sum = nums.reduce((a, b) => a + b, 0);
    setHist((h) => [`${next.map((d) => d.value).join(' · ')}${nums.length > 1 ? `  = ${sum}` : ''}`, ...h].slice(0, 12));
  };
  const nums = dice.filter((d) => typeof d.value === 'number').map((d) => d.value as number);
  const sum = nums.reduce((a, b) => a + b, 0);

  return (
    <div className="col gap20">
      <div className="card center" style={{ minHeight: 210, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
        <div className="row wrap" style={{ justifyContent: 'center', gap: 14 }}>
          {dice.map((d) => (
            <div key={d.id} style={{ position: 'relative' }}>
              <button key={`${d.id}-${d.locked ? 'l' : rolling}`} className={`die ${d.locked ? '' : 'rolling'}`} style={{ '--dc': d.color, position: 'relative', opacity: d.locked ? 0.65 : 1, fontSize: String(d.value).length > 3 ? 15 : 28 } as any}
                onClick={() => edit ? setDice(dice.filter((x) => x.id !== d.id)) : setDice(dice.map((x) => (x.id === d.id ? { ...x, locked: !x.locked } : x)))}>
                {d.faces === 6 && typeof d.value === 'number' ? (
                  <div className="pips">{Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[d.value as number]?.includes(i) ? 'on' : ''} />)}</div>
                ) : d.value}
                {typeof d.faces === 'number' && d.faces !== 6 && <small>d{d.faces}</small>}
              </button>
              {d.locked && !edit && <Lock size={14} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--s3)', borderRadius: 99, padding: 2 }} />}
              {edit && <X size={18} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--bad)', borderRadius: 99, padding: 2 }} />}
            </div>
          ))}
        </div>
        {nums.length > 1 && <div style={{ fontFamily: 'var(--display)', fontSize: 22 }}>{tr('Total')} <b style={{ fontSize: 30 }}>{sum}</b></div>}
        {!dice.length && <p className="muted">{tr('Ajoute des dés ci-dessous')}</p>}
      </div>
      <button className="btn accent block" style={{ height: 60, fontSize: 18 }} onClick={roll} disabled={!dice.length}>🎲 {tr('Lancer')}</button>
      <p className="tiny dim center" style={{ marginTop: -12 }}>{tr('Touche un dé pour le garder (verrouiller) entre deux lancers')}</p>

      <div>
        <div className="row between"><div className="eyebrow">{tr('Ajouter')}</div><button className="small muted row gap4" onClick={() => setEdit(!edit)}><Pencil size={13} />{edit ? tr('Terminé') : tr('Retirer des dés')}</button></div>
        <div className="chips mt8">
          {[4, 6, 8, 10, 12, 20, 100].map((f) => <button key={f} className="chip" onClick={() => setDice([...dice, mkDie(f, dice.length)])}>+ d{f}</button>)}
          <button className="chip" onClick={() => setDice([...dice, mkDie([tr('Pile'), tr('Face')], dice.length)])}>+ 🪙 {tr('Pièce')}</button>
          <button className="chip" onClick={() => setDice(dice.map((d) => ({ ...d, locked: false })))}><Unlock size={13} /> {tr('Tout libérer')}</button>
        </div>
        <div className="row mt12">
          <input className="input grow" placeholder={tr('Dé personnalisé : rouge, bleu, vert…')} value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button className="btn" disabled={custom.split(',').filter((s) => s.trim()).length < 2} onClick={() => { setDice([...dice, mkDie(custom.split(',').map((s) => s.trim()).filter(Boolean), dice.length)]); setCustom(''); }}>{tr('Ajouter')}</button>
        </div>
      </div>

      {hist.length > 0 && (
        <div>
          <div className="row between"><div className="eyebrow">{tr('Historique')}</div><button className="small muted" onClick={() => setHist([])}>{tr('Effacer')}</button></div>
          <div className="col mt8" style={{ gap: 4 }}>{hist.map((h, i) => <div key={i} className="small" style={{ opacity: 1 - i * 0.07, fontVariantNumeric: 'tabular-nums' }}>{h}</div>)}</div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Score
interface Player { id: string; name: string; color: string; score: number; rounds: number[] }
const defaultPlayers = (names: string[]): Player[] => names.map((n, i) => ({ id: uid(6), name: n, color: PROFILE_COLORS[i % 8], score: 0, rounds: [] }));

function Score() {
  const { profiles } = useStore();
  const [players, setPlayers] = usePersist<Player[]>('score', defaultPlayers(profiles.filter((p) => !p.guest).slice(0, 2).map((p) => p.name).concat(profiles.length < 2 ? [tr('Joueur 2')] : [])));
  const [steps, setSteps] = usePersist<number[]>('steps', [1, 5, 10]);
  const [lowWins, setLowWins] = usePersist('lowwins', false);
  const [sorted, setSorted] = useState(false);
  const [amount, setAmount] = useState<{ id: string; v: string } | null>(null);
  const [name, setName] = useState('');

  const add = (id: string, d: number) => { vibrate(8); setPlayers(players.map((p) => (p.id === id ? { ...p, score: p.score + d, rounds: [...p.rounds, d] } : p))); };
  const best = players.length ? (lowWins ? Math.min : Math.max)(...players.map((p) => p.score)) : 0;
  const list = sorted ? [...players].sort((a, b) => (lowWins ? a.score - b.score : b.score - a.score)) : players;

  return (
    <div className="col">
      {list.map((p) => (
        <div key={p.id} className="score-card" style={{ '--pc': p.color } as any}>
          <div className="row">
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row gap6">{p.score === best && players.some((x) => x.score !== 0) && <Crown size={16} color="var(--c-suggest)" />}<b className="ellipsis">{p.name}</b></div>
              <div className="tiny dim ellipsis">{p.rounds.slice(-8).map((r) => (r > 0 ? `+${r}` : r)).join('  ')}</div>
            </div>
            <button className="score-num" onClick={() => setAmount({ id: p.id, v: '' })}>{p.score}</button>
          </div>
          <div className="row mt12 gap6">
            {[...steps].reverse().map((s) => <button key={`-${s}`} className="btn sm grow" style={{ padding: 0 }} onClick={() => add(p.id, -s)}>−{s}</button>)}
            {steps.map((s) => <button key={s} className="btn sm grow" style={{ padding: 0, background: `color-mix(in srgb, ${p.color} 30%, var(--s2))` }} onClick={() => add(p.id, s)}>+{s}</button>)}
          </div>
        </div>
      ))}
      <div className="row">
        <input className="input grow" placeholder={tr('Ajouter un joueur')} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { setPlayers([...players, ...defaultPlayers([name.trim()]).map((x) => ({ ...x, color: PROFILE_COLORS[players.length % 8] }))]); setName(''); } }} />
        <button className="icon-btn" onClick={() => { if (name.trim()) { setPlayers([...players, ...defaultPlayers([name.trim()]).map((x) => ({ ...x, color: PROFILE_COLORS[players.length % 8] }))]); setName(''); } }}><Plus size={18} /></button>
      </div>
      <div className="chips">
        {profiles.filter((pr) => !players.find((p) => p.name === pr.name)).map((pr) => (
          <button key={pr.id} className="chip" onClick={() => setPlayers([...players, { id: uid(6), name: pr.name, color: pr.color, score: 0, rounds: [] }])}>+ {pr.emoji} {pr.name}</button>
        ))}
      </div>
      <hr style={{ margin: '6px 0' }} />
      <div className="row between small"><span>{tr('Le plus petit score gagne (golf, Skyjo…)')}</span><Toggle on={lowWins} onChange={setLowWins} /></div>
      <div className="row between small"><span>{tr('Pas des boutons')}</span>
        <div className="row gap6">{[[1, 5, 10], [1, 2, 3], [1, 10, 50], [5, 10, 25]].map((s) => (
          <button key={s.join()} className={`chip static ${steps.join() === s.join() ? 'on' : ''}`} onClick={() => setSteps(s)}>{s.join('/')}</button>))}
        </div>
      </div>
      <div className="row wrap gap6 mt8">
        <button className="btn sm" onClick={() => setSorted(!sorted)}><ArrowUpDown size={14} /> {sorted ? tr('Ordre de table') : tr('Classement')}</button>
        <button className="btn sm" onClick={() => confirm(tr('Remettre tous les scores à zéro ?')) && setPlayers(players.map((p) => ({ ...p, score: 0, rounds: [] })))}><RotateCcw size={14} /> {tr('Nouvelle partie')}</button>
        <button className="btn sm danger" onClick={() => confirm(tr('Retirer tous les joueurs ?')) && setPlayers([])}><Trash2 size={14} /> {tr('Vider')}</button>
      </div>

      {amount && (() => {
        const p = players.find((x) => x.id === amount.id)!;
        const commit = (sign: number) => { const v = parseInt(amount.v || '0', 10); if (v) add(p.id, sign * v); setAmount(null); };
        return (
          <Sheet title={p.name} onClose={() => setAmount(null)} accent={p.color}>
            <div className="score-num center" style={{ fontSize: 56 }}>{amount.v || '0'}</div>
            <div className="grid3 mt20">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button key={k} className="btn" style={{ height: 58, fontSize: 22 }} onClick={() => setAmount({ ...amount, v: k === 'C' ? '' : k === '⌫' ? amount.v.slice(0, -1) : (amount.v + k).slice(0, 5) })}>{k}</button>
              ))}
            </div>
            <div className="grid2 mt12">
              <button className="btn" style={{ height: 54 }} onClick={() => commit(-1)}><Minus size={18} /> {tr('Retirer')}</button>
              <button className="btn accent" style={{ height: 54 }} onClick={() => commit(1)}><Plus size={18} /> {tr('Ajouter')}</button>
            </div>
            <div className="row wrap gap6 mt12">
              <input className="input grow" defaultValue={p.name} onBlur={(e) => setPlayers(players.map((x) => (x.id === p.id ? { ...x, name: e.target.value || x.name } : x)))} />
              <button className="btn danger" onClick={() => { setPlayers(players.filter((x) => x.id !== p.id)); setAmount(null); }}><Trash2 size={16} /></button>
            </div>
          </Sheet>
        );
      })()}
    </div>
  );
}

// ------------------------------------------------------------------ Compteurs
interface Counter { id: string; name: string; value: number; step: number; min?: number; max?: number; color: string; group: string }
function Counters() {
  const [list, setList] = usePersist<Counter[]>('counters', [
    { id: uid(6), name: tr('Points de vie'), value: 20, step: 1, min: 0, color: '#EF4444', group: tr('Moi') },
    { id: uid(6), name: tr('Or'), value: 3, step: 1, min: 0, color: '#F59E0B', group: tr('Moi') },
  ]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', value: 0, step: 1, min: '', max: '', group: tr('Moi'), color: PROFILE_COLORS[2] });
  const groups = [...new Set(list.map((c) => c.group))];
  const bump = (id: string, d: number) => { vibrate(6); setList(list.map((c) => {
    if (c.id !== id) return c;
    let v = c.value + d * c.step;
    if (c.min !== undefined && v < c.min) v = c.min;
    if (c.max !== undefined && v > c.max) v = c.max;
    return { ...c, value: v };
  })); };

  return (
    <div className="col gap20">
      {groups.map((g) => (
        <div key={g}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{g}</div>
          <div className="grid2">
            {list.filter((c) => c.group === g).map((c) => (
              <div key={c.id} className="score-card" style={{ '--pc': c.color, padding: 12 } as any}>
                <div className="row between"><b className="small ellipsis">{c.name}</b><button className="dim" onClick={() => setList(list.filter((x) => x.id !== c.id))}><X size={14} /></button></div>
                <div className="score-num" style={{ fontSize: 44, margin: '8px 0' }}>{c.value}</div>
                <div className="row gap6">
                  <button className="btn sm grow" onClick={() => bump(c.id, -1)}><Minus size={16} /></button>
                  <button className="btn sm grow" style={{ background: `color-mix(in srgb, ${c.color} 35%, var(--s2))` }} onClick={() => bump(c.id, 1)}><Plus size={16} /></button>
                </div>
                {c.step !== 1 && <div className="tiny dim center mt8">{tr('pas de {n}', { n: c.step })}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="row wrap gap6">
        <button className="btn grow" onClick={() => setAdding(true)}><Plus size={16} /> {tr('Nouveau compteur')}</button>
        <button className="btn" onClick={() => setList(list.map((c) => ({ ...c, value: c.min ?? 0 })))}><RotateCcw size={16} /></button>
      </div>
      {adding && (
        <Sheet title={tr('Nouveau compteur')} onClose={() => setAdding(false)}>
          <div className="col gap14">
            <input className="input" placeholder={tr('Nom (Bois, PV, Victoire…)')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
            <input className="input" placeholder={tr('Groupe / joueur')} value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} list="groups" />
            <datalist id="groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
            <div className="grid2">
              <div className="field"><label>{tr('Départ')}</label><input className="input" type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: +e.target.value })} /></div>
              <div className="field"><label>{tr('Pas')}</label><input className="input" type="number" value={draft.step} onChange={(e) => setDraft({ ...draft, step: Math.max(1, +e.target.value) })} /></div>
              <div className="field"><label>{tr('Minimum')}</label><input className="input" type="number" placeholder={tr('aucun')} value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} /></div>
              <div className="field"><label>{tr('Maximum')}</label><input className="input" type="number" placeholder={tr('aucun')} value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} /></div>
            </div>
            <div className="row gap6">{PROFILE_COLORS.map((c) => <button key={c} onClick={() => setDraft({ ...draft, color: c })} style={{ width: 30, height: 30, borderRadius: 10, background: c, outline: draft.color === c ? '3px solid #fff' : 'none', outlineOffset: 2 }} />)}</div>
            <button className="btn primary" disabled={!draft.name.trim()} onClick={() => {
              setList([...list, { id: uid(6), name: draft.name.trim(), value: draft.value, step: draft.step, min: draft.min === '' ? undefined : +draft.min, max: draft.max === '' ? undefined : +draft.max, color: draft.color, group: draft.group.trim() || tr('Général') }]);
              setDraft({ ...draft, name: '' }); setAdding(false);
            }}>{tr('Créer')}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Minuterie
function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.3, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22);
    });
  } catch { /* */ }
}

function Timer() {
  const [dur, setDur] = usePersist('timerdur', 60);
  const [left, setLeft] = useState(dur);
  const [running, setRunning] = useState(false);
  const [turn, setTurn] = useState(1);
  const end = useRef(0);

  useEffect(() => { if (!running) setLeft(dur); }, [dur]);
  useEffect(() => {
    if (!running) return;
    end.current = Date.now() + left * 1000;
    const iv = setInterval(() => {
      const l = Math.max(0, Math.ceil((end.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) { setRunning(false); beep(); vibrate([200, 100, 200, 100, 300]); }
      else if (l <= 5) vibrate(20);
    }, 200);
    return () => clearInterval(iv);
  }, [running]);

  const pct = dur ? left / dur : 0;
  const mm = Math.floor(left / 60), ss = left % 60;
  const color = pct > 0.5 ? 'var(--c-tools)' : pct > 0.2 ? 'var(--c-suggest)' : 'var(--bad)';
  const R = 120, C = 2 * Math.PI * R;

  return (
    <div className="col gap20" style={{ alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 270, height: 270 }} onClick={() => setRunning(!running)}>
        <svg width="270" height="270" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="135" cy="135" r={R} stroke="var(--s2)" strokeWidth="14" fill="none" />
          <circle cx="135" cy="135" r={R} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <div className="center">
            <div className="timer-big" style={{ color: left === 0 ? 'var(--bad)' : undefined }}>{mm}:{String(ss).padStart(2, '0')}</div>
            <div className="small muted">{tr('Tour')} {turn}</div>
          </div>
        </div>
      </div>
      <div className="row" style={{ width: '100%' }}>
        <button className="btn grow" onClick={() => { setRunning(false); setLeft(dur); }}><RotateCcw size={18} /></button>
        <button className="btn accent grow" style={{ height: 56, flex: 2 }} onClick={() => setRunning(!running)}>{running ? <><Pause size={20} /> {tr('Pause')}</> : <><Play size={20} /> {left === dur ? tr('Démarrer') : tr('Reprendre')}</>}</button>
        <button className="btn grow" onClick={() => { setTurn(turn + 1); setLeft(dur); setRunning(true); }}>{tr('Tour')} +1</button>
      </div>
      <div className="chips" style={{ justifyContent: 'center' }}>
        {[15, 30, 60, 90, 120, 180, 300, 600, 900].map((s) => (
          <button key={s} className={`chip ${dur === s ? 'on' : ''}`} onClick={() => { setRunning(false); setDur(s); setLeft(s); }}>{s < 60 ? `${s} s` : `${s / 60} min`}</button>
        ))}
      </div>
      <div className="row" style={{ width: '100%' }}>
        <span className="small muted">{tr('Personnalisé (s)')}</span>
        <input className="input grow" type="number" min={5} value={dur} onChange={(e) => { setRunning(false); setDur(Math.max(5, +e.target.value || 5)); }} />
        <button className="btn sm" onClick={() => setTurn(1)}>{tr('Tours à 1')}</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Premier joueur (doigts)
function Chooser({ onClose }: { onClose: () => void }) {
  const [touches, setTouches] = useState<Record<number, { x: number; y: number; c: string }>>({});
  const [winner, setWinner] = useState<number | null>(null);
  const timer = useRef<any>(null);
  const colorIdx = useRef(0);

  const update = (e: React.TouchEvent) => {
    e.preventDefault();
    if (winner !== null) return;
    setTouches((prev) => {
      const next: typeof prev = {};
      Array.from(e.touches).forEach((t) => {
        next[t.identifier] = { x: t.clientX, y: t.clientY, c: prev[t.identifier]?.c || PROFILE_COLORS[colorIdx.current++ % 8] };
      });
      const ids = Object.keys(next);
      const changed = ids.length !== Object.keys(prev).length;
      if (changed) {
        clearTimeout(timer.current);
        if (ids.length >= 2) timer.current = setTimeout(() => { const w = +ids[Math.floor(Math.random() * ids.length)]; setWinner(w); vibrate([60, 40, 200]); }, 2600);
      }
      return next;
    });
  };
  const reset = () => { setWinner(null); setTouches({}); };

  return (
    <div className="chooser" onTouchStart={update} onTouchMove={update} onTouchEnd={(e) => { if (winner === null) update(e); else if (e.touches.length === 0) setTimeout(reset, 1500); }}>
      <button className="icon-btn" onTouchStart={(e) => e.stopPropagation()} onClick={onClose} style={{ position: 'absolute', top: 'calc(var(--safe-t) + 14px)', right: 14, zIndex: 2 }}><X size={20} /></button>
      {Object.keys(touches).length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div className="center" style={{ padding: 30 }}><div style={{ fontSize: 60 }}>👆</div><h2 className="mt12">{tr('Tout le monde pose un doigt')}</h2><p className="muted mt8">{tr('Ne bougez plus… l’app choisit qui commence.')}</p></div>
        </div>
      )}
      {Object.entries(touches).map(([id, t]) => (
        <div key={id} className={`finger ${winner !== null ? (+id === winner ? 'win' : 'lose') : ''}`} style={{ left: t.x, top: t.y, '--fc': t.c } as any} />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Équipes
function Teams() {
  const { profiles } = useStore();
  const [names, setNames] = usePersist<string>('teamnames', profiles.map((p) => p.name).join('\n'));
  const [n, setN] = useState(2);
  const [teams, setTeams] = useState<string[][]>([]);
  const make = () => {
    const list = names.split('\n').map((s) => s.trim()).filter(Boolean).sort(() => Math.random() - 0.5);
    const t: string[][] = Array.from({ length: n }, () => []);
    list.forEach((x, i) => t[i % n].push(x));
    setTeams(t); vibrate(30);
  };
  return (
    <div className="col gap14">
      <div className="field"><label>{tr('Participants (un par ligne)')}</label><textarea className="input" rows={6} value={names} onChange={(e) => setNames(e.target.value)} /></div>
      <div className="field"><label>{tr('Nombre d’équipes')}</label><Stepper value={n} onChange={setN} min={2} max={8} label={tr('équipes')} /></div>
      <button className="btn accent" style={{ height: 54 }} onClick={make}><Shuffle size={18} /> {tr('Former les équipes')}</button>
      <div className="grid2">
        {teams.map((t, i) => (
          <div key={i} className="score-card" style={{ '--pc': PROFILE_COLORS[i % 8], animation: `fade .3s ${i * 0.08}s both` } as any}>
            <div className="eyebrow" style={{ color: PROFILE_COLORS[i % 8] }}>{tr('Équipe')} {i + 1}</div>
            <div className="col mt8" style={{ gap: 4 }}>{t.map((x) => <b key={x}>{x}</b>)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
