import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Wallet, CreditCard, PiggyBank, Landmark,
  Eye, EyeOff, TrendingUp, MoreHorizontal,
  AlertCircle, CheckCircle2, XCircle, Snowflake,
  ArrowRight, Info, Sparkles, X, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { accountAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, maskAccountNumber, cn } from '@/lib/utils';

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings', icon: PiggyBank, desc: 'For long-term savings with interest', color: '#00b87a' },
  { value: 'checking', label: 'Checking', icon: CreditCard, desc: 'For everyday transactions', color: '#1c9cf0' },
  { value: 'wallet', label: 'Wallet', icon: Wallet, desc: 'Quick transfers & daily use', color: '#f7b928' },
  { value: 'fixed_deposit', label: 'Fixed Deposit', icon: Landmark, desc: 'Lock funds for higher returns', color: '#e0245e' },
];

const CURRENCIES = [
  { code: 'USD', flag: '🇺🇸' },
  { code: 'EUR', flag: '🇪🇺' },
  { code: 'GBP', flag: '🇬🇧' },
  { code: 'INR', flag: '🇮🇳' },
  { code: 'PKR', flag: '🇵🇰' },
  { code: 'AED', flag: '🇦🇪' },
  { code: 'CAD', flag: '🇨🇦' },
  { code: 'AUD', flag: '🇦🇺' },
];

const statusConfig = {
  active: { color: 'success', icon: CheckCircle2, label: 'Active' },
  frozen: { color: 'warning', icon: Snowflake, label: 'Frozen' },
  closed: { color: 'destructive', icon: XCircle, label: 'Closed' },
};

// Account Card Component
function AccountCard({ account, onViewDetail, onSetDefault }) {
  const [balanceHidden, setBalanceHidden] = useState(false);
  const status = statusConfig[account.status] || statusConfig.active;
  const typeConfig = ACCOUNT_TYPES.find((t) => t.value === account.account_type) || ACCOUNT_TYPES[0];
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        hover
        className={cn(
          'relative overflow-hidden cursor-pointer',
          account.is_default && 'border-primary/40 shadow-lg shadow-primary/5'
        )}
        onClick={() => onViewDetail(account)}
      >
        {/* Accent gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ background: `linear-gradient(90deg, ${typeConfig.color}, ${typeConfig.color}66)` }}
        />

        {/* Default badge */}
        {account.is_default && (
          <div className="absolute top-3 right-3">
            <Badge variant="default" className="text-[9px] px-1.5 py-0.5">
              DEFAULT
            </Badge>
          </div>
        )}

        <div className="pt-4">
          {/* Icon + Type */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${typeConfig.color}15` }}
            >
              <TypeIcon className="h-5 w-5" style={{ color: typeConfig.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold capitalize">
                {account.account_type?.replace('_', ' ')}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {account.masked_number || maskAccountNumber(account.account_number)}
              </p>
            </div>
          </div>

          {/* Balance */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-0.5">Balance</p>
            <div className="flex items-center gap-2">
              <p className="text-xl sm:text-2xl font-bold">
                {balanceHidden ? '••••••' : formatCurrency(account.balance, account.currency)}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setBalanceHidden(!balanceHidden); }}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                {balanceHidden
                  ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  : <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <status.icon className="h-3.5 w-3.5" style={{ color: `var(--${status.color})` }} />
              <span className="text-xs text-muted-foreground capitalize">{status.label}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{account.currency}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// Account Detail Panel
function AccountDetail({ account, onClose, onSetDefault }) {
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!account) return;
    const fetchHistory = async () => {
      try {
        const { data } = await accountAPI.getBalanceHistory(account.id, 30);
        if (data.success) setHistory(data.data.history || []);
      } catch { /* ignore */ }
      setHistoryLoading(false);
    };
    fetchHistory();
  }, [account]);

  if (!account) return null;

  const typeConfig = ACCOUNT_TYPES.find((t) => t.value === account.account_type) || ACCOUNT_TYPES[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${typeConfig.color}15` }}
          >
            <typeConfig.icon className="h-6 w-6" style={{ color: typeConfig.color }} />
          </div>
          <div>
            <h3 className="text-lg font-bold capitalize">
              {account.account_type?.replace('_', ' ')} Account
            </h3>
            <p className="text-sm text-muted-foreground font-mono">
              {account.account_number}
            </p>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-muted/50 rounded-xl p-4 mb-6">
          <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
          <p className="text-3xl font-bold" style={{ color: typeConfig.color }}>
            {formatCurrency(account.balance, account.currency)}
          </p>
        </div>

        {/* Mini Chart */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3">Balance Trend (30 days)</p>
          <div className="h-[160px]">
            {historyLoading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner size="sm" />
              </div>
            ) : history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id={`gradient-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={typeConfig.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={typeConfig.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(d) => `${new Date(d).getDate()}`}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [formatCurrency(v, account.currency), 'Balance']}
                    labelFormatter={(d) => new Date(d).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke={typeConfig.color}
                    strokeWidth={2}
                    fill={`url(#gradient-${account.id})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No history data
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          {[
            { label: 'Account Type', value: account.account_type?.replace('_', ' ') },
            { label: 'Currency', value: account.currency },
            { label: 'Status', value: account.status },
            { label: 'Default', value: account.is_default ? 'Yes' : 'No' },
            { label: 'Created', value: new Date(account.created_at).toLocaleDateString() },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium capitalize">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!account.is_default && account.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onSetDefault(account.id)}
            >
              Set as Default
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// Create Account Modal
function CreateAccountModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuthStore();
  const [selectedType, setSelectedType] = useState('');
  const [currency, setCurrency] = useState(user?.preferred_currency || 'USD');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!selectedType) { setError('Select an account type'); return; }
    setIsLoading(true);
    setError('');

    try {
      const { data } = await accountAPI.create({
        account_type: selectedType,
        currency,
        initial_deposit: parseFloat(initialDeposit) || 0,
      });

      if (data.success) {
        onSuccess?.();
        onClose();
        // Reset
        setSelectedType('');
        setInitialDeposit('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open New Account"
      description="Select your account type and currency"
      size="lg"
    >
      <div className="space-y-5">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
            >
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Account Type</label>
          <div className="grid grid-cols-2 gap-3">
            {ACCOUNT_TYPES.map((type) => {
              const TypeIcon = type.icon;
              const selected = selectedType === type.value;
              return (
                <motion.button
                  key={type.value}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedType(type.value); setError(''); }}
                  className={cn(
                    'flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all cursor-pointer',
                    selected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${type.color}15` }}
                  >
                    <TypeIcon className="h-4.5 w-4.5" style={{ color: type.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{type.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">{type.desc}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Currency Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Currency</label>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setCurrency(c.code)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer',
                  currency === c.code
                    ? 'border-primary bg-primary/5 text-foreground font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                )}
              >
                <span>{c.flag}</span>
                <span>{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Initial Deposit */}
        <Input
          label="Initial Deposit (optional)"
          type="number"
          placeholder="0.00"
          icon={Wallet}
          value={initialDeposit}
          onChange={(e) => setInitialDeposit(e.target.value)}
          min="0"
          step="0.01"
        />

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="glow"
            isLoading={isLoading}
            onClick={handleCreate}
            className="flex-1"
            disabled={!selectedType}
          >
            Create Account
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ======================== MAIN ACCOUNTS PAGE ========================
export default function Accounts() {
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  const fetchAccounts = async () => {
    try {
      const { data } = await accountAPI.getAll();
      if (data.success) {
        setAccounts(data.data.accounts || []);
        setSummary(data.data.summary || null);
      }
    } catch (err) {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestion = async () => {
    try {
      const { data } = await accountAPI.getSuggestion();
      if (data.success) setSuggestion(data.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchAccounts();
    fetchSuggestion();
  }, []);

  const handleSetDefault = async (accountId) => {
    try {
      await accountAPI.update(accountId, { is_default: true });
      fetchAccounts();
      setSelectedAccount(null);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FadeInView>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Accounts</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your bank accounts and wallets
            </p>
          </div>
        </FadeInView>
        <FadeInView delay={0.1}>
          <Button variant="glow" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Open New Account
          </Button>
        </FadeInView>
      </div>

      {/* Summary Stats */}
      {summary && (
        <FadeInView delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Accounts', value: summary.total_accounts, color: '#1c9cf0' },
              { label: 'Active', value: summary.active_accounts, color: '#00b87a' },
              {
                label: 'Total Balance',
                value: formatCurrency(summary.total_balance, summary.preferred_currency),
                color: '#f7b928',
              },
              { label: 'Currency', value: summary.preferred_currency, color: '#e0245e' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card border border-border rounded-xl p-4 text-center"
              >
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold mt-1" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </FadeInView>
      )}

      {/* AI Suggestion */}
      {suggestion && suggestion.recommended_type !== 'none' && (
        <FadeInView delay={0.15}>
          <Card className="bg-accent/30 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold flex items-center gap-2">
                  AI Suggestion
                  <Badge variant="default" className="text-[9px]">SMART</Badge>
                </p>
                <p className="text-sm text-muted-foreground mt-1">{suggestion.suggestion}</p>
              </div>
              {suggestion.recommended_type !== 'none' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setShowCreate(true)}
                >
                  Open
                </Button>
              )}
            </div>
          </Card>
        </FadeInView>
      )}

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Accounts Grid */}
        <div className={cn('space-y-4', selectedAccount ? 'lg:col-span-2' : 'lg:col-span-3')}>
          {accounts.length > 0 ? (
            <div className={cn(
              'grid gap-4',
              selectedAccount ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'
            )}>
              <AnimatePresence>
                {accounts.map((acc, i) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    onViewDetail={setSelectedAccount}
                    onSetDefault={handleSetDefault}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="text-center py-12">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Accounts Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Open your first account to start banking with FinSync
              </p>
              <Button variant="glow" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Open Account
              </Button>
            </Card>
          )}
        </div>

        {/* Account Detail Sidebar */}
        <AnimatePresence>
          {selectedAccount && (
            <AccountDetail
              account={selectedAccount}
              onClose={() => setSelectedAccount(null)}
              onSetDefault={handleSetDefault}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Create Account Modal */}
      <CreateAccountModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={fetchAccounts}
      />
    </div>
  );
}