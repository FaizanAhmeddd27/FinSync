// src/controllers/investment.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import { logger } from '../utils/logger';

// ===================== GET ALL INVESTMENTS =====================
export const getInvestments = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { data: investments, error } = await supabaseAdmin
      .from('investments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestError('Failed to fetch investments');

    const items = investments || [];

    // Calculate portfolio summary
    const totalValue = items.reduce((sum, inv) => sum + Number(inv.total_value), 0);
    const totalInvested = items.reduce(
      (sum, inv) => sum + Number(inv.purchase_price) * Number(inv.quantity),
      0
    );
    const totalGainLoss = items.reduce((sum, inv) => sum + Number(inv.gain_loss), 0);
    const overallPercentage =
      totalInvested > 0
        ? Math.round(((totalValue - totalInvested) / totalInvested) * 10000) / 100
        : 0;

    // Group by type
    const byType: Record<string, { count: number; value: number }> = {};
    items.forEach((inv) => {
      if (!byType[inv.investment_type]) {
        byType[inv.investment_type] = { count: 0, value: 0 };
      }
      byType[inv.investment_type].count += 1;
      byType[inv.investment_type].value += Number(inv.total_value);
    });

    res.status(200).json({
      success: true,
      data: {
        investments: items,
        portfolio: {
          totalValue: Math.round(totalValue * 100) / 100,
          totalInvested: Math.round(totalInvested * 100) / 100,
          totalGainLoss: Math.round(totalGainLoss * 100) / 100,
          overallPercentage,
          holdingsCount: items.length,
          byType: Object.entries(byType).map(([type, data]) => ({
            type,
            count: data.count,
            value: Math.round(data.value * 100) / 100,
            percentage:
              totalValue > 0
                ? Math.round((data.value / totalValue) * 10000) / 100
                : 0,
          })),
        },
      },
    });
  }
);

// ===================== GET SINGLE INVESTMENT =====================
export const getInvestmentById = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { investmentId } = req.params;

    const { data: investment } = await supabaseAdmin
      .from('investments')
      .select('*')
      .eq('id', investmentId)
      .eq('user_id', req.user.id)
      .single();

    if (!investment) throw new NotFoundError('Investment not found');

    res.status(200).json({
      success: true,
      data: { investment },
    });
  }
);

// ===================== ADD INVESTMENT =====================
export const addInvestment = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const {
      investment_type,
      name,
      symbol,
      quantity,
      purchase_price,
      current_price,
      currency,
    } = req.body;

    // Limit to 50 investments
    const { count } = await supabaseAdmin
      .from('investments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if ((count || 0) >= 50) {
      throw new BadRequestError('Maximum 50 investments allowed');
    }

    const { data: investment, error } = await supabaseAdmin
      .from('investments')
      .insert({
        user_id: req.user.id,
        investment_type,
        name,
        symbol: symbol || null,
        quantity,
        purchase_price,
        current_price: current_price || purchase_price,
        currency: currency || req.user.preferred_currency || 'USD',
      })
      .select()
      .single();

    if (error) {
      logger.error('Investment creation error:', error);
      throw new BadRequestError('Failed to add investment');
    }

    res.status(201).json({
      success: true,
      message: 'Investment added successfully',
      data: { investment },
    });
  }
);

// ===================== UPDATE INVESTMENT =====================
export const updateInvestment = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { investmentId } = req.params;
    const updateData = req.body;

    // Add last_updated
    updateData.last_updated = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('investments')
      .update(updateData)
      .eq('id', investmentId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !updated) throw new NotFoundError('Investment not found');

    res.status(200).json({
      success: true,
      message: 'Investment updated',
      data: { investment: updated },
    });
  }
);

// ===================== DELETE INVESTMENT =====================
export const deleteInvestment = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { investmentId } = req.params;

    const { error } = await supabaseAdmin
      .from('investments')
      .delete()
      .eq('id', investmentId)
      .eq('user_id', req.user.id);

    if (error) throw new NotFoundError('Investment not found');

    res.status(200).json({
      success: true,
      message: 'Investment removed',
    });
  }
);

// ===================== GET PORTFOLIO PERFORMANCE =====================
export const getPortfolioPerformance = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { data: investments } = await supabaseAdmin
      .from('investments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    const items = investments || [];

    if (items.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          performance: [],
          topGainers: [],
          topLosers: [],
          riskAnalysis: {
            diversificationScore: 0,
            riskLevel: 'none',
            suggestions: ['Start investing to see portfolio analysis!'],
          },
        },
      });
    }

    // Sort by gain/loss percentage
    const sorted = [...items].sort(
      (a, b) => Number(b.gain_loss_percentage) - Number(a.gain_loss_percentage)
    );

    const topGainers = sorted.filter((i) => Number(i.gain_loss) > 0).slice(0, 5);
    const topLosers = sorted
      .filter((i) => Number(i.gain_loss) < 0)
      .reverse()
      .slice(0, 5);

    // Risk Analysis
    const typeCount = new Set(items.map((i) => i.investment_type)).size;
    const totalTypes = 5; // stocks, bonds, mutual_funds, crypto, fixed_deposit
    const diversificationScore = Math.round((typeCount / totalTypes) * 100);

    let riskLevel: string;
    const cryptoRatio = items
      .filter((i) => i.investment_type === 'crypto')
      .reduce((s, i) => s + Number(i.total_value), 0);
    const totalValue = items.reduce((s, i) => s + Number(i.total_value), 0);
    const cryptoPercentage = totalValue > 0 ? (cryptoRatio / totalValue) * 100 : 0;

    if (cryptoPercentage > 50) {
      riskLevel = 'high';
    } else if (cryptoPercentage > 20 || typeCount <= 2) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Suggestions
    const suggestions: string[] = [];
    if (typeCount === 1) {
      suggestions.push(
        'Diversify your portfolio. You only have one type of investment.'
      );
    }
    if (cryptoPercentage > 30) {
      suggestions.push(
        'Your crypto allocation is high. Consider balancing with bonds or mutual funds.'
      );
    }
    if (!items.some((i) => i.investment_type === 'bonds')) {
      suggestions.push(
        'Consider adding bonds for a more stable, low-risk component.'
      );
    }
    if (!items.some((i) => i.investment_type === 'fixed_deposit')) {
      suggestions.push(
        'A fixed deposit can provide guaranteed returns.'
      );
    }
    if (diversificationScore >= 60) {
      suggestions.push(
        'Your portfolio is well-diversified. Keep up the good work!'
      );
    }

    res.status(200).json({
      success: true,
      data: {
        topGainers,
        topLosers,
        riskAnalysis: {
          diversificationScore,
          riskLevel,
          typeBreakdown: Object.entries(
            items.reduce((acc: Record<string, number>, inv) => {
              acc[inv.investment_type] =
                (acc[inv.investment_type] || 0) + Number(inv.total_value);
              return acc;
            }, {})
          ).map(([type, value]) => ({
            type,
            value,
            percentage: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
          })),
          suggestions,
        },
      },
    });
  }
);