import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, ApiResponse, UserStats } from '@parkml/shared';
import { Avatar } from '../shared';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  Users, 
  Edit, 
  UserCheck, 
  UserX, 
  Search,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserWithStats extends User {
  stats?: UserStats;
}

interface PaginatedUsers {
  users: UserWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const UserManagement: React.FC = () => {
  const { user, token, isAdmin } = useAuth();
  const { t } = useTranslation('admin');
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: '',
  });

  useEffect(() => {
    if (user && token && isAdmin) {
      fetchUsers();
    }
  }, [user, token, isAdmin, pagination.page, pagination.limit, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      });

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse<PaginatedUsers> = await response.json();

      if (data.success && data.data) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      } else {
        toast.error(data.error || t('users.errors.fetchUsers'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('users.errors.fetchUsers'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (id: string, formData: any) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(t('users.success.userUpdated'));
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || t('users.errors.updateUser'));
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(t('users.errors.updateUser'));
    }
  };

  const handleDeactivateUser = async (id: string) => {
    if (!confirm(t('users.confirmDeactivate'))) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}/deactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(t('users.success.userDeactivated'));
        fetchUsers();
      } else {
        toast.error(data.error || t('users.errors.deactivateUser'));
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error(t('users.errors.deactivateUser'));
    }
  };

  const handleReactivateUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(t('users.success.userReactivated'));
        fetchUsers();
      } else {
        toast.error(data.error || t('users.errors.reactivateUser'));
      }
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error(t('users.errors.reactivateUser'));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'clinic_admin':
        return 'bg-blue-100 text-blue-800';
      case 'professional_caregiver':
        return 'bg-green-100 text-green-800';
      case 'family_caregiver':
        return 'bg-yellow-100 text-yellow-800';
      case 'patient':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      'super_admin': t('users.roles.superAdmin'),
      'clinic_admin': t('users.roles.clinicAdmin'),
      'professional_caregiver': t('users.roles.professionalCaregiver'),
      'family_caregiver': t('users.roles.familyCaregiver'),
      'patient': t('users.roles.patient'),
    };
    return roleMap[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <Users className="h-12 w-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('common.accessDenied')}</h2>
        <p className="text-gray-600">{t('users.noPermission')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="card-title text-2xl">{t('users.title')}</h1>
              <p className="text-base-content/70">{t('users.description')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="flex-1 form-control">
              <label htmlFor="search" className="sr-only">{t('users.searchLabel')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 opacity-50" />
                <input
                  type="text"
                  id="search"
                  placeholder={t('users.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input input-bordered w-full pl-10"
                />
              </div>
            </div>
            
            <div className="form-control">
              <label htmlFor="role" className="sr-only">{t('users.filterByRole')}</label>
              <select
                id="role"
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="select select-bordered"
              >
                <option value="">{t('users.allRoles')}</option>
                <option value="super_admin">{t('users.roles.superAdmin')}</option>
                <option value="clinic_admin">{t('users.roles.clinicAdmin')}</option>
                <option value="professional_caregiver">{t('users.roles.professionalCaregiver')}</option>
                <option value="family_caregiver">{t('users.roles.familyCaregiver')}</option>
                <option value="patient">{t('users.roles.patient')}</option>
              </select>
            </div>
            
            <div className="form-control">
              <label htmlFor="isActive" className="sr-only">{t('users.filterByStatus')}</label>
              <select
                id="isActive"
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="select select-bordered"
              >
                <option value="">{t('users.allStatus')}</option>
                <option value="true">{t('users.active')}</option>
                <option value="false">{t('users.inactive')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title">
              {t('users.usersCount', { count: pagination.total })}
            </h2>
            <div className="text-sm text-base-content/60">
              {t('users.showingUsers', { showing: users.length, total: pagination.total })}
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="mx-auto h-12 w-12 opacity-50" />
            <h3 className="mt-2 text-sm font-medium">{t('users.noUsersFound')}</h3>
            <p className="mt-1 text-sm opacity-70">
              {t('users.noUsersMatchFilters')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>{t('users.tableHeaders.user')}</th>
                  <th>{t('users.tableHeaders.role')}</th>
                  <th>{t('users.tableHeaders.organization')}</th>
                  <th>{t('users.tableHeaders.status')}</th>
                  <th>{t('users.tableHeaders.lastLogin')}</th>
                  <th>{t('users.tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar
                          variant="initial"
                          color="primary"
                          size="md"
                          aria-label={`${userItem.name} avatar`}
                        >
                          {userItem.name.charAt(0)}
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userItem.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {userItem.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(userItem.role)}`}>
                        {formatRole(userItem.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userItem.organization?.name || t('users.noOrganization')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        userItem.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userItem.isActive ? t('users.active') : t('users.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userItem.lastLoginAt 
                        ? new Date(userItem.lastLoginAt).toLocaleDateString()
                        : t('users.never')
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => setEditingUser(userItem)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {userItem.isActive ? (
                        <button
                          onClick={() => handleDeactivateUser(userItem.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateUser(userItem.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {t('users.pagination.showingPage', { page: pagination.page, totalPages: pagination.totalPages })}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-3 py-1 rounded-md text-sm ${
                    pagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-3 py-1 rounded-md text-sm ${
                    pagination.page === pagination.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <UserEditForm
          user={editingUser}
          onSubmit={(formData) => handleUpdateUser(editingUser.id, formData)}
          onCancel={() => setEditingUser(null)}
        />
      )}
    </div>
  );
};

// User Edit Form Component
interface UserEditFormProps {
  user: UserWithStats;
  onSubmit: (formData: any) => void;
  onCancel: () => void;
}

const UserEditForm: React.FC<UserEditFormProps> = ({ user, onSubmit, onCancel }) => {
  const { isSuperAdmin } = useAuth();
  const { t } = useTranslation('admin');
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || '',
    isActive: user.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{t('users.editUser')}</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              {t('users.nameRequired')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {t('users.emailRequired')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {isSuperAdmin && (
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                {t('users.roleRequired')}
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="super_admin">{t('users.roles.superAdmin')}</option>
                <option value="clinic_admin">{t('users.roles.clinicAdmin')}</option>
                <option value="professional_caregiver">{t('users.roles.professionalCaregiver')}</option>
                <option value="family_caregiver">{t('users.roles.familyCaregiver')}</option>
                <option value="patient">{t('users.roles.patient')}</option>
              </select>
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              {t('users.activeLabel')}
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {t('users.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('users.updateUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;