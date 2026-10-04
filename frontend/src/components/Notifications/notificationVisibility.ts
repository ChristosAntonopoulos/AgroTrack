import type { NotificationDevicePreferences } from '../../services/settingsService';

export type NotificationPrefKey = keyof NotificationDevicePreferences;

export type ClassifiedNotification = {
  type?: string;
  source?: string;
  eventType?: string;
  read: boolean;
};

/** Map an inbox item onto a settings toggle. Unknown kinds stay visible. */
export function notificationCategory(item: {
  type?: string;
  source?: string;
  eventType?: string;
}): NotificationPrefKey | 'other' {
  if (item.source === 'campaign') return 'marketingSystem';
  const raw = `${item.eventType || ''} ${item.type || ''}`.toLowerCase();
  if (raw.includes('assign')) return 'taskAssignment';
  if (raw.includes('approv') || raw.includes('reject')) return 'approval';
  if (raw.includes('harvest') || raw.includes('mill')) return 'harvest';
  if (raw.includes('financ') || raw.includes('money') || raw.includes('cost') || raw.includes('payment')) {
    return 'financial';
  }
  if (raw.includes('weather') || raw.includes('satellite')) return 'satelliteWeather';
  if (
    raw.includes('announce') ||
    raw.includes('poll') ||
    raw.includes('questionnaire') ||
    raw.includes('marketing') ||
    raw.includes('campaign')
  ) {
    return 'marketingSystem';
  }
  return 'other';
}

export function partitionNotifications<T extends ClassifiedNotification>(
  items: T[],
  prefs: NotificationDevicePreferences
): { visible: T[]; hiddenUnread: number } {
  const visible: T[] = [];
  let hiddenUnread = 0;
  for (const item of items) {
    const category = notificationCategory(item);
    const allowed = category === 'other' ? true : Boolean(prefs[category]);
    if (allowed) {
      visible.push(item);
    } else if (!item.read) {
      hiddenUnread += 1;
    }
  }
  return { visible, hiddenUnread };
}

export type DrawerState = 'loading' | 'list' | 'hidden' | 'clear';

/** Empty copy is only for a truly empty inbox. Hidden items must not look like "all clear". */
export function drawerState(visibleCount: number, hiddenUnread: number, loading: boolean): DrawerState {
  if (loading && visibleCount === 0 && hiddenUnread === 0) return 'loading';
  if (visibleCount > 0) return 'list';
  if (hiddenUnread > 0) return 'hidden';
  return 'clear';
}
