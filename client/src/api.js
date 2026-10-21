const API = '/api';
let accessToken = null;
export function setToken(t) { accessToken = t; }
export function getToken() { return accessToken; }

async function call(path, { method = 'GET', body, raw } = {}) {
  const headers = {};
  if (!raw) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${API}${path}`, {
    method, headers, credentials: 'include',
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) return call(path, { method, body, raw });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
}

async function tryRefresh() {
  try {
    const r = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!r.ok) return false;
    const data = await r.json();
    setToken(data.access);
    return true;
  } catch { return false; }
}

export const api = {
  get: (p) => call(p),
  post: (p, body) => call(p, { method: 'POST', body }),
  put: (p, body) => call(p, { method: 'PUT', body }),
  patch: (p, body) => call(p, { method: 'PATCH', body }),
  postRaw: (p, body) => call(p, { method: 'POST', body, raw: true }),
  delete: (path) => call(path, { method: 'DELETE' }),
  invoice: async (id) => {
    const res = await fetch(`${API}/invoices/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  },
};
export { tryRefresh };