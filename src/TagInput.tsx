import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from './icons';

export interface Suggestion { value: string; label?: string }

/**
 * A list of short values as removable chips. Type and press Enter or comma to add; paste a
 * list to add several; Backspace on an empty box removes the last. Suggestions appear as you type.
 */
export function TagInput({ value, onChange, suggestions = [], placeholder, normalize, validate, label }: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: Suggestion[];
  placeholder?: string;
  /** Tidy a value before it is added, e.g. upper-case a country code. */
  normalize?: (v: string) => string;
  /** Return a message to refuse a value. */
  validate?: (v: string) => string | null;
  label?: string;
}) {
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState('');
  const [focus, setFocus] = useState(false);
  const [hot, setHot] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const listId = useId();
  const names = new Map(suggestions.map((s) => [s.value, s.label ?? s.value]));

  const add = (raw: string[]) => {
    let next = value;
    for (const r of raw) {
      const v = (normalize ? normalize(r.trim()) : r.trim());
      if (!v || next.includes(v)) continue;
      const bad = validate?.(v);
      if (bad) { setProblem(bad); return; }
      next = [...next, v];
    }
    setProblem('');
    onChange(next);
    setDraft('');
  };

  const q = draft.trim().toLowerCase();
  const shown = suggestions
    .filter((s) => !value.includes(s.value) && (!q || (s.label ?? s.value).toLowerCase().includes(q) || s.value.toLowerCase().includes(q)))
    .slice(0, 8);
  const open = focus && shown.length > 0;

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (open && e.key === 'Enter' && draft.trim() && shown[hot]) return add([shown[hot].value]);
      if (draft.trim()) add([draft]);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    } else if (e.key === 'ArrowDown' && open) { e.preventDefault(); setHot((h) => Math.min(h + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp' && open) { e.preventDefault(); setHot((h) => Math.max(h - 1, 0)); }
  };

  return (
    <div className="tags-wrap">
      <div className={`tags${focus ? ' focus' : ''}`} onClick={() => ref.current?.focus()}>
        {value.map((v) => (
          <span className="tag" key={v}>
            {names.get(v) ?? v}
            <button type="button" aria-label={`Remove ${names.get(v) ?? v}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== v)); }}><Icon name="x" size={12} /></button>
          </span>
        ))}
        <input
          ref={ref}
          value={draft}
          aria-label={label}
          aria-controls={open ? listId : undefined}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => {
            const t = e.target.value;
            setHot(0);
            if (/[,\n]/.test(t)) add(t.split(/[,\n]/)); else setDraft(t);
          }}
          onKeyDown={onKey}
          onFocus={() => setFocus(true)}
          onBlur={() => { setFocus(false); if (draft.trim()) add([draft]); }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text');
            if (/[\n,]/.test(t)) { e.preventDefault(); add(t.split(/[,\n]/)); }
          }}
        />
      </div>
      {open && (
        <ul className="suggest" id={listId} role="listbox">
          {shown.map((s, i) => (
            <li key={s.value} role="option" aria-selected={i === hot} className={i === hot ? 'hot' : ''} onMouseDown={(e) => { e.preventDefault(); add([s.value]); }}>
              {s.label ?? s.value}
            </li>
          ))}
        </ul>
      )}
      {problem && <small className="error">{problem}</small>}
    </div>
  );
}
