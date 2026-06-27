import api from './api';
import {
  MinistryNotification,
  MinistryNotificationPriority,
  MinistryNotificationType,
} from './ministryNotificationService';

export const ministryApiService = {
  getNotifications: async (role: string, urgentOnly = false): Promise<MinistryNotification[]> => {
    const params = urgentOnly ? '?urgentOnly=true' : '';
    const response = await api.get<Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      priority: string;
      date: string;
      expirationDate?: string;
      read: boolean;
      actionUrl?: string;
      category: string;
      targetRoles: string[];
    }>>(`/api/v1/ministry/notifications${params}`);

    return response.data.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as MinistryNotificationType,
      priority: n.priority as MinistryNotificationPriority,
      date: new Date(n.date),
      expirationDate: n.expirationDate ? new Date(n.expirationDate) : undefined,
      read: n.read,
      actionUrl: n.actionUrl,
      category: n.category,
      targetRoles: n.targetRoles,
    }));
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.post(`/api/v1/ministry/notifications/${id}/read`);
  },

  markAllAsRead: async (_role?: string): Promise<void> => {
    await api.post('/api/v1/ministry/notifications/read-all');
  },

  getUnreadCount: async (role: string): Promise<number> => {
    const notifications = await ministryApiService.getNotifications(role);
    return notifications.filter((n) => !n.read).length;
  },

  getUrgentNotifications: async (role: string): Promise<MinistryNotification[]> => {
    return ministryApiService.getNotifications(role, true);
  },
};
