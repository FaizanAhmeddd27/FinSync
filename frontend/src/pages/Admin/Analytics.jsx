import { useEffect, useState } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { adminAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FadeInView from '@/components/animations/FadeInView';
import { toast } from 'sonner';

const COLORS = ['#1c9cf0', '#00b87a', '#f7b928', '#f4212e', '#8b5cf6', '#06b6d4'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    adminAPI.getAnalytics(period).then(({ data }) => {
      if (data.success) setData(data.data);
      setLoading(false);
    }).catch((err) => {
      toast.error('Failed to load analytics data');
      setLoading(false);
    });
  }, [period]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!data) return <div className="p-8 text-center">Failed to load analytics</div>;

  const fraudPieData = Object.entries(data.fraud.bySeverity).map(([name, value]) => ({ name, value }));

  return (
    <FadeInView className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Insights</h1>
          <p className="text-sm text-muted-foreground">Platform growth and behavior trends</p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p} Days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trends */}
        <Card>
          <CardHeader>
            <CardTitle>User Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.registrations.byDay}>
                  <defs>
                    <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1c9cf0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1c9cf0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                  <YAxis fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#1c9cf0" 
                    fill="url(#regGradient)" 
                    strokeWidth={2}
                    name="Registrations"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.transactionVolume.byDay}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                  <YAxis fontSize={10} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                    formatter={(v) => formatCurrency(v, 'USD')}
                  />
                  <Bar dataKey="volume" fill="#00b87a" radius={[4, 4, 0, 0]} name="Volume" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Spending Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Spending Categories (All Users)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topCategories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                  <XAxis type="number" fontSize={10} hide />
                  <YAxis 
                    dataKey="category" 
                    type="category" 
                    fontSize={10} 
                    width={100} 
                    tickFormatter={(v) => v.length > 15 ? v.substring(0, 12) + '...' : v}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                    formatter={(v) => formatCurrency(v, 'USD')}
                  />
                  <Bar dataKey="total" fill="#f7b928" radius={[0, 4, 4, 0]} name="Total Spend" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fraud Severity */}
        <Card>
          <CardHeader>
            <CardTitle>Fraud Alert Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fraudPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {fraudPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </FadeInView>
  );
}
