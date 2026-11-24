import { useState } from 'react';
import { api, date } from '../api';
import { useAuth } from '../auth';
import { PasswordInput } from '../PasswordInput';
import { Page, useAction, useLoad } from '../ui';

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const { run, busy } = useAction();
  const { data: perms } = useLoad(() => api.get<{ key: string; label: string }[]>('/roles/permissions'), []);
  const [name, setName] = useState<string>(user?.name ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [problem, setProblem] = useState('');
  const hasPassword = true; // staff always have one; accounts made by invite choose it first

  const all = (user?.permissions ?? []).includes('*');
  const labels = (perms ?? []).filter((p) => (user?.permissions ?? []).includes(p.key));

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem('');
    if (next.length < 8) return setProblem('Use at least 8 characters.');
    if (next !== again) return setProblem('The two new passwords do not match.');
    if (next === current) return setProblem('Choose a password you have not used here before.');
    const ok = await run(async () => {
      const res = await api.post<{ accessToken: string; refreshToken: string }>('/auth/password/change', { currentPassword: current, newPassword: next });
      // Changing the password signs out every other device; this one gets fresh tokens.
      localStorage.setItem('dia-admin-session', JSON.stringify({ accessToken: res.accessToken, refreshToken: res.refreshToken }));
    }, 'Password changed. Other devices have been signed out.');
    if (ok) { setCurrent(''); setNext(''); setAgain(''); }
  };

  return (
    <Page title="Your profile" sub="Your details and how you sign in.">
      <section className="section">
        <div><h2>Details</h2><p className="desc">Shown to the team next to the things you do.</p></div>
        <form className="box" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.patch('/users/me', { name: name.trim() }), 'Saved')) await refresh(); }}>
          <div className="who">
            <div className="avatar lg">{String(user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase()}</div>
            <div><b>{user?.name ?? 'No name yet'}</b><div className="muted">{user?.email}</div></div>
          </div>
          <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" /></label>
          <label className="field"><span>Email</span><input value={user?.email ?? ''} readOnly disabled /><small>To change your email, ask an Admin.</small></label>
          <div className="row end"><button className="primary" disabled={busy || !name.trim() || name.trim() === user?.name}>Save</button></div>
        </form>
      </section>

      <section className="section">
        <div><h2>Your access</h2><p className="desc">Set by your role. An Admin can change it.</p></div>
        <div className="box">
          <div><span className="muted">Role</span><div style={{ fontWeight: 500, marginTop: 2 }}>{user?.roleName ?? user?.role}</div></div>
          <div>
            <span className="muted">You can use</span>
            <div className="chips" style={{ marginTop: 6 }}>
              {all ? <span className="chip all">Everything</span> : labels.map((p) => <span className="chip" key={p.key}>{p.label}</span>)}
            </div>
          </div>
          <div className="muted">Last signed in {date(user?.lastLoginAt)}</div>
        </div>
      </section>

      <section className="section">
        <div><h2>Password</h2><p className="desc">Changing it signs you out everywhere else.</p></div>
        <form className="box" onSubmit={changePassword}>
          {hasPassword && <label className="field"><span>Current password</span><PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" /></label>}
          <label className="field"><span>New password</span><PasswordInput value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" /><small>At least 8 characters.</small></label>
          <label className="field"><span>Repeat new password</span><PasswordInput value={again} onChange={(e) => setAgain(e.target.value)} required autoComplete="new-password" /></label>
          {problem && <p className="error" role="alert">{problem}</p>}
          <div className="row end"><button className="primary" disabled={busy || !current || !next || !again}>Change password</button></div>
        </form>
      </section>

      <section className="section">
        <div><h2>Devices</h2><p className="desc">Lost a laptop, or signed in somewhere you should not have?</p></div>
        <div className="box">
          <p>Signs you out on every device, including this one.</p>
          <div className="row"><button className="danger" disabled={busy} onClick={async () => { if (confirm('Sign out everywhere?')) { await api.post('/auth/logout-all').catch(() => undefined); await logout(); } }}>Sign out everywhere</button></div>
        </div>
      </section>
    </Page>
  );
}
