import { useMemo, useState } from 'react';
import { ArrowRight, Sparkles, UserPlus, RotateCcw } from 'lucide-react';
import { useStore, newProfile } from '../lib/store';
import { Avatar, Seg, Sheet, Spinner, Stepper, useToast } from '../components/ui';
import { generateQuiz, type QuizQuestion } from '../lib/gemini';
import { classicQuiz } from '../lib/quizBank';
import { blend, prefsFromTags } from '../lib/scoring';
import { Results } from './Blend';
import { PROFILE_COLORS, PROFILE_EMOJIS } from '../lib/vocab';
import type { Kind, Prefs } from '../lib/types';
import { fmtRuntime, vibrate } from '../lib/util';
import { t, tp, tv, getLang } from '../lib/i18n';

interface Guest { name: string; emoji: string; color: string; tags: Record<string, number>; answered: number }

export default function Party({ initialKind, onClose }: { initialKind?: 'game' | 'media'; onClose: () => void }) {
  const { profiles, settings, items, saveProfile } = useStore();
  const toast = useToast();
  const [step, setStep] = useState<'setup' | 'intro' | 'quiz' | 'results'>('setup');
  const [kind, setKind] = useState<'game' | 'media'>(initialKind || 'game');
  const [here, setHere] = useState<string[]>(() => profiles.filter((p) => !p.guest).slice(0, 2).map((p) => p.id));
  const [nGuests, setNGuests] = useState(2);
  const [minutes, setMinutes] = useState(90);
  const [useAi, setUseAi] = useState(!!settings.geminiKey);
  const [vibe, setVibe] = useState('');
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [gi, setGi] = useState(0);
  const [qi, setQi] = useState(0);
  const [mediaKind, setMediaKind] = useState<Kind>('movie');

  const total = here.length + nGuests;

  const start = async () => {
    let qs: QuizQuestion[] = classicQuiz(kind, getLang());
    if (useAi && settings.geminiKey) {
      setLoading(true);
      try {
        const g = await generateQuiz(settings, kind, total, minutes, vibe);
        if (g.length >= 3) qs = g;
      } catch (e: any) { toast(t('Quiz classique utilisé ({m})', { m: e.message }), true); }
      setLoading(false);
    }
    setQuiz(qs);
    setGuests(Array.from({ length: nGuests }, (_, i) => ({
      name: t('Invité {n}', { n: i + 1 }), emoji: PROFILE_EMOJIS[(i + 5) % PROFILE_EMOJIS.length], color: PROFILE_COLORS[(i + 2) % PROFILE_COLORS.length], tags: {}, answered: 0,
    })));
    setGi(0); setQi(0);
    setStep(nGuests > 0 ? 'intro' : 'results');
  };

  const answer = (tags: Record<string, number>) => {
    vibrate(12);
    setGuests((gs) => gs.map((g, i) => {
      if (i !== gi) return g;
      const t = { ...g.tags };
      for (const [k, v] of Object.entries(tags)) t[k] = (t[k] || 0) + v;
      return { ...g, tags: t, answered: g.answered + 1 };
    }));
    if (qi + 1 < quiz.length) setQi(qi + 1);
    else if (gi + 1 < guests.length) { setGi(gi + 1); setQi(0); setStep('intro'); }
    else setStep('results');
  };

  const guestPrefs: { prefs: Prefs; w: number }[] = useMemo(() => guests.map((g) => ({ prefs: prefsFromTags(g.tags, g.answered, kind), w: 100 })), [guests, kind]);
  const who = profiles.filter((p) => here.includes(p.id)).map((p) => ({ p, w: 100 }));
  const resKind: Kind = kind === 'game' ? 'game' : mediaKind;
  const ranked = useMemo(() => step === 'results'
    ? blend(who, items, { kind: resKind, players: kind === 'game' ? total : undefined, maxMinutes: resKind === 'series' ? undefined : minutes }, guestPrefs)
    : [], [step, who.length, items, resKind, total, minutes, guestPrefs]);

  const groupTaste = useMemo(() => {
    const sum: Record<string, number> = {};
    guests.forEach((g) => Object.entries(g.tags).forEach(([k, v]) => { if (!k.startsWith('_')) sum[k] = (sum[k] || 0) + v; }));
    return Object.entries(sum).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).slice(0, 4).map(([k]) => k);
  }, [guests]);

  const saveGuests = async () => {
    for (const [i, g] of guests.entries()) {
      const p = newProfile(g.name, profiles.length + i, true);
      p.emoji = g.emoji; p.color = g.color;
      p.prefs = { ...p.prefs, ...prefsFromTags(g.tags, g.answered, kind) };
      await saveProfile(p);
    }
    toast(tp(guests.length, '{n} invité enregistré comme profil', '{n} invités enregistrés comme profils'));
  };

  const g = guests[gi];
  const q = quiz[qi];

  return (
    <Sheet title={step === 'quiz' ? undefined : t('Soirée entre amis')} onClose={onClose} full accent="var(--c-game)">
      {step === 'setup' && (
        <div className="col gap20">
          <Seg value={kind} onChange={setKind} options={[{ v: 'game', label: `🎲 ${t('Jeu de société')}`, c: 'var(--c-game)' }, { v: 'media', label: `🍿 ${t('Film / série')}`, c: 'var(--c-movie)' }]} />
          <div>
            <div className="eyebrow">{t('Déjà là (profils)')}</div>
            <div className="chips mt8">
              {profiles.map((p) => (
                <button key={p.id} className={`chip ${here.includes(p.id) ? 'on' : ''}`} style={{ '--accent': p.color, height: 40, paddingLeft: 6 } as any}
                  onClick={() => setHere(here.includes(p.id) ? here.filter((x) => x !== p.id) : [...here, p.id])}>
                  <Avatar p={p} size="sm" /> {p.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid2">
            <div className="field"><label>{t('Invités qui feront le quiz')}</label><Stepper value={nGuests} onChange={setNGuests} min={0} max={12} /></div>
            <div className="field"><label>{t('Temps disponible')}</label>
              <select className="input" value={minutes} onChange={(e) => setMinutes(+e.target.value)}>
                {[30, 45, 60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{fmtRuntime(m)}</option>)}
              </select>
            </div>
          </div>
          <div className="card row" style={{ padding: 14 }}>
            <div className="grow"><b>{tp(total, '{n} personne au total', '{n} personnes au total')}</b><p className="small muted">{kind === 'game' ? t('Seuls les jeux jouables à ce nombre seront proposés.') : t('Films et séries filtrés selon le temps disponible.')}</p></div>
            <span style={{ fontSize: 30 }}>{total > 5 ? '🎊' : total > 2 ? '🍕' : '🕯️'}</span>
          </div>
          <div className="card col">
            <div className="row between"><div><b>{t('Quiz inventé par l’IA')}</b><p className="small muted">{t('Nouvelles questions à chaque soirée')}</p></div>
              <button className={`toggle ${useAi && settings.geminiKey ? 'on' : ''}`} onClick={() => setUseAi(!useAi)} disabled={!settings.geminiKey} /></div>
            {useAi && settings.geminiKey && <input className="input" placeholder={t('Thème (optionnel) : Halloween, ados, apéro chill…')} value={vibe} onChange={(e) => setVibe(e.target.value)} />}
            {!settings.geminiKey && <p className="tiny dim">{t('Sans clé Gemini, un quiz classique est utilisé.')}</p>}
          </div>
          <button className="btn primary block" onClick={start} disabled={loading || total === 0} style={{ height: 54 }}>
            {loading ? <><Spinner /> {t('Création du quiz…')}</> : <>{t('C’est parti')} <ArrowRight size={18} /></>}
          </button>
        </div>
      )}

      {step === 'intro' && g && (
        <div className="col center" style={{ paddingTop: 40, alignItems: 'center', gap: 18 }}>
          <div className="eyebrow">{t('Joueur {i} sur {n}', { i: gi + 1, n: guests.length })}</div>
          <button style={{ fontSize: 80 }} onClick={() => setGuests((gs) => gs.map((x, i) => (i === gi ? { ...x, emoji: PROFILE_EMOJIS[(PROFILE_EMOJIS.indexOf(x.emoji) + 1) % PROFILE_EMOJIS.length] } : x)))}>{g.emoji}</button>
          <p className="tiny dim">{t('touche l’emoji pour le changer')}</p>
          <input className="input center" style={{ fontSize: 22, height: 56, fontFamily: 'var(--display)', fontWeight: 700, maxWidth: 320 }} value={g.name}
            onFocus={(e) => e.target.select()} onChange={(e) => setGuests((gs) => gs.map((x, i) => (i === gi ? { ...x, name: e.target.value } : x)))} />
          <p className="muted" style={{ maxWidth: 300 }}>{t('Passe le téléphone à {name} : {n} questions rapides, pas de mauvaise réponse !', { name: g.name || t('ton invité'), n: quiz.length })}</p>
          <button className="btn accent block" style={{ maxWidth: 320, height: 54 }} onClick={() => setStep('quiz')}>{t('Je suis prêt·e')} <ArrowRight size={18} /></button>
        </div>
      )}

      {step === 'quiz' && g && q && (
        <div className="col" style={{ minHeight: '85dvh', paddingTop: 10 }}>
          <div className="row between">
            <span className="row gap6"><Avatar p={g} size="sm" /><b>{g.name}</b></span>
            <button className="icon-btn sm" onClick={onClose}>✕</button>
          </div>
          <div className="progress mt12"><div style={{ width: `${((qi) / quiz.length) * 100}%` }} /></div>
          <div className="eyebrow mt20">{t('Question')} {qi + 1} / {quiz.length}</div>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>{q.q}</h1>
          <div className="col mt20" style={{ gap: 10, flex: 1 }}>
            {q.options.map((o, i) => (
              <button key={`${qi}-${i}`} className="card click row" style={{ textAlign: 'left', padding: 16, animation: `fade .3s ${i * 0.06}s both`, borderColor: `color-mix(in srgb, ${PROFILE_COLORS[i % 8]} 40%, transparent)`, background: `color-mix(in srgb, ${PROFILE_COLORS[i % 8]} 10%, var(--s1))` }} onClick={() => answer(o.tags || {})}>
                <span style={{ fontSize: 30 }}>{o.emoji || '•'}</span>
                <b style={{ fontSize: 16.5 }}>{o.label}</b>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'results' && (
        <div>
          <div className="card glow" style={{ '--accent': 'var(--c-game)' } as any}>
            <div className="eyebrow">{t('Le groupe ce soir')}</div>
            <div className="row wrap mt12" style={{ gap: 6 }}>
              {who.map(({ p }) => <Avatar key={p.id} p={p} size="sm" />)}
              {guests.map((x, i) => <Avatar key={i} p={x} size="sm" />)}
              <span className="small muted">{tp(total, '{n} personne', '{n} personnes')} · {fmtRuntime(minutes)}</span>
            </div>
            {groupTaste.length > 0 && <p className="mt12">{t('Envie de :')} <b>{groupTaste.map(tv).join(', ')}</b></p>}
            <div className="row wrap mt12 gap6">
              <button className="btn sm" onClick={() => { setStep('setup'); }}><RotateCcw size={14} /> {t('Recommencer')}</button>
              {guests.length > 0 && <button className="btn sm" onClick={saveGuests}><UserPlus size={14} /> {t('Garder les invités')}</button>}
            </div>
          </div>
          {kind === 'media' && (
            <div className="mt12"><Seg value={mediaKind} onChange={setMediaKind} options={[{ v: 'movie', label: `🎬 ${t('Films')}`, c: 'var(--c-movie)' }, { v: 'series', label: `📺 ${t('Séries')}`, c: 'var(--c-series)' }]} /></div>
          )}
          <Results ranked={ranked} who={who} kind={resKind}
            context={`game night with ${total} people, ${minutes} min available`}
            guestsNote={guests.map((x) => `${x.name} likes ${Object.entries(x.tags).filter(([k, v]) => v > 0 && !k.startsWith('_')).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join('/') || '?'}`).join('; ')} />
        </div>
      )}
      {step === 'results' && !settings.geminiKey && <p className="tiny dim mt12 center"><Sparkles size={12} /> {t('Avec une clé Gemini, l’IA explique ses choix.')}</p>}
    </Sheet>
  );
}
