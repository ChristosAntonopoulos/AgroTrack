import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getApiEnvironmentLabel,
  isMockDataEnabled,
  resolveApiBaseUrl,
} from '../config/env';

export const API_BASE_URL = resolveApiBaseUrl();

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export const setSessionExpiredHandler = (handler: SessionExpiredHandler | null) => {
  onSessionExpired = handler;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      onSessionExpired?.();
    }
    return Promise.reject(error);
  }
);

export default api;

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }
  if (!error.response) {
    if (isMockDataEnabled()) {
      return fallback;
    }
    if (__DEV__) {
      return `Cannot reach backend at ${API_BASE_URL}. Start the API (dotnet run in backend/OliveLifecycle.API) or set EXPO_PUBLIC_USE_MOCK_DATA=true.`;
    }
    return `Cannot reach server at ${API_BASE_URL}. Check your connection and try again.`;
  }
  const data = error.response.data as { error?: { message?: string }; message?: string } | undefined;
  return data?.error?.message ?? data?.message ?? fallback;
};

export const getApiConnectionInfo = (): { url: string; environment: string } => ({
  url: API_BASE_URL,
  environment: getApiEnvironmentLabel(),
});
