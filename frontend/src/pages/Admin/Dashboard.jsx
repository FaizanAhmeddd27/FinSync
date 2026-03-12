import { useEffect, useState } from 'react';
import {
  Users, DollarSign, Activity, AlertTriangle,
  Server, Shield, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { adminAPI } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard().then(({ data }) => {
      if (data.success) setData(data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Failed to load admin data</div>;

  const { users, accounts, transactions, money, fraud, charts } = data;

  const StatCard = ({ title, value, subValue, icon: Icon, color }) => (
    <Card>
      <div className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        </div>
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", `bg-[${color}]/10`)} style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={users.total.toLocaleString()}
          subValue={`${users.newLast30Days} new this month`}
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

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Transaction Volume (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
                  <YAxis fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                    formatter={(v) => formatCurrency(v, 'USD')}
                  />
                  <Area type="monotone" dataKey="debits" stroke="#1c9cf0" fill="url(#volColor)" name="Volume" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>System Health</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-success" />
                <span>API Server</span>
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(0,184,122,0.5)]" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-success" />
                <span>Database (Postgres)</span>
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(0,184,122,0.5)]" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-success" />
                <span>Redis (Upstash)</span>
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(0,184,122,0.5)]" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-success" />
                <span>Fraud Engine</span>
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(0,184,122,0.5)]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}