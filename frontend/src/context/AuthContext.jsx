import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  loginUser, 
  registerUser, 
  fetchCurrentUser, 
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword 
} from '../api';

const AuthContext = createContext(null);

export const DEMO_CREDENTIALS = {
  ADMIN: {
    role: 'ADMIN',
    email: 'admin@agritrust.io',
    password: 'AdminSecret2026!',
    name: 'Vikram Malhotra',
    badge: 'Enterprise Platform Governance',
    color: '#8B5CF6'
  },
  FARMER: {
    role: 'FARMER',
    email: 'farmer@agritrust.io',
    password: 'Password123!',
    name: 'Ramesh Patil',
    badge: 'Sahyadri Agri Orchards',
    color: '#10B981'
  },
  LOGISTICS: {
    role: 'LOGISTICS',
    email: 'logistics@agritrust.io',
    password: 'Password123!',
    name: 'Rajesh Gaikwad',
    badge: 'Cold Chain Logistics Express',
    color: '#06B6D4'
  },
  COLD_STORAGE: {
    role: 'COLD_STORAGE',
    email: 'coldstorage@agritrust.io',
    password: 'Password123!',
    name: 'Sanjay Kadam',
    badge: 'MahaCold Agro Infrastructure',
    color: '#3B82F6'
  },
  BUYER: {
    role: 'BUYER',
    email: 'buyer@agritrust.io',
    password: 'Password123!',
    name: 'Ananya Deshmukh',
    badge: 'FreshMart Agro Retailers',
    color: '#EC4899'
  },
  VERIFICATION_TEAM: {
    role: 'VERIFICATION_TEAM',
    email: 'verification@agritrust.io',
    password: 'VerificationOfficer2026!',
    name: 'Sunil Shinde',
    badge: 'AGRI-INSP-0441 Senior Inspector',
    color: '#059669'
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('agritrust_token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate existing token on mount
  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('agritrust_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetchCurrentUser();
        if (response?.user) {
          setUser(response.user);
        } else {
          // Token expired or invalid
          localStorage.removeItem('agritrust_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.warn('Auth token verification error:', err.message);
        localStorage.removeItem('agritrust_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await loginUser(email, password);
      if (response.access_token) {
        localStorage.setItem('agritrust_token', response.access_token);
        setToken(response.access_token);
        setUser(response.user);
        return { success: true, user: response.user };
      }
      throw new Error(response.message || 'Login failed');
    } catch (err) {
      const msg = err.message || 'Failed to authenticate. Check your credentials.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await registerUser(formData);
      if (response.access_token) {
        localStorage.setItem('agritrust_token', response.access_token);
        setToken(response.access_token);
        setUser(response.user);
        return { success: true, user: response.user };
      }
      throw new Error(response.message || 'Registration failed');
    } catch (err) {
      const msg = err.message || 'Registration failed. Please check form details.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const quickLogin = useCallback(async (roleKey) => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (!creds) return;
    return login(creds.email, creds.password);
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('agritrust_token');
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return apiForgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (email, resetToken, newPassword) => {
    return apiResetPassword(email, resetToken, newPassword);
  }, []);

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!user && !!token,
    isLoading,
    authError,
    setAuthError,
    login,
    register,
    quickLogin,
    logout,
    forgotPassword,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
