// src/controllers/account.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors';
import { maskAccountNumber, parsePagination } from '../utils/helpers';
import { CurrencyService } from '../services/currency.service';
import { logger } from '../utils/logger';

// GET ALL USER ACCOUNTS 
export const getAccounts = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { data: accounts, error } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Get accounts error:', error);
      throw new BadRequestError('Failed to fetch accounts');
    }

    // Calculate total balance across all currencies (converted to preferred)
    let totalBalanceInPreferred = 0;
    const preferredCurrency = req.user.preferred_currency || 'USD';

    for (const account of accounts || []) {
      if (account.status !== 'active') continue;

      if (account.currency === preferredCurrency) {
        totalBalanceInPreferred += Number(account.balance);
      } else {
        const { convertedAmount } = await CurrencyService.convert(
          Number(account.balance),
          account.currency,
          preferredCurrency
        );
        totalBalanceInPreferred += convertedAmount;
      }
    }

    // Mask account numbers for response
    const maskedAccounts = (accounts || []).map((acc) => ({
      ...acc,
      masked_number: maskAccountNumber(acc.account_number),
    }));

    res.status(200).json({
      success: true,
      message: 'Accounts fetched successfully',
      data: {
        accounts: maskedAccounts,
        summary: {
          total_accounts: accounts?.length || 0,
          active_accounts:
            accounts?.filter((a) => a.status === 'active').length || 0,
          total_balance: parseFloat(totalBalanceInPreferred.toFixed(2)),
          preferred_currency: preferredCurrency,
        },
      },
    });
  }
);

//GET SINGLE ACCOUNT 
export const getAccountById = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { accountId } = req.params;

    const { data: account, error } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !account) {
      throw new NotFoundError('Account not found');
    }

    // Get recent transactions for this account
    const { data: recentTxns } = await supabaseAdmin
      .from('ledger')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get monthly stats
    const now = new Date();
    const firstOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();

    const { data: monthlyStats } = await supabaseAdmin
      .from('ledger')
      .select('type, amount')
      .eq('account_id', accountId)
      .gte('created_at', firstOfMonth);

    const monthlyIncome =
      monthlyStats
        ?.filter((t) => t.type === 'credit')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const monthlySpending =
      monthlyStats
        ?.filter((t) => t.type === 'debit')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    res.status(200).json({
      success: true,
      message: 'Account details fetched',
      data: {
        account: {
          ...account,
          masked_number: maskAccountNumber(account.account_number),
        },
        recent_transactions: recentTxns || [],
        monthly_stats: {
          income: monthlyIncome,
          spending: monthlySpending,
          net: monthlyIncome - monthlySpending,
        },
      },
    });
  }
);

// CREATE NEW ACCOUNT 
export const createAccount = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { account_type, initial_deposit, currency } = req.body;

    // Limit: max 10 accounts per user
    const { count } = await supabaseAdmin
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if ((count || 0) >= 10) {
      throw new BadRequestError(
        'Maximum account limit reached (10 accounts)'
      );
    }

    // Check for duplicate account types with same currency
    const { data: existing } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('account_type', account_type)
      .eq('currency', currency)
      .eq('status', 'active');

    if (existing && existing.length >= 3) {
      throw new BadRequestError(
        `You already have ${existing.length} ${account_type} accounts in ${currency}`
      );
    }

    // Use stored procedure to create account atomically
    const { data: accountId, error } = await supabaseAdmin.rpc(
      'open_new_account',
      {
        p_user_id: req.user.id,
        p_account_type: account_type,
        p_initial_deposit: initial_deposit || 0,
        p_currency: currency || 'USD',
      }
    );

    if (error) {
      logger.error('Account creation error:', error);
      throw new BadRequestError('Failed to create account. Please try again.');
    }

    // Fetch the created account
    const { data: newAccount } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: req.user.id,
      action: 'CREATE_ACCOUNT',
      table_name: 'accounts',
      record_id: accountId,
      new_data: {
        account_type,
        currency,
        initial_deposit,
      },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    // Notification
    await supabaseAdmin.from('notifications').insert({
      user_id: req.user.id,
      type: 'system',
      title: 'New Account Created',
      message: `Your new ${account_type} account in ${currency} has been opened successfully.`,
      metadata: { account_id: accountId, account_type, currency },
    });

    res.status(201).json({
      success: true,
      message: `${account_type.charAt(0).toUpperCase() + account_type.slice(1)} account created successfully`,
      data: {
        account: newAccount
          ? {
              ...newAccount,
              masked_number: maskAccountNumber(newAccount.account_number),
            }
          : { id: accountId },
      },
    });
  }
);

// UPDATE ACCOUNT 
export const updateAccount = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { accountId } = req.params;
    const { is_default } = req.body;

    // Verify account ownership
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', req.user.id)
      .single();

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // If setting as default, unset other defaults first
    if (is_default === true) {
      await supabaseAdmin
        .from('accounts')
        .update({ is_default: false })
        .eq('user_id', req.user.id)
        .eq('is_default', true);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('accounts')
      .update({ is_default: is_default ?? account.is_default })
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      throw new BadRequestError('Failed to update account');
    }

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: { account: updated },
    });
  }
);

//  CLOSE ACCOUNT 
export const closeAccount = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { accountId } = req.params;

    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', req.user.id)
      .single();

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    if (account.is_default) {
      throw new BadRequestError(
        'Cannot close default account. Set another account as default first.'
      );
    }

    if (Number(account.balance) > 0) {
      throw new BadRequestError(
        'Cannot close account with remaining balance. Please transfer funds first.'
      );
    }

    await supabaseAdmin
      .from('accounts')
      .update({ status: 'closed' })
      .eq('id', accountId);

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: req.user.id,
      action: 'CLOSE_ACCOUNT',
      table_name: 'accounts',
      record_id: accountId,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Account closed successfully',
    });
  }
);

// GET ACCOUNT BALANCE HISTORY (30 days) 
export const getBalanceHistory = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { accountId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    // Verify ownership
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, currency')
      .eq('id', accountId)
      .eq('user_id', req.user.id)
      .single();

    if (!account) throw new NotFoundError('Account not found');

    const startDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    // Get daily running balance snapshots
    const { data: history } = await supabaseAdmin
      .from('ledger')
      .select('running_balance, created_at')
      .eq('account_id', accountId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    // Group by day (take last entry per day)
    const dailyBalances: Record<string, number> = {};
    for (const entry of history || []) {
      const day = new Date(entry.created_at).toISOString().split('T')[0];
      dailyBalances[day] = Number(entry.running_balance);
    }

    // Fill in missing days
    const result: Array<{ date: string; balance: number }> = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    let lastBalance = 0;

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (dailyBalances[dateStr] !== undefined) {
        lastBalance = dailyBalances[dateStr];
      }
      result.push({ date: dateStr, balance: lastBalance });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      message: 'Balance history fetched',
      data: {
        account_id: accountId,
        currency: account.currency,
        period_days: days,
        history: result,
      },
    });
  }
);

// GET AI ACCOUNT SUGGESTION 
export const getAccountSuggestion = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    // Get user's spending patterns
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('account_type, balance, currency')
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    const { data: spendingData } = await supabaseAdmin.rpc(
      'get_spending_by_category',
      { p_user_id: req.user.id }
    );

    const totalBalance =
      accounts?.reduce((sum, a) => sum + Number(a.balance), 0) || 0;
    const totalSpending =
      spendingData?.reduce(
        (sum: number, cat: any) => sum + Number(cat.total_spent),
        0
      ) || 0;

    let suggestion = '';
    let recommendedType = '';

    if (totalBalance > 50000 && !accounts?.some((a) => a.account_type === 'fixed_deposit')) {
      suggestion =
        'You have a significant balance. Consider opening a Fixed Deposit account for higher interest earnings.';
      recommendedType = 'fixed_deposit';
    } else if (
      totalSpending > 5000 &&
      !accounts?.some((a) => a.account_type === 'checking')
    ) {
      suggestion =
        'Your spending is quite active. A Checking account would be ideal for frequent transactions.';
      recommendedType = 'checking';
    } else if (
      accounts &&
      accounts.length < 3 &&
      !accounts.some((a) => a.account_type === 'wallet')
    ) {
      suggestion =
        'Open a Wallet account for quick peer-to-peer transfers and daily expenses.';
      recommendedType = 'wallet';
    } else {
      suggestion =
        'Your account setup looks optimal! Keep tracking your spending with our budget tools.';
      recommendedType = 'none';
    }

    res.status(200).json({
      success: true,
      data: {
        suggestion,
        recommended_type: recommendedType,
        current_accounts: accounts?.length || 0,
        total_balance: totalBalance,
      },
    });
  }
);