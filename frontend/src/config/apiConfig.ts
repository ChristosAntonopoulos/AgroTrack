/** Backend origin. Empty string uses the CRA dev-server proxy (see setupProxy.js). */
export const getApiBaseUrl = (): string => {
  const configured = process.env.REACT_APP_API_URL;
  if (configured !== undefined && configured.trim() !== '') {
    return configured.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  return 'http://localhost:5149';
};

export const isMockDataEnabled = (): boolean =>
  process.env.REACT_APP_USE_MOCK_DATA === 'true';

export const isAuthDisabled = (): boolean =>
  process.env.REACT_APP_DISABLE_AUTH === 'true';

/**
 * Raster overlays are stored on the API host. Local CRA proxies /uploads;
 * production must use the API origin or the web server returns 404 HTML.
 */
export const resolvePublicAssetUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const base = getApiBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
};

export const showDemoLogin = (): boolean => {
  const flag = process.env.REACT_APP_SHOW_DEMO_LOGIN;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return isMockDataEnabled();
};
