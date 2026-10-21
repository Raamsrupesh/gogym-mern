import Attendance from '../models/Attendance.js';
import Membership from '../models/Membership.js';

async function checkInMember(req, res, next) {
  try {
    const { memberId } = req.body;
    const activeMembership = await Membership.findOne({
      member: memberId,
      status: 'active',
      expiryDate: { $gt: new Date() },
    });
    if (!activeMembership) return res.status(400).json({ error: 'No valid membership' });

    const attendance = await Attendance.create({
      member: memberId,
      membership: activeMembership._id,
      method: 'manual',
      staff: req.user.sub,
    });
    res.status(201).json({ attendance });
  } catch (error) {
    next(error);
  }
}

async function listDailyAttendance(req, res, next) {
  try {
    const { date } = req.query;
    const selectedDay = date ? new Date(date) : new Date();
    const startOfDay = new Date(selectedDay);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDay);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      checkedInAt: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('member', 'name email phone')
      .sort({ checkedInAt: -1 });
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
}

export { checkInMember, listDailyAttendance };
