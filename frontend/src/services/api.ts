import axios from 'axios';
import i18n from '../i18n';
import { translateApiError } from '../utils/translateApiError';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:7000';

const api = axios.create({
  baseURL: API_BASE_URL,
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const message = error.response?.data?.message as string | undefined;
    if (message) {
      error.response.data.message = translateApiError(i18n.t.bind(i18n), message);
    }
    return Promise.reject(error);
  }
);

export default api;
