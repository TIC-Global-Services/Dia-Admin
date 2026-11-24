import { useState } from 'react';
import { API_URL } from '../api';
import { useAuth } from '../auth';
import { Mark } from '../icons';
import { PasswordInput } from '../PasswordInput';

function Brand() {
  return (
    <div className="brand">
      <Mark size={30} />
      <span><h1 style={{ fontSize: 18, lineHeight: '22px' }}>Dia Diamonds</h1><small>Back office</small></span>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);

  if (forgot) {
    return (
      <div className="login">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const res = await fetch(`${API_URL}/auth/password/forgot`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
              if (!res.ok && res.status !== 202) throw new Error('Could not send the link. Try again in a minute.');
              setSent(true);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Brand />
          <p className="muted">{sent ? '' : 'Enter your email and we will send you a link to choose a new password.'}</p>
          {sent ? (
            <p className="ok">If that address belongs to a team member, a link is on its way. It works for one hour.</p>
          ) : (
            <label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" /></label>
          )}
          {error && <p className="error">{error}</p>}
          {!sent && <button className="primary" style={{ height: 38 }} disabled={busy}>{busy ? 'Sending…' : 'Send link'}</button>}
          <button type="button" className="link" onClick={() => { setForgot(false); setSent(false); setError(''); }}>Back to sign in</button>
        </form>
      </div>
    );
  }

  return (
    <div className="login">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await login(email, password);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Brand />
        <label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" /></label>
        <label className="field"><span>Password</span><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" style={{ height: 38 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" className="link" onClick={() => { setForgot(true); setError(''); }}>Forgot your password?</button>
      </form>
    </div>
  );
}
