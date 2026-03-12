import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Receipt,
  FileText, ShieldAlert, PieChart, TrendingUp,
  Bot, Bell, Settings, LogOut, ChevronLeft,
  ChevronRight, Landmark, Users, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useAuthStore from '@/stores/authStore';

const mainNav = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Accounts', icon: Wallet, path: '/accounts' },
  { name: 'Transfers', icon: ArrowLeftRight, path: '/transfers' },
  { name: 'Transactions', icon: Receipt, path: '/transactions' },
  { name: 'Statements', icon: FileText, path: '/statements' },
];

const toolsNav = [
  { name: 'Budget', icon: PieChart, path: '/budget' },
  { name: 'Investments', icon: TrendingUp, path: '/investments' },
  { name: 'AI Assistant', icon: Bot, path: '/chatbot' },
  { name: 'Fraud Alerts', icon: ShieldAlert, path: '/fraud-alerts' },
];

const bottomNav = [
  { name: 'Notifications', icon: Bell, path: '/notifications' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

const adminNav = [
  { name: 'Admin Panel', icon: Users, path: '/admin' },
  { name: 'System Health', icon: Activity, path: '/admin/health' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, unreadNotifications } = useAuthStore();

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavItem = ({ item, showBadge = false }) => {
    const active = isActive(item.path);

    return (
      <Link to={item.path} className="block">
        <motion.div
          whileHover={{ x: collapsed ? 0 : 4 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group',
            active
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          {/* Active indicator */}
          {active && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}

          <item.icon className={cn('h-5 w-5 shrink-0', active && 'text-primary')} />

          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap overflow-hidden"
              >
                {item.name}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Notification badge */}
          {showBadge && unreadNotifications > 0 && (
            <span
              className={cn(
                'flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold',
                collapsed ? 'absolute -top-1 -right-1 h-4 w-4' : 'ml-auto h-5 min-w-5 px-1'
              )}
            >
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}

          {/* Tooltip for collapsed */}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {item.name}
            </div>
          )}
        </motion.div>
      </Link>
    );
  };

  const SectionLabel = ({ label }) =>
    !collapsed ? (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60"
      >
        {label}
      </motion.p>
    ) : (
      <div className="my-2 mx-3 border-t border-border" />
    );

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'fixed top-0 left-0 z-40 h-screen flex flex-col border-r border-border bg-card',
        'hidden lg:flex'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-lg font-bold whitespace-nowrap overflow-hidden"
              >
                <span className="text-primary">Fin</span>Sync
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">
        <SectionLabel label="Main" />
        {mainNav.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

        <SectionLabel label="Tools" />
        {toolsNav.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

        {/* Admin section */}
        {user?.role === 'admin' && (
          <>
            <SectionLabel label="Admin" />
            {adminNav.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </>
        )}

        <SectionLabel label="Other" />
        {bottomNav.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            showBadge={item.name === 'Notifications'}
          />
        ))}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-border p-3 shrink-0">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer',
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}