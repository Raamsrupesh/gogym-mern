import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getAdminOverview,
  listAuditEvents,
  createStaffAccount,
  deletePlan
} from '../controllers/admin.controller.js';

router.get('/overview', authenticate, requireRole('owner', 'staff'), getAdminOverview);
router.get('/audit', authenticate, requireRole('owner'), listAuditEvents);
router.post('/staff', authenticate, requireRole('owner'), createStaffAccount);
router.delete('/plans/:id', authenticate, requireRole('owner'), deletePlan)
export default router;
