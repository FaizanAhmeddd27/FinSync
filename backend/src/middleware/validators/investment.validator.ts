import { z } from 'zod';

export const createInvestmentSchema = z.object({
  investment_type: z.enum(['stocks', 'bonds', 'mutual_funds', 'crypto', 'fixed_deposit'], {
    message: 'Investment type is required',
  }),
  name: z
    .string()
    .min(1, 'Investment name is required')
    .max(255)
    .trim(),
  symbol: z.string().max(20).optional(),
  quantity: z
    .number()
    .positive('Quantity must be positive')
    .default(1),
  purchase_price: z
    .number()
    .min(0, 'Purchase price cannot be negative')
    .default(0),
  current_price: z
    .number()
    .min(0, 'Current price cannot be negative')
    .default(0),
  currency: z
    .enum(['USD', 'EUR', 'GBP', 'INR', 'PKR', 'AED', 'CAD', 'AUD'])
    .default('USD'),
  risk_category: z.enum(['low', 'medium', 'high']).default('medium'),
  purchase_date: z.string().datetime().optional().or(z.string().optional()),
});

export const updateInvestmentSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  quantity: z.number().positive().optional(),
  current_price: z.number().min(0).optional(),
  purchase_price: z.number().min(0).optional(),
  risk_category: z.enum(['low', 'medium', 'high']).optional(),
  purchase_date: z.string().datetime().optional().or(z.string().optional()),
});

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;