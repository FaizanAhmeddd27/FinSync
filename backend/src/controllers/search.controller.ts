import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';


const NAV_ITEMS = [
  { title: 'Dashboard', subtitle: 'Overview of your finances', path: '/dashboard', icon: 'LayoutDashboard', type: 'navigation' },
  { title: 'Accounts', subtitle: 'Manage your bank accounts', path: '/accounts', icon: 'Wallet', type: 'navigation' },
  { title: 'Transfers', subtitle: 'Send and receive money', path: '/transfers', icon: 'ArrowLeftRight', type: 'navigation' },
  { title: 'Transactions', subtitle: 'View transaction history', path: '/transactions', icon: 'Receipt', type: 'navigation' },
  { title: 'Statements', subtitle: 'Download bank statements', path: '/statements', icon: 'FileText', type: 'navigation' },
  { title: 'Budget', subtitle: 'Track your spending budget', path: '/budget', icon: 'PieChart', type: 'navigation' },
  { title: 'Investments', subtitle: 'Manage your portfolio', path: '/investments', icon: 'TrendingUp', type: 'navigation' },
  { title: 'Fraud Alerts', subtitle: 'Security and fraud detection', path: '/fraud-alerts', icon: 'Shield', type: 'navigation' },
  { title: 'Notifications', subtitle: 'View all notifications', path: '/notifications', icon: 'Bell', type: 'navigation' },
  { title: 'Settings', subtitle: 'Profile and preferences', path: '/settings', icon: 'Settings', type: 'navigation' },
  { title: 'AI Chatbot', subtitle: 'Financial assistant', path: '/chatbot', icon: 'Bot', type: 'navigation' },
];

export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string;
  const userId = req.user?.id;

  if (!query || query.length < 2) {
    return res.status(200).json({ success: true, data: [] });
  }

  const searchTerm = `%${query}%`;
  const lowerQuery = query.toLowerCase();

  
  const navResults = NAV_ITEMS
    .filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.subtitle.toLowerCase().includes(lowerQuery)
    )
    .map(item => ({
      id: item.path,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      path: item.path,
      icon: item.icon,
    }));

  
  const accountsPromise = supabaseAdmin
    .from('accounts')
    .select('id, name, account_number, balance, currency')
    .eq('user_id', userId)
    .or(`name.ilike.${searchTerm},account_number.ilike.${searchTerm}`);

  
  const transactionsPromise = supabaseAdmin
    .from('ledger')
    .select('id, description, amount, type, created_at, currency, category, account_id, accounts!inner(user_id)')
    .eq('accounts.user_id', userId)
    .or(`description.ilike.${searchTerm},category.ilike.${searchTerm}`);

  
  const investmentsPromise = supabaseAdmin
    .from('investments')
    .select('id, name, symbol, total_value, currency')
    .eq('user_id', userId)
    .or(`name.ilike.${searchTerm},symbol.ilike.${searchTerm}`);

  
  const budgetsPromise = supabaseAdmin
    .from('budget_categories')
    .select('id, category_name, monthly_limit, currency')
    .eq('user_id', userId)
    .ilike('category_name', searchTerm);

  
  const notificationsPromise = supabaseAdmin
    .from('notifications')
    .select('id, title, message, type, created_at')
    .eq('user_id', userId)
    .or(`title.ilike.${searchTerm},message.ilike.${searchTerm}`)
    .order('created_at', { ascending: false })
    .limit(5);

  const [
    { data: accounts, error: accErr },
    { data: transactions, error: txnErr },
    { data: investments, error: invErr },
    { data: budgets, error: budErr },
    { data: notifications, error: notifErr }
  ] = await Promise.all([
    accountsPromise,
    transactionsPromise,
    investmentsPromise,
    budgetsPromise,
    notificationsPromise
  ]);

  
  const results = [
    ...navResults,
    ...(accounts || []).map(a => ({
      id: a.id,
      type: 'account',
      title: a.name || `Account ${a.account_number}`,
      subtitle: `${a.account_number} • ${a.currency} ${Number(a.balance).toLocaleString()}`,
      path: '/accounts',
      icon: 'Wallet'
    })),
    ...(transactions || []).map(t => ({
      id: t.id,
      type: 'transaction',
      title: t.description || 'Transaction',
      subtitle: `${t.type === 'credit' ? '+' : '-'}${Number(t.amount).toLocaleString()} • ${t.category || 'Transfer'} • ${new Date(t.created_at).toLocaleDateString()}`,
      path: '/transactions',
      icon: 'Receipt'
    })),
    ...(investments || []).map(i => ({
      id: i.id,
      type: 'investment',
      title: i.name,
      subtitle: `${i.symbol} • ${i.currency} ${Number(i.total_value).toLocaleString()}`,
      path: '/investments',
      icon: 'TrendingUp'
    })),
    ...(budgets || []).map(b => ({
      id: b.id,
      type: 'budget',
      title: b.category_name,
      subtitle: `Limit: ${b.currency} ${Number(b.monthly_limit).toLocaleString()}`,
      path: '/budget',
      icon: 'PieChart'
    })),
    ...(notifications || []).map(n => ({
      id: n.id,
      type: 'notification',
      title: n.title,
      subtitle: n.message?.substring(0, 60) + (n.message?.length > 60 ? '...' : ''),
      path: '/notifications',
      icon: 'Bell'
    }))
  ];

  res.status(200).json({
    success: true,
    data: results.slice(0, 15) 
  });
});
