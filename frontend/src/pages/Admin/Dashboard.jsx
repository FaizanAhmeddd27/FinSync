import { useEffect, useState } from 'react';
import {
  Users, DollarSign, Activity, AlertTriangle,
  Server, Shield, TrendingUp, Wallet, Clock,
  UserCheck, Snowflake, Eye,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { adminAPI } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard().then(({ data }) => {
      if (data.success) setData(data.data);
      setLoading(false);
    }).catch((err) => {
      toast.error('Failed to load admin dashboard data');
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Failed to load admin data</div>;

  const { users, accounts, transactions, money, fraud, charts, recent } = data;

  const StatCard = ({ title, value, subValue, icon: Icon, color }) => (
    <Card className="group hover:shadow-lg hover:shadow-[color]/5 transition-all duration-300" style={{ '--tw-shadow-color': color }}>
      <div className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold mt-1.5">{value}</h3>
          {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        </div>
        <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
    </Card>
  );

  return (
    <FadeInView>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Platform overview and management</p>
          </div>
        </div>

        {/* Row 1: Primary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={users.total.toLocaleString()}
            subValue={`${users.newLast30Days} new this month · ${users.active} active`}
            icon={Users}
            color="#1c9cf0"
          />
          <StatCard
            title="Total Transactions"
            value={transactions.total.toLocaleString()}
            subValue={`${transactions.last24Hours} in last 24h`}
            icon={Activity}
            color="#00b87a"
          />
          <StatCard
            title="System Balance (USD)"
            value={formatCurrency(money.totalByCurrency.USD || 0, 'USD')}
            subValue="Across all accounts"
            icon={DollarSign}
            color="#f7b928"
          />
          <StatCard
            title="Pending Fraud Alerts"
            value={fraud.pendingAlerts}
            subValue={`${fraud.criticalAlerts} critical`}
            icon={AlertTriangle}
            color="#f4212e"
          />
        </div>

        {/* Row 2: Secondary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Accounts"
            value={accounts.active?.toLocaleString() || '0'}
            subValue={`${accounts.total} total`}
            icon={Wallet}
            color="#8b5cf6"
          />
          <StatCard
            title="KYC Pending"
            value={users.kycPending || 0}
            subValue="Awaiting verification"
            icon={UserCheck}
            color="#f59e0b"
          />
          <StatCard
            title="Frozen Accounts"
            value={accounts.frozen || 0}
            subValue="Require admin review"
            icon={Snowflake}
            color="#06b6d4"
          />
          <StatCard
            title="Multi-Currency"
            value={Object.keys(money.totalByCurrency || {}).length}
            subValue={Object.keys(money.totalByCurrency || {}).join(', ') || 'N/A'}
            icon={TrendingUp}
            color="#10b981"
          />
        </div>

        {/* Row 3: Full Width Chart */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Volume (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.dailyVolume}>
                    <defs>
                      <linearGradient id="volColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1c9cf0" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1c9cf0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                      formatter={(v) => formatCurrency(v, 'USD')}
                    />
                    <Area type="monotone" dataKey="debits" stroke="#1c9cf0" fill="url(#volColor)" name="Volume" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Recent Users + Top Accounts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Registrations</CardTitle>
                <a href="/admin/users" className="text-xs text-primary hover:underline">View All →</a>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(recent?.users || []).map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={u.kyc_status === 'verified' ? 'success' : 'warning'}>
                        {u.kyc_status}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(!recent?.users || recent.users.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent registrations</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Top Accounts by Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(recent?.topAccounts || []).slice(0, 5).map((acc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{acc.users?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{acc.users?.email || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: '#00b87a' }}>
                        {formatCurrency(Number(acc.balance), acc.currency || 'USD')}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">{acc.account_type}</p>
                    </div>
                  </div>
                ))}
                {(!recent?.topAccounts || recent.topAccounts.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No accounts found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 5: Currency Distribution */}
        {Object.keys(money.totalByCurrency || {}).length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Balance by Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(money.totalByCurrency).map(([currency, total]) => ({ currency, total }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                    <XAxis type="number" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="currency" fontSize={12} width={50} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                      formatter={(v) => `$${Number(v).toLocaleString()}`}
                    />
                    <Bar dataKey="total" fill="#1c9cf0" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </FadeInView>
  );
}