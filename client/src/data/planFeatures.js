export const planFeatureOptions = [
  { key: 'gym_access', label: 'Gym access' },
  { key: 'training_guidance', label: 'Training guidance / customized workout plan' },
  { key: 'diet_chart', label: 'Personalized diet chart' },
  { key: 'bmi_report', label: 'BMI report' },
  { key: 'body_measurements', label: 'Body measurements' },
  { key: 'progress_tracking', label: 'Progress tracking' },
];

export function getPlanFeatureLabels(features = {}) {
  const enabledFeatures = features && typeof features === 'object' ? features : {};
  const labels = planFeatureOptions
    .filter(({ key }) => enabledFeatures[key] === true)
    .map(({ key, label }) => key === 'gym_access'
      ? `Gym access · ${enabledFeatures.daily_session_limit === 0 ? 'unlimited' : `${enabledFeatures.daily_session_limit || 1} session per day`}`
      : label);
  return labels;
}

export function getPlanBenefits(benefits = []) {
  const removedBenefits = new Set(['regular progress assessments', 'progress assessments', 'priority support']);
  return (Array.isArray(benefits) ? benefits : []).filter((benefit) =>
    typeof benefit === 'string' && !removedBenefits.has(benefit.trim().toLowerCase()));
}
