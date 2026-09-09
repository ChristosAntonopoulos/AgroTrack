import api from './api';
import { OfflineQueue } from '../utils/offlineQueue';
import { EntityCache } from '../utils/entityCache';
import { isDeviceOnline, isNetworkError } from '../utils/networkStatus';

export type FieldStatus =
  | 'Draft'
  | 'NeedsBoundaryConfirmation'
  | 'NeedsAreaReview'
  | 'Active'
  | 'Archived';

export interface GeoJsonPolygon {
  type: string;
  coordinates: number[][][];
}

export interface GeoJsonPoint {
  type: string;
  coordinates: number[];
}

export interface GreekCadastreInfo {
  kaek?: string;
  normalizedKaek?: string;
  officialAreaSqm?: number;
  titleAreaSqm?: number;
  titleAreaRaw?: string;
  locationFromCadastre?: string;
  cadastralOffice?: string;
  prefecture?: string;
  municipality?: string;
  postalCode?: string;
  coordinateSystem?: string;
  mapScale?: string;
  extractPrintDate?: string;
  source?: string;
  verificationStatus?: string;
  areaDifferenceSqm?: number;
  areaDifferencePercent?: number;
}

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
  status?: FieldStatus;
  cropType?: string;
  locationText?: string;
  boundary?: GeoJsonPolygon;
  centerPoint?: GeoJsonPoint;
  appMeasuredAreaSqm?: number;
  treeCount?: number;
  oliveVariety?: string;
  irrigationType?: string;
  soilType?: string;
  slope?: string;
  accessNotes?: string;
  color?: string;
  greekCadastre?: GreekCadastreInfo;
  advisorComments?: import('./fieldPeopleService').AdvisorComment[];
}

export interface CreateFieldDto {
  name: string;
  cropType?: string;
  locationText?: string;
  area: number;
  latitude?: number;
  longitude?: number;
  boundary?: GeoJsonPolygon;
  variety?: string;
  treeAge?: number;
  treeCount?: number;
  groundType?: string;
  irrigationStatus?: boolean;
  irrigationType?: string;
  soilType?: string;
  slope?: string;
  accessNotes?: string;
  color?: string;
  status?: FieldStatus;
  greekCadastre?: GreekCadastreInfo;
}

export interface UpdateFieldDto extends Partial<CreateFieldDto> {}

export interface ImportGreekCadastreFieldResponse {
  draftFieldId: string;
  suggestedName?: string;
  greekCadastre: GreekCadastreInfo;
  warnings: string[];
  missingRequiredConfirmation: string[];
  duplicateKaekFieldIds: string[];
}

export interface FieldAreaValidationResponse {
  officialAreaSqm?: number;
  appMeasuredAreaSqm: number;
  differenceSqm?: number;
  differencePercent?: number;
  severity: 'Ok' | 'Warning' | 'Critical';
  message: string;
  warnings: string[];
}

export interface ActivateFieldRequest {
  boundaryConfirmed: boolean;
  cadastreReferenceAcknowledged: boolean;
}

export interface ActivateFieldResponse {
  field: Field;
  suggestLifecyclePlan: boolean;
  lifecycleInitialized: boolean;
}

export const fieldService = {
  getFields: async (userId: string, _userRole: string): Promise<Field[]> => {
    // Cache-first when offline so cold start / app reopen works without API
    if (!(await isDeviceOnline())) {
      const cached = await EntityCache.getFields(userId);
      if (cached) return cached.data;
      throw new Error('No cached fields available offline');
    }

    try {
      const response = await api.get<Field[]>('/api/v1/fields');
      await EntityCache.setFields(userId, response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = await EntityCache.getFields(userId);
        if (cached) return cached.data;
      }
      throw error;
    }
  },

  getField: async (id: string): Promise<Field> => {
    if (!(await isDeviceOnline())) {
      const cached = await EntityCache.getField(id);
      if (cached) return cached.data;
      throw new Error('No cached field available offline');
    }

    try {
      const response = await api.get<Field>(`/api/v1/fields/${id}`);
      await EntityCache.setField(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = await EntityCache.getField(id);
        if (cached) return cached.data;
      }
      throw error;
    }
  },

  createField: async (data: CreateFieldDto): Promise<Field> => {
    const response = await api.post<Field>('/api/v1/fields', data);
    await EntityCache.setField(response.data);
    return response.data;
  },

  updateField: async (id: string, data: UpdateFieldDto): Promise<Field> => {
    const enqueue = async (): Promise<Field> => {
      const patched = await EntityCache.patchField(id, data as Partial<Field>);
      const now = new Date().toISOString();
      const optimistic: Field =
        patched ??
        ({
          id,
          ownerId: '',
          name: data.name ?? 'Field',
          area: data.area ?? 0,
          irrigationStatus: data.irrigationStatus ?? false,
          currentLifecycleYear: 'low',
          createdAt: now,
          updatedAt: now,
          ...data,
        } as Field);

      await EntityCache.setField(optimistic);
      await OfflineQueue.addOperation({
        method: 'put',
        endpoint: `/api/v1/fields/${id}`,
        data,
        entityType: 'field',
        entityId: id,
      });
      return optimistic;
    };

    if (!(await isDeviceOnline())) {
      return enqueue();
    }

    try {
      const response = await api.put<Field>(`/api/v1/fields/${id}`, data);
      await EntityCache.setField(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) return enqueue();
      throw error;
    }
  },

  importGreekCadastre: async (
    kdFile: { uri: string; name: string; type: string },
    kfFile: { uri: string; name: string; type: string }
  ): Promise<ImportGreekCadastreFieldResponse> => {
    const formData = new FormData();
    formData.append('kdFile', {
      uri: kdFile.uri,
      name: kdFile.name,
      type: kdFile.type || 'application/pdf',
    } as unknown as Blob);
    formData.append('kfFile', {
      uri: kfFile.uri,
      name: kfFile.name,
      type: kfFile.type || 'application/pdf',
    } as unknown as Blob);
    const response = await api.post<ImportGreekCadastreFieldResponse>(
      '/api/v1/fields/import/greek-cadastre',
      formData
    );
    return response.data;
  },

  updateBoundary: async (id: string, boundary: GeoJsonPolygon): Promise<Field> => {
    const response = await api.put<Field>(`/api/v1/fields/${id}/boundary`, { boundary });
    return response.data;
  },

  validateArea: async (id: string): Promise<FieldAreaValidationResponse> => {
    const response = await api.post<FieldAreaValidationResponse>(`/api/v1/fields/${id}/validate-area`);
    return response.data;
  },

  activateField: async (id: string, request: ActivateFieldRequest): Promise<ActivateFieldResponse> => {
    const response = await api.post<ActivateFieldResponse>(`/api/v1/fields/${id}/activate`, request);
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
