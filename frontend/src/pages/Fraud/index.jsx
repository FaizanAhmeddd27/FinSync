import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, ShieldX, AlertTriangle,
  Clock, ChevronLeft, ChevronRight,
  RefreshCw, Lock, Eye, User as UserIcon, Activity
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { fraudAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, cn, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';

const SEVERITY_CONFIG = {
  low: { color: '#1c9cf0', bg: 'bg-primary/10', text: 'text-primary', label: 'Low', score: '25-40' },
  medium: { color: '#f7b928', bg: 'bg-warning/10', text: 'text-warning', label: 'Medium', score: '41-65' },
  high: { color: '#e0245e', bg: 'bg-destructive/10', text: 'text-destructive', label: 'High', score: '66-85' },
  critical: { color: '#f4212e', bg: 'bg-destructive/10', text: 'text-destructive', label: 'Critical', score: '86-100' },
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: '#f7b928', label: 'Pending' },
  cleared: { icon: ShieldCheck, color: '#00b87a', label: 'Cleared' },
  blocked: { icon: ShieldX, color: '#f4212e', label: 'Blocked' },
};

export default function FraudAlerts() {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchAlerts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;

      const { data } = await fraudAPI.getAlerts(params);
      if (data.success) {
        setAlerts(data.data.alerts || []);
        setSummary(data.data.summary || null);
        setPagination(data.data.pagination || { page, limit: 15, total: 0, totalPages: 0 });
      }
    } catch (err) {
      toast.error('Failed to load fraud alerts');
    }
    setLoading(false);
  }, [statusFilter, severityFilter]);

  useEffect(() => { fetchAlerts(1); }, [fetchAlerts]);

  const viewDetail = async (alertId) => {
    setDetailLoading(true);
    try {
      const { data } = await fraudAPI.getById(alertId);
      if (data.success) setSelectedAlert(data.data.alert);
    } catch {
      toast.error('Failed to load alert details');
    }
    setDetailLoading(false);
  };

  const handleClear = async (alertId) => {
    setProcessingId(alertId);
    setActionLoading('clear');
    try {
      const { data } = await fraudAPI.clear(alertId);
      if (data.success) {
        toast.success('Alert cleared and user notified');
        setSelectedAlert(null);
        fetchAlerts(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear alert');
    }
    setActionLoading('');
    setProcessingId(null);
  };

  const handleBlock = async (alertId) => {
    if (!confirm('CRITICAL: This will freeze the user\'s account. Continue?')) return;
    setProcessingId(alertId);
    setActionLoading('block');
    try {
      const { data } = await fraudAPI.block(alertId);
      if (data.success) {
        toast.success('Account frozen and alert blocked');
        setSelectedAlert(null);
        fetchAlerts(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block account');
    }
    setActionLoading('');
    setProcessingId(null);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FadeInView>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Fraud Management</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isAdmin ? 'Monitor and manage security threats across all accounts' : 'Security alerts for your transactions'}
            </p>
          </div>
        </FadeInView>
        <FadeInView delay={0.1}>
          <Button variant="ghost" size="sm" onClick={() => fetchAlerts(1)} className="gap-2 cursor-pointer">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </FadeInView>
      </div>

      {summary && (
        <FadeInView delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: summary.total, icon: ShieldAlert, color: '#1c9cf0' },
              { label: 'Pending', value: summary.pending, icon: Clock, color: '#f7b928' },
              { label: 'Cleared', value: summary.cleared, icon: ShieldCheck, color: '#00b87a' },
              { label: 'Blocked', value: summary.blocked, icon: ShieldX, color: '#f4212e' },
              { label: 'Critical', value: summary.critical, icon: AlertTriangle, color: '#e0245e' },
            ].map((s) => (
              <div key={s.label} className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4 text-center transition-all hover:scale-105">
                <s.icon className="h-5 w-5 mx-auto mb-2" style={{ color: s.color }} />
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </FadeInView>
      )}

      <FadeInView delay={0.15}>
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-card/40 px-4 text-sm cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="cleared">Cleared</option>
            <option value="blocked">Blocked</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-card/40 px-4 text-sm cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </FadeInView>

      <FadeInView delay={0.2}>
        <Card className="border-none bg-transparent shadow-none">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert, i) => {
                  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
                  const status = STATUS_CONFIG[alert.status] || STATUS_CONFIG.pending;
                  const StatusIcon = status.icon;

                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => viewDetail(alert.id)}
                      className={cn(
                        'group relative flex flex-col sm:flex-row items-center gap-4 p-5 rounded-3xl border transition-all duration-300 cursor-pointer',
                        'bg-card/30 backdrop-blur-xl border-border/40 hover:bg-card/60 hover:shadow-2xl hover:shadow-primary/10',
                        alert.status === 'blocked' && 'border-destructive/40 bg-destructive/10 group-hover:bg-destructive/20'
                      )}
                    >
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                      <div 
                        className={cn('h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-lg', severity.bg)}
                      >
                        <AlertTriangle className="h-7 w-7" style={{ color: severity.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1.5">
                          <p className="text-base font-bold capitalize tracking-tight">
                            {alert.alert_type?.replace(/_/g, ' ')}
                          </p>
                          <Badge
                            variant={
                              alert.severity === 'critical' || alert.severity === 'high'
                                ? 'destructive'
                                : alert.severity === 'medium'
                                ? 'warning'
                                : 'default'
                            }
                            className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                          >
                            {severity.label}
                          </Badge>
                          {isAdmin && alert.user && (
                            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-muted/40 text-[10px] font-bold text-muted-foreground">
                              <UserIcon className="h-2.5 w-2.5" />
                              {alert.user.name}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 group-hover:line-clamp-none transition-all">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            {timeAgo(alert.created_at)}
                          </div>
                          {alert.account && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-medium">
                              <Lock className="h-3.5 w-3.5" />
                              {alert.account.account_number}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                        {alert.status === 'pending' && isAdmin ? (
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button
                              variant="success"
                              size="sm"
                              className="flex-1 sm:flex-none h-10 px-5 text-xs gap-2 font-bold rounded-2xl shadow-xl shadow-success/10 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClear(alert.id);
                              }}
                              isLoading={actionLoading === 'clear' && processingId === alert.id}
                            >
                              <ShieldCheck className="h-4 w-4" /> Clear
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1 sm:flex-none h-10 px-5 text-xs gap-2 font-bold rounded-2xl shadow-xl shadow-destructive/10 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBlock(alert.id);
                              }}
                              isLoading={actionLoading === 'block' && processingId === alert.id}
                            >
                              <Lock className="h-4 w-4" /> Block
                            </Button>
                          </div>
                        ) : (
                          <div className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-2xl border text-[11px] font-black uppercase tracking-[0.1em] transition-all",
                            alert.status === 'cleared' ? "bg-success/5 border-success/20 text-success" : 
                            alert.status === 'blocked' ? "bg-destructive/5 border-destructive/20 text-destructive shadow-lg shadow-destructive/5" :
                            "bg-muted/10 border-border/50 text-muted-foreground"
                          )}>
                            <StatusIcon className="h-4 w-4" />
                            {status.label}
                          </div>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-2xl hover:bg-muted/50 hidden sm:flex cursor-pointer"
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-8 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => fetchAlerts(pagination.page - 1)} disabled={!pagination.hasPrevious} className="h-10 w-10 p-0 rounded-xl cursor-pointer">
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => fetchAlerts(pagination.page + 1)} disabled={!pagination.hasNext} className="h-10 w-10 p-0 rounded-xl cursor-pointer">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-24 bg-card/20 rounded-[3rem] border border-dashed border-border/50">
                <div className="mx-auto h-20 w-20 rounded-3xl bg-success/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-10 w-10 text-success" />
                </div>
                <h3 className="text-2xl font-bold mb-2">System Secure ✨</h3>
                <p className="text-sm text-muted-foreground font-medium">No pending threats detected</p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInView>

      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title="Fraud Intelligence Report"
        size="lg"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
        ) : selectedAlert && (
          <div className="space-y-6">
            <div className={cn(
              'p-6 rounded-[2.5rem] border backdrop-blur-md',
              selectedAlert.status === 'blocked' ? 'bg-destructive/5 border-destructive/20' : 'bg-card/50 border-border/50'
            )}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
                  (SEVERITY_CONFIG[selectedAlert.severity] || {}).bg
                )}>
                  <AlertTriangle className="h-6 w-6" style={{
                    color: (SEVERITY_CONFIG[selectedAlert.severity] || {}).color
                  }} />
                </div>
                <div>
                  <p className="text-lg font-black capitalize tracking-tight flex items-center gap-2">
                    {selectedAlert.alert_type?.replace(/_/g, ' ')}
                    {selectedAlert.status === 'blocked' && (
                      <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0">ENFORCED</Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{selectedAlert.description}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-[2rem] bg-muted/20 border border-border/40">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                  <Activity className="h-3 w-3" /> Risk Intelligence
                </p>
                <div className="flex justify-between items-center bg-card/60 p-3 rounded-2xl border border-border/40 mb-2">
                  <span className="text-xs font-bold text-muted-foreground">Internal Risk Score</span>
                  <span className="text-lg font-black" style={{ 
                    color: (SEVERITY_CONFIG[selectedAlert.severity] || {}).color 
                  }}>
                    { (SEVERITY_CONFIG[selectedAlert.severity] || {}).score }
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs px-1">
                  <span className="text-muted-foreground">Detection Engine:</span>
                  <span className="font-bold">FinSync AI 3.0</span>
                </div>
              </div>

              {isAdmin && selectedAlert.user && (
                <div className="p-5 rounded-[2rem] bg-muted/20 border border-border/40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                    <UserIcon className="h-3 w-3" /> Affected User
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20">
                      {selectedAlert.user.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">{selectedAlert.user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedAlert.user.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-success flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5" /> KYC Verified Profile
                  </div>
                </div>
              )}
            </div>

            {selectedAlert.ledger_entry && (
              <div className="p-6 rounded-[2.5rem] bg-card/40 border border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <Activity className="h-24 w-24" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-primary">Transaction Dynamics</p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-black uppercase mb-1">Impact Value</p>
                    <p className="text-2xl font-black font-mono">
                      {formatCurrency(selectedAlert.ledger_entry.amount, 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-black uppercase mb-1">Status</p>
                    <Badge variant="outline" className="font-black uppercase tracking-widest text-[10px] bg-card/60 backdrop-blur-none border-border">
                      {selectedAlert.ledger_entry.type}
                    </Badge>
                  </div>
                  <div className="col-span-2 pt-2">
                    <p className="text-[10px] text-muted-foreground font-black uppercase mb-1">Narrative Log</p>
                    <p className="font-bold text-sm leading-relaxed">{selectedAlert.ledger_entry.description}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedAlert.reviewer && (
              <div className="p-4 rounded-2xl bg-success/5 border border-success/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <ShieldCheck className="h-4 w-4 text-success" />
                   <span className="text-xs font-bold">Reviewed by {selectedAlert.reviewer.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(selectedAlert.reviewed_at).toLocaleString()}</span>
              </div>
            )}

            {selectedAlert.status === 'pending' && isAdmin && (
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/50">
                <Button
                  variant="success"
                  size="lg"
                  className="flex-1 h-14 gap-3 font-black rounded-3xl shadow-2xl shadow-success/20 cursor-pointer"
                  onClick={() => handleClear(selectedAlert.id)}
                  isLoading={actionLoading === 'clear' && processingId === selectedAlert.id}
                >
                  <ShieldCheck className="h-6 w-6" /> VERIFY & CLEAR
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="flex-1 h-14 gap-3 font-black rounded-3xl shadow-2xl shadow-destructive/20 cursor-pointer"
                  onClick={() => handleBlock(selectedAlert.id)}
                  isLoading={actionLoading === 'block' && processingId === selectedAlert.id}
                >
                  <Lock className="h-6 w-6" /> FREEZE USER
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}