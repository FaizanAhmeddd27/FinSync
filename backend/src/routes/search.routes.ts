import { Router } from 'express';
import { globalSearch } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, globalSearch);

export default router;
