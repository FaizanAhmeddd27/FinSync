import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Bell, Search, X, Loader2, ChevronRight, Wallet, Receipt, TrendingUp, PieChart,
  LayoutDashboard, ArrowLeftRight, FileText, Shield, Settings, Bot
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import ThemeToggle from '@/components/common/ThemeToggle';
import useAuthStore from '@/stores/authStore';
import { searchAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function TopNav({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, unreadNotifications } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsLoading(true);
        try {
          const { data } = await searchAPI.query(searchQuery);
          if (data.success) {
            setResults(data.data);
            setSelectedIndex(-1);
          }
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
        setResults([]);
      }
    };

    if (showSearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearch]);

  const handleSelect = useCallback((result) => {
    navigate(result.path);
    setShowSearch(false);
    setSearchQuery('');
    setResults([]);
  }, [navigate]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchQuery('');
      setResults([]);
    }
  };

  const IconMap = {
    account: Wallet,
    transaction: Receipt,
    investment: TrendingUp,
    budget: PieChart,
    navigation: Search,
    notification: Bell,
    // Navigation-specific icons by path
    LayoutDashboard,
    ArrowLeftRight,
    FileText,
    Shield,
    Settings: Settings,
    Bot,
    Bell,
    Wallet,
    Receipt,
    TrendingUp,
    PieChart,
  };

  const getIcon = (result) => {
    // For navigation items, use the icon string from backend
    if (result.type === 'navigation' && IconMap[result.icon]) {
      return IconMap[result.icon];
    }
    return IconMap[result.type] || Search;
  };

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
                className="relative hidden sm:block w-full max-w-[400px]"
                ref={searchRef}
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions, accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="w-full h-10 pl-10 pr-10 rounded-xl border border-border bg-input/50 backdrop-blur-sm shadow-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                
                {isLoading && (
                  <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}

                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); setResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>

                {/* Search Results Dropdown */}
                <AnimatePresence>
                  {showSearch && (results.length > 0 || (searchQuery.length >= 2 && !isLoading && results.length === 0)) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="max-h-[400px] overflow-y-auto p-2">
                        {results.length > 0 ? (
                          results.map((result, index) => {
                            const Icon = getIcon(result);
                            return (
                              <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleSelect(result)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                  index === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                }`}
                              >
                                <div className={`p-2 rounded-lg ${index === selectedIndex ? 'bg-primary/20' : 'bg-muted'}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{result.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 opacity-30" />
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center">
                            <Search className="h-8 w-8 text-muted-foreground opacity-20 mx-auto mb-2" />
                            <p className="text-sm font-medium">No results found</p>
                            <p className="text-xs text-muted-foreground">Try a different search term</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden relative">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt="" 
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={user?.avatar_url ? "hidden absolute inset-0 items-center justify-center" : "flex items-center justify-center h-full w-full"}>
                  {getInitials(user?.name)}
                </div>
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
                          toast.success('Logged out successfully.');
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