import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getOwnMemberDashboard,
  searchMembers,
  getMemberDetails,
} from '../controllers/members.controller.js';

router.get('/me', authenticate, getOwnMemberDashboard);
router.get('/', authenticate, requireRole('owner', 'staff'), searchMembers);
router.get('/:id', authenticate, requireRole('owner', 'staff'), getMemberDetails);

export default router;
