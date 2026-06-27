import api from './api';

export interface MinistryNotificationDto {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  date: string;
  read: boolean;
  actionUrl?: string;
}

export interface MinistryNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: 'high' | 'medium' | 'low' | 'critical';
  date: Date;
  read: boolean;
  actionUrl?: string;
}

const mapNotification = (dto: MinistryNotificationDto): MinistryNotification => ({
  id: dto.id,
  title: dto.title,
  message: dto.message,
  type: dto.type,
  priority: (dto.priority as MinistryNotification['priority']) || 'medium',
  date: new Date(dto.date),
  read: dto.read,
  actionUrl: dto.actionUrl,
});

export const ministryApiService = {
  getNotifications: async (_userRole?: string, urgentOnly = false): Promise<MinistryNotification[]> => {
    const response = await api.get<MinistryNotificationDto[]>(
      `/api/v1/ministry/notifications${urgentOnly ? '?urgentOnly=true' : ''}`
    );
    return response.data.map(mapNotification);
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.post(`/api/v1/ministry/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post('/api/v1/ministry/notifications/read-all');
  },
};
