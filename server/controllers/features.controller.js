import crypto from 'node:crypto';
import fs from 'node:fs/promises';
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
import FeatureConfig from '../models/FeatureConfig.js';
import { memberDocumentUploadDirectory, transformationUploadDirectory } from '../config/uploads.js';
import { createReferralClaim } from '../services/referrals.service.js';
import { getWorkoutService } from '../data/workoutServices.js';
import MemberReport from '../models/MemberReport.js';
import { requireFeature } from '../services/membershipEntitlements.js';

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
const documentDetails = (file) => file && ({
  filename: file.filename,
  originalName: file.originalname,
  mimeType: file.mimetype,
});
const safeDocument = (document) => document && ({
  originalName: document.originalName,
  mimeType: document.mimeType,
});

async function removeUploadedFile(file) {
  if (!file?.path) return;
  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function rejectUploadedFile(req, res, status, message) {
  await removeUploadedFile(req.file);
  return res.status(status).json({ error: message });
}

function parseJsonField(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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
    const { memberId, serviceId, exercises, status = 'published' } = req.body;
    if (!await requireMember(memberId)) return notFound(res);
    const access = await requireFeature(req, memberId, 'training_guidance');
    if (access.error) return res.status(access.status).json({ error: access.error });
    const service = getWorkoutService(serviceId);
    if (!service || !Array.isArray(exercises) || !exercises.length) return invalid(res, 'Choose a service and provide at least one exercise');
    if (!['draft', 'published'].includes(status)) return invalid(res, 'Invalid plan status');
    for (const field of ['fitnessGoal', 'schedule', 'trainerNotes']) {
      if (req.body[field] !== undefined && (typeof req.body[field] !== 'string' ||
        req.body[field].length > { fitnessGoal: 500, schedule: 1000, trainerNotes: 2000 }[field])) {
        return invalid(res, `Invalid ${field}`);
      }
    }
    const plan = await WorkoutPlan.create({
      member: memberId, createdBy: req.user.sub, serviceId,
      title: service.title, description: service.description, exercises, status,
      fitnessGoal: req.body.fitnessGoal,
      schedule: req.body.schedule,
      trainerNotes: req.body.trainerNotes,
    });
    res.status(201).json({ plan });
  } catch (error) { next(error); }
}

export async function listWorkoutPlans(req, res, next) {
  try {
    const memberId = isStaff(req) ? req.query.memberId : req.user.sub;
    if (!memberId) return res.json({ plans: [] });
    if (memberId) {
      const access = await requireFeature(req, memberId, 'training_guidance');
      if (access.error) return res.status(access.status).json({ error: access.error });
    }
    const filter = memberId
      ? { member: memberId, ...(isStaff(req) ? {} : { status: { $in: ['published', 'archived'] } }) }
      : {};
    if (req.query.status && isStaff(req)) filter.status = req.query.status;
    const plans = await WorkoutPlan.find(filter).populate('member', 'name').sort({ updatedAt: -1 }).limit(500);
    res.json({ plans });
  } catch (error) { next(error); }
}

export async function updateWorkoutPlan(req, res, next) {
  try {
    const plan = await WorkoutPlan.findById(req.params.id);
    if (!plan) return notFound(res);
    const access = await requireFeature(req, plan.member, 'training_guidance');
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (req.body.serviceId !== undefined) {
      const service = getWorkoutService(req.body.serviceId);
      if (!service) return invalid(res, 'Choose a valid service');
      plan.serviceId = service.id;
      plan.title = service.title;
      plan.description = service.description;
    }
    for (const [field, maxLength] of Object.entries({ fitnessGoal: 500, schedule: 1000, trainerNotes: 2000 })) {
      if (req.body[field] !== undefined && (typeof req.body[field] !== 'string' || req.body[field].length > maxLength)) {
        return invalid(res, `Invalid ${field}`);
      }
    }
    for (const field of ['exercises', 'status', 'fitnessGoal', 'schedule', 'trainerNotes']) {
      if (req.body[field] !== undefined) plan[field] = req.body[field];
    }
    await plan.save();
    res.json({ plan });
  } catch (error) { next(error); }
}

export async function savePerformance(req, res, next) {
  try {
    const memberId = isStaff(req) ? req.body.memberId : req.user.sub;
    if (!await requireMember(memberId)) return notFound(res);
    const access = await requireFeature(req, memberId, 'progress_tracking');
    if (access.error) return res.status(access.status).json({ error: access.error });
    const { exercise, sets, reps, weight, performedAt, notes } = req.body;
    const equipment = typeof req.body.equipment === 'string' ? req.body.equipment.trim() : '';
    const exerciseName = equipment || (typeof exercise === 'string' ? exercise.trim() : '');
    if (!exerciseName || exerciseName.length > 120 || !Number.isInteger(sets) || !Number.isInteger(reps) ||
      sets < 1 || reps < 1 || (weight !== undefined && (!Number.isFinite(weight) || weight < 0))) {
      return invalid(res, 'Exercise, positive sets/reps, and a non-negative weight are required');
    }
    const recordDate = performedAt ? new Date(performedAt) : new Date();
    if (!Number.isFinite(recordDate.getTime()) || recordDate > new Date() ||
      (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000))) {
      return invalid(res, 'Provide a valid performance date and notes');
    }
    let record;
    if (req.body.weekOf !== undefined || equipment) {
      const weekDate = typeof req.body.weekOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.weekOf)
        ? new Date(`${req.body.weekOf}T00:00:00Z`) : null;
      if (!weekDate || !Number.isFinite(weekDate.getTime()) || weekDate > new Date()) {
        return invalid(res, 'Choose a valid week that has started');
      }
      weekDate.setUTCDate(weekDate.getUTCDate() - ((weekDate.getUTCDay() + 6) % 7));
      const equipmentKey = exerciseName.toLocaleLowerCase();
      record = await WorkoutPerformance.findOneAndUpdate(
        { member: memberId, equipmentKey, weekOf: weekDate },
        { $set: {
          exercise: exerciseName,
          equipment: exerciseName,
          equipmentKey,
          weekOf: weekDate,
          performedAt: recordDate,
          weight,
          sets,
          reps,
          notes,
          recordedBy: req.user.sub,
        } },
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      record = await WorkoutPerformance.create({
        member: memberId, recordedBy: req.user.sub, exercise: exerciseName, sets, reps, weight,
        notes, performedAt: recordDate,
      });
    }
    res.status(201).json({ record });
  } catch (error) { next(error); }
}

export async function listPerformance(req, res, next) {
  try {
    const memberId = isStaff(req) ? req.query.memberId : req.user.sub;
    if (!memberId) return invalid(res, 'memberId is required');
    const access = await requireFeature(req, memberId, 'progress_tracking');
    if (access.error) return res.status(access.status).json({ error: access.error });
    const records = await WorkoutPerformance.find({ member: memberId }).sort({ performedAt: 1 }).limit(2000);
    res.json({ records });
  } catch (error) { next(error); }
}

export async function saveTrainerNote(req, res, next) {
  try {
    const { memberId, weekOf, visibility = 'private' } = req.body;
    if (!await requireMember(memberId)) return notFound(res);
    const access = await requireFeature(req, memberId, 'training_guidance');
    if (access.error) return res.status(access.status).json({ error: access.error });
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
    res.status(201).json({ note });
  } catch (error) { next(error); }
}

export async function listTrainerNotes(req, res, next) {
  try {
    const memberId = isStaff(req) ? req.query.memberId : req.user.sub;
    if (!memberId) return res.json({ notes: [] });
    if (memberId) {
      const access = await requireFeature(req, memberId, 'training_guidance');
      if (access.error) return res.status(access.status).json({ error: access.error });
    }
    const filter = memberId
      ? { member: memberId, ...(isStaff(req) ? {} : { visibility: 'published' }) }
      : {};
    const notes = await TrainerNote.find(filter).sort({ weekOf: -1 }).limit(500);
    res.json({ notes });
  } catch (error) { next(error); }
}

export async function updateTrainerNote(req, res, next) {
  try {
    const note = await TrainerNote.findById(req.params.id);
    if (!note) return notFound(res);
    const access = await requireFeature(req, note.member, 'training_guidance');
    if (access.error) return res.status(access.status).json({ error: access.error });
    for (const field of [
      'weekOf', 'observations', 'strengths', 'improvements', 'goals',
      'nextWeekAdjustments', 'visibility',
    ]) {
      if (req.body[field] !== undefined) note[field] = req.body[field];
    }
    await note.save();
    res.json({ note });
  } catch (error) { next(error); }
}

export async function listDietPlans(req, res, next) {
  try {
    const memberId = isStaff(req) ? req.query.memberId : req.user.sub;
    if (!memberId) return invalid(res, 'memberId is required');
    const access = await requireFeature(req, memberId, 'diet_chart');
    if (access.error) return res.status(access.status).json({ error: access.error });
    const diets = await DietPlan.find({ member: memberId }).sort({ startsAt: -1 }).lean();
    for (const diet of diets) diet.document = safeDocument(diet.document);
    res.json({ diets });
  } catch (error) { next(error); }
}

export async function saveDietPlan(req, res, next) {
  try {
    const { memberId, startsAt, endsAt } = req.body;
    if (!await requireMember(memberId)) return rejectUploadedFile(req, res, 404, 'Not found');
    const access = await requireFeature(req, memberId, 'diet_chart');
    if (access.error) return rejectUploadedFile(req, res, access.status, access.error);
    const meals = parseJsonField(req.body.meals);
    const mealsValid = meals === undefined || (Array.isArray(meals) && meals.length <= 20 && meals.every((meal) =>
      meal && typeof meal.name === 'string' && meal.name.trim() && meal.name.length <= 100 &&
      typeof meal.suggestions === 'string' && meal.suggestions.trim() && meal.suggestions.length <= 2000 &&
      (meal.timing === undefined || (typeof meal.timing === 'string' && meal.timing.length <= 100))));
    if (!startsAt || !endsAt || !Number.isFinite(new Date(startsAt).getTime()) ||
      !Number.isFinite(new Date(endsAt).getTime()) || new Date(endsAt) < new Date(startsAt) ||
      (!req.file && (!Array.isArray(meals) || !meals.length)) || !mealsValid) {
      return rejectUploadedFile(req, res, 400, 'Provide a valid date range and at least one meal or diet chart file');
    }
    const diet = await DietPlan.create({
      member: memberId,
      trainer: req.user.sub,
      title: typeof req.body.title === 'string' && req.body.title.trim()
        ? req.body.title.trim().slice(0, 160) : 'Personalized diet chart',
      startsAt,
      endsAt,
      meals: meals || [],
      document: documentDetails(req.file),
      notes: req.body.notes,
      dietaryRestrictions: req.body.dietaryRestrictions,
      trainerNotes: req.body.trainerNotes,
    });
    const result = diet.toObject();
    result.document = safeDocument(result.document);
    res.status(201).json({ diet: result });
  } catch (error) {
    try { await removeUploadedFile(req.file); } catch (cleanupError) { console.error('[UPLOAD CLEANUP]', cleanupError.message); }
    next(error);
  }
}

export async function updateDietPlan(req, res, next) {
  try {
    const diet = await DietPlan.findById(req.params.id);
    if (!diet) return rejectUploadedFile(req, res, 404, 'Not found');
    const access = await requireFeature(req, diet.member, 'diet_chart');
    if (access.error) return rejectUploadedFile(req, res, access.status, access.error);
    const startsAt = req.body.startsAt ?? diet.startsAt;
    const endsAt = req.body.endsAt ?? diet.endsAt;
    const meals = req.body.meals === undefined ? diet.meals : parseJsonField(req.body.meals);
    const mealsValid = meals === undefined || (Array.isArray(meals) && meals.length <= 20 && meals.every((meal) =>
      meal && typeof meal.name === 'string' && meal.name.trim() && meal.name.length <= 100 &&
      typeof meal.suggestions === 'string' && meal.suggestions.trim() && meal.suggestions.length <= 2000 &&
      (meal.timing === undefined || (typeof meal.timing === 'string' && meal.timing.length <= 100))));
    if (!Number.isFinite(new Date(startsAt).getTime()) || !Number.isFinite(new Date(endsAt).getTime()) ||
      new Date(endsAt) < new Date(startsAt) || (!req.file && (!Array.isArray(meals) || !meals.length)) ||
      !mealsValid) {
      return rejectUploadedFile(req, res, 400, 'Provide a valid date range and up to 20 meals with food details, or upload a diet chart');
    }
    for (const [field, maxLength] of Object.entries({ title: 160, dietaryRestrictions: 2000, notes: 2000, trainerNotes: 2000 })) {
      if (req.body[field] !== undefined && (typeof req.body[field] !== 'string' || req.body[field].length > maxLength)) {
        return rejectUploadedFile(req, res, 400, `Invalid ${field}`);
      }
      if (req.body[field] !== undefined) diet[field] = req.body[field];
    }
    diet.startsAt = startsAt;
    diet.endsAt = endsAt;
    diet.meals = meals || [];
    if (req.file) diet.document = documentDetails(req.file);
    await diet.save();
    const result = diet.toObject();
    result.document = safeDocument(result.document);
    res.json({ diet: result });
  } catch (error) {
    try { await removeUploadedFile(req.file); } catch (cleanupError) { console.error('[UPLOAD CLEANUP]', cleanupError.message); }
    next(error);
  }
}

const reportEntitlements = {
  bmi_report: 'bmi_report',
  body_measurements: 'body_measurements',
  progress_assessment: 'progress_tracking',
};
const measurementFields = ['chest', 'waist', 'hips', 'leftArm', 'rightArm', 'leftThigh', 'rightThigh', 'shoulders'];

function validateReport(type, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (type === 'bmi_report') {
    const { heightCm, weightKg, notes = '' } = input;
    if (heightCm === undefined && weightKg === undefined && typeof notes === 'string' && notes.length <= 2000) {
      return { notes };
    }
    if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 260 ||
      !Number.isFinite(weightKg) || weightKg < 10 || weightKg > 500 ||
      typeof notes !== 'string' || notes.length > 2000) return null;
    const heightM = heightCm / 100;
    return { heightCm, weightKg, bmi: Number((weightKg / (heightM * heightM)).toFixed(1)), notes };
  }
  if (type === 'body_measurements') {
    const { units = 'cm', notes = '' } = input;
    if (!['cm', 'in'].includes(units) || typeof notes !== 'string' || notes.length > 2000) return null;
    const measurements = {};
    for (const field of measurementFields) {
      if (input[field] === undefined || input[field] === '') continue;
      if (!Number.isFinite(input[field]) || input[field] <= 0 || input[field] > 300) return null;
      measurements[field] = input[field];
    }
    return Object.keys(measurements).length ? { units, measurements, notes } : null;
  }
  if (type === 'progress_assessment') {
    const textFields = ['fitnessGoal', 'observations', 'trainerObservations', 'recommendedAdjustments'];
    if (textFields.some((field) => input[field] !== undefined &&
      (typeof input[field] !== 'string' || input[field].length > 3000))) return null;
    const adherence = input.trainingAdherence;
    if (adherence !== undefined && (!Number.isInteger(adherence) || adherence < 0 || adherence > 100)) return null;
    let followUpDate;
    if (input.followUpDate) {
      followUpDate = new Date(input.followUpDate);
      if (!Number.isFinite(followUpDate.getTime())) return null;
    }
    return {
      fitnessGoal: input.fitnessGoal || '',
      observations: input.observations || '',
      trainingAdherence: adherence,
      trainerObservations: input.trainerObservations || '',
      recommendedAdjustments: input.recommendedAdjustments || '',
      followUpDate,
    };
  }
  return null;
}

export async function listMemberReports(req, res, next) {
  try {
    const { reportType } = req.params;
    const feature = reportEntitlements[reportType];
    if (!feature) return notFound(res);
    const memberId = isStaff(req) ? req.query.memberId : req.user.sub;
    if (!memberId) return invalid(res, 'memberId is required');
    const access = await requireFeature(req, memberId, feature);
    if (access.error) return res.status(access.status).json({ error: access.error });
    const reports = await MemberReport.find({ member: memberId, type: reportType })
      .populate('trainer', 'name')
      .sort({ assessmentDate: -1, createdAt: -1 })
      .limit(500);
    res.json({ reports: reports.map((report) => {
      const result = report.toObject();
      result.document = safeDocument(result.document);
      return result;
    }) });
  } catch (error) { next(error); }
}

export async function saveMemberReport(req, res, next) {
  try {
    const { reportType } = req.params;
    const feature = reportEntitlements[reportType];
    if (!feature) return rejectUploadedFile(req, res, 404, 'Not found');
    const { memberId, assessmentDate = new Date() } = req.body;
    if (!await requireMember(memberId)) return rejectUploadedFile(req, res, 404, 'Not found');
    const access = await requireFeature(req, memberId, feature);
    if (access.error) return rejectUploadedFile(req, res, access.status, access.error);
    const date = new Date(assessmentDate);
    const reportInput = parseJsonField(req.body.data);
    const input = reportInput === undefined && reportType === 'bmi_report' && req.file
      ? { notes: '' } : reportInput;
    const data = validateReport(reportType, input);
    if (!Number.isFinite(date.getTime()) || date > new Date() || !data) {
      return rejectUploadedFile(req, res, 400, 'Provide a valid assessment date and report details');
    }
    const report = await MemberReport.create({
      member: memberId,
      trainer: req.user.sub,
      type: reportType,
      assessmentDate: date,
      data,
      document: req.file ? documentDetails(req.file) : undefined,
    });
    const result = report.toObject();
    result.document = safeDocument(result.document);
    res.status(201).json({ report: result });
  } catch (error) {
    try { await removeUploadedFile(req.file); } catch (cleanupError) { console.error('[UPLOAD CLEANUP]', cleanupError.message); }
    next(error);
  }
}

export async function serveMemberReportDocument(req, res, next) {
  try {
    if (req.params.reportType !== 'bmi_report') return notFound(res);
    const report = await MemberReport.findOne({ _id: req.params.id, type: req.params.reportType });
    if (!report?.document?.filename) return notFound(res);
    const access = await requireFeature(req, report.member, 'bmi_report');
    if (access.error) return res.status(access.status).json({ error: access.error });
    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Type': report.document.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(report.document.originalName)}`,
    });
    res.sendFile(report.document.filename, { root: memberDocumentUploadDirectory }, (error) => {
      if (error) next(error);
    });
  } catch (error) { next(error); }
}

export async function serveDietPlanDocument(req, res, next) {
  try {
    const diet = await DietPlan.findById(req.params.id);
    if (!diet?.document?.filename) return notFound(res);
    const access = await requireFeature(req, diet.member, 'diet_chart');
    if (access.error) return res.status(access.status).json({ error: access.error });
    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Type': diet.document.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(diet.document.originalName)}`,
    });
    res.sendFile(diet.document.filename, { root: memberDocumentUploadDirectory }, (error) => {
      if (error) next(error);
    });
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

export async function listPublicTransformations(_req, res, next) {
  try {
    const transformations = await Transformation.find({ status: 'published', consentGranted: true })
      .select('description beforeDate afterDate createdAt')
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();
    res.set('Cache-Control', 'no-store');
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

export async function servePublicTransformationImage(req, res, next) {
  try {
    const item = await Transformation.findOne({
      _id: req.params.id,
      status: 'published',
      consentGranted: true,
    });
    if (!item) return notFound(res);
    const filename = req.params.image === 'before' ? item.beforeImage
      : req.params.image === 'after' ? item.afterImage : null;
    if (!filename) return notFound(res);
    res.set('Cache-Control', 'no-store');
    res.sendFile(filename, { root: transformationUploadDirectory }, (error) => {
      if (error) next(error);
    });
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
      newMemberDiscountPercent: config?.newMemberDiscountPercent || 0,
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
    const { referralsEnabled, referralReward = '', newMemberDiscountPercent, referrerDiscountInPaise } = req.body;
    if (typeof referralsEnabled !== 'boolean' || typeof referralReward !== 'string' || referralReward.length > 200 ||
      !Number.isFinite(newMemberDiscountPercent) || newMemberDiscountPercent < 0 || newMemberDiscountPercent > 100 ||
      Math.abs(newMemberDiscountPercent * 100 - Math.round(newMemberDiscountPercent * 100)) > 1e-8 ||
      !Number.isSafeInteger(referrerDiscountInPaise) || referrerDiscountInPaise < 0) {
      return invalid(res, 'Provide valid referral enablement, a percentage from 0 to 100, reward text, and a non-negative referrer credit in paise');
    }
    const config = await FeatureConfig.findOneAndUpdate(
      { singleton: 'main' },
      { $set: { referralsEnabled, referralReward, newMemberDiscountPercent, referrerDiscountInPaise } },
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
