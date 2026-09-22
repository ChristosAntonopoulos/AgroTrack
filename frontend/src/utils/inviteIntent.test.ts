import {
  authPathWithIntent,
  clearInviteIntent,
  intentFromSearch,
  mergeInviteIntent,
  readInviteIntent,
  saveInviteIntent,
} from './inviteIntent';

describe('inviteIntent', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores token and code and restores them', () => {
    saveInviteIntent({ token: 'abc', code: 'AB12-CD34', redirect: '/invite/abc' });
    expect(readInviteIntent()).toEqual({
      token: 'abc',
      code: 'AB12-CD34',
      redirect: '/invite/abc',
    });
  });

  it('derives token from a safe invite redirect', () => {
    const intent = intentFromSearch(new URLSearchParams('redirect=/invite/tok123&code=ZZ11-YY22'));
    expect(intent).toEqual({
      token: 'tok123',
      code: 'ZZ11-YY22',
      redirect: '/invite/tok123',
    });
  });

  it('ignores open redirects', () => {
    expect(intentFromSearch(new URLSearchParams('redirect=https://evil.example')).redirect).toBeUndefined();
    expect(intentFromSearch(new URLSearchParams('redirect=//evil.example')).redirect).toBeUndefined();
  });

  it('builds login and register URLs that keep the invitation', () => {
    const intent = { token: 'tok', code: 'CODE-1', redirect: '/invite/tok' };
    expect(authPathWithIntent('/register', intent)).toBe(
      '/register?redirect=%2Finvite%2Ftok&code=CODE-1'
    );
    expect(authPathWithIntent('/login', intent)).toBe('/login?redirect=%2Finvite%2Ftok&code=CODE-1');
  });

  it('merges stored intent with the current query', () => {
    saveInviteIntent({ token: 'tok', redirect: '/invite/tok' });
    expect(mergeInviteIntent(readInviteIntent(), { code: 'AB12-CD34' })).toEqual({
      token: 'tok',
      code: 'AB12-CD34',
      redirect: '/invite/tok',
    });
  });

  it('clears stored intent', () => {
    saveInviteIntent({ token: 'tok' });
    clearInviteIntent();
    expect(readInviteIntent()).toBeNull();
  });
});
