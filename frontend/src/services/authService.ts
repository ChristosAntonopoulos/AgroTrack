import api from './api';
import { isRealSessionToken } from './sessionToken';
import type { NotificationDevicePreferences } from './settingsService';

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
  preferences?: {
    fontScale?: string;
    largeControls?: boolean;
    language?: string;
    notifications?: NotificationDevicePreferences;
  };
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

const REFRESH_KEY = 'refreshToken';

export const persistAuthSession = (response: AuthResponse) => {
  localStorage.setItem('token', response.token);
  localStorage.setItem('user', JSON.stringify(response));
  if (response.refreshToken) {
    localStorage.setItem(REFRESH_KEY, response.refreshToken);
  } else {
    localStorage.removeItem(REFRESH_KEY);
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem(REFRESH_KEY);
};

export const authService = {
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/register', data);
    return response.data;
  },

  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/login', data);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordDto): Promise<ForgotPasswordResponse> => {
    const response = await api.post<ForgotPasswordResponse>('/api/v1/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordDto): Promise<void> => {
    await api.post('/api/v1/auth/reset-password', data);
  },

  logout: () => {
    clearAuthSession();
  },

  getStoredToken: (): string | null => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    if (!isRealSessionToken(token)) {
      clearAuthSession();
      return null;
    }
    return token;
  },

  getStoredRefreshToken: (): string | null => localStorage.getItem(REFRESH_KEY),

  getStoredUser: (): AuthResponse | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? (JSON.parse(userStr) as AuthResponse) : null;
  },
};
