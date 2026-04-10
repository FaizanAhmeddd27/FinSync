-- =============================================
-- FinSync Digital Banking — Complete Database Schema
-- =============================================

-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- ENUM TYPES
-- ============================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE kyc_status_type AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE auth_provider AS ENUM ('local', 'google', 'github');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('savings', 'checking', 'wallet', 'fixed_deposit');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'frozen', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transfer_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fraud_alert_type AS ENUM ('large_transaction', 'velocity', 'round_amount', 'unusual_location', 'suspicious_pattern');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fraud_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fraud_alert_status AS ENUM ('pending', 'reviewed', 'cleared', 'blocked');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('transaction', 'fraud', 'system', 'otp', 'promotion', 'budget_alert');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('unread', 'read');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE otp_type AS ENUM ('email_verification', 'phone_verification', 'login_2fa', 'transfer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE investment_type AS ENUM ('stocks', 'bonds', 'mutual_funds', 'crypto', 'fixed_deposit');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Update execute_transfer to accept p_category
CREATE OR REPLACE FUNCTION execute_transfer(
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount DECIMAL(18, 2),
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_exchange_rate DECIMAL(12, 6),
    p_converted_amount DECIMAL(18, 2),
    p_note TEXT DEFAULT NULL,
    p_reference_id VARCHAR(50) DEFAULT NULL,
    p_category VARCHAR(100) DEFAULT 'Transfer' -- Added parameter
)
RETURNS UUID AS $$
DECLARE
    v_transfer_id UUID;
    v_from_balance DECIMAL(18, 2);
    v_to_balance DECIMAL(18, 2);
    v_from_new_balance DECIMAL(18, 2);
    v_to_new_balance DECIMAL(18, 2);
BEGIN
    SELECT balance INTO v_from_balance FROM accounts WHERE id = p_from_account_id FOR UPDATE;
    SELECT balance INTO v_to_balance FROM accounts WHERE id = p_to_account_id FOR UPDATE;

    IF v_from_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    v_from_new_balance := v_from_balance - p_amount;
    v_to_new_balance   := v_to_balance + p_converted_amount;

    UPDATE accounts SET balance = v_from_new_balance WHERE id = p_from_account_id;
    UPDATE accounts SET balance = v_to_new_balance   WHERE id = p_to_account_id;

    INSERT INTO transfers (from_account_id, to_account_id, amount, from_currency, to_currency, exchange_rate, converted_amount, note, status, otp_verified)
    VALUES (p_from_account_id, p_to_account_id, p_amount, p_from_currency, p_to_currency, p_exchange_rate, p_converted_amount, p_note, 'completed', true)
    RETURNING id INTO v_transfer_id;

    -- Use p_category here
    INSERT INTO ledger (account_id, amount, type, description, reference_id, running_balance, currency, category)
    VALUES (p_from_account_id, p_amount, 'debit', COALESCE(p_note, 'Transfer sent'), p_reference_id, v_from_new_balance, p_from_currency, p_category);

    INSERT INTO ledger (account_id, amount, type, description, reference_id, running_balance, currency, category)
    VALUES (p_to_account_id, p_converted_amount, 'credit', COALESCE(p_note, 'Transfer received'), p_reference_id, v_to_new_balance, p_to_currency, p_category);

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;


-- Add new columns for enhanced tracking
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS risk_category VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Optional: Create a table for historical snapshots (used for trend charts)
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    total_value DECIMAL(18, 2),
    total_invested DECIMAL(18, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update open_new_account to use 'Setup' or similar instead of 'Other'
CREATE OR REPLACE FUNCTION open_new_account(
    p_user_id UUID,
    p_account_type account_type,
    p_initial_deposit DECIMAL(18, 2) DEFAULT 0,
    p_currency VARCHAR(3) DEFAULT 'USD'
)
RETURNS UUID AS $$
DECLARE
    v_account_id UUID;
    v_account_number VARCHAR(20);
BEGIN
    v_account_number := 'FS' || LPAD(FLOOR(RANDOM() * 99999999)::TEXT, 8, '0');

    INSERT INTO accounts (user_id, account_number, account_type, balance, currency)
    VALUES (p_user_id, v_account_number, p_account_type, p_initial_deposit, p_currency)
    RETURNING id INTO v_account_id;

    IF p_initial_deposit > 0 THEN
        INSERT INTO ledger (account_id, amount, type, description, running_balance, currency, category)
        VALUES (v_account_id, p_initial_deposit, 'credit', 'Initial deposit', p_initial_deposit, p_currency, 'Income'); -- Changed to Income
    ELSE
        INSERT INTO ledger (account_id, amount, type, description, running_balance, currency, category)
        VALUES (v_account_id, 0, 'credit', 'Account opened', 0, p_currency, 'Other');
    END IF;

    RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    dob DATE,
    role user_role DEFAULT 'user',
    kyc_status kyc_status_type DEFAULT 'pending',
    kyc_document_url TEXT,
    avatar_url TEXT,
    qr_code_url TEXT,
    provider auth_provider DEFAULT 'local',
    provider_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    is_phone_verified BOOLEAN DEFAULT false,
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(10) DEFAULT 'en',
    two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- ============================================
-- TABLE: daily_spending_summary (Heatmap Data)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_spending_summary (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_amount DECIMAL(18, 2) DEFAULT 0.00,
    transaction_count INT DEFAULT 0,
    PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_spending_user_id ON daily_spending_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_spending_date ON daily_spending_summary(date);

-- Procedure to backfill or process daily spending summary
CREATE OR REPLACE FUNCTION process_daily_spending(p_process_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_spending_summary (user_id, date, total_amount, transaction_count)
    SELECT 
        a.user_id,
        p_process_date AS date,
        SUM(l.amount) AS total_amount,
        COUNT(*) AS transaction_count
    FROM ledger l
    JOIN accounts a ON l.account_id = a.id
    WHERE l.type = 'debit' 
      AND l.created_at >= p_process_date::TIMESTAMP
      AND l.created_at < (p_process_date + INTERVAL '1 day')::TIMESTAMP
    GROUP BY a.user_id
    ON CONFLICT (user_id, date) 
    DO UPDATE SET 
        total_amount = EXCLUDED.total_amount,
        transaction_count = EXCLUDED.transaction_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- TABLE: accounts
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type account_type NOT NULL DEFAULT 'savings',
    balance DECIMAL(18, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    status account_status DEFAULT 'active',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT positive_balance CHECK (balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);


-- ============================================
-- TABLE: ledger (immutable transaction log)
-- ============================================
CREATE TABLE IF NOT EXISTS ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(18, 2) NOT NULL,
    type transaction_type NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100),
    reference_id VARCHAR(50),
    running_balance DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_account_id ON ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_reference_id ON ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger(type);
CREATE INDEX IF NOT EXISTS idx_ledger_category ON ledger(category);
CREATE INDEX IF NOT EXISTS idx_ledger_description ON ledger USING gin(to_tsvector('english', description));


-- ============================================
-- TABLE: transfers
-- ============================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    to_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(18, 2) NOT NULL,
    from_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    to_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate DECIMAL(12, 6) DEFAULT 1.000000,
    converted_amount DECIMAL(18, 2) NOT NULL,
    note TEXT,
    status transfer_status DEFAULT 'pending',
    otp_verified BOOLEAN DEFAULT false,
    is_scheduled BOOLEAN DEFAULT false,
    scheduled_at TIMESTAMPTZ,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT different_accounts CHECK (from_account_id != to_account_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_from_account ON transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_account ON transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);


-- ============================================
-- TABLE: fraud_alerts
-- ============================================
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID REFERENCES ledger(id) ON DELETE SET NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type fraud_alert_type NOT NULL,
    severity fraud_severity DEFAULT 'medium',
    description TEXT NOT NULL,
    status fraud_alert_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_account_id ON fraud_alerts(account_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON fraud_alerts(severity);


-- ============================================
-- TABLE: audit_log (append-only)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);


-- ============================================
-- TABLE: login_attempts
-- ============================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    failure_reason VARCHAR(255),
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC);


-- ============================================
-- TABLE: otp_records
-- ============================================
CREATE TABLE IF NOT EXISTS otp_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    type otp_type NOT NULL,
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_records(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_type ON otp_records(type);


-- ============================================
-- TABLE: budget_categories
-- ============================================
CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    monthly_limit DECIMAL(18, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    color VARCHAR(7) DEFAULT '#1e9df1',
    icon VARCHAR(50) DEFAULT 'receipt',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, category_name)
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id ON budget_categories(user_id);


-- ============================================
-- TABLE: investments
-- ============================================
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    investment_type investment_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(20),
    quantity DECIMAL(18, 8) DEFAULT 0,
    purchase_price DECIMAL(18, 2) DEFAULT 0,
    current_price DECIMAL(18, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    total_value DECIMAL(18, 2) GENERATED ALWAYS AS (quantity * current_price) STORED,
    gain_loss DECIMAL(18, 2) GENERATED ALWAYS AS ((current_price - purchase_price) * quantity) STORED,
    gain_loss_percentage DECIMAL(8, 2) GENERATED ALWAYS AS (
        CASE WHEN purchase_price > 0
        THEN ((current_price - purchase_price) / purchase_price * 100)
        ELSE 0 END
    ) STORED,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(investment_type);


-- ============================================
-- TABLE: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status notification_status DEFAULT 'unread',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);


-- ============================================
-- TABLE: chat_sessions (for AI chatbot)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);


-- ============================================
-- TABLE: currency_rates (cached rates)
-- ============================================
CREATE TABLE IF NOT EXISTS currency_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    rates JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- FUNCTIONS & STORED PROCEDURES
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON accounts;
CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- STORED PROCEDURE: Create User Account with defaults
-- ============================================
CREATE OR REPLACE FUNCTION create_user_default_accounts(
    p_user_id UUID,
    p_currency VARCHAR(3) DEFAULT 'USD'
)
RETURNS VOID AS $$
DECLARE
    v_savings_number VARCHAR(20);
    v_wallet_number VARCHAR(20);
BEGIN
    v_savings_number := 'FS' || LPAD(FLOOR(RANDOM() * 99999999)::TEXT, 8, '0');
    v_wallet_number  := 'FS' || LPAD(FLOOR(RANDOM() * 99999999)::TEXT, 8, '0');

    INSERT INTO accounts (user_id, account_number, account_type, balance, currency, is_default)
    VALUES (p_user_id, v_savings_number, 'savings', 0.00, p_currency, true);

    INSERT INTO accounts (user_id, account_number, account_type, balance, currency, is_default)
    VALUES (p_user_id, v_wallet_number, 'wallet', 0.00, p_currency, false);

    INSERT INTO ledger (account_id, amount, type, description, running_balance, currency)
    SELECT id, 0, 'credit', 'Account opened', 0, p_currency
    FROM accounts WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- STORED PROCEDURE: Execute Transfer (ACID)
-- ============================================
CREATE OR REPLACE FUNCTION execute_transfer(
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount DECIMAL(18, 2),
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_exchange_rate DECIMAL(12, 6),
    p_converted_amount DECIMAL(18, 2),
    p_note TEXT DEFAULT NULL,
    p_reference_id VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transfer_id UUID;
    v_from_balance DECIMAL(18, 2);
    v_to_balance DECIMAL(18, 2);
    v_from_new_balance DECIMAL(18, 2);
    v_to_new_balance DECIMAL(18, 2);
BEGIN
    SELECT balance INTO v_from_balance
    FROM accounts WHERE id = p_from_account_id FOR UPDATE;

    SELECT balance INTO v_to_balance
    FROM accounts WHERE id = p_to_account_id FOR UPDATE;

    IF v_from_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_from_balance, p_amount;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_from_account_id AND status = 'active') THEN
        RAISE EXCEPTION 'Source account is not active';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND status = 'active') THEN
        RAISE EXCEPTION 'Destination account is not active';
    END IF;

    v_from_new_balance := v_from_balance - p_amount;
    v_to_new_balance   := v_to_balance + p_converted_amount;

    UPDATE accounts SET balance = v_from_new_balance WHERE id = p_from_account_id;
    UPDATE accounts SET balance = v_to_new_balance   WHERE id = p_to_account_id;

    INSERT INTO transfers (
        from_account_id, to_account_id, amount, from_currency, to_currency,
        exchange_rate, converted_amount, note, status, otp_verified
    )
    VALUES (
        p_from_account_id, p_to_account_id, p_amount, p_from_currency, p_to_currency,
        p_exchange_rate, p_converted_amount, p_note, 'completed', true
    )
    RETURNING id INTO v_transfer_id;

    INSERT INTO ledger (account_id, amount, type, description, reference_id, running_balance, currency, category)
    VALUES (p_from_account_id, p_amount, 'debit', COALESCE(p_note, 'Transfer sent'), p_reference_id, v_from_new_balance, p_from_currency, 'Transfer');

    INSERT INTO ledger (account_id, amount, type, description, reference_id, running_balance, currency, category)
    VALUES (p_to_account_id, p_converted_amount, 'credit', COALESCE(p_note, 'Transfer received'), p_reference_id, v_to_new_balance, p_to_currency, 'Transfer');

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- STORED PROCEDURE: Open New Account
-- ============================================
CREATE OR REPLACE FUNCTION open_new_account(
    p_user_id UUID,
    p_account_type account_type,
    p_initial_deposit DECIMAL(18, 2) DEFAULT 0,
    p_currency VARCHAR(3) DEFAULT 'USD'
)
RETURNS UUID AS $$
DECLARE
    v_account_id UUID;
    v_account_number VARCHAR(20);
BEGIN
    v_account_number := 'FS' || LPAD(FLOOR(RANDOM() * 99999999)::TEXT, 8, '0');

    INSERT INTO accounts (user_id, account_number, account_type, balance, currency)
    VALUES (p_user_id, v_account_number, p_account_type, p_initial_deposit, p_currency)
    RETURNING id INTO v_account_id;

    IF p_initial_deposit > 0 THEN
        INSERT INTO ledger (account_id, amount, type, description, running_balance, currency, category)
        VALUES (v_account_id, p_initial_deposit, 'credit', 'Initial deposit', p_initial_deposit, p_currency, 'Other');
    ELSE
        INSERT INTO ledger (account_id, amount, type, description, running_balance, currency, category)
        VALUES (v_account_id, 0, 'credit', 'Account opened', 0, p_currency, 'Other');
    END IF;

    RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- TRIGGER: Fraud Detection on Ledger Insert
-- ============================================
CREATE OR REPLACE FUNCTION detect_fraud_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_hourly_count INT;
    v_hourly_amount DECIMAL(18, 2);
BEGIN
    SELECT user_id INTO v_user_id FROM accounts WHERE id = NEW.account_id;

    IF NEW.amount >= 10000 AND NEW.type = 'debit' THEN
        INSERT INTO fraud_alerts (ledger_id, account_id, user_id, alert_type, severity, description)
        VALUES (NEW.id, NEW.account_id, v_user_id, 'large_transaction', 'high',
                'Large transaction detected: ' || NEW.currency || ' ' || NEW.amount::TEXT);
    END IF;

    IF NEW.amount >= 5000 AND MOD(NEW.amount::INTEGER, 5000) = 0 AND NEW.type = 'debit' THEN
        INSERT INTO fraud_alerts (ledger_id, account_id, user_id, alert_type, severity, description)
        VALUES (NEW.id, NEW.account_id, v_user_id, 'round_amount', 'medium',
                'Suspiciously round amount detected: ' || NEW.currency || ' ' || NEW.amount::TEXT);
    END IF;

    SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_hourly_count, v_hourly_amount
    FROM ledger
    WHERE account_id = NEW.account_id
      AND type = 'debit'
      AND created_at >= NOW() - INTERVAL '1 hour';

    IF v_hourly_count > 10 THEN
        INSERT INTO fraud_alerts (ledger_id, account_id, user_id, alert_type, severity, description)
        VALUES (NEW.id, NEW.account_id, v_user_id, 'velocity', 'high',
                'High transaction velocity: ' || v_hourly_count || ' transactions in last hour');
    END IF;

    IF v_hourly_amount > 50000 THEN
        INSERT INTO fraud_alerts (ledger_id, account_id, user_id, alert_type, severity, description)
        VALUES (NEW.id, NEW.account_id, v_user_id, 'velocity', 'critical',
                'High transaction volume: ' || NEW.currency || ' ' || v_hourly_amount::TEXT || ' in last hour');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fraud_detection ON ledger;
CREATE TRIGGER trigger_fraud_detection
    AFTER INSERT ON ledger
    FOR EACH ROW
    EXECUTE FUNCTION detect_fraud_on_transaction();


-- ============================================
-- TRIGGER: Create notification on fraud alert
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_fraud_alert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
        NEW.user_id,
        'fraud',
        '🚨 Fraud Alert: ' || REPLACE(NEW.alert_type::TEXT, '_', ' '),
        NEW.description,
        jsonb_build_object(
            'alert_id', NEW.id,
            'severity', NEW.severity,
            'account_id', NEW.account_id
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_fraud ON fraud_alerts;
CREATE TRIGGER trigger_notify_fraud
    AFTER INSERT ON fraud_alerts
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_fraud_alert();


-- ============================================
-- TRIGGER: Create notification on transaction
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_title TEXT;
BEGIN
    SELECT user_id INTO v_user_id FROM accounts WHERE id = NEW.account_id;

    IF NEW.type = 'credit' THEN
        v_title := '💰 Money Received';
    ELSE
        v_title := '💸 Money Sent';
    END IF;

    IF NEW.amount > 0 THEN
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
            v_user_id,
            'transaction',
            v_title,
            NEW.currency || ' ' || NEW.amount::TEXT || ' - ' || NEW.description,
            jsonb_build_object(
                'ledger_id', NEW.id,
                'amount', NEW.amount,
                'type', NEW.type,
                'currency', NEW.currency,
                'account_id', NEW.account_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_transaction ON ledger;
CREATE TRIGGER trigger_notify_transaction
    AFTER INSERT ON ledger
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_transaction();


-- ============================================
-- TRIGGER: Audit log on user changes
-- ============================================
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (NEW.id, 'UPDATE', 'users', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_data)
        VALUES (OLD.id, 'DELETE', 'users', OLD.id, to_jsonb(OLD));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_users ON users;
CREATE TRIGGER trigger_audit_users
    AFTER UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_user_changes();


-- ============================================
-- TRIGGER: Audit log on account changes
-- ============================================
CREATE OR REPLACE FUNCTION audit_account_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);

    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (v_user_id, 'UPDATE', 'accounts', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_accounts ON accounts;
CREATE TRIGGER trigger_audit_accounts
    AFTER UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION audit_account_changes();


-- ============================================
-- STORED PROCEDURE: Block Account (Admin)
-- ============================================
CREATE OR REPLACE FUNCTION block_account(
    p_account_id UUID,
    p_admin_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE accounts SET status = 'frozen' WHERE id = p_account_id;

    INSERT INTO audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (p_admin_id, 'BLOCK_ACCOUNT', 'accounts', p_account_id,
            jsonb_build_object('action', 'frozen', 'by', p_admin_id));
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- STORED PROCEDURE: Unblock Account (Admin)
-- ============================================
CREATE OR REPLACE FUNCTION unblock_account(
    p_account_id UUID,
    p_admin_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE accounts SET status = 'active' WHERE id = p_account_id;

    INSERT INTO audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (p_admin_id, 'UNBLOCK_ACCOUNT', 'accounts', p_account_id,
            jsonb_build_object('action', 'active', 'by', p_admin_id));
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- VIEW: Monthly Statement (Materialized)
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_statements AS
SELECT
    a.user_id,
    a.id AS account_id,
    a.account_number,
    a.currency,
    DATE_TRUNC('month', l.created_at)::DATE AS statement_month,
    SUM(CASE WHEN l.type = 'credit' THEN l.amount ELSE 0 END) AS total_credits,
    SUM(CASE WHEN l.type = 'debit'  THEN l.amount ELSE 0 END) AS total_debits,
    COUNT(*) AS transaction_count,
    MIN(l.created_at) AS first_transaction,
    MAX(l.created_at) AS last_transaction
FROM ledger l
JOIN accounts a ON l.account_id = a.id
GROUP BY a.user_id, a.id, a.account_number, a.currency, DATE_TRUNC('month', l.created_at)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_account_month
ON mv_monthly_statements (account_id, statement_month);


-- ============================================
-- VIEW: Admin Dashboard Stats
-- ============================================
CREATE OR REPLACE VIEW v_admin_dashboard AS
SELECT
    (SELECT COUNT(*)                                              FROM users)                                    AS total_users,
    (SELECT COUNT(*)                                              FROM users          WHERE is_active = true)    AS active_users,
    (SELECT COUNT(*)                                              FROM accounts)                                 AS total_accounts,
    (SELECT COUNT(*)                                              FROM accounts       WHERE status = 'active')   AS active_accounts,
    (SELECT COUNT(*)                                              FROM ledger)                                   AS total_transactions,
    (SELECT COALESCE(SUM(balance), 0)                             FROM accounts       WHERE status = 'active')   AS total_money,
    (SELECT COUNT(*)                                              FROM fraud_alerts   WHERE status = 'pending')  AS pending_fraud_alerts,
    (SELECT COUNT(*)                                              FROM users          WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
    (SELECT COUNT(*)                                              FROM ledger         WHERE created_at >= NOW() - INTERVAL '24 hours') AS transactions_24h;


-- ============================================
-- FUNCTION: Get transaction history
-- ============================================
CREATE OR REPLACE FUNCTION get_transaction_history(
    p_account_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_type transaction_type DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    account_id UUID,
    amount DECIMAL,
    type transaction_type,
    description TEXT,
    category VARCHAR,
    reference_id VARCHAR,
    running_balance DECIMAL,
    currency VARCHAR,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.account_id,
        l.amount,
        l.type,
        l.description,
        l.category,
        l.reference_id,
        l.running_balance,
        l.currency,
        l.metadata,
        l.created_at,
        COUNT(*) OVER() AS total_count
    FROM ledger l
    WHERE l.account_id = p_account_id
      AND (p_start_date IS NULL OR l.created_at >= p_start_date)
      AND (p_end_date   IS NULL OR l.created_at <= p_end_date)
      AND (p_type       IS NULL OR l.type = p_type)
      AND (p_search     IS NULL OR l.description ILIKE '%' || p_search || '%')
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- FUNCTION: Get spending by category
-- ============================================
CREATE OR REPLACE FUNCTION get_spending_by_category(
    p_user_id UUID,
    p_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
)
RETURNS TABLE (
    category VARCHAR,
    total_spent DECIMAL,
    transaction_count BIGINT,
    percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH category_totals AS (
        SELECT
            COALESCE(l.category, 'Other') AS cat,
            SUM(l.amount)                 AS total,
            COUNT(*)                      AS cnt
        FROM ledger l
        JOIN accounts a ON l.account_id = a.id
        WHERE a.user_id = p_user_id
          AND l.type = 'debit'
          AND DATE_TRUNC('month', l.created_at) = p_month
        GROUP BY COALESCE(l.category, 'Other')
    ),
    grand_total AS (
        SELECT SUM(total) AS grand FROM category_totals
    )
    SELECT
        ct.cat,
        ct.total,
        ct.cnt,
        ROUND((ct.total / NULLIF(gt.grand, 0)) * 100, 2)
    FROM category_totals ct
    CROSS JOIN grand_total gt
    ORDER BY ct.total DESC;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_records       ENABLE ROW LEVEL SECURITY;

-- Users
DROP POLICY IF EXISTS "Users can view own profile"   ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can view own profile"   ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Accounts
DROP POLICY IF EXISTS "Users can view own accounts"   ON accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
CREATE POLICY "Users can view own accounts"   ON accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (user_id = auth.uid());

-- Ledger
DROP POLICY IF EXISTS "Users can view own transactions" ON ledger;
CREATE POLICY "Users can view own transactions" ON ledger
    FOR SELECT USING (
        account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
    );

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications"   ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"   ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Budget categories
DROP POLICY IF EXISTS "Users can manage own budgets" ON budget_categories;
CREATE POLICY "Users can manage own budgets" ON budget_categories FOR ALL USING (user_id = auth.uid());

-- Investments
DROP POLICY IF EXISTS "Users can manage own investments" ON investments;
CREATE POLICY "Users can manage own investments" ON investments FOR ALL USING (user_id = auth.uid());

-- Chat sessions
DROP POLICY IF EXISTS "Users can manage own chats" ON chat_sessions;
CREATE POLICY "Users can manage own chats" ON chat_sessions FOR ALL USING (user_id = auth.uid());

-- Fraud alerts
DROP POLICY IF EXISTS "Users can view own fraud alerts" ON fraud_alerts;
CREATE POLICY "Users can view own fraud alerts" ON fraud_alerts FOR SELECT USING (user_id = auth.uid());


-- ============================================
-- INSERT DEFAULT ADMIN USER
-- ============================================
-- Email:    khan4701405@cloud.neduet.edu.pk
-- Password: Carpathia123@
INSERT INTO users (
    email,
    password_hash,
    name,
    role,
    is_email_verified,
    kyc_status,
    preferred_currency
)
VALUES (
    'khan4701405@cloud.neduet.edu.pk',
    '$2b$12$Fepp4GLMQoDBBb/5ly.5Qu2Eg2BW8o8uESOhvHWlo5fBSkSiBK3yK',
    'FinSync Admin',
    'admin',
    true,
    'verified',
    'USD'
)
ON CONFLICT (email) DO UPDATE
    SET password_hash     = EXCLUDED.password_hash,
        role              = EXCLUDED.role,
        is_email_verified = EXCLUDED.is_email_verified,
        kyc_status        = EXCLUDED.kyc_status;


-- ============================================
-- REFRESH MATERIALIZED VIEW (call periodically)
-- ============================================
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_statements;

SELECT 'FinSync Database Schema Created Successfully! 🏦' AS status;- -   S E A R C H   I N D E X E S   ( P o s t g r e s   T r i g r a m ) 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a c c o u n t s _ s e a r c h   O N   a c c o u n t s   U S I N G   g i n   ( n a m e   g i n _ t r g m _ o p s ,   a c c o u n t _ n u m b e r   g i n _ t r g m _ o p s ) ; 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ l e d g e r _ s e a r c h   O N   l e d g e r   U S I N G   g i n   ( d e s c r i p t i o n   g i n _ t r g m _ o p s ) ; 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ i n v e s t m e n t s _ s e a r c h   O N   i n v e s t m e n t s   U S I N G   g i n   ( n a m e   g i n _ t r g m _ o p s ,   s y m b o l   g i n _ t r g m _ o p s ) ; 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ b u d g e t s _ s e a r c h   O N   b u d g e t _ c a t e g o r i e s   U S I N G   g i n   ( c a t e g o r y _ n a m e   g i n _ t r g m _ o p s ) ; 
 
