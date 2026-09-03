import api from './api';
import { OfflineQueue } from '../utils/offlineQueue';

const isNetworkError = (err: any) =>
  !!err && !err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error');

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
        return {
          id: `temp-field-${Date.now()}`,
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
      }
      throw err;
    }
  },

  updateField: async (id: string, data: UpdateFieldDto): Promise<Field> => {
    const response = await api.put<Field>(`/api/v1/fields/${id}`, data);
    return response.data;
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
