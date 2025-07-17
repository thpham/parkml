import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Home, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
              
              {user?.role === 'caregiver' && (
                <button
                  onClick={() => navigate('/symptoms/new')}
                  className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Symptoms
                </button>
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