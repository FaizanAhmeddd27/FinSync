import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Receipt,
  FileText, ShieldAlert, PieChart, TrendingUp,
  Bot, Bell, Settings, LogOut, X, Landmark,
  Users, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useAuthStore from '@/stores/authStore';
import { getInitials } from '@/lib/utils';

const allNav = [
  { section: 'Main', items: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Accounts', icon: Wallet, path: '/accounts' },
    { name: 'Transfers', icon: ArrowLeftRight, path: '/transfers' },
    { name: 'Transactions', icon: Receipt, path: '/transactions' },
    { name: 'Statements', icon: FileText, path: '/statements' },
  ]},
  { section: 'Tools', items: [
    { name: 'Budget', icon: PieChart, path: '/budget' },
    { name: 'Investments', icon: TrendingUp, path: '/investments' },
    { name: 'AI Assistant', icon: Bot, path: '/chatbot' },
    { name: 'Fraud Alerts', icon: ShieldAlert, path: '/fraud-alerts' },
  ]},
  { section: 'Other', items: [
    { name: 'Notifications', icon: Bell, path: '/notifications' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]},
];

const adminItems = [
  { name: 'Admin Panel', icon: Users, path: '/admin' },
  { name: 'System Health', icon: Activity, path: '/admin/health' },
];

export default function MobileSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, unreadNotifications } = useAuthStore();

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border flex flex-col lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-border">
              <Link to="/dashboard" onClick={onClose} className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-primary" />
                </div>
                <span className="text-lg font-bold">
                  <span className="text-primary">Fin</span>Sync
                </span>
              </Link>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User info */}
            {user && (
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              {allNav.map((section) => (
                <div key={section.section}>
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {section.section}
                  </p>
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span>{item.name}</span>
                        {item.name === 'Notifications' && unreadNotifications > 0 && (
                          <span className="ml-auto h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                            {unreadNotifications > 99 ? '99+' : unreadNotifications}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}

              {user?.role === 'admin' && (
                <div>
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Admin
                  </p>
                  {adminItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isActive(item.path)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </nav>

            {/* Logout */}
            <div className="border-t border-border p-3">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}