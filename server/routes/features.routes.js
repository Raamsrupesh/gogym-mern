import express from 'express';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { memberDocumentUploadDirectory, transformationUploadDirectory } from '../config/uploads.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import {
  listAttendance, leaderboard,
  listMemberReports, saveMemberReport,
  serveMemberReportDocument, serveDietPlanDocument,
  saveWorkoutPlan, listWorkoutPlans, updateWorkoutPlan,
  savePerformance, listPerformance,
  saveTrainerNote, listTrainerNotes, updateTrainerNote,
  listDietPlans, saveDietPlan, updateDietPlan,
  createTransformation, listTransformations, listPublicTransformations, updateTransformation, grantTransformationConsent, serveTransformationImage, servePublicTransformationImage,
  getReferral, useReferral, getReferralConfig, updateReferralConfig, listAllReferrals, manageReferral,
  listEquipment, saveEquipment, archiveEquipment, addMaintenance,
  submitFeedback, listFeedback, updateFeedback,
} from '../controllers/features.controller.js';

const router = express.Router();
const staff = requireRole('owner', 'staff');
fs.mkdirSync(transformationUploadDirectory, { recursive: true });
fs.mkdirSync(memberDocumentUploadDirectory, { recursive: true });

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
const documentExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};
const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, memberDocumentUploadDirectory),
    filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${documentExtensions[file.mimetype]}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!documentExtensions[file.mimetype]) {
      const error = new Error('Only JPEG, PNG, WebP, or PDF files are allowed');
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
});
router.get('/public-transformations', listPublicTransformations);
router.get('/public-transformations/:id/image/:image', servePublicTransformationImage);

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
router.post('/diet-plans', staff, uploadLimiter, documentUpload.single('document'), saveDietPlan);
router.patch('/diet-plans/:id', staff, uploadLimiter, documentUpload.single('document'), updateDietPlan);
router.get('/diet-plans/:id/document', serveDietPlanDocument);
router.get('/reports/:reportType', listMemberReports);
router.post('/reports/:reportType', staff, uploadLimiter, documentUpload.single('document'), saveMemberReport);
router.get('/reports/:reportType/:id/document', serveMemberReportDocument);

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

export default router;
