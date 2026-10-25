import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';
import {
  canManageMember,
  getMembershipEntitlements,
  membershipFeatures,
} from '../services/membershipEntitlements.js';

async function getOwnMemberDashboard(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);
    const memberships = await Membership.find({ member: req.user.sub }).sort({ createdAt: -1 });
    const { membership: current, features } = await getMembershipEntitlements(req.user.sub);
    const payments = await Payment.find({
      member: req.user.sub,
      status: { $in: ['captured', 'refunded'] },
    }).sort({ paidAt: -1 });
    const attendance = await Attendance.find({ member: req.user.sub })
      .sort({ checkedInAt: -1 })
      .limit(50);
    res.json({
      user: user.toSafe(),
      memberships,
      activeMembership: current ? {
        ...current.toObject(),
        planSnapshot: {
          ...(current.planSnapshot?.toObject?.() || current.planSnapshot || {}),
          features,
        },
      } : null,
      payments,
      attendance,
    });
  } catch (error) {
    next(error);
  }
}

async function searchMembers(req, res, next) {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const filter = { role: 'member' };
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
      ];
    }
    if (req.user.role === 'staff') {
      const now = new Date();
      filter._id = { $in: await Membership.distinct('member', {
        status: 'active',
        assignedTrainer: req.user.sub,
        startDate: { $lte: now },
        expiryDate: { $gt: now },
      }) };
    }

    const members = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(filter);
    const result = await Promise.all(members.map(async (member) => {
      const { membership: activeMembership, features } = await getMembershipEntitlements(member._id);
      return {
        ...member.toSafe(),
        activeMembership: activeMembership ? {
          ...activeMembership.toObject(),
          planSnapshot: {
            ...(activeMembership.planSnapshot?.toObject?.() || activeMembership.planSnapshot || {}),
            features,
          },
        } : null,
      };
    }));
    res.json({ members: result, total, page: Number(page) });
  } catch (error) {
    next(error);
  }
}

async function getMemberDetails(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (!await canManageMember(req, user._id)) return res.status(403).json({ error: 'You are not assigned to manage this member' });

    const memberships = await Membership.find({ member: user._id }).sort({ createdAt: -1 });
    const { membership: current, features } = await getMembershipEntitlements(user._id);
    const payments = await Payment.find({ member: user._id }).sort({ paidAt: -1 });
    const attendance = await Attendance.find({ member: user._id })
      .sort({ checkedInAt: -1 })
      .limit(100);
    res.json({
      user: user.toSafe(),
      memberships,
      activeMembership: current ? {
        ...current.toObject(),
        planSnapshot: {
          ...(current.planSnapshot?.toObject?.() || current.planSnapshot || {}),
          features,
        },
      } : null,
      payments,
      attendance,
    });
  } catch (error) {
    next(error);
  }
}

async function listTrainers(_req, res, next) {
  try {
    const trainers = await User.find({ role: 'staff', status: 'active' }).select('name email').sort({ name: 1 });
    res.json({ trainers });
  } catch (error) {
    next(error);
  }
}

async function assignTrainer(req, res, next) {
  try {
    const member = await User.findOne({ _id: req.params.id, role: 'member' });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const trainer = req.body.trainerId
      ? await User.findOne({ _id: req.body.trainerId, role: 'staff', status: 'active' })
      : null;
    if (req.body.trainerId && !trainer) return res.status(400).json({ error: 'Choose an active trainer' });
    const membership = await Membership.findOne({
      member: member._id,
      status: 'active',
      startDate: { $lte: new Date() },
      expiryDate: { $gt: new Date() },
    }).sort({ expiryDate: -1 });
    if (!membership) return res.status(409).json({ error: 'The member has no active membership to assign' });
    membership.assignedTrainer = trainer?._id;
    await membership.save();
    res.json({ membership });
  } catch (error) {
    next(error);
  }
}

export { getOwnMemberDashboard, searchMembers, getMemberDetails, listTrainers, assignTrainer };
