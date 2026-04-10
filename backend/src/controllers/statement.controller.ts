import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import { PDFService } from '../services/pdf.service';
import { maskAccountNumber } from '../utils/helpers';
import { logger } from '../utils/logger';

export const getMonthlyStatement = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { accountId } = req.params;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', req.user.id)
      .single();

    if (!account) throw new NotFoundError('Account not found');

    const { data: transactions } = await supabaseAdmin
      .from('ledger')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    const txns = transactions || [];

    const { data: priorTxn } = await supabaseAdmin
      .from('ledger')
      .select('running_balance')
      .eq('account_id', accountId)
      .lt('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const openingBalance = priorTxn
      ? Number(priorTxn.running_balance)
      : 0;

    const totalCredits = txns
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalDebits = txns
      .filter((t) => t.type === 'debit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const closingBalance =
      txns.length > 0
        ? Number(txns[txns.length - 1].running_balance)
        : openingBalance;

    const categoryMap: Record<string, number> = {};
    for (const txn of txns.filter((t) => t.type === 'debit')) {
      const cat = txn.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(txn.amount);
    }

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, total]) => ({
        category,
        total: parseFloat(total.toFixed(2)),
        percentage: parseFloat(
          ((total / totalDebits) * 100).toFixed(1)
        ),
      }))
      .sort((a, b) => b.total - a.total);

    res.status(200).json({
      success: true,
      message: 'Monthly statement fetched',
      data: {
        account: {
          id: account.id,
          account_number: maskAccountNumber(account.account_number),
          account_type: account.account_type,
          currency: account.currency,
        },
        statement_month: month,
        summary: {
          opening_balance: openingBalance,
          total_credits: parseFloat(totalCredits.toFixed(2)),
          total_debits: parseFloat(totalDebits.toFixed(2)),
          closing_balance: closingBalance,
          transaction_count: txns.length,
        },
        transactions: txns,
        category_breakdown: categoryBreakdown,
      },
    });
  }
);

export const downloadStatementPDF = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { accountId } = req.params;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const monthName = startDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', req.user.id)
      .single();

    if (!account) throw new NotFoundError('Account not found');

    const { data: transactions } = await supabaseAdmin
      .from('ledger')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    const txns = transactions || [];

    const { data: priorTxn } = await supabaseAdmin
      .from('ledger')
      .select('running_balance')
      .eq('account_id', accountId)
      .lt('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const openingBalance = priorTxn
      ? Number(priorTxn.running_balance)
      : 0;

    const totalCredits = txns
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalDebits = txns
      .filter((t) => t.type === 'debit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const closingBalance =
      txns.length > 0
        ? Number(txns[txns.length - 1].running_balance)
        : openingBalance;

    const pdfBuffer = await PDFService.generateStatement({
      user_name: req.user.name,
      account_number: account.account_number,
      account_type: account.account_type,
      currency: account.currency,
      statement_month: monthName,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_credits: totalCredits,
      total_debits: totalDebits,
      transactions: txns.map((t) => ({
        date: t.created_at,
        description: t.description,
        type: t.type,
        amount: Number(t.amount),
        running_balance: Number(t.running_balance),
        category: t.category || 'Other',
      })),
    });

    await supabaseAdmin.from('audit_log').insert({
      user_id: req.user.id,
      action: 'DOWNLOAD_STATEMENT',
      table_name: 'accounts',
      record_id: accountId,
      new_data: { month, format: 'pdf' },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=FinSync_Statement_${account.account_number}_${month}.pdf`
    );
    res.send(pdfBuffer);
  }
);

export const getStatementMonths = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { accountId } = req.params;

      const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', req.user.id)
      .single();

    if (!account) throw new NotFoundError('Account not found');

    const { data: months } = await supabaseAdmin
      .from('ledger')
      .select('created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    const uniqueMonths = [
      ...new Set(
        (months || []).map((m) =>
          new Date(m.created_at).toISOString().slice(0, 7)
        )
      ),
    ];

    res.status(200).json({
      success: true,
      data: { months: uniqueMonths },
    });
  }
);