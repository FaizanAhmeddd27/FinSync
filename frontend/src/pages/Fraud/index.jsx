import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, ShieldX, AlertTriangle,
  AlertCircle, CheckCircle2, XCircle, Eye,
  Clock, ChevronLeft, ChevronRight, Filter,
  RefreshCw, Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { fraudAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { formatCurrency, cn, timeAgo } from '@/lib/utils';

const SEVERITY_CONFIG = {
  low: { color: '#1c9cf0', bg: 'bg-primary/10', text: 'text-primary', label: 'Low' },
  medium: { color: '#f7b928', bg: 'bg-warning/10', text: 'text-warning', label: 'Medium' },
  high: { color: '#e0245e', bg: 'bg-destructive/10', text: 'text-destructive', label: 'High' },
  critical: { color: '#f4212e', bg: 'bg-destructive/10', text: 'text-destructive', label: 'Critical' },
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: '#f7b928', label: 'Pending' },
  cleared: { icon: CheckCircle2, color: '#00b87a', label: 'Cleared' },
  blocked: { icon: XCircle, color: '#f4212e', label: 'Blocked' },
  reviewed: { icon: Eye, color: '#1c9cf0', label: 'Reviewed' },
};

export default function FraudAlerts() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  // Filters
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
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter, severityFilter]);

  useEffect(() => { fetchAlerts(1); }, [fetchAlerts]);

  const viewDetail = async (alertId) => {
    setDetailLoading(true);
    try {
      const { data } = await fraudAPI.getById(alertId);
      if (data.success) setSelectedAlert(data.data.alert);
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const handleClear = async (alertId) => {
    setActionLoading('clear');
    try {
      await fraudAPI.clear(alertId);
      setSelectedAlert(null);
      fetchAlerts(pagination.page);
    } catch { /* ignore */ }
    setActionLoading('');
  };

  const handleBlock = async (alertId) => {
    if (!confirm('This will freeze the associated account. Continue?')) return;
    setActionLoading('block');
    try {
      await fraudAPI.block(alertId);
      setSelectedAlert(null);
      fetchAlerts(pagination.page);
    } catch { /* ignore */ }
    setActionLoading('');
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FadeInView>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Fraud Alerts</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor suspicious activity on your accounts
            </p>
          </div>
        </FadeInView>
        <FadeInView delay={0.1}>
          <Button variant="ghost" size="sm" onClick={() => fetchAlerts(1)} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </FadeInView>
      </div>

      {/* Summary Stats */}
      {summary && (
        <FadeInView delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: summary.total, icon: ShieldAlert, color: '#1c9cf0' },
              { label: 'Pending', value: summary.pending, icon: Clock, color: '#f7b928' },
              { label: 'Cleared', value: summary.cleared, icon: ShieldCheck, color: '#00b87a' },
              { label: 'Blocked', value: summary.blocked, icon: ShieldX, color: '#f4212e' },
              { label: 'Critical', value: summary.critical, icon: AlertTriangle, color: '#e0245e' },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <s.icon className="h-4 w-4 mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </FadeInView>
      )}

      {/* Filters */}
      <FadeInView delay={0.15}>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-input px-3 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="cleared">Cleared</option>
            <option value="blocked">Blocked</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-input px-3 text-sm"
          >
            <option value="">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </FadeInView>

      {/* Alerts List */}
      <FadeInView delay={0.2}>
        <Card>
          <CardContent className="pt-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, i) => {
                  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
                  const status = STATUS_CONFIG[alert.status] || STATUS_CONFIG.pending;
                  const StatusIcon = status.icon;

                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => viewDetail(alert.id)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:bg-muted/30',
                        alert.severity === 'critical'
                          ? 'border-destructive/30 bg-destructive/5'
                          : 'border-border'
                      )}
                    >
                      {/* Severity Icon */}
                      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', severity.bg)}>
                        <AlertTriangle className="h-5 w-5" style={{ color: severity.color }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold capitalize">
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
                            className="text-[9px]"
                          >
                            {severity.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {alert.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {timeAgo(alert.created_at)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusIcon className="h-4 w-4" style={{ color: status.color }} />
                        <span className="text-xs font-medium capitalize" style={{ color: status.color }}>
                          {status.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => fetchAlerts(pagination.page - 1)} disabled={!pagination.hasPrevious} className="h-8 w-8 p-0">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => fetchAlerts(pagination.page + 1)} disabled={!pagination.hasNext} className="h-8 w-8 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2">All Clear! ✨</h3>
                <p className="text-sm text-muted-foreground">No fraud alerts to show</p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInView>

      {/* Alert Detail Modal */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title="Alert Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-8"><LoadingSpinner /></div>
        ) : selectedAlert && (
          <div className="space-y-4">
            {/* Severity Banner */}
            <div className={cn(
              'p-4 rounded-xl flex items-start gap-3',
              selectedAlert.severity === 'critical' || selectedAlert.severity === 'high'
                ? 'bg-destructive/10 border border-destructive/20'
                : 'bg-warning/10 border border-warning/20'
            )}>
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{
                color: (SEVERITY_CONFIG[selectedAlert.severity] || {}).color
              }} />
              <div>
                <p className="text-sm font-semibold capitalize">
                  {selectedAlert.alert_type?.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedAlert.description}</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              {[
                { label: 'Alert ID', value: selectedAlert.id?.slice(0, 8) + '...' },
                { label: 'Severity', value: selectedAlert.severity },
                { label: 'Status', value: selectedAlert.status },
                { label: 'Created', value: new Date(selectedAlert.created_at).toLocaleString() },
                ...(selectedAlert.reviewed_at
                  ? [{ label: 'Reviewed', value: new Date(selectedAlert.reviewed_at).toLocaleString() }]
                  : []),
                ...(selectedAlert.reviewer
                  ? [{ label: 'Reviewed By', value: selectedAlert.reviewer.name }]
                  : []),
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium capitalize">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Transaction Info */}
            {selectedAlert.ledger_entry && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium mb-2">Transaction Details</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">
                      {formatCurrency(selectedAlert.ledger_entry.amount, 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize">{selectedAlert.ledger_entry.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description</span>
                    <span className="truncate ml-4">{selectedAlert.ledger_entry.description}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {isAdmin && selectedAlert.status === 'pending' && (
              <div className="flex gap-3 pt-2 border-t border-border">
                <Button
                  variant="success"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleClear(selectedAlert.id)}
                  isLoading={actionLoading === 'clear'}
                >
                  <CheckCircle2 className="h-4 w-4" /> Clear Alert
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleBlock(selectedAlert.id)}
                  isLoading={actionLoading === 'block'}
                >
                  <Lock className="h-4 w-4" /> Block Account
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}