import axios, { InternalAxiosRequestConfig } from 'axios';
import i18n from '../i18n';
import { getApiBaseUrl, isAuthDisabled } from '../config/apiConfig';
import { extractApiErrorMessage, translateApiError } from '../utils/translateApiError';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Optional inbox/contacts GETs must not expire the session on 401. */
    skipUnauthorizedHandler?: boolean;
  }
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let handlingUnauthorized = false;

/** AuthContext registers this so a 401 can log out without a full document reload. */
export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

const requestUrl = (config?: InternalAxiosRequestConfig) =>
  `${config?.baseURL || ''}${config?.url || ''}`;

const isAuthEndpoint = (config?: InternalAxiosRequestConfig) =>
  /\/api\/v1\/auth\/(login|register)(?:\?|$)/i.test(requestUrl(config));

/** Saved contacts / inbox are optional; a missing or forbidden route is not a dead session. */
const isOptionalUserGet = (config?: InternalAxiosRequestConfig) => {
  const method = (config?.method || 'get').toLowerCase();
  if (method !== 'get') return false;
  return /\/api\/v1\/(?:me\/(?:contacts|notifications|service-requests|notes)|fields\/[^/]+\/people)(?:\/|\?|$)/i.test(
    requestUrl(config)
  );
};

const requestHadBearerToken = (config?: InternalAxiosRequestConfig) => {
  if (!config?.headers) return false;
  const value = config.headers.Authorization ?? config.headers.authorization;
  return typeof value === 'string' && value.length > 0;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      handlingUnauthorized = false;
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const config = error.config as InternalAxiosRequestConfig | undefined;
    // Only expire an established session. Login 401s, anonymous calls, and optional
    // contacts/inbox GETs must not wipe a token or trigger a document navigation.
    if (
      status === 401 &&
      !isAuthDisabled() &&
      !isAuthEndpoint(config) &&
      !config?.skipUnauthorizedHandler &&
      !isOptionalUserGet(config) &&
      requestHadBearerToken(config) &&
      !handlingUnauthorized
    ) {
      handlingUnauthorized = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      unauthorizedHandler?.();
    }
    const message = extractApiErrorMessage(error.response?.data);
    if (message && error.response?.data) {
      const translated = translateApiError(i18n.t.bind(i18n), message);
      if (typeof error.response.data === 'object' && error.response.data !== null) {
        const data = error.response.data as { message?: string; error?: { message?: string } };
        if (data.error?.message) {
          data.error.message = translated;
        } else {
          data.message = translated;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
