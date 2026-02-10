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
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldDto {
  name: string;
  latitude?: number;
  longitude?: number;
  area: number;
  variety?: string;
  treeAge?: number;
  groundType?: string;
  irrigationStatus: boolean;
}

export interface UpdateFieldDto {
  name?: string;
  latitude?: number;
  longitude?: number;
  area?: number;
  variety?: string;
  treeAge?: number;
  groundType?: string;
  irrigationStatus?: boolean;
}

export const fieldService = {
  getFields: async (): Promise<Field[]> => {
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
};
