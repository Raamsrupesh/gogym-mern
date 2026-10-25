// pages/Home.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PlanPrice from '../components/PlanPrice';
import { gymServices } from '../data/services';
import { getPlanBenefits, getPlanFeatureLabels } from '../data/planFeatures';

const MAPS_URL =
  'https://www.google.com/maps/place/GOGYM/@18.0957227,83.3881277,17z/data=!3m1!4b1!4m6!3m5!1s0x3a3be52f91a66d3b:0x2e2a40be65c36a47!8m2!3d18.0957227!4d83.3907026!16s%2Fg%2F11vc3q746n?entry=ttu&g_ep=EgoyMDI2MTAxOC4wIKXMDSoASAFQAw%3D%3D';

const highlights = [
  { number: '01', title: 'Find your fit', description: 'Compare membership plans and choose the training rhythm that works for you.' },
  { number: '02', title: 'Make it yours', description: 'See your membership, payments, and attendance together in your member dashboard.' },
  { number: '03', title: 'Keep showing up', description: 'Build strength one session at a time. Your next milestone starts with day one.' },
];

const gymPhotos = [
  { src: 'https://res.cloudinary.com/dbeasd4ey/image/upload/v1792635608/gogym1.jpg', alt: 'GoGym training floor and equipment' },
  { src: 'https://res.cloudinary.com/dbeasd4ey/image/upload/v1792635608/gogym4.jpg', alt: 'GoGym gym equipment and workout area' },
  { src: 'https://res.cloudinary.com/dbeasd4ey/image/upload/v1792635608/gogym3.jpg', alt: 'GoGym strength training space' },
  { src: 'https://res.cloudinary.com/dbeasd4ey/image/upload/v1792635608/gogym5.jpg', alt: 'GoGym fitness and conditioning area' },
  { src: 'https://res.cloudinary.com/dbeasd4ey/image/upload/v1792635607/gogym6.jpg', alt: 'GoGym workout equipment' },
  { src: 'https://res.cloudinary.com/dbeasd4ey/image/upload/v1792635608/gogym-2.jpg', alt: 'Inside GoGym' },
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
  const [leaderboard, setLeaderboard] = useState(null);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [transformations, setTransformations] = useState([]);
  const [transformationsError, setTransformationsError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    api.get('/plans').then((data) => setPlans(data.plans)).catch(() => {});
    api.get('/settings/public').then((data) => setSettings(data.settings || {})).catch(() => {});
    api.get('/features/public-transformations')
      .then((data) => setTransformations(data.transformations))
      .catch((error) => setTransformationsError(error.message));
  }, []);

  useEffect(() => {
    if (!user) {
      setLeaderboard(null);
      setLeaderboardError('');
      return undefined;
    }
    let active = true;
    api.get('/features/leaderboard?period=month')
      .then((data) => { if (active) setLeaderboard(data); })
      .catch((error) => { if (active) setLeaderboardError(error.message); });
    return () => { active = false; };
  }, [user?._id]);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-brand bg-charcoal">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-[1.15fr_0.85fr] md:py-28">
          <div>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Open GOGYM's building location in Google Maps"
              className="group mb-6 flex w-full max-w-md items-center gap-4 rounded-2xl border border-brand bg-card p-3 text-left shadow-[0_0_18px_rgb(240_84_35_/_12%)] transition hover:-translate-y-0.5 hover:shadow-[0_0_26px_#F05423] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-4"
            >
              <span className="grid shrink-0 place-items-center rounded-xl border border-brand/60 bg-charcoal p-2.5 sm:p-3">
                <MapPinIcon className="h-9 w-9 text-brand transition group-hover:scale-110 group-hover:text-brand sm:h-12 sm:w-12 lg:h-16 lg:w-16" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand">Our location</span>
                <span className="mt-0.5 block truncate text-base font-black text-white sm:text-lg lg:text-xl">
                  {settings.businessName || 'GoGym'} · Building address
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-white/70 transition group-hover:text-brand">
                  Open in Google Maps · Get directions
                  <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
                </span>
              </span>
            </a>

            <p className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-brand bg-card px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white sm:px-4 sm:tracking-[0.2em]">
              <span className="h-2 w-2 rounded-full bg-brand" />
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
                className="w-full max-w-full rounded-full bg-brand px-5 py-3.5 text-center text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-[0_0_20px_#F05423] sm:w-auto sm:px-7 sm:text-base"
              >
                View Memberships
              </a>
              <Link to="/register" className="w-full max-w-full rounded-full bg-brand px-5 py-3.5 text-center text-sm font-bold text-white transition hover:shadow-[0_0_20px_#F05423] sm:w-auto sm:px-7 sm:text-base">
                Join Go Gym
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-white">
              <span><span className="mr-2 text-brand">✓</span>Plans for every starting point</span>
              <span><span className="mr-2 text-brand">✓</span>Your progress in one place</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-brand opacity-20 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-brand opacity-20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-brand bg-card p-7 text-white shadow-[0_0_36px_rgb(240_84_35_/_12%)] md:p-9">
              {user ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Monthly leaderboard</span>
                    <span className="rounded-full border border-brand px-3 py-1 text-xs">THIS MONTH</span>
                  </div>
                  {leaderboardError && <p role="alert" className="mt-4 text-sm text-brand">{leaderboardError}</p>}
                  <div className="mt-8 space-y-3">
                    {(leaderboard?.leaderboard || []).slice(0, 3).map((entry) => {
                      const rankStyle = {
                        1: 'border-yellow-300 bg-yellow-300/10 text-yellow-200',
                        2: 'border-slate-300 bg-slate-300/10 text-slate-200',
                        3: 'border-orange-400 bg-orange-400/10 text-orange-200',
                      }[entry.rank];
                      const medal = { 1: '🥇', 2: '🥈', 3: '🥉' }[entry.rank];
                      return (
                        <article key={entry.memberId} className={`flex items-center gap-4 rounded-xl border p-3 ${rankStyle}`}>
                          <span className="text-2xl" aria-label={`Rank ${entry.rank}`}>{medal}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">#{entry.rank} {entry.name}</p>
                            <p className="text-xs opacity-80">{entry.attendanceCount} attendance days</p>
                          </div>
                          <span className="text-xs font-bold uppercase">{entry.rank === 1 ? 'Winner' : `Rank ${entry.rank}`}</span>
                        </article>
                      );
                    })}
                    {leaderboard && !leaderboard.leaderboard?.length && <p className="rounded-xl border border-brand/40 p-4 text-sm text-white/70">No attendance has been recorded this month yet.</p>}
                    {!leaderboard && !leaderboardError && <p className="py-5 text-sm text-white/60">Loading this month’s leaders…</p>}
                  </div>
                  <p className="mt-5 text-xs text-white/60">Ranked by distinct attendance days this month.</p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Your next chapter</span>
                    <span className="rounded-full border border-brand px-3 py-1 text-xs">01 / START</span>
                  </div>
                  <div className="my-10 flex h-44 items-end gap-3" aria-hidden="true">
                    {[40, 62, 48, 78, 58, 96, 72, 100, 82, 100, 65, 88].map((height, index) => (
                      <span key={index} className={`flex-1 rounded-t-md ${index > 8 ? 'bg-brand' : 'bg-charcoal'}`} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <p className="text-3xl font-black leading-tight">Progress is built<br />one rep at a time.</p>
                  <p className="mt-3 text-sm leading-6 text-white">Set a goal. Get moving. Keep coming back for yourself.</p>
                  <Link to="/register" className="mt-7 inline-flex items-center gap-2 font-bold text-brand hover:text-brand">
                    Start your journey <span aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Your goals, your pace</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">A better routine starts with a simple first step.</h2>
        </div>
        <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-3">
          {highlights.map((highlight) => (
            <article key={highlight.number} className="rounded-2xl border border-brand bg-card p-6 transition hover:-translate-y-1 hover:shadow-[0_0_24px_rgb(240_84_35_/_18%)]">
              <p className="text-sm font-black tracking-widest text-brand">{highlight.number}</p>
              <h3 className="mt-6 text-xl font-bold">{highlight.title}</h3>
              <p className="mt-3 leading-7 text-white">{highlight.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="services" className="border-y border-brand bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">What we offer</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Programs built around every goal.</h2>
          </div>
          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gymServices.map((service) => (
              <article key={service.id} className="rounded-2xl border border-brand bg-charcoal p-6 transition hover:-translate-y-1 hover:shadow-[0_0_24px_rgb(240_84_35_/_18%)]">
                <p className="text-sm font-black tracking-widest text-brand">{service.number}</p>
                <h3 className="mt-4 text-xl font-bold">{service.title}</h3>
                <p className="mt-3 leading-7 text-white">{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {transformations.length > 0 && <section id="transformations" className="border-y border-brand bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Member stories</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Progress made at GoGym.</h2>
            <p className="mt-3 leading-7 text-white/70">Shared with each member's permission.</p>
          </div>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {transformations.map((item) => (
              <article key={item._id} className="overflow-hidden rounded-2xl border border-brand bg-charcoal">
                <div className="grid grid-cols-2 gap-1">
                  {['before', 'after'].map((image) => (
                    <figure key={image}>
                      <img src={`/api/features/public-transformations/${item._id}/image/${image}`}
                        alt={`${image === 'before' ? 'Before' : 'After'} member transformation`}
                        loading="lazy" className="h-52 w-full object-cover" />
                      <figcaption className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">{image}</figcaption>
                    </figure>
                  ))}
                </div>
                {item.description && <p className="px-4 pb-4 text-sm text-white">{item.description}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>}
      {transformationsError && <p role="alert" className="mx-auto max-w-6xl rounded-2xl px-6 py-5 mt-3 border border-brand text-sm text-brand text-center ">There are no transformations recorded.</p>}

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Take a look inside</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">A space to put in the work.</h2>
          <p className="mt-3 leading-7 text-white/70">Explore the GoGym training floor, equipment, and workout spaces.</p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gymPhotos.map((photo) => (
            <figure key={photo.src} className="group overflow-hidden rounded-2xl border border-brand bg-card">
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                className="h-64 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            </figure>
          ))}
        </div>
      </section>

      <section className="border-b border-brand">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Start today</p>
            <h2 className="mt-2 text-3xl font-black">Your future self will thank you.</h2>
            <p className="mt-2 text-white">Browse the available plans and find a good fit.</p>
          </div>
          <Link to="/plans" className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-7 py-3.5 font-bold text-white transition hover:shadow-[0_0_20px_#F05423]">
            See membership plans <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section id="memberships" className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Find your plan</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Memberships</h2>
          </div>
          {plans.length > 0 && <Link to="/plans" className="font-bold text-brand hover:text-brand">Compare all plans →</Link>}
        </div>
        {plans.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-brand p-8 text-white">
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

              return (
                <article key={plan._id} className="relative rounded-2xl border border-brand bg-card p-6 transition hover:-translate-y-1 hover:shadow-[0_0_24px_rgb(240_84_35_/_18%)]">
                  {hasOffer && (
                    <span className="absolute right-4 top-4 rounded-full bg-brand px-2.5 py-1 text-xs font-black text-white">
                      {percentOff}% OFF
                    </span>
                  )}
                  <h3 className="pr-16 text-xl font-bold">{plan.name}</h3>
                  <p className="mt-2 min-h-10 text-sm leading-6 text-white">{plan.description}</p>

                  <PlanPrice original={hasOriginal ? original : 0} price={price} hasOffer={hasOffer} />
                  {!!plan.joiningFeeInPaise && (
                    <p className="text-xs text-white">+ {inr(plan.joiningFeeInPaise)} one-time joining fee</p>
                  )}
                  <p className="text-sm text-white">for {plan.durationDays} days</p>

                  {getPlanFeatureLabels(plan.features).length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm text-white">
                      {getPlanFeatureLabels(plan.features).map((feature) => (
                        <li key={feature}><span className="mr-2 text-brand">✓</span>{feature}</li>
                      ))}
                    </ul>
                  )}
                  {getPlanBenefits(plan.benefits).length > 0 && (
                    <ul className="mt-5 space-y-2 text-sm text-white">
                      {getPlanBenefits(plan.benefits).slice(0, 3).map((benefit) => (
                        <li key={benefit}><span className="mr-2 text-brand">✓</span>{benefit}</li>
                      ))}
                    </ul>
                  )}
                  <Link to={`/enrol?planId=${plan._id}`} className="mt-6 block rounded-full bg-brand px-6 py-3 text-center font-bold text-white transition hover:shadow-[0_0_20px_#F05423]">
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