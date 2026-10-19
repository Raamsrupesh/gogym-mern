import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  useEffect(() => { api.get('/plans').then((d) => setPlans(d.plans)); }, []);
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-8 text-4xl font-black">All plans</h1>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <article key={p._id} className="rounded-2xl border border-electricblue bg-card p-6">
            <h3 className="text-xl font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-white">{p.description}</p>
            <ul className="mt-4 space-y-1 text-sm text-white">
              {(p.benefits || []).map((b) => <li key={b}>· {b}</li>)}
            </ul>
            <p className="mt-6 text-3xl font-black text-electricblue">₹{(p.priceInPaise / 100).toLocaleString('en-IN')}</p>
            <p className="text-sm text-white">{p.durationDays} days</p>
            <Link to={`/enrol?planId=${p._id}`} className="mt-4 block rounded-full bg-gymred px-4 py-2 text-center font-bold text-white">Choose plan</Link>
          </article>
        ))}
      </div>
    </main>
  );
}