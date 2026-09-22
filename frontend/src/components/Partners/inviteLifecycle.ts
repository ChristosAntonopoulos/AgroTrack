/**
 * Honest invite/membership lifecycle labels.
 * API member statuses: pending | active | revoked
 * API invite statuses: pending | accepted | expired | revoked
 * There is no Draft or Sent distinct from Pending — do not invent them.
 */
export type InviteLifecycleKey =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'revoked'
  | 'active';

export const mapInviteLifecycle = (rawStatus: string | undefined | null): InviteLifecycleKey => {
  const status = (rawStatus || '').trim().toLowerCase();
  if (status === 'accepted' || status === 'active') return status === 'active' ? 'active' : 'accepted';
  if (status === 'expired') return 'expired';
  if (status === 'revoked' || status === 'removed') return 'revoked';
  if (status === 'pending' || status === 'invited') return 'pending';
  return 'pending';
};

/** Seat roster chip: map membership status to the closest product label. */
export const seatLifecycleLabelKey = (rawStatus: string | undefined | null): InviteLifecycleKey => {
  const mapped = mapInviteLifecycle(rawStatus);
  // Active seats are accepted access, not a separate "Active" product state in the invite list.
  if (mapped === 'active') return 'accepted';
  return mapped;
};
