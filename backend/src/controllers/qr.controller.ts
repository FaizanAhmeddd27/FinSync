import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';


export const verifyReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { transactionId } = req.params;

  if (!transactionId) {
    throw new NotFoundError('Transaction ID is required');
  }

  
  const { data: transfer, error } = await supabaseAdmin
    .from('transfers')
    .select(`
      id,
      amount,
      from_currency,
      created_at,
      status,
      sender_account:from_account_id(account_number, user:users(name)),
      receiver_account:to_account_id(account_number, user:users(name))
    `)
    .eq('id', transactionId)
    .single();

  if (error || !transfer) {
    logger.error('Verification failed: transfer not found', error);
    throw new NotFoundError('Invalid Receipt: Transaction not found.');
  }

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully.',
    data: {
      transactionId: transfer.id,
      status: transfer.status,
      amount: transfer.amount,
      currency: transfer.from_currency,
      date: transfer.created_at,
      senderName: (transfer.sender_account as any)?.user?.name || 'Unknown Sender',
      senderAccount: (transfer.sender_account as any)?.account_number,
      receiverName: (transfer.receiver_account as any)?.user?.name || 'Unknown Receiver',
      receiverAccount: (transfer.receiver_account as any)?.account_number,
    }
  });
});
