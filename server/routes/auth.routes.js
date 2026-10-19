import express from 'express';

const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  registerMember,
  logInMember,
  refreshMemberSession,
  logOutMember,
  getCurrentUser,
} from '../controllers/auth.controller.js';

router.post('/register', authLimiter, registerMember);
router.post('/login', authLimiter, logInMember);
router.post('/refresh', refreshMemberSession);
router.post('/logout', logOutMember);
router.get('/me', authenticate, getCurrentUser);

export default router;
