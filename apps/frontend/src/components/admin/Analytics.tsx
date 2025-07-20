import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { ApiResponse } from '@parkml/shared';
import {
  BarChart3,
  Users,
  Building,
  Activity,
  AlertTriangle,
  Shield,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OrganizationStats {
  id: string;
  name: string;
  userCount: number;
  patientCount: number;
  assignmentCount: number;
  emergencyAccessCount: number;
  isActive: boolean;
}

interface SystemStats {
  totalUsers: number;
  totalPatients: number;
  totalOrganizations: number;
  totalAssignments: number;
  activeAssignments: number;
  totalEmergencyAccess: number;
  activeEmergencyAccess: number;
  organizations: OrganizationStats[];
}

interface EmergencyAccessStats {
  total: number;
  active: number;
  expired: number;
  byType: Record<string, number>;
  byOrganization: Array<{
    organizationId: string;
    organizationName: string;
    count: number;
  }>;
}

const Analytics: React.FC = () => {
  const { user, token, isAdmin } = useAuth();
  const { t } = useTranslation('admin');
  const isSuperAdmin = user?.role === 'super_admin';
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [emergencyStats, setEmergencyStats] = useState<EmergencyAccessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('7'); // days

  const fetchSystemStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedOrganization) {
        params.append('organizationId', selectedOrganization);
      }
      params.append('timeRange', timeRange);

      const response = await fetch(`/api/analytics/system?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<SystemStats> = await response.json();

      if (data.success) {
        setSystemStats(data.data || null);
      } else {
        toast.error(data.error || t('analytics.errors.systemStatsError'));
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast.error(t('analytics.errors.systemStatsError'));
    }
  }, [selectedOrganization, timeRange, token, t]);

  const fetchEmergencyStats = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics/emergency-access', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<EmergencyAccessStats> = await response.json();

      if (data.success) {
        setEmergencyStats(data.data || null);
      } else {
        toast.error(data.error || t('analytics.errors.emergencyStatsError'));
      }
    } catch (error) {
      console.error('Error fetching emergency stats:', error);
      toast.error(t('analytics.errors.emergencyStatsError'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    if (user && token && isAdmin) {
      fetchSystemStats();
      fetchEmergencyStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchSystemStats and fetchEmergencyStats excluded to prevent infinite loop
  }, [user, token, isAdmin, selectedOrganization, timeRange]);

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

  const formatAccessType = (type: string) => {
    const typeMap: Record<string, string> = {
      medical_emergency: t('analytics.accessTypes.medicalEmergency'),
      technical_support: t('analytics.accessTypes.technicalSupport'),
      data_recovery: t('analytics.accessTypes.dataRecovery'),
      audit_investigation: t('analytics.accessTypes.auditInvestigation'),
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <div className="text-error mb-4">
          <BarChart3 className="h-12 w-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('analytics.errors.accessDeniedTitle')}</h2>
        <p className="opacity-70">{t('analytics.errors.accessDeniedMessage')}</p>
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
                  ? t('analytics.systemDashboardTitle')
                  : t('analytics.organizationDashboardTitle')}
              </h1>
              <p className="text-base-content/70">
                {isSuperAdmin
                  ? t('analytics.systemOverviewSubtitle')
                  : `${t('analytics.organizationOverviewSubtitle')} ${user?.organization?.name || t('analytics.filters.yourOrganization')}`}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="form-control">
                <label htmlFor="timeRange" className="sr-only">
                  {t('analytics.filters.timeRangeLabel')}
                </label>
                <select
                  id="timeRange"
                  value={timeRange}
                  onChange={e => setTimeRange(e.target.value)}
                  className="select select-bordered select-sm"
                >
                  <option value="7">{t('analytics.timeRanges.last7Days')}</option>
                  <option value="30">{t('analytics.timeRanges.last30Days')}</option>
                  <option value="90">{t('analytics.timeRanges.last90Days')}</option>
                </select>
              </div>
              {isSuperAdmin && (
                <div className="form-control">
                  <label htmlFor="organization" className="sr-only">
                    {t('analytics.filters.organizationLabel')}
                  </label>
                  <select
                    id="organization"
                    value={selectedOrganization}
                    onChange={e => setSelectedOrganization(e.target.value)}
                    className="select select-bordered select-sm"
                  >
                    <option value="">{t('analytics.allOrganizations')}</option>
                    {systemStats?.organizations?.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Overview Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Users className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('analytics.stats.totalUsers')}</div>
          <div className="stat-value text-primary">{systemStats?.totalUsers || 0}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <UserCheck className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('analytics.stats.totalPatients')}</div>
          <div className="stat-value text-secondary">{systemStats?.totalPatients || 0}</div>
        </div>

        {isSuperAdmin && (
          <div className="stat">
            <div className="stat-figure text-accent">
              <Building className="h-8 w-8" />
            </div>
            <div className="stat-title">{t('analytics.stats.organizations')}</div>
            <div className="stat-value text-accent">{systemStats?.totalOrganizations || 0}</div>
          </div>
        )}

        <div className="stat">
          <div className="stat-figure text-warning">
            <Activity className="h-8 w-8" />
          </div>
          <div className="stat-title">{t('analytics.stats.activeAssignments')}</div>
          <div className="stat-value text-warning">{systemStats?.activeAssignments || 0}</div>
        </div>
      </div>

      {/* Emergency Access Stats */}
      <div
        className={`grid grid-cols-1 gap-6 ${isSuperAdmin ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}
      >
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">{t('analytics.emergencyAccessOverview')}</h2>
              <AlertTriangle className="h-5 w-5 text-error" />
            </div>

            <div className="stats stats-horizontal mb-6">
              <div className="stat">
                <div className="stat-value text-base-content">{emergencyStats?.total || 0}</div>
                <div className="stat-title">{t('analytics.stats.total')}</div>
              </div>
              <div className="stat">
                <div className="stat-value text-success">{emergencyStats?.active || 0}</div>
                <div className="stat-title">{t('analytics.stats.active')}</div>
              </div>
              <div className="stat">
                <div className="stat-value text-error">{emergencyStats?.expired || 0}</div>
                <div className="stat-title">{t('analytics.stats.expired')}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('analytics.byType')}</h3>
              {emergencyStats?.byType &&
                Object.entries(emergencyStats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className={`badge ${getAccessTypeBadgeColor(type)}`}>
                      {formatAccessType(type)}
                    </span>
                    <span className="text-sm">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">{t('analytics.emergencyAccessByOrganization')}</h2>
                <Building className="h-5 w-5 text-primary" />
              </div>

              <div className="space-y-3">
                {emergencyStats?.byOrganization?.map(org => (
                  <div
                    key={org.organizationId}
                    className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-medium">{org.organizationName}</div>
                      <div className="text-xs opacity-70">
                        {t('analytics.emergencyAccessRecords')}
                      </div>
                    </div>
                    <div className="text-lg font-bold">{org.count}</div>
                  </div>
                ))}

                {(!emergencyStats?.byOrganization ||
                  emergencyStats.byOrganization.length === 0) && (
                  <div className="text-center py-4">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-70">{t('analytics.noEmergencyRecords')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Organizations Table - Super Admin Only */}
      {isSuperAdmin && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{t('analytics.organizationStatistics')}</h2>

            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>{t('analytics.tableHeaders.organizationHeader')}</th>
                    <th>{t('analytics.tableHeaders.usersHeader')}</th>
                    <th>{t('analytics.tableHeaders.patientsHeader')}</th>
                    <th>{t('analytics.tableHeaders.assignmentsHeader')}</th>
                    <th>{t('analytics.tableHeaders.emergencyAccessHeader')}</th>
                    <th>{t('analytics.tableHeaders.statusHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {systemStats?.organizations?.map(org => (
                    <tr key={org.id}>
                      <td>
                        <div className="flex items-center">
                          <Building className="h-5 w-5 opacity-50 mr-3" />
                          <div className="font-medium">{org.name}</div>
                        </div>
                      </td>
                      <td>{org.userCount}</td>
                      <td>{org.patientCount}</td>
                      <td>{org.assignmentCount}</td>
                      <td>{org.emergencyAccessCount}</td>
                      <td>
                        <div className={`badge ${org.isActive ? 'badge-success' : 'badge-error'}`}>
                          {org.isActive
                            ? t('analytics.status.active')
                            : t('analytics.status.inactive')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(!systemStats?.organizations || systemStats.organizations.length === 0) && (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm opacity-70">{t('analytics.noOrganizations')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
