import { ministryNotificationService } from './ministryNotificationService';
import { MinistryNotification } from './ministryApiService';

export const mockMinistryService = {
  getNotifications: async (userRole: string, urgentOnly = false): Promise<MinistryNotification[]> => {
    const all = await ministryNotificationService.getNotifications(userRole);
    if (!urgentOnly) return all;
    return all.filter(n => n.priority === 'high' || n.priority === 'critical');
  },

  markAsRead: async (id: string): Promise<void> => {
    await ministryNotificationService.markAsRead(id);
  },

  markAllRead: async (): Promise<void> => {
  },
};
