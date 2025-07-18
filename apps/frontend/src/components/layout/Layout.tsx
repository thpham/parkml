import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LogOut, 
  User, 
  Home, 
  PlusCircle, 
  Settings, 
  Users,
  Building,
  UserPlus,
  AlertTriangle,
  BarChart3,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAdmin, token } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const navigate = useNavigate();
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [pendingConsent, setPendingConsent] = useState(0);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  // Close admin menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setShowAdminMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch pending assignments count for caregivers
  useEffect(() => {
    const fetchPendingAssignments = async () => {
      if ((user?.role === 'professional_caregiver' || user?.role === 'family_caregiver') && token) {
        try {
          const response = await fetch('/api/assignments', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          const data = await response.json();
          if (data.success && data.data) {
            const pending = data.data.filter((assignment: any) => assignment.status === 'pending').length;
            setPendingAssignments(pending);
          }
        } catch (error) {
          console.error('Error fetching pending assignments:', error);
        }
      }
    };

    fetchPendingAssignments();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingAssignments, 30000);
    return () => clearInterval(interval);
  }, [user, token]);

  // Fetch pending consent count for patients
  useEffect(() => {
    const fetchPendingConsent = async () => {
      if (user?.role === 'patient' && token) {
        try {
          const response = await fetch('/api/consent/pending', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          const data = await response.json();
          if (data.success && data.data) {
            setPendingConsent(data.data.length);
          }
        } catch (error) {
          console.error('Error fetching pending consent:', error);
        }
      }
    };

    fetchPendingConsent();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingConsent, 30000);
    return () => clearInterval(interval);
  }, [user, token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ParkML</h1>
              <span className="ml-2 text-sm text-gray-500">Symptom Tracker</span>
            </div>

            {/* Navigation */}
            <nav className="flex space-x-8">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </button>
              
              {(user?.role === 'professional_caregiver' || user?.role === 'family_caregiver') && (
                <button
                  onClick={() => navigate('/caregiver/assignments')}
                  className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium relative"
                >
                  <Users className="h-4 w-4 mr-1" />
                  My Assignments
                  {pendingAssignments > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {pendingAssignments}
                    </span>
                  )}
                </button>
              )}
              
              {user?.role === 'patient' && (
                <>
                  <button
                    onClick={() => navigate('/patient/consent')}
                    className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium relative"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Caregiver Consent
                    {pendingConsent > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {pendingConsent}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate('/symptoms/new')}
                    className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add Symptoms
                  </button>
                </>
              )}
              
              {isAdmin && (
                <div className="relative" ref={adminMenuRef}>
                  <button
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Admin
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </button>
                  
                  {showAdminMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <button
                        onClick={() => {
                          navigate('/admin/analytics');
                          setShowAdminMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/users');
                          setShowAdminMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        User Management
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            navigate('/admin/organizations');
                            setShowAdminMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Building className="h-4 w-4 mr-2" />
                          Organizations
                        </button>
                      )}
                      <button
                        onClick={() => {
                          navigate('/admin/assignments');
                          setShowAdminMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assignments
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/emergency-access');
                          setShowAdminMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Emergency Access
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <User className="h-4 w-4 mr-1" />
                <span className="font-medium">{user?.name}</span>
                <span className="ml-2 text-gray-500 capitalize">({user?.role})</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;