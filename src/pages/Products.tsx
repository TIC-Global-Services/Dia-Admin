import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, money, type Row } from '../api';
import { Crud } from '../Crud';
import type { Field } from '../Form';
import { Status, Thumb, useAction, useLoad } from '../ui';

const STATUSES = ['active', 'draft', 'archived'].map((v) => ({ value: v, label: v }));
const POSITIONS = ['left', 'right', 'top', 'bottom'].map((v) => ({ value: v, label: v }));

export default function Products() {
  const { data: categories } = useLoad(() => api.get<Row[]>('/categories'), []);
  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));
  // Same folder layout as the existing catalog images: product/<category>.
  const folderFor = (v: Row) => `product/${(categories ?? []).find((c) => c.id === v.categoryId)?.slug ?? 'misc'}`;

  const fields: Field[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'sku', label: 'SKU', type: 'text', required: true },
    {
      name: 'colors', label: 'Colours and photographs', type: 'pairs',
      uploadFolder: folderFor,
      columns: [{ name: 'color', label: 'Colour name' }, { name: 'image', label: 'Photograph', image: true }],
    },
    {
      name: 'layoutImages', label: 'Product page photographs', type: 'pairs',
      uploadFolder: folderFor,
      columns: [{ name: 'position', label: 'Where it sits', options: POSITIONS }, { name: 'image', label: 'Photograph', image: true }],
    },
    { name: 'categoryId', label: 'Collection', type: 'select', nullable: true, options: categoryOptions },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, help: 'Only active products show on the website.' },
    { name: 'price', label: 'Price (INR)', type: 'number', nullable: true, help: 'Fixed price. Ignored when net gold weight is filled: the price is then calculated from the gold rate. Empty = price on request.' },
    { name: 'metal', label: 'Metal', type: 'select', options: [{ value: 'gold', label: 'Gold' }, { value: 'silver', label: 'Silver' }, { value: 'platinum', label: 'Platinum' }], help: 'Picks the rate from Settings → Metal pricing.' },
    { name: 'netMetalWeight', label: 'Net metal weight (g)', type: 'number', nullable: true, help: 'Fill to price automatically: (weight × metal rate + making charge + diamond + stones) × 1.03. Empty = fixed price above.' },
    { name: 'makingChargePercent', label: 'Making charge (%)', type: 'number', help: 'Percent of the metal value.' },
    { name: 'diamondCarats', label: 'Diamond weight (carats)', type: 'number' },
    { name: 'diamondRatePerCarat', label: 'Diamond rate per carat (INR)', type: 'number' },
    { name: 'stoneCharges', label: 'Other stone charges (INR)', type: 'number', help: 'Flat amount for coloured or other stones.' },
    { name: 'compareAtPrice', label: 'Compare-at price', type: 'number', nullable: true },
    { name: 'diamondType', label: 'Diamond type', type: 'text', nullable: true, placeholder: 'e.g. round brilliant' },
    { name: 'slug', label: 'URL slug', type: 'text', help: 'Leave empty to make it from the name.' },
    { name: 'weightGrams', label: 'Weight (grams)', type: 'number' },
    { name: 'sortOrder', label: 'Position in listings', type: 'number' },
    { name: 'initialStock', label: 'Initial stock', type: 'number', createOnly: true },
    { name: 'isNewArrival', label: 'New arrival', type: 'checkbox' },
    { name: 'isRecommended', label: 'Recommended', type: 'checkbox' },
    { name: 'isNewCollection', label: 'New collection', type: 'checkbox' },
    { name: 'description', label: 'Description', type: 'textarea', nullable: true },
    { name: 'tags', label: 'Tags', type: 'lines', placeholder: 'Add a tag', help: 'Words shoppers might search for. Press Enter after each.' },
    { name: 'sizes', label: 'Sizes', type: 'lines', placeholder: 'Add a size', suggestions: ['XS', 'S', 'M', 'L', 'XL', ...Array.from({ length: 20 }, (_, i) => String(i + 6))].map((value) => ({ value })), help: 'Pick from the list or type your own.' },
  ];

  const [params] = useSearchParams();
  const category = params.get('category') ?? undefined;
  const priced = params.get('priced') ?? undefined;
  const { data: stats } = useLoad(() => api.get('/admin/stats/overview'), []);
  const c = stats?.catalogue;

  return (
    <Crud
      title="Pieces"
      noun="piece"
      path="/products"
      paged
      searchable
      canDelete
      media
      query={{ category, priced }}
      tabs={[
        { label: 'All', value: '', count: c?.total },
        { label: 'Active', value: 'active', count: c?.active },
        { label: 'Draft', value: 'draft', count: c?.draft },
        { label: 'Archived', value: 'archived', count: c?.archived },
      ]}
      sub={
        <>
          {category && <>Showing {category}. <Link to="/products">Show all</Link> </>}
          {priced === 'false' && <>Showing pieces without a price. <Link to="/products">Show all</Link> </>}
          {!category && priced !== 'false' && 'The catalogue the website shows. Pieces without a price are shown as price on request.'}
        </>
      }
      fields={fields}
      titleOf={(r) => r.name}
      columns={[
        { label: 'Piece', render: (r) => <div className="cell"><Thumb src={r.colors?.[0]?.image} /><div><div className="name">{r.name}</div><div className="sub">{r.category?.name ?? 'No collection'}{r.colors?.length ? ` · ${r.colors.length} ${r.colors.length === 1 ? 'colour' : 'colours'}` : ''}</div></div></div> },
        { label: 'SKU', render: (r) => <span className="mono">{r.sku}</span> },
        { label: 'Status', render: (r) => <Status value={r.status} /> },
        { label: 'Price', className: 'num', render: (r) => (r.price == null ? <span className="muted">–</span> : money(Math.round(r.price * 100))) },
        { label: 'In stock', className: 'num', render: (r) => (r.stock ? r.stock.onHand - r.stock.reserved : <span className="muted">–</span>) },
      ]}
      editExtra={(row, reload) => <StockPanel product={row} onChange={reload} />}
    />
  );
}

function StockPanel({ product, onChange }: { product: Row; onChange: () => void }) {
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const { run, busy } = useAction();
  const stock = product.stock ?? { onHand: 0, reserved: 0 };

  return (
    <div className="panel">
      <h3>Stock</h3>
      <p>
        On hand <b>{stock.onHand}</b> · reserved <b>{stock.reserved}</b> · available <b>{stock.onHand - stock.reserved}</b>
      </p>
      <div className="row">
        <input type="number" placeholder="+10 or -2" value={delta} onChange={(e) => setDelta(e.target.value)} />
        <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          disabled={busy || !Number(delta)}
          onClick={async () => {
            const d = Math.trunc(Number(delta));
            if (await run(() => api.post(`/stock/${product.id}/adjust`, { delta: d, reason: d > 0 ? 'restock' : 'adjustment', ...(note && { note }) }), 'Stock updated')) {
              setDelta('');
              setNote('');
              onChange();
            }
          }}
        >
          Adjust
        </button>
      </div>
    </div>
  );
}
