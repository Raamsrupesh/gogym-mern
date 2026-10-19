import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  checkInMember,
  listDailyAttendance,
} from '../controllers/attendance.controller.js';

router.post('/check-in', authenticate, requireRole('owner', 'staff'), checkInMember);
router.get('/', authenticate, requireRole('owner', 'staff'), listDailyAttendance);

export default router;
