/**
 * Honest invite/membership lifecycle labels.
 * API member statuses: pending | active | revoked
 * API invite statuses: pending | accepted | expired | revoked
 */
export type InviteLifecycleKey = 'pending' | 'accepted' | 'expired' | 'revoked' | 'active';

export const mapInviteLifecycle = (rawStatus: string | undefined | null): InviteLifecycleKey => {
  const status = (rawStatus || '').trim().toLowerCase();
  if (status === 'accepted' || status === 'active') return status === 'active' ? 'active' : 'accepted';
  if (status === 'expired') return 'expired';
  if (status === 'revoked' || status === 'removed') return 'revoked';
  if (status === 'pending' || status === 'invited') return 'pending';
  return 'pending';
};

export const seatLifecycleLabelKey = (rawStatus: string | undefined | null): InviteLifecycleKey => {
  const mapped = mapInviteLifecycle(rawStatus);
  if (mapped === 'active') return 'accepted';
  return mapped;
};
