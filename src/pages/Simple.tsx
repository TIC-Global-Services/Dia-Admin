import { useState } from 'react';
import { api, date, money, type Row } from '../api';
import { Crud } from '../Crud';
import type { Field } from '../Form';
import { INDIAN_STATES } from '../india';
import { Status, Thumb, useAction, useLoad } from '../ui';

const opts = (...values: string[]) => values.map((v) => ({ value: v, label: v.replace(/_/g, ' ') }));

export function Categories() {
  const fields: Field[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'slug', label: 'URL slug', type: 'text', help: 'Used in website links, e.g. "rings". Empty = made from the name.' },
    { name: 'description', label: 'Description', type: 'textarea', nullable: true },
    { name: 'imageUrl', label: 'Cover photograph', type: 'text', nullable: true, upload: true, uploadFolder: 'category' },
    { name: 'sortOrder', label: 'Position', type: 'number' },
    { name: 'isActive', label: 'Active', type: 'checkbox' },
  ];
  return (
    <Crud
      title="Collections"
      noun="collection"
      path="/categories"
      canDelete
      fields={fields}
      titleOf={(r) => r.name}
      columns={[
        { label: 'Collection', render: (r) => <span className="name">{r.name}</span> },
        { label: 'Web address', render: (r) => <span className="mono">/collections/{r.slug}</span> },
        { label: 'Position', className: 'num', render: (r) => r.sortOrder },
        { label: 'Shown', render: (r) => <Status value={r.isActive} /> },
      ]}
    />
  );
}

export function Offers() {
  const { data: cats } = useLoad(() => api.get<Row[]>('/categories'), []);
  const fields: Field[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'code', label: 'Coupon code', type: 'text', nullable: true, help: 'Customers type this. Empty = automatic offer only.' },
    { name: 'autoApply', label: 'Apply automatically', type: 'checkbox' },
    { name: 'type', label: 'Type', type: 'select', options: opts('percentage', 'fixed', 'free_shipping') },
    { name: 'value', label: 'Value', type: 'number', help: 'Percent for a percentage offer; rupees × 100 for a fixed one (₹100 = 10000); ignored for free shipping.' },
    { name: 'maxDiscountMinor', label: 'Max discount', type: 'money', nullable: true, help: 'Cap for percentage offers. Empty = no cap.' },
    { name: 'minSubtotalMinor', label: 'Minimum spend', type: 'money' },
    { name: 'scope', label: 'Applies to', type: 'select', options: opts('all', 'categories', 'products') },
    { name: 'targetIds', label: 'Collections or pieces it applies to', type: 'lines', suggestions: (cats ?? []).map((c) => ({ value: c.id, label: c.name })), placeholder: 'Pick collections', help: 'Only used when "Applies to" is collections or pieces. Pieces: paste their ids.' },
    { name: 'startsAt', label: 'Starts', type: 'datetime', nullable: true },
    { name: 'endsAt', label: 'Ends', type: 'datetime', nullable: true },
    { name: 'usageLimit', label: 'Total uses allowed', type: 'number', nullable: true },
    { name: 'perCustomerLimit', label: 'Uses per customer', type: 'number', nullable: true },
    { name: 'firstOrderOnly', label: 'First order only', type: 'checkbox' },
    { name: 'priority', label: 'Priority', type: 'number' },
    { name: 'isActive', label: 'Active', type: 'checkbox' },
    { name: 'description', label: 'Description', type: 'textarea', nullable: true },
  ];
  return (
    <Crud
      title="Offers"
      noun="offer"
      path="/offers"
      paged
      canDelete
      fields={fields}
      titleOf={(r) => r.name}
      sub="One offer applies per order: the coupon the customer enters, otherwise the best automatic one."
      columns={[
        { label: 'Offer', render: (r) => <span className="name">{r.name}</span> },
        { label: 'Code', render: (r) => (r.code ? <span className="mono">{r.code}</span> : <span className="muted">Automatic</span>) },
        { label: 'Discount', render: (r) => (r.type === 'percentage' ? `${r.value}%` : r.type === 'fixed' ? money(r.value) : 'free shipping') },
        { label: 'Used', className: 'num', render: (r) => `${r.usedCount}${r.usageLimit ? ` / ${r.usageLimit}` : ''}` },
        { label: 'Ends', render: (r) => (r.endsAt ? date(r.endsAt) : <span className="muted">–</span>) },
        { label: 'Live', render: (r) => <Status value={r.isActive} /> },
      ]}
    />
  );
}

export function Pages() {
  const fields: Field[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'URL slug', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'select', options: opts('draft', 'published') },
    { name: 'seoTitle', label: 'SEO title', type: 'text', nullable: true },
    { name: 'seoDescription', label: 'SEO description', type: 'text', nullable: true },
    { name: 'content', label: 'Content', type: 'textarea' },
  ];
  return (
    <Crud
      title="Pages"
      noun="page"
      path="/cms/pages"
      paged
      canDelete
      fields={fields}
      titleOf={(r) => r.title}
      columns={[
        { label: 'Title', render: (r) => r.title },
        { label: 'Slug', render: (r) => r.slug },
        { label: 'Status', render: (r) => <Status value={r.status} /> },
        { label: 'Updated', render: (r) => date(r.updatedAt) },
      ]}
    />
  );
}

export function Banners() {
  const fields: Field[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'subtitle', label: 'Subtitle', type: 'text', nullable: true },
    { name: 'mediaType', label: 'Shows', type: 'select', options: [{ value: 'image', label: 'A picture' }, { value: 'video', label: 'A video' }] },
    { name: 'imageUrl', label: 'Banner photograph', type: 'text', required: true, upload: true, uploadFolder: 'banner', help: 'For a video, this is the still shown while it loads and on slow connections.' },
    { name: 'videoUrl', label: 'Banner video', type: 'text', nullable: true, upload: 'video', uploadFolder: 'banner/video', showIf: (v) => v.mediaType === 'video', help: 'MP4 or WebM, up to 80 MB. Plays muted on a loop. Keep it short (10–20 s) so it loads quickly.' },
    { name: 'buttonLabel', label: 'Button text', type: 'text', nullable: true, placeholder: 'Discover more', help: 'Leave empty for no button.' },
    { name: 'linkUrl', label: 'Button goes to', type: 'text', nullable: true, placeholder: '/collections/rings' },
    { name: 'placement', label: 'Placement', type: 'select', options: [{ value: 'home-hero', label: 'Home page, top banner' }, { value: 'category-top', label: 'Collection pages, top' }], help: 'Several banners in one placement play as a slideshow, in Position order.' },
    { name: 'sortOrder', label: 'Position', type: 'number', help: 'Lowest first.' },
    { name: 'startsAt', label: 'Starts', type: 'datetime', nullable: true },
    { name: 'endsAt', label: 'Ends', type: 'datetime', nullable: true },
    { name: 'isActive', label: 'Active', type: 'checkbox' },
  ];
  return (
    <Crud
      title="Banners"
      noun="banner"
      media
      path="/cms/banners"
      canDelete
      fields={fields}
      titleOf={(r) => r.title}
      columns={[
        { label: 'Type', render: (r) => (r.mediaType === 'video' ? 'Video' : 'Picture') },
        { label: 'Banner', render: (r) => <div className="cell"><Thumb src={r.imageUrl} /><div><div className="name">{r.title}</div><div className="sub">{r.subtitle ?? ''}</div></div></div> },
        { label: 'Placement', render: (r) => <span className="mono">{r.placement}</span> },
        { label: 'Live', render: (r) => <Status value={r.isActive} /> },
      ]}
    />
  );
}

// ---------- shipping: zones, each with its rates
export function Shipping() {
  const fields: Field[] = [
    { name: 'name', label: 'Zone name', type: 'text', required: true },
    { name: 'countries', label: 'Countries', type: 'lines', placeholder: 'IN', suggestions: [{ value: 'IN', label: 'India (IN)' }, { value: '*', label: 'Anywhere (*)' }], normalize: (v) => v.toUpperCase(), validate: (v) => (/^([A-Z]{2}|\*)$/.test(v) ? null : 'Use a two-letter country code such as IN, or * for anywhere'), help: 'Two-letter codes. * means anywhere.' },
    { name: 'states', label: 'States', type: 'lines', placeholder: 'Pick states', suggestions: INDIAN_STATES.map((v) => ({ value: v })), help: 'Leave empty to cover the whole country.' },
    { name: 'postalPrefixes', label: 'PIN code prefixes', type: 'lines', placeholder: 'e.g. 600', validate: (v) => (/^\d{1,6}$/.test(v) ? null : 'Digits only, e.g. 600 for Chennai'), help: 'Leave empty to cover any PIN code. 600 matches every PIN starting 600.' },
    { name: 'priority', label: 'Priority', type: 'number', help: 'Higher wins when several zones match: put narrow zones above broad ones.' },
    { name: 'isActive', label: 'Active', type: 'checkbox' },
  ];
  return (
    <Crud
      title="Shipping"
      after={<DeliveryCheck />}
      noun="zone"
      path="/shipping/zones"
      canDelete
      sub="Where you deliver and what it costs. The highest-priority matching zone prices an order."
      fields={fields}
      titleOf={(r) => r.name}
      columns={[
        { label: 'Zone', render: (r) => r.name },
        { label: 'Countries', render: (r) => r.countries.join(', ') },
        { label: 'States', render: (r) => (r.states.length ? r.states.join(', ') : 'all') },
        { label: 'Priority', className: 'num', render: (r) => r.priority },
        { label: 'Rates', className: 'num', render: (r) => r.rates?.length ?? 0 },
        { label: 'Active', render: (r) => <Status value={r.isActive} /> },
      ]}
      editExtra={(zone, reload) => <Rates zone={zone} onChange={reload} />}
    />
  );
}

const rupees = (minor: number | null | undefined) => (minor == null ? '' : String(minor / 100));
const toMinor = (v: string) => Math.round(Number(v) * 100);

function Rates({ zone, onChange }: { zone: Row; onChange: () => void }) {
  const blank = { code: '', name: '', base: '', perKg: '', freeOver: '', minDays: '3', maxDays: '7' };
  const [f, setF] = useState(blank);
  const { run, busy } = useAction();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const rates: Row[] = zone.rates ?? [];

  return (
    <section className="section-block">
      <h3>Delivery options in this zone</h3>
      <p className="muted" style={{ margin: '4px 0 12px' }}>Price = base + per-kg charge for each kg beyond the first. A base of 0 is free delivery. Amounts are in rupees.</p>
      {rates.length > 0 && (
        <table>
          <thead><tr><th>Option</th><th className="num">Base</th><th className="num">Per extra kg</th><th className="num">Free over</th><th>Days</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id}>
                <td><b>{r.name}</b><br /><span className="sub mono">{r.code}</span></td>
                <td className="num">{r.baseMinor === 0 ? 'Free' : money(r.baseMinor)}</td>
                <td className="num">{money(r.perKgMinor)}</td>
                <td className="num">{r.freeOverMinor == null ? '–' : money(r.freeOverMinor)}</td>
                <td>{r.minDays}–{r.maxDays}</td>
                <td><Status value={r.isActive} /></td>
                <td className="row end">
                  <button type="button" disabled={busy} onClick={async () => (await run(() => api.patch(`/shipping/rates/${r.id}`, { isActive: !r.isActive }), r.isActive ? 'Paused' : 'Resumed')) && onChange()}>{r.isActive ? 'Pause' : 'Resume'}</button>
                  <button type="button" className="danger" disabled={busy} onClick={async () => confirm(`Delete "${r.name}"?`) && (await run(() => api.del(`/shipping/rates/${r.id}`), 'Deleted')) && onChange()}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form
        className="rate-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const body = {
            code: f.code.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-'), name: f.name.trim(), baseMinor: toMinor(f.base || '0'),
            perKgMinor: toMinor(f.perKg || '0'), minDays: Number(f.minDays), maxDays: Number(f.maxDays),
            ...(f.freeOver && { freeOverMinor: toMinor(f.freeOver) }),
          };
          if (await run(() => api.post(`/shipping/zones/${zone.id}/rates`, body), 'Option added')) { setF(blank); onChange(); }
        }}
      >
        <label className="field"><span>Name</span><input placeholder="Insured delivery" value={f.name} onChange={set('name')} required /></label>
        <label className="field"><span>Code</span><input placeholder="standard" value={f.code} onChange={set('code')} required /></label>
        <label className="field"><span>Base ₹</span><input type="number" min="0" step="any" placeholder="0 = free" value={f.base} onChange={set('base')} required /></label>
        <label className="field"><span>Per extra kg ₹</span><input type="number" min="0" step="any" value={f.perKg} onChange={set('perKg')} /></label>
        <label className="field"><span>Free over ₹</span><input type="number" min="0" step="any" value={f.freeOver} onChange={set('freeOver')} /></label>
        <label className="field"><span>Days</span><span className="row"><input type="number" min="0" value={f.minDays} onChange={set('minDays')} aria-label="Minimum days" /><input type="number" min="0" value={f.maxDays} onChange={set('maxDays')} aria-label="Maximum days" /></span></label>
        <button className="primary" disabled={busy}>Add option</button>
      </form>
    </section>
  );
}

/** Try an address and basket to see exactly what a customer would be offered. */
export function DeliveryCheck() {
  const [f, setF] = useState({ state: 'Tamil Nadu', postalCode: '600001', weight: '0.5', subtotal: '50000' });
  const [res, setRes] = useState<{ zone: string | null; options: Row[] } | null>(null);
  const { run, busy } = useAction();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <section className="card" style={{ marginTop: 24 }}>
      <div className="card-head"><h2>Check a delivery</h2><span className="meta">See what a customer would be offered</span></div>
      <form className="rate-form" onSubmit={async (e) => {
        e.preventDefault();
        await run(async () => setRes(await api.post('/shipping/estimate', { state: f.state, postalCode: f.postalCode, weightGrams: Math.round(Number(f.weight) * 1000), subtotalMinor: toMinor(f.subtotal) })));
      }}>
        <label className="field"><span>State</span><input value={f.state} onChange={set('state')} required /></label>
        <label className="field"><span>PIN code</span><input value={f.postalCode} onChange={set('postalCode')} required inputMode="numeric" /></label>
        <label className="field"><span>Weight (kg)</span><input type="number" min="0" step="any" value={f.weight} onChange={set('weight')} /></label>
        <label className="field"><span>Order value ₹</span><input type="number" min="0" step="any" value={f.subtotal} onChange={set('subtotal')} /></label>
        <button disabled={busy}>Check</button>
      </form>
      {res && (res.zone === null
        ? <p className="error">No zone covers this address, so checkout would refuse it.</p>
        : <>
            <p className="muted" style={{ margin: '12px 0 4px' }}>Zone: <b>{res.zone}</b></p>
            {res.options.length === 0 ? <p className="error">The zone has no active option for this weight.</p>
              : <ul className="plain">{res.options.map((o) => <li key={o.rateId}><b>{o.name}</b> · {o.priceMinor === 0 ? 'Free' : money(o.priceMinor)} · {o.minDays}–{o.maxDays} days</li>)}</ul>}
          </>)}
    </section>
  );
}
