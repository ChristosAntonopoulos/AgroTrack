import api from './api';

export interface Lifecycle {
  id: string;
  fieldId: string;
  currentYear: string;
  currentStage?: string;
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

  getLifecycles: async (_userId: string, _userRole: string): Promise<Lifecycle[]> => {
    const fieldsResponse = await api.get<{ id: string }[]>('/api/v1/fields');
    const lifecycles: Lifecycle[] = [];
    for (const field of fieldsResponse.data) {
      const lifecycle = await lifecycleService.getLifecycle(field.id);
      if (lifecycle) {
        lifecycles.push(lifecycle);
      }
    }
    return lifecycles;
  },

  initializeLifecycle: async (fieldId: string): Promise<Lifecycle> => {
    const response = await api.post<Lifecycle>(`/api/v1/fields/${fieldId}/lifecycle/initialize`);
    return response.data;
  },

  advanceStage: async (fieldId: string): Promise<Lifecycle> => {
    const response = await api.post<Lifecycle>(`/api/v1/fields/${fieldId}/lifecycle/advance-stage`);
    return response.data;
  },

  revertStage: async (fieldId: string): Promise<Lifecycle> => {
    const response = await api.post<Lifecycle>(`/api/v1/fields/${fieldId}/lifecycle/revert-stage`);
    return response.data;
  },

  progressCycle: async (fieldId: string): Promise<Lifecycle> => {
    const response = await api.post<Lifecycle>(`/api/v1/fields/${fieldId}/lifecycle/progress`);
    return response.data;
  },

  correctLifecycle: async (
    fieldId: string,
    payload: { currentYear?: string; currentStage?: string }
  ): Promise<Lifecycle> => {
    const response = await api.post<Lifecycle>(`/api/v1/fields/${fieldId}/lifecycle/correct`, payload);
    return response.data;
  },
};
