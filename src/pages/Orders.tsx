import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, date, itemsOf, money, qs } from '../api';
import { Loading, Page, Pager, Status, Table, Tabs, useLoad } from '../ui';

export const ORDER_STATUSES = ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const SIZE = 20;

// Each tab is a question the team asks, mapped to the order states that answer it.
const TABS: { label: string; value: string; query: Record<string, string> }[] = [
  { label: 'All', value: '', query: {} },
  { label: 'To pack', value: 'pack', query: { status: 'confirmed' } },
  { label: 'Packing', value: 'packing', query: { status: 'processing' } },
  { label: 'On the way', value: 'shipped', query: { status: 'shipped' } },
  { label: 'Delivered', value: 'delivered', query: { status: 'delivered' } },
  { label: 'Awaiting payment', value: 'unpaid', query: { status: 'pending_payment' } },
  { label: 'Cancelled', value: 'cancelled', query: { status: 'cancelled' } },
];

export default function Orders() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(params.get('q') ?? '');
  const tab = params.get('tab') ?? '';
  const filter = TABS.find((t) => t.value === tab)?.query ?? {};

  const { data: stats } = useLoad(() => api.get('/admin/stats/overview'), []);
  const by = (stats?.orders.byStatus ?? {}) as Record<string, number>;
  const countOf = (t: (typeof TABS)[number]) => (t.value === '' ? stats?.orders.total : by[t.query.status]);

  const { data, error, loading } = useLoad(() => api.get(`/admin/orders${qs({ page, size: SIZE, q: q.trim().length >= 3 ? q.trim() : undefined, ...filter })}`), [page, tab, q.trim().length >= 3 ? q.trim() : '']);

  return (
    <Page title="Orders" sub="Newest first. Open an order to pack it, ship it, take a payment or issue a refund.">
      <Tabs
        tabs={TABS.map((t) => ({ label: t.label, value: t.value, count: stats ? countOf(t) ?? 0 : undefined }))}
        value={tab}
        onChange={(v) => { setParams(v ? { tab: v } : {}); setPage(1); }}
      />
      <div className="toolbar">
        <input className="q" type="search" placeholder="Search order number or email" aria-label="Search orders" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <span className="grow" />
        {data && <span className="total">{data.total.toLocaleString('en-IN')} {data.total === 1 ? 'order' : 'orders'}</span>}
      </div>
      <Loading error={error} loading={loading && !data} />
      {data && (
        <>
          <Table
            rows={itemsOf(data)}
            onRow={(r) => nav(`/orders/${r.id}`)}
            empty={q ? 'No orders match that search.' : 'No orders here yet.'}
            columns={[
              { label: 'Order', render: (r) => <><span className="mono">{r.number}</span><br /><span className="sub">{r.email}</span></> },
              { label: 'Placed', render: (r) => date(r.createdAt) },
              { label: 'Pieces', className: 'num', render: (r) => r.items?.reduce((n: number, i: { quantity: number }) => n + i.quantity, 0) },
              { label: 'Status', render: (r) => <Status value={r.status} /> },
              { label: 'Payment', render: (r) => <Status value={r.paymentStatus} /> },
              { label: 'Total', className: 'num', render: (r) => money(r.totalMinor, r.currency) },
            ]}
          />
          <Pager page={page} size={SIZE} total={data.total} capped={data.capped} onPage={setPage} />
        </>
      )}
    </Page>
  );
}
