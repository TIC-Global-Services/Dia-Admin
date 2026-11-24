import { Link, useNavigate } from 'react-router-dom';
import { ago, api, date, itemsOf, money, type Row } from '../api';
import { Columns } from '../Chart';
import { Icon } from '../icons';
import { useAuth } from '../auth';
import { Loading, Page, Status, Table, Thumb, useLoad } from '../ui';

const n = (v: number) => v.toLocaleString('en-IN');

export default function Dashboard() {
  const nav = useNavigate();
  const { can } = useAuth();
  const seeOrders = can('orders');
  const { data, error, loading } = useLoad(async () => {
    const [stats, recent] = await Promise.all([api.get('/admin/stats/overview'), seeOrders ? api.get('/admin/orders?size=5') : Promise.resolve([])]);
    return { stats, recent: itemsOf(recent) };
  }, []);

  if (!data) return <Page title="Overview"><Loading error={error} loading={loading} /></Page>;
  const { stats, recent } = data;
  const o = stats.orders, c = stats.catalogue;
  const series = stats.series as { day: string; orders: number; revenueMinor: number }[];
  const ordersIn30 = series.reduce((s, d) => s + d.orders, 0);
  const revenueIn30 = series.reduce((s, d) => s + d.revenueMinor, 0);

  // The one finding: what most needs attention today, stated next to the action that fixes it.
  const finding =
    o.toPack > 0 ? (
      <>{o.toPack} {o.toPack === 1 ? 'order is' : 'orders are'} waiting to be packed; the oldest was placed {ago(o.oldestToPackAt)}. <Link to="/orders?tab=pack">Open the queue</Link></>
    ) : c.priced === 0 ? (
      <>Nothing can be bought online yet: all {n(c.active)} active pieces are price on request. {can('catalogue') && <Link to="/products?priced=false">Set prices</Link>}</>
    ) : (
      <>No orders are waiting. {n(c.priced)} of {n(c.active)} active pieces have a price.</>
    );

  const ready = [
    ['Active on the website', c.active, c.total],
    ['With photographs', c.withPhotos, c.active],
    ['In a collection', c.inCollection, c.active],
    ['With a price', c.priced, c.active],
    ['In stock', c.inStock, c.active],
  ] as const;

  return (
    <Page
      title="Overview"
      sub={finding}
      actions={can('catalogue') && <Link to="/products?new=1" className="btn primary"><Icon name="plus" />Add a piece</Link>}
    >
      <div className="kpis">
        <Link to="/orders?tab=pack" className="kpi">
          <span className="label">To pack</span>
          <span className="value">{n(o.toPack)}</span>
          <span className="note">{o.toPack ? `oldest placed ${ago(o.oldestToPackAt)}` : 'nothing waiting'}</span>
        </Link>
        <Link to="/orders?tab=unpaid" className="kpi">
          <span className="label">Awaiting payment</span>
          <span className="value">{n(o.pendingPayment)}</span>
          <span className="note">stock held until paid</span>
        </Link>
        <Link to="/orders?tab=shipped" className="kpi">
          <span className="label">On the way</span>
          <span className="value">{n(o.shipped)}</span>
          <span className="note">shipped, not yet delivered</span>
        </Link>
        <Link to="/orders?tab=delivered" className="kpi">
          <span className="label">Delivered</span>
          <span className="value">{n(o.delivered)}</span>
          <span className="note">all time</span>
        </Link>
      </div>

      <div className="grid12">
        <section className="card span8">
          <div className="card-head">
            <h2>Orders per day</h2>
            <span className="meta">{n(ordersIn30)} {ordersIn30 === 1 ? 'order' : 'orders'} · worth {money(revenueIn30)} in the last 30 days</span>
          </div>
          <Columns
            points={series.map((d) => ({ day: d.day, value: d.orders }))}
            label={(p) => {
              const d = series.find((x) => x.day === p.day)!;
              return `${new Date(p.day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${d.orders} ${d.orders === 1 ? 'order' : 'orders'}, ${money(d.revenueMinor)}`;
            }}
          />
        </section>

        <section className="card span4">
          <div className="card-head">
            <h2>Ready to sell</h2>
            <span className="meta">{n(c.total)} pieces</span>
          </div>
          {ready.map(([label, have, of]) => (
            <div className="bar-row" key={label}>
              <div className="top"><span>{label}</span><span className="muted">{n(have)} of {n(of)}</span></div>
              <div className="track"><div className="fill" style={{ width: `${of ? (have / of) * 100 : 0}%`, display: have ? 'block' : 'none' }} /></div>
            </div>
          ))}
          {c.draft + c.archived > 0 && <p className="muted">{n(c.draft)} drafts and {n(c.archived)} archived are hidden from the site.</p>}
        </section>
      </div>

      <div className="grid12">
        {seeOrders && <section className="card span8">
          <div className="card-head">
            <h2>Latest orders</h2>
            <Link to="/orders" className="meta">View all{o.total ? ` (${n(o.total)})` : ''}</Link>
          </div>
          <Table
            rows={recent}
            onRow={(r) => nav(`/orders/${r.id}`)}
            empty="No orders yet. They appear here as customers check out."
            columns={[
              { label: 'Order', render: (r) => <><span className="mono">{r.number}</span><br /><span className="sub">{r.email}</span></> },
              { label: 'Placed', render: (r) => date(r.createdAt) },
              { label: 'Status', render: (r) => <Status value={r.status} /> },
              { label: 'Payment', render: (r) => <Status value={r.paymentStatus} /> },
              { label: 'Total', className: 'num', render: (r: Row) => money(r.totalMinor, r.currency) },
            ]}
          />
        </section>}

        <section className={`card ${seeOrders ? 'span4' : 'span12'}`}>
          <div className="card-head">
            <h2>Collections</h2>
            {can('catalogue') && <Link to="/categories" className="meta">Manage</Link>}
          </div>
          <div className="list-rows">
            {(stats.categories as Row[]).map((cat) => (
              <Link key={cat.id} to={can('catalogue') ? `/products?category=${cat.slug}` : '#'} onClick={(e) => { if (!can('catalogue')) e.preventDefault(); }}>
                <div className="photos">{cat.images.slice(0, 3).map((src: string) => <img key={src} src={src} alt="" />)}</div>
                <div className="grow"><span className="name" style={{ fontWeight: 500 }}>{cat.name}</span></div>
                <span className="muted">{n(cat.pieces)} {cat.pieces === 1 ? 'piece' : 'pieces'}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}
