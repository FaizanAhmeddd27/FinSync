import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart as PieChartIcon, Plus, Target, TrendingUp,
  AlertTriangle, Sparkles, Edit3, Trash2, Lightbulb, 
  DollarSign, ArrowUpRight, ArrowDownLeft, Wallet, 
  BarChart3, Calendar, PiggyBank, Receipt, CheckCircle2, History,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { CardHeader, Card, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { budgetAPI, transactionAPI, accountAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

function ExpenseModal({ isOpen, onClose, onSuccess, categoryName }) {
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    account_id: '',
    amount: '',
    description: '',
    category: categoryName || '',
    type: 'debit',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data } = await accountAPI.getAll();
        const accountsList = data.data?.accounts || [];
        setAccounts(accountsList);
        if (accountsList.length > 0) {
          setForm(prev => ({ ...prev, account_id: accountsList[0].id }));
        }
      } catch (err) { /* ignore */ }
    };
    if (isOpen) {
      fetchAccounts();
      setForm(prev => ({ ...prev, category: categoryName, amount: '', description: '' }));
    }
  }, [isOpen, categoryName]);

  const handleSubmit = async () => {
    if (!form.account_id) { setError('Select an account'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Enter a valid amount'); return; }
    
    setLoading(true);
    try {
      await transactionAPI.create({
        ...form,
        amount: parseFloat(form.amount),
      });
      toast.success('Expense recorded successfully!');
      onSuccess?.();
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to log expense';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log ${categoryName} Expense`}
      description="Manually record a transaction for this budget"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Account</label>
          <select
            value={form.account_id}
            onChange={(e) => setForm({ ...form, account_id: e.target.value })}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_type.toUpperCase()} - {acc.currency} ({formatCurrency(acc.balance, acc.currency)})
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Amount"
          type="number"
          placeholder={formatCurrency(0, user?.preferred_currency || 'USD').replace(/[0-9.,\s]/g, '') + '0.00'}
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          icon={null}
          prefix={<span className="text-muted-foreground font-bold text-xs">{(user?.preferred_currency || 'USD') === 'USD' ? '$' : (user?.preferred_currency || 'USD')}</span>}
        />

        <Input
          label="Description"
          placeholder="What was this for?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div className="flex gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button variant="glow" onClick={handleSubmit} isLoading={loading} className="flex-1 rounded-xl">
            Record Expense
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =================== CATEGORY TRANSACTIONS MODAL ===================
function CategoryTransactionsModal({ isOpen, onClose, categoryName, month, onSuccess, currency }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await transactionAPI.getAll({
        category: categoryName,
        start_date: `${month}-01T00:00:00.000Z`,
        // approximate end of month
        end_date: `${month}-31T23:59:59.000Z`,
      });
      setTransactions(data.data?.transactions || []);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchTransactions();
  }, [isOpen, categoryName, month]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction? The balance will be adjusted.')) return;
    try {
      await transactionAPI.delete(id);
      toast.success('Transaction deleted.');
      fetchTransactions();
      onSuccess?.();
    } catch (err) {
      toast.error('Failed to delete transaction.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${categoryName} Activity`}
      description={`Spending history for ${new Date(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner size="sm" /></div>
        ) : transactions.length > 0 ? (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {transactions.map((txn) => (
              <div key={txn.id} className="p-3 rounded-xl bg-muted/30 border border-border/20 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">{txn.description}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-destructive">
                    -{formatCurrency(txn.amount, currency)}
                  </span>
                  <button 
                    onClick={() => handleDelete(txn.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground text-xs uppercase font-bold tracking-widest">
            No manual transactions found
          </div>
        )}
        
        <div className="pt-4 border-t border-border/20">
          <Button variant="ghost" onClick={onClose} className="w-full rounded-xl">Close</Button>
        </div>
      </div>
    </Modal>
  );
}

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

function BudgetCategoryCard({ item, onEdit, onDelete, onLog, onHistory }) {
  const icon = CATEGORY_ICONS[item.icon] || '📊';
  const statusColor =
    item.status === 'over_budget'
      ? '#f4212e'
      : item.status === 'warning'
      ? '#f7b928'
      : '#00b87a';

  const secondaryColor = 
    item.status === 'over_budget'
      ? 'rgba(244, 33, 46, 0.1)'
      : item.status === 'warning'
      ? 'rgba(247, 185, 40, 0.1)'
      : 'rgba(0, 184, 122, 0.1)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden group border-border/40 hover:border-primary/30 transition-all duration-300">
        {/* Background Glow */}
        <div 
          className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
          style={{ backgroundColor: statusColor }}
        />

        {/* Actions - Hidden by default */}
        <div className="absolute top-3 right-3 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
          <button
            onClick={(e) => { e.stopPropagation(); onLog(item); }}
            title="Log Expense"
            className="p-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-success/10 hover:text-success transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onHistory(item); }}
            title="View History"
            className="p-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-amber-500/10 hover:text-amber-500 transition-all shadow-sm"
          >
            <History className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            title="Edit Budget"
            className="p-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            title="Delete Budget"
            className="p-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-destructive/10 hover:text-destructive transition-all shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-4 pt-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner"
                style={{ backgroundColor: secondaryColor }}
              >
                {icon}
              </div>
              <div>
                <h4 className="font-bold text-base tracking-tight">{item.category}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge 
                    className="text-[10px] px-1.5 py-0 h-4 border-none"
                    style={{ 
                      backgroundColor: secondaryColor,
                      color: statusColor 
                    }}
                  >
                    {item.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {item.isOverBudget && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 uppercase animate-pulse">
                      ALERT
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block mb-0.5 uppercase tracking-tighter">Spent</span>
              <span className="text-lg font-black tracking-tighter" style={{ color: statusColor }}>
                {formatCurrency(item.spent, item.currency)}
              </span>
            </div>
          </div>

          {/* New Modern Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[11px] text-muted-foreground font-medium">
                {item.percentage.toFixed(0)}% Utilized
              </span>
              <span className="text-[11px] font-bold">
                Goal: {formatCurrency(item.monthlyLimit, item.currency)}
              </span>
            </div>
            <div className="w-full h-3 bg-muted/40 rounded-full overflow-hidden border border-border/20 shadow-inner">
              <motion.div
                className="h-full rounded-full relative"
                style={{ 
                  backgroundColor: statusColor,
                  boxShadow: `0 0 15px ${statusColor}40`
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(item.percentage, 100)}%` }}
                transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              </motion.div>
            </div>
          </div>

          <div className="flex justify-between mt-4 pt-3 border-t border-border/40">
            <div className="flex items-center gap-1">
              {item.remaining >= 0 ? (
                <CheckCircle2 className="h-3 w-3 text-success" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-destructive" />
              )}
              <span className="text-[11px] text-muted-foreground uppercase font-bold">
                {item.remaining >= 0 ? "Under Control" : "Over Spent"}
              </span>
            </div>
            <span 
              className="text-xs font-black tracking-tight"
              style={{ color: item.remaining >= 0 ? '#00b87a' : '#f4212e' }}
            >
              {item.remaining >= 0
                ? `${formatCurrency(item.remaining, item.currency)} Left`
                : `${formatCurrency(Math.abs(item.remaining), item.currency)} Over`
              }
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// Reuse CategoryModal with updated styling
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
      toast.success(editData ? 'Category updated!' : 'Category created!');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save category';
      setError(errMsg);
      toast.error(errMsg);
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
          placeholder={formatCurrency(500, user?.preferred_currency || 'USD').replace(/[0-9.,\s]/g, '') + '500.00'}
          icon={null}
          prefix={<span className="text-muted-foreground font-bold text-xs">{(user?.preferred_currency || 'USD') === 'USD' ? '$' : (user?.preferred_currency || 'USD')}</span>}
          value={form.monthly_limit}
          onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
          min="0"
          step="0.01"
        />

        {/* Icon Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Icon</label>
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, icon: opt.value })}
                className={cn(
                  'h-10 w-10 rounded-xl border text-lg flex items-center justify-center transition-all cursor-pointer',
                  form.icon === opt.value
                    ? 'border-primary bg-primary/10 shadow-sm scale-105'
                    : 'border-border/40 hover:border-primary/30'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Accent Color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-all cursor-pointer',
                  form.color === c
                    ? 'border-foreground scale-110 shadow-md'
                    : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button variant="glow" onClick={handleSubmit} isLoading={loading} className="flex-1 rounded-xl">
            {editData ? 'Save Changes' : 'Create Category'}
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
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

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
      toast.success('Budget category deleted.');
      fetchOverview();
    } catch {
      toast.error('Failed to delete category.');
    }
  };

  const handleCreateNew = () => {
    setEditData(null);
    setShowModal(true);
  };

  const handleLogExpense = (cat) => {
    setSelectedCategory(cat.category);
    setShowExpenseModal(true);
  };

  const handleShowHistory = (cat) => {
    setSelectedCategory(cat.category);
    setShowHistoryModal(true);
  };

  // Generate past 12 months for selector
  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
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
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <FadeInView>
          <div className="space-y-1">
            <Badge variant="glow" className="mb-2 px-3 py-1 text-[10px] uppercase font-bold tracking-widest bg-primary/20 text-primary border-none">
              Financial Control
            </Badge>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              Budget Tracker 
            </h1>
            <p className="text-muted-foreground text-sm max-w-md">
              Optimize your wealth by tracking spending against your customized financial goals.
            </p>
          </div>
        </FadeInView>

        <FadeInView delay={0.1}>
          <div className="flex items-center gap-3 p-1 bg-muted/30 rounded-2xl border border-border/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 pl-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-sm font-bold focus:ring-0 py-2 cursor-pointer pr-8"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value} className="bg-card">{m.label}</option>
                ))}
              </select>
            </div>
            <Button variant="glow" size="sm" className="gap-2 rounded-xl py-5 px-6" onClick={handleCreateNew}>
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          </div>
        </FadeInView>
      </div>

      {/* Hero Stats Section - Premium Cards */}
      {summary && (
        <FadeInView delay={0.2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              { label: 'Monthly Goal', value: summary.totalBudget, color: 'text-primary', icon: Target, bg: 'bg-primary/5', trend: 'Total planned limit' },
              { label: 'Actual Spent', value: summary.totalSpent, color: 'text-destructive', icon: ArrowUpRight, bg: 'bg-destructive/5', trend: `${summary.overallPercentage.toFixed(1)}% of budget` },
              { label: 'Remaining', value: summary.totalRemaining, color: summary.totalRemaining >= 0 ? 'text-success' : 'text-destructive', icon: Wallet, bg: summary.totalRemaining >= 0 ? 'bg-success/5' : 'bg-destructive/5', trend: 'Available to save' },
              { label: 'Income Ref', value: summary.totalIncome, color: 'text-success', icon: ArrowDownLeft, bg: 'bg-success/5', trend: 'Month-to-date' },
              { label: 'Savings Rate', value: `${summary.savingsRate}%`, color: summary.savingsRate >= 20 ? 'text-success' : 'text-amber-500', icon: PiggyBank, bg: 'bg-amber-500/5', trend: summary.savingsRate >= 20 ? 'Excellent' : 'Aim for 20%+', raw: true },
            ].map((s, idx) => (
              <Card key={idx} className="border-border/40 overflow-hidden relative group">
                {/* Decorative background element */}
                <div className={cn("absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-10", s.bg.replace('bg-', 'bg-'))} />
                
                <div className="p-5 relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("p-2.5 rounded-xl border border-border/40", s.bg)}>
                      <s.icon className={cn("h-5 w-5", s.color)} />
                    </div>
                    {s.raw && (
                        <div className="h-8 w-24">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[{v: parseFloat(s.value)}]}>
                                    <Bar dataKey="v" fill="#00b87a" radius={2} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">{s.label}</p>
                  <h3 className={cn("text-2xl font-black tracking-tighter", s.color)}>
                    {s.raw ? s.value : formatCurrency(s.value, currency)}
                  </h3>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-3 w-3 text-muted-foreground/40" />
                    <p className="text-[10px] text-muted-foreground/60 font-medium">{s.trend}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </FadeInView>
      )}

      {/* Urgent Alerts - Higher visual weight */}
      {summary && summary.overBudgetCategories > 0 && (
        <FadeInView delay={0.25}>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/20 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-destructive/5 to-transparent pointer-events-none" />
            <div className="h-14 w-14 rounded-2xl bg-destructive/20 flex items-center justify-center shrink-0 shadow-lg">
              <AlertTriangle className="h-7 w-7 text-destructive animate-bounce" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-lg font-black text-destructive tracking-tight">
                CRITICAL LIMIT REACHED
              </h4>
              <p className="text-sm text-destructive/80 font-medium">
                You have <b>{summary.overBudgetCategories}</b> budget {summary.overBudgetCategories === 1 ? 'category' : 'categories'} in the red. Consider re-allocating funds from "Remaining" categories to cover the deficit.
              </p>
            </div>
            <Button variant="destructive" size="sm" className="rounded-xl px-6 h-11 shadow-sm" onClick={() => {}}>
              Fix Allocation
            </Button>
          </motion.div>
        </FadeInView>
      )}

      {/* Main Content Layout */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Categories Grid - 8 columns */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              Budget Categories <Badge className="bg-muted text-muted-foreground pointer-events-none">{categories.length}</Badge>
            </h2>
          </div>

          {categories.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-5">
              <AnimatePresence mode="popLayout">
                {categories.map((cat) => (
                  <BudgetCategoryCard
                    key={cat.id}
                    item={cat}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onLog={handleLogExpense}
                    onHistory={handleShowHistory}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="text-center py-20 border-dashed border-2 bg-muted/10">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-background flex items-center justify-center mb-6 shadow-xl border border-border">
                <Target className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-2xl font-black mb-2">No Financial Goals Set</h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
                Setting a budget is the first step to financial freedom. Start by adding your first category.
              </p>
              <Button variant="glow" size="lg" className="rounded-2xl px-8" onClick={handleCreateNew}>
                <Plus className="h-5 w-5 mr-2" /> Start Now
              </Button>
            </Card>
          )}
        </div>

        {/* Sidebar - 4 columns */}
        <div className="lg:col-span-4 space-y-6">
          {/* Spending Distribution */}
          {categories.length > 0 && (
            <FadeInView delay={0.3}>
              <Card className="border-border/40 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-black tracking-tight">Spending Flow</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                      <PieChart>
                        <Pie
                          data={categories.filter((c) => c.spent > 0)}
                          dataKey="spent"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={60}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {categories.filter((c) => c.spent > 0).map((cat, i) => (
                            <Cell
                              key={cat.id}
                              fill={cat.color || PIE_COLORS[i % PIE_COLORS.length]}
                              className="outline-none hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-popover border border-border p-3 rounded-xl shadow-2xl backdrop-blur-md">
                                        <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">{data.category}</p>
                                        <p className="text-sm font-bold text-foreground">{formatCurrency(data.spent, currency)}</p>
                                    </div>
                                );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center stats */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                        <span className="text-[10px] font-black text-muted-foreground uppercase">Total</span>
                        <span className="text-xl font-black">{formatCurrency(summary?.totalSpent || 0, currency)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    {categories.filter((c) => c.spent > 0).slice(0, 5).map((cat, i) => (
                      <div key={cat.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full shadow-sm"
                            style={{ background: cat.color || PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                            {cat.category}
                          </span>
                        </div>
                        <span className="text-xs font-black tabular-nums">
                          {((cat.spent / (summary?.totalSpent || 1)) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
          )}

          {/* AI Insights - High interactivity style */}
          <FadeInView delay={0.4}>
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-emerald-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <Card className="bg-card/50 backdrop-blur-xl border-border/40 rounded-[2rem] overflow-hidden relative">
                    <CardHeader className="pb-3 border-b border-border/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg font-black tracking-tight">FinSync AI</CardTitle>
                            </div>
                            <Badge className="bg-primary/20 text-primary border-none text-[9px]">LIVE ANALYSIS</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {insightsLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <LoadingSpinner size="sm" />
                            <p className="text-[10px] font-bold text-muted-foreground animate-pulse uppercase">Auditing transactions...</p>
                        </div>
                        ) : insights?.insights && insights.insights.length > 0 ? (
                        <div className="space-y-4">
                            {insights.insights.map((insight, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.15 }}
                                className="p-3.5 rounded-2xl bg-muted/30 border border-border/20 relative group/insight hover:bg-muted/50 transition-colors"
                            >
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full opacity-50 group-hover/insight:opacity-100 transition-opacity" />
                                <div className="flex items-start gap-3 pl-1">
                                    <div className="p-1.5 rounded-lg bg-background shadow-sm mt-0.5">
                                        <Lightbulb className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-xs font-bold text-foreground/90 leading-relaxed italic">
                                        "{insight}"
                                    </p>
                                </div>
                            </motion.div>
                            ))}
                        </div>
                        ) : (
                        <div className="text-center py-8">
                            <div className="mb-4 inline-flex p-4 rounded-3xl bg-muted/20">
                                <BarChart3 className="h-8 w-8 text-muted-foreground/20" />
                            </div>
                            <p className="text-xs font-black text-muted-foreground uppercase max-w-[150px] mx-auto leading-relaxed">
                                Accumulating data for intelligence...
                            </p>
                        </div>
                        )}
                        <div className="mt-8 pt-4 border-t border-border/20 flex items-center justify-between">
                            <span className="text-[9px] font-black text-muted-foreground uppercase opacity-50">Insights level 1.0</span>
                            <div className="flex gap-1">
                                {[1,2,3].map(i => <div key={i} className="h-1 w-1 rounded-full bg-primary/30" />)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </FadeInView>
          
          {/* Monthly Trend Mini Chart */}
            <FadeInView delay={0.5}>
              <Card className="border-border/40 overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-base font-black tracking-tight">Financial Velocity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[120px] min-h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                      <BarChart data={insights?.spendingTrend?.slice(-4) || []}>
                        <XAxis 
                            dataKey="month" 
                            hide 
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', background: '#111' }}
                            itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="income" fill="#00b87a" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="spending" fill="#f4212e" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-success" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Cash In</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-destructive" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Cash Out</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
        </div>
      </div>

      <CategoryModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSuccess={fetchOverview}
        editData={editData}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={fetchOverview}
        categoryName={selectedCategory}
      />

      <CategoryTransactionsModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        categoryName={selectedCategory}
        month={selectedMonth}
        onSuccess={fetchOverview}
        currency={currency}
      />
    </div>
  );
}