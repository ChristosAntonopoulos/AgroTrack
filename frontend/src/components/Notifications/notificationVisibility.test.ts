import { DEFAULT_NOTIFICATION_PREFS } from '../../services/settingsService';
import { drawerState, notificationCategory, partitionNotifications } from './notificationVisibility';

describe('notificationVisibility', () => {
  it('classifies assignment and approval events', () => {
    expect(notificationCategory({ eventType: 'task_assigned' })).toBe('taskAssignment');
    expect(notificationCategory({ eventType: 'task_approval' })).toBe('approval');
    expect(notificationCategory({ eventType: 'task_approved' })).toBe('approval');
    expect(notificationCategory({ source: 'campaign', type: 'poll' })).toBe('marketingSystem');
    expect(notificationCategory({ eventType: 'partner_contact', type: 'info' })).toBe('other');
  });

  it('keeps the badge and the drawer on the same visible list', () => {
    const items = [
      { id: 'a', eventType: 'task_assigned', read: false },
      { id: 'b', eventType: 'task_approval', read: true },
      { id: 'c', source: 'campaign', type: 'announcement', read: false },
    ];
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, marketingSystem: false };
    const { visible, hiddenUnread } = partitionNotifications(items, prefs);
    const unread = visible.filter((item) => !item.read).length;

    expect(visible.map((item) => item.id)).toEqual(['a', 'b']);
    expect(unread).toBe(1);
    expect(hiddenUnread).toBe(1);
    expect(drawerState(visible.length, hiddenUnread, false)).toBe('list');
    expect(drawerState(0, hiddenUnread, false)).toBe('hidden');
    expect(drawerState(0, 0, false)).toBe('clear');
    expect(drawerState(0, 0, true)).toBe('loading');
  });
});
