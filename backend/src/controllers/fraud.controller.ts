import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors';
import { logger } from '../utils/logger';

export const getFraudAlerts = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const isAdmin = req.user.role?.toLowerCase() === 'admin';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(
      parseInt(req.query.limit as string) || 20,
      50
    );
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const severity = req.query.severity as string;

    let query = supabaseAdmin
      .from('fraud_alerts')
      .select(
        `
        *,
        users!user_id(id, name, email, avatar_url),
        accounts!account_id(account_number, account_type, currency),
        ledger!ledger_id(amount, type, description, created_at)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    }

    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);

    const { data: alerts, count, error } = await query;

    if (error) {
      logger.error('Fraud alerts query error:', error);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    let statsQuery = supabaseAdmin
      .from('fraud_alerts')
      .select('status, severity');
    
    if (!isAdmin) {
      statsQuery = statsQuery.eq('user_id', req.user.id);
    }

    const { data: stats } = await statsQuery;

    const summary = {
      total: stats?.length || 0,
      pending: stats?.filter((s) => s.status === 'pending').length || 0,
      cleared: stats?.filter((s) => s.status === 'cleared').length || 0,
      blocked: stats?.filter((s) => s.status === 'blocked').length || 0,
      critical:
        stats?.filter((s) => s.severity === 'critical').length || 0,
      high: stats?.filter((s) => s.severity === 'high').length || 0,
    };

    res.status(200).json({
      success: true,
      message: 'Fraud alerts fetched',
      data: {
        alerts: (alerts || []).map((a: any) => ({
          ...a,
          user: a.users,
          account: a.accounts,
          ledger_entry: a.ledger
        })),
        summary,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    });
  }
);

export const getFraudAlertById = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { alertId } = req.params;

     const { data: alert, error } = await supabaseAdmin
      .from('fraud_alerts')
      .select(`
        *,
        users!user_id(id, name, email, avatar_url, kyc_status),
        accounts!account_id(account_number, account_type, currency, balance),
        ledger!ledger_id(amount, type, description, category, reference_id, created_at)
      `)
      .eq('id', alertId)
      .single();

    if (error || !alert) {
      logger.error('Get fraud alert detail error:', error);
      throw new NotFoundError('Fraud alert not found');
    }

    if (alert.user_id !== req.user.id && req.user.role?.toLowerCase() !== 'admin') {
      throw new ForbiddenError();
    }

    let reviewer = null;
    if (alert.reviewed_by) {
      const { data: reviewerData } = await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', alert.reviewed_by)
        .maybeSingle();
      reviewer = reviewerData;
    }

    res.status(200).json({
      success: true,
      data: { 
        alert: { 
          ...alert, 
          user: alert.users,
          account: alert.accounts,
          ledger_entry: alert.ledger,
          reviewer 
        } 
      },
    });
  }
);

export const clearFraudAlert = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role?.toLowerCase() !== 'admin') throw new ForbiddenError('Only admins can clear alerts');

    const { alertId } = req.params;

    const { data: alert } = await supabaseAdmin
      .from('fraud_alerts')
      .select('id, user_id, status')
      .eq('id', alertId)
      .single();

    if (!alert) throw new NotFoundError('Fraud alert not found');

    await supabaseAdmin
      .from('fraud_alerts')
      .update({
        status: 'cleared',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    await supabaseAdmin.from('notifications').insert({
      user_id: alert.user_id,
      type: 'info',
      title: '✅ Transaction Verified',
      message: 'A flagged transaction has been reviewed and verified by our system. Your account is secure.',
      metadata: { alert_id: alertId },
    });

    await supabaseAdmin.from('audit_log').insert({
      user_id: req.user.id,
      action: 'CLEAR_FRAUD_ALERT',
      table_name: 'fraud_alerts',
      record_id: alertId,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Fraud alert cleared',
    });
  }
);

export const blockFromFraudAlert = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role?.toLowerCase() !== 'admin') throw new ForbiddenError('Only admins can block accounts from alerts');

    const { alertId } = req.params;

    const { data: alert } = await supabaseAdmin
      .from('fraud_alerts')
      .select('id, account_id, user_id')
      .eq('id', alertId)
      .single();

    if (!alert) throw new NotFoundError('Fraud alert not found');

    await supabaseAdmin.rpc('block_account', {
      p_account_id: alert.account_id,
      p_admin_id: req.user.id,
    });

    await supabaseAdmin
      .from('fraud_alerts')
      .update({
        status: 'blocked',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    await supabaseAdmin.from('notifications').insert({
      user_id: alert.user_id,
      type: 'fraud',
      title: '🚫 Account Frozen',
      message:
        'Your account has been frozen due to suspicious activity detected by our security engine. Please contact support.',
      metadata: { alert_id: alertId, account_id: alert.account_id },
    });

    res.status(200).json({
      success: true,
      message: 'Account blocked and alert updated',
    });
  }
);