import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  getTransactionStats,
  getRecentTransactions,
  exportTransactionsCSV,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { 
  transactionQuerySchema, 
  createTransactionSchema, 
  updateTransactionSchema 
} from '../middleware/validators/transaction.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(transactionQuerySchema, 'query'), getTransactions);
router.get('/recent', getRecentTransactions);
router.get('/stats', getTransactionStats);
router.get('/export/csv', exportTransactionsCSV);
router.get('/:transactionId', getTransactionById);

router.post('/', validate(createTransactionSchema), createTransaction);
router.patch('/:transactionId', validate(updateTransactionSchema), updateTransaction);
router.delete('/:transactionId', deleteTransaction);

export default router;