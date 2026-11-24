import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, API_URL, session, type Row } from './api';

interface Auth {
  user: Row | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Does the signed-in person's role allow this area? */
  can: (permission: string) => boolean;
  /** Re-read the profile (after editing it). */
  refresh: () => Promise<void>;
}

const Ctx = createContext<Auth>(null as never);
export const useAuth = () => useContext(Ctx);

const hasAccess = (me: Row) => Array.isArray(me.permissions) && me.permissions.length > 0;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener('dia-signed-out', out);
    if (!session.get()) setLoading(false);
    else
      api
        .get('/users/me')
        .then((me) => setUser(hasAccess(me) ? me : null))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    return () => window.removeEventListener('dia-signed-out', out);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof body.message === 'string' ? body.message : 'Sign-in failed');
    session.set({ accessToken: body.accessToken, refreshToken: body.refreshToken });
    const me = await api.get('/users/me');
    if (!hasAccess(me)) {
      session.set(null);
      throw new Error('This account does not have access to the back office');
    }
    setUser(me);
  };

  const logout = async () => {
    const s = session.get();
    session.set(null);
    setUser(null);
    if (s) await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: s.refreshToken }),
    }).catch(() => undefined);
  };

  const can = useCallback((permission: string) => {
    const have: string[] = user?.permissions ?? [];
    return have.includes('*') || have.includes(permission);
  }, [user]);

  const refresh = useCallback(async () => {
    setUser(await api.get('/users/me'));
  }, []);

  return <Ctx.Provider value={{ user, loading, login, logout, can, refresh }}>{children}</Ctx.Provider>;
}
