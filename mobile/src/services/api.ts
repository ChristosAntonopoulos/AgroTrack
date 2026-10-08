import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getApiEnvironmentLabel,
  isMockDataEnabled,
  resolveApiBaseUrl,
} from '../config/env';
import { clearSession, persistSession, type AuthResponse } from './authService';

export const API_BASE_URL = resolveApiBaseUrl();
const REFRESH_KEY = 'refreshToken';

type SessionExpiredHandler = () => void;
type SessionRefreshedHandler = (auth: AuthResponse) => void;

let onSessionExpired: SessionExpiredHandler | null = null;
let onSessionRefreshed: SessionRefreshedHandler | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;

export const setSessionExpiredHandler = (handler: SessionExpiredHandler | null) => {
  onSessionExpired = handler;
};

export const setSessionRefreshedHandler = (handler: SessionRefreshedHandler | null) => {
  onSessionRefreshed = handler;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

const requestUrl = (config?: InternalAxiosRequestConfig) =>
  `${config?.baseURL || ''}${config?.url || ''}`;

const isAuthEndpoint = (config?: InternalAxiosRequestConfig) =>
  /\/api\/v1\/auth\/(login|register|refresh|forgot-password|reset-password)(?:\?|$)/i.test(
    requestUrl(config)
  );

declare module 'axios' {
  interface AxiosRequestConfig {
    _retryAfterRefresh?: boolean;
  }
}

const tryRefreshSession = async (): Promise<AuthResponse | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return null;
      try {
        // Bare client avoids interceptor recursion / circular authService import.
        const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });
        await persistSession(data);
        onSessionRefreshed?.(data);
        return data;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
};

/** Used on cold start when the access JWT is expired but a refresh token remains. */
export const refreshSessionIfPossible = async (): Promise<AuthResponse | null> =>
  tryRefreshSession();

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
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as InternalAxiosRequestConfig | undefined;

    if (status === 401 && config && !isAuthEndpoint(config) && !config._retryAfterRefresh) {
      const refreshed = await tryRefreshSession();
      if (refreshed?.token) {
        config._retryAfterRefresh = true;
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${refreshed.token}`;
        return api.request(config);
      }
      await clearSession();
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
