import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { api, date, money, type Row } from '../api';
import { Loading, Status, Table, Thumb, useAction, useLoad } from '../ui';

const NEXT_SHIPMENT: Record<string, string[]> = {
  label_created: ['in_transit', 'cancelled'],
  in_transit: ['out_for_delivery', 'delivered', 'failed_attempt', 'returned', 'cancelled'],
  out_for_delivery: ['delivered', 'failed_attempt', 'returned'],
  failed_attempt: ['in_transit', 'out_for_delivery', 'returned'],
};
const REFUND_REASONS = ['customer_request', 'damaged', 'wrong_item', 'other'];

export default function OrderDetail() {
  const { can } = useAuth();
  const { id } = useParams();
  const { run, busy } = useAction();
  const { data, error, loading, reload } = useLoad(async () => {
    const [order, shipments, refunds] = await Promise.all([
      api.get(`/admin/orders/${id}`),
      api.get<Row[]>(`/orders/${id}/shipments`),
      api.get<Row[]>(`/orders/${id}/refunds`),
    ]);
    return { order, shipments, refunds };
  }, [id]);

  if (!data) return <div className="page"><Loading error={error} loading={loading} /></div>;
  const { order, shipments, refunds } = data;
  const cur = order.currency as string;
  const addr = order.shippingAddress as Row;

  const act = (fn: () => Promise<unknown>, ok: string) => async () => {
    if (await run(fn, ok)) reload();
  };

  const canCancel = ['pending_payment', 'confirmed', 'processing'].includes(order.status);
  const canShip = ['confirmed', 'processing', 'shipped'].includes(order.status);
  const codPending = (order.payments as Row[]).find((p) => p.provider === 'cod' && p.status === 'pending');
  const refundable = can('refunds') && ['paid', 'partially_refunded'].includes(order.paymentStatus);

  return (
    <div className="page">
      <div className="detail-head">
        <div className="titles">
          <h1 className="mono" style={{ fontFamily: 'var(--mono)', fontSize: 17 }}>{order.number}</h1>
          <p className="meta">Placed {date(order.createdAt)} · {order.email}{order.phone && ` · ${order.phone}`}</p>
          <div className="tags"><Status value={order.status} /><Status value={order.paymentStatus} /></div>
        </div>
        <div className="row wrap">
          <Link to="/orders" className="btn">All orders</Link>
          {codPending && order.status !== 'cancelled' && (
            <button disabled={busy} onClick={act(() => api.post(`/payments/${codPending.id}/collect`), 'Cash recorded')}>Mark cash collected</button>
          )}
          {canCancel && (
            <button
              className="danger"
              disabled={busy}
              onClick={() => {
                const reason = prompt('Reason for cancelling (short):', 'cancelled_by_store');
                if (reason) void act(() => api.post(`/admin/orders/${id}/cancel`, { reason: reason.slice(0, 60) }), 'Order cancelled')();
              }}
            >
              Cancel order
            </button>
          )}
          {order.status === 'confirmed' && (
            <button className="primary" disabled={busy} onClick={act(() => api.patch(`/admin/orders/${id}/status`, { status: 'processing' }), 'Packing started')}>
              Start packing
            </button>
          )}
        </div>
      </div>

      <div className="grid12">
        <section className="card span8">
          <div className="card-head"><h2>Pieces</h2><span className="meta">{(order.items as Row[]).reduce((n, i) => n + i.quantity, 0)} in this order</span></div>
          <Table
            media
            rows={order.items}
            columns={[
              { label: 'Piece', render: (i) => <div className="cell"><Thumb src={i.image} /><div><div className="name">{i.name}</div><div className="sub mono">{i.sku}</div></div></div> },
              { label: 'Qty', className: 'num', render: (i) => i.quantity },
              { label: 'Price', className: 'num', render: (i) => money(i.unitPriceMinor, cur) },
              { label: 'Total', className: 'num', render: (i) => money(i.lineTotalMinor, cur) },
            ]}
          />
        </section>
        <section className="card span4">
          <div className="card-head"><h2>Totals</h2><span className="meta">{order.shippingMethod ?? ''}</span></div>
          <table className="totals">
            <tbody>
              <tr><td>Subtotal</td><td className="num">{money(order.subtotalMinor, cur)}</td></tr>
              {order.discountMinor > 0 && <tr><td>Discount {order.couponCode && <span className="mono">{order.couponCode}</span>}</td><td className="num">−{money(order.discountMinor, cur)}</td></tr>}
              <tr><td>Shipping</td><td className="num">{money(order.shippingMinor, cur)}</td></tr>
              {order.shippingDiscountMinor > 0 && <tr><td>Shipping discount</td><td className="num">−{money(order.shippingDiscountMinor, cur)}</td></tr>}
              <tr className="strong"><td>Total</td><td className="num">{money(order.totalMinor, cur)}</td></tr>
            </tbody>
          </table>
          <h3 style={{ margin: '20px 0 8px' }}>Deliver to</h3>
          <p>{addr.name}<br />{addr.line1}{addr.line2 && `, ${addr.line2}`}<br />{addr.city}, {addr.state} {addr.postalCode}<br />{addr.country}</p>
        </section>
      </div>

      <div className="grid12">
        <section className="card span6">
          <div className="card-head"><h2>Shipments</h2></div>
          <Table
            rows={shipments}
            empty="Nothing shipped yet."
            columns={[
              { label: 'Carrier', render: (s) => s.carrier },
              { label: 'Tracking', render: (s) => (s.trackingUrl ? <a href={s.trackingUrl} target="_blank" rel="noreferrer">{s.trackingNumber}</a> : <span className="mono">{s.trackingNumber}</span>) },
              { label: 'Status', render: (s) => <Status value={s.status} /> },
              {
                label: '',
                render: (s) =>
                  NEXT_SHIPMENT[s.status] ? (
                    <select
                      aria-label="Move shipment to"
                      value=""
                      disabled={busy}
                      style={{ height: 32, borderRadius: 6 }}
                      onChange={(e) => e.target.value && void act(() => api.patch(`/shipments/${s.id}/status`, { status: e.target.value }), 'Shipment updated')()}
                    >
                      <option value="">Move to…</option>
                      {NEXT_SHIPMENT[s.status].map((n) => <option key={n} value={n}>{n.replace(/_/g, ' ')}</option>)}
                    </select>
                  ) : null,
              },
            ]}
          />
          {canShip && <ShipForm orderId={String(id)} onDone={reload} />}
        </section>
        <section className="card span6">
          <div className="card-head"><h2>Payments and refunds</h2></div>
          <Table
            rows={order.payments}
            empty="No payment started."
            columns={[
              { label: 'Method', render: (p) => (p.provider === 'cod' ? 'Cash on delivery' : p.provider.charAt(0).toUpperCase() + p.provider.slice(1)) },
              { label: 'Status', render: (p) => <Status value={p.status} /> },
              { label: 'Amount', className: 'num', render: (p) => money(p.amountMinor, p.currency) },
            ]}
          />
          {refunds.length > 0 && (
            <Table
              rows={refunds}
              columns={[
                { label: 'Refund', render: (r) => String(r.reason).replace(/_/g, ' ') },
                { label: 'Status', render: (r) => <Status value={r.status} /> },
                { label: 'Amount', className: 'num', render: (r) => money(r.amountMinor, r.currency) },
              ]}
            />
          )}
          {refundable && <RefundForm orderId={String(id)} onDone={reload} />}
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>Timeline</h2></div>
        <ul className="timeline">
          {(order.timeline as Row[]).slice().reverse().map((e) => (
            <li key={e.id}><time>{date(e.createdAt)}</time><span><b style={{ fontWeight: 500 }}>{String(e.type).replace(/_/g, ' ')}</b> {e.message}</span></li>
          ))}
        </ul>
        <NoteForm orderId={String(id)} onDone={reload} />
      </section>
    </div>
  );
}

function ShipForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTracking] = useState('');
  const [trackingUrl, setUrl] = useState('');
  const { run, busy } = useAction();
  return (
    <form
      className="row wrap"
      style={{ marginTop: 16 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api.post(`/orders/${orderId}/shipments`, { carrier, trackingNumber, ...(trackingUrl && { trackingUrl }) }), 'Shipment created')) {
          setCarrier(''); setTracking(''); setUrl('');
          onDone();
        }
      }}
    >
      <input placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} required />
      <input placeholder="Tracking number" value={trackingNumber} onChange={(e) => setTracking(e.target.value)} required />
      <input placeholder="Tracking URL (optional)" value={trackingUrl} onChange={(e) => setUrl(e.target.value)} />
      <button disabled={busy}>Ship the rest</button>
    </form>
  );
}

function RefundForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('customer_request');
  const { run, busy } = useAction();
  return (
    <form
      className="row wrap"
      style={{ marginTop: 16 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!confirm(amount ? `Refund ${amount}?` : 'Refund everything still refundable?')) return;
        const body = { reason, ...(amount && { amountMinor: Math.round(Number(amount) * 100) }) };
        if (await run(() => api.post(`/admin/orders/${orderId}/refunds`, body), 'Refund sent')) {
          setAmount('');
          onDone();
        }
      }}
    >
      <input type="number" step="0.01" min="0" placeholder="Amount (empty = all)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <select value={reason} onChange={(e) => setReason(e.target.value)}>
        {REFUND_REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
      </select>
      <button className="danger" disabled={busy}>Refund</button>
    </form>
  );
}

function NoteForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [note, setNote] = useState('');
  const { run, busy } = useAction();
  return (
    <form
      className="row"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api.post(`/admin/orders/${orderId}/notes`, { note }), 'Note added')) {
          setNote('');
          onDone();
        }
      }}
    >
      <input placeholder="Add a note for the team" value={note} onChange={(e) => setNote(e.target.value)} required />
      <button disabled={busy}>Add note</button>
    </form>
  );
}
