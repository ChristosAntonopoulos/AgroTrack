import React, { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthResponse } from '../services/authService';
import { setUnauthorizedHandler } from '../services/api';
import { EntityCache } from '../utils/entityCache';
import { OfflineQueue } from '../utils/offlineQueue';

interface AuthContextType {
  user: AuthResponse | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  updateSession: (patch: Partial<AuthResponse>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const persistSession = (response: AuthResponse) => {
  localStorage.setItem('token', response.token);
  localStorage.setItem('user', JSON.stringify(response));
};

const clearSessionCaches = () => {
  EntityCache.clearAll();
  void OfflineQueue.clearQueue();
};

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
    const response = await authService.login({ email, password });
    clearSessionCaches();
    persistSession(response);
    setUser(response);
  };

  const register = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    inviteCode?: string
  ) => {
    const response = await authService.register({
      email,
      password,
      firstName,
      lastName,
      inviteCode: inviteCode?.trim() || undefined,
    });
    clearSessionCaches();
    persistSession(response);
    setUser(response);
  };

  const logout = useCallback(() => {
    clearSessionCaches();
    authService.logout();
    setUser(null);
  }, []);

  const updateSession = useCallback((patch: Partial<AuthResponse>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, updateSession, loading }}>
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
