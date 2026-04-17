import { Router } from 'express';
import { handleVapiWebhook } from '../controllers/vapi.controller';

const router = Router();

/**
 * Vapi Webhook Route
 * URL: POST /api/vapi/webhook
 * Description: Handles tool calls and reports from Vapi AI
 */
router.post('/', handleVapiWebhook);
router.post('/webhook', handleVapiWebhook);
router.post('/transfer', handleVapiWebhook);

export default router;
