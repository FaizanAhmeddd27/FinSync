import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/errors';
import { logger } from '../utils/logger';

// GET USER'S FRAUD ALERTS 
export const getFraudAlerts = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

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
        account:accounts(account_number, account_type, currency),
        ledger_entry:ledger(amount, type, description, created_at)
      `,
        { count: 'exact' }
      )
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);

    const { data: alerts, count, error } = await query;

    if (error) {
      logger.error('Fraud alerts query error:', error);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Get summary stats
    const { data: stats } = await supabaseAdmin
      .from('fraud_alerts')
      .select('status, severity')
      .eq('user_id', req.user.id);

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
        alerts: alerts || [],
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

//GET SINGLE FRAUD ALERT 
export const getFraudAlertById = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { alertId } = req.params;

     const { data: alert } = await supabaseAdmin
      .from('fraud_alerts')
      .select(`
        *,
        account:accounts(account_number, account_type, currency, balance),
        ledger_entry:ledger(amount, type, description, category, reference_id, created_at)
      `)
      .eq('id', alertId)
      .single();

    if (!alert) throw new NotFoundError('Fraud alert not found');

    // Fetch reviewer separately if exists
    let reviewer = null;
    if (alert.reviewed_by) {
      const { data: reviewerData } = await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', alert.reviewed_by)
        .maybeSingle();
      reviewer = reviewerData;
    }

    // Check ownership
    if (alert.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new ForbiddenError();
    }

    res.status(200).json({
      success: true,
      data: { alert: { ...alert, reviewer } },
    });
  }
);

// CLEAR FRAUD ALERT (Admin) 
export const clearFraudAlert = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role !== 'admin') throw new ForbiddenError('Admin access required');

    const { alertId } = req.params;

    const { data: alert } = await supabaseAdmin
      .from('fraud_alerts')
      .select('id, status')
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

    // Audit log
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

// BLOCK ACCOUNT FROM FRAUD ALERT (Admin) 
export const blockFromFraudAlert = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role !== 'admin') throw new ForbiddenError('Admin access required');

    const { alertId } = req.params;

    const { data: alert } = await supabaseAdmin
      .from('fraud_alerts')
      .select('id, account_id, user_id')
      .eq('id', alertId)
      .single();

    if (!alert) throw new NotFoundError('Fraud alert not found');

    // Block the account
    await supabaseAdmin.rpc('block_account', {
      p_account_id: alert.account_id,
      p_admin_id: req.user.id,
    });

    // Update alert status
    await supabaseAdmin
      .from('fraud_alerts')
      .update({
        status: 'blocked',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    // Notify user
    await supabaseAdmin.from('notifications').insert({
      user_id: alert.user_id,
      type: 'fraud',
      title: '🚫 Account Frozen',
      message:
        'Your account has been frozen due to suspicious activity. Please contact support.',
      metadata: { alert_id: alertId, account_id: alert.account_id },
    });

    res.status(200).json({
      success: true,
      message: 'Account blocked and alert updated',
    });
  }
);