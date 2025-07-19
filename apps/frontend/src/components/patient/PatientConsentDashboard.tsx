import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { CaregiverAssignment, ApiResponse, User } from '@parkml/shared';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  AlertTriangle,
  Shield,
  Calendar,
  User as UserIcon,
  Heart,
  CheckCircle,
  XCircle,
  Eye,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AssignmentWithDetails extends CaregiverAssignment {
  caregiver: User;
  assignedByUser?: User;
}

interface ConsentStats {
  totalAssignments: number;
  pendingConsent: number;
  activeAssignments: number;
  declinedAssignments: number;
}

const PatientConsentDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const { t } = useTranslation(['patient', 'caregiver', 'common']);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<AssignmentWithDetails[]>([]);
  const [stats, setStats] = useState<ConsentStats>({
    totalAssignments: 0,
    pendingConsent: 0,
    activeAssignments: 0,
    declinedAssignments: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    if (user && token) {
      fetchAssignments();
      fetchPendingConsent();
    }
  }, [user, token]);

  const fetchAssignments = async () => {
    try {
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
        toast.error(data.error || t('patient.consent.fetchAssignmentsError'));
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error(t('patient.consent.fetchAssignmentsError'));
    }
  };

  const fetchPendingConsent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/consent/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse<AssignmentWithDetails[]> = await response.json();

      if (data.success && data.data) {
        setPendingAssignments(data.data);
      } else {
        toast.error(data.error || t('patient.consent.fetchConsentError'));
      }
    } catch (error) {
      console.error('Error fetching pending consent:', error);
      toast.error(t('patient.consent.fetchConsentError'));
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (assignmentData: AssignmentWithDetails[]) => {
    const active = assignmentData.filter(a => a.status === 'active' && a.consentGiven).length;
    const declined = assignmentData.filter(a => a.status === 'declined').length;

    setStats({
      totalAssignments: assignmentData.length,
      pendingConsent: pendingAssignments.length,
      activeAssignments: active,
      declinedAssignments: declined
    });
  };

  const handleConsentResponse = async (assignmentId: string, action: 'approve' | 'decline', permissions?: any) => {
    try {
      const endpoint = action === 'approve' ? 'approve' : 'decline';
      const response = await fetch(`/api/consent/${endpoint}/${assignmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(permissions ? { permissions } : {}),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(t('consent.success.assignmentActionSuccess', { 
          status: action === 'approve' ? t('consent.status.approvedStatus') : t('consent.status.declinedStatus') 
        }));
        fetchAssignments();
        fetchPendingConsent();
        setShowDetails(null);
      } else {
        toast.error(data.error || t('consent.errors.actionAssignmentError', { action }));
      }
    } catch (error) {
      console.error(`Error ${action}ing assignment:`, error);
      toast.error(t('consent.errors.actionAssignmentError', { action }));
    }
  };

  const formatCaregiverType = (type: string) => {
    return type === 'professional' ? t('types.professional', { ns: 'caregiver' }) : t('types.family', { ns: 'caregiver' });
  };

  const getStatusColor = (status: string, consentGiven: boolean) => {
    if (status === 'active' && consentGiven) {
      return 'badge-success';
    } else if (status === 'pending') {
      return 'badge-warning';
    } else if (status === 'declined') {
      return 'badge-error';
    }
    return 'badge-ghost';
  };

  const getStatusIcon = (status: string, consentGiven: boolean) => {
    if (status === 'active' && consentGiven) {
      return <CheckCircle className="h-4 w-4" />;
    } else if (status === 'pending') {
      return <Clock className="h-4 w-4" />;
    } else if (status === 'declined') {
      return <XCircle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getStatusText = (status: string, consentGiven: boolean) => {
    if (status === 'active' && consentGiven) {
      return t('status.active', { ns: 'common' });
    } else if (status === 'pending') {
      return t('consent.stats.pendingConsent');
    } else if (status === 'declined') {
      return t('consent.stats.declined');
    }
    return t('misc.unknown', { ns: 'common' });
  };

  const activeAssignments = assignments.filter(a => a.status === 'active' && a.consentGiven);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('consent.title')}</h1>
            <p className="text-gray-600">
              {t('consent.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-medium text-gray-900">{t('consent.headerText')}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('consent.stats.totalAssignments')}
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
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('consent.stats.pendingConsent')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingConsent}
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
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('consent.stats.approvedCaregivers')}
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
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('consent.stats.declined')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.declinedAssignments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Consent Requests */}
      {pendingAssignments.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">
                {t('consent.requests.pendingCount', { count: pendingAssignments.length })}
              </h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {t('consent.requests.pendingSubtitle')}
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
                          {assignment.caregiver.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCaregiverType(assignment.caregiverType)} {t('types.caregiver')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {t('consent.labels.email')} {assignment.caregiver.email}
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {t('consent.labels.requestedLabel')} {new Date(assignment.createdAt).toLocaleDateString()}
                          {assignment.assignedByUser && (
                            <span className="ml-3">
                              {t('consent.labels.byLabel')} {assignment.assignedByUser.name}
                            </span>
                          )}
                        </div>
                        {assignment.notes && (
                          <div className="text-sm text-gray-600 mt-1">
                            <strong>{t('consent.labels.notes')}</strong> {assignment.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowDetails(assignment.id)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('consent.actions.reviewButton')}
                      </button>
                      <button
                        onClick={() => handleConsentResponse(assignment.id, 'approve')}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        {t('consent.actions.approveButton')}
                      </button>
                      <button
                        onClick={() => handleConsentResponse(assignment.id, 'decline')}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        {t('consent.actions.declineButton')}
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
            {t('consent.approved.count', { count: activeAssignments.length })}
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeAssignments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Heart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('consent.approved.noApprovedTitle')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('consent.approved.noApprovedMessage')}
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
                          {assignment.caregiver.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCaregiverType(assignment.caregiverType)} {t('types.caregiver')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {t('consent.labels.email')} {assignment.caregiver.email}
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {t('consent.labels.approvedLabel')} {assignment.consentDate ? new Date(assignment.consentDate).toLocaleDateString() : t('common.notAvailable')}
                          {assignment.startDate && (
                            <span className="ml-3">
                              {t('consent.labels.startedLabel')} {new Date(assignment.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status, assignment.consentGiven)}`}>
                        {getStatusIcon(assignment.status, assignment.consentGiven)}
                        <span className="ml-1">{getStatusText(assignment.status, assignment.consentGiven)}</span>
                      </span>
                      <button
                        onClick={() => {/* TODO: Implement revoke functionality */}}
                        className="text-red-600 hover:text-red-900 text-xs"
                      >
                        {t('consent.actions.revokeConsentButton')}
                      </button>
                    </div>
                  </div>
                  
                  {assignment.notes && (
                    <div className="mt-2 ml-14 text-sm text-gray-600">
                      <strong>{t('consent.labels.notes')}</strong> {assignment.notes}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Assignment Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Info className="h-5 w-5 text-blue-600 mr-2" />
                  {t('consent.modal.assignmentDetailsTitle')}
                </h3>
                <button
                  onClick={() => setShowDetails(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {(() => {
              const assignment = pendingAssignments.find(a => a.id === showDetails);
              if (!assignment) return null;
              
              return (
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('consent.labels.caregiverNameLabel')}</label>
                        <p className="text-sm text-gray-900">{assignment.caregiver.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('consent.labels.caregiverTypeLabel')}</label>
                        <p className="text-sm text-gray-900">{formatCaregiverType(assignment.caregiverType)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('form.email', { ns: 'common' })}</label>
                        <p className="text-sm text-gray-900">{assignment.caregiver.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('consent.labels.assignedByLabel')}</label>
                        <p className="text-sm text-gray-900">{assignment.assignedByUser?.name || t('common.system')}</p>
                      </div>
                    </div>
                    
                    {assignment.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('form.notes', { ns: 'common' })}</label>
                        <p className="text-sm text-gray-900">{assignment.notes}</p>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex">
                        <Info className="h-5 w-5 text-blue-400 mr-2" />
                        <div className="text-sm text-blue-700">
                          <p><strong>{t('consent.modal.whatThisMeans')}</strong></p>
                          <p className="mt-1">
                            {t('consent.modal.consentMessage1')} {assignment.caregiver.name} 
                            {t('consent.modal.consentMessage2')} {formatCaregiverType(assignment.caregiverType).toLowerCase()} {t('consent.modal.consentMessage3')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={() => setShowDetails(null)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {t('buttons.cancel', { ns: 'common' })}
                      </button>
                      <button
                        onClick={() => handleConsentResponse(assignment.id, 'decline')}
                        className="px-4 py-2 border border-red-300 rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        {t('consent.actions.declineAssignmentButton')}
                      </button>
                      <button
                        onClick={() => handleConsentResponse(assignment.id, 'approve')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        {t('consent.actions.approveAssignmentButton')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientConsentDashboard;