import api from './api';

export interface Lifecycle {
  id: string;
  fieldId: string;
  currentYear: string;
  cycleStartDate: string;
  lastProgressionDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const lifecycleService = {
  getLifecycle: async (fieldId: string): Promise<Lifecycle | null> => {
    try {
      const response = await api.get<Lifecycle>(`/api/v1/fields/${fieldId}/lifecycle`);
      return response.data;
    } catch {
      return null;
    }
  },

  initializeLifecycle: async (fieldId: string): Promise<Lifecycle> => {
    const response = await api.post<Lifecycle>(`/api/v1/fields/${fieldId}/lifecycle/initialize`);
    return response.data;
  },

  progressCycle: async (fieldId: string): Promise<Lifecycle> => {
    const response = await api.post<Lifecycle>(`/api/v1/fields/${fieldId}/lifecycle/progress`);
    return response.data;
  },
};
