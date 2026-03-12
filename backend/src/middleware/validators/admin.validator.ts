import { z } from 'zod';

export const adminUserQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('20').transform(Number),
  search: z.string().max(200).optional(),
  role: z.enum(['user', 'admin']).optional(),
  kyc_status: z.enum(['pending', 'verified', 'rejected']).optional(),
  is_active: z.string().transform((v) => v === 'true').optional(),
  sort_by: z.enum(['created_at', 'name', 'email']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  kyc_status: z.enum(['pending', 'verified', 'rejected']).optional(),
  is_active: z.boolean().optional(),
});

export const adminAccountActionSchema = z.object({
  action: z.enum(['freeze', 'unfreeze', 'close']),
  reason: z.string().max(500).optional(),
});

export type AdminUserQueryInput = z.infer<typeof adminUserQuerySchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminAccountActionInput = z.infer<typeof adminAccountActionSchema>;