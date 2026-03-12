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
function InvestmentCard({ item, onEdit, onDelete }) {
  const type = TYPE_CONFIG[item.investment_type] || TYPE_CONFIG.stocks;
  const isPositive = Number(item.gain_loss) >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card hover className="relative group overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: type.color }}
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

        <div className="pt-3">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: `${type.color}15` }}
            >
              {type.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{item.name}</p>
              <div className="flex items-center gap-2">
                {item.symbol && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {item.symbol}
                  </span>
                )}
                <Badge variant="muted" className="text-[9px]">{type.label}</Badge>
              </div>
            </div>
          </div>

          {/* Value */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-xl font-bold">
                {formatCurrency(item.total_value, item.currency)}
              </p>
            </div>
            <div className="text-right">
              <div className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isPositive ? '+' : ''}{Number(item.gain_loss_percentage).toFixed(2)}%
              </div>
              <p className={cn(
                'text-xs font-medium mt-0.5',
                isPositive ? 'text-success' : 'text-destructive'
              )}>
                {isPositive ? '+' : ''}{formatCurrency(item.gain_loss, item.currency)}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border text-center">
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
      });
    } else {
      setForm({
        investment_type: 'stocks', name: '', symbol: '',
        quantity: '', purchase_price: '', current_price: '',
        currency: user?.preferred_currency || 'USD',
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
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
            placeholder="150.00"
            icon={DollarSign}
            value={form.purchase_price}
            onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
            min="0" step="0.01"
          />
          <Input
            label="Current Price"
            type="number"
            placeholder="175.00"
            icon={DollarSign}
            value={form.current_price}
            onChange={(e) => setForm({ ...form, current_price: e.target.value })}
            min="0" step="0.01"
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
    try { await investmentAPI.delete(id); fetchAll(); fetchPerformance(); } catch { /* ignore */ }
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
                label: 'Gain / Loss',
                value: portfolio.totalGainLoss,
                color: portfolio.totalGainLoss >= 0 ? '#00b87a' : '#f4212e',
                icon: portfolio.totalGainLoss >= 0 ? TrendingUp : TrendingDown,
                prefix: portfolio.totalGainLoss >= 0 ? '+' : '',
              },
              {
                label: 'Overall Return',
                value: `${portfolio.overallPercentage >= 0 ? '+' : ''}${portfolio.overallPercentage}%`,
                color: portfolio.overallPercentage >= 0 ? '#00b87a' : '#f4212e',
                icon: BarChart3,
                raw: true,
              },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </div>
                <p className="text-lg font-bold" style={{ color: s.color }}>
                  {s.raw ? s.value : `${s.prefix || ''}${formatCurrency(s.value, currency)}`}
                </p>
              </div>
            ))}
          </div>
        </FadeInView>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Holdings */}
        <div className="lg:col-span-2 space-y-4">
          {investments.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {investments.map((inv) => (
                  <InvestmentCard key={inv.id} item={inv} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="text-center py-12">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Investments Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first investment to start tracking
              </p>
              <Button variant="glow" onClick={() => { setEditData(null); setShowModal(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Investment
              </Button>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Allocation Chart */}
          {portfolio?.byType && portfolio.byType.length > 0 && (
            <FadeInView delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfolio.byType}
                          dataKey="value"
                          nameKey="type"
                          cx="50%" cy="50%"
                          outerRadius={70}
                          innerRadius={35}
                          paddingAngle={2}
                        >
                          {portfolio.byType.map((_, i) => (
                            <Cell key={i} fill={Object.values(TYPE_CONFIG)[i]?.color || PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'var(--popover)', border: '1px solid var(--border)',
                            borderRadius: 8, fontSize: 12,
                          }}
                          formatter={(v) => formatCurrency(v, currency)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {portfolio.byType.map((t) => {
                      const config = TYPE_CONFIG[t.type] || {};
                      return (
                        <div key={t.type} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: config.color }} />
                          <span className="text-muted-foreground flex-1">{config.label || t.type}</span>
                          <span className="font-medium">{t.percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
          )}

          {/* Risk Analysis */}
          {risk && (
            <FadeInView delay={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risk Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Risk Level */}
                  <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/50">
                    {(() => {
                      const config = RISK_CONFIG[risk.riskLevel] || RISK_CONFIG.none;
                      const RIcon = config.icon;
                      return (
                        <>
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
                            <RIcon className="h-5 w-5" style={{ color: config.color }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: config.color }}>{config.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Diversification: {risk.diversificationScore}%
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Diversification Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Diversification Score</span>
                      <span className="font-medium">{risk.diversificationScore}%</span>
                    </div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: risk.diversificationScore >= 60 ? '#00b87a' : risk.diversificationScore >= 30 ? '#f7b928' : '#f4212e',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${risk.diversificationScore}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>

                  {/* Suggestions */}
                  {risk.suggestions && risk.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Suggestions</p>
                      {risk.suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeInView>
          )}

          {/* Top Gainers */}
          {performance?.topGainers && performance.topGainers.length > 0 && (
            <FadeInView delay={0.4}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-success" />
                    <CardTitle className="text-base">Top Gainers</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {performance.topGainers.slice(0, 3).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">{TYPE_CONFIG[inv.investment_type]?.icon || '📊'}</span>
                          <span className="text-xs font-medium truncate">{inv.name}</span>
                        </div>
                        <span className="text-xs font-bold text-success">
                          +{Number(inv.gain_loss_percentage).toFixed(1)}%
                        </span>
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