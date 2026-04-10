import { Router } from 'express';
import { getDashboard, getSpendingHeatmap } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getDashboard);
router.get('/heatmap', getSpendingHeatmap);

export default router;
