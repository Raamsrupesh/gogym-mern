import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { downloadPaymentReceipt } from '../controllers/invoices.controller.js';

router.get('/:paymentId', authenticate, downloadPaymentReceipt);

export default router;
