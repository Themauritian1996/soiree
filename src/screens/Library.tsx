import { useEffect, useMemo, useState } from 'react';
import { Search, Library as LibIcon, Grid3x3, Rows3, Plus, Camera, Type, Users, Clock, Brain, Calendar, Star, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useNav } from '../lib/nav';
import { Cover, Empty, Seg, Sheet } from '../components/ui';
import type { Item, Kind } from '../lib/types';
import { GAME_CATEGORIES, KIND_META, MEDIA_GENRES } from '../lib/vocab';
import { fmtPlayers, fmtRuntime, fmtTime, gradFor, hash, norm } from '../lib/util';
import { profileScore } from '../lib/scoring';
import { t, tp, ti, tv, getLang } from '../lib/i18n';
import { cachedColor, inkFor } from '../lib/color';
import PhotoPeek from '../components/PhotoPeek';
import { lsGet, lsSet } from '../lib/util';

type View = 'shelf' | 'wall' | 'list';
const GAME_GROUPS = { type: 'Type', players: 'Joueurs', time: 'Durée', weight: 'Complexité', alpha: 'A → Z' } as const; // clés traduites à l'affichage
const MEDIA_GROUPS = { genre: 'Genre', decade: 'Décennie', mood: 'Ambiance', format: 'Format', alpha: 'A → Z' } as const;
type Group = keyof typeof GAME_GROUPS | keyof typeof MEDIA_GROUPS | 'none';

const tag = (k: string) => `${emojiFor(k)} ${tv(k)}`;
const emojiFor = (k: string) => GAME_CATEGORIES.find((c) => c.key === k)?.emoji || MEDIA_GENRES.find((g) => g.key === k)?.emoji || '';

function groupItems(items: Item[], g: Group): { label: string; items: Item[] }[] {
  const map = new Map<string, Item[]>();
  const add = (k: string, it: Item) => { if (!map.has(k)) map.set(k, []); map.get(k)!.push(it); };
  for (const it of items) {
    switch (g) {
      case 'type': add(it.categories?.[0] ? tag(it.categories[0]) : `❔ ${t('À classer')}`, it); break;
      case 'genre': add(it.genres?.[0] ? tag(it.genres[0]) : `❔ ${t('À classer')}`, it); break;
      case 'mood': add(it.moods?.[0] ? tv(it.moods[0]) : t('Autre'), it); break;
      case 'players': {
        const mx = it.maxPlayers || 0, mn = it.minPlayers || 0;
        add(!mx ? `❔ ${t('Inconnu')}` : mx <= 2 ? `👫 ${t('Idéal à 2')}` : mn >= 4 ? `🎉 ${t('Grand groupe (4+)')}` : mx >= 6 ? `👨‍👩‍👧‍👦 ${t('De 2-3 à 6+')}` : `🙂 ${t('2 à 5 joueurs')}`, it); break;
      }
      case 'time': {
        const tm = it.maxTime || it.minTime || 0;
        add(!tm ? `❔ ${t('Inconnue')}` : tm <= 20 ? `⚡ ${t('Express (≤ 20 min)')}` : tm <= 45 ? `☕ ${t('Courte (≤ 45 min)')}` : tm <= 90 ? `🕐 ${t('Moyenne (≤ 1 h 30)')}` : `🌙 ${t('Longue soirée')}`, it); break;
      }
      case 'weight': {
        const w = it.weight || 0;
        add(!w ? `❔ ${t('Inconnue')}` : w < 1.8 ? `🟢 ${t('Facile')}` : w < 2.6 ? `🟡 ${t('Intermédiaire')}` : w < 3.4 ? `🟠 ${t('Expert')}` : `🔴 ${t('Très lourd')}`, it); break;
      }
      case 'decade': add(it.year ? `${Math.floor(it.year / 10) * 10}s` : `❔ ${t('Année inconnue')}`, it); break;
      case 'format': add(it.format ? tv(it.format) : t('Sans format'), it); break;
      case 'alpha': add(norm(ti(it))[0]?.toUpperCase() || '#', it); break;
      case 'none': add('', it); break;
    }
  }
  const order = (s: string) => (s.startsWith('❔') ? 'zzz' : s);
  return [...map.entries()].map(([label, items]) => ({ label, items: items.sort((a, b) => ti(a).localeCompare(ti(b), getLang())) }))
    .sort((a, b) => g === 'decade' || g === 'alpha' ? order(a.label).localeCompare(order(b.label)) : b.items.length - a.items.length || order(a.label).localeCompare(order(b.label)));
}

export default function Library() {
  const { items, active } = useStore();
  const nav = useNav();
  const kind = nav.libKind;
  const [view, setViewS] = useState<View>(() => lsGet<View>('soiree.libview', 'shelf'));
  const setView = (v: View) => { setViewS(v); lsSet('soiree.libview', v); };
  const [group, setGroupS] = useState<Record<Kind, Group>>(() => lsGet('soiree.libgroup', { game: 'type', movie: 'genre', series: 'genre' } as Record<Kind, Group>));
  const setGroup = (g: Record<Kind, Group>) => { setGroupS(g); lsSet('soiree.libgroup', g); };
  const [peek, setPeek] = useState<Item | null>(null);
  const [status, setStatus] = useState<'all' | 'owned' | 'wish' | 'lent' | 'sugg'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'alpha' | 'match' | 'time' | 'year'>('alpha');
  const [addMenu, setAddMenu] = useState(false);

  const isSugg = (i: Item) => (i.tags || []).includes('reco-à-valider');
  const list = useMemo(() => items.filter((i) => i.kind === kind)
    .filter((i) => status === 'all' || (status === 'lent' ? !!i.lentTo : status === 'sugg' ? isSugg(i) : status === 'owned' ? i.status === 'owned' || i.status === 'seen' : i.status === 'wishlist' || i.status === 'watchlist'))
    .filter((i) => !q || norm([i.title, ti(i), i.originalTitle, i.designer, i.director, ...(i.cast || []), ...(i.categories || []), ...(i.genres || [])].join(' ')).includes(norm(q))),
  [items, kind, status, q]);

  const sorted = useMemo(() => {
    const a = [...list];
    if (sort === 'alpha') a.sort((x, y) => ti(x).localeCompare(ti(y), getLang()));
    if (sort === 'recent') a.sort((x, y) => y.addedAt - x.addedAt);
    if (sort === 'year') a.sort((x, y) => (y.year || 0) - (x.year || 0));
    if (sort === 'time') a.sort((x, y) => (x.minTime || x.runtime || 999) - (y.minTime || y.runtime || 999));
    if (sort === 'match' && active) { const sc = new Map(a.map((i) => [i.id, profileScore(active, i, items)])); a.sort((x, y) => sc.get(y.id)! - sc.get(x.id)!); }
    return a;
  }, [list, sort, active, items]);

  const groups = useMemo(() => groupItems(list, group[kind]), [list, group, kind]);
  const groupOpts = kind === 'game' ? GAME_GROUPS : MEDIA_GROUPS;
  const accent = KIND_META[kind].color;

  return (
    <div className="page" style={{ '--accent': accent } as any}>
      <div className="top">
        <div><h1>{t('Collection')}</h1><div className="sub">{list.length} {KIND_META[kind].label.toLowerCase()}</div></div>
        <div className="seg" style={{ padding: 3 }}>
          <button className={view === 'shelf' ? 'on' : ''} style={{ width: 42 }} onClick={() => setView('shelf')} aria-label={t('Étagère')}><LibIcon size={18} /></button>
          <button className={view === 'wall' ? 'on' : ''} style={{ width: 42 }} onClick={() => setView('wall')} aria-label={t('Mur de photos')}><Grid3x3 size={18} /></button>
          <button className={view === 'list' ? 'on' : ''} style={{ width: 42 }} onClick={() => setView('list')} aria-label={t('Inventaire')}><Rows3 size={18} /></button>
        </div>
      </div>

      <Seg value={kind} onChange={nav.setLibKind} options={(['game', 'movie', 'series'] as Kind[]).map((k) => ({ v: k, label: <>{KIND_META[k].emoji} {KIND_META[k].label}</>, c: KIND_META[k].color }))} />

      <div className="search mt12"><Search size={18} /><input className="input" placeholder={kind === 'game' ? t('Titre, auteur, type…') : t('Titre, acteur, réalisateur…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>

      <div className="scroll-x mt12">
        {(status !== 'all' || q) && (
          <button className="chip" onClick={() => { setStatus('all'); setQ(''); }}><X size={13} /> {t('Effacer')}</button>
        )}
        {(kind === 'game' ? (['all', 'owned', 'wish', 'sugg', 'lent'] as const) : (['all', 'wish', 'sugg'] as const)).map((s) => (
          <button key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(status === s ? 'all' : s)}>
            {s === 'all' ? t('Tout') : s === 'owned' ? t('À la maison') : s === 'lent' ? `🤝 ${t('Prêtés')}` : s === 'sugg' ? `💡 ${t('Suggestions')}` : kind === 'game' ? t('Liste de souhaits') : t('À voir')}
          </button>
        ))}
        <span style={{ width: 1, background: 'var(--line)', margin: '4px 2px' }} />
        {view !== 'list'
          ? Object.entries(groupOpts).map(([k, label]) => (
            <button key={k} className={`chip ${group[kind] === k ? 'on' : ''}`} onClick={() => setGroup({ ...group, [kind]: (group[kind] === k ? 'none' : k) as Group })}>{t(label)}{group[kind] === k && <X size={13} />}</button>
          ))
          : ([['alpha', 'A → Z', Type], ['recent', 'Récents', Calendar], ['match', 'Pour moi', Star], ['time', 'Durée', Clock], ['year', 'Année', Calendar]] as const).map(([k, label, I]) => (
            <button key={k} className={`chip ${sort === k ? 'on' : ''}`} onClick={() => setSort(sort === k && k !== 'alpha' ? 'alpha' : k)}><I size={14} />{t(label)}</button>
          ))}
      </div>

      <div className="mt20">
        {list.length === 0 ? (
          <Empty emoji={KIND_META[kind].emoji} title={q ? t('Aucun résultat') : t('Rien ici pour l’instant')}>
            {!q && t('Ajoute des titres en photo ou à la main avec le bouton +.')}
          </Empty>
        ) : view === 'shelf' ? (
          <div className="cubbies">
            {groups.map((g) => <Cubby key={g.label} label={g.label} items={g.items} onPick={setPeek} />)}
          </div>
        ) : view === 'wall' ? (
          groups.map((g) => (
            <div key={g.label} style={{ marginBottom: 22 }}>
              {g.label && <div className="shelf-label"><h3>{g.label}</h3><span className="count">{g.items.length}</span></div>}
              <div className={`wall ${kind === 'game' ? '' : 'posters'}`}>
                {g.items.map((it) => <WallTile key={it.id} item={it} onPick={setPeek} />)}
              </div>
            </div>
          ))
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {sorted.map((it) => <InventoryRow key={it.id} item={it} />)}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setAddMenu(true)}><Plus size={22} /> {t('Ajouter')}</button>

      {peek && <PhotoPeek item={items.find((i) => i.id === peek.id) || peek} onClose={() => setPeek(null)} />}

      {addMenu && (
        <Sheet title={`${t('Ajouter')} — ${KIND_META[kind].label}`} onClose={() => setAddMenu(false)} accent={accent}>
          <div className="col">
            <button className="card click row" style={{ textAlign: 'left' }} onClick={() => { setAddMenu(false); nav.push({ t: 'scan', kind }); }}>
              <div className="avatar" style={{ '--pc': accent } as any}><Camera size={20} /></div>
              <div className="grow"><b>{t('Prendre une photo')}</b><div className="small muted">{t('Étagère, piles de boîtes, DVD ou liste écrite — plusieurs titres d’un coup')}</div></div>
            </button>
            <button className="card click row" style={{ textAlign: 'left' }} onClick={() => { setAddMenu(false); nav.push({ t: 'add', kind }); }}>
              <div className="avatar" style={{ '--pc': accent } as any}><Type size={20} /></div>
              <div className="grow"><b>{t('Écrire un titre')}</b><div className="small muted">{t('Ajoute un ou plusieurs titres à la main')}</div></div>
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** Un casier façon « Kallax » : les boîtes sont empilées à plat, titre lisible sur la tranche. */
function Cubby({ label, items, onPick }: { label: string; items: Item[]; onPick: (i: Item) => void }) {
  return (
    <section className="cubby-wrap">
      {label && <div className="shelf-label"><h3>{label}</h3><span className="count">{items.length}</span></div>}
      <div className="cubby">
        <div className="stack">
          {items.map((it, i) => <Spine key={it.id} item={it} i={i} onPick={onPick} />)}
        </div>
      </div>
    </section>
  );
}

function useItemColor(item: Item) {
  const [c, setC] = useState<string | null>(() => cachedColor(item.id, item.image));
  useEffect(() => { setC(cachedColor(item.id, item.image, setC)); }, [item.id, item.image]);
  return c;
}

function Spine({ item, i, onPick }: { item: Item; i: number; onPick: (i: Item) => void }) {
  const col = useItemColor(item);
  const [a, b] = gradFor(item.title);
  const bg = col || a;
  const ink = inkFor(bg);
  const isGame = item.kind === 'game';
  const thick = isGame ? 46 + Math.round(Math.min(5, item.weight || 2) * 4) : 40;
  const wish = item.status === 'wishlist' || item.status === 'watchlist';
  const sugg = (item.tags || []).includes('reco-à-valider');
  const h = hash(item.id);
  const off = (h >> 3) % (isGame ? 9 : 5);
  const meta = isGame
    ? [item.maxPlayers ? `${item.minPlayers && item.minPlayers !== item.maxPlayers ? `${item.minPlayers}–` : ''}${item.maxPlayers} j.` : '', item.maxTime || item.minTime ? `${item.maxTime || item.minTime}′` : ''].filter(Boolean).join(' · ')
    : [item.year, item.kind === 'series' && item.seasons ? `${item.seasons}S` : item.runtime ? fmtRuntime(item.runtime) : ''].filter(Boolean).join(' · ');
  return (
    <button className="spine2" onClick={() => onPick(item)} title={ti(item)}
      style={{
        height: thick, color: ink,
        width: `${(isGame ? 91 + (h % 9) : 95 + (h % 5)) - off}%`,
        marginLeft: `${off}%`,
        background: col ? `linear-gradient(180deg, color-mix(in srgb, ${bg} 82%, white) 0%, ${bg} 18%, ${bg} 80%, color-mix(in srgb, ${bg} 70%, black) 100%)` : `linear-gradient(90deg, ${a}, ${b})`,
        animationDelay: `${Math.min(i, 12) * 25}ms`,
      }}>
      {item.image ? <img className="spine-thumb" src={item.image} alt="" loading="lazy" /> : <span className="spine-emoji">{KIND_META[item.kind].emoji}</span>}
      <span className="spine-title">{ti(item)}</span>
      {wish && <span className="tag-wish">{isGame ? t('Souhait') : t('À voir')}</span>}
      {sugg && <span className="tag-sugg">💡</span>}
      {item.lentTo && isGame && <span className="tag-lent">🤝 {item.lentTo}</span>}
      {meta && !wish && !item.lentTo && <span className="spine-meta">{meta}</span>}
    </button>
  );
}

function WallTile({ item, onPick }: { item: Item; onPick: (i: Item) => void }) {
  const wish = item.status === 'wishlist' || item.status === 'watchlist';
  const sugg = (item.tags || []).includes('reco-à-valider');
  return (
    <button className="tile" onClick={() => onPick(item)}>
      <Cover item={item} className="tile-cover" />
      {item.image && <span className="tile-title">{ti(item)}</span>}
      {wish && <span className="tag-wish corner">{item.kind === 'game' ? t('Souhait') : t('À voir')}</span>}
      {sugg && <span className="tag-sugg corner">💡</span>}
      {item.lentTo && item.kind === 'game' && <span className="tag-lent corner">🤝 {item.lentTo}</span>}
    </button>
  );
}

export function InventoryRow({ item, right, onClick }: { item: Item; right?: React.ReactNode; onClick?: () => void }) {
  const nav = useNav();
  const wish = item.status === 'wishlist' || item.status === 'watchlist';
  const sugg = (item.tags || []).includes('reco-à-valider');
  return (
    <button className="inv-row" onClick={onClick || (() => nav.push({ t: 'item', id: item.id }))}>
      <Cover item={item} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row gap6"><b className="ellipsis">{ti(item)}</b>{wish && <span className="tag-wish">{item.kind === 'game' ? t('Souhait') : t('À voir')}</span>}{sugg && <span className="tag-sugg">💡</span>}{item.lentTo && item.kind === 'game' && <span className="tag-lent">🤝 {item.lentTo}</span>}</div>
        <div className="meta mt8" style={{ marginTop: 3 }}>
          {item.kind === 'game' ? (
            <>
              {item.maxPlayers && <span><Users size={13} />{item.minPlayers && item.minPlayers !== item.maxPlayers ? `${item.minPlayers}–${item.maxPlayers}` : item.maxPlayers}</span>}
              {(item.minTime || item.maxTime) && <span><Clock size={13} />{fmtTime(item.minTime, item.maxTime)}</span>}
              {item.weight && <span><Brain size={13} />{item.weight.toFixed(1)}</span>}
            </>
          ) : (
            <>
              {item.year && <span>{item.year}</span>}
              {item.runtime && <span><Clock size={13} />{item.kind === 'series' ? tp(item.seasons || 0, '{n} saison', '{n} saisons') : fmtRuntime(item.runtime)}</span>}
              {item.format && <span>{tv(item.format)}</span>}
            </>
          )}
          {!item.enriched && !item.enrichError && <span className="dim">{t('fiche en préparation…')}</span>}
          {item.enrichError && <span style={{ color: 'var(--bad)' }}>{t('fiche incomplète')}</span>}
        </div>
        <div className="tiny dim ellipsis" style={{ marginTop: 2 }}>{(item.categories || item.genres || []).map(tv).join(' · ')}</div>
      </div>
      {right}
    </button>
  );
}
