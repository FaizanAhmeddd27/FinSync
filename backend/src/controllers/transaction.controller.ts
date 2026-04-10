import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import { parsePagination } from '../utils/helpers';
import { logger } from '../utils/logger';

export const getTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const {
      account_id,
      type,
      category,
      search,
      start_date,
      end_date,
      min_amount,
      max_amount,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query as any;

    const offset = (Number(page) - 1) * Number(limit);

    if (account_id) {
      const { data: account } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('id', account_id)
        .eq('user_id', req.user.id)
        .single();

      if (!account) {
        throw new NotFoundError('Account not found');
      }
    }

    const { data: userAccounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', req.user.id);

    const accountIds = userAccounts?.map((a) => a.id) || [];

    if (accountIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          transactions: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false,
          },
        },
      });
    }

    let query = supabaseAdmin
      .from('ledger')
      .select(
        `
        *,
        account:accounts(account_number, account_type, currency, user_id)
      `,
        { count: 'exact' }
      );

    if (account_id) {
      query = query.eq('account_id', account_id);
    } else {
      query = query.in('account_id', accountIds);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    if (min_amount !== undefined) {
      query = query.gte('amount', Number(min_amount));
    }
    if (max_amount !== undefined) {
      query = query.lte('amount', Number(max_amount));
    }

    if (search) {
      query = query.ilike('description', `%${search}%`);
    }
    const ascending = sort_order === 'asc';
    query = query.order(sort_by || 'created_at', { ascending });
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: transactions, count, error } = await query;

    if (error) {
      logger.error('Transactions query error:', error);
      throw new BadRequestError('Failed to fetch transactions');
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      message: 'Transactions fetched successfully',
      data: {
        transactions: transactions || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrevious: Number(page) > 1,
        },
      },
    });
  }
);

export const getTransactionById = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { transactionId } = req.params;

    const { data: transaction, error } = await supabaseAdmin
      .from('ledger')
      .select(
        `
        *,
        account:accounts(account_number, account_type, currency, user_id)
      `
      )
      .eq('id', transactionId)
      .single();

    if (error || !transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (
      transaction.account &&
      (transaction.account as any).user_id !== req.user.id
    ) {
      throw new NotFoundError('Transaction not found');
    }

    res.status(200).json({
      success: true,
      data: { transaction },
    });
  }
);

export const getTransactionStats = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const period = (req.query.period as string) || '30d';
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const { data: userAccounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', req.user.id);

    const accountIds = userAccounts?.map((a) => a.id) || [];

    if (accountIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total_income: 0,
          total_spending: 0,
          net: 0,
          transaction_count: 0,
          avg_transaction: 0,
          daily_breakdown: [],
          category_breakdown: [],
        },
      });
    }

    const { data: transactions } = await supabaseAdmin
      .from('ledger')
      .select('amount, type, category, created_at, currency')
      .in('account_id', accountIds)
      .gte('created_at', startDate.toISOString())
      .gt('amount', 0)
      .order('created_at', { ascending: true });

    const txns = transactions || [];

    const totalIncome = txns
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalSpending = txns
      .filter((t) => t.type === 'debit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const dailyMap: Record<
      string,
      { income: number; spending: number }
    > = {};
    for (const txn of txns) {
      const day = new Date(txn.created_at)
        .toISOString()
        .split('T')[0];
      if (!dailyMap[day]) {
        dailyMap[day] = { income: 0, spending: 0 };
      }
      if (txn.type === 'credit') {
        dailyMap[day].income += Number(txn.amount);
      } else {
        dailyMap[day].spending += Number(txn.amount);
      }
    }

    const dailyBreakdown = Object.entries(dailyMap)
      .map(([date, data]) => ({
        date,
        income: parseFloat(data.income.toFixed(2)),
        spending: parseFloat(data.spending.toFixed(2)),
        net: parseFloat((data.income - data.spending).toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const categoryMap: Record<
      string,
      { total: number; count: number }
    > = {};
    for (const txn of txns.filter((t) => t.type === 'debit')) {
      const cat = txn.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, count: 0 };
      }
      categoryMap[cat].total += Number(txn.amount);
      categoryMap[cat].count += 1;
    }

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        total: parseFloat(data.total.toFixed(2)),
        count: data.count,
        percentage: parseFloat(
          ((data.total / totalSpending) * 100).toFixed(1)
        ),
      }))
      .sort((a, b) => b.total - a.total);

    res.status(200).json({
      success: true,
      message: 'Transaction stats fetched',
      data: {
        period,
        total_income: parseFloat(totalIncome.toFixed(2)),
        total_spending: parseFloat(totalSpending.toFixed(2)),
        net: parseFloat((totalIncome - totalSpending).toFixed(2)),
        transaction_count: txns.length,
        avg_transaction: parseFloat(
          (
            txns.reduce((s, t) => s + Number(t.amount), 0) /
            Math.max(txns.length, 1)
          ).toFixed(2)
        ),
        daily_breakdown: dailyBreakdown,
        category_breakdown: categoryBreakdown,
      },
    });
  }
);

export const getRecentTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const limit = Math.min(
      parseInt(req.query.limit as string) || 5,
      20
    );

    const { data: userAccounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', req.user.id);

    const accountIds = userAccounts?.map((a) => a.id) || [];

    if (accountIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { transactions: [] },
      });
    }

    const { data: transactions } = await supabaseAdmin
      .from('ledger')
      .select(
        `
        *,
        account:accounts(account_number, account_type, currency)
      `
      )
      .in('account_id', accountIds)
      .gt('amount', 0)
      .order('created_at', { ascending: false })
      .limit(limit);

    res.status(200).json({
      success: true,
      data: { transactions: transactions || [] },
    });
  }
);

export const exportTransactionsCSV = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { account_id, start_date, end_date } = req.query;

    const { data: userAccounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', req.user.id);

    const accountIds = userAccounts?.map((a) => a.id) || [];

    let query = supabaseAdmin
      .from('ledger')
      .select(
        `
        id, amount, type, description, category, reference_id,
        running_balance, currency, created_at,
        account:accounts(account_number)
      `
      )
      .in('account_id', account_id ? [account_id] : accountIds)
      .gt('amount', 0)
      .order('created_at', { ascending: false });

    if (start_date) query = query.gte('created_at', start_date as string);
    if (end_date) query = query.lte('created_at', end_date as string);

    const { data: transactions } = await query;

    if (!transactions || transactions.length === 0) {
      throw new NotFoundError(
        'No transactions found for the given criteria'
      );
    }

    const headers = [
      'Date',
      'Account',
      'Type',
      'Category',
      'Description',
      'Amount',
      'Balance',
      'Currency',
      'Reference',
    ];

    const rows = transactions.map((t: any) => [
      new Date(t.created_at).toLocaleDateString(),
      t.account?.account_number || '',
      t.type,
      t.category || '',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.type === 'debit' ? `-${t.amount}` : t.amount,
      t.running_balance,
      t.currency,
      t.reference_id || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join(
      '\n'
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=finsync_transactions_${new Date().toISOString().split('T')[0]}.csv`
    );
    res.send(csv);
  }
);

export const createTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { account_id, amount, type, category, description } = req.body;

    const { data: account, error: accError } = await supabaseAdmin
      .from('accounts')
      .select('balance, currency, user_id')
      .eq('id', account_id)
      .eq('user_id', req.user.id)
      .single();

    if (accError || !account) throw new NotFoundError('Account not found');

    const newBalance = type === 'credit' 
      ? Number(account.balance) + Number(amount)
      : Number(account.balance) - Number(amount);

    const { error: updateAccError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', account_id);

    if (updateAccError) throw new BadRequestError('Failed to update balance');

    const { data: transaction, error: ledgerError } = await supabaseAdmin
      .from('ledger')
      .insert({
        account_id,
        amount,
        type,
        category,
        description: description || `Manual ${type}`,
        running_balance: newBalance,
        currency: account.currency
      })
      .select()
      .single();

    if (ledgerError) {
      await supabaseAdmin.from('accounts').update({ balance: account.balance }).eq('id', account_id);
      throw new BadRequestError('Failed to record transaction');
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction }
    });
  }
);

export const updateTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { transactionId } = req.params;
    const { amount, category, description } = req.body;

    const { data: oldTxn, error: oldError } = await supabaseAdmin
      .from('ledger')
      .select('*, account:accounts(user_id, balance)')
      .eq('id', transactionId)
      .single();

    if (oldError || !oldTxn) throw new NotFoundError('Transaction not found');
    if ((oldTxn.account as any).user_id !== req.user.id) throw new UnauthorizedError();

    let newBalance = Number((oldTxn.account as any).balance);

    if (amount !== undefined && Number(amount) !== Number(oldTxn.amount)) {
      const diff = Number(amount) - Number(oldTxn.amount);
      newBalance = oldTxn.type === 'credit' 
        ? newBalance + diff 
        : newBalance - diff;

      await supabaseAdmin
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', oldTxn.account_id);
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('ledger')
      .update({
        amount: amount ?? oldTxn.amount,
        category: category ?? oldTxn.category,
        description: description ?? oldTxn.description,
        running_balance: newBalance
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) throw new BadRequestError('Failed to update transaction');

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction: updated }
    });
  }
);

export const deleteTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { transactionId } = req.params;

    const { data: txn, error: getError } = await supabaseAdmin
      .from('ledger')
      .select('*, account:accounts(user_id, balance)')
      .eq('id', transactionId)
      .single();

    if (getError || !txn) throw new NotFoundError('Transaction not found');
    if ((txn.account as any).user_id !== req.user.id) throw new UnauthorizedError();

    const reverseAmount = txn.type === 'credit' 
      ? Number((txn.account as any).balance) - Number(txn.amount)
      : Number((txn.account as any).balance) + Number(txn.amount);

    await supabaseAdmin
      .from('accounts')
      .update({ balance: reverseAmount })
      .eq('id', txn.account_id);

    const { error: deleteError } = await supabaseAdmin
      .from('ledger')
      .delete()
      .eq('id', transactionId);

    if (deleteError) throw new BadRequestError('Failed to delete transaction');

    res.status(200).json({
      success: true,
      message: 'Transaction deleted and balance adjusted'
    });
  }
);