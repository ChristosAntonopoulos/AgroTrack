import { mapInviteLifecycle, seatLifecycleLabelKey } from './inviteLifecycle';

describe('inviteLifecycle', () => {
  it('maps API statuses without inventing Draft or Sent', () => {
    expect(mapInviteLifecycle('pending')).toBe('pending');
    expect(mapInviteLifecycle('invited')).toBe('pending');
    expect(mapInviteLifecycle('accepted')).toBe('accepted');
    expect(mapInviteLifecycle('active')).toBe('active');
    expect(mapInviteLifecycle('expired')).toBe('expired');
    expect(mapInviteLifecycle('revoked')).toBe('revoked');
    expect(mapInviteLifecycle('removed')).toBe('revoked');
  });

  it('shows accepted for active seats on the roster', () => {
    expect(seatLifecycleLabelKey('active')).toBe('accepted');
    expect(seatLifecycleLabelKey('pending')).toBe('pending');
  });
});
