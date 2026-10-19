import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  listActivePlans,
  listAllPlans,
  createPlan,
  updatePlan,
} from '../controllers/plans.controller.js';

router.get('/', listActivePlans);
router.get('/all', authenticate, requireRole('owner', 'staff'), listAllPlans);
router.post('/', authenticate, requireRole('owner'), createPlan);
router.patch('/:id', authenticate, requireRole('owner'), updatePlan);

export default router;
