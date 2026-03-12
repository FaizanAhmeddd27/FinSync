import { Router } from 'express';
import {
  getMonthlyStatement,
  downloadStatementPDF,
  getStatementMonths,
} from '../controllers/statement.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:accountId', getMonthlyStatement);
router.get('/:accountId/download', downloadStatementPDF);
router.get('/:accountId/months', getStatementMonths);

export default router;