import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PlanPrice from '../components/PlanPrice';
import { getPlanFeatureLabels } from '../data/planFeatures';

export default function Enrol() {
  const [params] = useSearchParams();
  const planId = params.get('planId');
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', consentMarketing: false });
  const [referralCode, setReferralCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [checkoutTotal, setCheckoutTotal] = useState(null);
  const [checkoutDiscounts, setCheckoutDiscounts] = useState(null);
  const { user, register } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!planId) return;
    api.get('/plans').then((d) => setPlan(d.plans.find((p) => p._id === planId)));
  }, [planId]);

  async function pay(e) {
    e.preventDefault();
    setErr('');
    if (!acceptedTerms) {
      setErr('Please read and accept the terms and conditions before paying.');
      return;
    }
    setBusy(true);
    try {
      if (!user) {
        await register({ name: form.name, phone: form.phone, email: form.email, password: form.password, consentMarketing: form.consentMarketing });
      }
      if (referralCode.trim()) {
        await api.post('/features/referrals/use', { code: referralCode.trim() });
        setReferralCode('');
      }
      const order = await api.post('/razorpay/order', { planId });
      const { orderId, amount, keyId, currency } = order;
      setCheckoutTotal(amount);
      setCheckoutDiscounts({
        newMember: order.referralDiscountInPaise || 0,
        referrer: order.referrerDiscountInPaise || 0,
      });
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
        modal: {
          ondismiss: () => {
            api.post('/razorpay/fail', { orderId }).catch((error) => setErr(error.message));
          },
        },
        theme: { color: '#F05423' },
      });
      rzp.on('payment.failed', (r) => {
        const failedOrderId = r.error?.metadata?.order_id;
        if (failedOrderId) api.post('/razorpay/fail', { orderId: failedOrderId }).catch((error) => setErr(error.message));
        setErr(r.error?.description || 'Payment failed');
      });
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
      <div className="mt-4">
        <PlanPrice original={originalPrice} price={plan.priceInPaise} hasOffer={hasOffer} />
        <p className="mt-2 text-sm text-white">
          {plan.durationDays} days
          {(plan.joiningFeeInPaise || 0) > 0 && ` · ₹${(plan.joiningFeeInPaise / 100).toLocaleString('en-IN')} joining fee`}
          {' · '}Total ₹{(total / 100).toLocaleString('en-IN')}
        </p>
        {getPlanFeatureLabels(plan.features).length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-white">
            {getPlanFeatureLabels(plan.features).map((feature) => <li key={feature}>✓ {feature}</li>)}
          </ul>
        )}
      </div>
      <form onSubmit={pay} className="mt-8 space-y-3 rounded-2xl border border-brand bg-card p-6">
        {!user && (
          <>
            <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
            <input required type="tel" placeholder="Phone (include country code for WhatsApp)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
            <input required type="password" minLength={8} placeholder="Password (8+ chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 outline-none" />
            <label className="flex items-start gap-2 text-xs text-white">
              <input type="checkbox" checked={form.consentMarketing}
                onChange={(e) => setForm({ ...form, consentMarketing: e.target.checked })} className="mt-0.5" />
              <span>I agree to receive membership reminders by WhatsApp. I can opt out at any time.</span>
            </label>
          </>
        )}
        <label className="block text-sm">
          Referral code (optional)
          <input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="mt-1 w-full rounded-lg bg-card px-3 py-2 outline-none" placeholder="Enter a member's code" />
        </label>
        <p className="text-xs text-white/60">Enter an eligible member's code before paying. The new-member percentage discount is applied to the membership price, excluding the joining fee; the final amount is calculated securely at checkout.</p>
        {checkoutTotal !== null && (
          <div className="rounded-lg border border-brand/40 p-3 text-sm">
            {checkoutDiscounts?.newMember > 0 && <p>New-member referral discount: ₹{(checkoutDiscounts.newMember / 100).toLocaleString('en-IN')}</p>}
            {checkoutDiscounts?.referrer > 0 && <p>Referral credit applied: ₹{(checkoutDiscounts.referrer / 100).toLocaleString('en-IN')}</p>}
            <p className="font-bold">Checkout total: ₹{(checkoutTotal / 100).toLocaleString('en-IN')}</p>
          </div>
        )}
        <div className="space-y-2 rounded-lg border border-brand/30 p-3">
          <label className="flex items-start gap-2 text-sm text-white">
            <input
              type="checkbox"
              required
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1"
            />
            <span>
              I have read and agree to the{' '}
              <a
                href="/terms-and-conditions.svg"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand underline"
              >
                Terms and Conditions
              </a>.
            </span>
          </label>
          <a href="/terms-and-conditions.svg" target="_blank" rel="noreferrer" aria-label="View the full terms and conditions image">
            <img
              src="/terms-and-conditions.svg"
              alt="Go Gym membership terms and conditions. Select to view the full-size image."
              className="max-h-48 w-full rounded-md object-contain object-left"
            />
          </a>
        </div>
        <button disabled={busy || !acceptedTerms} className="w-full rounded-full bg-brand px-6 py-3 font-bold text-white disabled:opacity-50">
          {busy ? 'Please wait…' : `Pay ₹${((checkoutTotal ?? total) / 100).toLocaleString('en-IN')}`}
        </button>
        {err && <p className="text-brand text-sm">{err}</p>}
        <p className="text-xs text-white">This is a Razorpay test-mode payment if test keys are configured.</p>
      </form>
    </main>
  );
}