import api from './api';
import { getApiBaseUrl } from '../config/apiConfig';
import { extractApiErrorMessage } from '../utils/translateApiError';

export type PhotoOwnerType = 'field' | 'note' | 'task' | 'harvest' | 'phenology';
export type FieldAssignment = 'autoMatched' | 'manual' | 'needsReview' | 'unassigned';
export type PhotoLinkStatus = 'all' | 'standalone' | 'linked';

export interface Photo {
  id: string;
  ownerType: PhotoOwnerType | string;
  ownerId: string;
  fieldId: string;
  fieldName?: string | null;
  mediaType: string;
  url: string;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  uploadedByUserId: string;
  capturedAt?: string | null;
  effectiveCapturedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  fieldAssignment: FieldAssignment | string;
  fieldMatchScore?: number | null;
  assignmentReason?: string | null;
  kind: string;
  contentHash?: string | null;
  width?: number | null;
  height?: number | null;
  byteSize?: number | null;
  isLinked: boolean;
  linkedTitle?: string | null;
  linkedOccurredAt?: string | null;
  linkedStatus?: string | null;
  linkBroken?: boolean;
  canTrash?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoFieldCandidate {
  fieldId: string;
  fieldName: string;
  reason: string;
  score?: number | null;
  distanceMetres?: number | null;
}

export interface PhotoUploadResult {
  photo: Photo;
  duplicateWarning: boolean;
  duplicateSkipped?: boolean;
  failed?: boolean;
  error?: string | null;
  candidates: PhotoFieldCandidate[];
}

export interface PhotoList {
  items: Photo[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PhotoQuery {
  fieldId?: string;
  from?: string;
  to?: string;
  fieldAssignment?: string;
  ownerType?: string;
  linkStatus?: PhotoLinkStatus;
  page?: number;
  pageSize?: number;
}

const uploadPhotos = async (files: File[]): Promise<PhotoUploadResult[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const baseUrl = getApiBaseUrl() || window.location.origin;
  const token = localStorage.getItem('token');

  const response = await fetch(`${baseUrl}/api/v1/photos/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(extractApiErrorMessage(body) || 'Upload failed');
  }

  return (await response.json()) as PhotoUploadResult[];
};

export const photoService = {
  upload: uploadPhotos,

  query: async (query: PhotoQuery = {}): Promise<PhotoList> => {
    const { data } = await api.get<PhotoList>('/api/v1/photos', { params: query });
    return data;
  },

  getById: async (id: string): Promise<Photo> => {
    const { data } = await api.get<Photo>(`/api/v1/photos/${id}`);
    return data;
  },

  confirmField: async (id: string, fieldId: string): Promise<Photo> => {
    const { data } = await api.patch<Photo>(`/api/v1/photos/${id}/field`, { fieldId });
    return data;
  },

  update: async (id: string, body: { kind?: string; capturedAt?: string }): Promise<Photo> => {
    const { data } = await api.patch<Photo>(`/api/v1/photos/${id}`, body);
    return data;
  },

  link: async (id: string, ownerType: string, ownerId: string): Promise<Photo> => {
    const { data } = await api.post<Photo>(`/api/v1/photos/${id}/link`, { ownerType, ownerId });
    return data;
  },

  unlink: async (id: string): Promise<Photo> => {
    const { data } = await api.post<Photo>(`/api/v1/photos/${id}/unlink`);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/photos/${id}`);
  },
};
