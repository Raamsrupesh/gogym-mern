import cron from 'node-cron';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import ReminderLog from '../models/ReminderLog.js';
import { sendEmail } from '../services/email.service.js';
import { sendRenewalWhatsApp } from '../services/whatsapp.service.js';

const STAGES = [7, 3, 2, 1, 0];

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
    if (!log.membership || log.membership.status !== 'active' || log.membership.expiryDate <= now) {
      log.status = 'skipped';
      log.error = 'Membership expired before reminder delivery';
      await log.save();
      continue;
    }
    const days = Number.parseInt(log.stage, 10);
    await deliverReminder(log, user, log.membership, days);
    attempted.add(log._id.toString());
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
      if (!log) {
        try {
          log = await ReminderLog.create({ membership: m._id, member: m.member, stage, status: 'queued', channel: 'email_whatsapp' });
        } catch (error) {
          if (error.code === 11000) continue;
          throw error;
        }
      }
      attempted.add(log._id.toString());
      await deliverReminder(log, user, m, days);
    }
  }
}

async function deliverReminder(log, user, membership, days) {
  const expiryDate = membership.expiryDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const message = `Hi ${user?.name || 'there'}, your GoGym membership expires ${days === 0 ? 'today' : `in ${days} days`} (${expiryDate}). Please renew to continue your training.`;

  if (!['sent', 'skipped'].includes(log.emailStatus)) {
    if (!user?.email) {
      log.emailStatus = 'skipped';
      log.emailError = 'No email address';
    } else {
      try {
        await sendEmail({
          to: user.email,
          subject: `Your GoGym membership expires in ${days} day(s)`,
          text: `${message} Contact the gym to renew.`,
        });
        log.emailStatus = 'sent';
        log.emailError = undefined;
        log.emailSentAt = new Date();
      } catch (error) {
        log.emailStatus = 'failed';
        log.emailError = error.message;
      }
    }
  }

  if (!['sent', 'skipped'].includes(log.whatsappStatus)) {
    if (!user?.phone) {
      log.whatsappStatus = 'skipped';
      log.whatsappError = 'No phone number';
    } else if (!user.consentMarketing) {
      log.whatsappStatus = 'skipped';
      log.whatsappError = 'Member has not opted in to WhatsApp reminders';
    } else {
      try {
        await sendRenewalWhatsApp({
          to: user.phone,
          name: user.name,
          days,
          expiryDate,
        });
        log.whatsappStatus = 'sent';
        log.whatsappError = undefined;
        log.whatsappSentAt = new Date();
      } catch (error) {
        log.whatsappStatus = 'failed';
        log.whatsappError = error.message;
      }
    }
  }

  const channelStatuses = [log.emailStatus, log.whatsappStatus];
  const errors = [log.emailError, log.whatsappError].filter(Boolean);
  log.channel = 'email_whatsapp';
  log.status = channelStatuses.includes('failed')
    ? 'failed'
    : channelStatuses.includes('sent') ? 'sent' : 'skipped';
  log.error = errors.length ? errors.join('; ') : undefined;
  log.sentAt = log.emailSentAt || log.whatsappSentAt;
  await log.save();
  if (log.status === 'failed') {
    console.error(`Membership reminder delivery failed (${log._id}, ${log.stage}): ${log.error}`);
  }
}

function start() {
  // daily at 08:30 IST
  cron.schedule('30 8 * * *', () => processOnce().catch((error) => console.error('Membership reminder job failed:', error)), { timezone: 'Asia/Kolkata' });
  console.log('Membership reminder job scheduled (Asia/Kolkata 08:30)');
}
export { start, processOnce };