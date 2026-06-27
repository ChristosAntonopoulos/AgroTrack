import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getApiErrorMessage } from './api';

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

/** Matches backend AuthResponseDto — JWT + user claims. */
export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  role: string;
  expiresAt: string;
  firstName?: string;
  lastName?: string;
}

const persistSession = async (auth: AuthResponse) => {
  await AsyncStorage.setItem('token', auth.token);
  await AsyncStorage.setItem('user', JSON.stringify(auth));
};

export const authService = {
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/api/v1/auth/register', data);
      await persistSession(response.data);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Registration failed'));
    }
  },

  login: async (data: LoginDto): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/api/v1/auth/login', data);
      await persistSession(response.data);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Login failed'));
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  getStoredToken: async (): Promise<string | null> => AsyncStorage.getItem('token'),

  getStoredUser: async (): Promise<AuthResponse | null> => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return null;
      const userData = JSON.parse(userStr);
      if (userData && typeof userData === 'object' && userData.userId) {
        return userData as AuthResponse;
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

  isSessionExpired: (auth: AuthResponse): boolean => {
    if (!auth.expiresAt) return false;
    return new Date(auth.expiresAt).getTime() <= Date.now();
  },
};
