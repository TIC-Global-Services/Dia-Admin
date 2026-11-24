import { useEffect, useState } from 'react';
import { API_URL, api, type Row } from '../api';
import { PasswordInput } from '../PasswordInput';
import { TagInput } from '../TagInput';
import { Loading, Page, Tabs, useAction, useLoad } from '../ui';

type Values = Record<string, unknown>;

const configured = (fields: Row[]) => fields.some((f) => (f.type === 'secret' ? f.isSet : f.value !== null && f.value !== '' && !(Array.isArray(f.value) && !f.value.length)) && f.type !== 'bool' && f.type !== 'number');

export default function Settings() {
  const { data, error, loading, reload } = useLoad(() => api.get<Row[]>('/settings'), []);
  const [tab, setTab] = useState('');
  const groups = data ?? [];
  const group = groups.find((g) => g.id === tab) ?? groups[0];

  return (
    <Page title="Settings" sub="Connect payments, email and SMS. Changes apply within seconds; no restart needed.">
      <Loading error={error} loading={loading && !data} />
      {group && (
        <>
          <Tabs tabs={groups.map((g) => ({ label: g.title, value: g.id }))} value={group.id} onChange={setTab} />
          <GroupForm key={group.id} group={group} onSaved={reload} />
        </>
      )}
    </Page>
  );
}

function GroupForm({ group, onSaved }: { group: Row; onSaved: () => void }) {
  const [edits, setEdits] = useState<Values>({});
  const [clear, setClear] = useState<Set<string>>(new Set());
  const { run, busy } = useAction();
  const dirty = Object.keys(edits).length > 0 || clear.size > 0;

  useEffect(() => { setEdits({}); setClear(new Set()); }, [group.id]);

  const save = async () => {
    const body: Values = { ...edits };
    for (const k of clear) body[k] = null;
    if (await run(() => api.patch(`/settings/${group.id}`, body), 'Saved')) {
      setEdits({}); setClear(new Set());
      onSaved();
    }
  };

  return (
    <>
      <p className="muted" style={{ marginBottom: 8 }}>{group.description}</p>
      {(group.sections as Row[]).map((s) => (
        <section className="section" key={s.id}>
          <div>
            <h2>{s.title}{s.fields.length > 0 && s.fields.some((f: Row) => f.type === 'secret' || f.type === 'tags' || f.type === 'text') && (
              <span className={`pill ${configured(s.fields) ? 'ok' : ''}`} style={{ marginLeft: 8 }}>{configured(s.fields) ? 'Connected' : 'Not set up'}</span>
            )}</h2>
            {s.description && <p className="desc">{s.description}</p>}
            {s.webhookPath && <Webhook path={s.webhookPath} />}
          </div>
          <div className="box">
            {(s.fields as Row[]).map((f) => (
              <Field key={f.key} f={f} edit={edits[f.key]} cleared={clear.has(f.key)}
                onChange={(v) => setEdits((e) => ({ ...e, [f.key]: v }))}
                onClear={() => { setClear((c) => new Set(c).add(f.key)); setEdits((e) => { const n = { ...e }; delete n[f.key]; return n; }); }}
                onUndoClear={() => setClear((c) => { const n = new Set(c); n.delete(f.key); return n; })} />
            ))}
          </div>
        </section>
      ))}
      {group.id === 'email' && <TestSend kind="email" disabled={dirty} />}
      {group.id === 'sms' && <TestSend kind="sms" disabled={dirty} />}
      <div className="savebar">
        <span className="muted">{dirty ? 'You have unsaved changes.' : 'Everything is saved.'}</span>
        <button className="primary" disabled={!dirty || busy} onClick={save}>Save changes</button>
      </div>
    </>
  );
}

function Field({ f, edit, cleared, onChange, onClear, onUndoClear }: { f: Row; edit: unknown; cleared: boolean; onChange: (v: unknown) => void; onClear: () => void; onUndoClear: () => void }) {
  const note = f.source === 'environment' ? <small className="muted">Currently set on the server itself. Saving a value here overrides it.</small> : null;
  const help = f.help ? <small className="muted">{f.help}</small> : null;

  if (f.type === 'bool') {
    const on = (edit ?? f.value ?? false) as boolean;
    return (
      <label className="switch-row">
        <span><b>{f.label}</b>{help && <><br />{help}</>}</span>
        <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
      </label>
    );
  }
  if (f.type === 'secret') {
    const replacing = edit !== undefined;
    return (
      <div className="field">
        <span>{f.label}</span>
        {f.isSet && !replacing && !cleared ? (
          <div className="saved-secret">
            <span className="mono">••••••••{f.hint}</span>
            <span className="row"><button type="button" onClick={() => onChange('')}>Replace</button>{f.source === 'admin' && <button type="button" className="text" onClick={onClear}>Remove</button>}</span>
          </div>
        ) : cleared ? (
          <div className="saved-secret"><span className="muted">Will be removed when you save</span><button type="button" className="text" onClick={onUndoClear}>Undo</button></div>
        ) : (
          <PasswordInput value={String(edit ?? '')} placeholder={f.placeholder ?? 'Paste it here'} autoComplete="off" onChange={(e) => onChange(e.target.value)} label={f.label} />
        )}
        {help}{note}
      </div>
    );
  }
  if (f.type === 'tags') {
    return <div className="field"><span>{f.label}</span><TagInput value={(edit ?? f.value ?? []) as string[]} onChange={onChange} placeholder="Paste an ID and press Enter" label={f.label} />{help}{note}</div>;
  }
  return (
    <label className="field">
      <span>{f.label}</span>
      <input type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? 0 : undefined} value={String(edit ?? f.value ?? '')} placeholder={f.placeholder} autoComplete="off"
        onChange={(e) => onChange(f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />
      {help}{note}
    </label>
  );
}

function Webhook({ path }: { path: string }) {
  const url = `${API_URL}${path}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="webhook">
      <small className="muted">Webhook address to give the provider</small>
      <div className="row"><code className="mono">{url}</code>
        <button type="button" onClick={() => { void navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied' : 'Copy'}</button></div>
    </div>
  );
}

function TestSend({ kind, disabled }: { kind: 'email' | 'sms'; disabled: boolean }) {
  const [to, setTo] = useState('');
  const [result, setResult] = useState('');
  const { run, busy } = useAction();
  return (
    <section className="section">
      <div><h2>Send a test</h2><p className="desc">Save first, then check it really arrives.</p></div>
      <form className="box" onSubmit={async (e) => {
        e.preventDefault(); setResult('');
        await run(async () => {
          const r = await api.post<{ live: boolean }>(`/settings/${kind}/test`, { to });
          setResult(r.live ? 'Sent. Check the inbox.' : 'Nothing is connected yet, so the message was only written to the server log.');
        });
      }}>
        <label className="field"><span>{kind === 'email' ? 'Send to' : 'Phone number'}</span>
          <input type={kind === 'email' ? 'email' : 'tel'} value={to} onChange={(e) => setTo(e.target.value)} required placeholder={kind === 'email' ? 'you@yourdomain.com' : '+919876543210'} /></label>
        <div className="row"><button disabled={busy || disabled || !to}>Send test</button>{disabled && <span className="muted">Save your changes first.</span>}</div>
        {result && <p className="muted" role="status">{result}</p>}
      </form>
    </section>
  );
}
