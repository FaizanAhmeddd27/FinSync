import { z } from 'zod';

export const transactionQuerySchema = z.object({
  account_id: z.string().uuid().optional(),
  type: z.enum(['credit', 'debit']).optional(),
  category: z.string().optional(),
  search: z.string().max(200).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  min_amount: z.coerce.number().min(0).optional(),
  max_amount: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'amount']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;

export const createTransactionSchema = z.object({
  account_id: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum(['credit', 'debit']),
  category: z.string().min(1),
  description: z.string().max(500).optional(),
});

export const updateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
});