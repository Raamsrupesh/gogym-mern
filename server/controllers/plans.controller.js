import Plan from '../models/Plan.js';
import AuditLog from '../models/AuditLog.js';

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
      active,
      order,
    } = req.body;
    if (
      !name ||
      !Number.isInteger(priceInPaise) ||
      !Number.isInteger(originalPriceInPaise) ||
      originalPriceInPaise < 0 ||
      !Number.isInteger(durationDays)
    ) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const plan = await Plan.create({
      name,
      description,
      priceInPaise,
      originalPriceInPaise,
      joiningFeeInPaise: joiningFeeInPaise || 0,
      durationDays,
      benefits: benefits || [],
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
    const changes = { ...req.body };
    delete changes._id;

    const plan = await Plan.findByIdAndUpdate(req.params.id, changes, { new: true });
    if (!plan) return res.status(404).json({ error: 'Not found' });

    await AuditLog.create({
      actor: req.user.sub,
      action: 'plan.update',
      target: plan._id.toString(),
      details: changes,
    });
    res.json({ plan });
  } catch (error) {
    next(error);
  }
}

export { listActivePlans, listAllPlans, createPlan, updatePlan };
