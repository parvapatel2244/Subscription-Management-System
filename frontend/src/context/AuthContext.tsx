import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (tokens: { access_token: string; refresh_token: string }) => Promise<void>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
  isCustomer: boolean;
  isAdminOrStaff: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<User>('/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (tokens: { access_token: string; refresh_token: string }) => {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    await fetchUser();
  };

  const logout = () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      api.post('/auth/logout', { refresh_token: refresh }).catch(() => {});
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (code: string) => {
    if (!user || !Array.isArray(user.roles)) return false;
    return user.roles.some((r) => r && r.code === code);
  };

  const hasPermission = (code: string) => {
    if (!user) return false;
    if (Array.isArray(user.roles) && user.roles.some((r) => r && r.code === 'SUPER_ADMIN')) return true;
    return Array.isArray(user.permissions) ? user.permissions.includes(code) : false;
  };

  const isCustomer = user && Array.isArray(user.roles) ? user.roles.some((r) => r && r.code === 'CUSTOMER') : false;
  const isAdminOrStaff = user ? !isCustomer : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        hasPermission,
        hasRole,
        isCustomer,
        isAdminOrStaff,
        refreshUser: fetchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

