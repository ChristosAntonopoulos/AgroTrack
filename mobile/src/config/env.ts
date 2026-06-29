import { Platform } from 'react-native';

/** Kubernetes NodePort backend — must match azure-pipelines.yml `backendApiUrl`. */
export const PRODUCTION_API_ORIGIN = 'http://185.193.66.50:31847';

const DEV_API_PORT = 5149;

/**
 * Mock mode: EXPO_PUBLIC_USE_MOCK_DATA=true
 * Real API (default): EXPO_PUBLIC_USE_MOCK_DATA=false or unset
 */
export const isMockDataEnabled = (): boolean => {
  const flag = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return false;
};

/** Quick-login chips on the sign-in screen (enabled for alpha/production demos). */
export const showDemoLogin = (): boolean => {
  const flag = process.env.EXPO_PUBLIC_SHOW_DEMO_LOGIN;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return __DEV__ || isMockDataEnabled();
};

/** Strip trailing slashes and a mistaken `/api` suffix (paths already include /api/v1). */
export const normalizeApiOrigin = (url: string): string =>
  url.trim().replace(/\/+$/, '').replace(/\/api$/i, '');

/**
 * Development API origin — locked to the machine running the backend.
 * - Android emulator: 10.0.2.2 (host loopback)
 * - iOS simulator / other: localhost
 *
 * Physical device + Expo Go: set EXPO_PUBLIC_API_URL in mobile/.env, or run
 * `adb reverse tcp:5149 tcp:5149` and use http://localhost:5149.
 */
export const resolveDevApiOrigin = (): string => {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEV_API_PORT}`;
  }
  return `http://localhost:${DEV_API_PORT}`;
};

/**
 * Resolves API base URL:
 * - EXPO_PUBLIC_API_URL when set (EAS production builds + optional dev override)
 * - __DEV__: localhost / 10.0.2.2:5149
 * - release fallback: PRODUCTION_API_ORIGIN
 */
export const resolveApiBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured?.trim()) {
    return normalizeApiOrigin(configured);
  }

  if (__DEV__) {
    return resolveDevApiOrigin();
  }

  return PRODUCTION_API_ORIGIN;
};

export const getApiEnvironmentLabel = (): string => {
  if (isMockDataEnabled()) return 'mock';
  if (__DEV__) return 'development';
  return 'production';
};
