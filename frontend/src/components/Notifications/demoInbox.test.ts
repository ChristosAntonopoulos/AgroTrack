import { buildDemoInbox, mergeDemoInbox } from './demoInbox';
import { drawerState, notificationCategory, partitionNotifications } from './notificationVisibility';
import { DEFAULT_NOTIFICATION_PREFS } from '../../services/settingsService';

describe('demoInbox', () => {
  it('always includes assignment and approval samples for a demo user', () => {
    const items = buildDemoInbox('demo-user-without-tasks');
    const categories = items.map((item) => notificationCategory({ type: item.type, source: item.source }));

    expect(categories).toEqual(expect.arrayContaining(['taskAssignment', 'approval']));
    expect(items.every((item) => item.source === 'transactional')).toBe(true);
  });

  it('keeps badge and drawer aligned when prefs hide marketing only', () => {
    const items = mergeDemoInbox([], 'demo-user', true).map((item) => ({
      id: item.id,
      eventType: item.type,
      source: item.source,
      read: item.isRead,
    }));
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, marketingSystem: false };
    const { visible, hiddenUnread } = partitionNotifications(items, prefs);
    const unread = visible.filter((item) => !item.read).length;

    expect(visible.length).toBeGreaterThan(0);
    expect(unread).toBeGreaterThan(0);
    expect(hiddenUnread).toBe(0);
    expect(drawerState(visible.length, hiddenUnread, false)).toBe('list');
  });
});
