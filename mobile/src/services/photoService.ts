import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_BASE_URL, getApiErrorMessage } from './api';

export type PhotoOwnerType = 'field' | 'note' | 'task' | 'harvest' | 'phenology';
export type FieldAssignment = 'autoMatched' | 'manual' | 'needsReview' | 'unassigned';
export type PhotoLinkStatus = 'all' | 'standalone' | 'linked';

export interface Photo {
  id: string;
  ownerType: PhotoOwnerType | string;
  ownerId: string;
  fieldId: string;
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
  kind: string;
  contentHash?: string | null;
  width?: number | null;
  height?: number | null;
  byteSize?: number | null;
  isLinked: boolean;
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

const guessName = (uri: string, index: number) => {
  const leaf = uri.split('/').pop() || `photo-${index + 1}.jpg`;
  return leaf.includes('.') ? leaf : `${leaf}.jpg`;
};

const guessType = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
};

/** Upload local device URIs to Photo Hub (server-side EXIF). */
const uploadLocalUris = async (uris: string[]): Promise<PhotoUploadResult[]> => {
  if (uris.length === 0) return [];

  const formData = new FormData();
  uris.forEach((uri, index) => {
    const name = guessName(uri, index);
    formData.append('files', {
      uri,
      name,
      type: guessType(name),
    } as unknown as Blob);
  });

  const token = await AsyncStorage.getItem('token');
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/v1/photos/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    let message = 'Upload failed';
    try {
      const body = await response.json();
      message =
        body?.error?.message || body?.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return (await response.json()) as PhotoUploadResult[];
};

export const photoService = {
  uploadLocalUris,

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

export const photoServiceErrorMessage = (error: unknown, fallback: string) =>
  getApiErrorMessage(error, fallback);
