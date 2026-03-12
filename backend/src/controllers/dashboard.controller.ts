import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { UnauthorizedError } from '../utils/errors';
import { CurrencyService } from '../services/currency.service';
import { maskAccountNumber } from '../utils/helpers';
import { redisHelpers } from '../config/redis';

export const getDashboard = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const userId = req.user.id;
    const preferredCurrency = req.user.preferred_currency || 'USD';

    // Try cache
    const cacheKey = `dashboard:${userId}`;
    const cached = await redisHelpers.getCache<any>(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    // ====== ACCOUNTS ======
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('is_default', { ascending: false });

    const accountIds = (accounts || []).map((a) => a.id);

    // Build account_id -> currency map for transaction conversion
    const accountCurrencyMap: Record<string, string> = {};
    for (const acc of accounts || []) {
      accountCurrencyMap[acc.id] = acc.currency;
    }

    // ====== TOTAL BALANCE (converted to preferred currency) ======
    let totalBalance = 0;
    const balanceByCurrency: Record<string, number> = {};

    for (const acc of accounts || []) {
      // Track raw balance per currency
      balanceByCurrency[acc.currency] =
        (balanceByCurrency[acc.currency] || 0) + Number(acc.balance);

      // Convert to preferred currency for total
      if (acc.currency === preferredCurrency) {
        totalBalance += Number(acc.balance);
      } else {
        try {
          const { convertedAmount } = await CurrencyService.convert(
            Number(acc.balance),
            acc.currency,
            preferredCurrency
          );
          totalBalance += convertedAmount;
        } catch {
          // If conversion fails, skip or use raw (won't be accurate but won't break)
          totalBalance += Number(acc.balance);
        }
      }
    }

    // ====== MONTHLY INCOME & SPENDING (converted to preferred currency) ======
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let monthlyIncome = 0;
    let monthlySpending = 0;
    const incomeByCurrency: Record<string, number> = {};
    const spendingByCurrency: Record<string, number> = {};

    if (accountIds.length > 0) {
      const { data: monthlyTxns } = await supabaseAdmin
        .from('ledger')
        .select('amount, type, account_id, currency')
        .in('account_id', accountIds)
        .gte('created_at', startOfMonth.toISOString())
        .gt('amount', 0);

      for (const t of monthlyTxns || []) {
        const txnAmount = Number(t.amount);

        // Determine the currency: use txn currency > account currency > preferred
        const txnCurrency =
          t.currency || accountCurrencyMap[t.account_id] || preferredCurrency;

        // Convert to preferred currency
        let convertedAmount = txnAmount;
        if (txnCurrency !== preferredCurrency) {
          try {
            const result = await CurrencyService.convert(
              txnAmount,
              txnCurrency,
              preferredCurrency
            );
            convertedAmount = result.convertedAmount;
          } catch {
            convertedAmount = txnAmount;
          }
        }

        if (t.type === 'credit') {
          monthlyIncome += convertedAmount;
          // Track raw amount per currency
          incomeByCurrency[txnCurrency] =
            (incomeByCurrency[txnCurrency] || 0) + txnAmount;
        } else {
          monthlySpending += convertedAmount;
          spendingByCurrency[txnCurrency] =
            (spendingByCurrency[txnCurrency] || 0) + txnAmount;
        }
      }
    }

    // ====== RECENT TRANSACTIONS ======
    let recentTransactions: any[] = [];
    if (accountIds.length > 0) {
      const { data: recent } = await supabaseAdmin
        .from('ledger')
        .select(`
          id, amount, type, description, category, currency,
          running_balance, created_at, account_id,
          accounts (account_number, account_type, currency)
        `)
        .in('account_id', accountIds)
        .gt('amount', 0)
        .order('created_at', { ascending: false })
        .limit(5);

      recentTransactions = (recent || []).map((t: any) => {
        // Resolve the actual currency for this transaction
        const txnCurrency =
          t.currency ||
          t.accounts?.currency ||
          accountCurrencyMap[t.account_id] ||
          preferredCurrency;

        return {
          ...t,
          currency: txnCurrency,
          accounts: t.accounts
            ? {
                ...t.accounts,
                masked_number: maskAccountNumber(t.accounts.account_number),
              }
            : undefined,
        };
      });
    }

    // ====== BALANCE HISTORY (converted to preferred currency) ======
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    let balanceHistory: Array<{ date: string; balance: number }> = [];

    if (accountIds.length > 0) {
      const { data: historyTxns } = await supabaseAdmin
        .from('ledger')
        .select('running_balance, created_at, account_id')
        .in('account_id', accountIds)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Group by day
      const dailyMap = new Map<string, Map<string, number>>();
      (historyTxns || []).forEach((txn) => {
        const date = new Date(txn.created_at).toISOString().split('T')[0];
        if (!dailyMap.has(date)) dailyMap.set(date, new Map());
        dailyMap.get(date)!.set(txn.account_id, Number(txn.running_balance));
      });

      // Pre-fetch conversion rates to avoid repeated API calls
      const uniqueCurrencies = [
        ...new Set(Object.values(accountCurrencyMap)),
      ].filter((c) => c !== preferredCurrency);

      const conversionRates: Record<string, number> = {};
      for (const cur of uniqueCurrencies) {
        try {
          const { convertedAmount } = await CurrencyService.convert(
            1,
            cur,
            preferredCurrency
          );
          conversionRates[cur] = convertedAmount;
        } catch {
          conversionRates[cur] = 1;
        }
      }

      const accountBalances: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000)
          .toISOString()
          .split('T')[0];

        if (dailyMap.has(date)) {
          dailyMap.get(date)!.forEach((bal, accId) => {
            accountBalances[accId] = bal;
          });
        }

        // Sum all account balances, converting each to preferred currency
        let dayTotal = 0;
        for (const [accId, bal] of Object.entries(accountBalances)) {
          const accCurrency = accountCurrencyMap[accId] || preferredCurrency;
          if (accCurrency === preferredCurrency) {
            dayTotal += bal;
          } else {
            const rate = conversionRates[accCurrency] || 1;
            dayTotal += bal * rate;
          }
        }

        balanceHistory.push({
          date,
          balance: Math.round(dayTotal * 100) / 100,
        });
      }
    }

    // ====== UNREAD NOTIFICATIONS ======
    const { count: unreadNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'unread');

    // ====== PENDING FRAUD ALERTS ======
    const { count: pendingAlerts } = await supabaseAdmin
      .from('fraud_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending');

    // ====== BUILD RESPONSE ======
    const dashboardData = {
      stats: {
        totalBalance: Math.round(totalBalance * 100) / 100,
        monthlyIncome: Math.round(monthlyIncome * 100) / 100,
        monthlySpending: Math.round(monthlySpending * 100) / 100,
        netFlow:
          Math.round((monthlyIncome - monthlySpending) * 100) / 100,
        currency: preferredCurrency,
        savingsRate:
          monthlyIncome > 0
            ? Math.round(
                ((monthlyIncome - monthlySpending) / monthlyIncome) * 10000
              ) / 100
            : 0,
      },
      balanceByCurrency,
      incomeByCurrency,
      spendingByCurrency,
      accounts: (accounts || []).map((a) => ({
        ...a,
        masked_number: maskAccountNumber(a.account_number),
      })),
      recentTransactions,
      balanceHistory,
      unreadNotifications: unreadNotifications || 0,
      pendingAlerts: pendingAlerts || 0,
    };

    // Cache for 2 minutes
    await redisHelpers.setCache(cacheKey, dashboardData, 120);

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  }
);