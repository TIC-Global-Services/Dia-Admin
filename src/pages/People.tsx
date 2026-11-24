import { api, date, type Row } from '../api';
import { Crud } from '../Crud';
import type { Field } from '../Form';
import { Status, useAction, useLoad } from '../ui';

export function People() {
  const { data: roles } = useLoad(() => api.get<Row[]>('/roles'), []);
  const { run, busy } = useAction();
  const byKey = new Map((roles ?? []).map((r) => [r.key as string, r]));

  const fields: Field[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'text', required: true, createOnly: true, placeholder: 'name@company.com' },
    {
      name: 'role', label: 'Role', type: 'select',
      // Least access first, so a hurried "Save" never hands out Admin by accident.
      options: [
        ...[...(roles ?? [])].sort((a, b) => Number(a.key === 'admin') - Number(b.key === 'admin') || a.permissions.length - b.permissions.length).map((r) => ({ value: r.key, label: r.name })),
      ],
      help: 'Decides which areas this person can open. Manage roles under Access.',
    },
    { name: 'password', label: 'Password', type: 'password', createOnly: true, help: 'Leave empty to email them a link to choose their own.' },
    { name: 'status', label: 'Status', type: 'select', editOnly: true, options: [{ value: 'active', label: 'active' }, { value: 'suspended', label: 'suspended' }], help: 'Suspended people are signed out immediately.' },
  ];

  return (
    <Crud
      title="People"
      noun="person"
      path="/users"
      paged
      searchable
      query={{ kind: 'staff' }}
      fields={fields}
      sub="The team: who can sign in to the back office, and what each person can do. Shoppers are under Customers."
      save={(row, payload) => (row ? api.patch(`/users/${row.id}`, payload) : api.post('/users/staff', payload))}
      titleOf={(r) => r.name ?? r.email ?? r.phone ?? 'Person'}
      columns={[
        { label: 'Name', render: (r) => <><span className="name">{r.name ?? '-'}</span><br /><span className="sub">{r.email ?? r.phone ?? ''}</span></> },
        { label: 'Role', render: (r) => <span className="chip">{byKey.get(r.role)?.name ?? r.role}</span> },
        { label: 'Status', render: (r) => <Status value={r.status} /> },
        { label: 'Last sign-in', render: (r) => date(r.lastLoginAt) },
        { label: 'Added', render: (r) => date(r.createdAt) },
      ]}
      editExtra={(row) =>
        row.email ? (
          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" disabled={busy} onClick={() => run(() => api.post(`/users/${row.id}/password-link`), `Link sent to ${row.email}`)}>
              Email a password link
            </button>
          </div>
        ) : null
      }
    />
  );
}
