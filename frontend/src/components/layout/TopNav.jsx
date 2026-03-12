import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Bell, Search, X,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import ThemeToggle from '@/components/common/ThemeToggle';
import useAuthStore from '@/stores/authStore';

export default function TopNav({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, unreadNotifications } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search */}
          <AnimatePresence>
            {showSearch ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative hidden sm:block"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions, accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSearch(false);
                      setSearchQuery('');
                    }
                  }}
                />
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-input text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <Search className="h-4 w-4" />
                <span>Search...</span>
                <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            )}
          </AnimatePresence>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadNotifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold"
              >
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </motion.span>
            )}
          </Link>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-accent transition-colors cursor-pointer"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  getInitials(user?.name)
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight truncate max-w-[120px]">
                  {user?.name}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {user?.role}
                </p>
              </div>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover shadow-xl z-50 py-1 overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-semibold">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>

                    {[
                      { label: 'Settings', path: '/settings' },
                      { label: 'Notifications', path: '/notifications' },
                    ].map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setShowUserMenu(false)}
                        className="block px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}

                    <div className="border-t border-border mt-1">
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          const { logout } = useAuthStore.getState();
                          await logout();
                          navigate('/login');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}