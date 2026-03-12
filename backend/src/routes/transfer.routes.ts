import { Router } from 'express';
import {
  verifyRecipient,
  initiateTransfer,
  confirmTransfer,
  cancelTransfer,
  getTransferHistory,
  scheduleTransfer,
} from '../controllers/transfer.controller';
import {
  authenticate,
  requireVerifiedEmail,
} from '../middleware/auth';
import { validate } from '../middleware/validate';
import { transferLimiter } from '../middleware/rateLimiter';
import {
  verifyRecipientSchema,
  initiateTransferSchema,
  confirmTransferSchema,
  scheduleTransferSchema,
} from '../middleware/validators/transfer.validator';

const router = Router();

router.use(authenticate);
router.use(requireVerifiedEmail);

router.post(
  '/verify-recipient',
  validate(verifyRecipientSchema),
  verifyRecipient
);
router.post(
  '/initiate',
  transferLimiter,
  validate(initiateTransferSchema),
  initiateTransfer
);
router.post(
  '/confirm',
  validate(confirmTransferSchema),
  confirmTransfer
);
router.post(
  '/schedule',
  transferLimiter,
  validate(scheduleTransferSchema),
  scheduleTransfer
);
router.patch('/:transferId/cancel', cancelTransfer);
router.get('/history', getTransferHistory);

export default router;