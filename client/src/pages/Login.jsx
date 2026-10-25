import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setErr('');
    try {
      const user = await login(form.email, form.password);
      nav(user.role === 'owner' ? '/admin' : user.role === 'staff' ? '/trainer' : '/dashboard');
    }
    catch (e) { setErr(e.message); }
  }
  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-3xl font-black">Sign in</h1>
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-brand bg-card p-6">
        <input required type="email" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
        <input required type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
        <button className="w-full rounded-full bg-brand px-6 py-3 font-bold text-white">Sign in</button>
        {err && <p className="text-brand text-sm">{err}</p>}
      </form>
      <p className="mt-4 text-sm text-white">
        No account? <Link to="/register" className="text-brand">Create one</Link>.
      </p>
    </main>
  );
}