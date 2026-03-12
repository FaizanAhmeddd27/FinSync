import { Router } from 'express';
import {
  getFraudAlerts,
  getFraudAlertById,
  clearFraudAlert,
  blockFromFraudAlert,
} from '../controllers/fraud.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getFraudAlerts);
router.get('/:alertId', getFraudAlertById);
router.patch('/:alertId/clear', requireAdmin, clearFraudAlert);
router.patch('/:alertId/block', requireAdmin, blockFromFraudAlert);

export default router;