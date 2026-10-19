import { useEffect, useState } from 'react';
import { api } from '../api';

const TABS = ['Overview', 'Plans', 'Members', 'Payments', 'Leads', 'Attendance', 'Settings', 'Reminders'];

export default function OwnerDashboard() {
  const [tab, setTab] = useState('Overview');
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-black">Owner dashboard</h1>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-electricblue pb-3">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? 'bg-gymred text-white font-bold' : 'border border-electricblue'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {tab === 'Overview' && <Overview />}
        {tab === 'Plans' && <PlansTab />}
        {tab === 'Members' && <MembersTab />}
        {tab === 'Payments' && <PaymentsTab />}
        {tab === 'Leads' && <LeadsTab />}
        {tab === 'Attendance' && <AttendanceTab />}
        {tab === 'Settings' && <SettingsTab />}
        {tab === 'Reminders' && <RemindersTab />}
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
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-electricblue">At a glance</p>
        <h2 className="mt-1 text-2xl font-black">Gym statistics</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ['Members', s.members],
          ['Active', s.activeMemberships],
          ['Expiring in 7 days', s.expiringIn7Days],
          ['New leads', s.newLeads],
          ['Collected today (₹)', s.collectedTodayPaise / 100],
          ['Collected this month (₹)', s.collectedMonthPaise / 100],
          ['Attendance today', s.attendanceToday],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-electricblue bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-white">{label}</p>
            <p className="mt-1 text-2xl font-black text-white">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-electricblue bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold">Membership health</h3>
              <p className="mt-1 text-sm text-white">Active memberships compared with all members</p>
            </div>
            <span className="text-2xl font-black text-electricblue">{activeMemberRate}%</span>
          </div>
          <div
            className="mt-5 h-3 overflow-hidden rounded-full bg-charcoal"
            role="progressbar"
            aria-label="Active membership rate"
            aria-valuenow={activeMemberRate}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div className="h-full rounded-full bg-electricblue transition-all" style={{ width: `${activeMemberRate}%` }} />
          </div>
          <p className="mt-2 text-xs text-white">{s.activeMemberships} active of {s.members} total members</p>
        </section>
        <section className="rounded-2xl border border-electricblue bg-card p-5">
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
                  <div className="h-full rounded-full bg-electricblue" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      </div>
      <h3 className="mt-8 font-bold">Recent payments</h3>
      <div className="mt-2 divide-y divide-electricblue rounded-2xl border border-electricblue">
        {d.recentPayments.map((p) => (
          <div key={p._id} className="flex justify-between p-3 text-sm">
            <span>{p.member?.name || '—'}</span>
            <span>₹{(p.amountInPaise / 100).toLocaleString('en-IN')} · {p.method}</span>
            <span className="text-white">{new Date(p.paidAt).toLocaleDateString('en-IN')}</span>
          </div>
        ))}
        {d.recentPayments.length === 0 && <p className="p-3 text-white">No payments yet.</p>}
      </div>
    </div>
  );
}

function PlansTab() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', priceInPaise: 0, durationDays: 30, joiningFeeInPaise: 0 });
  async function load() { setPlans((await api.get('/plans/all')).plans); }
  useEffect(() => { load(); }, []);
  async function save(e) {
    e.preventDefault();
    await api.post('/plans', { ...form, priceInPaise: Number(form.priceInPaise), durationDays: Number(form.durationDays), joiningFeeInPaise: Number(form.joiningFeeInPaise) });
    setForm({ name: '', description: '', priceInPaise: 0, durationDays: 30, joiningFeeInPaise: 0 });
    await load();
  }
  async function toggle(p) { await api.patch(`/plans/${p._id}`, { active: !p.active }); await load(); }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-bold">Existing plans</h3>
        <div className="mt-2 space-y-2">
          {plans.map((p) => (
            <div key={p._id} className="flex items-center justify-between rounded-xl border border-electricblue bg-card p-3">
              <div>
                <p className="font-semibold">{p.name} {p.active ? '' : '(inactive)'}</p>
                <p className="text-sm text-white">₹{p.priceInPaise / 100} · {p.durationDays}d</p>
              </div>
              <button onClick={() => toggle(p)} className="rounded-full border border-electricblue px-3 py-1 text-xs hover:border-electricblue">{p.active ? 'Deactivate' : 'Activate'}</button>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={save} className="space-y-2 rounded-2xl border border-electricblue bg-card p-4">
        <h3 className="font-bold">Create plan</h3>
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 text-sm" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 text-sm" />
        <input required type="number" placeholder="Price in paise" value={form.priceInPaise} onChange={(e) => setForm({ ...form, priceInPaise: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 text-sm" />
        <input required type="number" placeholder="Duration days" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} className="w-full rounded-lg bg-card px-3 py-2 text-sm" />
        <button className="w-full rounded-full bg-gymred px-4 py-2 font-bold text-white">Save plan</button>
      </form>
    </div>
  );
}

function MembersTab() {
  const [q, setQ] = useState('');
  const [members, setMembers] = useState([]);
  useEffect(() => { api.get(`/members?q=${encodeURIComponent(q)}`).then((d) => setMembers(d.members)); }, [q]);
  return (
    <div>
      <input placeholder="Search by name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-lg bg-card px-3 py-2" />
      <div className="mt-3 divide-y divide-electricblue rounded-2xl border border-electricblue">
        {members.map((m) => (
          <div key={m._id} className="flex justify-between p-3 text-sm">
            <span>{m.name}</span>
            <span className="text-white">{m.email} · {m.phone || '—'}</span>
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
        <div className="mt-2 divide-y divide-electricblue rounded-2xl border border-electricblue">
          {items.map((p) => (
            <div key={p._id} className="flex justify-between p-3 text-sm">
              <span>{p.member?.name || '—'}</span>
              <span>₹{p.amountInPaise / 100} · {p.method} · {p.status}</span>
            </div>
          ))}
          {items.length === 0 && <p className="p-3 text-white">No payments yet.</p>}
        </div>
      </div>
      <form onSubmit={save} className="space-y-2 rounded-2xl border border-electricblue bg-card p-4">
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
        <button className="w-full rounded-full bg-gymred px-4 py-2 font-bold text-white">Record + activate</button>
      </form>
    </div>
  );
}

function LeadsTab() {
  const [leads, setLeads] = useState([]);
  useEffect(() => { api.get('/leads').then((d) => setLeads(d.leads)); }, []);
  async function setStatus(id, status) { await api.patch(`/leads/${id}`, { status }); const d = await api.get('/leads'); setLeads(d.leads); }
  return (
    <div className="divide-y divide-electricblue rounded-2xl border border-electricblue">
      {leads.map((l) => (
        <div key={l._id} className="flex items-center justify-between p-3 text-sm">
          <div>
            <p className="font-semibold">{l.name} · {l.phone}</p>
            <p className="text-white">{l.message || '—'}</p>
          </div>
          <select value={l.status} onChange={(e) => setStatus(l._id, e.target.value)} className="rounded bg-card px-2 py-1 text-xs">
            {['new', 'contacted', 'trial', 'converted', 'lost'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      ))}
      {leads.length === 0 && <p className="p-3 text-white">No leads yet.</p>}
    </div>
  );
}

function AttendanceTab() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([]);
  const [memberId, setMemberId] = useState('');
  async function load() { setItems((await api.get(`/attendance?date=${date}`)).attendance); }
  useEffect(() => { load(); }, [date]);
  async function checkIn() { await api.post('/attendance/check-in', { memberId }); setMemberId(''); await load(); }
  return (
    <div>
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded bg-card px-3 py-2 text-sm" />
        <input placeholder="Member ID for check-in" value={memberId} onChange={(e) => setMemberId(e.target.value)} className="flex-1 rounded bg-card px-3 py-2 text-sm" />
        <button onClick={checkIn} className="rounded-full bg-gymred px-4 py-2 text-sm font-bold text-white">Check in</button>
      </div>
      <div className="mt-3 divide-y divide-electricblue rounded-2xl border border-electricblue">
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
      <button className="rounded-full bg-gymred px-4 py-2 font-bold text-white md:col-span-2">Save settings</button>
    </form>
  );
}

function RemindersTab() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/reminders').then((d) => setItems(d.reminders)); }, []);
  return (
    <div className="divide-y divide-electricblue rounded-2xl border border-electricblue">
      {items.map((r) => (
        <div key={r._id} className="flex justify-between p-3 text-sm">
          <span>{r.member?.name || '—'} · stage {r.stage}</span>
          <span className={r.status === 'failed' ? 'text-gymred' : 'text-white'}>{r.status}</span>
        </div>
      ))}
      {items.length === 0 && <p className="p-3 text-white">No reminders yet.</p>}
    </div>
  );
}