import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  getTransactionStats,
  getRecentTransactions,
  exportTransactionsCSV,
} from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { transactionQuerySchema } from '../middleware/validators/transaction.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(transactionQuerySchema, 'query'), getTransactions);
router.get('/recent', getRecentTransactions);
router.get('/stats', getTransactionStats);
router.get('/export/csv', exportTransactionsCSV);
router.get('/:transactionId', getTransactionById);

export default router;