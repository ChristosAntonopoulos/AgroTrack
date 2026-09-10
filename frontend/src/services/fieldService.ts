import api from './api';
import { OfflineQueue } from '../utils/offlineQueue';
import { EntityCache } from '../utils/entityCache';
import { createTempFieldId, isDeviceOnline, isNetworkError } from '../utils/networkStatus';

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

export type FieldStatus =
  | 'Draft'
  | 'NeedsBoundaryConfirmation'
  | 'NeedsAreaReview'
  | 'Active'
  | 'Archived';

export type AddFieldMethod = 'draw' | 'cadastre' | 'kaek';

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

export interface FieldDocumentAttachment {
  id: string;
  type: string;
  fileName: string;
  storagePath: string;
  uploadedAt: string;
}

export interface Field {
  id: string;
  ownerId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  area: number;
  /** Canonical area in square metres when provided by the API. */
  areaSqm?: number;
  /** Canonical area in hectares when provided by the API. */
  areaHectares?: number;
  variety?: string;
  treeAge?: number;
  groundType?: string;
  irrigationStatus: boolean;
  currentLifecycleYear: string;
  currentLifecycleStage?: string;
  assignedProducerIds?: string[];
  memberships?: import('./fieldPeopleService').FieldMembership[];
  advisorComments?: import('./fieldPeopleService').AdvisorComment[];
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
  /** UI accent as #RRGGBB */
  color?: string;
  greekCadastre?: GreekCadastreInfo;
  documents?: FieldDocumentAttachment[];
}

export interface CreateFieldDto {
  name: string;
  cropType?: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  area: number;
  appMeasuredAreaSqm?: number;
  boundary?: GeoJsonPolygon;
  variety?: string;
  treeAge?: number;
  treeCount?: number;
  groundType?: string;
  irrigationStatus: boolean;
  irrigationType?: string;
  soilType?: string;
  slope?: string;
  accessNotes?: string;
  color?: string;
  producerUserId?: string;
  worksThisFieldMyself?: boolean;
  status?: FieldStatus;
  greekCadastre?: GreekCadastreInfo;
}

export interface UpdateFieldDto {
  name?: string;
  cropType?: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  area?: number;
  appMeasuredAreaSqm?: number;
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
  greekCadastre?: GreekCadastreInfo;
}

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
  getFields: async (): Promise<Field[]> => {
    const userId = getCurrentUserId();

    if (!isDeviceOnline()) {
      if (userId) {
        const cached = EntityCache.getFields(userId);
        if (cached) return cached.data;
      }
      throw new Error('No cached fields available offline');
    }

    try {
      const response = await api.get<Field[]>('/api/v1/fields');
      if (userId) EntityCache.setFields(userId, response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err) && userId) {
        const cached = EntityCache.getFields(userId);
        if (cached) return cached.data;
      }
      throw err;
    }
  },

  getField: async (id: string): Promise<Field> => {
    if (!isDeviceOnline()) {
      const cached = EntityCache.getField(id);
      if (cached) return cached.data;
      throw new Error('No cached field available offline');
    }

    try {
      const response = await api.get<Field>(`/api/v1/fields/${id}`);
      EntityCache.setField(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const cached = EntityCache.getField(id);
        if (cached) return cached.data;
      }
      throw err;
    }
  },

  createField: async (data: CreateFieldDto): Promise<Field> => {
    try {
      const response = await api.post<Field>('/api/v1/fields', data);
      EntityCache.setField(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const tempId = createTempFieldId();
        const now = new Date().toISOString();
        const optimistic: Field = {
          id: tempId,
          ownerId: getCurrentUserId() || 'unknown',
          name: data.name,
          latitude: data.latitude,
          longitude: data.longitude,
          area: data.area,
          variety: data.variety,
          treeAge: data.treeAge,
          groundType: data.groundType,
          irrigationStatus: data.irrigationStatus,
          currentLifecycleYear: 'low',
          status: data.status || 'Draft',
          cropType: data.cropType || 'Olive',
          createdAt: now,
          updatedAt: now,
        };
        EntityCache.setField(optimistic);
        await OfflineQueue.addOperation({
          method: 'post',
          endpoint: '/api/v1/fields',
          data,
          entityType: 'field',
          tempEntityId: tempId,
        });
        return optimistic;
      }
      throw err;
    }
  },

  updateField: async (id: string, data: UpdateFieldDto): Promise<Field> => {
    try {
      const response = await api.put<Field>(`/api/v1/fields/${id}`, data);
      EntityCache.setField(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const patched = EntityCache.patchField(id, data as Partial<Field>);
        const now = new Date().toISOString();
        const optimistic =
          patched ??
          ({
            id,
            ownerId: getCurrentUserId() || 'unknown',
            name: data.name ?? 'Field',
            area: data.area ?? 0,
            irrigationStatus: data.irrigationStatus ?? false,
            currentLifecycleYear: 'low',
            createdAt: now,
            updatedAt: now,
            ...data,
          } as Field);
        EntityCache.setField(optimistic);
        await OfflineQueue.addOperation({
          method: 'put',
          endpoint: `/api/v1/fields/${id}`,
          data,
          entityType: 'field',
          entityId: id,
        });
        return optimistic;
      }
      throw err;
    }
  },

  deleteField: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/fields/${id}`);
  },

  importGreekCadastre: async (kdFile: File, kfFile: File): Promise<ImportGreekCadastreFieldResponse> => {
    const formData = new FormData();
    formData.append('kdFile', kdFile);
    formData.append('kfFile', kfFile);
    const response = await api.post<ImportGreekCadastreFieldResponse>(
      '/api/v1/fields/import/greek-cadastre',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  updateBoundary: async (id: string, boundary: GeoJsonPolygon): Promise<Field> => {
    const response = await api.put<Field>(`/api/v1/fields/${id}/boundary`, { boundary });
    EntityCache.setField(response.data);
    return response.data;
  },

  validateArea: async (id: string): Promise<FieldAreaValidationResponse> => {
    const response = await api.post<FieldAreaValidationResponse>(`/api/v1/fields/${id}/validate-area`);
    return response.data;
  },

  activateField: async (id: string, request: ActivateFieldRequest): Promise<ActivateFieldResponse> => {
    const response = await api.post<ActivateFieldResponse>(`/api/v1/fields/${id}/activate`, request);
    EntityCache.setField(response.data.field);
    return response.data;
  },

  getAssignedProducers: async (fieldId: string): Promise<string[]> => {
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
