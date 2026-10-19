import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Lead from '../models/Lead.js';
import Attendance from '../models/Attendance.js';
import AuditLog from '../models/AuditLog.js';

async function getAdminOverview(_req, res, next) {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      memberCount,
      activeMembershipCount,
      expiringMembershipCount,
      newLeadCount,
      todayPayments,
      monthPayments,
      todayAttendanceCount,
      recentPayments,
    ] = await Promise.all([
      User.countDocuments({ role: 'member' }),
      Membership.countDocuments({ status: 'active', expiryDate: { $gt: now } }),
      Membership.countDocuments({
        status: 'active',
        expiryDate: { $gte: now, $lte: sevenDaysFromNow },
      }),
      Lead.countDocuments({ status: 'new' }),
      Payment.aggregate([
        { $match: { status: 'captured', paidAt: { $gte: startOfToday } } },
        { $group: { _id: null, sum: { $sum: '$amountInPaise' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'captured', paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, sum: { $sum: '$amountInPaise' } } },
      ]),
      Attendance.countDocuments({ checkedInAt: { $gte: startOfToday } }),
      Payment.find({ status: 'captured' })
        .sort({ paidAt: -1 })
        .limit(10)
        .populate('member', 'name'),
    ]);

    res.json({
      stats: {
        members: memberCount,
        activeMemberships: activeMembershipCount,
        expiringIn7Days: expiringMembershipCount,
        newLeads: newLeadCount,
        collectedTodayPaise: todayPayments[0]?.sum || 0,
        collectedMonthPaise: monthPayments[0]?.sum || 0,
        attendanceToday: todayAttendanceCount,
      },
      recentPayments,
    });
  } catch (error) {
    next(error);
  }
}

async function listAuditEvents(_req, res, next) {
  try {
    const auditEvents = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
    res.json({ audit: auditEvents });
  } catch (error) {
    next(error);
  }
}

async function createStaffAccount(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const staffMember = new User({ name, email, role: 'staff' });
    await staffMember.setPassword(password);
    await staffMember.save();
    res.json({ user: staffMember.toSafe() });
  } catch (error) {
    next(error);
  }
}

export { getAdminOverview, listAuditEvents, createStaffAccount };
