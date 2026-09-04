import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthResponse } from '../services/authService';
import { mockAuthService } from '../services/mock/mockAuthService';
import { isMockDataEnabled } from '../config/apiConfig';

interface AuthContextType {
  user: AuthResponse | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = authService.getStoredUser();
    const storedToken = authService.getStoredToken();

    if (storedUser && storedToken) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const service = isMockDataEnabled() ? mockAuthService : authService;
    const response = await service.login({ email, password });
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response));
    setUser(response);
  };

  const register = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    role: string = 'Producer'
  ) => {
    const service = isMockDataEnabled() ? mockAuthService : authService;
    const response = await service.register({ email, password, firstName, lastName, role });
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response));
    setUser(response);
  };

  const logout = () => {
    try {
      // Clear entity cache on logout so the next user never sees stale data.
      void import('../utils/entityCache').then(({ EntityCache }) => EntityCache.clearAll());
      void import('../utils/offlineQueue').then(({ OfflineQueue }) => OfflineQueue.clearQueue());
    } catch {
      // ignore
    }
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
