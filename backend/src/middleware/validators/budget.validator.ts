import { z } from 'zod';

export const createBudgetCategorySchema = z.object({
  category_name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must be less than 100 characters')
    .trim(),
  monthly_limit: z
    .number()
    .min(0, 'Monthly limit cannot be negative')
    .max(1000000, 'Monthly limit too high')
    .default(0),
  currency: z
    .enum(['USD', 'EUR', 'GBP', 'INR', 'PKR', 'AED', 'CAD', 'AUD'])
    .default('USD'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color')
    .default('#1e9df1'),
  icon: z
    .string()
    .max(50)
    .default('receipt'),
});

export const updateBudgetCategorySchema = z.object({
  category_name: z.string().min(2).max(100).trim().optional(),
  monthly_limit: z.number().min(0).max(1000000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
  is_active: z.boolean().optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetCategorySchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetCategorySchema>;