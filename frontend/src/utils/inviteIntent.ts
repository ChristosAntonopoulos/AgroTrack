const STORAGE_KEY = 'oleachron.inviteIntent';

export type InviteIntent = {
  token?: string;
  code?: string;
  redirect?: string;
};

const safeNextPath = (value: string | null | undefined) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : undefined;

const tokenFromRedirect = (redirect?: string) => {
  if (!redirect?.startsWith('/invite/')) return undefined;
  const token = redirect.slice('/invite/'.length).split(/[/?#]/)[0];
  return token || undefined;
};

export const readInviteIntent = (): InviteIntent | null => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InviteIntent;
    const redirect = safeNextPath(parsed.redirect);
    return {
      token: parsed.token || tokenFromRedirect(redirect),
      code: parsed.code?.trim() || undefined,
      redirect,
    };
  } catch {
    return null;
  }
};

export const saveInviteIntent = (intent: InviteIntent) => {
  if (typeof sessionStorage === 'undefined') return;
  const redirect = safeNextPath(intent.redirect);
  const next: InviteIntent = {
    token: intent.token || tokenFromRedirect(redirect),
    code: intent.code?.trim() || undefined,
    redirect,
  };
  if (!next.token && !next.code && !next.redirect) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const clearInviteIntent = () => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
};

export const intentFromSearch = (search: URLSearchParams): InviteIntent => {
  const redirect = safeNextPath(search.get('redirect'));
  return {
    token: tokenFromRedirect(redirect),
    code: search.get('code')?.trim() || undefined,
    redirect,
  };
};

export const mergeInviteIntent = (...parts: Array<InviteIntent | null | undefined>): InviteIntent => {
  const merged: InviteIntent = {};
  for (const part of parts) {
    if (!part) continue;
    if (part.token) merged.token = part.token;
    if (part.code) merged.code = part.code;
    if (part.redirect) merged.redirect = safeNextPath(part.redirect);
  }
  if (!merged.token) merged.token = tokenFromRedirect(merged.redirect);
  return merged;
};

export const rememberInviteIntent = (...parts: Array<InviteIntent | null | undefined>): InviteIntent => {
  const next = mergeInviteIntent(readInviteIntent(), ...parts);
  saveInviteIntent(next);
  return next;
};

export const authPathWithIntent = (path: '/login' | '/register', intent?: InviteIntent | null) => {
  const params = new URLSearchParams();
  const redirect = safeNextPath(intent?.redirect) || (intent?.token ? `/invite/${intent.token}` : undefined);
  if (redirect) params.set('redirect', redirect);
  if (intent?.code) params.set('code', intent.code);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};
