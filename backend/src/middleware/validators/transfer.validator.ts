import { z } from 'zod';

export const initiateTransferSchema = z.object({
  from_account_id: z.string().uuid('Invalid source account ID'),
  to_account_number: z
    .string()
    .min(4, 'Account number too short')
    .max(20, 'Account number too long'),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(500000, 'Single transfer limit is 500,000'),
  note: z
    .string()
    .max(500, 'Note cannot exceed 500 characters')
    .optional(),
  category: z
    .string()
    .max(100)
    .optional(),
});

export const verifyRecipientSchema = z.object({
  account_number: z
    .string()
    .min(4, 'Account number too short')
    .max(20, 'Account number too long'),
});

export const confirmTransferSchema = z.object({
  transfer_id: z.string().uuid('Invalid transfer ID'),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export const scheduleTransferSchema = z.object({
  from_account_id: z.string().uuid('Invalid source account ID'),
  to_account_number: z
    .string()
    .min(4)
    .max(20),
  amount: z
    .number()
    .positive()
    .max(500000),
  note: z.string().max(500).optional(),
  scheduled_at: z
    .string()
    .datetime('Invalid date format'),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z
    .enum(['daily', 'weekly', 'monthly', 'quarterly'])
    .optional(),
});

export type InitiateTransferInput = z.infer<typeof initiateTransferSchema>;
export type VerifyRecipientInput = z.infer<typeof verifyRecipientSchema>;
export type ConfirmTransferInput = z.infer<typeof confirmTransferSchema>;
export type ScheduleTransferInput = z.infer<typeof scheduleTransferSchema>;