import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserByEmail, TestUser } from './mockUsers';
import { mockUsers, User } from './mockDataService';
import { simulateDelay } from './mockDataService';

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  role: string;
  expiresAt: string;
}

export const authService = {
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    await simulateDelay();
    // Mock registration - in real app, this would create a new user
    throw new Error('Registration not supported in mock mode');
  },

  login: async (data: LoginDto): Promise<AuthResponse> => {
    await simulateDelay();
    
    const testUser = getUserByEmail(data.email);
    
    if (!testUser || testUser.password !== data.password) {
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
    
    return authResponse;
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  getStoredToken: async (): Promise<string | null> => {
    return await AsyncStorage.getItem('token');
  },

  getStoredUser: async (): Promise<any | null> => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) {
        return null;
      }
      
      const userData = JSON.parse(userStr);
      
      // Validate that parsed data is an object with required fields
      if (userData && typeof userData === 'object' && userData.userId) {
        return userData;
      } else {
        // Invalid data structure, clear it
        console.error('Invalid user data structure in getStoredUser, clearing AsyncStorage');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        return null;
      }
    } catch (error) {
      // Invalid JSON or other error, clear corrupted data
      console.error('Error parsing user data in getStoredUser:', error);
      try {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
      } catch (clearError) {
        console.error('Error clearing AsyncStorage in getStoredUser:', clearError);
      }
      return null;
    }
  },
};
