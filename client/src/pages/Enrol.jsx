import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Enrol() {
  const [params] = useSearchParams();
  const planId = params.get('planId');
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { user, register, login } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!planId) return;
    api.get('/plans').then((d) => setPlan(d.plans.find((p) => p._id === planId)));
  }, [planId]);

  async function pay(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (!user) {
        await register({ name: form.name, phone: form.phone, email: form.email, password: form.password });
      }
      const { orderId, amount, keyId, currency } = await api.post('/razorpay/order', { planId });
      if (!window.Razorpay) {
        await new Promise((r) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = r; document.body.appendChild(s); });
      }
      const rzp = new window.Razorpay({
        key: keyId, amount, currency, order_id: orderId,
        name: 'GoGym', description: plan?.name,
        handler: async (resp) => {
          try {
            await api.post('/razorpay/verify', {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            nav('/dashboard');
          } catch (e) { setErr(e.message); }
        },
        theme: { color: '#FF3B30' },
      });
      rzp.on('payment.failed', (r) => setErr(r.error?.description || 'Payment failed'));
      rzp.open();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (!plan) return <p className="p-8 text-white">Select a plan first.</p>;

  const total = plan.priceInPaise + (plan.joiningFeeInPaise || 0);
  const originalPrice = Number(plan.originalPriceInPaise || 0);
  const hasOffer = originalPrice > plan.priceInPaise;

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-black">Enrol — {plan.name}</h1>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-white">
        {hasOffer && (
          <span className="text-sm text-white/70">
            Original <span className="line-through">₹{(originalPrice / 100).toLocaleString('en-IN')}</span>
            {' · '}
          </span>
        )}
        <span className="font-bold text-electricblue">
          {hasOffer ? 'Discounted price' : 'Price'}: ₹{(plan.priceInPaise / 100).toLocaleString('en-IN')}
        </span>
        {(plan.joiningFeeInPaise || 0) > 0 && (
          <span>+ ₹{(plan.joiningFeeInPaise / 100).toLocaleString('en-IN')} joining fee</span>
        )}
        <span>· {plan.durationDays} days · Total ₹{(total / 100).toLocaleString('en-IN')}</span>
      </div>
      <form onSubmit={pay} className="mt-8 space-y-3 rounded-2xl border border-electricblue bg-card p-6">
        {!user && (
          <>
            <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
            <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
            <input required type="password" minLength={8} placeholder="Password (8+ chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
          </>
        )}
        <button disabled={busy} className="w-full rounded-full bg-gymred px-6 py-3 font-bold text-white disabled:opacity-50">
          {busy ? 'Please wait…' : `Pay ₹${(total / 100).toLocaleString('en-IN')}`}
        </button>
        {err && <p className="text-gymred text-sm">{err}</p>}
        <p className="text-xs text-white">
          By paying you accept the gym’s membership and refund policy. This is a Razorpay test-mode payment if test keys are configured.
        </p>
      </form>
    </main>
  );
}