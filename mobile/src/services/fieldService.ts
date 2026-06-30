import api from './api';

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
  greekCadastre?: GreekCadastreInfo;
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
  status?: FieldStatus;
  greekCadastre?: GreekCadastreInfo;
}

export interface UpdateFieldDto extends Partial<CreateFieldDto> {}

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

  updateBoundary: async (id: string, boundary: GeoJsonPolygon): Promise<Field> => {
    const response = await api.put<Field>(`/api/v1/fields/${id}/boundary`, { boundary });
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
