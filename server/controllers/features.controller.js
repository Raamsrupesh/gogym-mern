import crypto from 'node:crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import WorkoutPlan from '../models/WorkoutPlan.js';
import WorkoutPerformance from '../models/WorkoutPerformance.js';
import TrainerNote from '../models/TrainerNote.js';
import DietPlan from '../models/DietPlan.js';
import Transformation from '../models/Transformation.js';
import Referral from '../models/Referral.js';
import Equipment from '../models/Equipment.js';
import Feedback from '../models/Feedback.js';
import GymNotification from '../models/GymNotification.js';
import FeatureConfig from '../models/FeatureConfig.js';
import { sendEmail } from '../services/email.service.js';
import { transformationUploadDirectory } from '../config/uploads.js';
import { createReferralClaim } from '../services/referrals.service.js';

const staffRoles = ['owner', 'staff'];
const isStaff = (req) => staffRoles.includes(req.user.role);
const invalid = (res, message) => res.status(400).json({ error: message });
const notFound = (res) => res.status(404).json({ error: 'Not found' });
const dayKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);
const addDays = (key, amount) => {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};
const istRange = (startKey, endKey) => ({
  $gte: new Date(`${startKey}T00:00:00+05:30`),
  $lt: new Date(`${endKey}T00:00:00+05:30`),
});
const memberIdFor = (req) => isStaff(req) ? req.query.memberId || req.body?.memberId : req.user.sub;

async function notifyMember(member, type, title, message) {
  const notification = await GymNotification.create({
    recipient: member._id, type, title, message,
    emailStatus: member.email ? 'failed' : 'not_configured',
    emailError: member.email ? undefined : 'No member email address',
  });
  if (member.email) {
    try {
      await sendEmail({ to: member.email, subject: title, text: message });
      notification.emailStatus = 'sent';
      notification.emailError = undefined;
    } catch (error) {
      notification.emailStatus = 'failed';
      notification.emailError = error.message;
    }
    await notification.save();
  }
  return notification;
}

async function requireMember(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return User.findOne({ _id: id, role: 'member', status: 'active' });
}

export async function listAttendance(req, res, next) {
  try {
    const memberId = memberIdFor(req);
    if (!isStaff(req) && req.query.memberId) return res.status(403).json({ error: 'Forbidden' });
    if (req.path.endsWith('/history')) {
      const filter = { checkedInAt: { $gte: new Date(Date.now() - 365 * 86400000) } };
      if (memberId) filter.member = memberId;
      const attendance = await Attendance.find(filter)
        .populate('member', 'name')
        .sort({ checkedInAt: -1 }).limit(500);
      return res.json({ attendance });
    }
    const day = req.query.date || dayKey();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return invalid(res, 'Date must use YYYY-MM-DD');
    const filter = { checkedInAt: istRange(day, addDays(day, 1)) };
    if (memberId) filter.member = memberId;
    const attendance = await Attendance.find(filter)
      .populate('member', 'name')
      .sort({ checkedInAt: -1 }).limit(500);
    res.json({ attendance });
  } catch (error) { next(error); }
}

export async function leaderboard(req, res, next) {
  try {
    const period = req.query.period === 'month' ? 'month' : 'week';
    const nowKey = dayKey();
    const date = new Date(`${nowKey}T00:00:00Z`);
    const startKey = period === 'month'
      ? `${nowKey.slice(0, 7)}-01`
      : addDays(nowKey, -((date.getUTCDay() + 6) % 7));
    const days = await Attendance.aggregate([
      { $match: { checkedInAt: istRange(startKey, addDays(nowKey, 1)) } },
      { $set: { attendanceDay: { $ifNull: ['$dayKey', { $dateToString: { format: '%Y-%m-%d', date: '$checkedInAt', timezone: 'Asia/Kolkata' } }] } } },
      { $group: { _id: { member: '$member', day: '$attendanceDay' } } },
      { $group: { _id: '$_id.member', count: { $sum: 1 }, days: { $push: '$_id.day' } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 500 },
    ]);
    const ranked = days.map((entry, index) => ({ memberId: entry._id, count: entry.count, rank: index + 1 }));
    const histories = await Attendance.aggregate([
      { $set: { attendanceDay: { $ifNull: ['$dayKey', { $dateToString: { format: '%Y-%m-%d', date: '$checkedInAt', timezone: 'Asia/Kolkata' } }] } } },
      { $group: { _id: { member: '$member', day: '$attendanceDay' } } },
      { $sort: { '_id.day': -1 } },
      { $group: { _id: '$_id.member', days: { $push: '$_id.day' } } },
    ]);
    const streaks = new Map(histories.map(({ _id, days: memberDays }) => {
      const unique = [...new Set(memberDays)].sort();
      let best = 0;
      let run = 0;
      let previous;
      for (const key of unique) {
        run = previous && addDays(previous, 1) === key ? run + 1 : 1;
        best = Math.max(best, run);
        previous = key;
      }
      let current = 0;
      let expected = unique.at(-1) === nowKey ? nowKey : addDays(nowKey, -1);
      for (const key of [...unique].reverse()) {
        if (key !== expected) break;
        current += 1;
        expected = addDays(expected, -1);
      }
      return [_id.toString(), { currentStreak: current, bestStreak: best }];
    }));
    const memberIds = ranked.map((row) => row.memberId);
    const names = await User.find({ _id: { $in: memberIds }, role: 'member' }).select('name');
    const nameMap = new Map(names.map((user) => [user._id.toString(), user.name]));
    const rows = ranked.map((row) => ({
      rank: row.rank, memberId: row.memberId,
      name: nameMap.get(row.memberId.toString()) || 'Member',
      attendanceCount: row.count,
      ...(streaks.get(row.memberId.toString()) || { currentStreak: 0, bestStreak: 0 }),
    }));
    res.json({ period, leaderboard: rows, myRank: rows.find((row) => row.memberId.toString() === req.user.sub) || null });
  } catch (error) { next(error); }
}

export async function saveWorkoutPlan(req, res, next) {
  try {
    const { memberId, title, description = '', exercises, status = 'published' } = req.body;
    if (!await requireMember(memberId)) return notFound(res);
    if (!title || !Array.isArray(exercises) || !exercises.length) return invalid(res, 'Title and at least one exercise are required');
    if (!['draft', 'published'].includes(status)) return invalid(res, 'Invalid plan status');
    const plan = await WorkoutPlan.create({ member: memberId, createdBy: req.user.sub, title, description, exercises, status });
    if (status === 'published') {
      const member = await User.findById(memberId);
      await notifyMember(member, 'workout_plan', 'Workout plan assigned', `A workout plan "${title}" is available in your GoGym dashboard.`);
    }
    res.status(201).json({ plan });
  } catch (error) { next(error); }
}

export async function listWorkoutPlans(req, res, next) {
  try {
    const filter = isStaff(req)
      ? (req.query.memberId ? { member: req.query.memberId } : {})
      : { member: req.user.sub, status: { $in: ['published', 'archived'] } };
    if (req.query.status && isStaff(req)) filter.status = req.query.status;
    const plans = await WorkoutPlan.find(filter).populate('member', 'name').sort({ updatedAt: -1 }).limit(500);
    res.json({ plans });
  } catch (error) { next(error); }
}

export async function updateWorkoutPlan(req, res, next) {
  try {
    const plan = await WorkoutPlan.findById(req.params.id);
    if (!plan) return notFound(res);
    for (const field of ['title', 'description', 'exercises', 'status']) {
      if (req.body[field] !== undefined) plan[field] = req.body[field];
    }
    await plan.save();
    if (plan.status === 'published') {
      const member = await User.findById(plan.member);
      await notifyMember(member, 'workout_plan', 'Workout plan updated', `Your workout plan "${plan.title}" was updated.`);
    }
    res.json({ plan });
  } catch (error) { next(error); }
}

export async function savePerformance(req, res, next) {
  try {
    const memberId = isStaff(req) ? req.body.memberId : req.user.sub;
    if (!await requireMember(memberId)) return notFound(res);
    const { exercise, sets, reps, weight, performedAt, notes } = req.body;
    if (!exercise || !Number.isInteger(sets) || !Number.isInteger(reps) ||
      sets < 1 || reps < 1 || (weight !== undefined && (!Number.isFinite(weight) || weight < 0))) {
      return invalid(res, 'Exercise, positive sets/reps, and a non-negative weight are required');
    }
    const record = await WorkoutPerformance.create({
      member: memberId, recordedBy: req.user.sub, exercise, sets, reps, weight,
      notes, performedAt: performedAt ? new Date(performedAt) : new Date(),
    });
    res.status(201).json({ record });
  } catch (error) { next(error); }
}

export async function listPerformance(req, res, next) {
  try {
    const memberId = isStaff(req) ? req.query.memberId : req.user.sub;
    if (!memberId) return invalid(res, 'memberId is required');
    const records = await WorkoutPerformance.find({ member: memberId }).sort({ performedAt: 1 }).limit(2000);
    res.json({ records });
  } catch (error) { next(error); }
}

export async function saveTrainerNote(req, res, next) {
  try {
    const { memberId, weekOf, visibility = 'private' } = req.body;
    if (!await requireMember(memberId)) return notFound(res);
    if (!weekOf || !['private', 'published'].includes(visibility)) return invalid(res, 'Valid week and visibility are required');
    const note = await TrainerNote.create({
      member: memberId,
      author: req.user.sub,
      weekOf,
      observations: req.body.observations,
      strengths: req.body.strengths,
      improvements: req.body.improvements,
      goals: req.body.goals,
      nextWeekAdjustments: req.body.nextWeekAdjustments,
      visibility,
    });
    if (visibility === 'published') {
      const member = await User.findById(memberId);
      await notifyMember(member, 'trainer_note', 'New trainer notes', 'Your trainer published notes and goals for your next training week.');
    }
    res.status(201).json({ note });
  } catch (error) { next(error); }
}

export async function listTrainerNotes(req, res, next) {
  try {
    const filter = isStaff(req)
      ? (req.query.memberId ? { member: req.query.memberId } : {})
      : { member: req.user.sub, visibility: 'published' };
    const notes = await TrainerNote.find(filter).sort({ weekOf: -1 }).limit(500);
    res.json({ notes });
  } catch (error) { next(error); }
}

export async function updateTrainerNote(req, res, next) {
  try {
    const note = await TrainerNote.findById(req.params.id);
    if (!note) return notFound(res);
    for (const field of [
      'weekOf', 'observations', 'strengths', 'improvements', 'goals',
      'nextWeekAdjustments', 'visibility',
    ]) {
      if (req.body[field] !== undefined) note[field] = req.body[field];
    }
    await note.save();
    if (note.visibility === 'published') {
      const member = await User.findById(note.member);
      await notifyMember(member, 'trainer_note', 'Trainer notes updated', 'Your trainer updated your training notes.');
    }
    res.json({ note });
  } catch (error) { next(error); }
}

async function hasDietAccess(memberId) {
  const memberships = await Membership.find({
    member: memberId, status: 'active', expiryDate: { $gt: new Date() },
  }).sort({ expiryDate: -1 });
  return memberships.some((membership) => membership.startDate <= new Date() && membership.planSnapshot?.dietGuidance === true);
}

export async function listDietPlans(req, res, next) {
  try {
    const memberId = isStaff(req) ? req.query.memberId : req.user.sub;
    if (!memberId) return invalid(res, 'memberId is required');
    if (!await hasDietAccess(memberId)) return res.status(403).json({ error: 'Active membership does not include diet guidance' });
    const diets = await DietPlan.find({ member: memberId }).sort({ startsAt: -1 });
    res.json({ diets });
  } catch (error) { next(error); }
}

export async function saveDietPlan(req, res, next) {
  try {
    const { memberId, startsAt, endsAt, meals } = req.body;
    if (!await requireMember(memberId)) return notFound(res);
    if (!await hasDietAccess(memberId)) return res.status(403).json({ error: 'Member membership does not include diet guidance' });
    if (!startsAt || !endsAt || !Number.isFinite(new Date(startsAt).getTime()) ||
      !Number.isFinite(new Date(endsAt).getTime()) || new Date(endsAt) < new Date(startsAt) ||
      !Array.isArray(meals) || !meals.length) {
      return invalid(res, 'A valid date range and at least one meal are required');
    }
    const diet = await DietPlan.create({
      member: memberId,
      trainer: req.user.sub,
      startsAt,
      endsAt,
      meals,
      notes: req.body.notes,
    });
    const member = await User.findById(memberId);
    await notifyMember(member, 'diet_plan', 'Diet guidance published', 'Your trainer added diet guidance to your GoGym dashboard.');
    res.status(201).json({ diet });
  } catch (error) { next(error); }
}

export async function createTransformation(req, res, next) {
  try {
    const { memberId, description = '', beforeDate, afterDate } = req.body;
    if (!await requireMember(memberId)) return notFound(res);
    if (!req.files?.beforeImage?.[0] || !req.files?.afterImage?.[0]) return invalid(res, 'Before and after images are required');
    const transformation = await Transformation.create({
      member: memberId, createdBy: req.user.sub,
      beforeImage: req.files.beforeImage[0].filename,
      afterImage: req.files.afterImage[0].filename,
      description, beforeDate, afterDate,
      consentGranted: false,
      status: 'draft',
    });
    res.status(201).json({ transformation });
  } catch (error) { next(error); }
}

export async function listTransformations(req, res, next) {
  try {
    const filter = isStaff(req)
      ? (req.query.status ? { status: req.query.status } : {})
      : { member: req.user.sub };
    const transformations = await Transformation.find(filter).populate('member', 'name').sort({ createdAt: -1 });
    res.json({ transformations });
  } catch (error) { next(error); }
}

export async function updateTransformation(req, res, next) {
  try {
    const transformation = await Transformation.findById(req.params.id);
    if (!transformation) return notFound(res);
    if (req.body.status === 'published' && !transformation.consentGranted) {
      return res.status(403).json({ error: 'Member consent is required before publishing' });
    }
    if (!['draft', 'published', 'archived'].includes(req.body.status)) return invalid(res, 'Invalid transformation status');
    transformation.status = req.body.status;
    await transformation.save();
    res.json({ transformation });
  } catch (error) { next(error); }
}

export async function grantTransformationConsent(req, res, next) {
  try {
    if (typeof req.body.consent !== 'boolean') return invalid(res, 'Consent must be explicitly granted or revoked');
    const transformation = await Transformation.findOne({ _id: req.params.id, member: req.user.sub });
    if (!transformation) return notFound(res);
    transformation.consentGranted = req.body.consent;
    transformation.consentedAt = req.body.consent ? new Date() : undefined;
    if (!req.body.consent && transformation.status === 'published') transformation.status = 'draft';
    await transformation.save();
    res.json({ transformation });
  } catch (error) { next(error); }
}

export async function serveTransformationImage(req, res, next) {
  try {
    const item = await Transformation.findById(req.params.id);
    if (!item) return notFound(res);
    const permitted = isStaff(req) || item.member.toString() === req.user.sub;
    if (!permitted && item.status !== 'published') return res.status(403).json({ error: 'Forbidden' });
    const filename = req.params.image === 'before' ? item.beforeImage
      : req.params.image === 'after' ? item.afterImage : null;
    if (!filename) return notFound(res);
    res.sendFile(filename, { root: transformationUploadDirectory }, (error) => {
      if (error) next(error);
    });
  } catch (error) { next(error); }
}

export async function getReferral(req, res, next) {
  try {
    let user = await User.findById(req.user.sub);
    const activeMembership = await Membership.exists({
      member: user._id, status: 'active', startDate: { $lte: new Date() }, expiryDate: { $gt: new Date() },
    });
    if (!activeMembership) return res.status(403).json({ error: 'An active membership is required for a referral code' });
    const config = await FeatureConfig.findOne({ singleton: 'main' });
    const enabled = config?.referralsEnabled === true;
    if (enabled && !user.referralCode) {
      user.referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();
      await user.save();
    }
    const referrals = await Referral.find({ referrer: user._id }).populate('referred', 'name').sort({ createdAt: -1 });
    res.json({
      code: enabled ? user.referralCode : null,
      enabled,
      reward: config?.referralReward || '',
      newMemberDiscountInPaise: config?.newMemberDiscountInPaise || 0,
      referrerDiscountInPaise: config?.referrerDiscountInPaise || 0,
      availableDiscountInPaise: Math.max(
        0,
        (user.referralDiscountBalanceInPaise || 0) - (user.referralDiscountReservation?.amountInPaise || 0)
      ),
      referrals,
    });
  } catch (error) { next(error); }
}

export async function useReferral(req, res, next) {
  try {
    const referral = await createReferralClaim(req.user.sub, req.body.code);
    res.status(201).json({ referral });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

export async function getReferralConfig(_req, res, next) {
  try {
    const config = await FeatureConfig.findOneAndUpdate(
      { singleton: 'main' },
      { $setOnInsert: { singleton: 'main' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ config });
  } catch (error) { next(error); }
}

export async function listAllReferrals(_req, res, next) {
  try {
    const referrals = await Referral.find().populate('referrer referred', 'name email').sort({ createdAt: -1 }).limit(500);
    res.json({ referrals });
  } catch (error) { next(error); }
}

export async function manageReferral(req, res, next) {
  try {
    const { status, reward } = req.body;
    if (!['pending', 'converted', 'rewarded', 'rejected'].includes(status)) return invalid(res, 'Invalid referral status');
    if (['converted', 'rewarded'].includes(status)) {
      return invalid(res, 'Referral conversion and discount rewards are recorded automatically after a successful payment');
    }
    if (reward !== undefined && (typeof reward !== 'string' || reward.length > 200)) return invalid(res, 'Reward description must be 200 characters or fewer');
    const referral = await Referral.findById(req.params.id);
    if (!referral) return notFound(res);
    if (referral.rewardedAt && status !== 'rewarded') {
      return res.status(409).json({ error: 'A rewarded referral cannot be reset or rewarded again' });
    }
    if (status === 'rewarded' && referral.rewardedAt) {
      return res.status(409).json({ error: 'Referral reward has already been issued' });
    }
    if (status === 'rewarded' && referral.status !== 'converted') {
      return invalid(res, 'Only converted referrals can be rewarded');
    }
    referral.status = status;
    if (typeof reward === 'string' && reward.length <= 200) referral.reward = reward;
    if (status === 'rewarded') referral.rewardedAt = new Date();
    await referral.save();
    res.json({ referral });
  } catch (error) { next(error); }
}

export async function updateReferralConfig(req, res, next) {
  try {
    const { referralsEnabled, referralReward = '', newMemberDiscountInPaise, referrerDiscountInPaise } = req.body;
    if (typeof referralsEnabled !== 'boolean' || typeof referralReward !== 'string' || referralReward.length > 200 ||
      !Number.isSafeInteger(newMemberDiscountInPaise) || newMemberDiscountInPaise < 0 ||
      !Number.isSafeInteger(referrerDiscountInPaise) || referrerDiscountInPaise < 0) {
      return invalid(res, 'Provide valid referral enablement, reward text, and non-negative discount amounts in paise');
    }
    const config = await FeatureConfig.findOneAndUpdate(
      { singleton: 'main' },
      { $set: { referralsEnabled, referralReward, newMemberDiscountInPaise, referrerDiscountInPaise } },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ config });
  } catch (error) { next(error); }
}

export async function listEquipment(_req, res, next) {
  try {
    const equipment = await Equipment.find({ archivedAt: null }).sort({ name: 1 });
    res.json({ equipment });
  } catch (error) { next(error); }
}

export async function saveEquipment(req, res, next) {
  try {
    const fields = [
      'name', 'category', 'brand', 'model', 'serialNumber', 'location',
      'purchaseDate', 'purchaseCostInPaise', 'status', 'nextMaintenanceAt',
    ];
    const payload = Object.fromEntries(fields
      .filter((field) => req.body[field] !== undefined)
      .map((field) => [field, req.body[field]]));
    if (!req.params.id && !payload.name) return invalid(res, 'Equipment name is required');
    for (const field of ['purchaseCostInPaise']) {
      if (payload[field] !== undefined && (!Number.isInteger(payload[field]) || payload[field] < 0)) {
        return invalid(res, `${field} must be a non-negative integer`);
      }
    }
    if (payload.status && !['operational', 'needs_maintenance', 'under_repair', 'out_of_service'].includes(payload.status)) {
      return invalid(res, 'Invalid equipment status');
    }
    const equipment = req.params.id
      ? await Equipment.findOneAndUpdate({ _id: req.params.id, archivedAt: null }, payload, { new: true, runValidators: true })
      : await Equipment.create(payload);
    if (!equipment) return notFound(res);
    res.status(req.params.id ? 200 : 201).json({ equipment });
  } catch (error) { next(error); }
}

export async function archiveEquipment(req, res, next) {
  try {
    const equipment = await Equipment.findOneAndUpdate(
      { _id: req.params.id, archivedAt: null }, { archivedAt: new Date() }, { new: true }
    );
    if (!equipment) return notFound(res);
    res.json({ equipment });
  } catch (error) { next(error); }
}

export async function addMaintenance(req, res, next) {
  try {
    const equipment = await Equipment.findOne({ _id: req.params.id, archivedAt: null });
    if (!equipment) return notFound(res);
    if (!['fault', 'maintenance', 'repair'].includes(req.body.kind) || !req.body.description) return invalid(res, 'Maintenance type and description are required');
    const { kind, description, scheduledAt, completedAt, costInPaise, notes } = req.body;
    if (costInPaise !== undefined && (!Number.isInteger(costInPaise) || costInPaise < 0)) {
      return invalid(res, 'Maintenance cost must be a non-negative integer in paise');
    }
    equipment.maintenance.push({ kind, description, scheduledAt, completedAt, costInPaise, notes, recordedBy: req.user.sub });
    if (req.body.kind === 'fault') equipment.status = 'needs_maintenance';
    if (req.body.kind === 'repair') equipment.status = 'under_repair';
    await equipment.save();
    res.status(201).json({ equipment });
  } catch (error) { next(error); }
}

export async function submitFeedback(req, res, next) {
  try {
    const period = dayKey().slice(0, 7);
    const { overall, cleanliness, equipment, trainer, category = '', message = '' } = req.body;
    if (![overall, cleanliness, equipment, trainer].every((value) => value === undefined || (Number.isInteger(value) && value >= 1 && value <= 5)) ||
      !Number.isInteger(overall) || typeof message !== 'string' || message.length > 3000 ||
      typeof category !== 'string' || category.length > 80) {
      return invalid(res, 'Ratings must be between 1 and 5');
    }
    if (await Feedback.exists({ member: req.user.sub, period })) {
      return res.status(409).json({ error: 'Feedback has already been submitted this month' });
    }
    const feedback = await Feedback.create({
      member: req.user.sub, period, overall, cleanliness, equipment, trainer, category, message,
    });
    res.status(201).json({ feedback });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Feedback has already been submitted this month' });
    next(error);
  }
}

export async function listFeedback(req, res, next) {
  try {
    const filter = {};
    if (req.query.resolved === 'true') filter.resolved = true;
    if (req.query.resolved === 'false') filter.resolved = false;
    const feedback = await Feedback.find(filter).populate('member', 'name').sort({ createdAt: -1 }).limit(500);
    res.json({ feedback });
  } catch (error) { next(error); }
}

export async function updateFeedback(req, res, next) {
  try {
    const updates = {};
    if (typeof req.body.response === 'string' && req.body.response.length <= 3000) updates.response = req.body.response;
    if (typeof req.body.resolved === 'boolean') updates.resolved = req.body.resolved;
    if (typeof req.body.publicApproved === 'boolean') updates.publicApproved = req.body.publicApproved;
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!feedback) return notFound(res);
    res.json({ feedback });
  } catch (error) { next(error); }
}

export async function listNotifications(req, res, next) {
  try {
    const notifications = await GymNotification.find({ recipient: req.user.sub }).sort({ createdAt: -1 }).limit(200);
    res.json({ notifications });
  } catch (error) { next(error); }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notification = await GymNotification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.sub }, { readAt: new Date() }, { new: true }
    );
    if (!notification) return notFound(res);
    res.json({ notification });
  } catch (error) { next(error); }
}
