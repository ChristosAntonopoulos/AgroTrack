import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockUsers } from '../services/mockDataService';
import { getAuthService, isMockMode } from '../services/serviceFactory';
import { AuthResponse, authService } from '../services/authService';
import { cleanupStorage } from '../utils/storageCleanup';
import { User } from '../types/user';

export type { AuthResponse };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    inviteCode?: string;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isFieldOwner: () => boolean;
  isProducer: () => boolean;
  isAgronomist: () => boolean;
  isAdministrator: () => boolean;
  isServiceProvider: () => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const authResponseToUser = (auth: AuthResponse): User => ({
  id: auth.userId,
  email: auth.email,
  role: auth.role,
  firstName: auth.firstName,
  lastName: auth.lastName,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await cleanupStorage();
      const service = getAuthService();
      const storedUser = await service.getStoredUser();
      const token = await service.getStoredToken();

      if (storedUser && token) {
        if (!isMockMode() && authService.isSessionExpired(storedUser)) {
          await service.logout();
          return;
        }

        if (isMockMode()) {
          const foundUser = mockUsers.find(u => u.id === storedUser.userId);
          if (foundUser) setUser(foundUser);
        } else {
          setUser(authResponseToUser(storedUser));
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      try {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
      } catch (clearError) {
        console.error('Error clearing AsyncStorage:', clearError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const service = getAuthService();
    const authResponse = await service.login({ email, password });
    await applyAuthState(authResponse);
    return authResponse;
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    inviteCode?: string;
  }): Promise<AuthResponse> => {
    const service = getAuthService();
    const authResponse = await service.register(data);
    await applyAuthState(authResponse);
    return authResponse;
  };

  const applyAuthState = async (authResponse: AuthResponse) => {
    if (isMockMode()) {
      const mockUser = mockUsers.find(u => u.id === authResponse.userId);
      if (mockUser) setUser(mockUser);
    } else {
      setUser(authResponseToUser(authResponse));
    }
  };

  const logout = async () => {
    await getAuthService().logout();
    try {
      const { EntityCache } = await import('../utils/entityCache');
      const { OfflineQueue } = await import('../utils/offlineQueue');
      await EntityCache.clearAll();
      await OfflineQueue.clearQueue();
    } catch (error) {
      console.error('Error clearing offline cache on logout:', error);
    }
    setUser(null);
  };

  const isFieldOwner = () => user?.role === 'FieldOwner';
  const isProducer = () => user?.role === 'Producer';
  const isAgronomist = () => user?.role === 'Agronomist';
  const isAdministrator = () => user?.role === 'Administrator';
  const isServiceProvider = () => user?.role === 'ServiceProvider';
  const hasRole = (role: string) => user?.role === role;

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    isLoading: Boolean(isLoading),
    isFieldOwner,
    isProducer,
    isAgronomist,
    isAdministrator,
    isServiceProvider,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
