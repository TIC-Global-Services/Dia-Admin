import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, itemsOf, qs, type Row } from './api';
import { Form, type Field } from './Form';
import { Icon } from './icons';
import { Loading, Modal, Page, Pager, Table, Tabs, useAction, useLoad } from './ui';

interface Props {
  title: string;
  /** Singular noun for the "New …" button and dialog, e.g. "piece". */
  noun?: string;
  /** Base path of the resource, e.g. /categories. */
  path: string;
  columns: { label: string; render: (row: Row) => ReactNode; className?: string }[];
  fields: Field[];
  /** Resource is paginated (?page&size) and answers { items, total }. */
  paged?: boolean;
  searchable?: boolean;
  canDelete?: boolean;
  /** Extra query for the list, e.g. { category: 'rings' }. */
  query?: Record<string, string | undefined>;
  /** Underline tabs that set one query value (value '' = no filter). */
  tabs?: { label: string; value: string; count?: number }[];
  tabParam?: string;
  defaultTab?: string;
  /** Override how a row is saved (when the API wants something other than POST/PATCH on `path`). */
  save?: (row: Row | null, payload: Row) => Promise<unknown>;
  sub?: ReactNode;
  noCreate?: boolean;
  /** Rows carry a photograph. */
  media?: boolean;
  titleOf?: (row: Row) => string;
  /** Extra content under the form when editing an existing row. */
  editExtra?: (row: Row, reload: () => void) => ReactNode;
  empty?: string;
  /** Rendered under the table. */
  after?: ReactNode;
  /** Hide the form's delete-from-row and let the caller decide what can be deleted. */
  deletable?: (row: Row) => boolean;
}

const PAGE_SIZE = 20;
const idOf = (r: Row) => r.id ?? r.key;

export function Crud({ title, noun, path, columns, fields, paged, searchable, canDelete, query, tabs, tabParam = 'status', defaultTab = '', save, sub, noCreate, media, titleOf, editExtra, empty, deletable, after }: Props) {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [tab, setTab] = useState(params.get(tabParam) ?? defaultTab);
  const [editing, setEditing] = useState<Row | 'new' | null>(params.get('new') ? 'new' : null);
  const { run, busy } = useAction();
  const word = noun ?? title.toLowerCase();

  // Deep links (?q=, ?new=1) are consumed once, then dropped from the address.
  useEffect(() => {
    if (params.get('new') || params.get('q')) {
      const next = new URLSearchParams(params);
      next.delete('new'); next.delete('q');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, error, loading, reload } = useLoad(
    () => api.get(`${path}${qs({ ...(paged && { page, size: PAGE_SIZE }), q: searchable && q.trim().length >= 3 ? q.trim() : undefined, ...(tabs && { [tabParam]: tab }), ...query })}`),
    [path, page, q.trim().length >= 3 ? q.trim() : '', tab, JSON.stringify(query)],
  );
  const rows = itemsOf(data);
  const total = !Array.isArray(data) ? ((data as { total?: number } | null)?.total ?? rows.length) : rows.length;
  // After a reload, show the fresh copy of the row being edited.
  const current: Row | 'new' | null = editing === 'new' || editing === null ? editing : (rows.find((r) => idOf(r) === idOf(editing)) ?? editing);

  const submit = async (payload: Row) => {
    const row = current === 'new' ? null : current;
    const ok = await run(() => (save ? save(row, payload) : row ? api.patch(`${path}/${idOf(row)}`, payload) : api.post(path, payload)), 'Saved');
    if (ok) {
      setEditing(null);
      reload();
    }
  };

  const remove = async (row: Row) => {
    if (!confirm('Delete this? This cannot be undone.')) return;
    if (await run(() => api.del(`${path}/${idOf(row)}`), 'Deleted')) {
      setEditing(null);
      reload();
    }
  };

  return (
    <Page
      title={title}
      sub={sub}
      actions={!noCreate && <button className="primary" onClick={() => setEditing('new')}><Icon name="plus" />New {word}</button>}
    >
      {tabs && <Tabs tabs={tabs} value={tab} onChange={(v) => { setTab(v); setPage(1); }} />}
      {(searchable || paged) && (
        <div className="toolbar">
          {searchable && <input className="q" type="search" placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title.toLowerCase()}`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />}
          <span className="grow" />
          {paged && data && <span className="total">{total.toLocaleString('en-IN')} {total === 1 ? word : title.toLowerCase()}</span>}
        </div>
      )}
      <Loading error={error} loading={loading && !data} />
      {data && <Table media={media} columns={columns} rows={rows} onRow={setEditing} empty={empty} />}
      {paged && data && <Pager page={page} size={PAGE_SIZE} total={total} capped={(data as { capped?: boolean } | null)?.capped} onPage={setPage} />}
      {after}

      {current && (
        <Modal title={current === 'new' ? `New ${word}` : (titleOf?.(current) ?? 'Edit')} onClose={() => setEditing(null)}>
          <Form
            key={current === 'new' ? 'new' : idOf(current)}
            fields={fields}
            row={current === 'new' ? null : current}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
            busy={busy}
            extra={canDelete && current !== 'new' && (deletable?.(current) ?? true) ? <div className="row"><button type="button" className="danger" onClick={() => remove(current)}>Delete</button></div> : null}
          />
          {current !== 'new' && editExtra?.(current, reload)}
        </Modal>
      )}
    </Page>
  );
}
