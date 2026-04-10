import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Plus, BarChart3,
  PieChart as PieIcon, Shield, AlertTriangle,
  Trash2, Edit3, DollarSign, Briefcase,
  Activity, Target, Award, Lightbulb, RefreshCw,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { investmentAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  stocks: { label: 'Stocks', icon: '📈', color: '#1c9cf0' },
  bonds: { label: 'Bonds', icon: '📄', color: '#00b87a' },
  mutual_funds: { label: 'Mutual Funds', icon: '📊', color: '#f7b928' },
  crypto: { label: 'Crypto', icon: '₿', color: '#794bc4' },
  fixed_deposit: { label: 'Fixed Deposit', icon: '🏦', color: '#e0245e' },
};

const PIE_COLORS = ['#1c9cf0', '#00b87a', '#f7b928', '#794bc4', '#e0245e', '#45b7d1'];

const RISK_CONFIG = {
  low: { label: 'Low Risk', color: '#00b87a', icon: Shield },
  medium: { label: 'Medium Risk', color: '#f7b928', icon: Activity },
  high: { label: 'High Risk', color: '#f4212e', icon: AlertTriangle },
  none: { label: 'No Data', color: '#72767a', icon: Target },
};

// =================== INVESTMENT CARD ===================
const InvestmentCard = ({ item, onEdit, onDelete, className }) => {
  const type = TYPE_CONFIG[item.investment_type] || TYPE_CONFIG.stocks;
  const isPositive = Number(item.gain_loss) >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={className}
    >
      <Card hover className="relative group overflow-hidden h-full">
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: type.color }}
        />

        {/* Actions */}
        <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="p-1.5 rounded-lg bg-muted/80 hover:bg-accent transition-colors"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="p-1.5 rounded-lg bg-muted/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-base shrink-0"
              style={{ backgroundColor: `${type.color}15` }}
            >
              {type.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-none mb-1">{item.name}</p>
              <div className="flex items-center gap-1.5">
                {item.symbol && (
                  <span className="text-[9px] text-muted-foreground font-mono bg-muted/30 px-1 rounded">
                    {item.symbol}
                  </span>
                )}
                <Badge variant="muted" className="text-[8px] py-0 h-3.5">{type.label}</Badge>
              </div>
            </div>
          </div>

          {/* Value */}
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Total Value</p>
              <p className="text-lg font-bold leading-none">
                {formatCurrency(item.total_value, item.currency)}
              </p>
            </div>
            <div className="text-right">
              <div className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-0.5',
                isPositive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
              )}>
                {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {isPositive ? '+' : ''}{Number(item.gain_loss_percentage).toFixed(2)}%
              </div>
              <p className={cn(
                'text-[10px] font-semibold leading-none',
                isPositive ? 'text-success/90' : 'text-destructive/90'
              )}>
                {isPositive ? '+' : ''}{formatCurrency(item.gain_loss, item.currency)}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-2 w-2 rounded-full',
                RISK_CONFIG[item.risk_category]?.color ? '' : 'bg-muted'
              )} style={{ backgroundColor: RISK_CONFIG[item.risk_category]?.color }} />
              <span className="text-[10px] font-medium capitalize text-muted-foreground">
                {item.risk_category || 'Medium'} Risk
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground font-mono">
                Purchased: {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border mt-3 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground">Qty</p>
              <p className="text-xs font-medium">{Number(item.quantity).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Avg Price</p>
              <p className="text-xs font-medium">{formatCurrency(item.purchase_price, item.currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Current</p>
              <p className="text-xs font-medium">{formatCurrency(item.current_price, item.currency)}</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// =================== ADD/EDIT MODAL ===================
function InvestmentModal({ isOpen, onClose, onSuccess, editData }) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    investment_type: 'stocks',
    name: '',
    symbol: '',
    quantity: '',
    purchase_price: '',
    current_price: '',
    currency: user?.preferred_currency || 'USD',
    risk_category: 'medium',
    purchase_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editData) {
      setForm({
        investment_type: editData.investment_type || 'stocks',
        name: editData.name || '',
        symbol: editData.symbol || '',
        quantity: editData.quantity || '',
        purchase_price: editData.purchase_price || '',
        current_price: editData.current_price || '',
        currency: editData.currency || user?.preferred_currency || 'USD',
        risk_category: editData.risk_category || 'medium',
        purchase_date: editData.purchase_date ? new Date(editData.purchase_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      });
    } else {
      setForm({
        investment_type: 'stocks', name: '', symbol: '',
        quantity: '', purchase_price: '', current_price: '',
        currency: user?.preferred_currency || 'USD',
        risk_category: 'medium',
        purchase_date: new Date().toISOString().split('T')[0],
      });
    }
    setError('');
  }, [editData, isOpen, user]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name required'); return; }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { setError('Enter quantity'); return; }
    if (!form.purchase_price || parseFloat(form.purchase_price) <= 0) { setError('Enter purchase price'); return; }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...form,
        quantity: parseFloat(form.quantity),
        purchase_price: parseFloat(form.purchase_price),
        current_price: parseFloat(form.current_price) || parseFloat(form.purchase_price),
      };

      if (editData?.id) {
        await investmentAPI.update(editData.id, payload);
      } else {
        await investmentAPI.add(payload);
      }
      onSuccess?.();
      onClose();
      toast.success(editData ? 'Investment updated!' : 'Investment added!');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save';
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
      title={editData ? 'Edit Investment' : 'Add Investment'}
      size="lg"
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

        {/* Type Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm({ ...form, investment_type: key })}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all cursor-pointer',
                  form.investment_type === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <span className="text-lg">{config.icon}</span>
                <span className="text-[10px] font-medium">{config.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Name"
            placeholder="Apple Inc."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Symbol (optional)"
            placeholder="AAPL"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Quantity"
            type="number"
            placeholder="10"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            min="0" step="0.01"
          />
          <Input
            label="Purchase Price"
            type="number"
            placeholder={formatCurrency(150, form.currency).replace(/[0-9.,\s]/g, '') + '150.00'}
            icon={null} // Remove hardcoded dollar icon
            prefix={<span className="text-muted-foreground font-bold text-xs">{form.currency === 'USD' ? '$' : form.currency}</span>}
            value={form.purchase_price}
            onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
            min="0" step="0.01"
          />
          <Input
            label="Current Price"
            type="number"
            placeholder={formatCurrency(175, form.currency).replace(/[0-9.,\s]/g, '') + '175.00'}
            icon={null}
            prefix={<span className="text-muted-foreground font-bold text-xs">{form.currency === 'USD' ? '$' : form.currency}</span>}
            value={form.current_price}
            onChange={(e) => setForm({ ...form, current_price: e.target.value })}
            min="0" step="0.01"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Risk Category</label>
            <select
              value={form.risk_category}
              onChange={(e) => setForm({ ...form, risk_category: e.target.value })}
              className="flex h-11 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-all"
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
          <Input
            label="Purchase Date"
            type="date"
            value={form.purchase_date}
            onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="glow" onClick={handleSubmit} isLoading={loading} className="flex-1">
            {editData ? 'Update' : 'Add Investment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =================== MAIN INVESTMENTS PAGE ===================
export default function Investments() {
  const { user } = useAuthStore();
  const currency = user?.preferred_currency || 'USD';

  const [data, setData] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perfLoading, setPerfLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: res } = await investmentAPI.getAll();
      if (res.success) setData(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchPerformance = async () => {
    setPerfLoading(true);
    try {
      const { data: res } = await investmentAPI.getPerformance();
      if (res.success) setPerformance(res.data);
    } catch { /* ignore */ }
    setPerfLoading(false);
  };

  useEffect(() => { fetchAll(); fetchPerformance(); }, []);

  const handleEdit = (item) => { setEditData(item); setShowModal(true); };
  const handleDelete = async (id) => {
    if (!confirm('Remove this investment?')) return;
    try {
      await investmentAPI.delete(id);
      toast.success('Investment removed.');
      fetchAll();
      fetchPerformance();
    } catch {
      toast.error('Failed to remove investment.');
    }
  };

  if (loading && !data) {
    return <div className="flex items-center justify-center h-[60vh]"><LoadingSpinner size="lg" /></div>;
  }

  const portfolio = data?.portfolio;
  const investments = data?.investments || [];
  const risk = performance?.riskAnalysis;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FadeInView>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Investments</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your portfolio performance</p>
          </div>
        </FadeInView>
        <FadeInView delay={0.1}>
          <Button variant="glow" size="sm" className="gap-2" onClick={() => { setEditData(null); setShowModal(true); }}>
            <Plus className="h-4 w-4" /> Add Investment
          </Button>
        </FadeInView>
      </div>

      {/* Portfolio Summary */}
      {portfolio && (
        <FadeInView delay={0.1}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Value', value: portfolio.totalValue, color: '#1c9cf0', icon: Briefcase },
              { label: 'Total Invested', value: portfolio.totalInvested, color: '#72767a', icon: DollarSign },
              {
                label: 'Overall Gain',
                value: portfolio.totalGainLoss,
                color: portfolio.totalGainLoss >= 0 ? '#00b87a' : '#f4212e',
                icon: portfolio.totalGainLoss >= 0 ? TrendingUp : TrendingDown,
                prefix: portfolio.totalGainLoss >= 0 ? '+' : '',
              },
              {
                label: 'Net Return',
                value: `${portfolio.overallPercentage >= 0 ? '+' : ''}${portfolio.overallPercentage}%`,
                color: portfolio.overallPercentage >= 0 ? '#00b87a' : '#f4212e',
                icon: BarChart3,
                raw: true,
              },
            ].map((s) => (
              <Card key={s.label} className="border-border/30 bg-card/40 backdrop-blur-sm group hover:border-primary/30 transition-all duration-300">
                <div className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${s.color}10` }}>
                    <s.icon className="h-5 w-5" style={{ color: s.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mb-1.5 font-bold">{s.label}</p>
                    <p className="text-lg font-black leading-none truncate" style={{ color: s.color }}>
                      {s.raw ? s.value : `${s.prefix || ''}${formatCurrency(s.value, currency)}`}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </FadeInView>
      )}

      {/* Primary Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Row 1 Left: Trend Chart */}
        <div className="lg:col-span-2 space-y-6">
          {performance?.history && (
            <FadeInView delay={0.2}>
              <Card className="overflow-hidden border-border/40 bg-card/30">
                <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-border/10">
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Portfolio Trajectory
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                      <span className="text-[10px] font-bold text-muted-foreground">VALUE</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                      <span className="text-[10px] font-bold text-muted-foreground">COST BASIS</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[280px] min-h-[280px] w-full p-4">
                    <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                      <AreaChart data={performance.history}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }}
                        />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(15, 23, 42, 0.9)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                          }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(v) => [formatCurrency(v, currency), '']}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="var(--primary)"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorValue)"
                          animationDuration={2000}
                        />
                        <Area
                          type="monotone"
                          dataKey="invested"
                          stroke="var(--muted-foreground)"
                          strokeWidth={2}
                          strokeDasharray="6 6"
                          fill="transparent"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
          )}

          {/* Holdings Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                Asset Inventory
              </h2>
            </div>
            
            {investments.length > 0 ? (
              <div className={cn(
                "grid gap-4",
                investments.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              )}>
                <AnimatePresence mode="popLayout">
                  {investments.map((inv) => (
                    <InvestmentCard 
                      key={inv.id} 
                      item={inv} 
                      onEdit={handleEdit} 
                      onDelete={handleDelete}
                      className={investments.length === 1 ? "md:p-6" : ""} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <Card className="text-center py-16 border-dashed border-2 border-border/40">
                <div className="mx-auto h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
                  <Briefcase className="h-10 w-10 text-primary/40" />
                </div>
                <h3 className="text-xl font-bold mb-2">Portfolio Empty</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto text-balance">
                  Start mapping your financial future by adding your first asset.
                </p>
                <Button variant="glow" onClick={() => { setEditData(null); setShowModal(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Initialize Investment
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Allocation Widget */}
          {portfolio?.byType && portfolio.byType.length > 0 && (
            <FadeInView delay={0.3}>
              <Card className="border-border/40 bg-card/40 overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-border/10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Allocation Distribution</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[200px] min-h-[200px] mb-6">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <PieChart>
                        <Pie
                          data={portfolio.byType}
                          dataKey="value"
                          nameKey="type"
                          cx="50%" cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {portfolio.byType.map((_, i) => (
                            <Cell key={i} fill={Object.values(TYPE_CONFIG)[i]?.color || PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            fontSize: 10,
                            fontWeight: 700
                          }}
                          formatter={(v) => formatCurrency(v, currency)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {portfolio.byType.map((t) => {
                      const config = TYPE_CONFIG[t.type] || {};
                      return (
                        <div key={t.type} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors group">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0 shadow-[0_0_6px_var(--color)]" style={{ background: config.color, '--color': config.color }} />
                          <span className="text-[10px] font-bold text-muted-foreground truncate flex-1 uppercase tracking-tight">{config.label || t.type}</span>
                          <span className="text-xs font-black">{t.percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
          )}

          {/* Risk Intelligence Widget */}
          {risk && (
            <FadeInView delay={0.4}>
              <Card className="border-border/40 bg-card/40">
                <CardHeader className="py-4 px-6 border-b border-border/10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Risk Intel</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-muted/20 border border-border/10">
                    {(() => {
                      const config = RISK_CONFIG[risk.riskLevel] || RISK_CONFIG.none;
                      const RIcon = config.icon;
                      return (
                        <>
                          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}15` }}>
                            <RIcon className="h-6 w-6" style={{ color: config.color }} />
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight mb-1" style={{ color: config.color }}>{config.label}</p>
                            <p className="text-[10px] text-muted-foreground font-bold leading-none">
                              DIVERSIFICATION: {risk.diversificationScore}%
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between text-[10px] mb-2 font-black text-muted-foreground uppercase tracking-widest">
                      <span>Health Score</span>
                      <span className="text-foreground">{risk.diversificationScore}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden p-[2px]">
                      <motion.div
                        className="h-full rounded-full shadow-[0_0_10px_var(--color)]"
                        style={{
                          backgroundColor: risk.diversificationScore >= 60 ? '#00b87a' : risk.diversificationScore >= 30 ? '#f7b928' : '#f4212e',
                          '--color': risk.diversificationScore >= 60 ? '#00b87a' : risk.diversificationScore >= 30 ? '#f7b928' : '#f4212e'
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${risk.diversificationScore}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {risk.suggestions && risk.suggestions.length > 0 && (
                    <div className="space-y-3 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                      <p className="text-[10px] font-black text-primary uppercase flex items-center gap-2 tracking-[0.15em]">
                        <Lightbulb className="h-3.5 w-3.5" />
                        AI Insights
                      </p>
                      {risk.suggestions.slice(0, 3).map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground leading-relaxed font-medium border-l-2 border-primary/20 pl-3">{s}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeInView>
          )}

          {/* Top Gainers Widget */}
          {performance?.topGainers && performance.topGainers.length > 0 && (
            <FadeInView delay={0.5}>
              <Card className="border-border/40 bg-card/40">
                <CardHeader className="py-4 px-6 border-b border-border/10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Top Alpha</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {performance.topGainers.slice(0, 3).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/10 hover:bg-success/10 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl group-hover:scale-125 transition-transform">{TYPE_CONFIG[inv.investment_type]?.icon || '📊'}</span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-tight truncate leading-none mb-1">{inv.name}</p>
                            <p className="text-[9px] text-muted-foreground font-bold leading-none">{inv.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-success">
                            +{Number(inv.gain_loss_percentage).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
          )}
        </div>
      </div>

      <InvestmentModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSuccess={() => { fetchAll(); fetchPerformance(); }}
        editData={editData}
      />
    </div>
  );
}