import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  failRazorpayPayment,
} from '../controllers/razorpay.controller.js';

router.post('/order', authenticate, createRazorpayOrder);
router.post('/verify', authenticate, verifyRazorpayPayment);
router.post('/fail', authenticate, failRazorpayPayment);
router.post('/webhook', handleRazorpayWebhook);

export default router;
