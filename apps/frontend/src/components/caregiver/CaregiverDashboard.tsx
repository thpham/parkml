import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CaregiverAssignment, ApiResponse, Patient, User } from '@parkml/shared';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  User as UserIcon,
  Heart,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AssignmentWithDetails extends CaregiverAssignment {
  patient: Patient;
  assignedByUser?: User;
}

interface CaregiverStats {
  totalAssignments: number;
  pendingAssignments: number;
  activeAssignments: number;
  patientsCount: number;
}

const CaregiverDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [stats, setStats] = useState<CaregiverStats>({
    totalAssignments: 0,
    pendingAssignments: 0,
    activeAssignments: 0,
    patientsCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && token) {
      fetchAssignments();
    }
  }, [user, token]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assignments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse<AssignmentWithDetails[]> = await response.json();

      if (data.success && data.data) {
        setAssignments(data.data);
        calculateStats(data.data);
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

  const calculateStats = (assignmentData: AssignmentWithDetails[]) => {
    const pending = assignmentData.filter(a => a.status === 'pending').length;
    const active = assignmentData.filter(a => a.status === 'active').length;
    const uniquePatients = new Set(assignmentData.map(a => a.patientId)).size;

    setStats({
      totalAssignments: assignmentData.length,
      pendingAssignments: pending,
      activeAssignments: active,
      patientsCount: uniquePatients
    });
  };

  const handleAssignmentResponse = async (assignmentId: string, status: 'active' | 'declined') => {
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(`Assignment ${status === 'active' ? 'accepted' : 'declined'} successfully`);
        fetchAssignments(); // Refresh the list
      } else {
        toast.error(data.error || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  const formatCaregiverType = (type: string) => {
    return type === 'professional' ? 'Professional' : 'Family';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'declined':
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
        return <CheckCircle className="h-4 w-4" />;
      case 'declined':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const activeAssignments = assignments.filter(a => a.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
            <p className="text-gray-600">
              Manage your patient care assignments and responsibilities
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-red-500" />
            <span className="text-lg font-medium text-gray-900">
              {formatCaregiverType(user?.role?.replace('_caregiver', '') || '')} Caregiver
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Assignments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalAssignments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingAssignments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Assignments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeAssignments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Patients
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.patientsCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Assignment Requests */}
      {pendingAssignments.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">
                Pending Assignment Requests ({pendingAssignments.length})
              </h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              These assignments require your response
            </p>
          </div>
          
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {pendingAssignments.map((assignment) => (
                <li key={assignment.id} className="px-6 py-4 bg-yellow-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          Patient: {assignment.patient.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Assignment Type: {formatCaregiverType(assignment.caregiverType)}
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Requested: {new Date(assignment.createdAt).toLocaleDateString()}
                          {assignment.assignedByUser && (
                            <span className="ml-3">
                              By: {assignment.assignedByUser.name}
                            </span>
                          )}
                        </div>
                        {assignment.notes && (
                          <div className="text-sm text-gray-600 mt-1">
                            <strong>Notes:</strong> {assignment.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAssignmentResponse(assignment.id, 'active')}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleAssignmentResponse(assignment.id, 'declined')}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Decline
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Active Assignments */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Active Assignments ({activeAssignments.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeAssignments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active assignments</h3>
            <p className="mt-1 text-sm text-gray-500">
              You currently have no active patient assignments.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {activeAssignments.map((assignment) => (
                <li key={assignment.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.patient.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCaregiverType(assignment.caregiverType)} caregiver
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Started: {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : 'N/A'}
                          {assignment.consentGiven && assignment.consentDate && (
                            <span className="ml-3">
                              Consent: {new Date(assignment.consentDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                        {getStatusIcon(assignment.status)}
                        <span className="ml-1">Active</span>
                      </span>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Consent</div>
                        <div className={`text-xs font-medium ${
                          assignment.consentGiven ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {assignment.consentGiven ? 'Given' : 'Pending'}
                        </div>
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
    </div>
  );
};

export default CaregiverDashboard;