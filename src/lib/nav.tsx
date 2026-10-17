import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Kind } from './types';

export type Tab = 'home' | 'library' | 'suggest' | 'tools' | 'profiles';
export type ToolId = 'dice' | 'score' | 'timer' | 'chooser' | 'counters' | 'teams';
export type Route =
  | { t: 'item'; id: string }
  | { t: 'scan'; kind?: Kind }
  | { t: 'add'; kind: Kind }
  | { t: 'profile'; id?: string }
  | { t: 'settings' }
  | { t: 'party'; kind?: 'game' | 'media' }
  | { t: 'blend'; kind?: Kind }
  | { t: 'tool'; tool: ToolId; players?: string[] };

interface NavCtx {
  tab: Tab;
  setTab: (t: Tab) => void;
  libKind: Kind;
  setLibKind: (k: Kind) => void;
  stack: Route[];
  push: (r: Route) => void;
  pop: () => void;
  replace: (r: Route) => void;
}

const Ctx = createContext<NavCtx>(null as any);
export const useNav = () => useContext(Ctx);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTabState] = useState<Tab>('home');
  const [libKind, setLibKind] = useState<Kind>('game');
  const [stack, setStack] = useState<Route[]>([]);
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const replace = useCallback((r: Route) => setStack((s) => [...s.slice(0, -1), r]), []);
  const setTab = useCallback((t: Tab) => { setStack([]); setTabState(t); window.scrollTo({ top: 0 }); }, []);
  return <Ctx.Provider value={{ tab, setTab, libKind, setLibKind, stack, push, pop, replace }}>{children}</Ctx.Provider>;
}
