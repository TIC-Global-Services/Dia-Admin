import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, itemsOf, money, qs, type Row } from './api';
import { Icon } from './icons';
import { Thumb } from './ui';

/** Finds a piece by name or SKU, or an order by number or customer email. Press / to focus. */
export function SearchBar() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<{ products: Row[]; orders: Row[] } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement).tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); input.current?.focus(); }
    };
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, []);

  useEffect(() => {
    if (q.trim().length < 3) { setFound(null); return; }
    let live = true;
    const t = setTimeout(async () => {
      const [p, o] = await Promise.all([
        api.get(`/products${qs({ q: q.trim(), size: 5 })}`).catch(() => null),
        api.get(`/admin/orders${qs({ q: q.trim(), size: 4 })}`).catch(() => null),
      ]);
      if (live) setFound({ products: itemsOf(p), orders: itemsOf(o) });
    }, 220);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const close = () => { setOpen(false); setQ(''); input.current?.blur(); };
  const none = found && !found.products.length && !found.orders.length;

  return (
    <div className="search" ref={box}>
      <div className="box">
        <Icon name="search" />
        <input
          ref={input}
          value={q}
          placeholder="Search pieces, SKUs, orders"
          aria-label="Search"
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'Enter' && q.trim()) { nav(`/products?q=${encodeURIComponent(q.trim())}`); close(); }
          }}
        />
        <kbd>/</kbd>
      </div>
      {open && found && (
        <div className="pop">
          {none && <p className="none">Nothing matches “{q}”.</p>}
          {found.products.length > 0 && <h4>Pieces</h4>}
          {found.products.map((p) => (
            <Link key={p.id} to={`/products?q=${encodeURIComponent(p.sku)}`} onClick={close}>
              <Thumb small src={p.colors?.[0]?.image} />
              <span><b style={{ fontWeight: 500 }}>{p.name}</b><br /><span className="muted mono">{p.sku}</span></span>
            </Link>
          ))}
          {found.orders.length > 0 && <h4>Orders</h4>}
          {found.orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} onClick={close}>
              <span><b style={{ fontWeight: 500 }} className="mono">{o.number}</b><br /><span className="muted">{o.email} · {money(o.totalMinor, o.currency)}</span></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
