import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { CurrencyService } from '../services/currency.service';
import { BadRequestError } from '../utils/errors';

// GET ALL RATES 
export const getRates = asyncHandler(
  async (req: Request, res: Response) => {
    const base = (req.query.base as string) || 'USD';

    const rates = await CurrencyService.getRatesForBase(base);

    res.status(200).json({
      success: true,
      data: {
        base,
        rates,
        updated_at: new Date().toISOString(),
      },
    });
  }
);

// CONVERT CURRENCY 
export const convertCurrency = asyncHandler(
  async (req: Request, res: Response) => {
    const { amount, from, to } = req.query;

    if (!amount || !from || !to) {
      throw new BadRequestError(
        'Please provide amount, from, and to currency parameters'
      );
    }

    const numAmount = parseFloat(amount as string);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new BadRequestError('Amount must be a positive number');
    }

    const result = await CurrencyService.convert(
      numAmount,
      (from as string).toUpperCase(),
      (to as string).toUpperCase()
    );

    res.status(200).json({
      success: true,
      data: {
        from: (from as string).toUpperCase(),
        to: (to as string).toUpperCase(),
        amount: numAmount,
        converted_amount: result.convertedAmount,
        exchange_rate: result.exchangeRate,
        formatted: {
          from: CurrencyService.format(
            numAmount,
            (from as string).toUpperCase()
          ),
          to: CurrencyService.format(
            result.convertedAmount,
            (to as string).toUpperCase()
          ),
        },
      },
    });
  }
);

//  GET SUPPORTED CURRENCIES 
export const getSupportedCurrencies = asyncHandler(
  async (_req: Request, res: Response) => {
    const currencies = [
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        flag: '🇺🇸',
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        flag: '🇪🇺',
      },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        flag: '🇬🇧',
      },
      {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        flag: '🇮🇳',
      },
      {
        code: 'PKR',
        name: 'Pakistani Rupee',
        symbol: 'Rs',
        flag: '🇵🇰',
      },
      {
        code: 'AED',
        name: 'UAE Dirham',
        symbol: 'د.إ',
        flag: '🇦🇪',
      },
      {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        flag: '🇨🇦',
      },
      {
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        flag: '🇦🇺',
      },
    ];

    res.status(200).json({
      success: true,
      data: { currencies },
    });
  }
);