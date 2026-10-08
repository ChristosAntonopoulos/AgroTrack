import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getApiErrorMessage } from './api';

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  inviteCode?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ForgotPasswordResponse {
  sent: boolean;
  devResetToken?: string | null;
}

/** Matches backend AuthResponseDto — JWT + refresh + user claims. */
export interface AuthResponse {
  token: string;
  refreshToken?: string | null;
  userId: string;
  email: string;
  role: string;
  expiresAt: string;
  refreshExpiresAt?: string | null;
  firstName?: string;
  lastName?: string;
}

const REFRESH_KEY = 'refreshToken';

export const persistSession = async (auth: AuthResponse) => {
  await AsyncStorage.setItem('token', auth.token);
  await AsyncStorage.setItem('user', JSON.stringify(auth));
  if (auth.refreshToken) {
    await AsyncStorage.setItem(REFRESH_KEY, auth.refreshToken);
  } else {
    await AsyncStorage.removeItem(REFRESH_KEY);
  }
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove(['token', 'user', REFRESH_KEY]);
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

  forgotPassword: async (data: ForgotPasswordDto): Promise<ForgotPasswordResponse> => {
    try {
      const response = await api.post<ForgotPasswordResponse>('/api/v1/auth/forgot-password', data);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Password reset failed'));
    }
  },

  resetPassword: async (data: ResetPasswordDto): Promise<void> => {
    try {
      await api.post('/api/v1/auth/reset-password', data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Password reset failed'));
    }
  },

  logout: async () => {
    await clearSession();
  },

  getStoredToken: async (): Promise<string | null> => AsyncStorage.getItem('token'),

  getStoredRefreshToken: async (): Promise<string | null> => AsyncStorage.getItem(REFRESH_KEY),

  getStoredUser: async (): Promise<AuthResponse | null> => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return null;
      const userData = JSON.parse(userStr);
      if (userData && typeof userData === 'object' && userData.userId) {
        return userData as AuthResponse;
      }
      await clearSession();
      return null;
    } catch {
      await clearSession();
      return null;
    }
  },

  isAccessTokenExpired: (auth: AuthResponse): boolean => {
    if (!auth.expiresAt) return false;
    return new Date(auth.expiresAt).getTime() <= Date.now();
  },

  /** @deprecated Use isAccessTokenExpired — kept for older call sites. */
  isSessionExpired: (auth: AuthResponse): boolean => authService.isAccessTokenExpired(auth),

  isRefreshExpired: (auth: AuthResponse): boolean => {
    if (!auth.refreshExpiresAt) return !auth.refreshToken;
    return new Date(auth.refreshExpiresAt).getTime() <= Date.now();
  },
};
