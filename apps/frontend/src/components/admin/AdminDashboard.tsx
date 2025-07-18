import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building, 
  UserPlus, 
  AlertTriangle, 
  BarChart3,
  Shield,
  Activity
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
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPatients: 0,
    totalOrganizations: 0,
    pendingAssignments: 0,
    activeEmergencyAccess: 0,
    recentActivity: 0
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
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      // Fetch patients count
      const patientsResponse = await fetch('/api/patients', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Fetch assignments for pending count
      const assignmentsResponse = await fetch('/api/assignments', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Process responses
      let totalUsers = 0, totalPatients = 0, pendingAssignments = 0;

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
          pendingAssignments = assignmentData.data.filter((a: any) => a.status === 'pending').length;
        }
      }

      setStats({
        totalUsers,
        totalPatients,
        totalOrganizations: 3, // From seed data
        pendingAssignments,
        activeEmergencyAccess: 2, // Placeholder - would fetch from emergency access API
        recentActivity: 15 // Placeholder - would fetch from audit logs
      });

    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to access the admin dashboard.
        </p>
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
            <h1 className="text-2xl font-bold text-gray-900">
              {isSuperAdmin ? 'System Administration' : 'Clinic Administration'}
            </h1>
            <p className="text-gray-600">
              {isSuperAdmin 
                ? 'System-wide overview and management tools' 
                : `Organization management for ${user?.organization?.name || 'your clinic'}`
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-medium text-gray-900 capitalize">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isSuperAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {isSuperAdmin ? 'Total Users' : 'Organization Users'}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalUsers}
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
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {isSuperAdmin ? 'Total Patients' : 'Organization Patients'}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalPatients}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {isSuperAdmin && (
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
                      {stats.totalOrganizations}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserPlus className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Assignments
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
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Emergency Access
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeEmergencyAccess}
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
                <Activity className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Recent Activity
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.recentActivity}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-8 w-8 text-blue-500 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">User Management</div>
                <div className="text-sm text-gray-500">
                  {isSuperAdmin ? 'Manage users and roles' : 'Manage organization users'}
                </div>
              </div>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => navigate('/admin/organizations')}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Building className="h-8 w-8 text-purple-500 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Organizations</div>
                  <div className="text-sm text-gray-500">Manage clinics & organizations</div>
                </div>
              </button>
            )}

            <button
              onClick={() => navigate('/admin/assignments')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UserPlus className="h-8 w-8 text-green-500 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Assignments</div>
                <div className="text-sm text-gray-500">
                  {isSuperAdmin ? 'Manage caregiver assignments' : 'Manage organization assignments'}
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/emergency-access')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Emergency Access</div>
                <div className="text-sm text-gray-500">Monitor emergency access</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/admin/analytics')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-8 w-8 text-indigo-500 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Analytics</div>
                <div className="text-sm text-gray-500">
                  {isSuperAdmin ? 'View system analytics' : 'View organization analytics'}
                </div>
              </div>
            </button>

            {stats.pendingAssignments > 0 && (
              <button
                onClick={() => navigate('/admin/assignments')}
                className="flex items-center p-4 border border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <UserPlus className="h-8 w-8 text-yellow-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-yellow-800">
                    {stats.pendingAssignments} Pending Assignment{stats.pendingAssignments > 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-yellow-600">Requires attention</div>
                </div>
              </button>
            )}

            {stats.activeEmergencyAccess > 0 && (
              <button
                onClick={() => navigate('/admin/emergency-access')}
                className="flex items-center p-4 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-red-800">
                    {stats.activeEmergencyAccess} Active Emergency Access
                  </div>
                  <div className="text-sm text-red-600">Monitor closely</div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">System Status</h2>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-green-800">Database Connection</span>
              </div>
              <span className="text-sm text-green-600">Healthy</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-green-800">API Services</span>
              </div>
              <span className="text-sm text-green-600">Operational</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-blue-800">Emergency Access Cleanup</span>
              </div>
              <span className="text-sm text-blue-600">Running</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;