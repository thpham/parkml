import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LanguageSelector from '../shared/LanguageSelector';
import { useTranslation } from '../../hooks/useTranslation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAdmin, token } = useAuth();
  const { t, isLoading, error } = useTranslation(['navigation', 'common']);
  const isSuperAdmin = user?.role === 'super_admin';
  const navigate = useNavigate();
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [pendingConsent, setPendingConsent] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


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

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  // Show loading while translations are loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg mb-4"></span>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if translations failed to load
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-error mb-4">Translation Error</div>
          <p className="text-gray-600">{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Mobile-Responsive Navigation with Drawer */}
      <div className="drawer">
        <input id="mobile-drawer" type="checkbox" className="drawer-toggle" checked={isMobileMenuOpen} onChange={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        
        <div className="drawer-content flex flex-col">
          {/* Top Navigation Bar */}
          <div className="navbar bg-base-100 shadow-lg">
            <div className="navbar-start">
              {/* Mobile Menu Button */}
              <label htmlFor="mobile-drawer" className="btn btn-square btn-ghost lg:hidden">
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </label>
              
              {/* Logo */}
              <div className="flex items-center ml-2 lg:ml-0">
                <h1 className="text-xl font-bold">{t('app.name')}</h1>
                <span className="ml-2 text-sm opacity-60 hidden sm:inline">{t('app.subtitle')}</span>
              </div>
            </div>

            {/* Desktop Navigation Center */}
            <div className="navbar-center hidden lg:flex">
              <div className="menu menu-horizontal px-1 space-x-2">
                <button
                  onClick={() => handleNavigation('/dashboard')}
                  className="btn btn-ghost btn-sm"
                >
                  <Home className="h-4 w-4" />
                  {t('menu.dashboard')}
                </button>
                
                {(user?.role === 'professional_caregiver' || user?.role === 'family_caregiver') && (
                  <button
                    onClick={() => handleNavigation('/caregiver/assignments')}
                    className="btn btn-ghost btn-sm relative"
                  >
                    <Users className="h-4 w-4" />
                    {t('menu.myAssignments')}
                    {pendingAssignments > 0 && (
                      <div className="badge badge-error badge-sm absolute -top-2 -right-2">
                        {pendingAssignments}
                      </div>
                    )}
                  </button>
                )}
                
                {user?.role === 'patient' && (
                  <>
                    <button
                      onClick={() => handleNavigation('/patient/consent')}
                      className="btn btn-ghost btn-sm relative"
                    >
                      <Users className="h-4 w-4" />
                      {t('menu.caregiverConsent')}
                      {pendingConsent > 0 && (
                        <div className="badge badge-error badge-sm absolute -top-2 -right-2">
                          {pendingConsent}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => handleNavigation('/symptoms/new')}
                      className="btn btn-ghost btn-sm"
                    >
                      <PlusCircle className="h-4 w-4" />
                      {t('menu.addSymptoms')}
                    </button>
                  </>
                )}
                
                {isAdmin && (
                  <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                      <Settings className="h-4 w-4" />
                      {t('menu.admin')}
                      <ChevronDown className="h-3 w-3" />
                    </div>
                    <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                      <li>
                        <button
                          onClick={() => handleNavigation('/admin/analytics')}
                          className="flex items-center"
                        >
                          <BarChart3 className="h-4 w-4" />
                          {t('menu.analytics')}
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleNavigation('/admin/users')}
                          className="flex items-center"
                        >
                          <Users className="h-4 w-4" />
                          {t('menu.userManagement')}
                        </button>
                      </li>
                      {isSuperAdmin && (
                        <li>
                          <button
                            onClick={() => handleNavigation('/admin/organizations')}
                            className="flex items-center"
                          >
                            <Building className="h-4 w-4" />
                            {t('menu.organizations')}
                          </button>
                        </li>
                      )}
                      <li>
                        <button
                          onClick={() => handleNavigation('/admin/assignments')}
                          className="flex items-center"
                        >
                          <UserPlus className="h-4 w-4" />
                          {t('menu.assignments')}
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleNavigation('/admin/emergency-access')}
                          className="flex items-center"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          {t('menu.emergencyAccess')}
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* User Menu */}
            <div className="navbar-end">
              <div className="flex items-center space-x-2">
                {/* Language Selector */}
                <LanguageSelector compact className="hidden sm:flex" />
                
                {/* User Profile Dropdown */}
                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline font-medium">{user?.name}</span>
                    <span className="ml-2 opacity-60 capitalize hidden md:inline">({user?.role})</span>
                    <ChevronDown className="h-3 w-3" />
                  </div>
                  <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                    <li>
                      <button
                        onClick={() => handleNavigation('/profile')}
                        className="flex items-center"
                      >
                        <User className="h-4 w-4" />
                        {t('menu.profile')}
                      </button>
                    </li>
                    <li>
                      <hr className="my-1" />
                    </li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className="flex items-center text-error"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('menu.logout')}
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>

        {/* Mobile Drawer Sidebar */}
        <div className="drawer-side lg:hidden">
          <label htmlFor="mobile-drawer" className="drawer-overlay"></label>
          <aside className="w-64 min-h-full bg-base-200">
            {/* Mobile Menu Header */}
            <div className="p-4 bg-base-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{t('app.name')}</h2>
                  <p className="text-sm opacity-60">{t('app.subtitle')}</p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn btn-ghost btn-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mobile Menu Items */}
            <ul className="menu p-4 space-y-2">
              {/* User Info */}
              <li className="mb-4">
                <div className="flex items-center p-2 bg-base-100 rounded-lg">
                  <User className="h-8 w-8 mr-3" />
                  <div>
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-sm opacity-60 capitalize">{user?.role}</div>
                  </div>
                </div>
              </li>

              {/* Navigation Items */}
              <li>
                <button
                  onClick={() => handleNavigation('/dashboard')}
                  className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full"
                >
                  <Home className="h-5 w-5 mr-3" />
                  {t('menu.dashboard')}
                </button>
              </li>
              
              {(user?.role === 'professional_caregiver' || user?.role === 'family_caregiver') && (
                <li>
                  <button
                    onClick={() => handleNavigation('/caregiver/assignments')}
                    className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full relative"
                  >
                    <Users className="h-5 w-5 mr-3" />
                    {t('menu.myAssignments')}
                    {pendingAssignments > 0 && (
                      <div className="badge badge-error badge-sm ml-auto">
                        {pendingAssignments}
                      </div>
                    )}
                  </button>
                </li>
              )}
              
              {user?.role === 'patient' && (
                <>
                  <li>
                    <button
                      onClick={() => handleNavigation('/patient/consent')}
                      className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full relative"
                    >
                      <Users className="h-5 w-5 mr-3" />
                      {t('menu.caregiverConsent')}
                      {pendingConsent > 0 && (
                        <div className="badge badge-error badge-sm ml-auto">
                          {pendingConsent}
                        </div>
                      )}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigation('/symptoms/new')}
                      className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full"
                    >
                      <PlusCircle className="h-5 w-5 mr-3" />
                      {t('menu.addSymptoms')}
                    </button>
                  </li>
                </>
              )}
              
              {isAdmin && (
                <>
                  <li className="mt-4">
                    <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-2">
                      {t('menu.administration')}
                    </div>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigation('/admin/analytics')}
                      className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full"
                    >
                      <BarChart3 className="h-5 w-5 mr-3" />
                      {t('menu.analytics')}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigation('/admin/users')}
                      className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full"
                    >
                      <Users className="h-5 w-5 mr-3" />
                      {t('menu.userManagement')}
                    </button>
                  </li>
                  {isSuperAdmin && (
                    <li>
                      <button
                        onClick={() => handleNavigation('/admin/organizations')}
                        className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full"
                      >
                        <Building className="h-5 w-5 mr-3" />
                        {t('menu.organizations')}
                      </button>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={() => handleNavigation('/admin/assignments')}
                      className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full"
                    >
                      <UserPlus className="h-5 w-5 mr-3" />
                      {t('menu.assignments')}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigation('/admin/emergency-access')}
                      className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full"
                    >
                      <AlertTriangle className="h-5 w-5 mr-3" />
                      {t('menu.emergencyAccess')}
                    </button>
                  </li>
                </>
              )}

              {/* Profile */}
              <li className="mt-4">
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="flex items-center p-3 hover:bg-base-100 rounded-lg w-full"
                >
                  <User className="h-5 w-5 mr-3" />
                  {t('menu.profile')}
                </button>
              </li>

              {/* Language Selector for Mobile */}
              <li className="mt-4">
                <div className="px-3 py-2">
                  <LanguageSelector mobile className="w-full" />
                </div>
              </li>

              {/* Logout */}
              <li className="mt-6">
                <button
                  onClick={handleLogout}
                  className="flex items-center p-3 hover:bg-error hover:text-error-content rounded-lg w-full text-error"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  {t('menu.logout')}
                </button>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Layout;