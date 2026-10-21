// pages/Home.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const MAPS_URL =
  'https://www.google.com/maps/place/GOGYM/@18.0957227,83.3881277,17z/data=!3m1!4b1!4m6!3m5!1s0x3a3be52f91a66d3b:0x2e2a40be65c36a47!8m2!3d18.0957227!4d83.3907026!16s%2Fg%2F11vc3q746n?entry=ttu&g_ep=EgoyMDI2MTAxOC4wIKXMDSoASAFQAw%3D%3D';

const highlights = [
  { number: '01', title: 'Find your fit', description: 'Compare membership plans and choose the training rhythm that works for you.' },
  { number: '02', title: 'Make it yours', description: 'See your membership, payments, and attendance together in your member dashboard.' },
  { number: '03', title: 'Keep showing up', description: 'Build strength one session at a time. Your next milestone starts with day one.' },
];

const services = [
  { number: '01', title: 'HIIT', description: 'High-intensity interval training that maximizes calorie burn, builds endurance, and keeps every session fresh.' },
  { number: '02', title: 'Strength Training', description: 'Progressive resistance work with free weights and machines to build muscle, bone density, and functional power.' },
  { number: '03', title: 'Fat Loss', description: 'Structured programs combining nutrition guidance with targeted conditioning to help you drop body fat sustainably.' },
  { number: '04', title: 'Personal Training', description: 'One-on-one coaching tailored to your goals, schedule, and fitness level — with a plan that actually fits your life.' },
  { number: '05', title: 'Cardio & Conditioning', description: 'Treadmill, cycling, and rowing sessions designed to strengthen your heart, lungs, and everyday stamina.' },
  { number: '06', title: 'Functional Fitness', description: 'Everyday movement patterns made stronger — so lifting, carrying, and living all feel easier.' },
];

const inr = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`;

function MapPinIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Home() {
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.get('/plans').then((data) => setPlans(data.plans)).catch(() => {});
    api.get('/settings/public').then((data) => setSettings(data.settings || {})).catch(() => {});
  }, []);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-electricblue bg-charcoal">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-[1.15fr_0.85fr] md:py-28">
          <div>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Open GOGYM's building location in Google Maps"
              className="group mb-6 flex w-full max-w-md items-center gap-4 rounded-2xl border border-electricblue bg-card p-3 text-left shadow-[0_0_18px_rgb(0_210_255_/_12%)] transition hover:-translate-y-0.5 hover:shadow-[0_0_26px_#00D2FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electricblue sm:p-4"
            >
              <span className="grid shrink-0 place-items-center rounded-xl border border-electricblue/60 bg-charcoal p-2.5 sm:p-3">
                <MapPinIcon className="h-9 w-9 text-gymred transition group-hover:scale-110 group-hover:text-electricblue sm:h-12 sm:w-12 lg:h-16 lg:w-16" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-electricblue">Our location</span>
                <span className="mt-0.5 block truncate text-base font-black text-white sm:text-lg lg:text-xl">
                  {settings.businessName || 'GoGym'} · Building address
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-white/70 transition group-hover:text-electricblue">
                  Open in Google Maps · Get directions
                  <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
                </span>
              </span>
            </a>

            <p className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-electricblue bg-card px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white sm:px-4 sm:tracking-[0.2em]">
              <span className="h-2 w-2 rounded-full bg-electricblue" />
              {settings.businessName || 'GoGym'} · Built for your next level
            </p>
            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight sm:text-5xl md:text-7xl">
              Show up strong.
              <span className="block italic">Leave stronger.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white sm:text-lg sm:leading-8">
              Make room for strength, energy, and progress. Find your membership and take the first step today.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#memberships"
                onClick={(e) => { e.preventDefault(); scrollToId('memberships'); }}
                className="w-full max-w-full rounded-full bg-gymred px-5 py-3.5 text-center text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-[0_0_20px_#00D2FF] sm:w-auto sm:px-7 sm:text-base"
              >
                View Memberships
              </a>
              <Link to="/register" className="w-full max-w-full rounded-full bg-gymred px-5 py-3.5 text-center text-sm font-bold text-white transition hover:shadow-[0_0_20px_#00D2FF] sm:w-auto sm:px-7 sm:text-base">
                Join Go Gym
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-white">
              <span><span className="mr-2 text-electricblue">✓</span>Plans for every starting point</span>
              <span><span className="mr-2 text-electricblue">✓</span>Your progress in one place</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-electricblue opacity-20 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-gymred opacity-20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-electricblue bg-card p-7 text-white shadow-[0_0_36px_rgb(0_210_255_/_12%)] md:p-9">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-electricblue">Your next chapter</span>
                <span className="rounded-full border border-electricblue px-3 py-1 text-xs">01 / START</span>
              </div>
              <div className="my-10 flex h-44 items-end gap-3" aria-hidden="true">
                {[40, 62, 48, 78, 58, 96, 72, 100, 82, 100, 65, 88].map((height, index) => (
                  <span key={index} className={`flex-1 rounded-t-md ${index > 8 ? 'bg-electricblue' : 'bg-charcoal'}`} style={{ height: `${height}%` }} />
                ))}
              </div>
              <p className="text-3xl font-black leading-tight">Progress is built<br />one rep at a time.</p>
              <p className="mt-3 text-sm leading-6 text-white">Set a goal. Get moving. Keep coming back for yourself.</p>
              <Link to="/register" className="mt-7 inline-flex items-center gap-2 font-bold text-gymred hover:text-electricblue">
                Start your journey <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-electricblue">Your goals, your pace</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">A better routine starts with a simple first step.</h2>
        </div>
        <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-3">
          {highlights.map((highlight) => (
            <article key={highlight.number} className="rounded-2xl border border-electricblue bg-card p-6 transition hover:-translate-y-1 hover:shadow-[0_0_24px_rgb(0_210_255_/_18%)]">
              <p className="text-sm font-black tracking-widest text-electricblue">{highlight.number}</p>
              <h3 className="mt-6 text-xl font-bold">{highlight.title}</h3>
              <p className="mt-3 leading-7 text-white">{highlight.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="services" className="border-y border-electricblue bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-electricblue">What we offer</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Programs built around every goal.</h2>
          </div>
          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article key={service.title} className="rounded-2xl border border-electricblue bg-charcoal p-6 transition hover:-translate-y-1 hover:shadow-[0_0_24px_rgb(0_210_255_/_18%)]">
                <p className="text-sm font-black tracking-widest text-electricblue">{service.number}</p>
                <h3 className="mt-4 text-xl font-bold">{service.title}</h3>
                <p className="mt-3 leading-7 text-white">{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-electricblue">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-electricblue">Start today</p>
            <h2 className="mt-2 text-3xl font-black">Your future self will thank you.</h2>
            <p className="mt-2 text-white">Browse the available plans and find a good fit.</p>
          </div>
          <Link to="/plans" className="inline-flex shrink-0 items-center justify-center rounded-full bg-gymred px-7 py-3.5 font-bold text-white transition hover:shadow-[0_0_20px_#00D2FF]">
            See membership plans <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section id="memberships" className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-electricblue">Find your plan</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Memberships</h2>
          </div>
          {plans.length > 0 && <Link to="/plans" className="font-bold text-gymred hover:text-electricblue">Compare all plans →</Link>}
        </div>
        {plans.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-electricblue p-8 text-white">
            Membership plans are being updated. Check back soon or message us using the WhatsApp button below.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.slice(0, 3).map((plan) => {
              const original = Number(plan.originalPriceInPaise || 0);
              const price = Number(plan.priceInPaise || 0);
              const hasOriginal = original > 0;
              const hasOffer = hasOriginal && original > price && price > 0;
              const percentOff = hasOffer ? Math.round(((original - price) / original) * 100) : 0;
              const savings = hasOffer ? original - price : 0;

              return (
                <article key={plan._id} className="relative rounded-2xl border border-electricblue bg-card p-6 transition hover:-translate-y-1 hover:shadow-[0_0_24px_rgb(0_210_255_/_18%)]">
                  {hasOffer && (
                    <span className="absolute right-4 top-4 rounded-full bg-gymred px-2.5 py-1 text-xs font-black text-white">
                      {percentOff}% OFF
                    </span>
                  )}
                  <h3 className="pr-16 text-xl font-bold">{plan.name}</h3>
                  <p className="mt-2 min-h-10 text-sm leading-6 text-white">{plan.description}</p>

                  <div className="mt-6 flex flex-wrap items-end gap-4">
                    {hasOriginal ? (
                      <p className="text-sm text-white/70">
                        <span className="block text-xs">Original price</span>
                        <span className={`font-semibold ${hasOffer ? 'line-through' : ''}`}>{inr(original)}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-white/60">Original price not set</p>
                    )}
                    <p className="text-electricblue">
                      <span className="block text-xs text-white/70">{hasOffer ? 'Discounted price' : 'Price'}</span>
                      <span className="text-3xl font-black">{inr(price)}</span>
                    </p>
                  </div>
                  {hasOffer && (
                    <p className="text-xs font-bold text-gymred">
                      You save {inr(savings)} · original {inr(original)}
                    </p>
                  )}
                  {!!plan.joiningFeeInPaise && (
                    <p className="text-xs text-white">+ {inr(plan.joiningFeeInPaise)} one-time joining fee</p>
                  )}
                  <p className="text-sm text-white">for {plan.durationDays} days</p>

                  {plan.benefits?.length > 0 && (
                    <ul className="mt-5 space-y-2 text-sm text-white">
                      {plan.benefits.slice(0, 3).map((benefit) => (
                        <li key={benefit}><span className="mr-2 text-electricblue">✓</span>{benefit}</li>
                      ))}
                    </ul>
                  )}
                  <Link to={`/enrol?planId=${plan._id}`} className="mt-6 block rounded-full bg-gymred px-6 py-3 text-center font-bold text-white transition hover:shadow-[0_0_20px_#00D2FF]">
                    Choose this plan
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}