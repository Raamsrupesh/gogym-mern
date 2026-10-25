import { useEffect, useState } from 'react';
import { api } from '../api';
import { gymServices } from '../data/services';

const tabs = ['Training Guidance', 'Diet Chart', 'Progress', 'Attendance', 'Transformations', 'Referrals', 'Equipment', 'Feedback'];
const memberWorkspaceTabs = ['Attendance', 'Transformations', 'Referrals', 'Equipment', 'Feedback'];
const fieldClass = 'w-full rounded-lg border border-brand/40 bg-charcoal px-3 py-2 text-sm text-white';
const cardClass = 'rounded-2xl border border-brand/50 bg-card p-4';
const defaultExercises = '[{"name":"Squat","sets":3,"reps":"8-10","targetWeight":0,"restSeconds":90,"instructions":""}]';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

function useLoad(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const refresh = async () => {
    setError('');
    if (!path) {
      setData(null);
      return;
    }
    try { setData(await api.get(path)); } catch (e) { setError(e.message); }
  };
  useEffect(() => { refresh(); }, [path, ...deps]);
  return { data, error, refresh };
}

function MemberSelect({ members, value, onChange }) {
  return (
    <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">Choose a member</option>
      {members.map((member) => <option key={member._id} value={member._id}>{member.name} · {member.activeMembership?.planSnapshot?.name || 'No active subscription'}</option>)}
    </select>
  );
}

function ProfessionalReports({ memberId, features = {}, staff = false }) {
  const query = staff ? `?memberId=${encodeURIComponent(memberId || '')}` : '';
  const bmi = useLoad(features.bmi_report ? `/features/reports/bmi_report${query}` : null, [memberId, features.bmi_report]);
  const measurements = useLoad(features.body_measurements ? `/features/reports/body_measurements${query}` : null, [memberId, features.body_measurements]);
  const [date, setDate] = useState(today);
  const [bmiForm, setBmiForm] = useState({ heightCm: '', weightKg: '', notes: '' });
  const [measurementForm, setMeasurementForm] = useState({ units: 'cm', chest: '', waist: '', hips: '', leftArm: '', rightArm: '', leftThigh: '', rightThigh: '', shoulders: '', notes: '' });
  const [bmiDocument, setBmiDocument] = useState(null);
  const [bmiDocumentKey, setBmiDocumentKey] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const enabled = features.bmi_report || features.body_measurements || features.progress_tracking;
  if (!enabled) return null;

  async function save(type, data, refresh, document) {
    setMessage('');
    setError('');
    try {
      if (document) {
        const body = new FormData();
        body.append('memberId', memberId);
        body.append('assessmentDate', date);
        if (data !== undefined) body.append('data', JSON.stringify(data));
        body.append('document', document);
        await api.postRaw(`/features/reports/${type}`, body);
      } else {
        await api.post(`/features/reports/${type}`, { memberId, assessmentDate: date, data });
      }
      setMessage('Report saved');
      await refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  const history = (items, render) => items?.length
    ? items.map((item) => <article key={item._id} className="border-t border-brand/30 py-3 text-sm">
      <p className="font-semibold">{new Date(item.assessmentDate).toLocaleDateString('en-IN')}</p>
      {render(item.data, item)}
    </article>)
    : <p className="py-2 text-sm text-white/60">Your trainer has not added this report yet.</p>;

  return (
    <div className="space-y-4">
      {staff && <label className="block text-xs font-semibold">Assessment date
        <input type="date" max={today} className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
      </label>}
      {error && <p role="alert" className="rounded-lg border border-brand/60 p-3 text-sm text-brand">{error}</p>}
      {message && <p role="status" className="text-sm text-brand">{message}</p>}
      {features.bmi_report && <section className={cardClass}>
        <h3 className="font-bold">BMI report</h3>
        {bmi.error && <p role="alert" className="text-sm text-brand">{bmi.error}</p>}
        {history(bmi.data?.reports, (data, report) => <div className="mt-1"><p>BMI {data.bmi ?? '—'}{data.heightCm ? ` · ${data.heightCm} cm · ${data.weightKg} kg` : ''}{data.notes ? ` · ${data.notes}` : ''}</p>{report.document && <PrivateDocument src={`/features/reports/bmi_report/${report._id}/document`} document={report.document} />}</div>)}
        {staff && <form onSubmit={async (e) => {
          e.preventDefault();
          const hasHeight = bmiForm.heightCm !== '';
          const hasWeight = bmiForm.weightKg !== '';
          if (hasHeight !== hasWeight || (!hasHeight && !bmiDocument)) {
            setError('Enter both height and weight, or attach a BMI report file.');
            return;
          }
          const data = hasHeight ? {
            heightCm: Number(bmiForm.heightCm),
            weightKg: Number(bmiForm.weightKg),
            notes: bmiForm.notes,
          } : undefined;
          if (await save('bmi_report', data, bmi.refresh, bmiDocument)) {
            setBmiForm({ heightCm: '', weightKg: '', notes: '' });
            setBmiDocument(null);
            setBmiDocumentKey((key) => key + 1);
          }
        }} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="number" min="50" max="260" step="0.1" className={fieldClass} placeholder="Height in cm (optional with file)" value={bmiForm.heightCm} onChange={(e) => setBmiForm({ ...bmiForm, heightCm: e.target.value })} />
          <input type="number" min="10" max="500" step="0.1" className={fieldClass} placeholder="Weight in kg (optional with file)" value={bmiForm.weightKg} onChange={(e) => setBmiForm({ ...bmiForm, weightKg: e.target.value })} />
          <textarea className={`${fieldClass} sm:col-span-2`} placeholder="Notes" value={bmiForm.notes} onChange={(e) => setBmiForm({ ...bmiForm, notes: e.target.value })} />
          <label className="block text-sm sm:col-span-2">BMI report file (PDF or image)
            <input key={bmiDocumentKey} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-1 w-full text-sm" onChange={(e) => setBmiDocument(e.target.files?.[0] || null)} />
          </label>
          <button className="rounded-full bg-brand px-4 py-2 font-bold sm:col-span-2">Save BMI report</button>
        </form>}
      </section>}
      {features.body_measurements && <section className={cardClass}>
        <h3 className="font-bold">Body measurements</h3>
        {measurements.error && <p role="alert" className="text-sm text-brand">{measurements.error}</p>}
        {history(measurements.data?.reports, (data) => <p className="mt-1">{Object.entries(data.measurements || {}).map(([key, value]) => `${key}: ${value} ${data.units}`).join(' · ')}{data.notes ? ` · ${data.notes}` : ''}</p>)}
        {staff && <form onSubmit={async (e) => {
          e.preventDefault();
          const { units, notes, ...values } = measurementForm;
          const data = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '').map(([key, value]) => [key, Number(value)]));
          if (await save('body_measurements', { ...data, units, notes }, measurements.refresh)) {
            setMeasurementForm({ units: 'cm', chest: '', waist: '', hips: '', leftArm: '', rightArm: '', leftThigh: '', rightThigh: '', shoulders: '', notes: '' });
          }
        }} className="mt-3 grid gap-2 sm:grid-cols-2">
          <select className={fieldClass} value={measurementForm.units} onChange={(e) => setMeasurementForm({ ...measurementForm, units: e.target.value })}><option value="cm">Centimetres</option><option value="in">Inches</option></select>
          {['chest','waist','hips','leftArm','rightArm','leftThigh','rightThigh','shoulders'].map((field) => <input key={field} type="number" min="0.1" max="300" step="0.1" className={fieldClass} placeholder={`${field} (${measurementForm.units})`} value={measurementForm[field]} onChange={(e) => setMeasurementForm({ ...measurementForm, [field]: e.target.value })} />)}
          <textarea className={`${fieldClass} sm:col-span-2`} placeholder="Notes" value={measurementForm.notes} onChange={(e) => setMeasurementForm({ ...measurementForm, notes: e.target.value })} />
          <button className="rounded-full bg-brand px-4 py-2 font-bold sm:col-span-2">Save measurements</button>
        </form>}
      </section>}
    </div>
  );
}

function StaffWorkspace() {
  const [tab, setTab] = useState('Training Guidance');
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [planForm, setPlanForm] = useState({ serviceId: '', exercises: defaultExercises, fitnessGoal: '', schedule: '', trainerNotes: '' });
  const [editingWorkoutId, setEditingWorkoutId] = useState('');
  const [planStatus, setPlanStatus] = useState('published');
  const [performanceForm, setPerformanceForm] = useState({ equipment: '', weekOf: today, weight: '', sets: '', reps: '', notes: '' });
  const [dietForm, setDietForm] = useState({ title: 'Personalized diet chart', startsAt: '', endsAt: '', meals: '', dietaryRestrictions: '', notes: '', trainerNotes: '' });
  const [dietDocument, setDietDocument] = useState(null);
  const [dietDocumentKey, setDietDocumentKey] = useState(0);
  const [editingDietId, setEditingDietId] = useState('');
  const [transformationForm, setTransformationForm] = useState({ memberId: '', description: '', beforeDate: '', afterDate: '', beforeImage: null, afterImage: null });
  const [equipmentForm, setEquipmentForm] = useState({ name: '', category: '', brand: '', model: '', serialNumber: '', location: '', status: 'operational', nextMaintenanceAt: '', purchaseDate: '', purchaseCost: '' });
  const [editingEquipmentId, setEditingEquipmentId] = useState('');
  const [maintenanceForm, setMaintenanceForm] = useState({ equipmentId: '', kind: 'maintenance', description: '', scheduledAt: '', cost: '', notes: '' });
  const [feedbackResponse, setFeedbackResponse] = useState({});
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [referralConfig, setReferralConfig] = useState({
    referralsEnabled: false,
    referralReward: '',
    newMemberDiscountPercent: 0,
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

  const selectedMember = members.find((member) => member._id === memberId);
  const membership = selectedMember?.activeMembership;
  const features = membership?.planSnapshot?.features || {};
  const availableTabs = [
    ...(features.training_guidance ? ['Training Guidance'] : []),
    ...(features.diet_chart ? ['Diet Chart'] : []),
    ...(features.bmi_report || features.body_measurements || features.progress_tracking ? ['Progress'] : []),
    ...memberWorkspaceTabs,
  ];
  useEffect(() => {
    if (!memberId) {
      setTab('Attendance');
      return;
    }
    setTab(['Progress', 'Diet Chart', 'Training Guidance'].find((name) => availableTabs.includes(name)) || 'Attendance');
  }, [memberId]);

  const attendance = useLoad(`/attendance?date=${date}`, [date, tab]);
  const workoutPlans = useLoad(memberId && features.training_guidance ? `/features/workout-plans?memberId=${memberId}` : null, [memberId, tab, features.training_guidance]);
  const performance = useLoad(memberId && features.progress_tracking ? `/features/performance?memberId=${memberId}` : null, [memberId, tab, features.progress_tracking]);
  const diets = useLoad(memberId && features.diet_chart ? `/features/diet-plans?memberId=${memberId}` : null, [memberId, tab, features.diet_chart]);
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
      setPlanForm({ serviceId: '', exercises: defaultExercises, fitnessGoal: '', schedule: '', trainerNotes: '' });
      setPlanStatus('published');
      await workoutPlans.refresh();
    }, planStatus === 'published' ? 'Workout plan published' : 'Workout plan saved as draft');
  }

  async function savePerformance(e) {
    e.preventDefault();
    await run(async () => {
      await api.post('/features/performance', {
        memberId,
        ...performanceForm,
        weight: performanceForm.weight === '' ? undefined : Number(performanceForm.weight),
        sets: Number(performanceForm.sets),
        reps: Number(performanceForm.reps),
      });
      setPerformanceForm({ equipment: '', weekOf: today, weight: '', sets: '', reps: '', notes: '' });
      await performance.refresh();
    }, 'Workout performance recorded');
  }

  async function saveDiet(e) {
    e.preventDefault();
    await run(async () => {
      const meals = dietForm.meals.trim() ? JSON.parse(dietForm.meals) : [];
      const payload = { memberId, ...dietForm, meals };
      if (dietDocument) {
        const body = new FormData();
        Object.entries(payload).forEach(([key, value]) => body.append(key, typeof value === 'string' ? value : JSON.stringify(value)));
        body.append('document', dietDocument);
        if (editingDietId) await api.patchRaw(`/features/diet-plans/${editingDietId}`, body);
        else await api.postRaw('/features/diet-plans', body);
      } else if (editingDietId) {
        await api.patch(`/features/diet-plans/${editingDietId}`, payload);
      } else {
        await api.post('/features/diet-plans', payload);
      }
      setEditingDietId('');
      setDietForm({ title: 'Personalized diet chart', startsAt: '', endsAt: '', meals: '', dietaryRestrictions: '', notes: '', trainerNotes: '' });
      setDietDocument(null);
      setDietDocumentKey((key) => key + 1);
      await diets.refresh();
    }, editingDietId ? 'Diet chart updated' : 'Diet guidance published');
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
        {availableTabs.map((name) => <button key={name} onClick={() => setTab(name)} className={`shrink-0 rounded-full px-4 py-2 text-sm ${tab === name ? 'bg-brand font-bold text-white' : 'border border-brand'}`}>{name}</button>)}
      </div>
      <label className="mb-3 block max-w-xl text-sm font-semibold">Client
        <MemberSelect members={members} value={memberId} onChange={setMemberId} />
      </label>
      {memberId && <p className="rounded-xl border border-brand/40 p-3 text-sm">
        <strong>{selectedMember?.name}</strong> · {membership?.planSnapshot?.name || 'No active subscription'} · {membership?.status || 'inactive'}
        {membership && <> · {new Date(membership.startDate).toLocaleDateString('en-IN')} – {new Date(membership.expiryDate).toLocaleDateString('en-IN')}</>}
      </p>}
      {!memberId && <p className="rounded-xl border border-brand/40 p-3 text-sm text-white/70">Choose a client with an active subscription to access plan-specific training forms.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-brand/60 bg-brand/10 p-3 text-sm text-brand">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-lg border border-brand/40 p-3 text-sm text-brand">{message}</p>}

      {tab === 'Training Guidance' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={savePlan} className={`${cardClass} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold">{editingWorkoutId ? 'Edit workout plan' : 'Assign workout plan'}</h3>
            {editingWorkoutId && <button type="button" onClick={() => { setEditingWorkoutId(''); setPlanForm({ serviceId: '', exercises: defaultExercises, fitnessGoal: '', schedule: '', trainerNotes: '' }); setPlanStatus('published'); }}
              className="rounded border border-brand px-3 py-1 text-xs">Assign another plan</button>}
          </div>
          <label className="block text-sm">Service / plan name
            <select required className={fieldClass + ' mt-1'} value={planForm.serviceId} onChange={(e) => setPlanForm({ ...planForm, serviceId: e.target.value })}>
              <option value="">Choose a service</option>
              {gymServices.filter((service) => service.category !== 'wellness').map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
            </select>
          </label>
          {planForm.serviceId && <p className="rounded-lg bg-charcoal p-3 text-sm text-white/75">{gymServices.find((service) => service.id === planForm.serviceId)?.description}</p>}
          <input className={fieldClass} placeholder="Fitness goal" value={planForm.fitnessGoal} onChange={(e) => setPlanForm({ ...planForm, fitnessGoal: e.target.value })} />
          <input className={fieldClass} placeholder="Training schedule" value={planForm.schedule} onChange={(e) => setPlanForm({ ...planForm, schedule: e.target.value })} />
          <textarea required rows="8" className={fieldClass} aria-label="Exercises in JSON format" value={planForm.exercises} onChange={(e) => setPlanForm({ ...planForm, exercises: e.target.value })} />
          <p className="text-xs text-white/60">Exercises JSON fields: name, sets, reps, targetWeight, restSeconds, instructions, week, day.</p>
          <textarea className={fieldClass} placeholder="Trainer notes" value={planForm.trainerNotes} onChange={(e) => setPlanForm({ ...planForm, trainerNotes: e.target.value })} />
          <select className={fieldClass} value={planStatus} onChange={(e) => setPlanStatus(e.target.value)}><option value="published">Publish and notify member</option><option value="draft">Save draft</option></select>
          <button className="rounded-full bg-brand px-5 py-2 font-bold text-white">{editingWorkoutId ? 'Update plan' : 'Save plan'}</button>
        </form>
        <div className={cardClass}><h3 className="font-bold">Assigned plans</h3>{workoutPlans.error && <p className="text-sm text-brand">{workoutPlans.error}</p>}
          {(workoutPlans.data?.plans || []).map((plan) => <article key={plan._id} className="mt-3 border-t border-brand/30 pt-3"><p className="font-semibold">{plan.title} · {plan.member?.name}</p><p className="text-sm text-white/70">{plan.description}</p><p className="text-xs text-white/60">{plan.status}</p><ul className="mt-2 list-inside list-disc text-sm">{plan.exercises.map((exercise, i) => <li key={`${exercise.name}-${i}`}>{exercise.name}: {exercise.sets} × {exercise.reps}{exercise.targetWeight ? ` · ${exercise.targetWeight} kg` : ''}</li>)}</ul><div className="mt-2 flex gap-3"><button onClick={() => { setEditingWorkoutId(plan._id); setMemberId(plan.member?._id || memberId); setPlanForm({ serviceId: plan.serviceId || gymServices.find((service) => service.title === plan.title)?.id || '', exercises: JSON.stringify(plan.exercises, null, 2), fitnessGoal: plan.fitnessGoal || '', schedule: plan.schedule || '', trainerNotes: plan.trainerNotes || '' }); setPlanStatus(plan.status === 'archived' ? 'draft' : plan.status); }} className="text-xs text-brand underline">Edit</button><button onClick={() => run(async () => { await api.patch(`/features/workout-plans/${plan._id}`, { status: 'archived' }); await workoutPlans.refresh(); }, 'Plan archived')} className="text-xs text-brand underline">Archive</button></div></article>)}
          {!workoutPlans.data?.plans?.length && <p className="mt-3 text-sm text-white/60">No workout plans found.</p>}
        </div>
      </div>}

      {tab === 'Attendance' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className={cardClass + ' lg:col-span-2'}>
          <p className="mb-3 text-sm text-white/60">QR and manual check-in have been removed. Attendance entry can be connected to the gym fingerprint system when its integration details are available.</p>
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Attendance history</h3><input type="date" className={fieldClass + ' w-auto'} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="mt-3 divide-y divide-brand/30">{(attendance.data?.attendance || []).map((row) => <p key={row._id} className="flex justify-between py-2 text-sm"><span>{row.member?.name || 'Member'}</span><span className="text-white/60">{new Date(row.checkedInAt).toLocaleTimeString('en-IN')} · {row.method}</span></p>)}{!attendance.data?.attendance?.length && <p className="py-3 text-sm text-white/60">No check-ins for this date.</p>}</div>
        </div>
      </div>}

      {tab === 'Progress' && <div className="mt-4 space-y-5">
        {features.progress_tracking && <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={savePerformance} className={`${cardClass} space-y-3`}><h3 className="font-bold">Weekly equipment progress</h3><input required maxLength="120" className={fieldClass} placeholder="Equipment (e.g. pull-up bar, bench press)" value={performanceForm.equipment} onChange={(e) => setPerformanceForm({ ...performanceForm, equipment: e.target.value })} /><label className="block text-xs">Week of<input type="date" max={today} required className={fieldClass} value={performanceForm.weekOf} onChange={(e) => setPerformanceForm({ ...performanceForm, weekOf: e.target.value })} /></label><div className="grid grid-cols-3 gap-2"><input type="number" min="0" step="0.5" className={fieldClass} placeholder="Weight kg" value={performanceForm.weight} onChange={(e) => setPerformanceForm({ ...performanceForm, weight: e.target.value })} /><input type="number" min="1" required className={fieldClass} placeholder="Sets" value={performanceForm.sets} onChange={(e) => setPerformanceForm({ ...performanceForm, sets: e.target.value })} /><input type="number" min="1" required className={fieldClass} placeholder="Reps" value={performanceForm.reps} onChange={(e) => setPerformanceForm({ ...performanceForm, reps: e.target.value })} /></div><textarea className={fieldClass} placeholder="Notes (optional)" value={performanceForm.notes} onChange={(e) => setPerformanceForm({ ...performanceForm, notes: e.target.value })} /><p className="text-xs text-white/60">One entry is kept per client, equipment, and week. Saving again updates that week’s entry.</p><button className="rounded-full bg-brand px-4 py-2 font-bold">Save weekly progress</button></form>
          <div className={cardClass}><h3 className="font-bold">Member training history</h3><PerformanceChart records={performance.data?.records || []} /><PerformanceRows records={performance.data?.records || []} /></div>
        </div>}
        <ProfessionalReports memberId={memberId} features={features} staff />
      </div>}

      {tab === 'Diet Chart' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={saveDiet} className={`${cardClass} space-y-3`}><h3 className="font-bold">Publish diet guidance</h3><p className="text-xs text-white/60">The server checks that the member has an active membership with diet guidance enabled. Add a meal plan, upload a chart, or do both.</p><div className="grid grid-cols-2 gap-2"><label className="text-xs">Starts<input required type="date" className={fieldClass} value={dietForm.startsAt} onChange={(e) => setDietForm({ ...dietForm, startsAt: e.target.value })} /></label><label className="text-xs">Ends<input required type="date" className={fieldClass} value={dietForm.endsAt} onChange={(e) => setDietForm({ ...dietForm, endsAt: e.target.value })} /></label></div><textarea rows="6" className={fieldClass} aria-label="Diet meals JSON" placeholder="Optional meals JSON: [{&quot;name&quot;:&quot;Breakfast&quot;,&quot;timing&quot;:&quot;8:00 AM&quot;,&quot;suggestions&quot;:&quot;Food and quantities&quot;}]" value={dietForm.meals} onChange={(e) => setDietForm({ ...dietForm, meals: e.target.value })} /><label className="block text-sm">Diet chart file (PDF or image)<input key={dietDocumentKey} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-1 w-full text-sm" onChange={(e) => setDietDocument(e.target.files?.[0] || null)} /></label><textarea className={fieldClass} placeholder="Additional guidance" value={dietForm.notes} onChange={(e) => setDietForm({ ...dietForm, notes: e.target.value })} /><button className="rounded-full bg-brand px-4 py-2 font-bold">Publish diet plan</button></form>
        <div className={cardClass}><h3 className="font-bold">Member diet plans</h3>{(diets.data?.diets || []).map((diet) => <article key={diet._id} className="mt-3 border-t border-brand/30 pt-3"><p>{new Date(diet.startsAt).toLocaleDateString('en-IN')} – {new Date(diet.endsAt).toLocaleDateString('en-IN')}</p><ul className="mt-2 list-inside list-disc text-sm">{diet.meals.map((meal, i) => <li key={i}>{meal.name} · {meal.timing}: {meal.suggestions}</li>)}</ul>{diet.document && <PrivateDocument src={`/features/diet-plans/${diet._id}/document`} document={diet.document} />}</article>)}{diets.error && <p className="mt-2 text-sm text-white/60">{diets.error}</p>}</div>
      </div>}

      {tab === 'Transformations' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={uploadTransformation} className={`${cardClass} space-y-3`}><h3 className="font-bold">Create private draft</h3><MemberSelect members={members} value={transformationForm.memberId} onChange={(value) => setTransformationForm({ ...transformationForm, memberId: value })} /><label className="block text-sm">Before photo<input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 w-full text-sm" onChange={(e) => setTransformationForm({ ...transformationForm, beforeImage: e.target.files?.[0] })} /></label><label className="block text-sm">After photo<input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 w-full text-sm" onChange={(e) => setTransformationForm({ ...transformationForm, afterImage: e.target.files?.[0] })} /></label><div className="grid grid-cols-2 gap-2"><input type="date" className={fieldClass} aria-label="Before date" onChange={(e) => setTransformationForm({ ...transformationForm, beforeDate: e.target.value })} /><input type="date" className={fieldClass} aria-label="After date" onChange={(e) => setTransformationForm({ ...transformationForm, afterDate: e.target.value })} /></div><textarea className={fieldClass} placeholder="Description" value={transformationForm.description} onChange={(e) => setTransformationForm({ ...transformationForm, description: e.target.value })} /><button className="rounded-full bg-brand px-4 py-2 font-bold">Upload draft</button></form>
        <div className={cardClass}><h3 className="font-bold">Consent and publication</h3>{(transformations.data?.transformations || []).map((item) => <article key={item._id} className="mt-3 border-t border-brand/30 pt-3"><p>{item.member?.name} · {item.status} · consent {item.consentGranted ? 'granted' : 'pending'}</p><div className="mt-2 flex gap-3"><PrivateImage src={`/features/transformations/${item._id}/image/before`} /><PrivateImage src={`/features/transformations/${item._id}/image/after`} /></div>{item.consentGranted && <div className="mt-2 flex gap-2">{['published','archived','draft'].map((status) => <button key={status} onClick={() => run(async () => { await api.patch(`/features/transformations/${item._id}`, { status }); await transformations.refresh(); }, `Transformation ${status}`)} className="rounded border border-brand px-2 py-1 text-xs">{status}</button>)}</div>}</article>)}</div>
      </div>}

      {tab === 'Referrals' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form onSubmit={(e) => { e.preventDefault(); run(async () => { const data = await api.put('/features/referrals/config', referralConfig); setReferralConfig(data.config); }, 'Referral rules saved'); }} className={`${cardClass} space-y-3`}>
          <h3 className="font-bold">Referral rules</h3>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!referralConfig.referralsEnabled} onChange={(e) => setReferralConfig({ ...referralConfig, referralsEnabled: e.target.checked })} /> Enable referral codes</label>
          <label className="block text-sm">New member discount (%)
            <input type="number" min="0" max="100" step="0.01" className={fieldClass + ' mt-1'} value={referralConfig.newMemberDiscountPercent || 0} onChange={(e) => setReferralConfig({ ...referralConfig, newMemberDiscountPercent: Number(e.target.value || 0) })} />
          </label>
          <label className="block text-sm">Referrer reward discount (₹)
            <input type="number" min="0" step="0.01" className={fieldClass + ' mt-1'} value={(referralConfig.referrerDiscountInPaise || 0) / 100} onChange={(e) => setReferralConfig({ ...referralConfig, referrerDiscountInPaise: Math.round(Number(e.target.value || 0) * 100) })} />
          </label>
          <textarea className={fieldClass} placeholder="Reward description (optional)" value={referralConfig.referralReward || ''} onChange={(e) => setReferralConfig({ ...referralConfig, referralReward: e.target.value })} />
          <p className="text-xs text-white/60">The new-member percentage applies to the membership price, excluding any joining fee, on their first successful online payment. Referrers earn a fixed rupee credit after that payment.</p>
          <button className="rounded-full bg-brand px-4 py-2 font-bold">Save rules</button>
        </form>
        <div className={cardClass}><h3 className="font-bold">Referral claims</h3>{(referrals.data?.referrals || []).map((item) => <article key={item._id} className="mt-3 border-t border-brand/30 pt-3 text-sm"><p>{item.referrer?.name} → {item.referred?.name} · {item.status}</p><p className="text-xs text-white/60">New member: {item.newMemberDiscountPercent !== undefined ? `${item.newMemberDiscountPercent}%` : `₹${((item.newMemberDiscountInPaise || 0) / 100).toLocaleString('en-IN')}`} · Referrer credit: ₹{((item.referrerDiscountInPaise || 0) / 100).toLocaleString('en-IN')}</p>{item.reward && <p className="text-xs text-white/60">{item.reward}</p>}{item.status === 'pending' && <button onClick={() => updateReferral(item._id, 'rejected')} className="mt-2 rounded border border-brand px-2 py-1 text-xs text-brand">Reject claim</button>}</article>)}</div>
      </div>}

      {tab === 'Equipment' && <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className={`${cardClass} space-y-3`}>
          <form onSubmit={saveEquipment} className="space-y-3"><h3 className="font-bold">{editingEquipmentId ? 'Edit equipment' : 'Add equipment'}</h3><input required className={fieldClass} placeholder="Equipment name" value={equipmentForm.name} onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })} /><div className="grid grid-cols-2 gap-2">{[['category','Category'],['brand','Brand'],['model','Model'],['serialNumber','Serial number'],['location','Location']].map(([key, label]) => <input key={key} className={fieldClass} placeholder={label} value={equipmentForm[key]} onChange={(e) => setEquipmentForm({ ...equipmentForm, [key]: e.target.value })} />)}</div><div className="grid grid-cols-2 gap-2"><label className="text-xs">Purchase date<input type="date" className={fieldClass} value={equipmentForm.purchaseDate} onChange={(e) => setEquipmentForm({ ...equipmentForm, purchaseDate: e.target.value })} /></label><label className="text-xs">Purchase cost (₹)<input type="number" min="0" step="0.01" className={fieldClass} value={equipmentForm.purchaseCost} onChange={(e) => setEquipmentForm({ ...equipmentForm, purchaseCost: e.target.value })} /></label></div><select className={fieldClass} value={equipmentForm.status} onChange={(e) => setEquipmentForm({ ...equipmentForm, status: e.target.value })}>{equipmentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><label className="text-xs">Next maintenance<input type="date" className={fieldClass} value={equipmentForm.nextMaintenanceAt} onChange={(e) => setEquipmentForm({ ...equipmentForm, nextMaintenanceAt: e.target.value })} /></label><button className="rounded-full bg-brand px-4 py-2 font-bold">{editingEquipmentId ? 'Update equipment' : 'Save equipment'}</button></form>
          <form onSubmit={saveMaintenance} className="border-t border-brand/30 pt-4"><h4 className="font-bold">Log fault, repair, or service</h4><select required className={fieldClass + ' mt-2'} value={maintenanceForm.equipmentId} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipmentId: e.target.value })}><option value="">Choose equipment</option>{(equipment.data?.equipment || []).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select><select className={fieldClass + ' mt-2'} value={maintenanceForm.kind} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, kind: e.target.value })}><option value="maintenance">Maintenance</option><option value="fault">Fault</option><option value="repair">Repair</option></select><textarea required className={fieldClass + ' mt-2'} placeholder="Description" value={maintenanceForm.description} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} /><input type="number" min="0" step="0.01" className={fieldClass + ' mt-2'} aria-label="Cost in rupees" placeholder="Cost (₹)" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} /><button className="mt-2 rounded-full border border-brand px-4 py-2">Add history entry</button></form>
        </div>
        <div className={cardClass}><h3 className="font-bold">Equipment and maintenance</h3>{(equipment.data?.equipment || []).map((item) => <article key={item._id} className="mt-3 border-t border-brand/30 pt-3"><div className="flex justify-between gap-2"><p className="font-semibold">{item.name}</p><span className="text-xs text-white/60">{statusLabel(item.status)}</span></div><p className="text-xs text-white/60">{[item.brand,item.model,item.location].filter(Boolean).join(' · ') || 'No extra details'}</p>{item.purchaseDate && <p className="text-xs text-white/60">Purchased {new Date(item.purchaseDate).toLocaleDateString('en-IN')} · {item.purchaseCostInPaise ? `₹${(item.purchaseCostInPaise / 100).toLocaleString('en-IN')}` : 'cost not recorded'}</p>}{item.nextMaintenanceAt && <p className="text-xs text-brand">Maintenance due {new Date(item.nextMaintenanceAt).toLocaleDateString('en-IN')}</p>}<ul className="mt-2 text-xs">{(item.maintenance || []).map((entry) => <li key={entry._id}>{entry.kind}: {entry.description}{entry.costInPaise ? ` · ₹${(entry.costInPaise / 100).toLocaleString('en-IN')}` : ''} · {new Date(entry.createdAt).toLocaleDateString('en-IN')}</li>)}</ul><div className="mt-2 flex gap-2"><button onClick={() => { setEditingEquipmentId(item._id); setEquipmentForm({ name: item.name, category: item.category || '', brand: item.brand || '', model: item.model || '', serialNumber: item.serialNumber || '', location: item.location || '', status: item.status, nextMaintenanceAt: item.nextMaintenanceAt ? new Date(item.nextMaintenanceAt).toISOString().slice(0,10) : '', purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().slice(0,10) : '', purchaseCost: item.purchaseCostInPaise ? String(item.purchaseCostInPaise / 100) : '' }); }} className="text-xs text-brand underline">Edit</button><select className="rounded bg-charcoal px-2 py-1 text-xs" value={item.status} onChange={(e) => run(async () => { await api.put(`/features/equipment/${item._id}`, { status: e.target.value }); await equipment.refresh(); }, 'Equipment status updated')}>{equipmentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><button onClick={() => run(async () => { await api.delete(`/features/equipment/${item._id}`); await equipment.refresh(); }, 'Equipment archived')} className="text-xs text-brand underline">Archive</button></div></article>)}</div>
      </div>}

      {tab === 'Feedback' && <div className={`${cardClass} mt-4`}><div className="flex items-center justify-between gap-3"><h3 className="font-bold">Member feedback</h3><select aria-label="Filter feedback by status" className="rounded bg-charcoal px-3 py-2 text-sm" value={feedbackFilter} onChange={(e) => setFeedbackFilter(e.target.value)}><option value="all">All feedback</option><option value="false">Open</option><option value="true">Resolved</option></select></div>{(feedback.data?.feedback || []).map((item) => <article key={item._id} className="mt-3 border-t border-brand/30 pt-3"><p className="font-semibold">{item.member?.name} · {item.overall}/5 · {item.category || 'General'} · {item.resolved ? 'Resolved' : 'Open'}</p><p className="text-sm">{item.message || 'No written comment'}</p><div className="mt-2 flex flex-wrap gap-2"><input className={fieldClass + ' max-w-lg'} placeholder="Owner response" value={feedbackResponse[item._id] ?? item.response ?? ''} onChange={(e) => setFeedbackResponse({ ...feedbackResponse, [item._id]: e.target.value })} /><button onClick={() => updateFeedback(item._id, { response: feedbackResponse[item._id] || '' })} className="rounded border border-brand px-3 py-1 text-sm">Respond</button><button onClick={() => updateFeedback(item._id, { resolved: !item.resolved })} className="rounded border border-brand px-3 py-1 text-sm">{item.resolved ? 'Reopen' : 'Resolve'}</button></div></article>)}{!feedback.data?.feedback?.length && <p className="mt-3 text-sm text-white/60">No feedback submitted yet.</p>}</div>}
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
  return <div className="mt-3 max-h-72 divide-y divide-brand/30 overflow-auto">{records.map((row) => <p key={row._id} className="py-2 text-sm">{row.equipment || row.exercise} · {row.weight ?? '—'} kg · {row.sets} × {row.reps}<span className="block text-xs text-white/60">{row.weekOf ? `Week of ${new Date(row.weekOf).toLocaleDateString('en-IN')}` : new Date(row.performedAt).toLocaleDateString('en-IN')}{row.notes ? ` · ${row.notes}` : ''}</span></p>)}{!records.length && <p className="py-3 text-sm text-white/60">No recorded performance yet.</p>}</div>;
}

function PerformanceChart({ records }) {
  const equipmentGroups = records.reduce((groups, row) => {
    const name = row.equipment || row.exercise;
    groups.set(name, [...(groups.get(name) || []), row]);
    return groups;
  }, new Map());
  if (!records.length) return <p className="mt-4 text-sm text-white/60">No recorded performance yet.</p>;
  return <div className="mt-4 space-y-4">{[...equipmentGroups].map(([name, entries]) => {
    const weighted = entries.filter((row) => Number.isFinite(row.weight));
    if (weighted.length < 2) return <p key={name} className="text-sm text-white/60">{name}: add another weekly weight to see its progression graph.</p>;
    const min = Math.min(...weighted.map((row) => row.weight));
    const max = Math.max(...weighted.map((row) => row.weight));
    const points = weighted.map((row, index) => `${(index / (weighted.length - 1)) * 100},${90 - ((row.weight - min) / (max - min || 1)) * 80}`).join(' ');
    return <div key={name}><p className="text-sm font-semibold">{name}</p><svg viewBox="0 0 100 100" className="h-32 w-full overflow-visible" role="img" aria-label={`${name} weekly weight progression`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" className="text-brand" />{weighted.map((row, index) => <circle key={row._id} cx={(index / (weighted.length - 1)) * 100} cy={90 - ((row.weight - min) / (max - min || 1)) * 80} r="2" className="fill-brand"><title>{name}: {row.weight} kg</title></circle>)}</svg><p className="text-xs text-white/60">Recorded load: {min}–{max} kg</p></div>;
  })}</div>;
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

function PrivateDocument({ src, document }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let objectUrl;
    api.get(src)
      .then((response) => response.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((loadError) => setError(loadError.message));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  if (error) return <p role="alert" className="mt-2 text-xs text-brand">{error}</p>;
  if (!url) return <p className="mt-2 text-xs text-white/60">Loading attachment…</p>;
  return (
    <div className="mt-2">
      {document.mimeType?.startsWith('image/') && <img src={url} alt={document.originalName} className="mb-2 max-h-64 rounded-lg object-contain" />}
      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-brand underline">
        View {document.originalName}
      </a>
    </div>
  );
}

function MemberWorkspace({ membership }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('month');
  const [feedbackForm, setFeedbackForm] = useState({ overall: 5, cleanliness: '', equipment: '', trainer: '', category: 'General', message: '' });
  const [referralCode, setReferralCode] = useState(null);
  const features = membership?.planSnapshot?.features || {};
  const workoutPlans = useLoad(features.training_guidance ? '/features/workout-plans' : null, [features.training_guidance]);
  const performance = useLoad(features.progress_tracking ? '/features/performance' : null, [features.progress_tracking]);
  const diets = useLoad(features.diet_chart ? '/features/diet-plans' : null, [features.diet_chart]);
  const transformations = useLoad('/features/transformations');
  const referrals = useLoad('/features/referrals');
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
      {error && <p role="alert" className="rounded-lg border border-brand/60 p-3 text-sm text-brand">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-brand/40 p-3 text-sm text-brand">{message}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <section className={cardClass}><div className="flex items-center justify-between gap-2"><h3 className="font-bold">Consistency leaderboard</h3><select className="rounded bg-charcoal px-2 py-1 text-sm" value={leaderboardPeriod} onChange={(e) => setLeaderboardPeriod(e.target.value)}><option value="week">This week</option><option value="month">This month</option></select></div><p className="mt-2 text-sm text-brand">Your rank: {leaderboardData.data?.myRank?.rank ?? 'Not ranked'} · {leaderboardData.data?.myRank?.attendanceCount || 0} visits</p><div className="mt-2 divide-y divide-brand/30">{(leaderboardData.data?.leaderboard || []).slice(0, 10).map((row) => <p key={row.memberId} className="flex justify-between py-2 text-sm"><span>#{row.rank} {row.name}</span><span>{row.attendanceCount} visits · {row.currentStreak} day current · {row.bestStreak} best</span></p>)}</div></section>
      </div>

      {features.training_guidance && <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClass}><h3 className="font-bold">Published workout plans</h3>{(workoutPlans.data?.plans || []).map((plan) => <article key={plan._id} className="mt-3 border-t border-brand/30 pt-3"><p className="font-semibold">{plan.title}</p><p className="text-sm text-white/70">{plan.description}</p><ul className="mt-2 space-y-1 text-sm">{plan.exercises.map((exercise, i) => <li key={i}>{exercise.day || `Week ${exercise.week || 1}`} · {exercise.name} — {exercise.sets} × {exercise.reps} · target {exercise.targetWeight ?? '—'} kg · rest {exercise.restSeconds ?? '—'} sec{exercise.instructions ? ` · ${exercise.instructions}` : ''}</li>)}</ul></article>)}{!workoutPlans.data?.plans?.length && <p className="mt-3 text-sm text-white/60">No published workout plans yet.</p>}</section>
      </div>}

      <div className="grid gap-5 lg:grid-cols-2">
        {features.progress_tracking && <section className={cardClass}><h3 className="font-bold">Workout performance history</h3>{performance.error && <p role="alert" className="text-sm text-brand">{performance.error}</p>}<PerformanceChart records={performance.data?.records || []} /><PerformanceRows records={performance.data?.records || []} /></section>}
        {features.diet_chart && <section className={cardClass}><h3 className="font-bold">Diet Chart Report</h3>{diets.error && <p role="alert" className="text-sm text-brand">{diets.error}</p>}{(diets.data?.diets || []).map((diet) => <article key={diet._id} className="mt-3 border-t border-brand/30 pt-3"><h4 className="font-semibold">{diet.title || 'Diet chart'}</h4><p>{new Date(diet.startsAt).toLocaleDateString('en-IN')} – {new Date(diet.endsAt).toLocaleDateString('en-IN')}</p>{diet.meals.map((meal, i) => <p key={i} className="mt-2 text-sm"><strong>{meal.name} · {meal.timing}:</strong> {meal.suggestions}</p>)}{diet.notes && <p className="mt-2 text-sm">{diet.notes}</p>}{diet.document && <PrivateDocument src={`/features/diet-plans/${diet._id}/document`} document={diet.document} />}</article>)}{!diets.data?.diets?.length && !diets.error && <p className="mt-2 text-sm text-white/60">Your trainer has not added this report yet.</p>}</section>}
      </div>
      <ProfessionalReports features={features} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClass}><div className="flex items-center justify-between gap-2"><h3 className="font-bold">Referrals</h3><button onClick={loadReferral} className="rounded-full border border-brand px-3 py-1 text-sm">Get my code</button></div>{referralCode && <div className="mt-3"><p className="text-xs text-white/60">{referralCode.enabled ? `A new member gets ${referralCode.newMemberDiscountPercent || 0}% off; you earn ₹${((referralCode.referrerDiscountInPaise || 0) / 100).toLocaleString('en-IN')} credit after their first payment.` : 'Referral claims are currently disabled'}</p>{referralCode.code && <div className="mt-1 flex items-center gap-2"><code className="rounded bg-charcoal px-3 py-2 text-lg font-bold">{referralCode.code}</code><button onClick={() => navigator.clipboard.writeText(referralCode.code).then(() => setMessage('Referral code copied')).catch((e) => setError(e.message))} className="rounded border border-brand px-3 py-2 text-sm">Copy</button></div>}<p className="mt-2 text-sm">Available referral discount: ₹{((referralCode.availableDiscountInPaise || 0) / 100).toLocaleString('en-IN')}</p>{referralCode.reward && <p className="mt-1 text-sm">Reward: {referralCode.reward}</p>}{referralCode.referrals?.map((referral) => <p key={referral._id} className="mt-2 text-sm">{referral.referred?.name} · {referral.status}</p>)}</div>}<form onSubmit={applyReferral} className="mt-4 flex gap-2"><input name="code" required className={fieldClass} placeholder="Enter a referral code" /><button className="rounded-full bg-brand px-4 py-2 text-sm font-bold">Apply</button></form></section>
        <section className={cardClass}><h3 className="font-bold">Private feedback</h3><p className="mt-1 text-xs text-white/60">Feedback is private and limited to one submission per month.</p><form onSubmit={submitFeedback} className="mt-3 space-y-2"><div className="grid grid-cols-2 gap-2"><label className="text-xs">Overall<select className={fieldClass} value={feedbackForm.overall} onChange={(e) => setFeedbackForm({ ...feedbackForm, overall: e.target.value })}>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n}/5</option>)}</select></label>{[['cleanliness','Cleanliness'],['equipment','Equipment'],['trainer','Trainer']].map(([key,label]) => <label key={key} className="text-xs">{label}<select className={fieldClass} value={feedbackForm[key]} onChange={(e) => setFeedbackForm({ ...feedbackForm, [key]: e.target.value })}><option value="">Not rated</option>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n}/5</option>)}</select></label>)}</div><select className={fieldClass} value={feedbackForm.category} onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}>{['General','Cleanliness','Equipment','Trainer','Other'].map((category) => <option key={category}>{category}</option>)}</select><textarea className={fieldClass} placeholder="Your feedback" value={feedbackForm.message} onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })} /><button className="rounded-full bg-brand px-4 py-2 font-bold">Submit feedback</button></form></section>
      </div>

      <section className={cardClass}><h3 className="font-bold">Transformation photo consent</h3>{(transformations.data?.transformations || []).map((item) => <article key={item._id} className="mt-3 flex flex-wrap items-center gap-3 border-t border-brand/30 pt-3"><p className="min-w-40 flex-1">{item.description || 'Transformation photos'} · {item.status} · consent {item.consentGranted ? 'granted' : 'not granted'}</p><PrivateImage src={`/features/transformations/${item._id}/image/before`} /><PrivateImage src={`/features/transformations/${item._id}/image/after`} /><button onClick={() => consent(item._id, !item.consentGranted)} className="rounded border border-brand px-3 py-2 text-sm">{item.consentGranted ? 'Revoke consent' : 'Grant consent'}</button></article>)}{!transformations.data?.transformations?.length && <p className="mt-2 text-sm text-white/60">No transformation photos have been added.</p>}</section>

      <section className={cardClass}><h3 className="font-bold">Attendance history</h3><div className="mt-2 divide-y divide-brand/30">{(attendanceHistory.data?.attendance || []).slice(0, 20).map((entry) => <p key={entry._id} className="flex justify-between py-2 text-sm"><span>{new Date(entry.checkedInAt).toLocaleDateString('en-IN')}</span><span>{new Date(entry.checkedInAt).toLocaleTimeString('en-IN')} · {entry.method}</span></p>)}{!attendanceHistory.data?.attendance?.length && <p className="mt-2 text-sm text-white/60">No attendance history yet.</p>}</div></section>
    </section>
  );
}

export default function FeatureWorkspace({ mode, membership }) {
  return mode === 'member' ? <MemberWorkspace membership={membership} /> : <StaffWorkspace />;
}
