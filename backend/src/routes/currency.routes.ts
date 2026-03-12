import { Router } from 'express';
import {
  getRates,
  convertCurrency,
  getSupportedCurrencies,
} from '../controllers/currency.controller';

const router = Router();

// These are public routes (no auth required for currency info)
router.get('/rates', getRates);
router.get('/convert', convertCurrency);
router.get('/supported', getSupportedCurrencies);

export default router;