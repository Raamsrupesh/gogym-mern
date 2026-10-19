import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getPublicSettings,
  getAdminSettings,
  updateSettings,
} from '../controllers/settings.controller.js';

router.get('/public', getPublicSettings);
router.get('/', authenticate, requireRole('owner'), getAdminSettings);
router.put('/', authenticate, requireRole('owner'), updateSettings);

export default router;
