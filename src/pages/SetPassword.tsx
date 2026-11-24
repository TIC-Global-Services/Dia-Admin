import { useState } from 'react';
import { API_URL } from '../api';
import { Mark } from '../icons';
import { PasswordInput } from '../PasswordInput';

/** Opened from the emailed link (new team member, or a forgotten password): /reset-password?token=… */
export default function SetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== again) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/auth/password/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(Array.isArray(body.message) ? body.message.join(' ') : (body.message ?? 'This link is no longer valid. Ask for a new one.'));
      }
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form onSubmit={submit}>
        <div className="brand"><Mark size={30} /><span><h1 style={{ fontSize: 18, lineHeight: '22px' }}>Choose a password</h1><small>Dia Diamonds back office</small></span></div>
        {!token ? (
          <p className="error">This link is incomplete. Open it again from your email.</p>
        ) : done ? (
          <>
            <p className="ok">Your password is set.</p>
            <a className="btn primary" style={{ height: 38, justifyContent: 'center' }} href="/">Go to sign in</a>
          </>
        ) : (
          <>
            <label className="field"><span>New password</span><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus autoComplete="new-password" /><small>At least 8 characters.</small></label>
            <label className="field"><span>Repeat password</span><PasswordInput value={again} onChange={(e) => setAgain(e.target.value)} required autoComplete="new-password" /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary" style={{ height: 38 }} disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
          </>
        )}
      </form>
    </div>
  );
}
