import api from './api';
import { OfflineQueue } from '../utils/offlineQueue';

const isNetworkError = (err: any) => {
  // Axios: network errors typically have no response.
  return !!err && !err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error');
};

const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return undefined;
    const u = JSON.parse(raw);
    return u?.userId || u?.id;
  } catch {
    return undefined;
  }
};

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
    try {
      const response = await api.post<Field>('/api/v1/fields', data);
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        await OfflineQueue.addOperation({ method: 'post', endpoint: '/api/v1/fields', data });
        const now = new Date().toISOString();
        const ownerId = getCurrentUserId() || 'unknown';
        return {
          id: `temp-field-${Date.now()}`,
          ownerId,
          name: data.name,
          latitude: data.latitude,
          longitude: data.longitude,
          area: data.area,
          variety: data.variety,
          treeAge: data.treeAge,
          groundType: data.groundType,
          irrigationStatus: data.irrigationStatus,
          currentLifecycleYear: 'low',
          createdAt: now,
          updatedAt: now,
        };
      }
      throw err;
    }
  },

  updateField: async (id: string, data: UpdateFieldDto): Promise<Field> => {
    try {
      const response = await api.put<Field>(`/api/v1/fields/${id}`, data);
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        await OfflineQueue.addOperation({ method: 'put', endpoint: `/api/v1/fields/${id}`, data });
        // Best-effort optimistic return: caller should refresh later.
        return {
          id,
          ownerId: getCurrentUserId() || 'unknown',
          name: (data as any).name ?? 'Updated field',
          latitude: data.latitude,
          longitude: data.longitude,
          area: (data as any).area ?? 0,
          variety: data.variety,
          treeAge: data.treeAge,
          groundType: data.groundType,
          irrigationStatus: (data as any).irrigationStatus ?? false,
          currentLifecycleYear: 'low',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  deleteField: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/v1/fields/${id}`);
    } catch (err: any) {
      if (isNetworkError(err)) {
        await OfflineQueue.addOperation({ method: 'delete', endpoint: `/api/v1/fields/${id}` });
        return;
      }
      throw err;
    }
  },
};
