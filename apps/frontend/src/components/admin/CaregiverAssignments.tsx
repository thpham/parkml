import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import { CaregiverAssignment, ApiResponse, User, Patient } from '@parkml/shared';
import { Avatar } from '../shared';
import { 
  UserPlus, 
  Users, 
  Calendar, 
  Check, 
  X, 
  Clock,
  AlertCircle,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AssignmentWithDetails extends CaregiverAssignment {
  patient: Patient;
  caregiver: User;
  assignedByUser?: User;
}

const CaregiverAssignments: React.FC = () => {
  const { t } = useTranslation('admin');
  const { user, token, isAdmin } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    caregiverType: '',
  });

  useEffect(() => {
    if (user && token) {
      fetchAssignments();
    }
  }, [user, token, filters]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      );

      const response = await fetch(`/api/assignments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse<AssignmentWithDetails[]> = await response.json();

      if (data.success) {
        setAssignments(data.data || []);
      } else {
        toast.error(data.error || t('assignments.errors.fetchError'));
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error(t('assignments.errors.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (formData: any) => {
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(t('assignments.success.createSuccess'));
        setShowCreateForm(false);
        fetchAssignments();
      } else {
        toast.error(data.error || t('assignments.errors.createError'));
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error(t('assignments.errors.createError'));
    }
  };

  const handleUpdateAssignmentStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(t('assignments.success.updateSuccess', { status }));
        fetchAssignments();
      } else {
        toast.error(data.error || t('assignments.errors.updateError'));
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(t('assignments.errors.updateError'));
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'active':
        return 'badge-success';
      case 'inactive':
        return 'badge-ghost';
      case 'declined':
        return 'badge-error';
      case 'revoked':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'active':
        return <Check className="h-4 w-4" />;
      case 'declined':
      case 'revoked':
        return <X className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': t('assignments.status.pending'),
      'active': t('assignments.status.active'),
      'inactive': t('assignments.status.inactive'),
      'declined': t('assignments.status.declined'),
      'revoked': t('assignments.status.revoked'),
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatCaregiverType = (type: string) => {
    const typeMap: Record<string, string> = {
      'professional': t('assignments.caregiverTypes.professional'),
      'family': t('assignments.caregiverTypes.family'),
    };
    return typeMap[type] || type;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="card-title text-2xl">{t('assignments.title')}</h1>
              <p className="text-base-content/70">{t('assignments.subtitle')}</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary"
              >
                <UserPlus className="h-4 w-4" />
                {t('assignments.createButton')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="flex-1 form-control">
              <label htmlFor="search" className="sr-only">{t('assignments.searchLabel')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 opacity-50" />
                <input
                  type="text"
                  id="search"
                  placeholder={t('assignments.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input input-bordered w-full pl-10"
                />
              </div>
            </div>
            
            <div className="form-control">
              <label htmlFor="status" className="sr-only">{t('assignments.filterByStatus')}</label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="select select-bordered"
              >
                <option value="">{t('assignments.allStatus')}</option>
                <option value="pending">{t('assignments.status.pending')}</option>
                <option value="active">{t('assignments.status.active')}</option>
                <option value="inactive">{t('assignments.status.inactive')}</option>
                <option value="declined">{t('assignments.status.declined')}</option>
                <option value="revoked">{t('assignments.status.revoked')}</option>
              </select>
            </div>
            
            <div className="form-control">
              <label htmlFor="caregiverType" className="sr-only">{t('assignments.filterByType')}</label>
              <select
                id="caregiverType"
                value={filters.caregiverType}
                onChange={(e) => handleFilterChange('caregiverType', e.target.value)}
                className="select select-bordered"
              >
                <option value="">{t('assignments.allTypes')}</option>
                <option value="professional">{t('assignments.caregiverTypes.professional')}</option>
                <option value="family">{t('assignments.caregiverTypes.family')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            {t('assignments.assignmentsCount', { count: assignments.length })}
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="mx-auto h-12 w-12 opacity-50" />
            <h3 className="mt-2 text-sm font-medium">{t('assignments.noAssignmentsTitle')}</h3>
            <p className="mt-1 text-sm opacity-70">
              {t('assignments.noAssignmentsMessage')}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="px-6 py-4 hover:bg-base-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar
                        variant="icon"
                        color="primary"
                        size="md"
                        aria-label={`${assignment.caregiver.name} ${t('assignments.assignedTo')} ${assignment.patient.name}`}
                      >
                        <Users />
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium">
                          {assignment.caregiver.name} → {assignment.patient.name}
                        </div>
                        <div className="text-sm opacity-70">
                          {formatCaregiverType(assignment.caregiverType)} {t('assignments.caregiverSuffix')}
                        </div>
                        <div className="flex items-center text-xs opacity-60 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {t('assignments.createdLabel')} {new Date(assignment.createdAt).toLocaleDateString()}
                          {assignment.startDate && (
                            <span className="ml-3">
                              {t('assignments.startedLabel')} {new Date(assignment.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xs opacity-70">{t('assignments.consentLabel')}</div>
                        <div className={`text-xs font-medium ${
                          assignment.consentGiven ? 'text-success' : 'text-error'
                        }`}>
                          {assignment.consentGiven ? t('assignments.consentGiven') : t('assignments.consentPending')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`badge ${getStatusBadgeColor(assignment.status)} gap-1`}>
                          {getStatusIcon(assignment.status)}
                          {formatStatus(assignment.status)}
                        </div>
                        {assignment.status === 'pending' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleUpdateAssignmentStatus(assignment.id, 'active')}
                              className="btn btn-ghost btn-xs text-success"
                              title={t('assignments.approve')}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateAssignmentStatus(assignment.id, 'declined')}
                              className="btn btn-ghost btn-xs text-error"
                              title={t('assignments.decline')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {assignment.status === 'active' && (
                          <button
                            onClick={() => handleUpdateAssignmentStatus(assignment.id, 'revoked')}
                            className="btn btn-ghost btn-xs text-error"
                            title={t('assignments.revoke')}
                          >
                            {t('assignments.revoke')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {assignment.notes && (
                    <div className="mt-2 ml-14 text-sm opacity-80">
                      <strong>{t('assignments.notes')}</strong> {assignment.notes}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      {showCreateForm && (
        <AssignmentForm
          onSubmit={handleCreateAssignment}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

// Assignment Form Component
interface AssignmentFormProps {
  onSubmit: (formData: any) => void;
  onCancel: () => void;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({ onSubmit, onCancel }) => {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    patientId: '',
    caregiverId: '',
    caregiverType: 'professional',
    notes: '',
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
    fetchCaregivers();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse<Patient[]> = await response.json();

      if (data.success) {
        setPatients(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchCaregivers = async () => {
    try {
      const response = await fetch('/api/users?role=professional_caregiver&role=family_caregiver', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse<{ users: User[] }> = await response.json();

      if (data.success) {
        setCaregivers(data.data?.users || []);
      }
    } catch (error) {
      console.error('Error fetching caregivers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">{t('assignments.createTitle')}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor="patientId">
              <span className="label-text">{t('assignments.patientLabel')} {t('assignments.requiredField')}</span>
            </label>
            <select
              id="patientId"
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              required
              className="select select-bordered w-full"
            >
              <option value="">{t('assignments.selectPatient')}</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="caregiverId">
              <span className="label-text">{t('assignments.caregiverLabel')} {t('assignments.requiredField')}</span>
            </label>
            <select
              id="caregiverId"
              name="caregiverId"
              value={formData.caregiverId}
              onChange={handleChange}
              required
              className="select select-bordered w-full"
            >
              <option value="">{t('assignments.selectCaregiver')}</option>
              {caregivers.map((caregiver) => (
                <option key={caregiver.id} value={caregiver.id}>
                  {caregiver.name} ({caregiver.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="caregiverType">
              <span className="label-text">{t('assignments.caregiverTypeLabel')} {t('assignments.requiredField')}</span>
            </label>
            <select
              id="caregiverType"
              name="caregiverType"
              value={formData.caregiverType}
              onChange={handleChange}
              required
              className="select select-bordered w-full"
            >
              <option value="professional">{t('assignments.caregiverTypes.professional')}</option>
              <option value="family">{t('assignments.caregiverTypes.family')}</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="notes">
              <span className="label-text">{t('assignments.notesLabel')}</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="textarea textarea-bordered w-full"
            />
          </div>

          <div className="modal-action">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
            >
              {t('assignments.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : null}
              {loading ? t('assignments.creating') : t('assignments.createAssignmentButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaregiverAssignments;