// ============== USER ==============
export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  phone: string | null;
  dob: string | null;
  role: 'user' | 'admin';
  kyc_status: 'pending' | 'verified' | 'rejected';
  kyc_document_url: string | null;
  avatar_url: string | null;
  provider: 'local' | 'google' | 'github';
  provider_id: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  preferred_currency: string;
  language: string;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  dob: string | null;
  role: 'user' | 'admin';
  kyc_status: string;
  avatar_url: string | null;
  provider: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  preferred_currency: string;
  language: string;
  two_factor_enabled: boolean;
  created_at: string;
}

// ============== ACCOUNT ==============
export interface Account {
  id: string;
  user_id: string;
  account_number: string;
  account_type: 'savings' | 'checking' | 'wallet' | 'fixed_deposit';
  balance: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============== LEDGER ==============
export interface LedgerEntry {
  id: string;
  account_id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  category: string | null;
  reference_id: string | null;
  running_balance: number;
  currency: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

// ============== TRANSFER ==============
export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  converted_amount: number;
  note: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  otp_verified: boolean;
  is_scheduled: boolean;
  scheduled_at: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  created_at: string;
}

// ============== FRAUD ==============
export interface FraudAlert {
  id: string;
  ledger_id: string | null;
  account_id: string;
  user_id: string;
  alert_type: 'large_transaction' | 'velocity' | 'round_amount' | 'unusual_location' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'pending' | 'reviewed' | 'cleared' | 'blocked';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ============== AUDIT ==============
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============== BUDGET ==============
export interface BudgetCategory {
  id: string;
  user_id: string;
  category_name: string;
  monthly_limit: number;
  currency: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

// ============== INVESTMENTS ==============
export interface Investment {
  id: string;
  user_id: string;
  investment_type: 'stocks' | 'bonds' | 'mutual_funds' | 'crypto' | 'fixed_deposit';
  name: string;
  symbol: string | null;
  quantity: number;
  purchase_price: number;
  current_price: number;
  currency: string;
  total_value: number;
  gain_loss: number;
  gain_loss_percentage: number;
  last_updated: string;
  created_at: string;
}

// ============== NOTIFICATIONS ==============
export interface Notification {
  id: string;
  user_id: string;
  type: 'transaction' | 'fraud' | 'system' | 'otp' | 'promotion' | 'budget_alert';
  title: string;
  message: string;
  status: 'unread' | 'read';
  metadata: Record<string, any> | null;
  created_at: string;
}

// ============== LOGIN ATTEMPTS ==============
export interface LoginAttempt {
  id: string;
  user_id: string | null;
  email: string;
  ip_address: string;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  attempted_at: string;
}

// ============== OTP ==============
export interface OTPRecord {
  id: string;
  user_id: string;
  otp_code: string;
  type: 'email_verification' | 'phone_verification' | 'login_2fa' | 'transfer';
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

// ============== API RESPONSES ==============
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============== AUTH ==============
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dob?: string;
  preferred_currency?: string;
  language?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ============== CHATBOT ==============
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}