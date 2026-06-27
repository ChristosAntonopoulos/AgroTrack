import api from './api';

export interface Activity {
  id: string;
  fieldId: string;
  type: string;
  message: string;
  actorUserId?: string;
  taskId?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export const activityService = {
  getByFieldId: async (fieldId: string, limit = 50): Promise<Activity[]> => {
    const response = await api.get<Activity[]>(
      `/api/v1/fields/${fieldId}/activities?limit=${limit}`
    );
    return response.data;
  },
};
