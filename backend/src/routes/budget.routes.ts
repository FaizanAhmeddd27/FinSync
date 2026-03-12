import { Router } from 'express';
import {
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  getBudgetOverview,
  getBudgetInsights,
} from '../controllers/budget.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createBudgetCategorySchema,
  updateBudgetCategorySchema,
} from '../middleware/validators/budget.validator';

const router = Router();

router.use(authenticate);

router.get('/categories', getBudgetCategories);
router.post(
  '/categories',
  validate(createBudgetCategorySchema),
  createBudgetCategory
);
router.patch(
  '/categories/:categoryId',
  validate(updateBudgetCategorySchema),
  updateBudgetCategory
);
router.delete('/categories/:categoryId', deleteBudgetCategory);
router.get('/overview', getBudgetOverview);
router.get('/insights', getBudgetInsights);

export default router;