import crypto from 'crypto';


export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};


export const generateAccountNumber = (): string => {
  const prefix = 'FS';
  const number = crypto.randomInt(10000000, 99999999).toString();
  return `${prefix}${number}`;
};


export const generateReferenceId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TXN-${timestamp}-${random}`;
};


export const maskAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length <= 6) return accountNumber;
  const prefix = accountNumber.slice(0, 2);
  const suffix = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 6);
  return `${prefix}${masked}${suffix}`;
};


export const sanitizeUser = (user: any): any => {
  const { password_hash, provider_id, ...sanitized } = user;
  return sanitized;
};


export const parsePagination = (query: any): { page: number; limit: number; offset: number } => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};


export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};


export const minutesAgo = (date: Date | string): number => {
  const now = new Date();
  const then = new Date(date);
  return Math.floor((now.getTime() - then.getTime()) / 60000);
};


export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};