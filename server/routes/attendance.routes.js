import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  listDailyAttendance,
} from '../controllers/attendance.controller.js';

router.get('/', authenticate, requireRole('owner', 'staff'), listDailyAttendance);

export default router;
