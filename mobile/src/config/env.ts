import { Platform } from 'react-native';

/** Public API. The website is https://theolivelot.com; the API is the api host. */
export const PRODUCTION_API_ORIGIN = 'https://api.theolivelot.com';

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

/** Quick-login chips. Off unless mock mode or EXPO_PUBLIC_SHOW_DEMO_LOGIN=true. */
export const showDemoLogin = (): boolean => {
  const flag = process.env.EXPO_PUBLIC_SHOW_DEMO_LOGIN;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return isMockDataEnabled();
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

const readPublicEnv = (value: string | undefined): string => (value ?? '').trim();

/**
 * RevenueCat public SDK keys (safe to ship in the app). Empty = purchases disabled for
 * that platform; the paywall then shows a calm "unavailable" state. Secret keys and webhook
 * secrets live only on the backend.
 */
export const getRevenueCatApiKey = (): string =>
  Platform.OS === 'ios'
    ? readPublicEnv(process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY)
    : Platform.OS === 'android'
      ? readPublicEnv(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY)
      : '';

/** Entitlement id that unlocks Pro. Must match backend `Subscription:ProEntitlementId`. */
export const getRevenueCatEntitlementId = (): string =>
  readPublicEnv(process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID) || 'pro';

/** Overlay rasters live on the API host; relative /uploads paths 404 on the website. */
export const resolvePublicAssetUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${resolveApiBaseUrl()}${normalized}`;
};
