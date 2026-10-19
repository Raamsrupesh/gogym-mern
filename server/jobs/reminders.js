import cron from 'node-cron';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import ReminderLog from '../models/ReminderLog.js';
import { sendEmail } from '../services/email.service.js';

const STAGES = [7, 3, 1, 0];

async function processOnce() {
  const now = new Date();
  for (const days of STAGES) {
    const target = new Date(now.getTime() + days * 86400000);
    const start = new Date(target); start.setHours(0, 0, 0, 0);
    const end = new Date(target); end.setHours(23, 59, 59, 999);

    const expiring = await Membership.find({
      status: 'active', expiryDate: { $gte: start, $lte: end },
    });

    for (const m of expiring) {
      const stage = `${days}d`;
      const exists = await ReminderLog.findOne({ membership: m._id, stage });
      if (exists) continue;

      const user = await User.findById(m.member);
      if (!user?.email) {
        await ReminderLog.create({ membership: m._id, member: m.member, stage, status: 'skipped', channel: 'none', error: 'No email' });
        continue;
      }
      const log = await ReminderLog.create({ membership: m._id, member: m.member, stage, status: 'queued' });
      try {
        await sendEmail({
          to: user.email,
          subject: `Your GoGym membership expires in ${days} day(s)`,
          text: `Hi ${user.name}, your membership expires on ${m.expiryDate.toDateString()}. Please renew at your gym.`,
        });
        log.status = 'sent'; log.sentAt = new Date();
        await log.save();
      } catch (e) {
        log.status = 'failed'; log.error = e.message;
        await log.save();
      }
    }
  }
}

function start() {
  // daily at 08:30 IST
  cron.schedule('30 8 * * *', () => processOnce().catch(console.error), { timezone: 'Asia/Kolkata' });
  console.log('Reminder job scheduled (Asia/Kolkata 08:30)');
}
export { start, processOnce };