import { Router } from 'express';
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  closeAccount,
  getBalanceHistory,
  getAccountSuggestion,
} from '../controllers/account.controller';
import { authenticate, requireVerifiedEmail } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createAccountSchema,
  updateAccountSchema,
} from '../middleware/validators/account.validator';

const router = Router();


router.use(authenticate);

router.get('/', getAccounts);
router.get('/suggestion', getAccountSuggestion);
router.get('/:accountId', getAccountById);
router.get('/:accountId/balance-history', getBalanceHistory);
router.post(
  '/',
  requireVerifiedEmail,
  validate(createAccountSchema),
  createAccount
);
router.patch(
  '/:accountId',
  validate(updateAccountSchema),
  updateAccount
);
router.delete('/:accountId', closeAccount);

export default router;