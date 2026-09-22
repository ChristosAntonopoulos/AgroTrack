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
  caption?: string | null;
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
  deletedAt?: string | null;
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
  sort?: 'newest' | 'oldest';
  page?: number;
  pageSize?: number;
}

export const PHOTO_UPLOAD_CHUNK_BYTES = 512 * 1024;

export class PhotoUploadRequestError extends Error {
  status: number | null;
  receivedBytes: number | null;

  constructor(message: string, status: number | null, receivedBytes: number | null = null) {
    super(message);
    this.name = 'PhotoUploadRequestError';
    this.status = status;
    this.receivedBytes = receivedBytes;
  }
}

type PhotoUploadSessionDto = {
  uploadId: string;
  receivedBytes: number;
  totalBytes: number;
};

export type ResumablePhotoUploadOptions = {
  uploadId?: string | null;
  receivedBytes?: number;
  allowDuplicates?: boolean;
  capturedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sourceHash?: string | null;
  transcoded?: boolean;
  onProgress?: (received: number, total: number) => void;
};

const authHeaders = (): { baseUrl: string; headers: Record<string, string> } => {
  const baseUrl = getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return { baseUrl, headers };
};

const readError = async (response: Response): Promise<PhotoUploadRequestError> => {
  const body = await response.json().catch(() => ({}));
  const received =
    body && typeof body === 'object' && 'receivedBytes' in body
      ? Number((body as { receivedBytes?: number }).receivedBytes)
      : null;
  return new PhotoUploadRequestError(
    extractApiErrorMessage(body) || 'Upload failed',
    response.status,
    Number.isFinite(received) ? received : null
  );
};

/**
 * Uploads one photo in chunks so a dropped connection can continue from the
 * last byte the server stored.
 */
export const uploadPhotoResumable = async (
  file: File,
  options: ResumablePhotoUploadOptions = {}
): Promise<{ result: PhotoUploadResult; uploadId: string; receivedBytes: number }> => {
  const { baseUrl, headers } = authHeaders();
  let uploadId = options.uploadId ?? null;
  let received = options.receivedBytes ?? 0;

  const begin = async () => {
    const response = await fetch(`${baseUrl}/api/v1/photos/uploads`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        totalBytes: file.size,
      }),
    });
    if (!response.ok) throw await readError(response);
    const session = (await response.json()) as PhotoUploadSessionDto;
    uploadId = session.uploadId;
    received = session.receivedBytes;
  };

  const sync = async () => {
    const response = await fetch(`${baseUrl}/api/v1/photos/uploads/${uploadId}`, { headers });
    if (response.status === 404) {
      await begin();
      return;
    }
    if (!response.ok) throw await readError(response);
    const session = (await response.json()) as PhotoUploadSessionDto;
    received = session.receivedBytes;
  };

  if (!uploadId) await begin();
  else await sync();

  while (received < file.size) {
    const end = Math.min(file.size, received + PHOTO_UPLOAD_CHUNK_BYTES);
    const response = await fetch(`${baseUrl}/api/v1/photos/uploads/${uploadId}?offset=${received}`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/octet-stream',
        'Content-Range': `bytes ${received}-${end - 1}/${file.size}`,
      },
      body: file.slice(received, end),
    });
    if (response.status === 409) {
      const session = (await response.json().catch(() => null)) as PhotoUploadSessionDto | null;
      if (session && session.receivedBytes > received) {
        received = session.receivedBytes;
        options.onProgress?.(received, file.size);
        continue;
      }
      throw new PhotoUploadRequestError('Upload failed', 409, session?.receivedBytes ?? received);
    }
    if (response.status === 404) {
      await begin();
      continue;
    }
    if (!response.ok) throw await readError(response);
    const session = (await response.json()) as PhotoUploadSessionDto;
    received = session.receivedBytes;
    uploadId = session.uploadId || uploadId;
    options.onProgress?.(received, file.size);
  }

  const complete = await fetch(`${baseUrl}/api/v1/photos/uploads/${uploadId}/complete`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allowDuplicates: !!options.allowDuplicates,
      capturedAt: options.capturedAt ?? null,
      latitude: options.latitude ?? null,
      longitude: options.longitude ?? null,
      sourceHash: options.sourceHash ?? null,
      transcoded: !!options.transcoded,
    }),
  });
  if (!complete.ok) throw await readError(complete);
  const result = (await complete.json()) as PhotoUploadResult;
  return { result, uploadId: uploadId || '', receivedBytes: received };
};

export const photoService = {
  uploadResumable: uploadPhotoResumable,

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

  update: async (
    id: string,
    body: { kind?: string; capturedAt?: string; caption?: string }
  ): Promise<Photo> => {
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

  trash: async (page = 1, pageSize = 48): Promise<PhotoList> => {
    const { data } = await api.get<PhotoList>('/api/v1/photos/trash', {
      params: { page, pageSize },
    });
    return data;
  },

  restore: async (id: string): Promise<Photo> => {
    const { data } = await api.post<Photo>(`/api/v1/photos/${id}/restore`);
    return data;
  },

  purge: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/photos/${id}/permanent`);
  },
};
