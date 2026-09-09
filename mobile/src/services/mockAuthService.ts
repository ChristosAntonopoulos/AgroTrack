import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserByEmail } from './mockUsers';
import { mockUsers, simulateDelay } from './mockDataService';

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
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

export const mockAuthService = {
  register: async (_data: RegisterDto): Promise<AuthResponse> => {
    await simulateDelay();
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
    const token = `mock_token_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const auth: AuthResponse = {
      token,
      userId: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      expiresAt,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
    };
    await AsyncStorage.setItem('token', auth.token);
    await AsyncStorage.setItem('user', JSON.stringify(auth));
    return auth;
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  getStoredToken: async (): Promise<string | null> => AsyncStorage.getItem('token'),

  getStoredUser: async (): Promise<any | null> => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return null;
      const userData = JSON.parse(userStr);
      if (userData && typeof userData === 'object' && userData.userId) {
        return userData;
      }
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      return null;
    } catch {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      return null;
    }
  },
};
