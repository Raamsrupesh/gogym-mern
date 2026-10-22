// pages/Plans.jsx  (customer view)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PlanPrice from '../components/PlanPrice';

const inr = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`;

export default function Plans() {
  const [plans, setPlans] = useState([]);
  useEffect(() => { api.get('/plans').then((d) => setPlans(d.plans || [])); }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-black">All plans</h1>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const original = Number(p.originalPriceInPaise || 0);
          const price = Number(p.priceInPaise || 0);
          const hasOriginal = original > 0;
          const hasOffer = hasOriginal && original > price && price > 0;
          const percentOff = hasOffer ? Math.round(((original - price) / original) * 100) : 0;

          return (
            <article key={p._id} className="relative rounded-2xl border border-electricblue bg-card p-6">
              {hasOffer && (
                <span className="absolute right-4 top-4 rounded-full bg-gymred px-2.5 py-1 text-xs font-black text-white">
                  {percentOff}% OFF
                </span>
              )}

              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-white">{p.description}</p>
              <ul className="mt-4 space-y-1 text-sm text-white">
                {(p.benefits || []).map((b) => <li key={b}>· {b}</li>)}
              </ul>

              <PlanPrice original={original} price={price} hasOffer={hasOffer} />
              {!!p.joiningFeeInPaise && (
                <p className="text-xs text-white">+ {inr(p.joiningFeeInPaise)} one-time joining fee</p>
              )}
              <p className="text-sm text-white">{p.durationDays} days</p>

              <Link to={`/enrol?planId=${p._id}`}
                className="mt-4 block rounded-full bg-gymred px-4 py-2 text-center font-bold text-white">
                Choose plan
              </Link>
            </article>
          );
        })}
      </div>
    </main>
  );
}