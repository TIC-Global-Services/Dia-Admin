import { Link } from 'react-router-dom';
import { api, date, money, type Row } from '../api';
import { useAuth } from '../auth';
import { Crud } from '../Crud';
import type { Field } from '../Form';
import { Loading, Status, useLoad } from '../ui';

const addressLine = (a: Row) => [a.line1, a.line2, a.landmark, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(', ');

/** Everything on file for one shopper: sign-in details, addresses and recent orders. */
function Details({ id }: { id: string }) {
  const { data, error, loading } = useLoad(() => api.get(`/users/customers/${id}`), [id]);
  if (!data) return <Loading error={error} loading={loading} />;
  const c = data.customer as Row;
  const tick = (ok: boolean) => (ok ? 'verified' : 'not verified');
  return (
    <div style={{ marginTop: 16 }}>
      <h3>Details</h3>
      <dl className="sub" style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px' }}>
        <dt>Name</dt><dd>{c.name ?? '-'}</dd>
        <dt>Email</dt><dd>{c.email ? `${c.email} (${tick(c.emailVerified)})` : '-'}</dd>
        <dt>Mobile</dt><dd>{c.phone ? `${c.phone} (${tick(c.phoneVerified)})` : '-'}</dd>
        <dt>Sign-in</dt><dd>{(data.identities as Row[]).map((i) => i.provider).join(', ') || 'Email / mobile code'}</dd>
        <dt>Joined</dt><dd>{date(c.createdAt)}</dd>
        <dt>Last sign-in</dt><dd>{date(c.lastLoginAt)}</dd>
      </dl>
      <h3>Addresses</h3>
      {(data.addresses as Row[]).length === 0 ? <p className="sub">No saved addresses.</p> : (
        <ul>{(data.addresses as Row[]).map((a) => <li key={a.id}><b>{a.label ?? a.fullName}</b>{a.isDefault ? ' (default)' : ''}: {a.fullName}, {a.phone}, {addressLine(a)}</li>)}</ul>
      )}
      <h3>Recent orders</h3>
      {(data.orders as Row[]).length === 0 ? <p className="sub">No orders yet.</p> : (
        <ul>{(data.orders as Row[]).map((o) => <li key={o.id}><Link to={`/orders/${o.id}`}>{o.number}</Link> · {date(o.createdAt)} · {money(o.totalMinor, o.currency)} · {o.status} / {o.paymentStatus}</li>)}</ul>
      )}
    </div>
  );
}

export default function Customers() {
  const { can } = useAuth();
  const fields: Field[] = [
    { name: 'status', label: 'Account', type: 'select', options: [{ value: 'active', label: 'active' }, { value: 'suspended', label: 'suspended' }], help: 'A suspended customer is signed out and cannot sign in or order.' },
  ];
  return (
    <Crud
      title="Customers"
      noun="customer"
      path="/users/customers"
      paged
      searchable
      noCreate
      canDelete={can('people')}
      sub="People who have signed up to shop. Open one to see their details and orders. Deleting a customer erases their account data but keeps their orders."
      fields={fields}
      titleOf={(r) => r.name ?? r.email ?? r.phone ?? 'Customer'}
      save={(row, payload) => api.patch(`/users/customers/${row!.id}`, payload)}
      empty="No customers yet. They appear here when someone signs up on the website."
      columns={[
        { label: 'Customer', render: (r) => <><span className="name">{r.name ?? '-'}</span><br /><span className="sub">{r.email ?? r.phone ?? ''}</span></> },
        { label: 'Orders', className: 'num', render: (r) => r.orderCount },
        { label: 'Spent', className: 'num', render: (r) => (r.spentMinor ? money(r.spentMinor) : '–') },
        { label: 'Last order', render: (r) => date(r.lastOrderAt) },
        { label: 'Joined', render: (r) => date(r.createdAt) },
        { label: 'Account', render: (r) => <Status value={r.status} /> },
      ]}
      editExtra={(row) => (
        <><Details id={row.id} />
        <div className="row" style={{ marginTop: 16 }}>
          {row.orderCount > 0 && <Link className="btn" to={`/orders?q=${encodeURIComponent(row.email ?? '')}`}>View their {row.orderCount} {row.orderCount === 1 ? 'order' : 'orders'}</Link>}
        </div></>
      )}
    />
  );
}
