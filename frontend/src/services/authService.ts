import api from './api';

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
  userId: string;
  email: string;
  role: string;
  expiresAt: string;
  firstName?: string;
  lastName?: string;
  preferences?: {
    experienceMode: string;
    experienceModeChosen: boolean;
    fontScale: string;
    largeControls: boolean;
  };
}

export const authService = {
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/register', data);
    return response.data;
  },

  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/login', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getStoredToken: (): string | null => {
    return localStorage.getItem('token');
  },

  getStoredUser: (): any | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};
