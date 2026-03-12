import { Router } from 'express';
import {
  getInvestments,
  getInvestmentById,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  getPortfolioPerformance,
} from '../controllers/investment.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createInvestmentSchema,
  updateInvestmentSchema,
} from '../middleware/validators/investment.validator';

const router = Router();

router.use(authenticate);

router.get('/', getInvestments);
router.get('/performance', getPortfolioPerformance);
router.get('/:investmentId', getInvestmentById);
router.post('/', validate(createInvestmentSchema), addInvestment);
router.patch(
  '/:investmentId',
  validate(updateInvestmentSchema),
  updateInvestment
);
router.delete('/:investmentId', deleteInvestment);

export default router;