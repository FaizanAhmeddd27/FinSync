import { supabaseAdmin } from '../config/supabase';
import { EmailService } from './email.service';
import { FRAUD_THRESHOLDS } from '../utils/constants';
import { logger } from '../utils/logger';

interface FraudCheckResult {
  isSuspicious: boolean;
  alerts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  riskScore: number; 
}

export class FraudService {
  
  static async checkTransaction(
    userId: string,
    accountId: string,
    amount: number,
    currency: string
  ): Promise<FraudCheckResult> {
    const alerts: FraudCheckResult['alerts'] = [];
    let riskScore = 0;

    
    if (amount >= FRAUD_THRESHOLDS.LARGE_TRANSACTION_USD) {
      alerts.push({
        type: 'large_transaction',
        severity: 'high',
        description: `Large transaction of ${currency} ${amount.toFixed(2)} detected`,
      });
      riskScore += 30;
    }

    
    if (
      amount >= FRAUD_THRESHOLDS.ROUND_AMOUNT_THRESHOLD &&
      amount % 5000 === 0
    ) {
      alerts.push({
        type: 'round_amount',
        severity: 'medium',
        description: `Suspiciously round amount: ${currency} ${amount.toFixed(2)}`,
      });
      riskScore += 15;
    }

    
    const { data: recentTxns } = await supabaseAdmin
      .from('ledger')
      .select('id, amount')
      .eq('account_id', accountId)
      .eq('type', 'debit')
      .gte(
        'created_at',
        new Date(Date.now() - 60 * 60 * 1000).toISOString()
      );

    const hourlyCount = recentTxns?.length || 0;
    const hourlyAmount =
      recentTxns?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    if (hourlyCount >= FRAUD_THRESHOLDS.VELOCITY_MAX_TRANSACTIONS_PER_HOUR) {
      alerts.push({
        type: 'velocity',
        severity: 'high',
        description: `High transaction velocity: ${hourlyCount} transactions in last hour`,
      });
      riskScore += 25;
    }

    if (
      hourlyAmount + amount >=
      FRAUD_THRESHOLDS.VELOCITY_MAX_AMOUNT_PER_HOUR
    ) {
      alerts.push({
        type: 'velocity',
        severity: 'critical',
        description: `High transaction volume: ${currency} ${(hourlyAmount + amount).toFixed(2)} in last hour`,
      });
      riskScore += 35;
    }

    
    const { data: avgData } = await supabaseAdmin.rpc('get_spending_by_category', {
      p_user_id: userId,
    });

    if (avgData && avgData.length > 0) {
      const totalAvgSpending =
        avgData.reduce(
          (sum: number, cat: any) => sum + Number(cat.total_spent),
          0
        ) / Math.max(avgData.length, 1);

      if (amount > totalAvgSpending * 5 && totalAvgSpending > 0) {
        alerts.push({
          type: 'suspicious_pattern',
          severity: 'medium',
          description: `Transaction is ${Math.round(amount / totalAvgSpending)}x your average spending`,
        });
        riskScore += 20;
      }
    }

    
    riskScore = Math.min(riskScore, 100);

    return {
      isSuspicious: riskScore >= 30,
      alerts,
      riskScore,
    };
  }

  
  static async createAlerts(
    userId: string,
    accountId: string,
    ledgerId: string | null,
    alerts: FraudCheckResult['alerts']
  ): Promise<void> {
    for (const alert of alerts) {
      await supabaseAdmin.from('fraud_alerts').insert({
        ledger_id: ledgerId,
        account_id: accountId,
        user_id: userId,
        alert_type: alert.type,
        severity: alert.severity,
        description: alert.description,
      });
    }

    
    const highSeverityAlerts = alerts.filter(
      (a) => a.severity === 'high' || a.severity === 'critical'
    );

    if (highSeverityAlerts.length > 0) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (user) {
        await EmailService.sendFraudAlert(
          user.email,
          user.name,
          highSeverityAlerts[0].type,
          highSeverityAlerts.map((a) => a.description).join('; ')
        );
      }
    }

    logger.warn(
      `Fraud alerts created for user ${userId}: ${alerts.length} alerts`
    );
  }

  
  static calculateAIRiskScore(
    amount: number,
    hourlyTxnCount: number,
    hourlyTxnAmount: number,
    avgTxnAmount: number,
    accountAge: number 
  ): number {
    let score = 0;

    
    if (avgTxnAmount > 0) {
      const anomalyRatio = amount / avgTxnAmount;
      if (anomalyRatio > 10) score += 40;
      else if (anomalyRatio > 5) score += 25;
      else if (anomalyRatio > 3) score += 15;
    }

    
    if (hourlyTxnCount > 15) score += 30;
    else if (hourlyTxnCount > 10) score += 20;
    else if (hourlyTxnCount > 5) score += 10;

    
    if (accountAge < 7) score += 20;
    else if (accountAge < 30) score += 10;

    
    if (hourlyTxnAmount > 100000) score += 30;
    else if (hourlyTxnAmount > 50000) score += 20;

    return Math.min(score, 100);
  }
}