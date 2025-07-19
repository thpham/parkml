import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Organization, ApiResponse } from '@parkml/shared';
import { Avatar } from '../shared';
import { Building, Plus, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const OrganizationManagement: React.FC = () => {
  const { user, token, isSuperAdmin } = useAuth();
  const { t } = useTranslation('admin');
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
        toast.error(data.error || t('organizations.errors.fetchError'));
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error(t('organizations.errors.fetchError'));
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
        toast.success(t('organizations.success.createSuccess'));
        setShowCreateForm(false);
        fetchOrganizations();
      } else {
        toast.error(data.error || t('organizations.errors.createError'));
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error(t('organizations.errors.createError'));
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
        toast.success(t('organizations.success.updateSuccess'));
        setEditingOrg(null);
        fetchOrganizations();
      } else {
        toast.error(data.error || t('organizations.errors.updateError'));
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error(t('organizations.errors.updateError'));
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
        toast.success(`${t('organizations.sectionTitle')} ${!isActive ? t('organizations.success.activated') : t('organizations.success.deactivated')} successfully`);
        fetchOrganizations();
      } else {
        toast.error(data.error || t('organizations.errors.statusUpdateError'));
      }
    } catch (error) {
      console.error('Error updating organization status:', error);
      toast.error(t('organizations.errors.statusUpdateError'));
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-8">
        <div className="text-error mb-4">
          <Building className="h-12 w-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('messages.accessDenied', { ns: 'common' })}</h2>
        <p className="opacity-70">{t('organizations.errors.accessDeniedMessage')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
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
              <h1 className="card-title text-2xl">{t('organizations.title')}</h1>
              <p className="text-base-content/70">{t('organizations.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />
              {t('organizations.createButton')}
            </button>
          </div>
        </div>
      </div>

      {/* Organizations List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{t('organizations.organizationCount', { count: organizations.length })}</h2>
        </div>
        
        {organizations.length === 0 ? (
          <div className="p-6 text-center">
            <Building className="mx-auto h-12 w-12 opacity-50" />
            <h3 className="mt-2 text-sm font-medium">{t('organizations.noOrganizationsTitle')}</h3>
            <p className="mt-1 text-sm opacity-70">
              {t('organizations.noOrganizationsMessage')}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {organizations.map((org) => (
                <li key={org.id} className="px-6 py-4 hover:bg-base-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar
                        variant="icon"
                        status={org.isActive ? 'active' : 'inactive'}
                        size="md"
                        aria-label={`${org.name} organization logo`}
                      >
                        <Building />
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium">
                          {org.name}
                        </div>
                        <div className="text-sm opacity-70">
                          {org.description || t('misc.noDescription', { ns: 'common' })}
                        </div>
                        <div className="text-xs opacity-60">
                          {t('organizations.createdLabel')} {new Date(org.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`badge ${
                        org.isActive 
                          ? 'badge-success' 
                          : 'badge-error'
                      }`}>
                        {org.isActive ? t('status.active', { ns: 'common' }) : t('status.inactive', { ns: 'common' })}
                      </div>
                      <button
                        onClick={() => setEditingOrg(org)}
                        className="btn btn-ghost btn-sm"
                      >
                        <Edit className="h-3 w-3" />
                        {t('buttons.edit', { ns: 'common' })}
                      </button>
                      <button
                        onClick={() => toggleOrganizationStatus(org.id, org.isActive)}
                        className={`btn btn-sm ${
                          org.isActive
                            ? 'btn-error btn-outline'
                            : 'btn-success btn-outline'
                        }`}
                      >
                        {org.isActive ? t('buttons.deactivate', { ns: 'common' }) : t('buttons.activate', { ns: 'common' })}
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
  const { t } = useTranslation('admin');
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
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">
          {organization ? t('organizations.editTitle') : t('organizations.createTitle')}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor="name">
              <span className="label-text">{t('organizations.nameLabel')} *</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="description">
              <span className="label-text">{t('organizations.descriptionLabel')}</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="textarea textarea-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="address">
              <span className="label-text">{t('organizations.addressLabel')}</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="phone">
              <span className="label-text">{t('organizations.phoneLabel')}</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="email">
              <span className="label-text">{t('organizations.emailLabel')}</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input input-bordered w-full"
            />
          </div>

          <div className="modal-action">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {organization ? t('buttons.update', { ns: 'common' }) : t('buttons.create', { ns: 'common' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationManagement;