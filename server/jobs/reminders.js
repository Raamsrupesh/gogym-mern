import cron from 'node-cron';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import ReminderLog from '../models/ReminderLog.js';
import AdminReminder from '../models/AdminReminder.js';
import { sendEmail } from '../services/email.service.js';

const STAGES = [7, 3, 1, 0];

function istDayKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function addCalendarDays(key, count) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

async function processOnce() {
  const now = new Date();
  const attempted = new Set();
  const retryBefore = new Date(now.getTime() - 15 * 60 * 1000);
  const retries = await ReminderLog.find({
    status: { $in: ['failed', 'queued'] },
    updatedAt: { $lte: retryBefore },
    stage: { $in: STAGES.map((days) => `${days}d`) },
  }).populate('membership');
  for (const log of retries) {
    const user = await User.findById(log.member);
    if (!user?.email) {
      log.status = 'skipped';
      log.channel = 'none';
      log.error = 'No email';
      await log.save();
      continue;
    }
    const days = Number.parseInt(log.stage, 10);
    log.status = 'queued';
    log.error = undefined;
    await log.save();
    attempted.add(log._id.toString());
    try {
      await sendEmail({
        to: user.email,
        subject: `Your GoGym membership expires in ${days} day(s)`,
        text: `Hi ${user.name}, your membership expires on ${log.membership?.expiryDate?.toDateString() || 'today'}. Please renew at your gym.`,
      });
      log.status = 'sent';
      log.sentAt = new Date();
    } catch (error) {
      log.status = 'failed';
      log.error = error.message;
    }
    await log.save();
  }

  for (const days of STAGES) {
    const targetKey = addCalendarDays(istDayKey(now), days);
    const start = new Date(`${targetKey}T00:00:00+05:30`);
    const end = new Date(`${addCalendarDays(targetKey, 1)}T00:00:00+05:30`);

    const expiring = await Membership.find({
      status: 'active', expiryDate: { $gte: start, $lt: end },
    });

    for (const m of expiring) {
      const stage = `${days}d`;
      let log = await ReminderLog.findOne({ membership: m._id, stage });
      if (log && attempted.has(log._id.toString())) continue;
      if (log && ['sent', 'skipped'].includes(log.status)) continue;

      const user = await User.findById(m.member);
      if (!user?.email) {
        if (!log) {
          await ReminderLog.create({ membership: m._id, member: m.member, stage, status: 'skipped', channel: 'none', error: 'No email' });
        }
        continue;
      }
      if (!log) {
        try {
          log = await ReminderLog.create({ membership: m._id, member: m.member, stage, status: 'queued' });
        } catch (error) {
          if (error.code === 11000) continue;
          throw error;
        }
      } else {
        log.status = 'queued';
        log.error = undefined;
        await log.save();
      }
      attempted.add(log._id.toString());
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

async function processAdminReminders() {
  const due = await AdminReminder.find({ status: 'queued', scheduledAt: { $lte: new Date() } })
    .sort({ scheduledAt: 1 })
    .limit(100);
  for (const reminder of due) {
    const claimed = await AdminReminder.findOneAndUpdate(
      { _id: reminder._id, status: 'queued' },
      { $set: { status: 'sending', error: undefined } },
      { new: true }
    ).populate('member', 'name email');
    if (!claimed) continue;
    try {
      if (!claimed.member?.email) throw new Error('Member has no email address');
      await sendEmail({
        to: claimed.member.email,
        subject: claimed.title,
        text: `Hi ${claimed.member.name},\n\n${claimed.message}`,
      });
      await AdminReminder.updateOne(
        { _id: claimed._id, status: 'sending' },
        { $set: { status: 'sent', sentAt: new Date() } }
      );
    } catch (error) {
      await AdminReminder.updateOne(
        { _id: claimed._id, status: 'sending' },
        { $set: { status: 'failed', error: error.message } }
      );
    }
  }
}

function start() {
  // daily at 08:30 IST
  cron.schedule('30 8 * * *', () => processOnce().catch((error) => console.error('Membership reminder job failed:', error)), { timezone: 'Asia/Kolkata' });
  cron.schedule('* * * * *', () => processAdminReminders().catch((error) => console.error('Admin reminder job failed:', error)), { timezone: 'Asia/Kolkata' });
  console.log('Reminder jobs scheduled (membership: Asia/Kolkata 08:30; admin: every minute)');
}
export { start, processOnce, processAdminReminders };