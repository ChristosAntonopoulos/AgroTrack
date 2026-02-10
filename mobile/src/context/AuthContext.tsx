import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TestUser, getUserByEmail } from '../services/mockUsers';
import { mockUsers, User } from '../services/mockDataService';
import { cleanupStorage } from '../utils/storageCleanup';
import { toBoolean } from '../utils/booleanConverter';

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  role: string;
  expiresAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
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
      // Cleanup and validate storage data before reading
      await cleanupStorage();
      
      const userStr = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');
      
      if (userStr && token) {
        try {
          const userData = JSON.parse(userStr);
          // Validate that userData is an object and has required fields
          if (userData && typeof userData === 'object' && userData.userId) {
            // Find user in mock data
            const foundUser = mockUsers.find(u => u.id === userData.userId);
            if (foundUser) {
              setUser(foundUser);
            }
          } else {
            // Invalid data, clear it
            console.error('Invalid user data structure, clearing AsyncStorage');
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('token');
          }
        } catch (parseError) {
          // Invalid JSON, clear corrupted data
          console.error('Error parsing user data:', parseError);
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Clear potentially corrupted data
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
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const testUser = getUserByEmail(email);
    
    if (!testUser || testUser.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    const mockUser = mockUsers.find(u => u.id === testUser.userId);
    if (!mockUser) {
      throw new Error('User not found');
    }
    
    // Create mock token
    const token = `mock_token_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const authResponse: AuthResponse = {
      token,
      userId: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      expiresAt,
    };
    
    // Store in AsyncStorage
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(authResponse));
    
    setUser(mockUser);
    
    return authResponse;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  const isFieldOwner = () => user?.role === 'FieldOwner';
  const isProducer = () => user?.role === 'Producer';
  const isAgronomist = () => user?.role === 'Agronomist';
  const isAdministrator = () => user?.role === 'Administrator';
  const isServiceProvider = () => user?.role === 'ServiceProvider';
  const hasRole = (role: string) => user?.role === role;

  // Ensure all boolean values are strict booleans to prevent serialization issues
  // React Context might serialize/deserialize values, converting booleans to strings
  const safeIsAuthenticated = toBoolean(!!user, 'AuthContext.isAuthenticated');
  const safeIsLoading = toBoolean(isLoading, 'AuthContext.isLoading');
  
  if (__DEV__) {
    if (typeof safeIsAuthenticated !== 'boolean') {
      console.error('[AuthContext] ⚠️ isAuthenticated is NOT boolean! Type:', typeof safeIsAuthenticated, 'Value:', safeIsAuthenticated);
    }
    if (typeof safeIsLoading !== 'boolean') {
      console.error('[AuthContext] ⚠️ isLoading is NOT boolean! Type:', typeof safeIsLoading, 'Value:', safeIsLoading);
    }
    console.log('[AuthContext] Providing context - isAuthenticated:', safeIsAuthenticated, 'isLoading:', safeIsLoading);
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: safeIsAuthenticated,
    login,
    logout,
    isLoading: safeIsLoading,
    isFieldOwner,
    isProducer,
    isAgronomist,
    isAdministrator,
    isServiceProvider,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
