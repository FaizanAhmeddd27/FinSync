import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, ArrowUpRight,
  ArrowDownLeft, ChevronLeft, ChevronRight,
  Calendar, X, SlidersHorizontal, BarChart3,
  RefreshCw, FileText,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { transactionAPI, accountAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, cn, timeAgo } from '@/lib/utils';

const CATEGORIES = [
  'All', 'Food & Dining', 'Shopping', 'Transportation',
  'Bills & Utilities', 'Entertainment', 'Healthcare',
  'Transfer', 'Salary', 'Investment', 'Other',
];

const PIE_COLORS = [
  '#1c9cf0', '#00b87a', '#f7b928', '#e0245e',
  '#17bf63', '#794bc4', '#ff6b6b', '#45b7d1',
  '#96ceb4', '#ffeaa7',
];

export default function Transactions() {
  const { user } = useAuthStore();
  const currency = user?.preferred_currency || 'USD';

  // Data
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1, limit: 15, total: 0, totalPages: 0,
  });
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);

  // Loading
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    category: '',
    account_id: '',
    start_date: '',
    end_date: '',
    min_amount: '',
    max_amount: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Stats period
  const [statsPeriod, setStatsPeriod] = useState('30d');

  // Fetch accounts
  useEffect(() => {
    accountAPI.getAll().then(({ data }) => {
      if (data.success) setAccounts(data.data.accounts || []);
    }).catch(() => {});
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });

      const { data } = await transactionAPI.getAll(params);
      if (data.success) {
        setTransactions(data.data.transactions || []);
        setPagination(data.data.pagination || {
          page, limit: 15, total: 0, totalPages: 0,
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await transactionAPI.getStats(statsPeriod);
      if (data.success) setStats(data.data);
    } catch { /* ignore */ }
    setStatsLoading(false);
  }, [statsPeriod]);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.account_id) params.account_id = filters.account_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await transactionAPI.exportCSV(params);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finsync_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(false);
  };

  // Apply filter shortcut
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '', type: '', category: '', account_id: '',
      start_date: '', end_date: '', min_amount: '', max_amount: '',
      sort_by: 'created_at', sort_order: 'desc',
    });
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => v && k !== 'sort_by' && k !== 'sort_order'
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FadeInView>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View and manage all your transactions
            </p>
          </div>
        </FadeInView>
        <FadeInView delay={0.1}>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn('gap-2', hasActiveFilters && 'border-primary text-primary')}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              isLoading={exporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </FadeInView>
      </div>

      {/* Stats Cards */}
      {stats && !statsLoading && (
        <FadeInView delay={0.1}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Income', value: stats.total_income, color: '#00b87a', icon: ArrowDownLeft },
              { label: 'Spending', value: stats.total_spending, color: '#f4212e', icon: ArrowUpRight },
              { label: 'Net', value: stats.net, color: stats.net >= 0 ? '#00b87a' : '#f4212e', icon: BarChart3 },
              { label: 'Transactions', value: stats.transaction_count, color: '#1c9cf0', icon: FileText, isCurrency: false },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className="text-lg font-bold" style={{ color: s.color }}>
                  {s.isCurrency === false ? s.value : formatCurrency(s.value, currency)}
                </p>
              </div>
            ))}
          </div>
        </FadeInView>
      )}

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="pt-5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search */}
                  <Input
                    label="Search"
                    placeholder="Description..."
                    icon={Search}
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                  />

                  {/* Type */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground/80">Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => updateFilter('type', e.target.value)}
                      className="w-full h-11 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                    >
                      <option value="">All Types</option>
                      <option value="credit">Credit (Income)</option>
                      <option value="debit">Debit (Expense)</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground/80">Category</label>
                    <select
                      value={filters.category}
                      onChange={(e) => updateFilter('category', e.target.value)}
                      className="w-full h-11 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                    >
                      <option value="">All Categories</option>
                      {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Account */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground/80">Account</label>
                    <select
                      value={filters.account_id}
                      onChange={(e) => updateFilter('account_id', e.target.value)}
                      className="w-full h-11 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                    >
                      <option value="">All Accounts</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.account_type?.replace('_', ' ')} — {a.currency}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range */}
                  <Input
                    label="From Date"
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => updateFilter('start_date', e.target.value)}
                  />
                  <Input
                    label="To Date"
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => updateFilter('end_date', e.target.value)}
                  />

                  {/* Amount Range */}
                  <Input
                    label="Min Amount"
                    type="number"
                    placeholder="0"
                    prefix={<span className="text-[10px] font-bold text-muted-foreground">{currency === 'USD' ? '$' : currency}</span>}
                    value={filters.min_amount}
                    onChange={(e) => updateFilter('min_amount', e.target.value)}
                  />
                  <Input
                    label="Max Amount"
                    type="number"
                    placeholder="999999"
                    prefix={<span className="text-[10px] font-bold text-muted-foreground">{currency === 'USD' ? '$' : currency}</span>}
                    value={filters.max_amount}
                    onChange={(e) => updateFilter('max_amount', e.target.value)}
                  />
                </div>

                <div className="flex justify-end mt-4 gap-2">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => fetchTransactions(1)}
                  >
                    Apply Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions Table */}
      <FadeInView delay={0.2}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Transaction History
                {pagination.total > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({pagination.total} total)
                  </span>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchTransactions(pagination.page)}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : transactions.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {['Date', 'Description', 'Category', 'Account', 'Type', 'Amount', 'Balance'].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn, i) => {
                        const isCredit = txn.type === 'credit';
                        const txnCurrency =
                          txn.currency || txn.account?.currency || currency;
                        return (
                          <motion.tr
                            key={txn.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-2 text-sm whitespace-nowrap">
                              {new Date(txn.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-2 text-sm max-w-[200px] truncate">
                              {txn.description || '—'}
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant="muted" className="text-[10px]">
                                {txn.category || 'Other'}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-xs text-muted-foreground capitalize">
                              {txn.account?.account_type?.replace('_', ' ') || '—'}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1.5">
                                {isCredit ? (
                                  <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
                                ) : (
                                  <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />
                                )}
                                <span className="text-xs capitalize">{txn.type}</span>
                              </div>
                            </td>
                            <td
                              className={cn(
                                'py-3 px-2 text-sm font-semibold',
                                isCredit ? 'text-success' : 'text-destructive'
                              )}
                            >
                              {isCredit ? '+' : '-'}
                              {formatCurrency(txn.amount, txnCurrency)}
                            </td>
                            <td className="py-3 px-2 text-sm text-muted-foreground">
                              {txn.running_balance !== undefined
                                ? formatCurrency(txn.running_balance, txnCurrency)
                                : '—'}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                  {transactions.map((txn) => {
                    const isCredit = txn.type === 'credit';
                    const txnCurrency =
                      txn.currency || txn.account?.currency || currency;
                    return (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                              isCredit ? 'bg-success/10' : 'bg-destructive/10'
                            )}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="h-4 w-4 text-success" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {txn.description || txn.category || 'Transaction'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(txn.created_at).toLocaleDateString()} •{' '}
                              {txn.category || 'Other'}
                            </p>
                          </div>
                        </div>
                        <p
                          className={cn(
                            'text-sm font-semibold shrink-0 ml-2',
                            isCredit ? 'text-success' : 'text-destructive'
                          )}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(txn.amount, txnCurrency)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages} •{' '}
                      {pagination.total} results
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchTransactions(pagination.page - 1)}
                        disabled={!pagination.hasPrevious}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {Array.from({ length: Math.min(5, pagination.totalPages) }).map(
                        (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={pagination.page === pageNum ? 'primary' : 'ghost'}
                              size="sm"
                              onClick={() => fetchTransactions(pageNum)}
                              className="h-8 w-8 p-0 text-xs"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchTransactions(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Transactions Found</h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? 'Try adjusting your filters'
                    : 'Make a transfer to see transactions'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInView>

      {/* Category Breakdown Chart */}
      {stats?.category_breakdown && stats.category_breakdown.length > 0 && (
        <FadeInView delay={0.3}>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Daily Volume</CardTitle>
                  <div className="flex gap-1">
                    {['7d', '30d', '90d'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setStatsPeriod(p)}
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                          statsPeriod === p
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.daily_breakdown?.slice(-14) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(d) => `${new Date(d).getDate()}`}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--popover)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v, name) => [
                          formatCurrency(v, currency),
                          name === 'income' ? 'Income' : 'Spending',
                        ]}
                      />
                      <Bar dataKey="income" fill="#00b87a" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="spending" fill="#f4212e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] flex items-center">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.category_breakdown.slice(0, 6)}
                          dataKey="total"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={2}
                        >
                          {stats.category_breakdown.slice(0, 6).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'var(--popover)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(v) => formatCurrency(v, currency)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2">
                    {stats.category_breakdown.slice(0, 6).map((cat, i) => (
                      <div key={cat.category} className="flex items-center gap-2 text-xs">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground truncate flex-1">
                          {cat.category}
                        </span>
                        <span className="font-medium">{cat.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </FadeInView>
      )}
    </div>
  );
}