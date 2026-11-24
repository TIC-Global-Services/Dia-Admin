import { api, type Row } from '../api';
import { Crud } from '../Crud';
import type { Field } from '../Form';
import { useLoad } from '../ui';

export function Access() {
  const { data: perms } = useLoad(() => api.get<Row[]>('/roles/permissions'), []);
  const label = new Map((perms ?? []).map((p) => [p.key as string, p.label as string]));

  const fields: Field[] = [
    { name: 'name', label: 'Role name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text', nullable: true, placeholder: 'What this role is for' },
    { name: 'permissions', label: 'Can use', type: 'checks', wide: true, options: (perms ?? []).map((p) => ({ value: p.key, label: p.label, help: p.description })) },
  ];

  return (
    <Crud
      title="Access"
      noun="role"
      path="/roles"
      canDelete
      deletable={(r) => !r.builtIn}
      fields={fields}
      sub="Roles decide what each person on the team can open. Changes apply within seconds."
      titleOf={(r) => r.name}
      save={(row, payload) => {
        if (row?.key === 'admin') return Promise.reject(new Error('The Admin role cannot be changed'));
        return row ? api.patch(`/roles/${row.key}`, payload) : api.post('/roles', payload);
      }}
      columns={[
        { label: 'Role', render: (r) => <><span className="name">{r.name}</span>{r.builtIn && <span className="muted"> · built in</span>}<br /><span className="sub">{r.description ?? ''}</span></> },
        {
          label: 'Can use',
          render: (r) => (
            <div className="chips">
              {r.permissions.includes('*') ? <span className="chip all">Everything</span> : r.permissions.map((p: string) => <span className="chip" key={p}>{label.get(p) ?? p}</span>)}
            </div>
          ),
        },
        { label: 'People', className: 'num', render: (r) => r.people },
      ]}
    />
  );
}
