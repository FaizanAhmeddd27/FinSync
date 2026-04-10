import { useEffect, useState } from 'react';
import { 
  Search, MoreHorizontal, Shield, Ban, 
  CheckCircle, Mail, MapPin, Smartphone, 
  Calendar, CreditCard, Activity, AlertTriangle,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { adminAPI } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency, cn } from '@/lib/utils';
import FadeInView from '@/components/animations/FadeInView';
import { toast } from 'sonner';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ role: '', kyc_status: '', is_active: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ 
        search, 
        page, 
        limit: 10,
        ...filters 
      });
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(fetchUsers, 500);
    return () => clearTimeout(t);
  }, [search, page, filters]);

  const fetchUserDetail = async (userId) => {
    setDetailLoading(true);
    try {
      const { data } = await adminAPI.getUserDetail(userId);
      if (data.success) setUserDetail(data.data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const openUserDetail = (user) => {
    setSelectedUser(user);
    fetchUserDetail(user.id);
  };

  const handleUserAction = async (action) => {
    try {
      await adminAPI.updateUser(selectedUser.id, action);
      toast.success('User updated successfully');
      // Refresh both
      fetchUsers();
      fetchUserDetail(selectedUser.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleAccountAction = async (accountId, action) => {
    try {
      await adminAPI.manageAccount(accountId, { action });
      toast.success(`Account ${action}d successfully`);
      fetchUserDetail(selectedUser.id);
    } catch (err) {
       toast.error(err.response?.data?.message || 'Failed to manage account');
    }
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage all system users</p>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 w-full">
              <Input
                icon={Search}
                placeholder="Search users..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select 
                name="role" 
                value={filters.role} 
                onChange={handleFilterChange}
                className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-border bg-input text-sm"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <select 
                name="kyc_status" 
                value={filters.kyc_status} 
                onChange={handleFilterChange}
                className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-border bg-input text-sm"
              >
                <option value="">KYC (Any)</option>
                <option value="not_started">Not Started</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
              <select 
                name="is_active" 
                value={filters.is_active} 
                onChange={handleFilterChange}
                className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-border bg-input text-sm"
              >
                <option value="">Status (Any)</option>
                <option value="true">Active Only</option>
                <option value="false">Banned Only</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full text-sm text-left border-collapse min-w-[800px]">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6 text-center">Role</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">KYC</th>
                  <th className="py-4 px-6">Joined</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {u.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className="capitalize">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Badge variant={u.is_active ? 'success' : 'destructive'}>
                        {u.is_active ? 'Active' : 'Banned'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Badge variant={
                        u.kyc_status === 'verified' ? 'success' : 
                        u.kyc_status === 'pending' ? 'warning' : 'outline'
                      }>
                        {u.kyc_status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openUserDetail(u)}>
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <div className="py-12"><LoadingSpinner /></div>}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Showing page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* User Detail Modal */}
      <Modal 
        isOpen={!!selectedUser} 
        onClose={() => setSelectedUser(null)} 
        title="User Intelligence"
        size="xl"
      >
        {detailLoading ? <div className="py-12"><LoadingSpinner /></div> : userDetail && (
          <div className="space-y-6">
            {/* Header / Info */}
            <div className="flex flex-col md:flex-row gap-6 p-4 rounded-2xl bg-muted/30 border border-border">
              <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-primary/20">
                {userDetail.user.name?.charAt(0)}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold">{userDetail.user.name}</h2>
                    <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      <Mail className="h-3 w-3" /> {userDetail.user.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant={userDetail.user.is_active ? 'destructive' : 'success'} 
                      size="sm"
                      onClick={() => handleUserAction({ is_active: !userDetail.user.is_active })}
                    >
                      {userDetail.user.is_active ? <Ban className="h-4 w-4 mr-1.5" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                      {userDetail.user.is_active ? 'Ban User' : 'Unban User'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={userDetail.user.kyc_status === 'verified'}
                      onClick={() => handleUserAction({ kyc_status: 'verified' })}
                    >
                      <Shield className="h-4 w-4 mr-1.5 text-success" /> Verify KYC
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">User Role</p>
                    <p className="text-sm font-medium capitalize">{userDetail.user.role}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Joined</p>
                    <p className="text-sm font-medium">{new Date(userDetail.user.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Balance</p>
                    <p className="text-sm font-bold text-success">${userDetail.totalBalance.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">2FA Status</p>
                    <p className="text-sm font-medium">{userDetail.user.is_2fa_enabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Accounts Section */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">Registered Accounts</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {userDetail.accounts.map(acc => (
                  <Card key={acc.id} className="border-border">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-8 w-8 text-primary/40" />
                        <div>
                          <p className="text-xs font-bold text-success">
                            {formatCurrency(Number(acc.balance), acc.currency)}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase">{acc.account_type}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleAccountAction(acc.id, acc.status === 'frozen' ? 'unfreeze' : 'freeze')}
                        >
                          {acc.status === 'frozen' ? <Activity className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-destructive" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Activity (Grid) */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Transactions */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">Recent Transactions</h3>
                <div className="space-y-2 bg-muted/10 rounded-xl border border-border/50 p-2">
                  {userDetail.recentTransactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 text-xs border-b border-border last:border-0">
                      <span className={t.type === 'credit' ? 'text-success' : 'text-destructive'}>
                        {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount, t.currency || 'USD')}
                      </span>
                      <span className="text-muted-foreground truncate max-w-[120px]">{t.description}</span>
                    </div>
                  ))}
                  {userDetail.recentTransactions.length === 0 && <p className="text-center py-4 text-muted-foreground text-xs">No transactions</p>}
                </div>
              </div>

              {/* Login/Alerts */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">Security & Logins</h3>
                <div className="space-y-2 bg-muted/10 rounded-xl border border-border/50 p-2">
                  {userDetail.fraudAlerts.map(a => (
                    <div key={a.id} className="flex items-center gap-2 p-2 text-[10px] bg-destructive/5 text-destructive rounded-lg border border-destructive/20">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span className="font-bold">{a.severity}:</span>
                      <span className="truncate">{a.alert_type.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                  {userDetail.loginAttempts.slice(0, 3).map(l => (
                    <div key={l.id} className="flex items-center justify-between p-2 text-[10px] text-muted-foreground bg-accent/30 rounded-lg">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(l.attempted_at).toLocaleString()}</span>
                      <Badge variant={l.is_successful ? 'success' : 'destructive'} className="text-[8px] h-4">
                        {l.is_successful ? 'OK' : 'FAIL'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}