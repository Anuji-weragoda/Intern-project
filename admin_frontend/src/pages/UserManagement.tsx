import React, { useEffect, useState } from 'react';
import { Shield, ShieldOff, Search, Users as UsersIcon } from 'lucide-react';
import { userService } from '../api/services/user.service';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Table } from '../components/Table';
import type { Column } from '../components/Table';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import type { AdminUser } from '../types/user.types';

const UserManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data: response, loading, error, execute: fetchUsers } = useApi(
    () => userService.getUsers(0, 50)
  );
  
  const { execute: updateRoles, loading: updatingRoles } = useApi(userService.updateUserRoles);
  
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (response?.content) {
      const users = response.content;
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const filtered = users.filter(
          (user) =>
            user.email.toLowerCase().includes(query) ||
            user.username?.toLowerCase().includes(query) ||
            user.roles.some((role) => role.toLowerCase().includes(query))
        );
        setFilteredUsers(filtered);
      } else {
        setFilteredUsers(users);
      }
    }
  }, [response, debouncedSearch]);

  const handleRoleChange = async (userId: number, newRoles: string[]) => {
    const result = await updateRoles(userId, { addRoles: newRoles, removeRoles: [] });

    if (result) {
      toast.success('User roles updated successfully!');
      fetchUsers();
    } else {
      toast.error('Failed to update user roles');
    }
  };

  const columns: Column<AdminUser>[] = [
    { key: 'id', header: 'ID', className: 'font-mono text-gray-600' },
    {
      key: 'email',
      header: 'Email',
      render: (user) => (
        <div>
          <div className="font-medium text-gray-900">{user.email}</div>
          {user.username && <div className="text-sm text-gray-500">@{user.username}</div>}
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.length > 0 ? (
            user.roles.map((role) => (
              <Badge key={role} variant="primary" size="sm">{role}</Badge>
            ))
          ) : (
            <Badge variant="gray" size="sm">No roles</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (user) => (
        <Badge variant={user.isActive ? 'success' : 'danger'} size="sm">
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (user) => (
        <span className="text-sm text-gray-600">
          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <div className="flex gap-2">
          <Button size="sm" variant="success" onClick={() => handleRoleChange(user.id, ['ADMIN'])} disabled={updatingRoles} icon={<Shield className="w-3 h-3" />}>
            Admin
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleRoleChange(user.id, ['USER'])} disabled={updatingRoles} icon={<ShieldOff className="w-3 h-3" />}>
            User
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingSpinner size="lg" message="Loading users..." />;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <ErrorAlert message={error} onRetry={() => fetchUsers()} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="User Management" description="Manage user accounts and permissions" />

      <Card padding="none">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by email, username, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
            <div className="text-sm text-gray-600 whitespace-nowrap">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </div>
          </div>
        </div>

        {filteredUsers.length > 0 ? (
          <Table data={filteredUsers} columns={columns} keyExtractor={(user) => user.id} />
        ) : searchQuery ? (
          <div className="p-12">
            <EmptyState
              title="No users found"
              description={`No results for "${searchQuery}". Try a different search term.`}
            />
          </div>
        ) : (
          <div className="p-12">
            <EmptyState
              icon={<UsersIcon className="w-12 h-12" />}
              title="No users yet"
              description="Users will appear here once they are registered in the system."
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default UserManagement;
