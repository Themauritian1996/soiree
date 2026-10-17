import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection, deleteDoc, writeBatch, arrayUnion,
} from 'firebase/firestore';
import { db, firebaseEnabled, watchUser, signOut as fbSignOut } from './firebase';
import type { Household, Item, Profile, Settings } from './types';
import { lsGet, lsSet, stripUndefined, uid } from './util';
import { PROFILE_COLORS, PROFILE_EMOJIS } from './vocab';
import { t } from './i18n';

type Mode = 'loading' | 'signedOut' | 'local' | 'cloud';

export function newProfile(name: string, i = 0, guest = false): Profile {
  return {
    id: uid(8), name, guest,
    emoji: PROFILE_EMOJIS[i % PROFILE_EMOJIS.length],
    color: PROFILE_COLORS[i % PROFILE_COLORS.length],
    prefs: { game: {}, media: {}, weight: 2.5, maxTime: 90, moods: {} },
    ratings: {}, createdAt: Date.now(),
  };
}

const emptyHousehold = (name = t('Ma maison')): Household => ({ id: 'local', name, members: [], profiles: [], settings: {} });

interface Ctx {
  mode: Mode;
  user: User | null;
  household: Household;
  items: Item[];
  profiles: Profile[];
  settings: Settings;
  activeId: string | null;
  active: Profile | null;
  syncing: boolean;
  error: string | null;
  setActive: (id: string) => void;
  useLocal: () => void;
  signOut: () => Promise<void>;
  addItems: (items: Item[]) => Promise<void>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  rate: (profileId: string, itemId: string, n: number) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  renameHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  importData: (data: { profiles?: Profile[]; items?: Item[]; settings?: Settings }, replace?: boolean) => Promise<void>;
}

const StoreCtx = createContext<Ctx>(null as any);
export const useStore = () => useContext(StoreCtx);

const LS_H = 'soiree.household';
const LS_I = 'soiree.items';
const LS_MODE = 'soiree.mode';
const LS_ACTIVE = 'soiree.active';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household>(() => lsGet(LS_H, emptyHousehold()));
  const [items, setItems] = useState<Item[]>(() => lsGet(LS_I, [] as Item[]));
  const [activeId, setActiveId] = useState<string | null>(() => lsGet(LS_ACTIVE, null as string | null));
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hRef = useRef(household);
  hRef.current = household;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // ---------- Auth ----------
  useEffect(() => {
    if (!firebaseEnabled) {
      setMode(lsGet<string>(LS_MODE, '') === 'local' ? 'local' : 'signedOut');
      return;
    }
    return watchUser((u) => {
      setUser(u);
      if (u) setMode('cloud');
      else setMode(lsGet<string>(LS_MODE, '') === 'local' ? 'local' : 'signedOut');
    });
  }, []);

  // ---------- Cloud subscription ----------
  useEffect(() => {
    if (mode !== 'cloud' || !user || !db) return;
    const fdb = db;
    let unsubH = () => {};
    let unsubI = () => {};
    let cancelled = false;
    (async () => {
      try {
        setSyncing(true);
        const uref = doc(fdb, 'users', user.uid);
        const usnap = await getDoc(uref);
        let hid: string | undefined = usnap.exists() ? usnap.data().householdId : undefined;
        if (!hid) {
          // Nouveau foyer : on y verse les données locales s'il y en a
          hid = uid(20);
          const local = lsGet<Household>(LS_H, emptyHousehold());
          const localItems = lsGet<Item[]>(LS_I, []);
          const profiles = local.profiles.length ? local.profiles : [newProfile(user.displayName?.split(' ')[0] || t('Moi'), 0)];
          await setDoc(doc(fdb, 'households', hid), stripUndefined({
            name: local.name || t('Ma maison'), members: [user.uid], profiles, settings: local.settings || {},
          }));
          await setDoc(uref, { householdId: hid, email: user.email || null }, { merge: true });
          for (let i = 0; i < localItems.length; i += 400) {
            const b = writeBatch(fdb);
            localItems.slice(i, i + 400).forEach((it) => b.set(doc(fdb, 'households', hid!, 'items', it.id), stripUndefined(it)));
            await b.commit();
          }
        }
        if (cancelled) return;
        const finalHid = hid;
        unsubH = onSnapshot(doc(fdb, 'households', finalHid), (s) => {
          if (!s.exists()) return;
          const d = s.data() as Omit<Household, 'id'>;
          const h: Household = { id: finalHid, name: d.name, members: d.members || [], profiles: d.profiles || [], settings: d.settings || {} };
          setHousehold(h);
          lsSet(LS_H, h);
          setSyncing(false);
        }, (e) => { setError(e.message); setSyncing(false); });
        unsubI = onSnapshot(collection(fdb, 'households', finalHid, 'items'), (s) => {
          const arr = s.docs.map((d) => ({ ...(d.data() as Item), id: d.id }));
          arr.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
          setItems(arr);
          lsSet(LS_I, arr);
        }, (e) => setError(e.message));
      } catch (e: any) {
        setError(e?.message || String(e));
        setSyncing(false);
      }
    })();
    return () => { cancelled = true; unsubH(); unsubI(); };
  }, [mode, user]);

  // ---------- Profil actif ----------
  useEffect(() => {
    if (!household.profiles.length) return;
    if (!activeId || !household.profiles.find((p) => p.id === activeId)) {
      const first = household.profiles.find((p) => !p.guest) || household.profiles[0];
      setActiveId(first.id);
      lsSet(LS_ACTIVE, first.id);
    }
  }, [household.profiles, activeId]);

  const isCloud = () => modeRef.current === 'cloud' && !!db && hRef.current.id !== 'local';
  const hdoc = () => doc(db!, 'households', hRef.current.id);

  // ---------- Écritures ----------
  const writeHousehold = useCallback(async (patch: Partial<Household>) => {
    const next = { ...hRef.current, ...patch };
    hRef.current = next;
    setHousehold(next);
    lsSet(LS_H, next);
    if (isCloud()) {
      const { id, members, ...rest } = patch as any;
      await updateDoc(hdoc(), stripUndefined(rest));
    }
  }, []);

  const addItems = useCallback(async (newItems: Item[]) => {
    setItems((prev) => {
      const next = [...newItems, ...prev.filter((p) => !newItems.find((n) => n.id === p.id))];
      lsSet(LS_I, next);
      return next;
    });
    if (isCloud()) {
      const b = writeBatch(db!);
      newItems.forEach((it) => b.set(doc(db!, 'households', hRef.current.id, 'items', it.id), stripUndefined(it)));
      await b.commit();
    }
  }, []);

  const updateItem = useCallback(async (id: string, patch: Partial<Item>) => {
    let merged: Item | undefined;
    setItems((prev) => {
      const next = prev.map((p) => (p.id === id ? (merged = { ...p, ...patch }) : p));
      lsSet(LS_I, next);
      return next;
    });
    if (isCloud()) {
      await setDoc(doc(db!, 'households', hRef.current.id, 'items', id), stripUndefined(patch), { merge: true });
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => { const next = prev.filter((p) => p.id !== id); lsSet(LS_I, next); return next; });
    if (isCloud()) await deleteDoc(doc(db!, 'households', hRef.current.id, 'items', id));
  }, []);

  const saveProfile = useCallback(async (p: Profile) => {
    const list = hRef.current.profiles;
    const exists = list.find((x) => x.id === p.id);
    await writeHousehold({ profiles: exists ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p] });
  }, [writeHousehold]);

  const deleteProfile = useCallback(async (id: string) => {
    await writeHousehold({ profiles: hRef.current.profiles.filter((x) => x.id !== id) });
  }, [writeHousehold]);

  const rate = useCallback(async (profileId: string, itemId: string, n: number) => {
    const list = hRef.current.profiles.map((p) => {
      if (p.id !== profileId) return p;
      const ratings = { ...p.ratings };
      if (n <= 0) delete ratings[itemId]; else ratings[itemId] = n;
      return { ...p, ratings };
    });
    await writeHousehold({ profiles: list });
  }, [writeHousehold]);

  const updateSettings = useCallback(async (s: Partial<Settings>) => {
    await writeHousehold({ settings: { ...hRef.current.settings, ...s } });
  }, [writeHousehold]);

  const renameHousehold = useCallback(async (name: string) => { await writeHousehold({ name }); }, [writeHousehold]);

  const joinHousehold = useCallback(async (code: string) => {
    if (!db || !user) throw new Error(t('Connecte-toi pour rejoindre un foyer.'));
    const c = code.trim();
    await updateDoc(doc(db, 'households', c), { members: arrayUnion(user.uid) });
    await setDoc(doc(db, 'users', user.uid), { householdId: c }, { merge: true });
    // relance l'abonnement
    setMode('loading');
    setTimeout(() => setMode('cloud'), 50);
  }, [user]);

  const importData = useCallback(async (data: { profiles?: Profile[]; items?: Item[]; settings?: Settings }, replace = false) => {
    if (data.profiles) {
      const base = replace ? [] : hRef.current.profiles.filter((p) => !data.profiles!.find((q) => q.id === p.id));
      await writeHousehold({ profiles: [...base, ...data.profiles] });
    }
    if (data.settings) await writeHousehold({ settings: { ...hRef.current.settings, ...data.settings } });
    if (data.items?.length) await addItems(data.items);
  }, [writeHousehold, addItems]);

  const useLocal = useCallback(() => {
    lsSet(LS_MODE, 'local');
    if (!hRef.current.profiles.length) {
      const h = { ...hRef.current, profiles: [newProfile(t('Moi'), 0)] };
      setHousehold(h); lsSet(LS_H, h);
    }
    setMode('local');
  }, []);

  const signOut = useCallback(async () => {
    lsSet(LS_MODE, '');
    if (modeRef.current === 'cloud') {
      await fbSignOut();
      // on garde une copie locale hors-ligne mais on repart d'un foyer local vide
      localStorage.removeItem(LS_H); localStorage.removeItem(LS_I);
      setHousehold(emptyHousehold()); setItems([]);
    }
    setMode('signedOut');
  }, []);

  const setActive = useCallback((id: string) => { setActiveId(id); lsSet(LS_ACTIVE, id); }, []);

  const value = useMemo<Ctx>(() => ({
    mode, user, household, items, profiles: household.profiles, settings: household.settings,
    activeId, active: household.profiles.find((p) => p.id === activeId) || null, syncing, error,
    setActive, useLocal, signOut, addItems, updateItem, deleteItem, saveProfile, deleteProfile, rate,
    updateSettings, renameHousehold, joinHousehold, importData,
  }), [mode, user, household, items, activeId, syncing, error, setActive, useLocal, signOut, addItems, updateItem,
    deleteItem, saveProfile, deleteProfile, rate, updateSettings, renameHousehold, joinHousehold, importData]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
