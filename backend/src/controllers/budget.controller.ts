// src/controllers/budget.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '../utils/errors';
import { logger } from '../utils/logger';

// ===================== GET ALL BUDGET CATEGORIES =====================
export const getBudgetCategories = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { data: categories, error } = await supabaseAdmin
      .from('budget_categories')
      .select('*')
      .eq('user_id', req.user.id)
      .order('category_name', { ascending: true });

    if (error) throw new BadRequestError('Failed to fetch budget categories');

    res.status(200).json({
      success: true,
      data: { categories: categories || [] },
    });
  }
);

// ===================== CREATE BUDGET CATEGORY =====================
export const createBudgetCategory = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { category_name, monthly_limit, currency, color, icon } = req.body;

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('budget_categories')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('category_name', category_name)
      .single();

    if (existing) {
      throw new ConflictError('A budget category with this name already exists');
    }

    // Limit to 20 categories per user
    const { count } = await supabaseAdmin
      .from('budget_categories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if ((count || 0) >= 20) {
      throw new BadRequestError('Maximum 20 budget categories allowed');
    }

    const { data: category, error } = await supabaseAdmin
      .from('budget_categories')
      .insert({
        user_id: req.user.id,
        category_name,
        monthly_limit: monthly_limit || 0,
        currency: currency || req.user.preferred_currency || 'USD',
        color: color || '#1e9df1',
        icon: icon || 'receipt',
      })
      .select()
      .single();

    if (error) {
      logger.error('Budget category creation error:', error);
      throw new BadRequestError('Failed to create budget category');
    }

    res.status(201).json({
      success: true,
      message: 'Budget category created',
      data: { category },
    });
  }
);

// ===================== UPDATE BUDGET CATEGORY =====================
export const updateBudgetCategory = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { categoryId } = req.params;
    const updateData = req.body;

    const { data: updated, error } = await supabaseAdmin
      .from('budget_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !updated) throw new NotFoundError('Budget category not found');

    res.status(200).json({
      success: true,
      message: 'Budget category updated',
      data: { category: updated },
    });
  }
);

// ===================== DELETE BUDGET CATEGORY =====================
export const deleteBudgetCategory = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { categoryId } = req.params;

    await supabaseAdmin
      .from('budget_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', req.user.id);

    res.status(200).json({
      success: true,
      message: 'Budget category deleted',
    });
  }
);

// ===================== GET BUDGET OVERVIEW (with spending data) =====================
export const getBudgetOverview = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const month =
      (req.query.month as string) ||
      new Date().toISOString().slice(0, 7); // YYYY-MM

    // Get budget categories
    const { data: categories } = await supabaseAdmin
      .from('budget_categories')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true);

    // Get user's accounts
    const { data: userAccounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', req.user.id);

    const accountIds = (userAccounts || []).map((a) => a.id);

    // Calculate date range
    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setMilliseconds(-1);

    // Get spending by category for this month
    let spending: any[] = [];
    if (accountIds.length > 0) {
      const { data: txns } = await supabaseAdmin
        .from('ledger')
        .select('amount, category')
        .in('account_id', accountIds)
        .eq('type', 'debit')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      spending = txns || [];
    }

    // Calculate spending per category
    const spendingMap: Record<string, number> = {};
    spending.forEach((txn) => {
      const cat = txn.category || 'Other';
      spendingMap[cat] = (spendingMap[cat] || 0) + Number(txn.amount);
    });

    // Merge budget limits with actual spending
    const budgetItems = (categories || []).map((cat) => {
      const spent = spendingMap[cat.category_name] || 0;
      const limit = Number(cat.monthly_limit);
      const remaining = limit - spent;
      const percentage = limit > 0 ? Math.round((spent / limit) * 10000) / 100 : 0;
      const isOverBudget = limit > 0 && spent > limit;

      return {
        id: cat.id,
        category: cat.category_name,
        color: cat.color,
        icon: cat.icon,
        currency: cat.currency,
        monthlyLimit: limit,
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        percentage,
        isOverBudget,
        status: isOverBudget
          ? 'over_budget'
          : percentage >= 80
          ? 'warning'
          : 'on_track',
      };
    });

    // Total summary
    const totalBudget = budgetItems.reduce((s, b) => s + b.monthlyLimit, 0);
    const totalSpent = budgetItems.reduce((s, b) => s + b.spent, 0);
    const overBudgetCount = budgetItems.filter((b) => b.isOverBudget).length;

    // Get income for the month
    let totalIncome = 0;
    if (accountIds.length > 0) {
      const { data: credits } = await supabaseAdmin
        .from('ledger')
        .select('amount')
        .in('account_id', accountIds)
        .eq('type', 'credit')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .gt('amount', 0);

      totalIncome = (credits || []).reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );
    }

    // Spending uncategorized
    const categorizedNames = (categories || []).map((c) => c.category_name);
    const uncategorizedSpending = Object.entries(spendingMap)
      .filter(([cat]) => !categorizedNames.includes(cat))
      .reduce((sum, [, amount]) => sum + amount, 0);

    res.status(200).json({
      success: true,
      data: {
        month,
        summary: {
          totalBudget,
          totalSpent: Math.round(totalSpent * 100) / 100,
          totalRemaining: Math.round((totalBudget - totalSpent) * 100) / 100,
          overallPercentage:
            totalBudget > 0
              ? Math.round((totalSpent / totalBudget) * 10000) / 100
              : 0,
          totalIncome: Math.round(totalIncome * 100) / 100,
          savingsRate:
            totalIncome > 0
              ? Math.round(((totalIncome - totalSpent) / totalIncome) * 10000) / 100
              : 0,
          overBudgetCategories: overBudgetCount,
          uncategorizedSpending: Math.round(uncategorizedSpending * 100) / 100,
        },
        categories: budgetItems,
      },
    });
  }
);

// ===================== GET BUDGET INSIGHTS (AI-powered) =====================
export const getBudgetInsights = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    // Get last 3 months of spending
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: userAccounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', req.user.id);

    const accountIds = (userAccounts || []).map((a) => a.id);

    if (accountIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { insights: ['Start making transactions to get personalized insights!'] },
      });
    }

    const { data: transactions } = await supabaseAdmin
      .from('ledger')
      .select('amount, type, category, created_at')
      .in('account_id', accountIds)
      .gte('created_at', threeMonthsAgo.toISOString())
      .gt('amount', 0);

    const txns = transactions || [];
    const insights: string[] = [];

    // Group by month
    const monthlySpending = new Map<string, number>();
    const monthlyIncome = new Map<string, number>();
    const categoryTotals: Record<string, number[]> = {};

    txns.forEach((t) => {
      const month = new Date(t.created_at).toISOString().slice(0, 7);
      const cat = t.category || 'Other';

      if (t.type === 'debit') {
        monthlySpending.set(month, (monthlySpending.get(month) || 0) + Number(t.amount));
        if (!categoryTotals[cat]) categoryTotals[cat] = [];
        categoryTotals[cat].push(Number(t.amount));
      } else {
        monthlyIncome.set(month, (monthlyIncome.get(month) || 0) + Number(t.amount));
      }
    });

    // Insight 1: Monthly trend
    const months = Array.from(monthlySpending.keys()).sort();
    if (months.length >= 2) {
      const lastMonth = monthlySpending.get(months[months.length - 1]) || 0;
      const prevMonth = monthlySpending.get(months[months.length - 2]) || 0;

      if (prevMonth > 0) {
        const changePercent = Math.round(((lastMonth - prevMonth) / prevMonth) * 100);
        if (changePercent > 10) {
          insights.push(
            `Your spending increased by ${changePercent}% compared to last month. Consider reviewing your expenses.`
          );
        } else if (changePercent < -10) {
          insights.push(
            `Great job! Your spending decreased by ${Math.abs(changePercent)}% compared to last month.`
          );
        } else {
          insights.push(
            `Your spending is relatively stable compared to last month (${changePercent > 0 ? '+' : ''}${changePercent}%).`
          );
        }
      }
    }

    // Insight 2: Top spending category
    const topCategories = Object.entries(categoryTotals)
      .map(([cat, amounts]) => ({
        category: cat,
        total: amounts.reduce((s, a) => s + a, 0),
        count: amounts.length,
      }))
      .sort((a, b) => b.total - a.total);

    if (topCategories.length > 0) {
      const top = topCategories[0];
      insights.push(
        `💡 Your biggest expense category is "${top.category}" with ${top.count} transactions.`
      );
    }

    // Insight 3: Savings rate
    const totalIncome = Array.from(monthlyIncome.values()).reduce((s, v) => s + v, 0);
    const totalSpending = Array.from(monthlySpending.values()).reduce((s, v) => s + v, 0);

    if (totalIncome > 0) {
      const savingsRate = Math.round(((totalIncome - totalSpending) / totalIncome) * 100);
      if (savingsRate < 10) {
        insights.push(
          `⚠️ Your savings rate is only ${savingsRate}%. Financial experts recommend saving at least 20% of income.`
        );
      } else if (savingsRate >= 30) {
        insights.push(
          `🌟 Excellent! Your savings rate is ${savingsRate}%. You're on a great financial path!`
        );
      } else {
        insights.push(
          `💰 Your savings rate is ${savingsRate}%. Consider increasing it to 20%+ for better financial health.`
        );
      }
    }

    // Insight 4: Recurring expenses prediction
    if (topCategories.length > 2) {
      const avgMonthly = totalSpending / Math.max(months.length, 1);
      insights.push(
        `Based on your history, your estimated monthly spending is ~$${Math.round(avgMonthly).toLocaleString()}.`
      );
    }

    // Insight 5: Suggestions
    if (topCategories.length > 0 && topCategories[0].total > totalSpending * 0.4) {
      insights.push(
        `"${topCategories[0].category}" makes up ${Math.round(
          (topCategories[0].total / totalSpending) * 100
        )}% of your spending. Try reducing it by 10% next month.`
      );
    }

    if (insights.length === 0) {
      insights.push('Keep tracking your expenses to get personalized insights!');
    }

    res.status(200).json({
      success: true,
      data: {
        insights,
        spendingTrend: months.map((m) => ({
          month: m,
          spending: monthlySpending.get(m) || 0,
          income: monthlyIncome.get(m) || 0,
        })),
        topCategories: topCategories.slice(0, 5),
      },
    });
  }
);