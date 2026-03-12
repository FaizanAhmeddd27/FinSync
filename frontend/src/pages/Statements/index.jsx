import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, ChevronDown, Calendar,
  ArrowUpRight, ArrowDownLeft, TrendingUp,
  CreditCard, Wallet, PieChart, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart as RePieChart,
  Pie, Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { statementAPI, accountAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, maskAccountNumber, cn } from '@/lib/utils';

const PIE_COLORS = [
  '#1c9cf0', '#00b87a', '#f7b928', '#e0245e',
  '#17bf63', '#794bc4', '#ff6b6b', '#45b7d1',
];

// Summary Stat Card
function SummaryStat({ label, value, icon: Icon, color, currency }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <div
        className="mx-auto h-10 w-10 rounded-xl flex items-center justify-center mb-2"
        style={{ backgroundColor: `${color}12` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color }}>
        {typeof value === 'number' ? formatCurrency(value, currency) : value}
      </p>
    </div>
  );
}

export default function Statements() {
  const { user } = useAuthStore();
  const preferredCurrency = user?.preferred_currency || 'USD';

  // State
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statement, setStatement] = useState(null);

  // Loading
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [monthsLoading, setMonthsLoading] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Fetch accounts
  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await accountAPI.getAll();
        if (data.success) {
          const accs = (data.data.accounts || []).filter((a) => a.status !== 'closed');
          setAccounts(accs);
          if (accs.length > 0) {
            const def = accs.find((a) => a.is_default) || accs[0];
            setSelectedAccountId(def.id);
          }
        }
      } catch { /* ignore */ }
      setAccountsLoading(false);
    };
    fetch();
  }, []);

  // Fetch available months when account changes
  useEffect(() => {
    if (!selectedAccountId) return;

    const fetchMonths = async () => {
      setMonthsLoading(true);
      setStatement(null);
      try {
        const { data } = await statementAPI.getMonths(selectedAccountId);
        if (data.success) {
          const months = data.data.months || [];
          setAvailableMonths(months);
          if (months.length > 0) {
            setSelectedMonth(months[0]);
          } else {
            setSelectedMonth('');
          }
        }
      } catch {
        setAvailableMonths([]);
        setSelectedMonth('');
      }
      setMonthsLoading(false);
    };
    fetchMonths();
  }, [selectedAccountId]);

  // Fetch statement when month changes
  useEffect(() => {
    if (!selectedAccountId || !selectedMonth) return;

    const fetchStatement = async () => {
      setStatementLoading(true);
      try {
        const { data } = await statementAPI.getMonthly(selectedAccountId, selectedMonth);
        if (data.success) {
          setStatement(data.data);
        }
      } catch {
        setStatement(null);
      }
      setStatementLoading(false);
    };
    fetchStatement();
  }, [selectedAccountId, selectedMonth]);

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!selectedAccountId || !selectedMonth) return;
    setDownloading(true);
    try {
      const response = await statementAPI.downloadPDF(selectedAccountId, selectedMonth);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinSync_Statement_${selectedMonth}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setDownloading(false);
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Format month label
  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FadeInView>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Statements</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View and download your monthly account statements
            </p>
          </div>
        </FadeInView>
        <FadeInView delay={0.1}>
          <Button
            variant="glow"
            size="sm"
            className="gap-2"
            onClick={handleDownloadPDF}
            isLoading={downloading}
            disabled={!statement}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </FadeInView>
      </div>

      {/* Selectors */}
      <FadeInView delay={0.1}>
        <Card>
          <CardContent className="pt-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Account Selector */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground/80">Select Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type?.replace('_', ' ').toUpperCase()} —{' '}
                      {maskAccountNumber(acc.account_number)} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selector */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground/80">Select Month</label>
                {monthsLoading ? (
                  <div className="h-11 rounded-lg border border-border bg-input flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : availableMonths.length > 0 ? (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full h-11 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatMonth(m)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-11 rounded-lg border border-border bg-input flex items-center px-3 text-sm text-muted-foreground">
                    No statements available
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeInView>

      {/* Statement Content */}
      {statementLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : statement ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedAccountId}-${selectedMonth}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryStat
                label="Opening Balance"
                value={statement.summary.opening_balance}
                icon={Wallet}
                color="#1c9cf0"
                currency={statement.account.currency}
              />
              <SummaryStat
                label="Total Credits"
                value={statement.summary.total_credits}
                icon={ArrowDownLeft}
                color="#00b87a"
                currency={statement.account.currency}
              />
              <SummaryStat
                label="Total Debits"
                value={statement.summary.total_debits}
                icon={ArrowUpRight}
                color="#f4212e"
                currency={statement.account.currency}
              />
              <SummaryStat
                label="Closing Balance"
                value={statement.summary.closing_balance}
                icon={TrendingUp}
                color="#f7b928"
                currency={statement.account.currency}
              />
            </div>

            {/* Account Info Bar */}
            <Card className="bg-accent/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-sm">
                  <div>
                    <span className="text-muted-foreground">Account: </span>
                    <span className="font-medium">{statement.account.account_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type: </span>
                    <span className="font-medium capitalize">
                      {statement.account.account_type?.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Currency: </span>
                    <span className="font-medium">{statement.account.currency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Period: </span>
                    <span className="font-medium">{formatMonth(statement.statement_month)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transactions: </span>
                    <span className="font-medium">{statement.summary.transaction_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown + Transactions */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Category Breakdown */}
              {statement.category_breakdown && statement.category_breakdown.length > 0 && (
                <FadeInView delay={0.1}>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-base">Spending Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={statement.category_breakdown}
                              dataKey="total"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                              innerRadius={35}
                              paddingAngle={2}
                            >
                              {statement.category_breakdown.map((_, i) => (
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
                              formatter={(v) =>
                                formatCurrency(v, statement.account.currency)
                              }
                            />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2">
                        {statement.category_breakdown.map((cat, i) => (
                          <div key={cat.category} className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            <span className="text-xs text-muted-foreground flex-1 truncate">
                              {cat.category}
                            </span>
                            <span className="text-xs font-medium">
                              {formatCurrency(cat.total, statement.account.currency)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {cat.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </FadeInView>
              )}

              {/* Transactions Table */}
              <FadeInView
                delay={0.2}
                className={cn(
                  statement.category_breakdown?.length > 0
                    ? 'lg:col-span-2'
                    : 'lg:col-span-3'
                )}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Transactions ({statement.transactions?.length || 0})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {statement.transactions && statement.transactions.length > 0 ? (
                      <div className="max-h-[500px] overflow-y-auto pr-1">
                        {/* Desktop */}
                        <div className="hidden md:block">
                          <table className="w-full">
                            <thead className="sticky top-0 bg-card z-10">
                              <tr className="border-b border-border">
                                {['Date', 'Description', 'Category', 'Type', 'Amount', 'Balance'].map(
                                  (h) => (
                                    <th
                                      key={h}
                                      className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2 px-2"
                                    >
                                      {h}
                                    </th>
                                  )
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {statement.transactions.map((txn, i) => {
                                const isCredit = txn.type === 'credit';
                                return (
                                  <tr
                                    key={txn.id || i}
                                    className="border-b border-border/30 hover:bg-muted/20"
                                  >
                                    <td className="py-2.5 px-2 text-xs whitespace-nowrap">
                                      {new Date(txn.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-2.5 px-2 text-xs max-w-[180px] truncate">
                                      {txn.description || '—'}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      <Badge variant="muted" className="text-[9px]">
                                        {txn.category || 'Other'}
                                      </Badge>
                                    </td>
                                    <td className="py-2.5 px-2">
                                      <div className="flex items-center gap-1">
                                        {isCredit ? (
                                          <ArrowDownLeft className="h-3 w-3 text-success" />
                                        ) : (
                                          <ArrowUpRight className="h-3 w-3 text-destructive" />
                                        )}
                                        <span className="text-[10px] capitalize">{txn.type}</span>
                                      </div>
                                    </td>
                                    <td
                                      className={cn(
                                        'py-2.5 px-2 text-xs font-semibold',
                                        isCredit ? 'text-success' : 'text-destructive'
                                      )}
                                    >
                                      {isCredit ? '+' : '-'}
                                      {formatCurrency(txn.amount, statement.account.currency)}
                                    </td>
                                    <td className="py-2.5 px-2 text-xs text-muted-foreground">
                                      {formatCurrency(
                                        txn.running_balance,
                                        statement.account.currency
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden space-y-2">
                          {statement.transactions.map((txn, i) => {
                            const isCredit = txn.type === 'credit';
                            return (
                              <div
                                key={txn.id || i}
                                className="flex items-center justify-between p-2.5 rounded-lg border border-border/30"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={cn(
                                      'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                                      isCredit ? 'bg-success/10' : 'bg-destructive/10'
                                    )}
                                  >
                                    {isCredit ? (
                                      <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
                                    ) : (
                                      <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {txn.description || txn.category || '—'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {new Date(txn.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <p
                                  className={cn(
                                    'text-xs font-semibold shrink-0',
                                    isCredit ? 'text-success' : 'text-destructive'
                                  )}
                                >
                                  {isCredit ? '+' : '-'}
                                  {formatCurrency(txn.amount, statement.account.currency)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No transactions for this period
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </FadeInView>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        !statementLoading && (
          <Card className="text-center py-16">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Statement Available</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {accounts.length === 0
                ? 'Create an account first to generate statements.'
                : 'Select an account and month to view your statement.'}
            </p>
          </Card>
        )
      )}
    </div>
  );
}