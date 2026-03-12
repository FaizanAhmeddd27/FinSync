import { Router } from 'express';
import {
  getDashboardStats,
  getUsers,
  getUserDetail,
  updateUser,
  manageAccount,
  getAuditLogs,
  getSystemHealth,
  getAnalytics,
} from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  adminUpdateUserSchema,
  adminAccountActionSchema,
} from '../middleware/validators/admin.validator';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/health', getSystemHealth);
router.get('/users', getUsers);
router.get('/users/:userId', getUserDetail);
router.patch(
  '/users/:userId',
  validate(adminUpdateUserSchema),
  updateUser
);
router.patch(
  '/accounts/:accountId/manage',
  validate(adminAccountActionSchema),
  manageAccount
);
router.get('/audit-logs', getAuditLogs);

export default router;