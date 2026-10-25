import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, tryRefresh } from '../api';

const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await tryRefresh();
      if (ok) {
        try { const { user } = await api.get('/auth/me'); setUser(user); } catch {}
      }
      setReady(true);
    })();
  }, []);

  async function login(email, password) {
    const { access, user } = await api.post('/auth/login', { email, password });
    setToken(access); setUser(user);
    return user;
  }
  async function register(payload) {
    await api.post('/auth/register', payload);
    await login(payload.email, payload.password);
  }
  async function logout() {
    await api.post('/auth/logout');
    setToken(null); setUser(null);
  }

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);