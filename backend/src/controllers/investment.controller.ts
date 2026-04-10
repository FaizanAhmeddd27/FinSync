
import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import { logger } from '../utils/logger';


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
      risk_category,
      purchase_date,
    } = req.body;

    
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
        risk_category: risk_category || 'medium',
        purchase_date: purchase_date || new Date().toISOString(),
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


export const updateInvestment = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const { investmentId } = req.params;
    const updateData = req.body;

    
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

    
    const sorted = [...items].sort(
      (a, b) => Number(b.gain_loss_percentage) - Number(a.gain_loss_percentage)
    );

    const topGainers = sorted.filter((i) => Number(i.gain_loss) > 0).slice(0, 5);
    const topLosers = sorted
      .filter((i) => Number(i.gain_loss) < 0)
      .reverse()
      .slice(0, 5);

    
    const typeCount = new Set(items.map((i) => i.investment_type)).size;
    const totalTypes = 5; 
    const diversificationScore = Math.round((typeCount / totalTypes) * 100);

    const highRiskValue = items
      .filter((i) => i.risk_category === 'high')
      .reduce((s, i) => s + Number(i.total_value), 0);
    const mediumRiskValue = items
      .filter((i) => i.risk_category === 'medium')
      .reduce((s, i) => s + Number(i.total_value), 0);
    const lowRiskValue = items
      .filter((i) => i.risk_category === 'low')
      .reduce((s, i) => s + Number(i.total_value), 0);

    const totalValue = highRiskValue + mediumRiskValue + lowRiskValue;
    const totalInvested = items.reduce(
      (sum, inv) => sum + Number(inv.purchase_price) * Number(inv.quantity),
      0
    );
    const highRiskPercentage = totalValue > 0 ? (highRiskValue / totalValue) * 100 : 0;

    let riskLevel: string;
    if (highRiskPercentage > 40) {
      riskLevel = 'high';
    } else if (highRiskPercentage > 15 || (items.length > 3 && typeCount <= 2)) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    
    const suggestions: string[] = [];
    if (highRiskPercentage > 30) {
      suggestions.push(
        'Your high-risk allocation is substantial. Consider balancing with low-risk assets.'
      );
    }
    if (lowRiskValue === 0 && items.length > 2) {
      suggestions.push(
        'Consider adding low-risk assets like bonds for portfolio stability.'
      );
    }
    if (typeCount === 1) {
      suggestions.push(
        'Diversify your portfolio. You only have one type of investment.'
      );
    }
    if (diversificationScore >= 60) {
      suggestions.push(
        'Your portfolio is well-diversified. Keep up the good work!'
      );
    }

    
    
    const history = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.toLocaleString('default', { month: 'short' });
      
      const factor = 1 - (i * 0.05); 
      const marketFactor = factor * (1 + (Math.sin(i) * 0.02)); 
      history.push({
        date: month,
        value: Math.round(totalValue * marketFactor),
        invested: Math.round(totalInvested * factor),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        topGainers,
        topLosers,
        history,
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