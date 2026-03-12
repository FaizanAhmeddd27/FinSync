import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors';
import { parsePagination, sanitizeUser } from '../utils/helpers';
import { redisHelpers } from '../config/redis';
import { logger } from '../utils/logger';

// DASHBOARD STATS 
export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'admin') throw new ForbiddenError();

    // Try cache first
    const cached = await redisHelpers.getCache<any>('admin:dashboard_stats');
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    // Total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Active users
    const { count: activeUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // New users (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count: newUsers30d } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo);

    // Total accounts
    const { count: totalAccounts } = await supabaseAdmin
      .from('accounts')
      .select('*', { count: 'exact', head: true });

    // Active accounts
    const { count: activeAccounts } = await supabaseAdmin
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Total money across all accounts
    const { data: moneyData } = await supabaseAdmin
      .from('accounts')
      .select('balance, currency')
      .eq('status', 'active');

    const totalMoneyByCurrency: Record<string, number> = {};
    (moneyData || []).forEach((acc) => {
      const currency = acc.currency || 'USD';
      totalMoneyByCurrency[currency] =
        (totalMoneyByCurrency[currency] || 0) + Number(acc.balance);
    });

    // Total transactions
    const { count: totalTransactions } = await supabaseAdmin
      .from('ledger')
      .select('*', { count: 'exact', head: true });

    // Transactions last 24 hours
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { count: transactions24h } = await supabaseAdmin
      .from('ledger')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo);

    // Pending fraud alerts
    const { count: pendingFraudAlerts } = await supabaseAdmin
      .from('fraud_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Critical fraud alerts
    const { count: criticalAlerts } = await supabaseAdmin
      .from('fraud_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .eq('status', 'pending');

    // KYC pending
    const { count: kycPending } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', 'pending');

    // Frozen accounts
    const { count: frozenAccounts } = await supabaseAdmin
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'frozen');

    // Daily transaction volume (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: dailyVolume } = await supabaseAdmin
      .from('ledger')
      .select('amount, type, created_at')
      .gte('created_at', sevenDaysAgo)
      .gt('amount', 0)
      .order('created_at', { ascending: true });

    const dailyStats = new Map<
      string,
      { date: string; credits: number; debits: number; count: number }
    >();

    (dailyVolume || []).forEach((txn) => {
      const date = new Date(txn.created_at).toISOString().split('T')[0];
      const existing = dailyStats.get(date) || {
        date,
        credits: 0,
        debits: 0,
        count: 0,
      };

      if (txn.type === 'credit') {
        existing.credits += Number(txn.amount);
      } else {
        existing.debits += Number(txn.amount);
      }
      existing.count += 1;
      dailyStats.set(date, existing);
    });

    // Recent registrations (last 5)
    const { data: recentUsers } = await supabaseAdmin
      .from('users')
      .select('id, name, email, created_at, kyc_status, provider')
      .order('created_at', { ascending: false })
      .limit(5);

    // Top users by balance
    const { data: topAccounts } = await supabaseAdmin
      .from('accounts')
      .select(`
        balance, currency, account_type,
        users (name, email)
      `)
      .eq('status', 'active')
      .order('balance', { ascending: false })
      .limit(10);


    const result = {
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        newLast30Days: newUsers30d || 0,
        kycPending: kycPending || 0,
      },
      accounts: {
        total: totalAccounts || 0,
        active: activeAccounts || 0,
        frozen: frozenAccounts || 0,
      },
      transactions: {
        total: totalTransactions || 0,
        last24Hours: transactions24h || 0,
      },
      money: {
        totalByCurrency: totalMoneyByCurrency,
      },
      fraud: {
        pendingAlerts: pendingFraudAlerts || 0,
        criticalAlerts: criticalAlerts || 0,
      },
      charts: {
        dailyVolume: Array.from(dailyStats.values()),
      },
      recent: {
        users: recentUsers || [],
        topAccounts: topAccounts || [],
      },
    };

    // Cache for 5 minutes
    await redisHelpers.setCache('admin:dashboard_stats', result, 300);

    res.status(200).json({ success: true, data: result });
  }
);

// GET ALL USERS 
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError();

  const { page, limit, offset } = parsePagination(req.query);
  const {
    search,
    role,
    kyc_status,
    is_active,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = req.query as Record<string, string>;

  let query = supabaseAdmin
    .from('users')
    .select(
      'id, name, email, phone, role, kyc_status, provider, is_active, is_email_verified, preferred_currency, created_at, avatar_url',
      { count: 'exact' }
    )
    .order(sort_by || 'created_at', { ascending: sort_order === 'asc' })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (role) query = query.eq('role', role);
  if (kyc_status) query = query.eq('kyc_status', kyc_status);
  if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

  const { data: users, count, error } = await query;

  if (error) {
    logger.error('Admin users fetch error:', error);
    throw new BadRequestError('Failed to fetch users');
  }

  res.status(200).json({
    success: true,
    data: {
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: offset + limit < (count || 0),
        hasPrevious: page > 1,
      },
    },
  });
});

//  GET USER DETAIL 
export const getUserDetail = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'admin') throw new ForbiddenError();

    const { userId } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) throw new NotFoundError('User not found');

    // Get user's accounts
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    // Get login attempts (last 10)
    const { data: loginAttempts } = await supabaseAdmin
      .from('login_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false })
      .limit(10);

    // Get fraud alerts
    const { data: fraudAlerts } = await supabaseAdmin
      .from('fraud_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent transactions
    const accountIds = (accounts || []).map((a) => a.id);
    let recentTransactions: any[] = [];

    if (accountIds.length > 0) {
      const { data: txns } = await supabaseAdmin
        .from('ledger')
        .select('*')
        .in('account_id', accountIds)
        .order('created_at', { ascending: false })
        .limit(10);
      recentTransactions = txns || [];
    }

    // Transaction stats
    const totalBalance = (accounts || [])
      .filter((a) => a.status === 'active')
      .reduce((sum, a) => sum + Number(a.balance), 0);

    res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accounts: accounts || [],
        totalBalance,
        loginAttempts: loginAttempts || [],
        fraudAlerts: fraudAlerts || [],
        recentTransactions,
      },
    });
  }
);

//  UPDATE USER (Admin) 
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError();

  const { userId } = req.params;
  const { role, kyc_status, is_active } = req.body;

  // Prevent admin from demoting themselves
  if (userId === req.user.id && role === 'user') {
    throw new BadRequestError('Cannot demote yourself');
  }

  const updateData: any = {};
  if (role !== undefined) updateData.role = role;
  if (kyc_status !== undefined) updateData.kyc_status = kyc_status;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (Object.keys(updateData).length === 0) {
    throw new BadRequestError('No valid fields to update');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error || !updated) throw new NotFoundError('User not found');

  // Notify user of changes
  const messages: string[] = [];
  if (kyc_status === 'verified') messages.push('Your KYC has been verified! ✅');
  if (kyc_status === 'rejected') messages.push('Your KYC was rejected. Please resubmit.');
  if (is_active === false) messages.push('Your account has been deactivated.');
  if (is_active === true) messages.push('Your account has been reactivated.');

  for (const msg of messages) {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: 'Account Update',
      message: msg,
    });
  }

  // Audit log
  await supabaseAdmin.from('audit_log').insert({
    user_id: req.user.id,
    action: 'ADMIN_UPDATE_USER',
    table_name: 'users',
    record_id: userId,
    new_data: updateData,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
  });

  // Invalidate cache
  await redisHelpers.invalidateCache('admin:dashboard_stats');

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user: sanitizeUser(updated) },
  });
});

// MANAGE ACCOUNT (Freeze/Unfreeze/Close) 
export const manageAccount = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'admin') throw new ForbiddenError();

    const { accountId } = req.params;
    const { action, reason } = req.body;

     const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('*, users(name, email, id)')
      .eq('id', accountId)
      .single()

    if (!account) throw new NotFoundError('Account not found');

    let newStatus: string;
    let notificationTitle: string;
    let notificationMessage: string;

    switch (action) {
      case 'freeze':
        await supabaseAdmin.rpc('block_account', {
          p_account_id: accountId,
          p_admin_id: req.user.id,
        });
        newStatus = 'frozen';
        notificationTitle = '🚫 Account Frozen';
        notificationMessage = `Your account has been frozen.${reason ? ` Reason: ${reason}` : ''} Contact support for details.`;
        break;

      case 'unfreeze':
        await supabaseAdmin.rpc('unblock_account', {
          p_account_id: accountId,
          p_admin_id: req.user.id,
        });
        newStatus = 'active';
        notificationTitle = '✅ Account Unfrozen';
        notificationMessage = 'Your account has been unfrozen and is now active.';
        break;

      case 'close':
        if (Number(account.balance) > 0) {
          throw new BadRequestError('Cannot close account with remaining balance');
        }
        await supabaseAdmin
          .from('accounts')
          .update({ status: 'closed' })
          .eq('id', accountId);
        newStatus = 'closed';
        notificationTitle = '🔒 Account Closed';
        notificationMessage = 'Your account has been closed by administration.';
        break;

      default:
        throw new BadRequestError('Invalid action');
    }

    // Notify user
    const userId = (account as any).users?.id;
    if (userId) {
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title: notificationTitle,
        message: notificationMessage,
        metadata: { account_id: accountId, action, reason },
      });
    }

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: req.user.id,
      action: `ADMIN_${action.toUpperCase()}_ACCOUNT`,
      table_name: 'accounts',
      record_id: accountId,
      new_data: { action, reason, new_status: newStatus },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    await redisHelpers.invalidateCache('admin:dashboard_stats');

    res.status(200).json({
      success: true,
      message: `Account ${action}${action === 'freeze' ? 'd' : action === 'close' ? 'd' : 'n'} successfully`,
    });
  }
);

// GET AUDIT LOGS 
export const getAuditLogs = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'admin') throw new ForbiddenError();

    const { page, limit, offset } = parsePagination(req.query);
    const { table_name, action, user_id } = req.query as Record<string, string>;

    let query = supabaseAdmin
      .from('audit_log')
      .select(
        `
        *,
        users (name, email)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (table_name) query = query.eq('table_name', table_name);
    if (action) query = query.ilike('action', `%${action}%`);
    if (user_id) query = query.eq('user_id', user_id);

    const { data: logs, count, error } = await query;

    if (error) {
      logger.error('Audit log fetch error:', error);
      throw new BadRequestError('Failed to fetch audit logs');
    }

    res.status(200).json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: offset + limit < (count || 0),
          hasPrevious: page > 1,
        },
      },
    });
  }
);

//  GET SYSTEM HEALTH 
export const getSystemHealth = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'admin') throw new ForbiddenError();

    const startTime = Date.now();

    // Test database query time
    const dbStart = Date.now();
    await supabaseAdmin.from('users').select('count').limit(0);
    const dbLatency = Date.now() - dbStart;

    // Test Redis
    const redisStart = Date.now();
    const { redis } = await import('../config/redis');
    await redis.ping();
    const redisLatency = Date.now() - redisStart;

    // Memory usage
    const memoryUsage = process.memoryUsage();

    // Uptime
    const uptime = process.uptime();

    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor(
          (uptime % 3600) / 60
        )}m ${Math.floor(uptime % 60)}s`,
        database: {
          status: dbLatency < 5000 ? 'healthy' : 'degraded',
          latencyMs: dbLatency,
        },
        redis: {
          status: redisLatency < 2000 ? 'healthy' : 'degraded',
          latencyMs: redisLatency,
        },
        memory: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1048576),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1048576),
          rssMB: Math.round(memoryUsage.rss / 1048576),
        },
        responseTimeMs: Date.now() - startTime,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
      },
    });
  }
);

// GET ANALYTICS 
export const getAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'admin') throw new ForbiddenError();

    const period = parseInt(req.query.period as string) || 30; // days
    const startDate = new Date(Date.now() - period * 86400000).toISOString();

    // User registrations over time
    const { data: registrations } = await supabaseAdmin
      .from('users')
      .select('created_at, provider')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    const regByDay = new Map<string, { local: number; google: number; github: number }>();
    (registrations || []).forEach((u) => {
      const date = new Date(u.created_at).toISOString().split('T')[0];
      const existing = regByDay.get(date) || { local: 0, google: 0, github: 0 };
      existing[u.provider as keyof typeof existing] =
        (existing[u.provider as keyof typeof existing] || 0) + 1;
      regByDay.set(date, existing);
    });

    // Transaction volume over time
    const { data: txnVolume } = await supabaseAdmin
      .from('ledger')
      .select('amount, type, created_at')
      .gte('created_at', startDate)
      .gt('amount', 0)
      .order('created_at', { ascending: true });

    const volumeByDay = new Map<string, { volume: number; count: number }>();
    (txnVolume || []).forEach((t) => {
      const date = new Date(t.created_at).toISOString().split('T')[0];
      const existing = volumeByDay.get(date) || { volume: 0, count: 0 };
      existing.volume += Number(t.amount);
      existing.count += 1;
      volumeByDay.set(date, existing);
    });

    // Fraud alerts distribution
    const { data: fraudStats } = await supabaseAdmin
      .from('fraud_alerts')
      .select('alert_type, severity, status')
      .gte('created_at', startDate);

    const fraudByType: Record<string, number> = {};
    const fraudBySeverity: Record<string, number> = {};
    (fraudStats || []).forEach((f) => {
      fraudByType[f.alert_type] = (fraudByType[f.alert_type] || 0) + 1;
      fraudBySeverity[f.severity] = (fraudBySeverity[f.severity] || 0) + 1;
    });

    // Top spending categories (across all users)
    const { data: categoryData } = await supabaseAdmin
      .from('ledger')
      .select('category, amount')
      .eq('type', 'debit')
      .gte('created_at', startDate)
      .not('category', 'is', null);

    const categoryMap: Record<string, number> = {};
    (categoryData || []).forEach((c) => {
      const cat = c.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(c.amount);
    });

    const topCategories = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        period: `${period} days`,
        registrations: {
          total: registrations?.length || 0,
          byDay: Array.from(regByDay.entries()).map(([date, data]) => ({
            date,
            ...data,
            total: data.local + data.google + data.github,
          })),
        },
        transactionVolume: {
          total: (txnVolume || []).reduce((s, t) => s + Number(t.amount), 0),
          byDay: Array.from(volumeByDay.entries()).map(([date, data]) => ({
            date,
            ...data,
          })),
        },
        fraud: {
          total: fraudStats?.length || 0,
          byType: fraudByType,
          bySeverity: fraudBySeverity,
        },
        topCategories,
      },
    });
  }
);