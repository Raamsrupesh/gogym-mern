import express from 'express';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { transformationUploadDirectory } from '../config/uploads.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import {
  listAttendance, leaderboard,
  saveWorkoutPlan, listWorkoutPlans, updateWorkoutPlan,
  savePerformance, listPerformance,
  saveTrainerNote, listTrainerNotes, updateTrainerNote,
  listDietPlans, saveDietPlan,
  createTransformation, listTransformations, updateTransformation, grantTransformationConsent, serveTransformationImage,
  getReferral, useReferral, getReferralConfig, updateReferralConfig, listAllReferrals, manageReferral,
  listEquipment, saveEquipment, archiveEquipment, addMaintenance,
  submitFeedback, listFeedback, updateFeedback, listNotifications, markNotificationRead,
} from '../controllers/features.controller.js';

const router = express.Router();
const staff = requireRole('owner', 'staff');
fs.mkdirSync(transformationUploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, transformationUploadDirectory),
  filename: (_req, file, callback) => {
    const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype];
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});
const imageUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return callback(new Error('Only JPEG, PNG, or WebP image files are allowed'));
    callback(null, true);
  },
});

router.use(authenticate);

router.get('/attendance/history', listAttendance);
router.get('/leaderboard', leaderboard);

router.get('/workout-plans', listWorkoutPlans);
router.post('/workout-plans', staff, saveWorkoutPlan);
router.patch('/workout-plans/:id', staff, updateWorkoutPlan);
router.get('/performance', listPerformance);
router.post('/performance', savePerformance);
router.get('/trainer-notes', listTrainerNotes);
router.post('/trainer-notes', staff, saveTrainerNote);
router.patch('/trainer-notes/:id', staff, updateTrainerNote);
router.get('/diet-plans', listDietPlans);
router.post('/diet-plans', staff, saveDietPlan);

router.get('/transformations', listTransformations);
router.post(
  '/transformations',
  staff,
  uploadLimiter,
  imageUpload.fields([{ name: 'beforeImage', maxCount: 1 }, { name: 'afterImage', maxCount: 1 }]),
  createTransformation
);
router.patch('/transformations/:id', staff, updateTransformation);
router.post('/transformations/:id/consent', grantTransformationConsent);
router.get('/transformations/:id/image/:image', serveTransformationImage);

router.get('/referrals', getReferral);
router.post('/referrals/use', useReferral);
router.get('/referrals/config', staff, getReferralConfig);
router.put('/referrals/config', requireRole('owner'), updateReferralConfig);
router.get('/referrals/all', staff, listAllReferrals);
router.patch('/referrals/:id', requireRole('owner'), manageReferral);

router.get('/equipment', staff, listEquipment);
router.post('/equipment', requireRole('owner'), saveEquipment);
router.put('/equipment/:id', requireRole('owner'), saveEquipment);
router.delete('/equipment/:id', requireRole('owner'), archiveEquipment);
router.post('/equipment/:id/maintenance', staff, addMaintenance);

router.post('/feedback', submitFeedback);
router.get('/feedback', staff, listFeedback);
router.patch('/feedback/:id', staff, updateFeedback);
router.get('/notifications', listNotifications);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;
