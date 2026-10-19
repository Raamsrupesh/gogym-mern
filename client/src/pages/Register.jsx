import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', consentMarketing: false,
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await register(form);
      nav('/dashboard');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl font-black">Create your account</h1>
      <p className="mt-2 text-white">
        Free to sign up. Choose a membership plan after creating your account.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-electricblue bg-card p-6">
        <input
          required placeholder="Full name"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 outline-none"
        />
        <input
          required type="email" placeholder="Email"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 outline-none"
        />
        <input
          placeholder="Phone (optional)"
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 outline-none"
        />
        <input
          required type="password" minLength={8} placeholder="Password (8+ characters)"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 outline-none"
        />
        <label className="flex items-start gap-2 text-xs text-white">
          <input
            type="checkbox"
            checked={form.consentMarketing}
            onChange={(e) => setForm({ ...form, consentMarketing: e.target.checked })}
            className="mt-0.5"
          />
          <span>I agree to receive membership reminders and updates. I can opt out at any time.</span>
        </label>
        <button
          disabled={busy}
          className="w-full rounded-full bg-gymred px-6 py-3 font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        {err && <p className="text-sm text-gymred">{err}</p>}
      </form>
      <p className="mt-4 text-sm text-white">
        Already have an account? <Link to="/login" className="text-electricblue">Sign in</Link>.
      </p>
    </main>
  );
}