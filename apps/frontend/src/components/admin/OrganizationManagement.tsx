import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Organization, ApiResponse } from '@parkml/shared';
import { Building, Plus, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const OrganizationManagement: React.FC = () => {
  const { user, token, isSuperAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  useEffect(() => {
    if (user && token && isSuperAdmin) {
      fetchOrganizations();
    }
  }, [user, token, isSuperAdmin]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setOrganizations(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch organizations');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (formData: any) => {
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success('Organization created successfully');
        setShowCreateForm(false);
        fetchOrganizations();
      } else {
        toast.error(data.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Failed to create organization');
    }
  };

  const handleUpdateOrganization = async (id: string, formData: any) => {
    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success('Organization updated successfully');
        setEditingOrg(null);
        fetchOrganizations();
      } else {
        toast.error(data.error || 'Failed to update organization');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
    }
  };

  const toggleOrganizationStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(`Organization ${!isActive ? 'activated' : 'deactivated'} successfully`);
        fetchOrganizations();
      } else {
        toast.error(data.error || 'Failed to update organization status');
      }
    } catch (error) {
      console.error('Error updating organization status:', error);
      toast.error('Failed to update organization status');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <Building className="h-12 w-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage organizations.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
            <p className="text-gray-600">Manage healthcare organizations and clinics</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </button>
        </div>
      </div>

      {/* Organizations List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Organizations ({organizations.length})</h2>
        </div>
        
        {organizations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first organization to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {organizations.map((org) => (
                <li key={org.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-full ${org.isActive ? 'bg-green-500' : 'bg-gray-500'} flex items-center justify-center`}>
                          <Building className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {org.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {org.description || 'No description'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Created: {new Date(org.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        org.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {org.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => setEditingOrg(org)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleOrganizationStatus(org.id, org.isActive)}
                        className={`inline-flex items-center px-3 py-1 border text-sm font-medium rounded-md ${
                          org.isActive
                            ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                            : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {org.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateForm && (
        <OrganizationForm
          onSubmit={handleCreateOrganization}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Organization Modal */}
      {editingOrg && (
        <OrganizationForm
          organization={editingOrg}
          onSubmit={(formData) => handleUpdateOrganization(editingOrg.id, formData)}
          onCancel={() => setEditingOrg(null)}
        />
      )}
    </div>
  );
};

// Organization Form Component
interface OrganizationFormProps {
  organization?: Organization;
  onSubmit: (formData: any) => void;
  onCancel: () => void;
}

const OrganizationForm: React.FC<OrganizationFormProps> = ({ organization, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    description: organization?.description || '',
    address: organization?.address || '',
    phone: organization?.phone || '',
    email: organization?.email || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {organization ? 'Edit Organization' : 'Create Organization'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name *
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
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {organization ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationManagement;