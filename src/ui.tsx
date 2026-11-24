import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Icon } from './icons';
import type { Row } from './api';

// ---------- toasts
const ToastCtx = createContext<(message: string, kind?: 'ok' | 'error') => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: string } | null>(null);
  const show = useCallback((message: string, kind: 'ok' | 'error' = 'ok') => setToast({ message, kind }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
    </ToastCtx.Provider>
  );
}

// ---------- loading data
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((d) => !cancelled && (setData(d), setError('')))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}

/** Runs an action, shows its error as a toast, returns whether it worked. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, success?: string): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      if (success) toast(success);
      return true;
    } catch (e) {
      toast((e as Error).message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}

// ---------- layout pieces
export function Page({ title, sub, actions, children }: { title: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {sub && <p className="sub">{sub}</p>}
        </div>
        <div className="row">{actions}</div>
      </div>
      {children}
    </div>
  );
}

// Colour says what state a thing is in: good, needs attention, bad, or neither.
// The ordinary healthy state is a quiet dot; only states that need a look get a tint.
const TONE: Record<string, 'positive' | 'warning' | 'negative' | 'dot' | ''> = {
  active: 'dot', published: 'dot', yes: 'dot', paid: 'positive', delivered: 'positive', succeeded: 'positive', confirmed: 'positive',
  pending_payment: 'warning', pending: 'warning', draft: 'warning', unpaid: 'warning', processing: 'warning', partially_refunded: 'warning', failed_attempt: 'warning',
  cancelled: 'negative', failed: 'negative', suspended: 'negative',
};

export function Status({ value }: { value: string | boolean | null | undefined }) {
  if (value === null || value === undefined) return <span className="muted">–</span>;
  const text = typeof value === 'boolean' ? (value ? 'yes' : 'no') : value;
  const label = String(text).replace(/_/g, ' ');
  return <span className={`pill ${TONE[String(text)] ?? ''}`}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>;
}

export function Loading({ error, loading }: { error: string; loading: boolean }) {
  if (error) return <p className="error">{error}</p>;
  return loading ? <p className="muted">Loading…</p> : null;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="page-head">
          <h2>{title}</h2>
          <button className="icon" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** The API reaches only the first 10,000 rows of a list and counts to 100,000; beyond that, filter or search. */
export function Pager({ page, size, total, capped, onPage }: { page: number; size: number; total: number; capped?: boolean; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.min(Math.ceil(total / size), Math.floor(10_000 / size)));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return (
    <div className="pager">
      <span className="muted">{from}–{to} of {total.toLocaleString('en-IN')}{capped ? '+' : ''}</span>
      <div className="row">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

/** Underline tabs on a full-width rule. A count appears only where it is a queue someone must work. */
export function Tabs({ tabs, value, onChange }: { tabs: { label: string; value: string; count?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={value === t.value ? 'on' : ''} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && <span className="count">{t.count.toLocaleString('en-IN')}</span>}
        </button>
      ))}
    </div>
  );
}

/** A product photograph, or an honest blank when there is none. */
export function Thumb({ src, small }: { src?: string | null; small?: boolean }) {
  return src ? <img className={`thumb${small ? ' sm' : ''}`} src={src} alt="" loading="lazy" /> : <span className={`thumb${small ? ' sm' : ''} blank`}><Icon name="products" /></span>;
}

export function Table({ columns, rows, onRow, media, empty = 'Nothing here yet.' }: {
  columns: { label: string; render: (row: Row) => ReactNode; className?: string }[];
  rows: Row[];
  onRow?: (row: Row) => void;
  /** Rows carry a photograph: a taller pitch (photo height + 24). */
  media?: boolean;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="empty">{empty}</p>;
  return (
    <div className="table-wrap">
      <table className={media ? 'media' : ''}>
        <thead>
          <tr>{columns.map((c) => <th key={c.label} className={c.className}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} onClick={() => onRow?.(r)} className={onRow ? 'click' : ''}>
              {columns.map((c) => <td key={c.label} className={c.className}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
