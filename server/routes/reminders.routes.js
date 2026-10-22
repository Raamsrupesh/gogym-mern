import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import ReminderLog from '../models/ReminderLog.js';
import {
  createAdminReminder,
  deleteAdminReminder,
  listAdminReminders,
} from '../controllers/adminReminders.controller.js';

const router = express.Router();

router.get('/', authenticate, requireRole('owner'), async (_req, res, next) => {
  try {
    const reminders = await ReminderLog.find()
      .populate('member', 'name email')
      .populate('membership', 'expiryDate status')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ reminders });
  } catch (error) {
    next(error);
  }
});

router.get('/custom', authenticate, requireRole('owner'), listAdminReminders);
router.post('/custom', authenticate, requireRole('owner'), createAdminReminder);
router.delete('/custom/:id', authenticate, requireRole('owner'), deleteAdminReminder);

export default router;
