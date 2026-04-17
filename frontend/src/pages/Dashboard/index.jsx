import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
  Plus, Download, TrendingUp, TrendingDown,
  Wallet, PiggyBank, Eye, EyeOff,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import AnimatedCounter from '@/components/animations/AnimatedCounter';
import HeatmapCalendar from '@/components/dashboard/HeatmapCalendar';
import { dashboardAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, maskAccountNumber, timeAgo, cn } from '@/lib/utils';

// Stat Card Component
function StatCard({ title, value, change, icon: Icon, color, currency, delay = 0, prefix = '' }) {
  const [hidden, setHidden] = useState(false);
  const isPositive = change >= 0;

  return (
    <FadeInView delay={delay}>
      <Card hover className="relative overflow-hidden">
        {/* Accent glow */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: color }}
        />

        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {hidden ? '••••••' : (
                  typeof value === 'number'
                    ? formatCurrency(value, currency)
                    : value
                )}
              </h3>
              <button
                onClick={() => setHidden(!hidden)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                {hidden ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            </div>
            {change !== undefined && (
              <div className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(change)}%
                <span className="text-muted-foreground ml-0.5">vs last month</span>
              </div>
            )}
          </div>

          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
      </Card>
    </FadeInView>
  );
}

// Custom Chart Tooltip
function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-primary">
        {formatCurrency(payload[0]?.value || 0, currency)}
      </p>
    </div>
  );
}

// Transaction Row
function TransactionRow({ txn, currency: fallbackCurrency }) {
  const isCredit = txn.type === 'credit';
  const txnCurrency = txn.currency || txn.accounts?.currency || fallbackCurrency || 'USD';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between py-3 px-1 border-b border-border/50 last:border-0 hover:bg-muted/30 rounded-lg transition-colors -mx-1 px-2"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
          isCredit ? 'bg-success/10' : 'bg-destructive/10'
        )}>
          {isCredit
            ? <ArrowDownLeft className="h-4 w-4 text-success" />
            : <ArrowUpRight className="h-4 w-4 text-destructive" />
          }
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {txn.description || (isCredit ? 'Received' : 'Sent')}
          </p>
          <p className="text-xs text-muted-foreground">
            {txn.category || 'Transfer'} • {timeAgo(txn.created_at)}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p className={cn(
          'text-sm font-semibold',
          isCredit ? 'text-success' : 'text-destructive'
        )}>
          {isCredit ? '+' : '-'}{formatCurrency(txn.amount, txnCurrency)}
        </p>
        {txn.accounts?.account_type && (
          <p className="text-[10px] text-muted-foreground capitalize">
            {txn.accounts.account_type}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// Quick Action Button
function QuickAction({ icon: Icon, label, to, color, delay }) {
  return (
    <FadeInView delay={delay}>
      <Link to={to}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/30 bg-card hover:bg-accent/50 transition-all cursor-pointer group"
        >
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
            style={{ backgroundColor: `${color}12` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {label}
          </span>
        </motion.div>
      </Link>
    </FadeInView>
  );
}

// ======================== MAIN DASHBOARD ========================
export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [heatmapData, setHeatmapData] = useState([]);
  const [heatmapInsights, setHeatmapInsights] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(true);

  const preferredCurrency = user?.preferred_currency || 'USD';

  const fetchDashboard = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [{ data: res }, { data: heatmapRes }] = await Promise.all([
        dashboardAPI.get(),
        dashboardAPI.getHeatmap().catch(() => ({ data: { success: false } }))
      ]);
      if (res.success) setData(res.data);
      if (heatmapRes.success) {
        setHeatmapData(heatmapRes.data.heatmap);
        setHeatmapInsights(heatmapRes.data.insights);
      }
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
      setHeatmapLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">{error || 'Something went wrong'}</p>
        <Button onClick={() => { setLoading(true); fetchDashboard(); }} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const { stats, accounts, recentTransactions, balanceHistory } = data;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FadeInView>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Here's your financial overview
            </p>
          </div>
        </FadeInView>

        <FadeInView delay={0.1}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchDashboard(true)}
              isLoading={refreshing}
              className="gap-2"
            >
              {!refreshing && <ArrowLeftRight className="h-4 w-4" />}
              Refresh
            </Button>
            <Link to="/transfers">
              <Button variant="glow" size="sm" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                Send Money
              </Button>
            </Link>
          </div>
        </FadeInView>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Balance"
          value={stats.totalBalance}
          currency={preferredCurrency}
          icon={Wallet}
          color="#1c9cf0"
          delay={0}
        />
        <StatCard
          title="Monthly Income"
          value={stats.monthlyIncome}
          currency={preferredCurrency}
          icon={ArrowDownLeft}
          color="#00b87a"
          change={12}
          delay={0.1}
        />
        <StatCard
          title="Monthly Spending"
          value={stats.monthlySpending}
          currency={preferredCurrency}
          icon={ArrowUpRight}
          color="#f4212e"
          change={-5}
          delay={0.2}
        />
        <StatCard
          title="Savings Rate"
          value={`${stats.savingsRate || 0}%`}
          icon={PiggyBank}
          color="#f7b928"
          delay={0.3}
        />
      </div>

      {/* Chart + Recent Transactions */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Balance Chart */}
        <FadeInView delay={0.2} className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Balance History</CardTitle>
                <Badge>Last 30 days</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full mt-4">
                {balanceHistory && balanceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={balanceHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1c9cf0" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#1c9cf0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(d) => {
                          const date = new Date(d);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                        interval="preserveStartEnd"
                        minTickGap={40}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                        width={50}
                      />
                      <Tooltip content={<ChartTooltip currency={preferredCurrency} />} />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#1c9cf0"
                        strokeWidth={2.5}
                        fill="url(#balanceGradient)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#1c9cf0', strokeWidth: 2, stroke: 'var(--background)' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No balance data available yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeInView>

        {/* Recent Transactions */}
        <FadeInView delay={0.3} className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Link to="/transactions" className="text-xs text-primary hover:underline">
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {recentTransactions && recentTransactions.length > 0 ? (
                <div className="space-y-0">
                  {recentTransactions.map((txn, i) => (
                    <TransactionRow key={txn.id || i} txn={txn} currency={preferredCurrency} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                  <Link to="/transfers" className="text-xs text-primary hover:underline mt-1">
                    Make your first transfer
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeInView>
      </div>

      {/* HEATMAP CALENDAR STRIP */}
      <FadeInView delay={0.4}>
        <HeatmapCalendar 
          data={heatmapData} 
          insights={heatmapInsights} 
          loading={heatmapLoading} 
          currency={preferredCurrency} 
        />
      </FadeInView>

      {/* Quick Actions + Accounts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <FadeInView delay={0.3}>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <QuickAction icon={ArrowLeftRight} label="Send Money" to="/transfers" color="#1c9cf0" delay={0.35} />
                <QuickAction icon={Plus} label="New Account" to="/accounts" color="#00b87a" delay={0.4} />
                <QuickAction icon={Download} label="Statement" to="/statements" color="#f7b928" delay={0.45} />
              </div>
            </CardContent>
          </Card>
        </FadeInView>

        {/* Accounts Summary */}
        <FadeInView delay={0.4} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Accounts</CardTitle>
                <Link to="/accounts" className="text-xs text-primary hover:underline">
                  Manage →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {accounts && accounts.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {accounts.slice(0, 4).map((acc, i) => (
                    <motion.div
                      key={acc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                    >
                      <Link
                        to={`/accounts`}
                        className="block p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={acc.is_default ? 'default' : 'muted'} className="text-[10px] capitalize">
                            {acc.account_type?.replace('_', ' ')}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {acc.masked_number || maskAccountNumber(acc.account_number)}
                          </span>
                        </div>
                        <p className="text-lg font-bold">
                          {formatCurrency(acc.balance, acc.currency)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{acc.currency}</p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-2">No accounts yet</p>
                  <Link to="/accounts">
                    <Button variant="outline" size="sm">Create Account</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeInView>
      </div>
    </div>
  );
}