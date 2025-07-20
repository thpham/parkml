import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { CaregiverAssignment, ApiResponse, Patient, User } from '@parkml/shared';
import { Avatar } from '../shared';
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User as UserIcon,
  Heart,
  Activity,
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
  const { t } = useTranslation('caregiver');
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [stats, setStats] = useState<CaregiverStats>({
    totalAssignments: 0,
    pendingAssignments: 0,
    activeAssignments: 0,
    patientsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assignments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<AssignmentWithDetails[]> = await response.json();

      if (data.success && data.data) {
        setAssignments(data.data);
        calculateStats(data.data);
      } else {
        toast.error(data.error || t('messages.fetchError'));
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error(t('messages.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    if (user && token) {
      fetchAssignments();
    }
  }, [user, token, fetchAssignments]);

  const calculateStats = (assignmentData: AssignmentWithDetails[]) => {
    const pending = assignmentData.filter(a => a.status === 'pending').length;
    const active = assignmentData.filter(a => a.status === 'active').length;
    const uniquePatients = new Set(assignmentData.map(a => a.patientId)).size;

    setStats({
      totalAssignments: assignmentData.length,
      pendingAssignments: pending,
      activeAssignments: active,
      patientsCount: uniquePatients,
    });
  };

  const handleAssignmentResponse = async (assignmentId: string, status: 'active' | 'declined') => {
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        toast.success(
          status === 'active' ? t('messages.assignmentAccepted') : t('messages.assignmentDeclined')
        );
        fetchAssignments(); // Refresh the list
      } else {
        toast.error(data.error || t('messages.updateError'));
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(t('messages.updateError'));
    }
  };

  const formatCaregiverType = (type: string) => {
    return type === 'professional' ? t('types.professional') : t('types.family');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'active':
        return 'badge-success';
      case 'declined':
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
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="card-title text-2xl">{t('dashboard.title')}</h1>
              <p className="text-base-content/70">{t('dashboard.subtitle')}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-error" />
              <span className="text-lg font-medium">
                {formatCaregiverType(user?.role?.replace('_caregiver', '') || '')}{' '}
                {t('dashboard.caregiverSuffix')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Users className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('dashboard.stats.totalAssignments')}</div>
          <div className="stat-value text-primary">{stats.totalAssignments}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-warning">
            <Clock className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('dashboard.stats.pendingRequests')}</div>
          <div className="stat-value text-warning">{stats.pendingAssignments}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-success">
            <Activity className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('dashboard.stats.activeAssignments')}</div>
          <div className="stat-value text-success">{stats.activeAssignments}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <UserIcon className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('dashboard.stats.patients')}</div>
          <div className="stat-value text-secondary">{stats.patientsCount}</div>
        </div>
      </div>

      {/* Pending Assignment Requests */}
      {pendingAssignments.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-warning mr-2" />
              <h2 className="card-title">
                {t('dashboard.pendingRequests.title', { count: pendingAssignments.length })}
              </h2>
            </div>
            <p className="text-sm opacity-70 mt-1">{t('dashboard.pendingRequests.subtitle')}</p>
          </div>

          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {pendingAssignments.map(assignment => (
                <li key={assignment.id} className="px-6 py-4 bg-warning/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar
                        variant="icon"
                        status="warning"
                        size="md"
                        aria-label={t('dashboard.ariaLabels.pendingAssignment', {
                          patient: assignment.patient.name,
                        })}
                      >
                        <UserIcon />
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium">
                          {t('dashboard.pendingRequests.patient')} {assignment.patient.name}
                        </div>
                        <div className="text-sm opacity-70">
                          {t('dashboard.pendingRequests.assignmentType')}{' '}
                          {formatCaregiverType(assignment.caregiverType)}
                        </div>
                        <div className="flex items-center text-xs opacity-60 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {t('dashboard.pendingRequests.requested')}{' '}
                          {new Date(assignment.createdAt).toLocaleDateString()}
                          {assignment.assignedByUser && (
                            <span className="ml-3">
                              {t('dashboard.pendingRequests.by')} {assignment.assignedByUser.name}
                            </span>
                          )}
                        </div>
                        {assignment.notes && (
                          <div className="text-sm opacity-80 mt-1">
                            <strong>{t('dashboard.pendingRequests.notes')}</strong>{' '}
                            {assignment.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAssignmentResponse(assignment.id, 'active')}
                        className="btn btn-success btn-sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {t('dashboard.pendingRequests.accept')}
                      </button>
                      <button
                        onClick={() => handleAssignmentResponse(assignment.id, 'declined')}
                        className="btn btn-ghost btn-sm"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {t('dashboard.pendingRequests.decline')}
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
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            {t('dashboard.activeAssignments.title', { count: activeAssignments.length })}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : activeAssignments.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="mx-auto h-12 w-12 opacity-50" />
            <h3 className="mt-2 text-sm font-medium">
              {t('dashboard.activeAssignments.noActiveTitle')}
            </h3>
            <p className="mt-1 text-sm opacity-70">
              {t('dashboard.activeAssignments.noActiveMessage')}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {activeAssignments.map(assignment => (
                <li key={assignment.id} className="px-6 py-4 hover:bg-base-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar
                        variant="icon"
                        status="active"
                        size="md"
                        aria-label={t('dashboard.ariaLabels.activeAssignment', {
                          patient: assignment.patient.name,
                        })}
                      >
                        <UserIcon />
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium">{assignment.patient.name}</div>
                        <div className="text-sm opacity-70">
                          {formatCaregiverType(assignment.caregiverType)}{' '}
                          {t('dashboard.activeAssignments.caregiverSuffix')}
                        </div>
                        <div className="flex items-center text-xs opacity-60 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {t('dashboard.activeAssignments.started')}{' '}
                          {assignment.startDate
                            ? new Date(assignment.startDate).toLocaleDateString()
                            : 'N/A'}
                          {assignment.consentGiven && assignment.consentDate && (
                            <span className="ml-3">
                              {t('dashboard.activeAssignments.consent')}{' '}
                              {new Date(assignment.consentDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`badge ${getStatusBadgeColor(assignment.status)} gap-1`}>
                        {getStatusIcon(assignment.status)}
                        {t('dashboard.activeAssignments.active')}
                      </div>
                      <div className="text-center">
                        <div className="text-xs opacity-70">
                          {t('dashboard.activeAssignments.consentStatus')}
                        </div>
                        <div
                          className={`text-xs font-medium ${
                            assignment.consentGiven ? 'text-success' : 'text-error'
                          }`}
                        >
                          {assignment.consentGiven
                            ? t('dashboard.activeAssignments.given')
                            : t('dashboard.activeAssignments.pending')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {assignment.notes && (
                    <div className="mt-2 ml-14 text-sm opacity-80">
                      <strong>{t('dashboard.pendingRequests.notes')}</strong> {assignment.notes}
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
