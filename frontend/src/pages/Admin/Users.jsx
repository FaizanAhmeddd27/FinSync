import { useEffect, useState } from 'react';
import { Search, MoreHorizontal, Shield, Ban, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { adminAPI } from '@/lib/api';
import Modal from '@/components/ui/Modal';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ search, limit: 20 });
      if (data.success) setUsers(data.data.users);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(fetchUsers, 500);
    return () => clearTimeout(t);
  }, [search]);

  const handleAction = async (action) => {
    if (!selectedUser) return;
    try {
      await adminAPI.updateUser(selectedUser.id, action);
      setSelectedUser(null);
      fetchUsers();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      <Card>
        <CardHeader>
          <Input
            icon={Search}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">KYC</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize">{u.role}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.is_active ? 'success' : 'destructive'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.kyc_status === 'verified' ? 'success' : 'warning'}>
                        {u.kyc_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedUser(u)}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Manage User"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleAction({ is_active: !selectedUser.is_active })}
              >
                {selectedUser.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                {selectedUser.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleAction({ kyc_status: 'verified' })}
                disabled={selectedUser.kyc_status === 'verified'}
              >
                <Shield className="h-4 w-4" /> Verify KYC
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}