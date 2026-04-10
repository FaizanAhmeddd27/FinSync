import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase';
import { CurrencyService } from './currency.service';
import { logger } from '../utils/logger';

export class CronService {
  static init(): void {
    logger.info('Initializing cron jobs...');

    
    cron.schedule('*/5 * * * *', async () => {
      try {
        const now = new Date().toISOString();

        const { data: scheduledTransfers } = await supabaseAdmin
          .from('transfers')
          .select('*')
          .eq('status', 'pending')
          .eq('is_scheduled', true)
          .lte('scheduled_at', now);

        if (!scheduledTransfers || scheduledTransfers.length === 0) return;

        logger.info(`Processing ${scheduledTransfers.length} scheduled transfers...`);

        for (const transfer of scheduledTransfers) {
          try {
            
            let exchangeRate = Number(transfer.exchange_rate);
            let convertedAmount = Number(transfer.converted_amount);

            if (transfer.from_currency !== transfer.to_currency) {
              const conversion = await CurrencyService.convert(
                Number(transfer.amount),
                transfer.from_currency,
                transfer.to_currency
              );
              exchangeRate = conversion.exchangeRate;
              convertedAmount = conversion.convertedAmount;
            }

            
            const { error } = await supabaseAdmin.rpc('execute_transfer', {
              p_from_account_id: transfer.from_account_id,
              p_to_account_id: transfer.to_account_id,
              p_amount: transfer.amount,
              p_from_currency: transfer.from_currency,
              p_to_currency: transfer.to_currency,
              p_exchange_rate: exchangeRate,
              p_converted_amount: convertedAmount,
              p_note: transfer.note || 'Scheduled transfer',
              p_reference_id: `SCH-${Date.now().toString(36).toUpperCase()}`,
            });

            if (error) {
              logger.error(`Scheduled transfer ${transfer.id} failed:`, error);
              await supabaseAdmin
                .from('transfers')
                .update({ status: 'failed' })
                .eq('id', transfer.id);
              continue;
            }

            
            await supabaseAdmin
              .from('transfers')
              .update({
                status: 'completed',
                otp_verified: true,
                exchange_rate: exchangeRate,
                converted_amount: convertedAmount,
              })
              .eq('id', transfer.id);

            
            if (transfer.is_recurring && transfer.recurrence_pattern) {
              const nextDate = this.calculateNextDate(
                new Date(transfer.scheduled_at),
                transfer.recurrence_pattern
              );

              await supabaseAdmin.from('transfers').insert({
                from_account_id: transfer.from_account_id,
                to_account_id: transfer.to_account_id,
                amount: transfer.amount,
                from_currency: transfer.from_currency,
                to_currency: transfer.to_currency,
                exchange_rate: exchangeRate,
                converted_amount: convertedAmount,
                note: transfer.note,
                status: 'pending',
                otp_verified: true,
                is_scheduled: true,
                scheduled_at: nextDate.toISOString(),
                is_recurring: true,
                recurrence_pattern: transfer.recurrence_pattern,
              });

              logger.info(
                `Recurring transfer created for ${nextDate.toISOString()}`
              );
            }

            logger.success(`Scheduled transfer ${transfer.id} completed`);
          } catch (err) {
            logger.error(`Error processing transfer ${transfer.id}:`, err);
          }
        }
      } catch (error) {
        logger.error('Scheduled transfers cron error:', error);
      }
    });

    
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Refreshing currency rates...');
        await CurrencyService.fetchLiveRates();
        logger.success('Currency rates refreshed');
      } catch (error) {
        logger.error('Currency refresh cron error:', error);
      }
    });

    
    cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Refreshing materialized views...');
        const { error: rpcError } = await supabaseAdmin.rpc('refresh_monthly_statements_view');
        if (rpcError) {
          logger.debug('RPC not available, skipping materialized view refresh');
        }
        logger.success('Materialized views refreshed');
      } catch (error) {
        logger.error('Materialized view refresh error:', error);
      }
    });

    
    cron.schedule('0 0 * * *', async () => {
      try {
        logger.info('Cleaning up expired OTPs...');
        const { error } = await supabaseAdmin
          .from('otp_records')
          .delete()
          .lt('expires_at', new Date().toISOString());

        if (!error) {
          logger.success('Expired OTPs cleaned up');
        }
      } catch (error) {
        logger.error('OTP cleanup cron error:', error);
      }
    });

    
    cron.schedule('0 0 * * 0', async () => {
      try {
        logger.info('Cleaning up old read notifications...');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

        await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('status', 'read')
          .lt('created_at', thirtyDaysAgo);

        logger.success('Old notifications cleaned up');
      } catch (error) {
        logger.error('Notification cleanup cron error:', error);
      }
    });

    
    cron.schedule('0 8 * * *', async () => {
      try {
        logger.info('Checking budget alerts...');

        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('is_active', true);

        for (const user of users || []) {
          const { data: budgets } = await supabaseAdmin
            .from('budget_categories')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .gt('monthly_limit', 0);

          if (!budgets || budgets.length === 0) continue;

          const { data: accounts } = await supabaseAdmin
            .from('accounts')
            .select('id')
            .eq('user_id', user.id);

          const accountIds = (accounts || []).map((a) => a.id);
          if (accountIds.length === 0) continue;

          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const { data: spending } = await supabaseAdmin
            .from('ledger')
            .select('amount, category')
            .in('account_id', accountIds)
            .eq('type', 'debit')
            .gte('created_at', startOfMonth.toISOString());

          const categorySpending: Record<string, number> = {};
          (spending || []).forEach((s) => {
            const cat = s.category || 'Other';
            categorySpending[cat] = (categorySpending[cat] || 0) + Number(s.amount);
          });

          for (const budget of budgets) {
            const spent = categorySpending[budget.category_name] || 0;
            const limit = Number(budget.monthly_limit);
            const percentage = (spent / limit) * 100;

            if (percentage >= 90 && percentage < 100) {
              await supabaseAdmin.from('notifications').insert({
                user_id: user.id,
                type: 'budget_alert',
                title: `⚠️ Budget Warning: ${budget.category_name}`,
                message: `You've used ${Math.round(percentage)}% of your ${budget.category_name} budget (${budget.currency} ${spent.toFixed(2)} / ${limit.toFixed(2)})`,
                metadata: { category: budget.category_name, spent, limit, percentage },
              });
            } else if (percentage >= 100) {
              await supabaseAdmin.from('notifications').insert({
                user_id: user.id,
                type: 'budget_alert',
                title: `🚨 Over Budget: ${budget.category_name}`,
                message: `You've exceeded your ${budget.category_name} budget by ${budget.currency} ${(spent - limit).toFixed(2)}`,
                metadata: { category: budget.category_name, spent, limit, percentage },
              });
            }
          }
        }

        logger.success('Budget alerts checked');
      } catch (error) {
        logger.error('Budget alerts cron error:', error);
      }
    });

    
    cron.schedule('0 1 * * *', async () => {
      try {
        logger.info('Processing daily spending summary...');
        
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        
        const { error } = await supabaseAdmin.rpc('process_daily_spending', {
          p_process_date: dateStr,
        });

        if (error) {
          logger.error('Daily spending summary failed:', error);
        } else {
          logger.success(`Daily spending summary processed for ${dateStr}`);
        }
      } catch (error) {
        logger.error('Daily spending summary cron error:', error);
      }
    });

    logger.success('All cron jobs initialized');
  }

  
  private static calculateNextDate(
    currentDate: Date,
    pattern: string
  ): Date {
    const next = new Date(currentDate);

    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }

    return next;
  }
}