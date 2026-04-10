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

    
    const cacheKey = `dashboard:${userId}`;
    const cached = await redisHelpers.getCache<any>(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('is_default', { ascending: false });

    const accountIds = (accounts || []).map((a) => a.id);

    
    const accountCurrencyMap: Record<string, string> = {};
    for (const acc of accounts || []) {
      accountCurrencyMap[acc.id] = acc.currency;
    }

    
    let totalBalance = 0;
    const balanceByCurrency: Record<string, number> = {};

    for (const acc of accounts || []) {
      
      balanceByCurrency[acc.currency] =
        (balanceByCurrency[acc.currency] || 0) + Number(acc.balance);

      
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
          
          totalBalance += Number(acc.balance);
        }
      }
    }

    
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

        
        const txnCurrency =
          t.currency || accountCurrencyMap[t.account_id] || preferredCurrency;

        
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
          
          incomeByCurrency[txnCurrency] =
            (incomeByCurrency[txnCurrency] || 0) + txnAmount;
        } else {
          monthlySpending += convertedAmount;
          spendingByCurrency[txnCurrency] =
            (spendingByCurrency[txnCurrency] || 0) + txnAmount;
        }
      }
    }

    
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

    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    let balanceHistory: Array<{ date: string; balance: number }> = [];

    if (accountIds.length > 0) {
      const { data: historyTxns } = await supabaseAdmin
        .from('ledger')
        .select('running_balance, created_at, account_id')
        .in('account_id', accountIds)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      
      const dailyMap = new Map<string, Map<string, number>>();
      (historyTxns || []).forEach((txn) => {
        const date = new Date(txn.created_at).toISOString().split('T')[0];
        if (!dailyMap.has(date)) dailyMap.set(date, new Map());
        dailyMap.get(date)!.set(txn.account_id, Number(txn.running_balance));
      });

      
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

    
    const { count: unreadNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'unread');

    
    const { count: pendingAlerts } = await supabaseAdmin
      .from('fraud_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending');

    
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

    
    await redisHelpers.setCache(cacheKey, dashboardData, 120);

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  }
);

export const getSpendingHeatmap = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const userId = req.user.id;

  
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  const startDateStr = oneYearAgo.toISOString().split('T')[0];

  const preferredCurrency = req.user.preferred_currency || 'USD';

  const { data: summaryData } = await supabaseAdmin
    .from('daily_spending_summary')
    .select('date, total_amount, transaction_count')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .order('date', { ascending: true });

  
  
  const thirtyOneDaysAgo = new Date();
  thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

  const { data: accounts } = await supabaseAdmin
    .from('accounts')
    .select('id, currency')
    .eq('user_id', userId)
    .eq('status', 'active');

  const accountIds = (accounts || []).map((a) => a.id);
  const accountCurrencyMap: Record<string, string> = {};
  (accounts || []).forEach(a => accountCurrencyMap[a.id] = a.currency);

  let liveRows: any[] = [];

  if (accountIds.length > 0) {
    const { data: liveTxns } = await supabaseAdmin
      .from('ledger')
      .select('amount, type, created_at, account_id, currency')
      .in('account_id', accountIds)
      .neq('type', 'credit') 
      .gt('amount', 0)
      .gte('created_at', thirtyOneDaysAgo.toISOString());

    
    const liveMap: Record<string, { total: number; count: number }> = {};
    
    for (const txn of liveTxns || []) {
      const date = new Date(txn.created_at).toISOString().split('T')[0];
      const txnAmount = Number(txn.amount);
      const txnCurrency = txn.currency || accountCurrencyMap[txn.account_id] || preferredCurrency;

      let convertedAmount = txnAmount;
      if (txnCurrency !== preferredCurrency) {
        try {
          const result = await CurrencyService.convert(txnAmount, txnCurrency, preferredCurrency);
          convertedAmount = result.convertedAmount;
        } catch {
          convertedAmount = txnAmount;
        }
      }

      if (!liveMap[date]) {
        liveMap[date] = { total: 0, count: 0 };
      }
      liveMap[date].total += convertedAmount;
      liveMap[date].count += 1;
    }

    liveRows = Object.entries(liveMap).map(([date, data]) => ({
      date,
      total_amount: data.total,
      transaction_count: data.count,
    }));
  }

  
  const finalMap = new Map<string, any>();

  
  (summaryData || []).forEach((r) => {
    finalMap.set(r.date.toString(), {
      date: r.date.toString(),
      total_amount: Number(r.total_amount),
      transaction_count: r.transaction_count,
    });
  });

  
  liveRows.forEach((r) => {
    finalMap.set(r.date, {
      date: r.date,
      total_amount: r.total_amount,
      transaction_count: r.transaction_count,
    });
  });

  const rows = Array.from(finalMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  
  if (rows.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        heatmap: [],
        insights: {
          busiestDay: null,
          weekendVsWeekdayPercent: 0,
          quietestMonth: null,
          weekendVsWeekday: { weekend: 0, weekday: 0 }
        },
      },
    });
  }

  
  let maxDay = rows[0];
  let weekdayTotal = 0;
  let weekdayCount = 0;
  let weekendTotal = 0;
  let weekendCount = 0;

  const monthlyTotals: Record<string, number> = {};

  for (const row of rows) {
    const amount = Number(row.total_amount);
    
    
    if (amount > Number(maxDay.total_amount)) {
      maxDay = row;
    }

    
    const d = new Date(row.date);
    const dayOfWeek = d.getDay(); 
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendTotal += amount;
      weekendCount++;
    } else {
      weekdayTotal += amount;
      weekdayCount++;
    }

    
    const month = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    monthlyTotals[month] = (monthlyTotals[month] || 0) + amount;
  }

  
  const avgWeekday = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
  const avgWeekend = weekendCount > 0 ? weekendTotal / weekendCount : 0;
  
  let weekendVsWeekdayPercent = 0;
  if (avgWeekday > 0) {
    weekendVsWeekdayPercent = ((avgWeekend - avgWeekday) / avgWeekday) * 100;
  } else if (avgWeekend > 0) {
    weekendVsWeekdayPercent = 100; 
  }

  
  let quietestMonth = null;
  let minMonthAmount = Infinity;
  for (const [month, total] of Object.entries(monthlyTotals)) {
    if (total < minMonthAmount) {
      minMonthAmount = total;
      quietestMonth = month;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      heatmap: rows.map(r => ({
        date: r.date,
        amount: Math.round(Number(r.total_amount) * 100) / 100,
        count: r.transaction_count
      })),
      insights: {
        busiestDay: maxDay ? {
          date: maxDay.date,
          amount: Math.round(Number(maxDay.total_amount) * 100) / 100
        } : null,
        weekendVsWeekdayPercent: Math.round(weekendVsWeekdayPercent),
        weekendVsWeekday: {
          weekend: Math.round(avgWeekend * 100) / 100,
          weekday: Math.round(avgWeekday * 100) / 100
        },
        quietestMonth
      }
    }
  });
});
