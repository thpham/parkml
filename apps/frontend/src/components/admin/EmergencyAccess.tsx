import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import { EmergencyAccess as EmergencyAccessType, ApiResponse, Patient } from '@parkml/shared';
import { Avatar } from '../shared';
import { 
  AlertTriangle, 
  Clock, 
  Shield, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  Plus,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EmergencyAccessWithDetails extends EmergencyAccessType {
  patient?: Patient;
}

const EmergencyAccess: React.FC = () => {
  const { t } = useTranslation('admin');
  const { user, token, isAdmin } = useAuth();
  const [emergencyAccess, setEmergencyAccess] = useState<EmergencyAccessWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    accessType: '',
    isActive: '',
  });

  useEffect(() => {
    if (user && token) {
      fetchEmergencyAccess();
    }
  }, [user, token, filters]);

  const fetchEmergencyAccess = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      );

      const response = await fetch(`/api/emergency-access?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse<{ emergencyAccesses: EmergencyAccessWithDetails[], pagination: any }> = await response.json();

      if (data.success) {
        setEmergencyAccess(data.data?.emergencyAccesses || []);
      } else {
        toast.error(data.error || t('emergency.errors.fetchError'));
      }
    } catch (error) {
      console.error('Error fetching emergency access:', error);
      toast.error(t('emergency.errors.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (formData: any) => {
    try {
      const response = await fetch('/api/emergency-access/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(t('emergency.success.requestSuccess'));
        setShowRequestForm(false);
        fetchEmergencyAccess();
      } else {
        toast.error(data.error || t('emergency.errors.requestError'));
      }
    } catch (error) {
      console.error('Error requesting emergency access:', error);
      toast.error(t('emergency.errors.requestError'));
    }
  };

  const handleRevokeAccess = async (id: string) => {
    if (!confirm(t('emergency.revokeConfirmation'))) {
      return;
    }

    try {
      const response = await fetch(`/api/emergency-access/${id}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(t('emergency.success.revokeSuccess'));
        fetchEmergencyAccess();
      } else {
        toast.error(data.error || t('emergency.errors.revokeError'));
      }
    } catch (error) {
      console.error('Error revoking emergency access:', error);
      toast.error(t('emergency.errors.revokeError'));
    }
  };

  const getAccessTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'medical_emergency':
        return 'badge-error';
      case 'technical_support':
        return 'badge-primary';
      case 'data_recovery':
        return 'badge-warning';
      case 'audit_investigation':
        return 'badge-secondary';
      default:
        return 'badge-ghost';
    }
  };

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'medical_emergency':
        return <AlertTriangle className="h-4 w-4" />;
      case 'technical_support':
        return <Shield className="h-4 w-4" />;
      case 'data_recovery':
        return <Clock className="h-4 w-4" />;
      case 'audit_investigation':
        return <User className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatAccessType = (type: string) => {
    const typeMap: Record<string, string> = {
      'medical_emergency': t('emergency.accessTypes.medicalEmergency'),
      'technical_support': t('emergency.accessTypes.technicalSupport'),
      'data_recovery': t('emergency.accessTypes.dataRecovery'),
      'audit_investigation': t('emergency.accessTypes.auditInvestigation'),
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const isExpired = (endTime: string | Date) => {
    if (!endTime) return true;
    return new Date(endTime) < new Date();
  };

  const getTimeRemaining = (endTime: string | Date) => {
    if (!endTime) return t('emergency.timeRemaining.expired');
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return t('emergency.timeRemaining.expired');

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return t('emergency.timeRemaining.hoursMinutes', { hours, minutes });
    } else {
      return t('emergency.timeRemaining.minutesOnly', { minutes });
    }
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
              <h1 className="card-title text-2xl">{t('emergency.title')}</h1>
              <p className="text-base-content/70">{t('emergency.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowRequestForm(true)}
              className="btn btn-error"
            >
              <Plus className="h-4 w-4" />
              {t('emergency.requestButton')}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="flex-1 form-control">
              <label htmlFor="search" className="sr-only">{t('emergency.ariaLabels.searchEmergencyAccess')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 opacity-50" />
                <input
                  type="text"
                  id="search"
                  placeholder={t('emergency.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input input-bordered w-full pl-10"
                />
              </div>
            </div>
            
            <div className="form-control">
              <label htmlFor="accessType" className="sr-only">{t('emergency.ariaLabels.filterByAccessType')}</label>
              <select
                id="accessType"
                value={filters.accessType}
                onChange={(e) => handleFilterChange('accessType', e.target.value)}
                className="select select-bordered"
              >
                <option value="">{t('emergency.allTypes')}</option>
                <option value="medical_emergency">{t('emergency.accessTypes.medicalEmergency')}</option>
                <option value="technical_support">{t('emergency.accessTypes.technicalSupport')}</option>
                <option value="data_recovery">{t('emergency.accessTypes.dataRecovery')}</option>
                <option value="audit_investigation">{t('emergency.accessTypes.auditInvestigation')}</option>
              </select>
            </div>
            
            <div className="form-control">
              <label htmlFor="isActive" className="sr-only">{t('emergency.ariaLabels.filterByStatus')}</label>
              <select
                id="isActive"
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="select select-bordered"
              >
                <option value="">{t('emergency.allStatus')}</option>
                <option value="true">{t('emergency.active')}</option>
                <option value="false">{t('emergency.expired')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Access List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            {t('emergency.recordsCount', { count: emergencyAccess.length })}
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg text-error"></span>
          </div>
        ) : emergencyAccess.length === 0 ? (
          <div className="p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 opacity-50" />
            <h3 className="mt-2 text-sm font-medium">{t('emergency.noRecordsTitle')}</h3>
            <p className="mt-1 text-sm opacity-70">
              {t('emergency.noRecordsMessage')}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {emergencyAccess.map((access) => (
                <li key={access.id} className="px-6 py-4 hover:bg-base-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar
                        variant="icon"
                        status={access.isActive && !isExpired(access.endTime || '') ? 'error' : 'inactive'}
                        size="md"
                        aria-label={t('emergency.ariaLabels.emergencyAccessRecord', { accessType: formatAccessType(access.accessType) })}
                      >
                        {getAccessTypeIcon(access.accessType)}
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium">
                          {access.patient?.name || t('emergency.patientNotFound')}
                        </div>
                        <div className="text-sm opacity-70">
                          {access.reason}
                        </div>
                        <div className="flex items-center text-xs opacity-60 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {t('emergency.requestedLabel')} {new Date(access.startTime).toLocaleString()}
                          {access.endTime && (
                            <span className="ml-3">
                              {access.isActive && !isExpired(access.endTime) 
                                ? getTimeRemaining(access.endTime)
                                : `${t('emergency.endedLabel')} ${new Date(access.endTime).toLocaleString()}`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`badge ${getAccessTypeBadgeColor(access.accessType)} gap-1`}>
                          {getAccessTypeIcon(access.accessType)}
                          {formatAccessType(access.accessType)}
                        </div>
                        <div className="mt-1">
                          {access.isActive && !isExpired(access.endTime || '') ? (
                            <div className="flex items-center text-success">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span className="text-xs">{t('emergency.active')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center opacity-50">
                              <XCircle className="h-4 w-4 mr-1" />
                              <span className="text-xs">{t('emergency.expired')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {access.isActive && !isExpired(access.endTime || '') && isAdmin && (
                        <button
                          onClick={() => handleRevokeAccess(access.id)}
                          className="btn btn-ghost btn-xs text-error"
                        >
                          {t('emergency.revokeButton')}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <EmergencyAccessForm
          onSubmit={handleRequestAccess}
          onCancel={() => setShowRequestForm(false)}
        />
      )}
    </div>
  );
};

// Emergency Access Request Form Component
interface EmergencyAccessFormProps {
  onSubmit: (formData: any) => void;
  onCancel: () => void;
}

const EmergencyAccessForm: React.FC<EmergencyAccessFormProps> = ({ onSubmit, onCancel }) => {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    patientId: '',
    reason: '',
    accessType: 'medical_emergency',
    durationHours: 2,
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
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
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) : value,
    });
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 text-error mr-2" />
          {t('emergency.requestTitle')}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor="patientId">
              <span className="label-text">{t('emergency.patientLabel')} {t('emergency.requiredField')}</span>
            </label>
            <select
              id="patientId"
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              required
              className="select select-bordered select-error w-full"
            >
              <option value="">{t('emergency.selectPatient')}</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="accessType">
              <span className="label-text">{t('emergency.accessTypeLabel')} {t('emergency.requiredField')}</span>
            </label>
            <select
              id="accessType"
              name="accessType"
              value={formData.accessType}
              onChange={handleChange}
              required
              className="select select-bordered select-error w-full"
            >
              <option value="medical_emergency">{t('emergency.accessTypes.medicalEmergency')}</option>
              <option value="technical_support">{t('emergency.accessTypes.technicalSupport')}</option>
              <option value="data_recovery">{t('emergency.accessTypes.dataRecovery')}</option>
              <option value="audit_investigation">{t('emergency.accessTypes.auditInvestigation')}</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="durationHours">
              <span className="label-text">{t('emergency.durationLabel')} {t('emergency.requiredField')}</span>
            </label>
            <input
              type="number"
              id="durationHours"
              name="durationHours"
              value={formData.durationHours}
              onChange={handleChange}
              min="1"
              max="24"
              required
              className="input input-bordered input-error w-full"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="reason">
              <span className="label-text">{t('emergency.reasonLabel')} {t('emergency.requiredField')}</span>
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              required
              placeholder={t('emergency.reasonPlaceholder')}
              className="textarea textarea-bordered textarea-error w-full"
            />
          </div>

          <div className="alert alert-error">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <strong>{t('emergency.warning')}</strong> {t('emergency.warningMessage')}
            </div>
          </div>

          <div className="modal-action">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
            >
              {t('emergency.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-error"
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : null}
              {loading ? t('emergency.requesting') : t('emergency.requestAccessButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmergencyAccess;