import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

const backfill = async () => {
  try {
    logger.info('Starting heatmap data backfill for the last 365 days...');

    for (let i = 0; i < 365; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        await supabaseAdmin.rpc('process_daily_spending', { p_process_date: dateStr });
    }

    logger.success('Backfill complete!');
  } catch (error) {
    logger.error('Backfill failed:', error);
  }
};

backfill();
