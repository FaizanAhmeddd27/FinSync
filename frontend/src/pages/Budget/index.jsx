import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart as PieChartIcon, Plus, Target, TrendingUp,
  TrendingDown, AlertTriangle, CheckCircle2, Sparkles,
  Edit3, Trash2, X, Lightbulb, DollarSign, ArrowUpRight,
  ArrowDownLeft, Wallet, BarChart3, RefreshCw,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CardHeader, Card, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { budgetAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, cn } from '@/lib/utils';

const PIE_COLORS = [
  '#1c9cf0', '#00b87a', '#f7b928', '#e0245e',
  '#17bf63', '#794bc4', '#ff6b6b', '#45b7d1',
  '#96ceb4', '#ffeaa7',
];

const ICON_OPTIONS = [
  { value: 'utensils', label: '🍽️' },
  { value: 'shopping-bag', label: '🛍️' },
  { value: 'car', label: '🚗' },
  { value: 'zap', label: '⚡' },
  { value: 'film', label: '🎬' },
  { value: 'heart', label: '❤️' },
  { value: 'book', label: '📚' },
  { value: 'plane', label: '✈️' },
  { value: 'home', label: '🏠' },
  { value: 'receipt', label: '🧾' },
  { value: 'gift', label: '🎁' },
  { value: 'coffee', label: '☕' },
];

const CATEGORY_ICONS = {
  utensils: '🍽️', 'shopping-bag': '🛍️', car: '🚗', zap: '⚡',
  film: '🎬', heart: '❤️', book: '📚', plane: '✈️',
  home: '🏠', receipt: '🧾', gift: '🎁', coffee: '☕',
};

// =================== BUDGET PROGRESS RING ===================
function ProgressRing({ percentage, color, size = 80, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

// =================== BUDGET CATEGORY CARD ===================
function BudgetCategoryCard({ item, onEdit, onDelete }) {
  const icon = CATEGORY_ICONS[item.icon] || '📊';
  const statusColor =
    item.status === 'over_budget'
      ? '#f4212e'
      : item.status === 'warning'
      ? '#f7b928'
      : '#00b87a';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card hover className="relative overflow-hidden group">
        {/* Top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: item.color || statusColor }}
        />

        {/* Actions */}
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="p-1.5 rounded-lg bg-muted hover:bg-accent transition-colors"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="p-1.5 rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        <div className="flex items-start gap-4 pt-3">
          {/* Progress Ring */}
          <div className="relative shrink-0">
            <ProgressRing
              percentage={item.percentage}
              color={statusColor}
              size={64}
              strokeWidth={5}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg">{icon}</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold truncate">{item.category}</p>
              {item.isOverBudget && (
                <Badge variant="destructive" className="text-[9px] px-1.5">
                  OVER
                </Badge>
              )}
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-lg font-bold" style={{ color: statusColor }}>
                {formatCurrency(item.spent, item.currency)}
              </span>
              <span className="text-xs text-muted-foreground">
                / {formatCurrency(item.monthlyLimit, item.currency)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: statusColor }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(item.percentage, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>

            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">
                {item.percentage.toFixed(0)}% used
              </span>
              <span className="text-[10px]" style={{ color: item.remaining >= 0 ? '#00b87a' : '#f4212e' }}>
                {item.remaining >= 0
                  ? `${formatCurrency(item.remaining, item.currency)} left`
                  : `${formatCurrency(Math.abs(item.remaining), item.currency)} over`
                }
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// =================== CREATE/EDIT MODAL ===================
function CategoryModal({ isOpen, onClose, onSuccess, editData }) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    category_name: '',
    monthly_limit: '',
    color: '#1c9cf0',
    icon: 'receipt',
    currency: user?.preferred_currency || 'USD',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editData) {
      setForm({
        category_name: editData.category || editData.category_name || '',
        monthly_limit: editData.monthlyLimit || editData.monthly_limit || '',
        color: editData.color || '#1c9cf0',
        icon: editData.icon || 'receipt',
        currency: editData.currency || user?.preferred_currency || 'USD',
      });
    } else {
      setForm({
        category_name: '',
        monthly_limit: '',
        color: '#1c9cf0',
        icon: 'receipt',
        currency: user?.preferred_currency || 'USD',
      });
    }
    setError('');
  }, [editData, isOpen, user]);

  const handleSubmit = async () => {
    if (!form.category_name.trim()) { setError('Category name required'); return; }
    if (!form.monthly_limit || parseFloat(form.monthly_limit) <= 0) {
      setError('Set a monthly budget limit'); return;
    }
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...form,
        monthly_limit: parseFloat(form.monthly_limit),
      };

      if (editData?.id) {
        await budgetAPI.updateCategory(editData.id, payload);
      } else {
        await budgetAPI.createCategory(payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const COLOR_OPTIONS = [
    '#1c9cf0', '#00b87a', '#f7b928', '#e0245e',
    '#17bf63', '#794bc4', '#ff6b6b', '#45b7d1',
    '#96ceb4', '#f4212e',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? 'Edit Category' : 'New Budget Category'}
      description="Set spending limits for better financial control"
    >
      <div className="space-y-4">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <Input
          label="Category Name"
          placeholder="e.g. Groceries"
          value={form.category_name}
          onChange={(e) => setForm({ ...form, category_name: e.target.value })}
          disabled={!!editData}
        />

        <Input
          label="Monthly Limit"
          type="number"
          placeholder="500"
          icon={DollarSign}
          value={form.monthly_limit}
          onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
          min="0"
          step="0.01"
        />

        {/* Icon Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, icon: opt.value })}
                className={cn(
                  'h-10 w-10 rounded-lg border text-lg flex items-center justify-center transition-all cursor-pointer',
                  form.icon === opt.value
                    ? 'border-primary bg-primary/5 scale-110'
                    : 'border-border hover:border-primary/30'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-all cursor-pointer',
                  form.color === c
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="glow" onClick={handleSubmit} isLoading={loading} className="flex-1">
            {editData ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =================== MAIN BUDGET PAGE ===================
export default function Budget() {
  const { user } = useAuthStore();
  const currency = user?.preferred_currency || 'USD';

  const [overview, setOverview] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const { data } = await budgetAPI.getOverview(selectedMonth);
      if (data.success) setOverview(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const { data } = await budgetAPI.getInsights();
      if (data.success) setInsights(data.data);
    } catch { /* ignore */ }
    setInsightsLoading(false);
  };

  useEffect(() => { fetchOverview(); }, [selectedMonth]);
  useEffect(() => { fetchInsights(); }, []);

  const handleEdit = (item) => {
    setEditData(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this budget category?')) return;
    try {
      await budgetAPI.deleteCategory(id);
      fetchOverview();
    } catch { /* ignore */ }
  };

  const handleCreateNew = () => {
    setEditData(null);
    setShowModal(true);
  };

  // Generate past 6 months for selector
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { value: val, label };
  });

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const summary = overview?.summary;
  const categories = overview?.categories || [];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FadeInView>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Budget Tracker</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track your spending against budget goals
            </p>
          </div>
        </FadeInView>
        <FadeInView delay={0.1}>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <Button variant="glow" size="sm" className="gap-2" onClick={handleCreateNew}>
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          </div>
        </FadeInView>
      </div>

      {/* Summary Stats */}
      {summary && (
        <FadeInView delay={0.1}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Budget', value: summary.totalBudget, color: '#1c9cf0', icon: Target },
              { label: 'Total Spent', value: summary.totalSpent, color: '#f4212e', icon: ArrowUpRight },
              { label: 'Remaining', value: summary.totalRemaining, color: summary.totalRemaining >= 0 ? '#00b87a' : '#f4212e', icon: Wallet },
              { label: 'Income', value: summary.totalIncome, color: '#00b87a', icon: ArrowDownLeft },
              { label: 'Savings Rate', value: `${summary.savingsRate}%`, color: summary.savingsRate >= 20 ? '#00b87a' : '#f7b928', icon: TrendingUp, raw: true },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </div>
                <p className="text-lg font-bold" style={{ color: s.color }}>
                  {s.raw ? s.value : formatCurrency(s.value, currency)}
                </p>
              </div>
            ))}
          </div>
        </FadeInView>
      )}

      {/* Over budget alert */}
      {summary && summary.overBudgetCategories > 0 && (
        <FadeInView delay={0.15}>
          <Card className="bg-destructive/5 border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {summary.overBudgetCategories} categor{summary.overBudgetCategories === 1 ? 'y' : 'ies'} over budget!
                </p>
                <p className="text-xs text-muted-foreground">
                  Review your spending and adjust your limits if needed.
                </p>
              </div>
            </div>
          </Card>
        </FadeInView>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Categories Grid */}
        <div className="lg:col-span-2 space-y-4">
          {categories.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {categories.map((cat) => (
                  <BudgetCategoryCard
                    key={cat.id}
                    item={cat}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="text-center py-12">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <PieChartIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Budget Categories</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create budget categories to start tracking your spending
              </p>
              <Button variant="glow" onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" /> Create Category
              </Button>
            </Card>
          )}
        </div>

        {/* Sidebar — Charts & Insights */}
        <div className="space-y-4">
          {/* Spending Pie Chart */}
          {categories.length > 0 && (
            <FadeInView delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Spending Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categories.filter((c) => c.spent > 0)}
                          dataKey="spent"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={2}
                        >
                          {categories.filter((c) => c.spent > 0).map((cat, i) => (
                            <Cell
                              key={cat.id}
                              fill={cat.color || PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'var(--popover)',
                            border: '1px solid var(--border)',
                            borderRadius: 8, fontSize: 12,
                          }}
                          formatter={(v) => formatCurrency(v, currency)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {categories.filter((c) => c.spent > 0).slice(0, 6).map((cat, i) => (
                      <div key={cat.id} className="flex items-center gap-2 text-xs">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: cat.color || PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate flex-1 text-muted-foreground">
                          {cat.category}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(cat.spent, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
          )}

          {/* AI Insights */}
          <FadeInView delay={0.3}>
            <Card className="bg-accent/30 border-primary/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">AI Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : insights?.insights && insights.insights.length > 0 ? (
                  <div className="space-y-3">
                    {insights.insights.map((insight, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {insight}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Make more transactions to get AI-powered insights!
                  </p>
                )}
              </CardContent>
            </Card>
          </FadeInView>

          {/* Spending Trend */}
          {insights?.spendingTrend && insights.spendingTrend.length > 1 && (
            <FadeInView delay={0.4}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.spendingTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(m) => {
                            const [, mo] = m.split('-');
                            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            return months[parseInt(mo) - 1] || m;
                          }}
                        />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--popover)', border: '1px solid var(--border)',
                            borderRadius: 8, fontSize: 12,
                          }}
                          formatter={(v, name) => [
                            formatCurrency(v, currency),
                            name === 'spending' ? 'Spending' : 'Income',
                          ]}
                        />
                        <Bar dataKey="income" fill="#00b87a" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="spending" fill="#f4212e" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSuccess={fetchOverview}
        editData={editData}
      />
    </div>
  );
}