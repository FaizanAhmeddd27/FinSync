import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, Check, CheckCheck, Trash2,
  ArrowLeftRight, ShieldAlert, Settings, Tag,
  Megaphone, PieChart, ChevronLeft, ChevronRight,
  RefreshCw, Mail, X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { notificationAPI } from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { cn, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  transaction: { icon: ArrowLeftRight, color: '#1c9cf0', label: 'Transaction' },
  fraud: { icon: ShieldAlert, color: '#f4212e', label: 'Security' },
  system: { icon: Settings, color: '#72767a', label: 'System' },
  otp: { icon: Mail, color: '#00b87a', label: 'OTP' },
  promotion: { icon: Megaphone, color: '#794bc4', label: 'Promotion' },
  budget_alert: { icon: PieChart, color: '#f7b928', label: 'Budget' },
};

export default function Notifications() {
  const { setUnreadNotifications } = useAuthStore();

  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const { data } = await notificationAPI.getAll(params);
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
        setUnreadNotifications(data.data.unreadCount || 0);
        setPagination(data.data.pagination || { page, limit: 20, total: 0, totalPages: 0 });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter, typeFilter, setUnreadNotifications]);

  useEffect(() => { fetchNotifications(1); }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'read' } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setUnreadNotifications(Math.max(0, unreadCount - 1));
    } catch {
      toast.error('Failed to mark as read.');
    }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
      setUnreadCount(0);
      setUnreadNotifications(0);
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Failed to mark all as read.');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      fetchNotifications(pagination.page);
    } catch {
      toast.error('Failed to delete notification.');
    }
  };

  const clearRead = async () => {
    if (!confirm('Delete all read notifications?')) return;
    try {
      await notificationAPI.clearRead();
      toast.success('Read notifications cleared.');
      fetchNotifications(1);
    } catch {
      toast.error('Failed to clear notifications.');
    }
  };

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FadeInView>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
        </FadeInView>
        <FadeInView delay={0.1}>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
                <CheckCheck className="h-4 w-4" /> Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-2" onClick={clearRead}>
              <Trash2 className="h-4 w-4" /> Clear read
            </Button>
          </div>
        </FadeInView>
      </div>

      {/* Filters */}
      <FadeInView delay={0.1}>
        <div className="flex flex-wrap gap-2">
          {/* Status tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {[
              { value: '', label: 'All' },
              { value: 'unread', label: 'Unread' },
              { value: 'read', label: 'Read' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                  statusFilter === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-input px-2 text-xs"
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </FadeInView>

      {/* Notifications List */}
      <FadeInView delay={0.2}>
        <Card>
          <CardContent className="pt-4 pb-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : notifications.length > 0 ? (
              <div>
                <AnimatePresence>
                  {notifications.map((notif, i) => {
                    const typeConf = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                    const TypeIcon = typeConf.icon;
                    const isUnread = notif.status === 'unread';

                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10, height: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl transition-colors mb-1 group relative',
                          isUnread
                            ? 'bg-accent/40 hover:bg-accent/60'
                            : 'hover:bg-muted/30'
                        )}
                      >
                        {/* Unread dot */}
                        {isUnread && (
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                        )}

                        {/* Icon */}
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${typeConf.color}12` }}
                        >
                          <TypeIcon className="h-4 w-4" style={{ color: typeConf.color }} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={cn(
                                'text-sm truncate',
                                isUnread ? 'font-semibold' : 'font-medium'
                              )}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="muted" className="text-[9px]">{typeConf.label}</Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {timeAgo(notif.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isUnread && (
                                <button
                                  onClick={() => markAsRead(notif.id)}
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="h-3.5 w-3.5 text-primary" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notif.id)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                                title="Delete"
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => fetchNotifications(pagination.page - 1)} disabled={!pagination.hasPrevious} className="h-8 w-8 p-0">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => fetchNotifications(pagination.page + 1)} disabled={!pagination.hasNext} className="h-8 w-8 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <BellOff className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  {statusFilter || typeFilter
                    ? 'No notifications match your filters'
                    : "You're all caught up!"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInView>
    </div>
  );
}