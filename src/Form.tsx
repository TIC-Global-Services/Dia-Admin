import { useState, type ReactNode } from 'react';
import type { Row } from './api';
import { Icon } from './icons';
import { PasswordInput } from './PasswordInput';
import { TagInput, type Suggestion } from './TagInput';
import { UploadButton } from './Upload';

type Option = { value: string; label: string; help?: string };

export interface Field {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'lines' | 'datetime' | 'pairs' | 'password' | 'checks' | 'money';
  options?: Option[];
  /** Empty input is sent as null (clears the value). Otherwise empty means "not provided". */
  nullable?: boolean;
  required?: boolean;
  help?: string;
  placeholder?: string;
  /** Only when creating / only when editing. */
  createOnly?: boolean;
  editOnly?: boolean;
  /** For `pairs`: the columns of each row. */
  columns?: { name: string; label: string; options?: Option[]; image?: boolean }[];
  /** For `lines`: values offered as you type (value, optional display label). */
  suggestions?: Suggestion[];
  normalize?: (v: string) => string;
  validate?: (v: string) => string | null;
  /** Spans the full width of the form. */
  wide?: boolean;
  /** Text field holding an image URL: adds an Upload button (to Cloudflare R2) and a preview. */
  upload?: boolean | 'video';
  /** Hide the field unless this is true for the current values. */
  showIf?: (values: Values) => boolean;
  /** Bucket folder for uploads from this field, e.g. "product/rings". Can depend on the form values. */
  uploadFolder?: string | ((values: Values) => string);
}

type Values = Row;

const pad = (n: number) => String(n).padStart(2, '0');
const toLocal = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function initialValues(fields: Field[], row: Row | null): Values {
  const v: Values = {};
  for (const f of fields) {
    const raw = row?.[f.name];
    switch (f.type) {
      case 'checkbox': v[f.name] = raw ?? false; break;
      case 'lines': v[f.name] = Array.isArray(raw) ? [...raw] : []; break;
      case 'money': v[f.name] = raw == null ? '' : String(raw / 100); break;
      case 'pairs': v[f.name] = Array.isArray(raw) ? raw.map((r: Row) => ({ ...r })) : []; break;
      case 'datetime': v[f.name] = raw ? toLocal(raw) : ''; break;
      case 'password': v[f.name] = ''; break;
      case 'checks': v[f.name] = Array.isArray(raw) ? [...raw] : []; break;
      default: v[f.name] = raw ?? (f.type === 'select' && f.options?.[0] && !f.nullable ? f.options[0].value : '');
    }
  }
  return v;
}

/** Turns what the form holds into what the API accepts. */
export function toPayload(fields: Field[], values: Values, editing: boolean): Row {
  const out: Row = {};
  for (const f of fields) {
    if (editing ? f.createOnly : f.editOnly) continue;
    const v = values[f.name];
    const empty = (value: unknown, onNull: () => void) => {
      if (f.nullable) onNull();
    };
    switch (f.type) {
      case 'checkbox': out[f.name] = Boolean(v); break;
      case 'lines': out[f.name] = v as string[]; break;
      case 'money':
        if (v === '' || v == null) empty(v, () => (out[f.name] = null));
        else out[f.name] = Math.round(Number(v) * 100);
        break;
      case 'pairs': out[f.name] = (v as Row[]).filter((r) => Object.values(r).some((x) => String(x ?? '').trim())); break;
      case 'number':
        if (v === '' || v == null) empty(v, () => (out[f.name] = null));
        else out[f.name] = Number(v);
        break;
      case 'datetime':
        if (!v) empty(v, () => (out[f.name] = null));
        else out[f.name] = new Date(v).toISOString();
        break;
      case 'password':
        if (v) out[f.name] = v;
        break;
      case 'checks': out[f.name] = v; break;
      default:
        if (v === '' || v == null) empty(v, () => (out[f.name] = null));
        else out[f.name] = typeof v === 'string' ? v.trim() : v;
    }
  }
  return out;
}

function Input({ f, value, folder, onChange }: { f: Field; value: unknown; folder: string; onChange: (v: unknown) => void }) {
  switch (f.type) {
    case 'textarea':
      return <textarea rows={4} value={String(value ?? '')} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'lines':
      return <TagInput value={(value as string[]) ?? []} onChange={onChange} suggestions={f.suggestions} placeholder={f.placeholder ?? 'Type and press Enter'} normalize={f.normalize} validate={f.validate} label={f.label} />;
    case 'money':
      return <div className="money"><span aria-hidden>₹</span><input type="number" min="0" step="any" value={String(value ?? '')} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} /></div>;
    case 'checkbox':
      return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
    case 'select':
      return (
        <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {f.nullable && <option value="">- none -</option>}
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'checks': {
      const on = (value as string[]) ?? [];
      return (
        <div>
          {f.options?.map((o) => (
            <label className="perm" key={o.value}>
              <input type="checkbox" checked={on.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...on, o.value] : on.filter((x) => x !== o.value))} />
              <span><span className="t">{o.label}</span><br /><span className="d">{o.help}</span></span>
            </label>
          ))}
        </div>
      );
    }
    case 'pairs':
      return <Pairs f={f} rows={(value as Row[]) ?? []} folder={folder} onChange={onChange} />;
    default:
      if (f.upload) {
        return (
          <div className="single-image">
            <div className="img">
              {value && f.upload === 'video' ? <video src={String(value)} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : value ? <img src={String(value)} alt="" /> : <Icon name="banners" size={24} />}
            </div>
            <div className="row">
              <UploadButton folder={folder} kind={f.upload === 'video' ? 'video' : 'image'} label={value ? 'Replace' : f.upload === 'video' ? 'Upload video' : 'Upload image'} onUploaded={([url]) => onChange(url)} />
              {value ? <button type="button" className="text" onClick={() => onChange('')}>Remove</button> : null}
            </div>
          </div>
        );
      }
      if (f.type === 'password') {
        return <PasswordInput value={String(value ?? '')} placeholder={f.placeholder} autoComplete="new-password" onChange={(e) => onChange(e.target.value)} />;
      }
      return (
        <input
          type={f.type === 'number' ? 'number' : f.type === 'datetime' ? 'datetime-local' : f.type}
          step={f.type === 'number' ? 'any' : undefined}
          value={String(value ?? '')}
          placeholder={f.placeholder}
          required={f.required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/** Variants as photographs: each has its picture, one short field (colour or position) and Replace / Remove. No addresses are shown. */
function Pairs({ f, rows, folder, onChange }: { f: Field; rows: Row[]; folder: string; onChange: (v: unknown) => void }) {
  const cols = f.columns ?? [];
  const imageCol = cols.find((c) => c.image);
  const labelCol = cols.find((c) => !c.image);
  const set = (i: number, key: string, val: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  const blank = Object.fromEntries(cols.map((c) => [c.name, '']));

  return (
    <div className="tiles">
      {rows.map((r, i) => (
        <div className="tile" key={i}>
          <div className="img">{imageCol && r[imageCol.name] ? <img src={r[imageCol.name]} alt="" /> : <Icon name="products" size={24} />}</div>
          {labelCol &&
            (labelCol.options ? (
              <select aria-label={labelCol.label} value={r[labelCol.name] ?? ''} onChange={(e) => set(i, labelCol.name, e.target.value)}>
                <option value="">{labelCol.label}</option>
                {labelCol.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input aria-label={labelCol.label} placeholder={labelCol.label} value={r[labelCol.name] ?? ''} onChange={(e) => set(i, labelCol.name, e.target.value)} />
            ))}
          <div className="acts">
            {imageCol && <UploadButton folder={folder} label="Replace" quiet onUploaded={([url]) => set(i, imageCol.name, url)} />}
            <button type="button" className="text" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <div className="tile add">
        {imageCol ? (
          <UploadButton
            folder={folder}
            multiple
            tile
            label="Upload photos"
            onUploaded={(urls) => onChange([...rows, ...urls.map((url) => ({ ...blank, [imageCol.name]: url }))])}
          />
        ) : (
          <button type="button" onClick={() => onChange([...rows, blank])}>Add</button>
        )}
      </div>
    </div>
  );
}

export function Form({ fields, row, onSubmit, onCancel, extra, busy }: {
  fields: Field[];
  row: Row | null;
  onSubmit: (payload: Row) => void;
  onCancel?: () => void;
  extra?: ReactNode;
  busy?: boolean;
}) {
  const editing = row !== null;
  const [values, setValues] = useState<Values>(() => initialValues(fields, row));
  const visible = fields.filter((f) => (editing ? !f.createOnly : !f.editOnly) && (!f.showIf || f.showIf(values)));

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(toPayload(fields, values, editing));
      }}
    >
      <div className="grid">
        {visible.map((f) => (
          <label key={f.name} className={`field ${f.wide || ['textarea', 'lines', 'pairs'].includes(f.type) ? 'wide' : ''} ${f.type === 'checkbox' ? 'check' : ''}`}>
            <span>{f.label}{f.required && ' *'}</span>
            <Input
              f={f}
              value={values[f.name]}
              folder={(typeof f.uploadFolder === 'function' ? f.uploadFolder(values) : f.uploadFolder) ?? 'misc'}
              onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
            />
            {f.help && <small className="muted">{f.help}</small>}
          </label>
        ))}
      </div>
      {extra}
      <div className="row end">
        {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
        <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
