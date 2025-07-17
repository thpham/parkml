import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ApiResponse } from '@parkml/shared';
import { 
  BarChart3, 
  Users, 
  Building, 
  Activity, 
  AlertTriangle,
  Shield,
  UserCheck
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
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [emergencyStats, setEmergencyStats] = useState<EmergencyAccessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('7'); // days

  useEffect(() => {
    if (user && token && isAdmin) {
      fetchSystemStats();
      fetchEmergencyStats();
    }
  }, [user, token, isAdmin, selectedOrganization, timeRange]);

  const fetchSystemStats = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedOrganization) {
        params.append('organizationId', selectedOrganization);
      }
      params.append('timeRange', timeRange);

      const response = await fetch(`/api/analytics/system?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse<SystemStats> = await response.json();

      if (data.success) {
        setSystemStats(data.data || null);
      } else {
        toast.error(data.error || 'Failed to fetch system statistics');
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast.error('Failed to fetch system statistics');
    }
  };

  const fetchEmergencyStats = async () => {
    try {
      const response = await fetch('/api/analytics/emergency-access', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: ApiResponse<EmergencyAccessStats> = await response.json();

      if (data.success) {
        setEmergencyStats(data.data || null);
      } else {
        toast.error(data.error || 'Failed to fetch emergency access statistics');
      }
    } catch (error) {
      console.error('Error fetching emergency stats:', error);
      toast.error('Failed to fetch emergency access statistics');
    } finally {
      setLoading(false);
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

  const formatAccessType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <BarChart3 className="h-12 w-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view analytics.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">System performance and usage statistics</p>
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="timeRange" className="sr-only">Time range</label>
              <select
                id="timeRange"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
            <div>
              <label htmlFor="organization" className="sr-only">Filter by organization</label>
              <select
                id="organization"
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Organizations</option>
                {systemStats?.organizations?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* System Overview Stats */}
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
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {systemStats?.totalUsers || 0}
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
                <UserCheck className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Patients
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {systemStats?.totalPatients || 0}
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
                <Building className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Organizations
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {systemStats?.totalOrganizations || 0}
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
                <Activity className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Assignments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {systemStats?.activeAssignments || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Access Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Emergency Access Overview</h2>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {emergencyStats?.total || 0}
              </div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {emergencyStats?.active || 0}
              </div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {emergencyStats?.expired || 0}
              </div>
              <div className="text-sm text-gray-500">Expired</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900">By Type</h3>
            {emergencyStats?.byType && Object.entries(emergencyStats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAccessTypeColor(type)}`}>
                  {formatAccessType(type)}
                </span>
                <span className="text-sm text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Emergency Access by Organization</h2>
            <Building className="h-5 w-5 text-blue-500" />
          </div>
          
          <div className="space-y-3">
            {emergencyStats?.byOrganization?.map((org) => (
              <div key={org.organizationId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {org.organizationName}
                  </div>
                  <div className="text-xs text-gray-500">
                    Emergency Access Records
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {org.count}
                </div>
              </div>
            ))}
            
            {(!emergencyStats?.byOrganization || emergencyStats.byOrganization.length === 0) && (
              <div className="text-center py-4 text-gray-500">
                <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No emergency access records found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Organization Statistics</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emergency Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {systemStats?.organizations?.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900">
                        {org.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.userCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.patientCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.assignmentCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.emergencyAccessCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      org.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(!systemStats?.organizations || systemStats.organizations.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">No organizations found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;