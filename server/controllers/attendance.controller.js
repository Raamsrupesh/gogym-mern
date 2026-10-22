import Attendance from '../models/Attendance.js';

const dayKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

async function listDailyAttendance(req, res, next) {
  try {
    const { date } = req.query;
    const key = date || dayKey();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return res.status(400).json({ error: 'Date must use YYYY-MM-DD' });
    const next = new Date(`${key}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const startOfDay = new Date(`${key}T00:00:00+05:30`);
    const endOfDay = new Date(`${next.toISOString().slice(0, 10)}T00:00:00+05:30`);

    const attendance = await Attendance.find({
      checkedInAt: { $gte: startOfDay, $lt: endOfDay },
    })
      .populate('member', 'name email phone')
      .sort({ checkedInAt: -1 });
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
}

export { listDailyAttendance };
