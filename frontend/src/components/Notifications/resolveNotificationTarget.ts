import { migrateLegacyHomePath } from '../../navigation/homePath';

export type NotificationNavFields = {
  actionUrl?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

/**
 * Resolve a deep link for a transactional notification.
 * Prefer related entity id/type when present; otherwise use actionUrl.
 * Returns null when there is no actionable target (caller should stay on the list).
 */
export const resolveNotificationTarget = (item: NotificationNavFields): string | null => {
  const entityType = (item.relatedEntityType || '').trim().toLowerCase();
  const entityId = (item.relatedEntityId || '').trim();

  if (entityType && entityId) {
    if (entityType === 'task') return `/tasks/${encodeURIComponent(entityId)}`;
    if (entityType === 'field') return `/fields/${encodeURIComponent(entityId)}`;
    if (entityType === 'servicecontactrequest') {
      return `/partners/requests?requestId=${encodeURIComponent(entityId)}`;
    }
  }

  const url = (item.actionUrl || '').trim();
  if (url.startsWith('/')) {
    return migrateLegacyHomePath(url);
  }

  return null;
};
