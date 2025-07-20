import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import {
  Users,
  Building,
  UserPlus,
  AlertTriangle,
  BarChart3,
  Shield,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalOrganizations: number;
  pendingAssignments: number;
  activeEmergencyAccess: number;
  recentActivity: number;
}

const AdminDashboard: React.FC = () => {
  const { user, token, isAdmin } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const navigate = useNavigate();
  const { t } = useTranslation(['admin', 'common']);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPatients: 0,
    totalOrganizations: 0,
    pendingAssignments: 0,
    activeEmergencyAccess: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && token && isAdmin) {
      fetchAdminStats();
    }
  }, [user, token, isAdmin]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);

      // Fetch users count
      const usersResponse = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch patients count
      const patientsResponse = await fetch('/api/patients', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch assignments for pending count
      const assignmentsResponse = await fetch('/api/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Process responses
      let totalUsers = 0,
        totalPatients = 0,
        pendingAssignments = 0;

      if (usersResponse.ok) {
        const userData = await usersResponse.json();
        if (userData.success) {
          totalUsers = userData.data.length;
        }
      }

      if (patientsResponse.ok) {
        const patientData = await patientsResponse.json();
        if (patientData.success) {
          totalPatients = patientData.data.length;
        }
      }

      if (assignmentsResponse.ok) {
        const assignmentData = await assignmentsResponse.json();
        if (assignmentData.success) {
          pendingAssignments = assignmentData.data.filter(
            (a: any) => a.status === 'pending'
          ).length;
        }
      }

      setStats({
        totalUsers,
        totalPatients,
        totalOrganizations: 3, // From seed data
        pendingAssignments,
        activeEmergencyAccess: 2, // Placeholder - would fetch from emergency access API
        recentActivity: 15, // Placeholder - would fetch from audit logs
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error(t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {t('messages.accessDenied', { ns: 'common' })}
        </h3>
        <p className="mt-1 text-sm text-gray-500">{t('dashboard.accessDeniedMessage')}</p>
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
              <h1 className="card-title text-2xl">
                {isSuperAdmin
                  ? t('dashboard.systemAdministrationTitle')
                  : t('dashboard.clinicAdministrationTitle')}
              </h1>
              <p className="text-base-content/70">
                {isSuperAdmin
                  ? t('dashboard.systemOverviewSubtitle')
                  : `${t('dashboard.organizationManagementSubtitle')} ${user?.organization?.name || t('misc.yourClinic')}`}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-medium capitalize">
                {user?.role?.replace('_', ' ')}
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
          <div className="stat-title">
            {isSuperAdmin ? t('stats.totalUsers') : t('stats.organizationUsers')}
          </div>
          <div className="stat-value text-primary">{stats.totalUsers}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <Users className="h-8 w-8" />
          </div>
          <div className="stat-title">
            {isSuperAdmin ? t('stats.totalPatients') : t('stats.organizationPatients')}
          </div>
          <div className="stat-value text-secondary">{stats.totalPatients}</div>
        </div>

        {isSuperAdmin && (
          <div className="stat">
            <div className="stat-figure text-secondary">
              <Building className="h-8 w-8" />
            </div>
            <div className="stat-title">{t('stats.organizations')}</div>
            <div className="stat-value text-secondary">{stats.totalOrganizations}</div>
          </div>
        )}

        <div className="stat">
          <div className="stat-figure text-warning">
            <UserPlus className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('stats.pendingAssignments')}</div>
          <div className="stat-value text-warning">{stats.pendingAssignments}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-error">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('stats.emergencyAccess')}</div>
          <div className="stat-value text-error">{stats.activeEmergencyAccess}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <Activity className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('stats.recentActivity')}</div>
          <div className="stat-value text-info">{stats.recentActivity}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{t('dashboard.quickActionsTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="btn btn-ghost justify-start h-auto p-4 border border-base-300"
            >
              <Users className="h-8 w-8 text-primary mr-3" />
              <div className="text-left">
                <div className="font-medium text-base-content">{t('actions.userManagement')}</div>
                <div className="text-sm text-base-content/60">
                  {isSuperAdmin
                    ? t('actions.userManagementDescriptionSuper')
                    : t('actions.userManagementDescriptionClinic')}
                </div>
              </div>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => navigate('/admin/organizations')}
                className="btn btn-ghost justify-start h-auto p-4 border border-base-300"
              >
                <Building className="h-8 w-8 text-secondary mr-3" />
                <div className="text-left">
                  <div className="font-medium text-base-content">{t('actions.organizations')}</div>
                  <div className="text-sm text-base-content/60">
                    {t('actions.organizationsDescription')}
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => navigate('/admin/assignments')}
              className="btn btn-ghost justify-start h-auto p-4 border border-base-300"
            >
              <UserPlus className="h-8 w-8 text-success mr-3" />
              <div className="text-left">
                <div className="font-medium text-base-content">{t('actions.assignments')}</div>
                <div className="text-sm text-base-content/60">
                  {isSuperAdmin
                    ? t('actions.assignmentsDescriptionSuper')
                    : t('actions.assignmentsDescriptionClinic')}
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/emergency-access')}
              className="btn btn-ghost justify-start h-auto p-4 border border-base-300"
            >
              <AlertTriangle className="h-8 w-8 text-error mr-3" />
              <div className="text-left">
                <div className="font-medium text-base-content">{t('actions.emergencyAccess')}</div>
                <div className="text-sm text-base-content/60">
                  {t('actions.emergencyAccessDescription')}
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/analytics')}
              className="btn btn-ghost justify-start h-auto p-4 border border-base-300"
            >
              <BarChart3 className="h-8 w-8 text-info mr-3" />
              <div className="text-left">
                <div className="font-medium text-base-content">{t('actions.analytics')}</div>
                <div className="text-sm text-base-content/60">
                  {isSuperAdmin
                    ? t('actions.analyticsDescriptionSuper')
                    : t('actions.analyticsDescriptionClinic')}
                </div>
              </div>
            </button>

            {stats.pendingAssignments > 0 && (
              <button
                onClick={() => navigate('/admin/assignments')}
                className="btn btn-warning justify-start h-auto p-4"
              >
                <UserPlus className="h-8 w-8 mr-3" />
                <div className="text-left">
                  <div className="font-medium">
                    {stats.pendingAssignments} {t('stats.pendingAssignments')}
                    {stats.pendingAssignments > 1 ? 's' : ''}
                  </div>
                  <div className="text-sm opacity-80">{t('alerts.requiresAttention')}</div>
                </div>
              </button>
            )}

            {stats.activeEmergencyAccess > 0 && (
              <button
                onClick={() => navigate('/admin/emergency-access')}
                className="btn btn-error justify-start h-auto p-4"
              >
                <AlertTriangle className="h-8 w-8 mr-3" />
                <div className="text-left">
                  <div className="font-medium">
                    {stats.activeEmergencyAccess} {t('stats.emergencyAccess')}
                  </div>
                  <div className="text-sm opacity-80">{t('alerts.monitorClosely')}</div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{t('dashboard.systemStatusTitle')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-success rounded-full mr-3"></div>
                <span className="text-sm font-medium text-success">
                  {t('system.databaseConnection')}
                </span>
              </div>
              <span className="text-sm text-success/80">{t('system.healthy')}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-success rounded-full mr-3"></div>
                <span className="text-sm font-medium text-success">{t('system.apiServices')}</span>
              </div>
              <span className="text-sm text-success/80">{t('system.operational')}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-info rounded-full mr-3"></div>
                <span className="text-sm font-medium text-info">
                  {t('system.emergencyAccessCleanup')}
                </span>
              </div>
              <span className="text-sm text-info/80">{t('system.running')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
