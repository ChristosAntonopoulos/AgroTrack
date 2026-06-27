import api from './api';

export interface Field {
  id: string;
  ownerId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  area: number;
  variety?: string;
  treeAge?: number;
  groundType?: string;
  irrigationStatus: boolean;
  currentLifecycleYear: string;
  currentLifecycleStage?: string;
  assignedProducerIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldDto {
  name: string;
  area: number;
  latitude?: number;
  longitude?: number;
  variety?: string;
  treeAge?: number;
  groundType?: string;
  irrigationStatus?: boolean;
}

export interface UpdateFieldDto extends Partial<CreateFieldDto> {}

export const fieldService = {
  getFields: async (_userId: string, _userRole: string): Promise<Field[]> => {
    const response = await api.get<Field[]>('/api/v1/fields');
    return response.data;
  },

  getField: async (id: string): Promise<Field> => {
    const response = await api.get<Field>(`/api/v1/fields/${id}`);
    return response.data;
  },

  createField: async (data: CreateFieldDto): Promise<Field> => {
    const response = await api.post<Field>('/api/v1/fields', data);
    return response.data;
  },

  updateField: async (id: string, data: UpdateFieldDto): Promise<Field> => {
    const response = await api.put<Field>(`/api/v1/fields/${id}`, data);
    return response.data;
  },

  deleteField: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/fields/${id}`);
  },

  getProducers: async (fieldId: string): Promise<string[]> => {
    const response = await api.get<string[]>(`/api/v1/fields/${fieldId}/producers`);
    return response.data;
  },

  assignProducer: async (fieldId: string, producerId: string): Promise<void> => {
    await api.put(`/api/v1/fields/${fieldId}/producers/${producerId}`);
  },

  unassignProducer: async (fieldId: string, producerId: string): Promise<void> => {
    await api.delete(`/api/v1/fields/${fieldId}/producers/${producerId}`);
  },
};
