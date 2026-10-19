import express from 'express';

const router = express.Router();
import { chatbotLimiter } from '../middleware/rateLimit.js';
import { answerChatbotQuestion } from '../controllers/chatbot.controller.js';

router.post('/ask', chatbotLimiter, answerChatbotQuestion);

export default router;
