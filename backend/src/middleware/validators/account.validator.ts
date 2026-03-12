import { z } from 'zod';

export const createAccountSchema = z.object({
  account_type: z.enum(['savings', 'checking', 'wallet', 'fixed_deposit'], {
    message: 'Account type is required',
  }),
  initial_deposit: z
    .number()
    .min(0, 'Initial deposit cannot be negative')
    .max(1000000, 'Initial deposit cannot exceed 1,000,000')
    .default(0),
  currency: z
    .enum(['USD', 'EUR', 'GBP', 'INR', 'PKR', 'AED', 'CAD', 'AUD'])
    .default('USD'),
});

export const updateAccountSchema = z.object({
  is_default: z.boolean().optional(),
  status: z.enum(['active', 'frozen', 'closed']).optional(),
});

export const accountIdParamSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;