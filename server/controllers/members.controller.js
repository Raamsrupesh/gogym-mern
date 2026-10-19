import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';

async function getOwnMemberDashboard(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);
    const memberships = await Membership.find({ member: req.user.sub }).sort({ createdAt: -1 });
    const payments = await Payment.find({
      member: req.user.sub,
      status: { $in: ['captured', 'refunded'] },
    }).sort({ paidAt: -1 });
    const attendance = await Attendance.find({ member: req.user.sub })
      .sort({ checkedInAt: -1 })
      .limit(50);
    res.json({ user: user.toSafe(), memberships, payments, attendance });
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

    const members = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(filter);
    res.json({ members: members.map((member) => member.toSafe()), total, page: Number(page) });
  } catch (error) {
    next(error);
  }
}

async function getMemberDetails(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });

    const memberships = await Membership.find({ member: user._id }).sort({ createdAt: -1 });
    const payments = await Payment.find({ member: user._id }).sort({ paidAt: -1 });
    const attendance = await Attendance.find({ member: user._id })
      .sort({ checkedInAt: -1 })
      .limit(100);
    res.json({ user: user.toSafe(), memberships, payments, attendance });
  } catch (error) {
    next(error);
  }
}

export { getOwnMemberDashboard, searchMembers, getMemberDetails };
