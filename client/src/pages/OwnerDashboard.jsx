import { useEffect, useState } from 'react';
import { api } from '../api';
import FeatureWorkspace from '../components/FeatureWorkspace';
import PlanPrice from '../components/PlanPrice';
import { getPlanFeatureLabels, planFeatureOptions } from '../data/planFeatures';

const TABS = ['Overview', 'Plans', 'Members', 'Payments', 'Attendance', 'Settings', 'Operations'];

export default function OwnerDashboard() {
  const [tab, setTab] = useState('Overview');
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-black">Owner dashboard</h1>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-brand pb-3">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? 'bg-brand text-white font-bold' : 'border border-brand'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {tab === 'Overview' && <Overview />}
        {tab === 'Plans' && <PlansTab />}
        {tab === 'Members' && <MembersTab />}
        {tab === 'Payments' && <PaymentsTab />}
        {tab === 'Attendance' && <AttendanceTab />}
        {tab === 'Settings' && <SettingsTab />}
        {tab === 'Operations' && <FeatureWorkspace mode="staff" />}
      </div>
    </main>
  );
}

function Overview() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/admin/overview').then(setD); }, []);
  if (!d) return <p className="text-white">Loading…</p>;
  const s = d.stats;
  const monthlyCollection = s.collectedMonthPaise || 0;
  const todaysCollection = s.collectedTodayPaise || 0;
  const largestCollection = Math.max(monthlyCollection, todaysCollection);
  const activeMemberRate = s.members ? Math.min(100, Math.round((s.activeMemberships / s.members) * 100)) : 0;
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">At a glance</p>
        <h2 className="mt-1 text-2xl font-black">Gym statistics</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ['Members', s.members],
          ['Active', s.activeMemberships],
          ['Expiring in 7 days', s.expiringIn7Days],
          ['Collected today (₹)', s.collectedTodayPaise / 100],
          ['Collected this month (₹)', s.collectedMonthPaise / 100],
          ['Attendance today', s.attendanceToday],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-brand bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-white">{label}</p>
            <p className="mt-1 text-2xl font-black text-white">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-brand bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold">Membership health</h3>
              <p className="mt-1 text-sm text-white">Active memberships compared with all members</p>
            </div>
            <span className="text-2xl font-black text-brand">{activeMemberRate}%</span>
          </div>
          <div
            className="mt-5 h-3 overflow-hidden rounded-full bg-charcoal"
            role="progressbar"
            aria-label="Active membership rate"
            aria-valuenow={activeMemberRate}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${activeMemberRate}%` }} />
          </div>
          <p className="mt-2 text-xs text-white">{s.activeMemberships} active of {s.members} total members</p>
        </section>
        <section className="rounded-2xl border border-brand bg-card p-5">
          <h3 className="font-bold">Collections</h3>
          <p className="mt-1 text-sm text-white">Today compared with this month</p>
          {[
            ['Today', todaysCollection],
            ['This month', monthlyCollection],
          ].map(([label, amount]) => {
            const width = largestCollection ? Math.max(4, (amount / largestCollection) * 100) : 0;
            return (
              <div key={label} className="mt-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-white">{label}</span>
                  <span className="font-bold">₹{(amount / 100).toLocaleString('en-IN')}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-charcoal">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      </div>
      <h3 className="mt-8 font-bold">Recent payments</h3>
      <div className="mt-2 divide-y divide-brand rounded-2xl border border-brand">
        {d.recentPayments.map((p) => (
          <div key={p._id} className="flex justify-between p-3 text-sm">
            <span>{p.member?.name || '—'}</span>
            <span>₹{(p.amountInPaise / 100).toLocaleString('en-IN')} · {p.method}</span>
            <span className="text-white">{new Date(p.paidAt).toLocaleDateString('en-IN')}</span>
          </div>
        ))}
        {d.recentPayments.length === 0 && <p className="p-3 text-white">No payments yet.</p>}
      </div>
      <section className="mt-8 rounded-2xl border border-brand bg-card p-5">
        <h3 className="font-bold">Equipment requiring attention</h3>
        <div className="mt-2 divide-y divide-brand/30">
          {(d.equipmentMaintenance || []).map((item) => (
            <p key={item._id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
              <span>{item.name}</span>
              <span className="text-brand">{item.status.replaceAll('_', ' ')}{item.nextMaintenanceAt ? ` · due ${new Date(item.nextMaintenanceAt).toLocaleDateString('en-IN')}` : ''}</span>
            </p>
          ))}
          {!d.equipmentMaintenance?.length && <p className="py-2 text-sm text-white/60">No equipment maintenance is overdue or flagged.</p>}
        </div>
      </section>
    </div>
  );
}

const EMPTY_FORM = {
  name: '',
  description: '',
  originalPrice: '',   // rupees — MRP, shown struck through
  offerPrice: '',      // rupees — what the member actually pays
  durationDays: 30,
  joiningFee: '',
  category: 'basic',
  features: {
    gym_access: true,
    daily_session_limit: 1,
    training_guidance: false,
    diet_chart: false,
    bmi_report: false,
    body_measurements: false,
    progress_tracking: false,
  },
  applyToExistingMemberships: false,
  active: true,        // only used while editing
};

const toPaise = (value) => Math.round(Number(value || 0) * 100);
const inr = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`;

function PencilIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function PlansTab() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    const data = await api.get('/plans/all');
    setPlans(data.plans || []);
  }
  useEffect(() => { load(); }, []);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  function startEdit(p) {
    setEditingId(p._id);
    setError('');
    setForm({
      name: p.name || '',
      description: p.description || '',
      originalPrice: p.originalPriceInPaise ? String(p.originalPriceInPaise / 100) : '',
      offerPrice: p.priceInPaise ? String(p.priceInPaise / 100) : '',
      durationDays: p.durationDays || 30,
      joiningFee: p.joiningFeeInPaise ? String(p.joiningFeeInPaise / 100) : '',
      category: p.category || 'basic',
      features: {
        gym_access: p.features?.gym_access !== false,
        daily_session_limit: p.features?.daily_session_limit ?? 1,
        training_guidance: p.features?.training_guidance === true,
        diet_chart: p.features?.diet_chart === true || p.dietGuidance === true,
        bmi_report: p.features?.bmi_report === true,
        body_measurements: p.features?.body_measurements === true,
        progress_tracking: p.features?.progress_tracking === true,
      },
      applyToExistingMemberships: false,
      active: p.active !== false,
    });
  }

  async function save(e) {
    e.preventDefault();
    const original = toPaise(form.originalPrice);
    const offer = toPaise(form.offerPrice);

    if (offer <= 0) { setError('Offer price must be greater than ₹0.'); return; }
    if (original && original < offer) {
      setError('Original price cannot be lower than the offer price.');
      return;
    }
    setError('');

    const payload = {
      name: form.name,
      description: form.description,
      category: form.category,
      priceInPaise: offer,
      originalPriceInPaise: original > offer ? original : 0,
      durationDays: Number(form.durationDays) || 30,
      joiningFeeInPaise: toPaise(form.joiningFee),
      features: form.features,
      applyToExistingMemberships: !!form.applyToExistingMemberships,
    };

    try {
      if (editingId) {
        await api.patch(`/plans/${editingId}`, { ...payload, active: !!form.active });
      } else {
        await api.post('/plans', payload);
      }
      resetForm();
      await load();
    } catch {
      setError(editingId
        ? 'Could not update the plan. Please try again.'
        : 'Could not create the plan. Please try again.');
    }
  }

  async function toggle(p) {
    await api.patch(`/plans/${p._id}`, { active: !p.active });
    await load();
  }

  async function remove(p) {
    const msg =
      `Permanently delete "${p.name}"?`;
    if (!window.confirm(msg)) return;

    setDeletingId(p._id);
    setError('');
    try {
      await api.delete(`/admin/plans/${p._id}`);
      if (editingId === p._id) resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Could not delete the plan. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  // live preview of how the member will see this plan
  const previewOriginal = toPaise(form.originalPrice);
  const previewOffer = toPaise(form.offerPrice);
  const previewHasOffer = previewOriginal > previewOffer && previewOffer > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-bold">Existing plans</h3>
        <div className="mt-2 space-y-2">
          {plans.length === 0 && (
            <p className="rounded-xl border border-dashed border-brand p-3 text-sm text-white/70">
              No plans yet. Create one on the right.
            </p>
          )}
          {plans.map((p) => {
            const hasOriginal = Number(p.originalPriceInPaise) > 0;
            const onOffer = hasOriginal && Number(p.originalPriceInPaise) > Number(p.priceInPaise);
            const isDeleting = deletingId === p._id;
            return (
              <div
                key={p._id}
                className={`flex items-center justify-between gap-3 rounded-xl border bg-card p-3 transition ${
                  editingId === p._id ? 'border-brand' : 'border-brand'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.name} {p.active ? '' : <span className="text-white/60">(inactive)</span>}
                  </p>
                  <PlanPrice original={hasOriginal ? p.originalPriceInPaise : 0} price={p.priceInPaise} hasOffer={onOffer} />
                  <p className="mt-1 text-xs capitalize text-white/70">{p.category || 'basic'} · {p.durationDays} days</p>
                  <p className="mt-1 text-xs text-white/60">{getPlanFeatureLabels(p.features).join(' · ') || 'No optional features included'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    className="rounded-full border border-brand px-3 py-1 text-xs hover:border-brand"
                    title={p.active ? 'Deactivate plan' : 'Activate plan'}
                  >
                    {p.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    aria-label={`Edit ${p.name}`}
                    title="Edit plan"
                    className="rounded-full border border-brand p-1.5 text-white transition hover:bg-brand hover:text-charcoal"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    disabled={isDeleting}
                    aria-label={`Delete ${p.name}`}
                    title="Delete plan"
                    className="rounded-full border border-brand p-1.5 text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={save} className="space-y-2 rounded-2xl border border-brand bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{editingId ? 'Edit plan' : 'Create plan'}</h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-white/70 transition hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>

        <input required placeholder="Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 text-sm" />

        <input placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 text-sm" />

        <label className="block text-xs font-semibold text-white">Plan category</label>
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 text-sm">
          <option value="basic">Basic membership</option>
          <option value="professional">Professional training</option>
        </select>

        <label className="block text-xs font-semibold text-white">Original price (₹) — shown struck through</label>
        <input type="number" min="0" step="1" required placeholder="e.g. 2500" value={form.originalPrice}
          onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 text-sm" />

        <label className="block text-xs font-semibold text-white">Offer price (₹) — what the member pays</label>
        <input type="number" min="1" step="1" required placeholder="e.g. 2000" value={form.offerPrice}
          onChange={(e) => setForm({ ...form, offerPrice: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 text-sm" />

        <input required type="number" min="1" placeholder="Duration days" value={form.durationDays}
          onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 text-sm" />

        <input type="number" min="0" placeholder="Joining fee (₹, optional)" value={form.joiningFee}
          onChange={(e) => setForm({ ...form, joiningFee: e.target.value })}
          className="w-full rounded-lg bg-card px-3 py-2 text-sm" />

        <fieldset className="space-y-2 rounded-xl border border-brand/40 p-3">
          <legend className="px-1 text-sm font-bold">Included features</legend>
          {planFeatureOptions.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.features[key] === true}
                onChange={(e) => setForm({
                  ...form,
                  features: { ...form.features, [key]: e.target.checked },
                })}
                className="accent-brand"
              />
              {label}
            </label>
          ))}
          {form.features.gym_access && (
            <label className="block text-xs font-semibold">
              Daily gym-session limit (0 = unlimited)
              <input
                type="number"
                min="0"
                step="1"
                value={form.features.daily_session_limit}
                onChange={(e) => setForm({
                  ...form,
                  features: { ...form.features, daily_session_limit: Number(e.target.value) },
                })}
                className="mt-1 w-full rounded-lg bg-card px-3 py-2 text-sm"
              />
            </label>
          )}
        </fieldset>

        {editingId && (
          <>
          <label className="flex items-center gap-2 text-xs font-semibold text-white">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="accent-brand"
            />
            Active (visible to members)
          </label>
          <label className="flex items-start gap-2 text-xs font-semibold text-white">
            <input
              type="checkbox"
              checked={!!form.applyToExistingMemberships}
              onChange={(e) => setForm({ ...form, applyToExistingMemberships: e.target.checked })}
              className="mt-0.5 accent-brand"
            />
            Apply changed feature entitlements to existing active subscriptions for this plan.
          </label>
          </>
        )}

        {error && <p className="text-xs font-semibold text-brand">{error}</p>}

        {previewOffer > 0 && (
          <div className="rounded-xl border border-dashed border-brand p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white">Member preview</p>
            <PlanPrice original={previewOriginal} price={previewOffer} hasOffer={previewHasOffer} />
          </div>
        )}

        <div className="flex gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-full border border-brand px-4 py-2 font-bold text-white"
            >
              Cancel
            </button>
          )}
          <button className="w-full rounded-full bg-brand px-4 py-2 font-bold text-white">
            {editingId ? 'Update plan' : 'Save plan'}
          </button>
        </div>
      </form>
    </div>
  );
}

function MembersTab() {
  const [q, setQ] = useState('');
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [error, setError] = useState('');
  async function load() {
    const [memberData, trainerData] = await Promise.all([
      api.get(`/members?q=${encodeURIComponent(q)}`),
      api.get('/members/trainers'),
    ]);
    setMembers(memberData.members || []);
    setTrainers(trainerData.trainers || []);
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, [q]);
  async function assign(memberId, trainerId) {
    setError('');
    try {
      await api.patch(`/members/${memberId}/trainer`, { trainerId: trainerId || null });
      await load();
    } catch (e) { setError(e.message); }
  }
  return (
    <div>
      <input placeholder="Search by name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-lg bg-card px-3 py-2" />
      {error && <p role="alert" className="mt-2 text-sm text-brand">{error}</p>}
      <div className="mt-3 divide-y divide-brand rounded-2xl border border-brand">
        {members.map((m) => (
          <div key={m._id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div>
              <p className="font-semibold">{m.name} · {m.activeMembership?.planSnapshot?.name || 'No active membership'}</p>
              <p className="text-white/70">{m.email} · {m.phone || '—'}</p>
              {m.activeMembership && <p className="text-xs text-white/60">
                {m.activeMembership.status} · {new Date(m.activeMembership.startDate).toLocaleDateString('en-IN')} – {new Date(m.activeMembership.expiryDate).toLocaleDateString('en-IN')} · Reports: {getPlanFeatureLabels(m.activeMembership.planSnapshot?.features).join(', ') || 'none'}
              </p>}
            </div>
            {m.activeMembership && <label className="text-xs">
              Assigned trainer
              <select value={m.activeMembership.assignedTrainer || ''} onChange={(e) => assign(m._id, e.target.value)} className="ml-2 rounded bg-card px-2 py-1">
                <option value="">Unassigned</option>
                {trainers.map((trainer) => <option key={trainer._id} value={trainer._id}>{trainer.name}</option>)}
              </select>
            </label>}
          </div>
        ))}
        {members.length === 0 && <p className="p-3 text-white">No members found.</p>}
      </div>
    </div>
  );
}

function PaymentsTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ memberId: '', planId: '', amountInPaise: 0, method: 'cash', notes: '' });
  const [plans, setPlans] = useState([]);
  async function load() { setItems((await api.get('/payments')).payments); }
  useEffect(() => { load(); api.get('/plans/all').then((d) => setPlans(d.plans)); }, []);
  async function save(e) {
    e.preventDefault();
    await api.post('/payments/manual', { ...form, amountInPaise: Number(form.amountInPaise) });
    setForm({ memberId: '', planId: '', amountInPaise: 0, method: 'cash', notes: '' });
    await load();
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-bold">All payments</h3>
        <div className="mt-2 divide-y divide-brand rounded-2xl border border-brand">
          {items.map((p) => (
            <div key={p._id} className="flex justify-between p-3 text-sm">
              <span>{p.member?.name || '—'}</span>
              <span>₹{p.amountInPaise / 100} · {p.method} · {p.status}</span>
            </div>
          ))}
          {items.length === 0 && <p className="p-3 text-white">No payments yet.</p>}
        </div>
      </div>
      <form onSubmit={save} className="space-y-2 rounded-2xl border border-brand bg-card p-4">
        <h3 className="font-bold">Record offline payment</h3>
        <input required placeholder="Member ID" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 text-sm" />
        <select required value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 text-sm">
          <option value="">Select plan</option>
          {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <input required type="number" placeholder="Amount in paise" value={form.amountInPaise} onChange={(e) => setForm({ ...form, amountInPaise: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 text-sm" />
        <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 text-sm">
          <option value="cash">Cash</option><option value="upi">UPI</option><option value="other">Other</option>
        </select>
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 text-sm" />
        <button className="w-full rounded-full bg-brand px-4 py-2 font-bold text-white">Record + activate</button>
      </form>
    </div>
  );
}

function AttendanceTab() {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [items, setItems] = useState([]);
  async function load() { setItems((await api.get(`/attendance?date=${date}`)).attendance); }
  useEffect(() => { load(); }, [date]);
  return (
    <div>
      <p className="mb-3 text-sm text-white/60">QR and manual check-in have been removed. Attendance entry will be connected to the gym fingerprint system when its integration details are available.</p>
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded bg-card px-3 py-2 text-sm" />
      </div>
      <div className="mt-3 divide-y divide-brand rounded-2xl border border-brand">
        {items.map((a) => (
          <div key={a._id} className="flex justify-between p-3 text-sm">
            <span>{a.member?.name || a.member}</span>
            <span className="text-white">{new Date(a.checkedInAt).toLocaleTimeString('en-IN')}</span>
          </div>
        ))}
        {items.length === 0 && <p className="p-3 text-white">No check-ins.</p>}
      </div>
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/settings').then((d) => setS(d.settings || {})); }, []);
  if (!s) return <p className="text-white">Loading…</p>;
  async function save(e) {
    e.preventDefault();
    await api.put('/settings', s);
    alert('Saved');
  }
  const field = (key, label, type = 'text') => (
    <label className="block text-sm">
      <span className="text-white">{label}</span>
      <input type={type} value={s[key] || ''} onChange={(e) => setS({ ...s, [key]: e.target.value })} className="mt-1 w-full rounded-lg bg-card px-3 py-2" />
    </label>
  );
  return (
    <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
      {field('businessName', 'Business name')}
      {field('phone', 'Phone')}
      {field('whatsapp', 'WhatsApp number (include country code)')}
      {field('email', 'Email')}
      {field('address', 'Address')}
      {field('openingHours', 'Opening hours')}
      {field('mapLink', 'Map link')}
      <label className="block text-sm md:col-span-2">
        <span className="text-white">Refund policy</span>
        <textarea value={s.refundPolicy || ''} onChange={(e) => setS({ ...s, refundPolicy: e.target.value })} className="mt-1 w-full rounded-lg bg-card px-3 py-2" rows={3} />
      </label>
      <label className="block text-sm md:col-span-2">
        <span className="text-white">Chatbot business guidance</span>
        <textarea value={s.chatbotKnowledge || ''} onChange={(e) => setS({ ...s, chatbotKnowledge: e.target.value })} className="mt-1 w-full rounded-lg bg-card px-3 py-2" rows={5} maxLength={5000} placeholder="Add public gym information, common questions, and approved guidance for the chatbot." />
        <span className="mt-1 block text-xs text-white/60">Do not add member-specific, confidential, or sensitive information.</span>
      </label>
      <button className="rounded-full bg-brand px-4 py-2 font-bold text-white md:col-span-2">Save settings</button>
    </form>
  );
}
