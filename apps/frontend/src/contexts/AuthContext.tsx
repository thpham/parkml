import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Organization } from '@parkml/shared';

interface AuthContextType {
  user: User | null;
  token: string | null;
  organization: Organization | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string, organizationId?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isClinicAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('parkml_token');
    const storedUser = localStorage.getItem('parkml_user');
    const storedOrganization = localStorage.getItem('parkml_organization');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      if (storedOrganization) {
        setOrganization(JSON.parse(storedOrganization));
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.data.user);
      setToken(data.data.token);
      
      // Set organization if available
      if (data.data.user.organization) {
        setOrganization(data.data.user.organization);
        localStorage.setItem('parkml_organization', JSON.stringify(data.data.user.organization));
      }
      
      // Store in localStorage
      localStorage.setItem('parkml_token', data.data.token);
      localStorage.setItem('parkml_user', JSON.stringify(data.data.user));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role: string, organizationId?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, role, organizationId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      setUser(data.data.user);
      setToken(data.data.token);
      
      // Set organization if available
      if (data.data.user.organization) {
        setOrganization(data.data.user.organization);
        localStorage.setItem('parkml_organization', JSON.stringify(data.data.user.organization));
      }
      
      // Store in localStorage
      localStorage.setItem('parkml_token', data.data.token);
      localStorage.setItem('parkml_user', JSON.stringify(data.data.user));
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to log security event
      const currentToken = localStorage.getItem('parkml_token');
      if (currentToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        }).catch(error => {
          // Don't throw on logout API failure - still clear local state
          console.warn('Logout API call failed:', error);
        });
      }
    } catch (error) {
      console.warn('Error during logout API call:', error);
    }
    
    // Always clear local state regardless of API call success
    setUser(null);
    setToken(null);
    setOrganization(null);
    localStorage.removeItem('parkml_token');
    localStorage.removeItem('parkml_user');
    localStorage.removeItem('parkml_organization');
  };

  // Helper functions for role and permission checking
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasPermission = (_permission: string): boolean => {
    // Basic permission checking - can be expanded
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super_admin') return true;
    
    // Add more permission logic as needed
    return true;
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'clinic_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isClinicAdmin = user?.role === 'clinic_admin';

  const value = {
    user,
    token,
    organization,
    login,
    register,
    logout,
    isLoading,
    hasRole,
    hasPermission,
    isAdmin,
    isSuperAdmin,
    isClinicAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};