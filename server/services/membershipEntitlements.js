import Membership from '../models/Membership.js';
import Plan from '../models/Plan.js';

export const PLAN_FEATURE_KEYS = [
  'gym_access',
  'daily_session_limit',
  'training_guidance',
  'diet_chart',
  'bmi_report',
  'body_measurements',
  'progress_tracking',
  'regular_assessments',
  'priority_support',
];

export function normalizeFeatures(features = {}, legacyDietGuidance = false) {
  return {
    gym_access: features.gym_access !== false,
    daily_session_limit: Number.isInteger(features.daily_session_limit) && features.daily_session_limit >= 0
      ? features.daily_session_limit : 1,
    training_guidance: features.training_guidance === true,
    diet_chart: features.diet_chart === true || legacyDietGuidance === true,
    bmi_report: features.bmi_report === true,
    body_measurements: features.body_measurements === true,
    progress_tracking: features.progress_tracking === true,
    regular_assessments: features.regular_assessments === true,
    priority_support: features.priority_support === true,
  };
}

export function snapshotPlanFeatures(plan) {
  const features = normalizeFeatures(plan.features, plan.dietGuidance);
  return {
    name: plan.name,
    category: plan.category || 'basic',
    priceInPaise: plan.priceInPaise,
    durationDays: plan.durationDays,
    joiningFeeInPaise: plan.joiningFeeInPaise,
    benefits: plan.benefits || [],
    dietGuidance: features.diet_chart,
    features,
  };
}

export function membershipFeatures(membership) {
  const snapshot = membership?.planSnapshot;
  if (!snapshot) return normalizeFeatures();
  if (snapshot.features) return normalizeFeatures(snapshot.features, snapshot.dietGuidance);
  return normalizeFeatures({}, snapshot.dietGuidance);
}

export async function getCurrentMembership(memberId) {
  const now = new Date();
  return Membership.findOne({
    member: memberId,
    status: 'active',
    startDate: { $lte: now },
    expiryDate: { $gt: now },
  }).sort({ expiryDate: -1 });
}

export async function getMembershipEntitlements(memberId) {
  let membership = await getCurrentMembership(memberId);
  if (!membership) return { membership: null, features: normalizeFeatures() };

  if (!membership.planSnapshot?.features && membership.plan) {
    const plan = await Plan.findById(membership.plan).select('features dietGuidance');
    if (plan) {
      membership.planSnapshot.features = normalizeFeatures(plan.features, plan.dietGuidance);
      membership.planSnapshot.category ||= plan.category || 'basic';
      await membership.save();
    }
  }
  return { membership, features: membershipFeatures(membership) };
}

export async function canManageMember(req, memberId) {
  if (req.user.role === 'owner') return true;
  if (req.user.role !== 'staff') return false;
  const membership = await getCurrentMembership(memberId);
  return membership?.assignedTrainer?.toString() === req.user.sub;
}

export async function requireFeature(req, memberId, feature) {
  if (req.user.role === 'owner' || req.user.role === 'staff') {
    if (!await canManageMember(req, memberId)) {
      return { error: 'You are not assigned to manage this member', status: 403 };
    }
  } else if (req.user.sub !== memberId.toString()) {
    return { error: 'Forbidden', status: 403 };
  }
  const { membership, features } = await getMembershipEntitlements(memberId);
  if (!membership) return { error: 'An active membership is required', status: 403 };
  if (!features[feature]) return { error: 'Active membership does not include this feature', status: 403 };
  return { membership, features };
}
