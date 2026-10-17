import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Item, Profile } from '../lib/types';
import { gradFor } from '../lib/util';
import { KIND_META } from '../lib/vocab';
import { t, ti } from '../lib/i18n';

// ---------------------------------------------------------------- Toasts
type Toast = { id: number; msg: string; err?: boolean };
const ToastCtx = createContext<(msg: string, err?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((msg: string, err = false) => {
    const id = Math.random();
    setList((l) => [...l, { id, msg, err }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), err ? 5200 : 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.err ? 'err' : ''}`}>
            {t.err ? <AlertCircle size={18} color="var(--bad)" /> : <CheckCircle2 size={18} color="var(--ok)" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------------------------------------------------------- Sheet
export function Sheet({ title, onClose, children, full, accent, right }: {
  title?: React.ReactNode; onClose: () => void; children: React.ReactNode; full?: boolean; accent?: string; right?: React.ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`sheet ${full ? 'full' : ''}`} style={accent ? ({ '--accent': accent } as any) : undefined} onClick={(e) => e.stopPropagation()}>
        {!full && <div className="grabber" />}
        {(title || !full) && (
          <div className="sheet-head">
            <h2 className="grow ellipsis">{title}</h2>
            {right}
            <button className="icon-btn sm" onClick={onClose} aria-label={t('Fermer')}><X size={18} /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Cover
export function Cover({ item, className = '', style, badge }: { item: Pick<Item, 'title' | 'image' | 'kind'> & Partial<Item>; className?: string; style?: React.CSSProperties; badge?: string }) {
  const [err, setErr] = useState(false);
  const [a, b] = gradFor(item.title);
  const title = item.loc ? ti(item as Item) : item.title;
  const poster = item.kind !== 'game';
  return (
    <div className={`cover ${poster ? 'poster' : ''} ${className}`} style={style}>
      {item.image && !err ? (
        <img src={item.image} alt="" loading="lazy" onError={() => setErr(true)} />
      ) : (
        <div className="gen" style={{ background: `linear-gradient(150deg, ${a}, ${b})` }}>
          <span className="glyph">{KIND_META[item.kind].emoji}</span>
          <b>{title}</b>
        </div>
      )}
      {badge && <span className="badge">{badge}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- Avatar
export function Avatar({ p, size = '' }: { p: Pick<Profile, 'emoji' | 'color'>; size?: '' | 'sm' | 'lg' }) {
  return <div className={`avatar ${size}`} style={{ '--pc': p.color } as any}>{p.emoji}</div>;
}

// ---------------------------------------------------------------- Stars
export function Stars({ value, onChange, size = 20 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} className={n <= value ? 'on' : ''} style={{ fontSize: size }} onClick={() => onChange?.(n === value ? 0 : n)} disabled={!onChange} aria-label={t('{n} étoiles', { n })}>
          ⭐
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Ring
export function Ring({ value, color = 'var(--c-suggest)', size = 52 }: { value: number; color?: string; size?: number }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--s3)" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <b style={{ fontSize: size < 46 ? 12 : 14 }}>{value}</b>
    </div>
  );
}

// ---------------------------------------------------------------- Segmented
export function Seg<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { v: T; label: React.ReactNode; c?: string }[];
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? 'on' : ''} data-c={o.c ? '1' : undefined} style={o.c ? ({ '--c': o.c } as any) : undefined} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, color }: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  return <button className={`toggle ${on ? 'on' : ''}`} style={color ? ({ '--accent': color } as any) : undefined} onClick={() => onChange(!on)} role="switch" aria-checked={on} />;
}

export function Empty({ emoji, title, children }: { emoji: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="em">{emoji}</div>
      <h3 style={{ color: 'var(--tx)', marginBottom: 6 }}>{title}</h3>
      <div className="small">{children}</div>
    </div>
  );
}

export const Spinner = ({ size = 20 }: { size?: number }) => <div className="spinner" style={{ width: size, height: size }} />;

export function Stepper({ value, onChange, min = 1, max = 99, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label?: string }) {
  return (
    <div className="row" style={{ background: 'var(--s2)', borderRadius: 14, border: '1px solid var(--line)', padding: 4 }}>
      <button className="icon-btn sm plain" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <div className="grow center" style={{ fontWeight: 700, fontFamily: 'var(--display)', fontSize: 18 }}>{value}{label ? <span className="muted small" style={{ fontWeight: 500 }}> {label}</span> : null}</div>
      <button className="icon-btn sm plain" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}
