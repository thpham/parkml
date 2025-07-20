import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import './i18n'; // Initialize i18next
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './components/dashboard/Dashboard';
import SymptomForm from './components/symptoms/SymptomForm';
import OrganizationManagement from './components/admin/OrganizationManagement';
import UserManagement from './components/admin/UserManagement';
import CaregiverAssignments from './components/admin/CaregiverAssignments';
import EmergencyAccess from './components/admin/EmergencyAccess';
import Analytics from './components/admin/Analytics';
import CaregiverDashboard from './components/caregiver/CaregiverDashboard';
import PatientConsentDashboard from './components/patient/PatientConsentDashboard';
import ProfilePage from './pages/ProfilePage';
import './App.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

// Auth Pages Component
const AuthPages: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto pt-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ParkML</h1>
          <p className="mt-2 text-gray-600">Parkinson's Disease Monitoring Platform</p>
        </div>
        
        {isLoginPage ? <LoginForm /> : <RegisterForm />}
        
        <div className="mt-6 text-center">
          {isLoginPage ? (
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </a>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
const AppContent: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><AuthPages /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><AuthPages /></PublicRoute>} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/symptoms/:patientId" element={
            <ProtectedRoute>
              <Layout>
                <SymptomForm patientId={""} />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Caregiver Routes */}
          <Route path="/caregiver/assignments" element={
            <ProtectedRoute>
              <Layout>
                <CaregiverDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Patient Routes */}
          <Route path="/patient/consent" element={
            <ProtectedRoute>
              <Layout>
                <PatientConsentDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin/organizations" element={
            <ProtectedRoute>
              <Layout>
                <OrganizationManagement />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/assignments" element={
            <ProtectedRoute>
              <Layout>
                <CaregiverAssignments />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/emergency-access" element={
            <ProtectedRoute>
              <Layout>
                <EmergencyAccess />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/analytics" element={
            <ProtectedRoute>
              <Layout>
                <Analytics />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Profile Route */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={
            user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          } />
        </Routes>
      </div>
      <Toaster position="top-right" />
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;