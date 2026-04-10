import axios from 'axios';
import { env } from '../config/env';
import { redisHelpers } from '../config/redis';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

interface CurrencyRates {
  [key: string]: number;
}

export class CurrencyService {
  private static CACHE_KEY = 'currency_rates';
  private static CACHE_DURATION = 3600; 

  static async fetchLiveRates(): Promise<CurrencyRates> {
    try {
      
      const cached = await redisHelpers.getCache<{ rates: CurrencyRates }>(
        this.CACHE_KEY
      );
      if (cached && cached.rates) {
        logger.debug('Currency rates served from cache');
        return cached.rates;
      }

      
      const response = await axios.get(`${env.FIXER_BASE_URL}/latest`, {
        params: {
          access_key: env.FIXER_API_KEY,
          symbols: 'USD,EUR,GBP,INR,PKR,AED,CAD,AUD',
        },
        timeout: 10000,
      });

      if (!response.data.success) {
        logger.error('Fixer API error:', response.data.error);
        return this.getFallbackRates();
      }

      const rates: CurrencyRates = response.data.rates;

      
      await redisHelpers.setCache(
        this.CACHE_KEY,
        { rates, timestamp: Date.now() },
        this.CACHE_DURATION
      );

      
      await supabaseAdmin.from('currency_rates').insert({
        base_currency: response.data.base || 'EUR',
        rates,
      });

      logger.success('Currency rates updated from Fixer.io');
      return rates;
    } catch (error) {
      logger.error('Failed to fetch currency rates:', error);
      return this.getFallbackRates();
    }
  }

  
  private static getFallbackRates(): CurrencyRates {
    return {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      INR: 83.5,
      PKR: 278.5,
      AED: 3.67,
      CAD: 1.36,
      AUD: 1.53,
    };
  }

  
  static async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ convertedAmount: number; exchangeRate: number }> {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, exchangeRate: 1.0 };
    }

    const rates = await this.fetchLiveRates();

    
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (!fromRate || !toRate) {
      logger.warn(
        `Currency rate not found for ${fromCurrency} or ${toCurrency}, using fallback`
      );
      const fallback = this.getFallbackRates();
      const fbFrom = fallback[fromCurrency] || 1;
      const fbTo = fallback[toCurrency] || 1;
      const exchangeRate = fbTo / fbFrom;
      return {
        convertedAmount: parseFloat((amount * exchangeRate).toFixed(2)),
        exchangeRate: parseFloat(exchangeRate.toFixed(6)),
      };
    }

    const exchangeRate = toRate / fromRate;
    const convertedAmount = parseFloat((amount * exchangeRate).toFixed(2));

    return {
      convertedAmount,
      exchangeRate: parseFloat(exchangeRate.toFixed(6)),
    };
  }

  
  static async getRatesForBase(
    baseCurrency: string = 'USD'
  ): Promise<CurrencyRates> {
    const rates = await this.fetchLiveRates();
    const baseRate = rates[baseCurrency] || 1;

    const convertedRates: CurrencyRates = {};
    for (const [currency, rate] of Object.entries(rates)) {
      convertedRates[currency] = parseFloat((rate / baseRate).toFixed(6));
    }

    return convertedRates;
  }

  
  static format(amount: number, currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      PKR: 'Rs',
      AED: 'د.إ',
      CAD: 'C$',
      AUD: 'A$',
    };
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
}