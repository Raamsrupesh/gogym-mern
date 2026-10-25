import Payment from '../models/Payment.js';
import Membership from '../models/Membership.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import AuditLog from '../models/AuditLog.js';
import { completeReferralForMember } from '../services/referrals.service.js';
import { snapshotPlanFeatures } from '../services/membershipEntitlements.js';

async function searchPayments(req, res, next) {
  try {
    const { status, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.$or = [{ razorpayPaymentId: new RegExp(q, 'i') }, { notes: new RegExp(q, 'i') }];

    const payments = await Payment.find(filter)
      .populate('member', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Payment.countDocuments(filter);
    res.json({ payments, total });
  } catch (error) {
    next(error);
  }
}

async function recordOfflinePayment(req, res, next) {
  try {
    const { memberId, planId, amountInPaise, method, notes } = req.body;
    if (!memberId || !planId || !Number.isInteger(amountInPaise) || !['cash', 'upi', 'other'].includes(method)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const plan = await Plan.findOne({ _id: planId, active: true });
    const member = await User.findOne({ _id: memberId, role: 'member', status: 'active' });
    if (!plan || !member) return res.status(404).json({ error: 'Not found' });
    let assignedTrainer;
    if (req.body.assignedTrainer) {
      if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only the owner can assign a trainer' });
      assignedTrainer = await User.findOne({ _id: req.body.assignedTrainer, role: 'staff', status: 'active' });
      if (!assignedTrainer) return res.status(400).json({ error: 'Choose an active trainer' });
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + plan.durationDays * 86400000);
    const membership = await Membership.create({
      member,
      plan: plan._id,
      assignedTrainer: assignedTrainer?._id,
      planSnapshot: snapshotPlanFeatures(plan),
      startDate: now,
      expiryDate,
      status: 'active',
      source: 'offline',
    });
    const invoiceSequence = await Counter.next('invoice');
    const invoiceNumber = `GOGYM-${new Date().getFullYear()}-${String(invoiceSequence).padStart(6, '0')}`;
    const payment = await Payment.create({
      member: member._id,
      plan: plan._id,
      membership: membership._id,
      amountInPaise,
      method,
      status: 'captured',
      notes,
      recordedBy: req.user.sub,
      paidAt: now,
      invoiceNumber,
    });
    await completeReferralForMember(member._id);
    await AuditLog.create({
      actor: req.user.sub,
      action: 'payment.manual',
      target: payment._id.toString(),
      details: { amountInPaise, method },
    });
    res.json({ payment, membership });
  } catch (error) {
    next(error);
  }
}

export { searchPayments, recordOfflinePayment };
