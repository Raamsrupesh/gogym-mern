import { useEffect, useState } from 'react';
import { api } from '../api';

const tabs = ['Workouts', 'Attendance', 'Progress', 'Trainer notes', 'Diet guidance', 'Transformations', 'Referrals', 'Equipment', 'Feedback'];
const fieldClass = 'w-full rounded-lg border border-electricblue/40 bg-charcoal px-3 py-2 text-sm text-white';
const cardClass = 'rounded-2xl border border-electricblue/50 bg-card p-4';

function useLoad(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const refresh = async () => {
    setError('');
    try { setData(await api.get(path)); } catch (e) { setError(e.message); }
  };
  useEffect(() => { refresh(); }, deps);
  return { data, error, refresh };
}

function MemberSelect({ members, value, onChange }) {
  return (
    <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">Choose a member</option>
      {members.map((member) => <option key={member._id} value={member._id}>{member.name} · {member.email}</option>)}
    </select>
  );
}

function StaffWorkspace() {
  const [tab, setTab] = useState(tabs[0]);
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [planForm, setPlanForm] = useState({ title: '', description: '', exercises: '[{"name":"Squat","sets":3,"reps":"8-10","targetWeight":0,"restSeconds":90,"instructions":""}]' });
  const [editingWorkoutId, setEditingWorkoutId] = useState('');
  const [planStatus, setPlanStatus] = useState('published');
  const [noteForm, setNoteForm] = useState({ weekOf: new Date().toISOString().slice(0, 10), observations: '', strengths: '', improvements: '', goals: '', nextWeekAdjustments: '', visibility: 'private' });
  const [editingNoteId, setEditingNoteId] = useState('');
  const [performanceForm, setPerformanceForm] = useState({ exercise: '', weight: '', sets: 3, reps: 10, notes: '' });
  const [dietForm, setDietForm] = useState({ startsAt: '', endsAt: '', meals: '[{"name":"Breakfast","timing":"8:00 AM","suggestions":"Add meal guidance"}]', notes: '' });
  const [transformationForm, setTransformationForm] = useState({ memberId: '', description: '', beforeDate: '', afterDate: '', beforeImage: null, afterImage: null });
  const [equipmentForm, setEquipmentForm] = useState({ name: '', category: '', brand: '', model: '', serialNumber: '', location: '', status: 'operational', nextMaintenanceAt: '', purchaseDate: '', purchaseCost: '' });
  const [editingEquipmentId, setEditingEquipmentId] = useState('');
  const [maintenanceForm, setMaintenanceForm] = useState({ equipmentId: '', kind: 'maintenance', description: '', scheduledAt: '', cost: '', notes: '' });
  const [feedbackResponse, setFeedbackResponse] = useState({});
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [referralConfig, setReferralConfig] = useState({
    referralsEnabled: false,
    referralReward: '',
    newMemberDiscountInPaise: 0,
    referrerDiscountInPaise: 0,
  });

  async function run(action, success = 'Saved') {
    setError('');
    setMessage('');
    try { await action(); setMessage(success); }
    catch (e) { setError(e.message); }
  }
  async function loadMembers() {
    try { setMembers((await api.get('/members?limit=500')).members || []); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { loadMembers(); }, []);

  const attendance = useLoad(`/attendance?date=${date}`, [date, tab]);
  const workoutPlans = useLoad(`/features/workout-plans?memberId=${memberId}`, [memberId, tab]);
  const performance = useLoad(`/features/performance?memberId=${memberId}`, [memberId, tab]);
  const notes = useLoad(`/features/trainer-notes?memberId=${memberId}`, [memberId, tab]);
  const diets = useLoad(`/features/diet-plans?memberId=${memberId}`, [memberId, tab]);
  const transformations = useLoad('/features/transformations', [tab]);
  const equipment = useLoad('/features/equipment', [tab]);
  const feedbackPath = feedbackFilter === 'all' ? '/features/feedback' : `/features/feedback?resolved=${feedbackFilter}`;
  const feedback = useLoad(feedbackPath, [tab, feedbackFilter]);
  const referrals = useLoad('/features/referrals/all', [tab]);

  useEffect(() => {
    if (tab === 'Referrals') api.get('/features/referrals/config')
      .then((data) => setReferralConfig(data.config))
      .catch((e) => setError(e.message));
  }, [tab]);

  async function savePlan(e) {
    e.preventDefault();
    await run(async () => {
      const payload = { memberId, ...planForm, exercises: JSON.parse(planForm.exercises), status: planStatus };
      if (editingWorkoutId) await api.patch(`/features/workout-plans/${editingWorkoutId}`, payload);
      else await api.post('/features/workout-plans', payload);
      setEditingWorkoutId('');
      setPlanForm({ ...planForm, title: '', description: '' });
      await workoutPlans.refresh();
    }, planStatus === 'published' ? 'Workout plan published' : 'Workout plan saved as draft');
  }

  async function saveNote(e) {
    e.preventDefault();
    await run(async () => {
      if (editingNoteId) await api.patch(`/features/trainer-notes/${editingNoteId}`, noteForm);
      else await api.post('/features/trainer-notes', { memberId, ...noteForm });
      setEditingNoteId('');
      await notes.refresh();
    }, noteForm.visibility === 'published' ? 'Notes published' : 'Private trainer notes saved');
  }

  async function savePerformance(e) {
    e.preventDefault();
    await run(async () => {
      await api.post('/features/performance', { memberId, ...performanceForm, weight: performanceForm.weight === '' ? undefined : Number(performanceForm.weight), sets: Number(performanceForm.sets), reps: Number(performanceForm.reps) });
      await performance.refresh();
    }, 'Workout performance recorded');
  }

  async function saveDiet(e) {
    e.preventDefault();
    await run(async () => {
      await api.post('/features/diet-plans', { memberId, ...dietForm, meals: JSON.parse(dietForm.meals) });
      await diets.refresh();
    }, 'Diet guidance published');
  }

  async function uploadTransformation(e) {
    e.preventDefault();
    const body = new FormData();
    Object.entries(transformationForm).forEach(([key, value]) => { if (value) body.append(key, value); });
    await run(async () => {
      await api.postRaw('/features/transformations', body);
      setTransformationForm({ memberId: '', description: '', beforeDate: '', afterDate: '', beforeImage: null, afterImage: null });
      e.target.reset();
      await transformations.refresh();
    }, 'Transformation saved as draft; member consent is required before publishing');
  }

  async function saveEquipment(e) {
    e.preventDefault();
    await run(async () => {
      const payload = {
        ...equipmentForm,
        nextMaintenanceAt: equipmentForm.nextMaintenanceAt || undefined,
        purchaseDate: equipmentForm.purchaseDate || undefined,
        purchaseCostInPaise: equipmentForm.purchaseCost === '' ? undefined : Math.round(Number(equipmentForm.purchaseCost) * 100),
      };
      if (editingEquipmentId) await api.put(`/features/equipment/${editingEquipmentId}`, payload);
      else await api.post('/features/equipment', payload);
      setEditingEquipmentId('');
      setEquipmentForm({ name: '', category: '', brand: '', model: '', serialNumber: '', location: '', status: 'operational', nextMaintenanceAt: '', purchaseDate: '', purchaseCost: '' });
      await equipment.refresh();
    }, editingEquipmentId ? 'Equipment updated' : 'Equipment added');
  }

  async function saveMaintenance(e) {
    e.preventDefault();
    await run(async () => {
      await api.post(`/features/equipment/${maintenanceForm.equipmentId}/maintenance`, {
        ...maintenanceForm,
        costInPaise: maintenanceForm.cost === '' ? 0 : Math.round(Number(maintenanceForm.cost) * 100),
      });
      await equipment.refresh();
    }, 'Maintenance entry recorded');
  }

  async function updateFeedback(id, updates) {
    await run(async () => { await api.patch(`/features/feedback/${id}`, updates); await feedback.refresh(); }, 'Feedback updated');
  }

  async function updateReferral(id, status) {
    await run(async () => {
      await api.patch(`/features/referrals/${id}`, { status });
      await referrals.refresh();
    }, 'Referral updated');
  }

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-black">Gym operations</h2>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((name) => <button key={name} onClick={() => setTab(name)} className={`shrink-0 rounded-full px-4 py-2 text-sm ${tab === name ? 'bg-gymred font-bold text-white' : 'border border-electricblue'}`}>{name}</button>)}
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-gymred/60 bg-gymred/10 p-3 text-sm text-gymred">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-lg border border-electricblue/40 p-3 text-sm text-electricblue">{message}</p>}

      {tab === 'Workouts' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={savePlan} className={`${cardClass} space-y-3`}>
          <h3 className="font-bold">Assign workout plan</h3>
          <MemberSelect members={members} value={memberId} onChange={setMemberId} />
          <input required className={fieldClass} placeholder="Plan title" value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} />
          <textarea className={fieldClass} placeholder="Plan description" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
          <textarea required rows="8" className={fieldClass} aria-label="Exercises in JSON format" value={planForm.exercises} onChange={(e) => setPlanForm({ ...planForm, exercises: e.target.value })} />
          <p className="text-xs text-white/60">Exercises JSON fields: name, sets, reps, targetWeight, restSeconds, instructions, week, day.</p>
          <select className={fieldClass} value={planStatus} onChange={(e) => setPlanStatus(e.target.value)}><option value="published">Publish and notify member</option><option value="draft">Save draft</option></select>
          <button className="rounded-full bg-gymred px-5 py-2 font-bold text-white">{editingWorkoutId ? 'Update plan' : 'Save plan'}</button>
        </form>
        <div className={cardClass}><h3 className="font-bold">Assigned plans</h3>{workoutPlans.error && <p className="text-sm text-gymred">{workoutPlans.error}</p>}
          {(workoutPlans.data?.plans || []).map((plan) => <article key={plan._id} className="mt-3 border-t border-electricblue/30 pt-3"><p className="font-semibold">{plan.title} · {plan.member?.name}</p><p className="text-xs text-white/60">{plan.status}</p><ul className="mt-2 list-inside list-disc text-sm">{plan.exercises.map((exercise, i) => <li key={`${exercise.name}-${i}`}>{exercise.name}: {exercise.sets} × {exercise.reps}{exercise.targetWeight ? ` · ${exercise.targetWeight} kg` : ''}</li>)}</ul><div className="mt-2 flex gap-3"><button onClick={() => { setEditingWorkoutId(plan._id); setMemberId(plan.member?._id || memberId); setPlanForm({ title: plan.title, description: plan.description || '', exercises: JSON.stringify(plan.exercises, null, 2) }); setPlanStatus(plan.status === 'archived' ? 'draft' : plan.status); }} className="text-xs text-electricblue underline">Edit</button><button onClick={() => run(async () => { await api.patch(`/features/workout-plans/${plan._id}`, { status: 'archived' }); await workoutPlans.refresh(); }, 'Plan archived')} className="text-xs text-gymred underline">Archive</button></div></article>)}
          {!workoutPlans.data?.plans?.length && <p className="mt-3 text-sm text-white/60">No workout plans found.</p>}
        </div>
      </div>}

      {tab === 'Attendance' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className={cardClass + ' lg:col-span-2'}>
          <p className="mb-3 text-sm text-white/60">QR and manual check-in have been removed. Attendance entry can be connected to the gym fingerprint system when its integration details are available.</p>
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Attendance history</h3><input type="date" className={fieldClass + ' w-auto'} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="mt-3 divide-y divide-electricblue/30">{(attendance.data?.attendance || []).map((row) => <p key={row._id} className="flex justify-between py-2 text-sm"><span>{row.member?.name || 'Member'}</span><span className="text-white/60">{new Date(row.checkedInAt).toLocaleTimeString('en-IN')} · {row.method}</span></p>)}{!attendance.data?.attendance?.length && <p className="py-3 text-sm text-white/60">No check-ins for this date.</p>}</div>
        </div>
      </div>}

      {tab === 'Progress' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={savePerformance} className={`${cardClass} space-y-3`}><h3 className="font-bold">Record performance</h3><MemberSelect members={members} value={memberId} onChange={setMemberId} /><input required className={fieldClass} placeholder="Exercise or machine" value={performanceForm.exercise} onChange={(e) => setPerformanceForm({ ...performanceForm, exercise: e.target.value })} /><div className="grid grid-cols-3 gap-2"><input type="number" min="0" step="0.5" className={fieldClass} placeholder="Weight kg" value={performanceForm.weight} onChange={(e) => setPerformanceForm({ ...performanceForm, weight: e.target.value })} /><input type="number" min="1" className={fieldClass} placeholder="Sets" value={performanceForm.sets} onChange={(e) => setPerformanceForm({ ...performanceForm, sets: e.target.value })} /><input type="number" min="1" className={fieldClass} placeholder="Reps" value={performanceForm.reps} onChange={(e) => setPerformanceForm({ ...performanceForm, reps: e.target.value })} /></div><textarea className={fieldClass} placeholder="Notes (optional)" value={performanceForm.notes} onChange={(e) => setPerformanceForm({ ...performanceForm, notes: e.target.value })} /><button className="rounded-full bg-gymred px-4 py-2 font-bold">Save performance</button></form>
        <div className={cardClass}><h3 className="font-bold">Member training history</h3><MemberSelect members={members} value={memberId} onChange={setMemberId} /><PerformanceChart records={performance.data?.records || []} /><PerformanceRows records={performance.data?.records || []} /></div>
      </div>}

      {tab === 'Trainer notes' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={saveNote} className={`${cardClass} space-y-3`}><h3 className="font-bold">Notes for next week</h3><MemberSelect members={members} value={memberId} onChange={setMemberId} /><label className="text-xs text-white/70">Week of<input type="date" required className={fieldClass} value={noteForm.weekOf} onChange={(e) => setNoteForm({ ...noteForm, weekOf: e.target.value })} /></label>{[['observations','Training observations'],['strengths','Strengths'],['improvements','Areas to improve'],['goals','Goals'],['nextWeekAdjustments','Next-week adjustments']].map(([key,label]) => <textarea key={key} className={fieldClass} placeholder={label} value={noteForm[key]} onChange={(e) => setNoteForm({ ...noteForm, [key]: e.target.value })} />)}<select className={fieldClass} value={noteForm.visibility} onChange={(e) => setNoteForm({ ...noteForm, visibility: e.target.value })}><option value="private">Private trainer/owner note</option><option value="published">Publish to member</option></select><button className="rounded-full bg-gymred px-4 py-2 font-bold">Save notes</button></form>
        <div className={cardClass}><h3 className="font-bold">Previous weekly notes</h3>{(notes.data?.notes || []).map((note) => <article key={note._id} className="mt-3 border-t border-electricblue/30 pt-3"><p className="font-semibold">{new Date(note.weekOf).toLocaleDateString('en-IN')} · {note.visibility}</p><p className="mt-1 text-sm">{note.observations || note.goals || 'No observations recorded.'}</p><div className="mt-2 flex gap-3"><button onClick={() => { setEditingNoteId(note._id); setMemberId(note.member || memberId); setNoteForm({ weekOf: new Date(note.weekOf).toISOString().slice(0, 10), observations: note.observations || '', strengths: note.strengths || '', improvements: note.improvements || '', goals: note.goals || '', nextWeekAdjustments: note.nextWeekAdjustments || '', visibility: note.visibility }); }} className="text-xs text-electricblue underline">Edit</button>{note.visibility === 'private' && <button onClick={() => run(async () => { await api.patch(`/features/trainer-notes/${note._id}`, { visibility: 'published' }); await notes.refresh(); }, 'Notes published')} className="text-xs text-electricblue underline">Publish to member</button>}</div></article>)}</div>
      </div>}

      {tab === 'Diet guidance' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={saveDiet} className={`${cardClass} space-y-3`}><h3 className="font-bold">Publish diet guidance</h3><MemberSelect members={members} value={memberId} onChange={setMemberId} /><p className="text-xs text-white/60">The server checks that the member has an active membership with diet guidance enabled.</p><div className="grid grid-cols-2 gap-2"><label className="text-xs">Starts<input required type="date" className={fieldClass} value={dietForm.startsAt} onChange={(e) => setDietForm({ ...dietForm, startsAt: e.target.value })} /></label><label className="text-xs">Ends<input required type="date" className={fieldClass} value={dietForm.endsAt} onChange={(e) => setDietForm({ ...dietForm, endsAt: e.target.value })} /></label></div><textarea required rows="6" className={fieldClass} aria-label="Diet meals JSON" value={dietForm.meals} onChange={(e) => setDietForm({ ...dietForm, meals: e.target.value })} /><textarea className={fieldClass} placeholder="Additional guidance" value={dietForm.notes} onChange={(e) => setDietForm({ ...dietForm, notes: e.target.value })} /><button className="rounded-full bg-gymred px-4 py-2 font-bold">Publish diet plan</button></form>
        <div className={cardClass}><h3 className="font-bold">Member diet plans</h3>{(diets.data?.diets || []).map((diet) => <article key={diet._id} className="mt-3 border-t border-electricblue/30 pt-3"><p>{new Date(diet.startsAt).toLocaleDateString('en-IN')} – {new Date(diet.endsAt).toLocaleDateString('en-IN')}</p><ul className="mt-2 list-inside list-disc text-sm">{diet.meals.map((meal, i) => <li key={i}>{meal.name} · {meal.timing}: {meal.suggestions}</li>)}</ul></article>)}{diets.error && <p className="mt-2 text-sm text-white/60">{diets.error}</p>}</div>
      </div>}

      {tab === 'Transformations' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={uploadTransformation} className={`${cardClass} space-y-3`}><h3 className="font-bold">Create private draft</h3><MemberSelect members={members} value={transformationForm.memberId} onChange={(value) => setTransformationForm({ ...transformationForm, memberId: value })} /><label className="block text-sm">Before photo<input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 w-full text-sm" onChange={(e) => setTransformationForm({ ...transformationForm, beforeImage: e.target.files?.[0] })} /></label><label className="block text-sm">After photo<input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 w-full text-sm" onChange={(e) => setTransformationForm({ ...transformationForm, afterImage: e.target.files?.[0] })} /></label><div className="grid grid-cols-2 gap-2"><input type="date" className={fieldClass} aria-label="Before date" onChange={(e) => setTransformationForm({ ...transformationForm, beforeDate: e.target.value })} /><input type="date" className={fieldClass} aria-label="After date" onChange={(e) => setTransformationForm({ ...transformationForm, afterDate: e.target.value })} /></div><textarea className={fieldClass} placeholder="Description" value={transformationForm.description} onChange={(e) => setTransformationForm({ ...transformationForm, description: e.target.value })} /><button className="rounded-full bg-gymred px-4 py-2 font-bold">Upload draft</button></form>
        <div className={cardClass}><h3 className="font-bold">Consent and publication</h3>{(transformations.data?.transformations || []).map((item) => <article key={item._id} className="mt-3 border-t border-electricblue/30 pt-3"><p>{item.member?.name} · {item.status} · consent {item.consentGranted ? 'granted' : 'pending'}</p><div className="mt-2 flex gap-3"><PrivateImage src={`/features/transformations/${item._id}/image/before`} /><PrivateImage src={`/features/transformations/${item._id}/image/after`} /></div>{item.consentGranted && <div className="mt-2 flex gap-2">{['published','archived','draft'].map((status) => <button key={status} onClick={() => run(async () => { await api.patch(`/features/transformations/${item._id}`, { status }); await transformations.refresh(); }, `Transformation ${status}`)} className="rounded border border-electricblue px-2 py-1 text-xs">{status}</button>)}</div>}</article>)}</div>
      </div>}

      {tab === 'Referrals' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={(e) => { e.preventDefault(); run(async () => { const data = await api.put('/features/referrals/config', referralConfig); setReferralConfig(data.config); }, 'Referral rules saved'); }} className={`${cardClass} space-y-3`}>
          <h3 className="font-bold">Referral rules</h3>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!referralConfig.referralsEnabled} onChange={(e) => setReferralConfig({ ...referralConfig, referralsEnabled: e.target.checked })} /> Enable referral codes</label>
          <label className="block text-sm">New member discount (₹)
            <input type="number" min="0" step="0.01" className={fieldClass + ' mt-1'} value={(referralConfig.newMemberDiscountInPaise || 0) / 100} onChange={(e) => setReferralConfig({ ...referralConfig, newMemberDiscountInPaise: Math.round(Number(e.target.value || 0) * 100) })} />
          </label>
          <label className="block text-sm">Referrer reward discount (₹)
            <input type="number" min="0" step="0.01" className={fieldClass + ' mt-1'} value={(referralConfig.referrerDiscountInPaise || 0) / 100} onChange={(e) => setReferralConfig({ ...referralConfig, referrerDiscountInPaise: Math.round(Number(e.target.value || 0) * 100) })} />
          </label>
          <textarea className={fieldClass} placeholder="Reward description (optional)" value={referralConfig.referralReward || ''} onChange={(e) => setReferralConfig({ ...referralConfig, referralReward: e.target.value })} />
          <p className="text-xs text-white/60">The new member discount applies to their first successful online membership payment. Referrers earn a discount credit after that payment, applied to their next online membership checkout.</p>
          <button className="rounded-full bg-gymred px-4 py-2 font-bold">Save rules</button>
        </form>
        <div className={cardClass}><h3 className="font-bold">Referral claims</h3>{(referrals.data?.referrals || []).map((item) => <article key={item._id} className="mt-3 border-t border-electricblue/30 pt-3 text-sm"><p>{item.referrer?.name} → {item.referred?.name} · {item.status}</p><p className="text-xs text-white/60">New member: ₹{((item.newMemberDiscountInPaise || 0) / 100).toLocaleString('en-IN')} · Referrer: ₹{((item.referrerDiscountInPaise || 0) / 100).toLocaleString('en-IN')}</p>{item.reward && <p className="text-xs text-white/60">{item.reward}</p>}{item.status === 'pending' && <button onClick={() => updateReferral(item._id, 'rejected')} className="mt-2 rounded border border-gymred px-2 py-1 text-xs text-gymred">Reject claim</button>}</article>)}</div>
      </div>}

      {tab === 'Equipment' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className={`${cardClass} space-y-3`}>
          <form onSubmit={saveEquipment} className="space-y-3"><h3 className="font-bold">{editingEquipmentId ? 'Edit equipment' : 'Add equipment'}</h3><input required className={fieldClass} placeholder="Equipment name" value={equipmentForm.name} onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })} /><div className="grid grid-cols-2 gap-2">{[['category','Category'],['brand','Brand'],['model','Model'],['serialNumber','Serial number'],['location','Location']].map(([key, label]) => <input key={key} className={fieldClass} placeholder={label} value={equipmentForm[key]} onChange={(e) => setEquipmentForm({ ...equipmentForm, [key]: e.target.value })} />)}</div><div className="grid grid-cols-2 gap-2"><label className="text-xs">Purchase date<input type="date" className={fieldClass} value={equipmentForm.purchaseDate} onChange={(e) => setEquipmentForm({ ...equipmentForm, purchaseDate: e.target.value })} /></label><label className="text-xs">Purchase cost (₹)<input type="number" min="0" step="0.01" className={fieldClass} value={equipmentForm.purchaseCost} onChange={(e) => setEquipmentForm({ ...equipmentForm, purchaseCost: e.target.value })} /></label></div><select className={fieldClass} value={equipmentForm.status} onChange={(e) => setEquipmentForm({ ...equipmentForm, status: e.target.value })}>{equipmentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><label className="text-xs">Next maintenance<input type="date" className={fieldClass} value={equipmentForm.nextMaintenanceAt} onChange={(e) => setEquipmentForm({ ...equipmentForm, nextMaintenanceAt: e.target.value })} /></label><button className="rounded-full bg-gymred px-4 py-2 font-bold">{editingEquipmentId ? 'Update equipment' : 'Save equipment'}</button></form>
          <form onSubmit={saveMaintenance} className="border-t border-electricblue/30 pt-4"><h4 className="font-bold">Log fault, repair, or service</h4><select required className={fieldClass + ' mt-2'} value={maintenanceForm.equipmentId} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipmentId: e.target.value })}><option value="">Choose equipment</option>{(equipment.data?.equipment || []).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select><select className={fieldClass + ' mt-2'} value={maintenanceForm.kind} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, kind: e.target.value })}><option value="maintenance">Maintenance</option><option value="fault">Fault</option><option value="repair">Repair</option></select><textarea required className={fieldClass + ' mt-2'} placeholder="Description" value={maintenanceForm.description} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} /><input type="number" min="0" step="0.01" className={fieldClass + ' mt-2'} aria-label="Cost in rupees" placeholder="Cost (₹)" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} /><button className="mt-2 rounded-full border border-electricblue px-4 py-2">Add history entry</button></form>
        </div>
        <div className={cardClass}><h3 className="font-bold">Equipment and maintenance</h3>{(equipment.data?.equipment || []).map((item) => <article key={item._id} className="mt-3 border-t border-electricblue/30 pt-3"><div className="flex justify-between gap-2"><p className="font-semibold">{item.name}</p><span className="text-xs text-white/60">{statusLabel(item.status)}</span></div><p className="text-xs text-white/60">{[item.brand,item.model,item.location].filter(Boolean).join(' · ') || 'No extra details'}</p>{item.purchaseDate && <p className="text-xs text-white/60">Purchased {new Date(item.purchaseDate).toLocaleDateString('en-IN')} · {item.purchaseCostInPaise ? `₹${(item.purchaseCostInPaise / 100).toLocaleString('en-IN')}` : 'cost not recorded'}</p>}{item.nextMaintenanceAt && <p className="text-xs text-gymred">Maintenance due {new Date(item.nextMaintenanceAt).toLocaleDateString('en-IN')}</p>}<ul className="mt-2 text-xs">{(item.maintenance || []).map((entry) => <li key={entry._id}>{entry.kind}: {entry.description}{entry.costInPaise ? ` · ₹${(entry.costInPaise / 100).toLocaleString('en-IN')}` : ''} · {new Date(entry.createdAt).toLocaleDateString('en-IN')}</li>)}</ul><div className="mt-2 flex gap-2"><button onClick={() => { setEditingEquipmentId(item._id); setEquipmentForm({ name: item.name, category: item.category || '', brand: item.brand || '', model: item.model || '', serialNumber: item.serialNumber || '', location: item.location || '', status: item.status, nextMaintenanceAt: item.nextMaintenanceAt ? new Date(item.nextMaintenanceAt).toISOString().slice(0,10) : '', purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().slice(0,10) : '', purchaseCost: item.purchaseCostInPaise ? String(item.purchaseCostInPaise / 100) : '' }); }} className="text-xs text-electricblue underline">Edit</button><select className="rounded bg-charcoal px-2 py-1 text-xs" value={item.status} onChange={(e) => run(async () => { await api.put(`/features/equipment/${item._id}`, { status: e.target.value }); await equipment.refresh(); }, 'Equipment status updated')}>{equipmentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><button onClick={() => run(async () => { await api.delete(`/features/equipment/${item._id}`); await equipment.refresh(); }, 'Equipment archived')} className="text-xs text-gymred underline">Archive</button></div></article>)}</div>
      </div>}

      {tab === 'Feedback' && <div className={`${cardClass} mt-4`}><div className="flex items-center justify-between gap-3"><h3 className="font-bold">Member feedback</h3><select aria-label="Filter feedback by status" className="rounded bg-charcoal px-3 py-2 text-sm" value={feedbackFilter} onChange={(e) => setFeedbackFilter(e.target.value)}><option value="all">All feedback</option><option value="false">Open</option><option value="true">Resolved</option></select></div>{(feedback.data?.feedback || []).map((item) => <article key={item._id} className="mt-3 border-t border-electricblue/30 pt-3"><p className="font-semibold">{item.member?.name} · {item.overall}/5 · {item.category || 'General'} · {item.resolved ? 'Resolved' : 'Open'}</p><p className="text-sm">{item.message || 'No written comment'}</p><div className="mt-2 flex flex-wrap gap-2"><input className={fieldClass + ' max-w-lg'} placeholder="Owner response" value={feedbackResponse[item._id] ?? item.response ?? ''} onChange={(e) => setFeedbackResponse({ ...feedbackResponse, [item._id]: e.target.value })} /><button onClick={() => updateFeedback(item._id, { response: feedbackResponse[item._id] || '' })} className="rounded border border-electricblue px-3 py-1 text-sm">Respond</button><button onClick={() => updateFeedback(item._id, { resolved: !item.resolved })} className="rounded border border-electricblue px-3 py-1 text-sm">{item.resolved ? 'Reopen' : 'Resolve'}</button></div></article>)}{!feedback.data?.feedback?.length && <p className="mt-3 text-sm text-white/60">No feedback submitted yet.</p>}</div>}
    </section>
  );
}

const equipmentStatuses = [
  { value: 'operational', label: 'Operational' },
  { value: 'needs_maintenance', label: 'Needs maintenance' },
  { value: 'under_repair', label: 'Under repair' },
  { value: 'out_of_service', label: 'Out of service' },
];
const statusLabel = (status) => equipmentStatuses.find((item) => item.value === status)?.label || status;

function PerformanceRows({ records }) {
  return <div className="mt-3 max-h-72 divide-y divide-electricblue/30 overflow-auto">{records.map((row) => <p key={row._id} className="py-2 text-sm">{row.exercise} · {row.weight ?? '—'} kg · {row.sets} × {row.reps}<span className="block text-xs text-white/60">{new Date(row.performedAt).toLocaleDateString('en-IN')}</span></p>)}{!records.length && <p className="py-3 text-sm text-white/60">No recorded performance yet.</p>}</div>;
}

function PerformanceChart({ records }) {
  const weighted = records.filter((row) => Number.isFinite(row.weight));
  if (weighted.length < 2) return <p className="mt-4 text-sm text-white/60">Add at least two recorded weights to show a progression graph.</p>;
  const min = Math.min(...weighted.map((row) => row.weight));
  const max = Math.max(...weighted.map((row) => row.weight));
  const points = weighted.map((row, index) => `${(index / (weighted.length - 1)) * 100},${90 - ((row.weight - min) / (max - min || 1)) * 80}`).join(' ');
  return <div className="mt-4"><svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible" role="img" aria-label="Recorded weight progression"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" className="text-electricblue" />{weighted.map((row, index) => <circle key={row._id} cx={(index / (weighted.length - 1)) * 100} cy={90 - ((row.weight - min) / (max - min || 1)) * 80} r="2" className="fill-gymred"><title>{row.exercise}: {row.weight} kg</title></circle>)}</svg><p className="text-xs text-white/60">Recorded load: {min}–{max} kg</p></div>;
}

function PrivateImage({ src }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let url;
    api.get(src).then((response) => response.blob()).then((blob) => {
      url = URL.createObjectURL(blob);
      setImage(url);
    }).catch((error) => console.error('Could not load authorized transformation image:', error));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [src]);
  return image ? <img src={image} alt="Member transformation" className="h-24 w-24 rounded-lg object-cover" /> : <span className="grid h-24 w-24 place-items-center rounded-lg bg-charcoal text-xs text-white/50">Private image</span>;
}

function MemberWorkspace() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('month');
  const [feedbackForm, setFeedbackForm] = useState({ overall: 5, cleanliness: '', equipment: '', trainer: '', category: 'General', message: '' });
  const [referralCode, setReferralCode] = useState(null);
  const workoutPlans = useLoad('/features/workout-plans');
  const performance = useLoad('/features/performance');
  const notes = useLoad('/features/trainer-notes');
  const diets = useLoad('/features/diet-plans');
  const transformations = useLoad('/features/transformations');
  const referrals = useLoad('/features/referrals');
  const notifications = useLoad('/features/notifications');
  const attendanceHistory = useLoad('/features/attendance/history');
  const leaderboardData = useLoad(`/features/leaderboard?period=${leaderboardPeriod}`, [leaderboardPeriod]);

  async function submitFeedback(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/features/feedback', {
        ...feedbackForm,
        overall: Number(feedbackForm.overall),
        cleanliness: feedbackForm.cleanliness ? Number(feedbackForm.cleanliness) : undefined,
        equipment: feedbackForm.equipment ? Number(feedbackForm.equipment) : undefined,
        trainer: feedbackForm.trainer ? Number(feedbackForm.trainer) : undefined,
      });
      setMessage('Feedback submitted privately');
      setFeedbackForm({ overall: 5, cleanliness: '', equipment: '', trainer: '', category: 'General', message: '' });
    } catch (e) { setError(e.message); }
  }

  async function loadReferral() {
    setError('');
    try { setReferralCode(await api.get('/features/referrals')); }
    catch (e) { setError(e.message); }
  }

  async function applyReferral(e) {
    e.preventDefault();
    setError('');
    try { await api.post('/features/referrals/use', { code: e.target.code.value }); setMessage('Referral recorded'); e.target.reset(); }
    catch (e2) { setError(e2.message); }
  }

  async function consent(id, value) {
    try { await api.post(`/features/transformations/${id}/consent`, { consent: value }); setMessage('Consent preference saved'); await transformations.refresh(); }
    catch (e) { setError(e.message); }
  }

  return (
    <section className="mt-10 space-y-8">
      <h2 className="text-2xl font-black">Your training</h2>
      {error && <p role="alert" className="rounded-lg border border-gymred/60 p-3 text-sm text-gymred">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-electricblue/40 p-3 text-sm text-electricblue">{message}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <section className={cardClass}><div className="flex items-center justify-between gap-2"><h3 className="font-bold">Consistency leaderboard</h3><select className="rounded bg-charcoal px-2 py-1 text-sm" value={leaderboardPeriod} onChange={(e) => setLeaderboardPeriod(e.target.value)}><option value="week">This week</option><option value="month">This month</option></select></div><p className="mt-2 text-sm text-electricblue">Your rank: {leaderboardData.data?.myRank?.rank ?? 'Not ranked'} · {leaderboardData.data?.myRank?.attendanceCount || 0} visits</p><div className="mt-2 divide-y divide-electricblue/30">{(leaderboardData.data?.leaderboard || []).slice(0, 10).map((row) => <p key={row.memberId} className="flex justify-between py-2 text-sm"><span>#{row.rank} {row.name}</span><span>{row.attendanceCount} visits · {row.currentStreak} day current · {row.bestStreak} best</span></p>)}</div></section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClass}><h3 className="font-bold">Published workout plans</h3>{(workoutPlans.data?.plans || []).map((plan) => <article key={plan._id} className="mt-3 border-t border-electricblue/30 pt-3"><p className="font-semibold">{plan.title}</p><p className="text-sm text-white/70">{plan.description}</p><ul className="mt-2 space-y-1 text-sm">{plan.exercises.map((exercise, i) => <li key={i}>{exercise.day || `Week ${exercise.week || 1}`} · {exercise.name} — {exercise.sets} × {exercise.reps} · target {exercise.targetWeight ?? '—'} kg · rest {exercise.restSeconds ?? '—'} sec{exercise.instructions ? ` · ${exercise.instructions}` : ''}</li>)}</ul></article>)}{!workoutPlans.data?.plans?.length && <p className="mt-3 text-sm text-white/60">No published workout plans yet.</p>}</section>
        <section className={cardClass}><h3 className="font-bold">Trainer notes for next week</h3>{(notes.data?.notes || []).map((note) => <article key={note._id} className="mt-3 border-t border-electricblue/30 pt-3"><p className="font-semibold">Week of {new Date(note.weekOf).toLocaleDateString('en-IN')}</p>{[['Observations',note.observations],['Strengths',note.strengths],['Improve',note.improvements],['Goals',note.goals],['Next week',note.nextWeekAdjustments]].filter(([,text]) => text).map(([label,text]) => <p key={label} className="mt-1 text-sm"><strong>{label}:</strong> {text}</p>)}</article>)}{!notes.data?.notes?.length && <p className="mt-3 text-sm text-white/60">No published trainer notes yet.</p>}</section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClass}><h3 className="font-bold">Workout performance history</h3><PerformanceChart records={performance.data?.records || []} /><PerformanceRows records={performance.data?.records || []} /></section>
        <section className={cardClass}><h3 className="font-bold">Diet guidance</h3>{diets.error?.includes('does not include') ? <p className="mt-2 text-sm text-white/60">Diet guidance is not included with your active membership.</p> : diets.error ? <p className="mt-2 text-sm text-gymred">{diets.error}</p> : (diets.data?.diets || []).map((diet) => <article key={diet._id} className="mt-3 border-t border-electricblue/30 pt-3"><p>{new Date(diet.startsAt).toLocaleDateString('en-IN')} – {new Date(diet.endsAt).toLocaleDateString('en-IN')}</p>{diet.meals.map((meal, i) => <p key={i} className="mt-2 text-sm"><strong>{meal.name} · {meal.timing}:</strong> {meal.suggestions}</p>)}<p className="mt-2 text-sm">{diet.notes}</p></article>)}</section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClass}><div className="flex items-center justify-between gap-2"><h3 className="font-bold">Referrals</h3><button onClick={loadReferral} className="rounded-full border border-electricblue px-3 py-1 text-sm">Get my code</button></div>{referralCode && <div className="mt-3"><p className="text-xs text-white/60">{referralCode.enabled ? `A new member gets ₹${((referralCode.newMemberDiscountInPaise || 0) / 100).toLocaleString('en-IN')} off; you earn ₹${((referralCode.referrerDiscountInPaise || 0) / 100).toLocaleString('en-IN')} credit after their first payment.` : 'Referral claims are currently disabled'}</p>{referralCode.code && <div className="mt-1 flex items-center gap-2"><code className="rounded bg-charcoal px-3 py-2 text-lg font-bold">{referralCode.code}</code><button onClick={() => navigator.clipboard.writeText(referralCode.code).then(() => setMessage('Referral code copied')).catch((e) => setError(e.message))} className="rounded border border-electricblue px-3 py-2 text-sm">Copy</button></div>}<p className="mt-2 text-sm">Available referral discount: ₹{((referralCode.availableDiscountInPaise || 0) / 100).toLocaleString('en-IN')}</p>{referralCode.reward && <p className="mt-1 text-sm">Reward: {referralCode.reward}</p>}{referralCode.referrals?.map((referral) => <p key={referral._id} className="mt-2 text-sm">{referral.referred?.name} · {referral.status}</p>)}</div>}<form onSubmit={applyReferral} className="mt-4 flex gap-2"><input name="code" required className={fieldClass} placeholder="Enter a referral code" /><button className="rounded-full bg-gymred px-4 py-2 text-sm font-bold">Apply</button></form></section>
        <section className={cardClass}><h3 className="font-bold">Private feedback</h3><p className="mt-1 text-xs text-white/60">Feedback is private and limited to one submission per month.</p><form onSubmit={submitFeedback} className="mt-3 space-y-2"><div className="grid grid-cols-2 gap-2"><label className="text-xs">Overall<select className={fieldClass} value={feedbackForm.overall} onChange={(e) => setFeedbackForm({ ...feedbackForm, overall: e.target.value })}>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n}/5</option>)}</select></label>{[['cleanliness','Cleanliness'],['equipment','Equipment'],['trainer','Trainer']].map(([key,label]) => <label key={key} className="text-xs">{label}<select className={fieldClass} value={feedbackForm[key]} onChange={(e) => setFeedbackForm({ ...feedbackForm, [key]: e.target.value })}><option value="">Not rated</option>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n}/5</option>)}</select></label>)}</div><select className={fieldClass} value={feedbackForm.category} onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}>{['General','Cleanliness','Equipment','Trainer','Other'].map((category) => <option key={category}>{category}</option>)}</select><textarea className={fieldClass} placeholder="Your feedback" value={feedbackForm.message} onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })} /><button className="rounded-full bg-gymred px-4 py-2 font-bold">Submit feedback</button></form></section>
      </div>

      <section className={cardClass}><h3 className="font-bold">Transformation photo consent</h3>{(transformations.data?.transformations || []).map((item) => <article key={item._id} className="mt-3 flex flex-wrap items-center gap-3 border-t border-electricblue/30 pt-3"><p className="min-w-40 flex-1">{item.description || 'Transformation photos'} · {item.status} · consent {item.consentGranted ? 'granted' : 'not granted'}</p><PrivateImage src={`/features/transformations/${item._id}/image/before`} /><PrivateImage src={`/features/transformations/${item._id}/image/after`} /><button onClick={() => consent(item._id, !item.consentGranted)} className="rounded border border-electricblue px-3 py-2 text-sm">{item.consentGranted ? 'Revoke consent' : 'Grant consent'}</button></article>)}{!transformations.data?.transformations?.length && <p className="mt-2 text-sm text-white/60">No transformation photos have been added.</p>}</section>

      <section className={cardClass}><h3 className="font-bold">Notifications</h3>{(notifications.data?.notifications || []).map((item) => <article key={item._id} className="mt-3 border-t border-electricblue/30 pt-3"><p className="font-semibold">{item.title}</p><p className="text-sm">{item.message}</p><p className="text-xs text-white/60">Email status: {item.emailStatus} · {new Date(item.createdAt).toLocaleDateString('en-IN')}</p>{!item.readAt && <button onClick={() => api.patch(`/features/notifications/${item._id}/read`, {}).then(notifications.refresh).catch((e) => setError(e.message))} className="mt-1 text-xs text-electricblue underline">Mark read</button>}</article>)}{!notifications.data?.notifications?.length && <p className="mt-2 text-sm text-white/60">No notifications.</p>}</section>
      <section className={cardClass}><h3 className="font-bold">Attendance history</h3><div className="mt-2 divide-y divide-electricblue/30">{(attendanceHistory.data?.attendance || []).slice(0, 20).map((entry) => <p key={entry._id} className="flex justify-between py-2 text-sm"><span>{new Date(entry.checkedInAt).toLocaleDateString('en-IN')}</span><span>{new Date(entry.checkedInAt).toLocaleTimeString('en-IN')} · {entry.method}</span></p>)}{!attendanceHistory.data?.attendance?.length && <p className="mt-2 text-sm text-white/60">No attendance history yet.</p>}</div></section>
    </section>
  );
}

export default function FeatureWorkspace({ mode }) {
  return mode === 'member' ? <MemberWorkspace /> : <StaffWorkspace />;
}
