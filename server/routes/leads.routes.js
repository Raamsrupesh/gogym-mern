import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { publicLimiter } from '../middleware/rateLimit.js';
import {
  submitWebsiteEnquiry,
  searchLeads,
  updateLead,
} from '../controllers/leads.controller.js';

router.post('/', publicLimiter, submitWebsiteEnquiry);
router.get('/', authenticate, requireRole('owner', 'staff'), searchLeads);
router.patch('/:id', authenticate, requireRole('owner', 'staff'), updateLead);

export default router;
