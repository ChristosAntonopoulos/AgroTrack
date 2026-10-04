/** API sessions are JWTs. Mock logins store `mock_token_*`, which the API rejects with 401. */
export const isRealSessionToken = (token: string | null | undefined): token is string => {
  if (!token || token.startsWith('mock_token_')) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
};
