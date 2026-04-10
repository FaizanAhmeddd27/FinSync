import { useEffect, useState } from 'react';
import { Activity, Database, Cpu, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getHealth().then(({ data }) => {
      if (data.success) setHealth(data.data);
      setLoading(false);
    }).catch((err) => {
      toast.error('Failed to check system health');
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  const HealthCard = ({ icon: Icon, title, status, metric, subtext }) => (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 p-4`}>
        <div className={`h-3 w-3 rounded-full ${status === 'healthy' ? 'bg-success shadow-[0_0_10px_#00b87a]' : 'bg-destructive shadow-[0_0_10px_#f4212e]'}`} />
      </div>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-xl font-bold">{metric}</h3>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Health</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <HealthCard 
          icon={Clock} 
          title="System Uptime" 
          status="healthy" 
          metric={health.uptime} 
          subtext="Since last restart"
        />
        <HealthCard 
          icon={Database} 
          title="Database Latency" 
          status={health.database.status} 
          metric={`${health.database.latencyMs}ms`}
          subtext="PostgreSQL Connection"
        />
        <HealthCard 
          icon={Activity} 
          title="Redis Latency" 
          status={health.redis.status} 
          metric={`${health.redis.latencyMs}ms`}
          subtext="Upstash Connection"
        />
        <HealthCard 
          icon={Cpu} 
          title="Memory Usage" 
          status="healthy" 
          metric={`${health.memory.rssMB} MB`}
          subtext={`Heap: ${health.memory.heapUsedMB}/${health.memory.heapTotalMB} MB`}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Server Info</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between sm:justify-start">
              <span className="text-muted-foreground">Node Version:</span>
              <span className="ml-2 font-mono">{health.nodeVersion}</span>
            </div>
            <div className="flex justify-between sm:justify-start">
              <span className="text-muted-foreground">Environment:</span>
              <span className="ml-2 font-mono capitalize">{health.environment}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}