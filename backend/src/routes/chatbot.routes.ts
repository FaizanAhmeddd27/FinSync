import { Router } from 'express';
import {
  sendMessage,
  getChatHistory,
  getChatSessions,
  deleteChatSession,
  getQuickSuggestions,
} from '../controllers/chatbot.controller';
import { authenticate } from '../middleware/auth';
import { otpLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.post('/message', otpLimiter, sendMessage);
router.get('/sessions', getChatSessions);
router.get('/sessions/:sessionId', getChatHistory);
router.delete('/sessions/:sessionId', deleteChatSession);
router.get('/suggestions', getQuickSuggestions);

export default router;