import axios from 'axios';
import i18n from '../i18n';
import { getApiBaseUrl, isAuthDisabled } from '../config/apiConfig';
import { extractApiErrorMessage, translateApiError } from '../utils/translateApiError';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
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
    if (error.response?.status === 401 && !isAuthDisabled()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
