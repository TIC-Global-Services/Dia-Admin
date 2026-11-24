import { useState, type InputHTMLAttributes } from 'react';
import { Icon } from './icons';

/** A password field with an eye to show what you typed. Never autofills the old value into "new password" boxes. */
export function PasswordInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="pw">
      <input {...props} type={shown ? 'text' : 'password'} aria-label={label ?? props['aria-label']} />
      <button type="button" className="icon text" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown} tabIndex={0}>
        <Icon name={shown ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  );
}
