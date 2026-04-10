export const ACCOUNT_TYPES = ['savings', 'checking', 'wallet', 'fixed_deposit'] as const;

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'PKR', 'AED', 'CAD', 'AUD'] as const;

export const TRANSACTION_TYPES = ['credit', 'debit'] as const;

export const FRAUD_ALERT_TYPES = [
  'large_transaction',
  'velocity',
  'round_amount',
  'unusual_location',
  'suspicious_pattern',
] as const;

export const FRAUD_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;

export const BUDGET_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Travel',
  'Groceries',
  'Salary',
  'Investment',
  'Transfer',
  'Other',
] as const;

export const INVESTMENT_TYPES = ['stocks', 'bonds', 'mutual_funds', 'crypto', 'fixed_deposit'] as const;

export const NOTIFICATION_TYPES = ['transaction', 'fraud', 'system', 'otp', 'promotion', 'budget_alert'] as const;

export const FRAUD_THRESHOLDS = {
  LARGE_TRANSACTION_USD: 10000,
  VELOCITY_MAX_TRANSACTIONS_PER_HOUR: 10,
  VELOCITY_MAX_AMOUNT_PER_HOUR: 50000,
  ROUND_AMOUNT_THRESHOLD: 5000,
} as const;

export const COOKIE_OPTIONS = {
  httpOnly: false, 
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, 
  path: '/',
};

export const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  path: '/api/auth/refresh',
};