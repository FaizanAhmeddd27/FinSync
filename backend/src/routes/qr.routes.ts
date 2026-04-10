import { Router } from 'express';
import { verifyReceipt } from '../controllers/qr.controller';

const router = Router();

router.get('/verify-receipt/:transactionId', verifyReceipt);

export default router;
