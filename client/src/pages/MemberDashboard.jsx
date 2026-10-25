import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import FeatureWorkspace from '../components/FeatureWorkspace';
import { getPlanFeatureLabels } from '../data/planFeatures';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [reminderConsent, setReminderConsent] = useState(!!user?.consentMarketing);
  const [consentMessage, setConsentMessage] = useState('');
  const [consentError, setConsentError] = useState('');
  const [receiptError, setReceiptError] = useState('');
  useEffect(() => { api.get('/members/me').then(setData); }, []);
  useEffect(() => { setReminderConsent(!!user?.consentMarketing); }, [user?.consentMarketing]);
  if (!data) return <p className="p-8 text-white">Loading…</p>;
  const active = data.activeMembership ||
    data.memberships.find((m) => m.status === 'active' && new Date(m.expiryDate) > new Date());

  async function download(paymentId) {
    setReceiptError('');
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
      setReceiptError('Allow pop-ups to view your receipt.');
      return;
    }
    try {
      const blob = await api.invoice(paymentId);
      const url = URL.createObjectURL(blob);
      receiptWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      receiptWindow.close();
      setReceiptError(error.message);
    }
  }

  async function saveReminderConsent(e) {
    e.preventDefault();
    setConsentError('');
    setConsentMessage('');
    try {
      const result = await api.patch('/auth/consent', { consentMarketing: reminderConsent });
      setReminderConsent(result.user.consentMarketing);
      setConsentMessage('WhatsApp reminder preference saved.');
    } catch (error) {
      setConsentError(error.message);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-black">Hi, {user?.name}</h1>

      <section className="mt-8 rounded-2xl border border-brand bg-card p-6">
        <h2 className="text-xl font-bold">Membership</h2>
        {active ? (
          <div className="mt-3">
            <p className="text-brand font-bold">{active.planSnapshot?.name}</p>
            <p className="capitalize">{active.planSnapshot?.category || 'basic'} · {active.status} · {active.planSnapshot?.durationDays || Math.ceil((new Date(active.expiryDate) - new Date(active.startDate)) / 86400000)} days</p>
            <p>Started: {new Date(active.startDate).toLocaleDateString('en-IN')} · Expires: {new Date(active.expiryDate).toLocaleDateString('en-IN')}</p>
            {getPlanFeatureLabels(active.planSnapshot?.features).length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-white/80">
                {getPlanFeatureLabels(active.planSnapshot?.features).map((feature) => <li key={feature}>✓ {feature}</li>)}
              </ul>
            )}
            <a href={`https://wa.me/?text=${encodeURIComponent('I want to renew my GoGym membership')}`} className="mt-4 inline-block rounded-full border border-brand px-4 py-2 text-sm hover:border-brand">Renew on WhatsApp</a>
          </div>
        ) : (
          <p className="mt-2 text-white">No active membership.</p>
        )}
      </section>

      <form onSubmit={saveReminderConsent} className="mt-4 rounded-2xl border border-brand bg-card p-6">
        <h2 className="text-lg font-bold">Reminder preferences</h2>
        <label className="mt-3 flex items-start gap-2 text-sm text-white">
          <input type="checkbox" checked={reminderConsent}
            onChange={(e) => setReminderConsent(e.target.checked)} className="mt-1" />
          <span>Send my membership renewal reminders to my phone on WhatsApp.</span>
        </label>
        {consentError && <p role="alert" className="mt-2 text-sm text-brand">{consentError}</p>}
        {consentMessage && <p role="status" className="mt-2 text-sm text-brand">{consentMessage}</p>}
        <button className="mt-3 rounded-full border border-brand px-4 py-2 text-sm">Save preference</button>
        <p className="mt-2 text-xs text-white/60">Email renewal reminders continue regardless of this WhatsApp preference.</p>
      </form>

      <FeatureWorkspace mode="member" membership={active} />

      <section className="mt-8 rounded-2xl border border-brand bg-card p-6">
        <h2 className="text-xl font-bold">Payments</h2>
        {receiptError && <p role="alert" className="mt-2 text-sm text-brand">{receiptError}</p>}
        <div className="mt-3 divide-y divide-brand">
          {data.payments.map((p) => (
            <div key={p._id} className="flex items-center justify-between py-3">
              <div>
                <p>₹{(p.amountInPaise / 100).toLocaleString('en-IN')} — {p.status} — {p.method}</p>
                <p className="text-xs text-white">{new Date(p.paidAt || p.createdAt).toLocaleString('en-IN')}</p>
              </div>
              {p.status === 'captured' && (
                <button onClick={() => download(p._id)} className="rounded-full border border-brand px-3 py-1 text-sm hover:border-brand">Receipt</button>
              )}
            </div>
          ))}
          {data.payments.length === 0 && <p className="py-3 text-white">No payments yet.</p>}
        </div>
      </section>
    </main>
  );
}