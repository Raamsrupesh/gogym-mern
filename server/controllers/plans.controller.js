import Plan from '../models/Plan.js';
import Membership from '../models/Membership.js';
import AuditLog from '../models/AuditLog.js';
import { normalizeFeatures, PLAN_FEATURE_KEYS } from '../services/membershipEntitlements.js';

async function listActivePlans(_req, res, next) {
  try {
    const plans = await Plan.find({ active: true }).sort({ order: 1, createdAt: 1 });
    res.json({ plans });
  } catch (error) {
    next(error);
  }
}

async function listAllPlans(_req, res, next) {
  try {
    const plans = await Plan.find().sort({ order: 1, createdAt: 1 });
    res.json({ plans });
  } catch (error) {
    next(error);
  }
}

async function createPlan(req, res, next) {
  try {
    const {
      name,
      description,
      priceInPaise,
      originalPriceInPaise = 0,
      joiningFeeInPaise,
      durationDays,
      benefits,
      category = 'basic',
      features,
      dietGuidance = false,
      active,
      order,
    } = req.body;
    if (
      !name ||
      !Number.isInteger(priceInPaise) ||
      !Number.isInteger(originalPriceInPaise) ||
      originalPriceInPaise < 0 ||
      !Number.isInteger(durationDays) ||
      durationDays < 1 ||
      !['basic', 'professional'].includes(category)
    ) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    if (features !== undefined && !isValidFeatures(features)) {
      return res.status(400).json({ error: 'Plan features must contain valid boolean entitlements and a positive daily session limit' });
    }

    const normalizedFeatures = normalizeFeatures(features, dietGuidance);
    const plan = await Plan.create({
      code: req.body.code,
      name,
      category,
      description,
      priceInPaise,
      originalPriceInPaise,
      joiningFeeInPaise: joiningFeeInPaise || 0,
      durationDays,
      benefits: benefits || [],
      features: normalizedFeatures,
      dietGuidance: normalizedFeatures.diet_chart,
      active: active !== false,
      order: order || 0,
    });
    await AuditLog.create({ actor: req.user.sub, action: 'plan.create', target: plan._id.toString() });
    res.json({ plan });
  } catch (error) {
    next(error);
  }
}

async function updatePlan(req, res, next) {
  try {
    const { applyToExistingMemberships = false, ...body } = req.body;
    if (typeof applyToExistingMemberships !== 'boolean') {
      return res.status(400).json({ error: 'applyToExistingMemberships must be a boolean' });
    }
    const fields = [
      'name', 'description', 'priceInPaise', 'originalPriceInPaise',
      'joiningFeeInPaise', 'durationDays', 'benefits', 'category', 'features', 'dietGuidance',
      'active', 'order',
    ];
    const changes = Object.fromEntries(fields
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, body[field]]));
    if (changes.category !== undefined && !['basic', 'professional'].includes(changes.category)) {
      return res.status(400).json({ error: 'category must be basic or professional' });
    }
    if (changes.features !== undefined && !isValidFeatures(changes.features)) {
      return res.status(400).json({ error: 'Plan features must contain valid boolean entitlements and a positive daily session limit' });
    }
    if (changes.dietGuidance !== undefined && typeof changes.dietGuidance !== 'boolean') {
      return res.status(400).json({ error: 'dietGuidance must be a boolean' });
    }
    if (changes.features !== undefined) {
      changes.features = normalizeFeatures(changes.features);
      changes.dietGuidance = changes.features.diet_chart;
    } else if (changes.dietGuidance !== undefined) {
      changes.features = normalizeFeatures({}, changes.dietGuidance);
    }
    if (changes.priceInPaise !== undefined && (!Number.isInteger(changes.priceInPaise) || changes.priceInPaise < 0)) {
      return res.status(400).json({ error: 'Invalid plan price' });
    }
    if (changes.originalPriceInPaise !== undefined && (!Number.isInteger(changes.originalPriceInPaise) || changes.originalPriceInPaise < 0)) {
      return res.status(400).json({ error: 'Invalid original price' });
    }
    if (changes.durationDays !== undefined && (!Number.isInteger(changes.durationDays) || changes.durationDays < 1)) {
      return res.status(400).json({ error: 'Duration must be a positive number of days' });
    }

    const plan = await Plan.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ error: 'Not found' });

    if (applyToExistingMemberships && (changes.features || changes.category)) {
      await Membership.updateMany(
        { plan: plan._id, status: 'active' },
        { $set: {
          'planSnapshot.features': normalizeFeatures(plan.features, plan.dietGuidance),
          'planSnapshot.dietGuidance': plan.dietGuidance,
          'planSnapshot.category': plan.category,
        } }
      );
    }
    await AuditLog.create({
      actor: req.user.sub,
      action: 'plan.update',
      target: plan._id.toString(),
      details: { ...changes, applyToExistingMemberships },
    });
    res.json({ plan });
  } catch (error) {
    next(error);
  }
}

function isValidFeatures(features) {
  if (!features || typeof features !== 'object' || Array.isArray(features)) return false;
  for (const key of PLAN_FEATURE_KEYS) {
    if (key === 'daily_session_limit') continue;
    if (features[key] !== undefined && typeof features[key] !== 'boolean') return false;
  }
  return features.daily_session_limit === undefined ||
    (Number.isInteger(features.daily_session_limit) && features.daily_session_limit >= 0);
}

export { listActivePlans, listAllPlans, createPlan, updatePlan };
