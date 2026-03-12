import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { CronService } from './services/cron.service';

const startServer = async () => {
  try {
    // Test Redis connection
    const { redis } = await import('./config/redis');
    await redis.ping();
    logger.success('Redis (Upstash) connected successfully');

    // Test Supabase connection
    const { supabaseAdmin } = await import('./config/supabase');
    const { error } = await supabaseAdmin.from('users').select('count').limit(0);
    if (error && error.code !== 'PGRST116' && !error.message.includes('does not exist')) {
      logger.warn(`Supabase warning: ${error.message}`);
    } else {
      logger.success('Supabase connected successfully');
    }

    // Initialize Cron Jobs
    CronService.init();

    // Start server
    app.listen(env.PORT, () => {
      logger.success(`\nFinSync API Server running on port ${env.PORT}`);
      logger.info(`   Environment: ${env.NODE_ENV}`);
      logger.info(`   Client URL: ${env.CLIENT_URL}`);
      logger.info(`   Health Check: http://localhost:${env.PORT}/api/health`);
      logger.info(`   API Base: http://localhost:${env.PORT}/api`);
      logger.info('');
      logger.info('   API Routes:');
      logger.info('/api/auth          (Register, Login, OAuth, OTP, 2FA)');
      logger.info('/api/dashboard     (Dashboard aggregation)');
      logger.info('/api/accounts      (CRUD, balance history)');
      logger.info('/api/transfers     (Initiate, confirm, schedule)');
      logger.info('/api/transactions  (History, stats, export)');
      logger.info('/api/statements    (Monthly, PDF download)');
      logger.info('/api/fraud         (Alerts, admin review)');
      logger.info('/api/notifications (CRUD, stats)');
      logger.info('/api/currency      (Rates, convert)');
      logger.info('/api/budget        (Categories, overview, insights)');
      logger.info('/api/investments   (Portfolio, performance)');
      logger.info('/api/chatbot       (AI chat, sessions)');
      logger.info('/api/admin         (Dashboard, users, audit)');
      logger.info('');
      logger.success('All systems operational!\n');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});