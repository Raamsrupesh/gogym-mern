import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import FeatureWorkspace from '../components/FeatureWorkspace';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/members/me').then(setData); }, []);
  if (!data) return <p className="p-8 text-white">Loading…</p>;
  const active = data.memberships.find((m) => m.status === 'active' && new Date(m.expiryDate) > new Date());

  async function download(paymentId) {
    const blob = await api.invoice(paymentId);
    const url = URL.createObjectURL(blob);
    window.open(url);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-black">Hi, {user?.name}</h1>

      <section className="mt-8 rounded-2xl border border-electricblue bg-card p-6">
        <h2 className="text-xl font-bold">Membership</h2>
        {active ? (
          <div className="mt-3">
            <p className="text-electricblue font-bold">{active.planSnapshot?.name}</p>
            <p>Expires: {new Date(active.expiryDate).toLocaleDateString('en-IN')}</p>
            <a href={`https://wa.me/?text=${encodeURIComponent('I want to renew my GoGym membership')}`} className="mt-4 inline-block rounded-full border border-electricblue px-4 py-2 text-sm hover:border-electricblue">Renew on WhatsApp</a>
          </div>
        ) : (
          <p className="mt-2 text-white">No active membership.</p>
        )}
      </section>

      <FeatureWorkspace mode="member" />

      <section className="mt-8 rounded-2xl border border-electricblue bg-card p-6">
        <h2 className="text-xl font-bold">Payments</h2>
        <div className="mt-3 divide-y divide-electricblue">
          {data.payments.map((p) => (
            <div key={p._id} className="flex items-center justify-between py-3">
              <div>
                <p>₹{(p.amountInPaise / 100).toLocaleString('en-IN')} — {p.status} — {p.method}</p>
                <p className="text-xs text-white">{new Date(p.paidAt || p.createdAt).toLocaleString('en-IN')}</p>
              </div>
              {p.status === 'captured' && (
                <button onClick={() => download(p._id)} className="rounded-full border border-electricblue px-3 py-1 text-sm hover:border-electricblue">Receipt</button>
              )}
            </div>
          ))}
          {data.payments.length === 0 && <p className="py-3 text-white">No payments yet.</p>}
        </div>
      </section>
    </main>
  );
}