import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import i18n from '../i18n';
import { getApiBaseUrl, isAuthDisabled } from '../config/apiConfig';
import { isRealSessionToken } from './sessionToken';
import { persistAuthSession, clearAuthSession, type AuthResponse } from './authService';
import { extractApiErrorPayload, translateApiError } from '../utils/translateApiError';

const REFRESH_KEY = 'refreshToken';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Optional inbox/contacts GETs must not expire the session on 401. */
    skipUnauthorizedHandler?: boolean;
    /** Internal: request already retried after a refresh. */
    _retryAfterRefresh?: boolean;
  }
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

type UnauthorizedHandler = () => void;
type SessionRefreshedHandler = (auth: AuthResponse) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let sessionRefreshedHandler: SessionRefreshedHandler | null = null;
let handlingUnauthorized = false;
let refreshPromise: Promise<AuthResponse | null> | null = null;

/** AuthContext registers this so a 401 can log out without a full document reload. */
export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

/** AuthContext updates in-memory user after a silent refresh. */
export const setSessionRefreshedHandler = (handler: SessionRefreshedHandler | null) => {
  sessionRefreshedHandler = handler;
};

const requestUrl = (config?: InternalAxiosRequestConfig) =>
  `${config?.baseURL || ''}${config?.url || ''}`;

const isAuthEndpoint = (config?: InternalAxiosRequestConfig) =>
  /\/api\/v1\/auth\/(login|register|refresh|forgot-password|reset-password)(?:\?|$)/i.test(
    requestUrl(config)
  );

/** Saved contacts / inbox are optional; a missing or forbidden route is not a dead session. */
const isOptionalUserGet = (config?: InternalAxiosRequestConfig) => {
  const method = (config?.method || 'get').toLowerCase();
  if (method !== 'get') return false;
  return /\/api\/v1\/(?:me\/(?:contacts|notifications|notes|inbox|in-app-messages)|fields\/[^/]+\/people)(?:\/|\?|$)/i.test(
    requestUrl(config)
  );
};

const requestHadBearerToken = (config?: InternalAxiosRequestConfig) => {
  if (!config?.headers) return false;
  const value = config.headers.Authorization ?? config.headers.authorization;
  return typeof value === 'string' && value.length > 0;
};

const tryRefreshSession = async (): Promise<AuthResponse | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return null;
      try {
        // Bare client avoids interceptor recursion / circular authService import.
        const { data } = await axios.post<AuthResponse>(
          `${getApiBaseUrl()}/api/v1/auth/refresh`,
          { refreshToken }
        );
        persistAuthSession(data);
        sessionRefreshedHandler?.(data);
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

const expireSession = () => {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  clearAuthSession();
  unauthorizedHandler?.();
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (isRealSessionToken(token)) {
      handlingUnauthorized = false;
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token) {
      clearAuthSession();
    }
    config.headers['Accept-Language'] = i18n.language || 'el';
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as InternalAxiosRequestConfig | undefined;

    if (
      status === 401 &&
      !isAuthDisabled() &&
      !isAuthEndpoint(config) &&
      !config?.skipUnauthorizedHandler &&
      !isOptionalUserGet(config) &&
      requestHadBearerToken(config) &&
      config &&
      !config._retryAfterRefresh
    ) {
      const refreshed = await tryRefreshSession();
      if (refreshed?.token) {
        config._retryAfterRefresh = true;
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${refreshed.token}`;
        return api.request(config);
      }
      expireSession();
    } else if (
      status === 401 &&
      !isAuthDisabled() &&
      !isAuthEndpoint(config) &&
      !config?.skipUnauthorizedHandler &&
      !isOptionalUserGet(config) &&
      requestHadBearerToken(config) &&
      !handlingUnauthorized
    ) {
      expireSession();
    }

    const { message, code } = extractApiErrorPayload(error.response?.data);
    if (message && error.response?.data && typeof error.response.data === 'object') {
      const translated = translateApiError(i18n.t.bind(i18n), message);
      const data = error.response.data as Record<string, unknown>;
      const nested = (data.error ?? data.Error) as Record<string, unknown> | undefined;
      if (nested && typeof nested === 'object') {
        if ('message' in nested) nested.message = translated;
        if ('Message' in nested) nested.Message = translated;
      } else if ('message' in data || 'Message' in data) {
        if ('message' in data) data.message = translated;
        if ('Message' in data) data.Message = translated;
      } else {
        data.message = translated;
      }
      if (code && !data.code && !data.Code) data.code = code;
    }
    return Promise.reject(error);
  }
);

export default api;
