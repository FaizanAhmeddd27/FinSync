import { Router } from 'express';
import authRoutes from './auth.routes';
import accountRoutes from './account.routes';
import transferRoutes from './transfer.routes';
import transactionRoutes from './transaction.routes';
import statementRoutes from './statement.routes';
import fraudRoutes from './fraud.routes';
import notificationRoutes from './notification.routes';
import currencyRoutes from './currency.routes';
import adminRoutes from './admin.routes';
import budgetRoutes from './budget.routes';
import investmentRoutes from './investment.routes';
import chatbotRoutes from './chatbot.routes';
import dashboardRoutes from './dashboard.routes';
import searchRoutes from './search.routes';
import qrRoutes from './qr.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/transfers', transferRoutes);
router.use('/transactions', transactionRoutes);
router.use('/statements', statementRoutes);
router.use('/fraud', fraudRoutes);
router.use('/notifications', notificationRoutes);
router.use('/currency', currencyRoutes);
router.use('/admin', adminRoutes);
router.use('/budget', budgetRoutes);
router.use('/investments', investmentRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/search', searchRoutes);
router.use('/qr', qrRoutes);

export default router;