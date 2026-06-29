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

export const showDemoLogin = (): boolean => {
  const flag = process.env.REACT_APP_SHOW_DEMO_LOGIN;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return isMockDataEnabled();
};
