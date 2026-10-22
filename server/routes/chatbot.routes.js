import express from 'express';

const router = express.Router();
import { optionalAuth } from '../middleware/auth.js';
import { chatbotLimiter } from '../middleware/rateLimit.js';
import { answerChatbotQuestion } from '../controllers/chatbot.controller.js';

router.post('/ask', optionalAuth, chatbotLimiter, answerChatbotQuestion);

export default router;
