import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getOwnMemberDashboard,
  searchMembers,
  getMemberDetails,
  listTrainers,
  assignTrainer,
} from '../controllers/members.controller.js';

router.get('/me', authenticate, getOwnMemberDashboard);
router.get('/', authenticate, requireRole('owner', 'staff'), searchMembers);
router.get('/trainers', authenticate, requireRole('owner'), listTrainers);
router.patch('/:id/trainer', authenticate, requireRole('owner'), assignTrainer);
router.get('/:id', authenticate, requireRole('owner', 'staff'), getMemberDetails);

export default router;
