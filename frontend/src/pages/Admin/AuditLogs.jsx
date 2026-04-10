import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ 
    action: '', 
    table_name: '' 
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getAuditLogs({ 
        page, 
        limit: 15,
        ...filters 
      });
      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to fetch audit logs');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Detailed history of administrative actions</p>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 border-b border-border/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 w-full">
              <Input
                name="action"
                placeholder="Search action..."
                icon={Search}
                value={filters.action}
                onChange={handleFilterChange}
              />
            </div>
            <select
              name="table_name"
              value={filters.table_name}
              onChange={handleFilterChange}
              className="px-3 py-2 rounded-xl border border-border bg-input text-sm"
            >
              <option value="">All Tables</option>
              <option value="users">Users</option>
              <option value="accounts">Accounts</option>
              <option value="ledger">Ledger</option>
              <option value="fraud_alerts">Fraud Alerts</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="text-muted-foreground border-b border-border bg-muted/50">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Admin</th>
                  <th className="py-3 px-6">Action</th>
                  <th className="py-3 px-6">Target</th>
                  <th className="py-3 px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="py-4 px-6 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-xs">{log.users?.name || 'System'}</p>
                      <p className="text-[10px] text-muted-foreground">{log.users?.email || 'automated'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <code className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                        {log.action}
                      </code>
                    </td>
                    <td className="py-4 px-6 text-xs uppercase text-muted-foreground">
                      {log.table_name}
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                        {JSON.stringify(log.new_data)}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground font-medium">
                      No logs found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <p className="text-xs text-muted-foreground">
          Showing page {page} of {totalPages}
        </p>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={page === totalPages || loading}
            onClick={() => setPage(p => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
