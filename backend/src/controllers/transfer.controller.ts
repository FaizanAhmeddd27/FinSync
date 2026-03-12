import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors';
import {
  generateReferenceId,
  maskAccountNumber,
} from '../utils/helpers';
import { CurrencyService } from '../services/currency.service';
import { FraudService } from '../services/fraud.service';
import { OTPService } from '../services/otp.service';
import { EmailService } from '../services/email.service';
import { redisHelpers } from '../config/redis';
import { logger } from '../utils/logger';

// VERIFY RECIPIENT 
export const verifyRecipient = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { account_number } = req.body;

    const { data: recipientAccount } = await supabaseAdmin
      .from('accounts')
      .select(
        `
        id,
        account_number,
        account_type,
        currency,
        status,
        user_id
      `
      )
      .eq('account_number', account_number)
      .eq('status', 'active')
      .single();

    if (!recipientAccount) {
      throw new NotFoundError('Recipient account not found or is inactive');
    }

    // Get recipient name
    const { data: recipientUser } = await supabaseAdmin
      .from('users')
      .select('name, avatar_url')
      .eq('id', recipientAccount.user_id)
      .single();

    // Check if user is trying to send to their own account
    const isSelfTransfer = recipientAccount.user_id === req.user.id;

    res.status(200).json({
      success: true,
      message: 'Recipient verified',
      data: {
        recipient: {
          name: recipientUser?.name || 'Unknown',
          avatar_url: recipientUser?.avatar_url,
          account_number: maskAccountNumber(
            recipientAccount.account_number
          ),
          account_type: recipientAccount.account_type,
          currency: recipientAccount.currency,
          is_self: isSelfTransfer,
        },
      },
    });
  }
);

// INITIATE TRANSFER (sends OTP) 
export const initiateTransfer = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { from_account_id, to_account_number, amount, note, category } =
      req.body;

    // 1. Validate source account (ownership + active + sufficient balance)
    const { data: fromAccount } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', from_account_id)
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();

    if (!fromAccount) {
      throw new NotFoundError(
        'Source account not found or is not active'
      );
    }

    if (Number(fromAccount.balance) < amount) {
      throw new BadRequestError(
        `Insufficient balance. Available: ${CurrencyService.format(Number(fromAccount.balance), fromAccount.currency)}`
      );
    }

    // 2. Validate destination account
    const { data: toAccount } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('account_number', to_account_number)
      .eq('status', 'active')
      .single();

    if (!toAccount) {
      throw new NotFoundError(
        'Destination account not found or is inactive'
      );
    }

    if (fromAccount.id === toAccount.id) {
      throw new BadRequestError('Cannot transfer to the same account');
    }

    // 3. Calculate currency conversion if needed
    const { convertedAmount, exchangeRate } =
      await CurrencyService.convert(
        amount,
        fromAccount.currency,
        toAccount.currency
      );

    // 4. Fraud check
    const fraudCheck = await FraudService.checkTransaction(
      req.user.id,
      from_account_id,
      amount,
      fromAccount.currency
    );

    // If critical risk, block immediately
    if (fraudCheck.riskScore >= 80) {
      await FraudService.createAlerts(
        req.user.id,
        from_account_id,
        null,
        fraudCheck.alerts
      );

      throw new ForbiddenError(
        'Transaction blocked due to security concerns. Please contact support.'
      );
    }

    // 5. Create pending transfer record
    const referenceId = generateReferenceId();

    const { data: transfer, error } = await supabaseAdmin
      .from('transfers')
      .insert({
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        amount,
        from_currency: fromAccount.currency,
        to_currency: toAccount.currency,
        exchange_rate: exchangeRate,
        converted_amount: convertedAmount,
        note: note || null,
        status: 'pending',
        otp_verified: false,
      })
      .select()
      .single();

    if (error || !transfer) {
      logger.error('Transfer creation error:', error);
      throw new BadRequestError('Failed to initiate transfer');
    }

    // 6. Store transfer details in Redis for quick OTP verification
    await redisHelpers.setCache(
      `transfer:${transfer.id}`,
      {
        transferId: transfer.id,
        userId: req.user.id,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount,
        convertedAmount,
        exchangeRate,
        fromCurrency: fromAccount.currency,
        toCurrency: toAccount.currency,
        referenceId,
        note,
        category: category || 'Transfer',
        fraudAlerts: fraudCheck.alerts,
        riskScore: fraudCheck.riskScore,
      },
      600 // 10 min expiry
    );

    // 7. Generate and send OTP
    const otp = await OTPService.generateAndStore(
      req.user.id,
      'transfer'
    );
    await EmailService.sendOTP(
      req.user.email,
      otp,
      req.user.name,
      'transfer confirmation'
    );

    // 8. Get recipient info for response
    const { data: recipientUser } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', toAccount.user_id)
      .single();

    res.status(200).json({
      success: true,
      message:
        'Transfer initiated. Please verify with the OTP sent to your email.',
      data: {
        transfer_id: transfer.id,
        reference_id: referenceId,
        from: {
          account: maskAccountNumber(fromAccount.account_number),
          currency: fromAccount.currency,
          amount: amount,
        },
        to: {
          account: maskAccountNumber(toAccount.account_number),
          recipient_name: recipientUser?.name || 'Unknown',
          currency: toAccount.currency,
          amount: convertedAmount,
        },
        exchange_rate:
          fromAccount.currency !== toAccount.currency
            ? exchangeRate
            : null,
        requires_otp: true,
        fraud_warning:
          fraudCheck.riskScore >= 30
            ? {
                risk_score: fraudCheck.riskScore,
                alerts: fraudCheck.alerts.map((a) => a.description),
              }
            : null,
      },
    });
  }
);

// CONFIRM TRANSFER (with OTP) 
export const confirmTransfer = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { transfer_id, otp } = req.body;

    // 1. Verify OTP
    const isOTPValid = await OTPService.verify(
      req.user.id,
      otp,
      'transfer'
    );
    if (!isOTPValid) {
      throw new BadRequestError('Invalid or expired OTP');
    }

    // 2. Get transfer details from Redis
    const transferData = await redisHelpers.getCache<any>(
      `transfer:${transfer_id}`
    );

    if (!transferData) {
      throw new BadRequestError(
        'Transfer session expired. Please initiate a new transfer.'
      );
    }

    // 3. Verify ownership
    if (transferData.userId !== req.user.id) {
      throw new ForbiddenError('Unauthorized transfer');
    }

    // 4. Verify transfer is still pending
    const { data: transfer } = await supabaseAdmin
      .from('transfers')
      .select('status')
      .eq('id', transfer_id)
      .single();

    if (!transfer || transfer.status !== 'pending') {
      throw new BadRequestError(
        'Transfer is no longer pending'
      );
    }

    // 5. Execute transfer via stored procedure (ACID)
    const { data: executedTransferId, error } = await supabaseAdmin.rpc(
      'execute_transfer',
      {
        p_from_account_id: transferData.fromAccountId,
        p_to_account_id: transferData.toAccountId,
        p_amount: transferData.amount,
        p_from_currency: transferData.fromCurrency,
        p_to_currency: transferData.toCurrency,
        p_exchange_rate: transferData.exchangeRate,
        p_converted_amount: transferData.convertedAmount,
        p_note: transferData.note,
        p_reference_id: transferData.referenceId,
      }
    );

    if (error) {
      logger.error('Transfer execution error:', error);

      // Update transfer status to failed
      await supabaseAdmin
        .from('transfers')
        .update({ status: 'failed' })
        .eq('id', transfer_id);

      throw new BadRequestError(
        error.message || 'Transfer failed. Please try again.'
      );
    }

    // 6. Update original transfer record
    await supabaseAdmin
      .from('transfers')
      .update({ status: 'completed', otp_verified: true })
      .eq('id', transfer_id);

    // 7. Create fraud alerts if there were warnings
    if (
      transferData.fraudAlerts &&
      transferData.fraudAlerts.length > 0
    ) {
      await FraudService.createAlerts(
        req.user.id,
        transferData.fromAccountId,
        null,
        transferData.fraudAlerts
      );
    }

    // 8. Send email notifications to both parties
    // Sender notification
    const { data: fromAccount } = await supabaseAdmin
      .from('accounts')
      .select('balance, account_number')
      .eq('id', transferData.fromAccountId)
      .single();

    if (fromAccount) {
      await EmailService.sendTransactionAlert(
        req.user.email,
        req.user.name,
        'debit',
        transferData.amount,
        transferData.fromCurrency,
        transferData.note || 'Transfer sent',
        Number(fromAccount.balance)
      );
    }

    // Recipient notification
    const { data: toAccount } = await supabaseAdmin
      .from('accounts')
      .select('balance, user_id')
      .eq('id', transferData.toAccountId)
      .single();

    if (toAccount) {
      const { data: recipientUser } = await supabaseAdmin
        .from('users')
        .select('email, name')
        .eq('id', toAccount.user_id)
        .single();

      if (recipientUser) {
        await EmailService.sendTransactionAlert(
          recipientUser.email,
          recipientUser.name,
          'credit',
          transferData.convertedAmount,
          transferData.toCurrency,
          transferData.note || 'Transfer received',
          Number(toAccount.balance)
        );
      }
    }

    // 9. Clean up Redis
    await redisHelpers.invalidateCache(`transfer:${transfer_id}`);

    // 10. Audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: req.user.id,
      action: 'TRANSFER_COMPLETED',
      table_name: 'transfers',
      record_id: transfer_id,
      new_data: {
        amount: transferData.amount,
        from_currency: transferData.fromCurrency,
        to_currency: transferData.toCurrency,
        reference_id: transferData.referenceId,
      },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully!',
      data: {
        transfer_id: transfer_id,
        reference_id: transferData.referenceId,
        amount: transferData.amount,
        from_currency: transferData.fromCurrency,
        converted_amount: transferData.convertedAmount,
        to_currency: transferData.toCurrency,
        exchange_rate:
          transferData.fromCurrency !== transferData.toCurrency
            ? transferData.exchangeRate
            : null,
        status: 'completed',
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// CANCEL TRANSFER 
export const cancelTransfer = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { transferId } = req.params;

    const { data: transfer } = await supabaseAdmin
      .from('transfers')
      .select('id, status, from_account_id')
      .eq('id', transferId)
      .single();

    if (!transfer) throw new NotFoundError('Transfer not found');

    // Verify ownership through from_account
    const { data: fromAccount } = await supabaseAdmin
      .from('accounts')
      .select('user_id')
      .eq('id', transfer.from_account_id)
      .single();

    if (!fromAccount || fromAccount.user_id !== req.user.id) {
      throw new ForbiddenError('Unauthorized');
    }

    if (transfer.status !== 'pending') {
      throw new BadRequestError(`Cannot cancel a ${transfer.status} transfer`);
    }

    await supabaseAdmin
      .from('transfers')
      .update({ status: 'cancelled' })
      .eq('id', transferId);

    await redisHelpers.invalidateCache(`transfer:${transferId}`);

    res.status(200).json({
      success: true,
      message: 'Transfer cancelled successfully',
    });
  }
);

// GET TRANSFER HISTORY 
export const getTransferHistory = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(
      parseInt(req.query.limit as string) || 20,
      50
    );
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    // Get all user's account IDs
    const { data: userAccounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', req.user.id);

    const accountIds = userAccounts?.map((a) => a.id) || [];

    if (accountIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { transfers: [], pagination: { page, limit, total: 0, totalPages: 0 } },
      });
    }

    // Build query
      const idsStr = accountIds.join(',');
    let query = supabaseAdmin
      .from('transfers')
      .select('*', { count: 'exact' })
      .or(`from_account_id.in.(${idsStr}),to_account_id.in.(${idsStr})`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    

    if (status) {
      query = query.eq('status', status);
    }

    const { data: transfers, count, error } = await query;

    if (error) {
      logger.error('Transfer history error:', error);
      throw new BadRequestError('Failed to fetch transfer history');
    }

    const totalPages = Math.ceil((count || 0) / limit);

    res.status(200).json({
      success: true,
      message: 'Transfer history fetched',
      data: {
        transfers: transfers || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    });
  }
);

//SCHEDULE TRANSFER
export const scheduleTransfer = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const {
      from_account_id,
      to_account_number,
      amount,
      note,
      scheduled_at,
      is_recurring,
      recurrence_pattern,
    } = req.body;

    // Validate source account
    const { data: fromAccount } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', from_account_id)
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();

    if (!fromAccount) {
      throw new NotFoundError('Source account not found');
    }

    // Validate destination
    const { data: toAccount } = await supabaseAdmin
      .from('accounts')
      .select('id, currency')
      .eq('account_number', to_account_number)
      .eq('status', 'active')
      .single();

    if (!toAccount) {
      throw new NotFoundError('Destination account not found');
    }

    // Validate scheduled date is in the future
    if (new Date(scheduled_at) <= new Date()) {
      throw new BadRequestError(
        'Scheduled date must be in the future'
      );
    }

    const { convertedAmount, exchangeRate } =
      await CurrencyService.convert(
        amount,
        fromAccount.currency,
        toAccount.currency
      );

    const { data: transfer, error } = await supabaseAdmin
      .from('transfers')
      .insert({
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        amount,
        from_currency: fromAccount.currency,
        to_currency: toAccount.currency,
        exchange_rate: exchangeRate,
        converted_amount: convertedAmount,
        note,
        status: 'pending',
        is_scheduled: true,
        scheduled_at,
        is_recurring: is_recurring || false,
        recurrence_pattern: recurrence_pattern || null,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestError('Failed to schedule transfer');
    }

    res.status(201).json({
      success: true,
      message: `Transfer scheduled for ${new Date(scheduled_at).toLocaleDateString()}`,
      data: { transfer },
    });
  }
);