import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CaregiverAssignment, ApiResponse, User, Patient } from '@parkml/shared';
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
        toast.error(data.error || 'Failed to fetch assignments');
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch assignments');
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
        toast.success('Assignment created successfully');
        setShowCreateForm(false);
        fetchAssignments();
      } else {
        toast.error(data.error || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
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
        toast.success(`Assignment ${status} successfully`);
        fetchAssignments();
      } else {
        toast.error(data.error || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'revoked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatCaregiverType = (type: string) => {
    return type === 'professional' ? 'Professional' : 'Family';
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
            <h1 className="text-2xl font-bold text-gray-900">Caregiver Assignments</h1>
            <p className="text-gray-600">Manage caregiver assignments and patient consent</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Assignment
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search assignments</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                id="search"
                placeholder="Search by patient or caregiver name..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="status" className="sr-only">Filter by status</label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="declined">Declined</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="caregiverType" className="sr-only">Filter by caregiver type</label>
            <select
              id="caregiverType"
              value={filters.caregiverType}
              onChange={(e) => handleFilterChange('caregiverType', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="professional">Professional</option>
              <option value="family">Family</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Assignments ({assignments.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No assignments match your current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.caregiver.name} → {assignment.patient.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCaregiverType(assignment.caregiverType)} caregiver
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Created: {new Date(assignment.createdAt).toLocaleDateString()}
                          {assignment.startDate && (
                            <span className="ml-3">
                              Started: {new Date(assignment.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Consent</div>
                        <div className={`text-xs font-medium ${
                          assignment.consentGiven ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {assignment.consentGiven ? 'Given' : 'Pending'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                          {getStatusIcon(assignment.status)}
                          <span className="ml-1">{formatStatus(assignment.status)}</span>
                        </span>
                        {assignment.status === 'pending' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleUpdateAssignmentStatus(assignment.id, 'active')}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateAssignmentStatus(assignment.id, 'declined')}
                              className="text-red-600 hover:text-red-900"
                              title="Decline"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {assignment.status === 'active' && (
                          <button
                            onClick={() => handleUpdateAssignmentStatus(assignment.id, 'revoked')}
                            className="text-red-600 hover:text-red-900 text-xs"
                            title="Revoke"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {assignment.notes && (
                    <div className="mt-2 ml-14 text-sm text-gray-600">
                      <strong>Notes:</strong> {assignment.notes}
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Create Assignment</h3>
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
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            <label htmlFor="caregiverId" className="block text-sm font-medium text-gray-700">
              Caregiver *
            </label>
            <select
              id="caregiverId"
              name="caregiverId"
              value={formData.caregiverId}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select caregiver</option>
              {caregivers.map((caregiver) => (
                <option key={caregiver.id} value={caregiver.id}>
                  {caregiver.name} ({caregiver.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="caregiverType" className="block text-sm font-medium text-gray-700">
              Caregiver Type *
            </label>
            <select
              id="caregiverType"
              name="caregiverType"
              value={formData.caregiverType}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="professional">Professional</option>
              <option value="family">Family</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaregiverAssignments;