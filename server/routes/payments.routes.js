import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { searchPayments, recordOfflinePayment } from '../controllers/payments.controller.js';

router.get('/', authenticate, requireRole('owner', 'staff'), searchPayments);
router.post('/manual', authenticate, requireRole('owner', 'staff'), recordOfflinePayment);

export default router;
