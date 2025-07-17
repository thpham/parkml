import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EmergencyAccess as EmergencyAccessType, ApiResponse, Patient } from '@parkml/shared';
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

      const data: ApiResponse<EmergencyAccessWithDetails[]> = await response.json();

      if (data.success) {
        setEmergencyAccess(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch emergency access records');
      }
    } catch (error) {
      console.error('Error fetching emergency access:', error);
      toast.error('Failed to fetch emergency access records');
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
        toast.success('Emergency access requested successfully');
        setShowRequestForm(false);
        fetchEmergencyAccess();
      } else {
        toast.error(data.error || 'Failed to request emergency access');
      }
    } catch (error) {
      console.error('Error requesting emergency access:', error);
      toast.error('Failed to request emergency access');
    }
  };

  const handleRevokeAccess = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this emergency access?')) {
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
        toast.success('Emergency access revoked successfully');
        fetchEmergencyAccess();
      } else {
        toast.error(data.error || 'Failed to revoke emergency access');
      }
    } catch (error) {
      console.error('Error revoking emergency access:', error);
      toast.error('Failed to revoke emergency access');
    }
  };

  const getAccessTypeColor = (type: string) => {
    switch (type) {
      case 'medical_emergency':
        return 'bg-red-100 text-red-800';
      case 'technical_support':
        return 'bg-blue-100 text-blue-800';
      case 'data_recovery':
        return 'bg-yellow-100 text-yellow-800';
      case 'audit_investigation':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const isExpired = (endTime: string | Date) => {
    if (!endTime) return true;
    return new Date(endTime) < new Date();
  };

  const getTimeRemaining = (endTime: string | Date) => {
    if (!endTime) return 'Expired';
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergency Access</h1>
            <p className="text-gray-600">Manage emergency access requests and monitoring</p>
          </div>
          <button
            onClick={() => setShowRequestForm(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Emergency Access
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search emergency access</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                id="search"
                placeholder="Search by patient or reason..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="accessType" className="sr-only">Filter by access type</label>
            <select
              id="accessType"
              value={filters.accessType}
              onChange={(e) => handleFilterChange('accessType', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="medical_emergency">Medical Emergency</option>
              <option value="technical_support">Technical Support</option>
              <option value="data_recovery">Data Recovery</option>
              <option value="audit_investigation">Audit Investigation</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="isActive" className="sr-only">Filter by status</label>
            <select
              id="isActive"
              value={filters.isActive}
              onChange={(e) => handleFilterChange('isActive', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Emergency Access List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Emergency Access Records ({emergencyAccess.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : emergencyAccess.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No emergency access records</h3>
            <p className="mt-1 text-sm text-gray-500">
              No emergency access requests found.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {emergencyAccess.map((access) => (
                <li key={access.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          access.isActive && !isExpired(access.endTime || '') 
                            ? 'bg-red-500' 
                            : 'bg-gray-500'
                        }`}>
                          {getAccessTypeIcon(access.accessType)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {access.patient?.name || 'Patient not found'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {access.reason}
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Requested: {new Date(access.startTime).toLocaleString()}
                          {access.endTime && (
                            <span className="ml-3">
                              {access.isActive && !isExpired(access.endTime) 
                                ? getTimeRemaining(access.endTime)
                                : `Ended: ${new Date(access.endTime).toLocaleString()}`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getAccessTypeColor(access.accessType)}`}>
                          {getAccessTypeIcon(access.accessType)}
                          <span className="ml-1">{formatAccessType(access.accessType)}</span>
                        </span>
                        <div className="mt-1">
                          {access.isActive && !isExpired(access.endTime || '') ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span className="text-xs">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-500">
                              <XCircle className="h-4 w-4 mr-1" />
                              <span className="text-xs">Expired</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {access.isActive && !isExpired(access.endTime || '') && isAdmin && (
                        <button
                          onClick={() => handleRevokeAccess(access.id)}
                          className="text-red-600 hover:text-red-900 text-xs"
                        >
                          Revoke
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            Request Emergency Access
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="patientId" className="block text-sm font-medium text-gray-700">
              Patient *
            </label>
            <select
              id="patientId"
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="accessType" className="block text-sm font-medium text-gray-700">
              Access Type *
            </label>
            <select
              id="accessType"
              name="accessType"
              value={formData.accessType}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
            >
              <option value="medical_emergency">Medical Emergency</option>
              <option value="technical_support">Technical Support</option>
              <option value="data_recovery">Data Recovery</option>
              <option value="audit_investigation">Audit Investigation</option>
            </select>
          </div>

          <div>
            <label htmlFor="durationHours" className="block text-sm font-medium text-gray-700">
              Duration (hours) *
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
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Reason *
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              required
              placeholder="Provide detailed justification for emergency access..."
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-sm text-red-700">
                <strong>Warning:</strong> Emergency access is logged and audited. 
                Only use in genuine emergencies and provide complete justification.
              </div>
            </div>
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
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Requesting...' : 'Request Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmergencyAccess;