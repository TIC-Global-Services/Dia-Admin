export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const KEY = 'dia-admin-session';
interface Session {
  accessToken: string;
  refreshToken: string;
}

export const session = {
  get(): Session | null {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? 'null');
    } catch {
      return null;
    }
  },
  set(s: Session | null) {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  },
};

/** The API reports validation problems as a string or a list of strings. */
function messageOf(body: unknown, fallback: string): string {
  const m = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(m)) return m.join('; ');
  return typeof m === 'string' ? m : fallback;
}

let refreshing: Promise<boolean> | null = null;

/** Trades the refresh token for a new pair. Several 401s at once share one refresh. */
function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const current = session.get();
    if (!current) return false;
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!res.ok) {
      session.set(null);
      return false;
    }
    const next = await res.json();
    session.set({ accessToken: next.accessToken, refreshToken: next.refreshToken });
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const token = session.get()?.accessToken;
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      // For FormData the browser sets the multipart boundary itself.
      ...(body !== undefined && !isForm && { 'content-type': 'application/json' }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && retry && token && (await refresh())) {
    return request<T>(method, path, body, false);
  }
  if (res.status === 401 && token) {
    session.set(null);
    window.dispatchEvent(new Event('dia-signed-out'));
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, messageOf(data, `Request failed (${res.status})`));
  return data as T;
}

export const api = {
  get: <T = Row>(path: string) => request<T>('GET', path),
  post: <T = Row>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T = Row>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T = Row>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: (path: string) => request<null>('DELETE', path),
  /** Uploads one image to Cloudflare R2 through the API and returns its public URL. */
  upload: async (file: File, folder: string, kind: 'image' | 'video' = 'image'): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const done = await request<{ url: string }>('POST', `/uploads${kind === 'video' ? '/video' : ''}${qs({ folder })}`, form);
    return done.url;
  },
};

/** Lists come back either as an array or as { items, total }. */
export function itemsOf(data: unknown): Row[] {
  return Array.isArray(data) ? data : ((data as { items?: Row[] } | null)?.items ?? []);
}

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const money = (minor: number | null | undefined, currency = 'INR') =>
  minor == null ? '-' : new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(minor / 100);

/** "14 Nov, 11:47" for this year, "14 Nov 2025, 11:47" for older dates. */
export const date = (iso: string | null | undefined) => {
  if (!iso) return '–';
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), hour: '2-digit', minute: '2-digit', hour12: false });
};

/** "today", "yesterday", "3 days ago". */
export const ago = (iso: string) => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};
