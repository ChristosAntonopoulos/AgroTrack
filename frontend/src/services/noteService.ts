import api from './api';
import { OfflineQueue } from '../utils/offlineQueue';
import { EntityCache } from '../utils/entityCache';
import { createTempNoteId, isDeviceOnline, isNetworkError } from '../utils/networkStatus';

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

export interface Note {
  id: string;
  body: string;
  fieldId?: string | null;
  pinned: boolean;
  occurredAt?: string;
  createdAt: string;
  updatedAt: string;
  mediaUrls?: string[];
}

export interface UpsertNotePayload {
  body: string;
  fieldId?: string | null;
  pinned?: boolean;
  occurredAt?: string;
  mediaUrls?: string[];
}

export const notePreviewTitle = (body: string): string => {
  const first = (body || '').split(/\r?\n/).find((line) => line.trim()) || '';
  const trimmed = first.trim();
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77)}…`;
};

const sortNotes = (notes: Note[]): Note[] =>
  [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

export const noteService = {
  getNotes: async (params?: { fieldId?: string; limit?: number }): Promise<Note[]> => {
    const userId = getCurrentUserId();
    const filterCached = (notes: Note[]) => {
      let list = notes;
      if (params?.fieldId) list = list.filter((n) => n.fieldId === params.fieldId);
      list = sortNotes(list);
      if (params?.limit && params.limit > 0) list = list.slice(0, params.limit);
      return list;
    };

    if (!isDeviceOnline()) {
      if (userId) {
        const cached = EntityCache.getNotes(userId);
        if (cached) return filterCached(cached.data);
      }
      return [];
    }

    try {
      const response = await api.get<Note[]>('/api/v1/me/notes', {
        params,
        skipUnauthorizedHandler: true,
      });
      const notes = Array.isArray(response.data) ? response.data : [];
      if (userId && !params?.fieldId) {
        EntityCache.setNotes(userId, notes);
      }
      return notes;
    } catch (error: unknown) {
      if (isNetworkError(error) && userId) {
        const cached = EntityCache.getNotes(userId);
        if (cached) return filterCached(cached.data);
      }
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) return [];
      throw error;
    }
  },

  createNote: async (payload: UpsertNotePayload): Promise<Note> => {
    const body = (payload.body || '').trim();
    const data = {
      body,
      fieldId: payload.fieldId || null,
      pinned: Boolean(payload.pinned),
      occurredAt: payload.occurredAt,
      mediaUrls: payload.mediaUrls,
    };

    try {
      const response = await api.post<Note>('/api/v1/me/notes', data);
      EntityCache.setNote(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err) || !isDeviceOnline()) {
        const tempId = createTempNoteId();
        const now = new Date().toISOString();
        const optimistic: Note = {
          id: tempId,
          body,
          fieldId: payload.fieldId || null,
          pinned: Boolean(payload.pinned),
          occurredAt: payload.occurredAt || now,
          createdAt: now,
          updatedAt: now,
          mediaUrls: payload.mediaUrls,
        };
        EntityCache.setNote(optimistic);
        await OfflineQueue.addOperation({
          method: 'post',
          endpoint: '/api/v1/me/notes',
          data,
          entityType: 'note',
          tempEntityId: tempId,
        });
        return optimistic;
      }
      throw err;
    }
  },

  updateNote: async (id: string, payload: UpsertNotePayload): Promise<Note> => {
    const body = payload.body.trim();
    const data = {
      body,
      fieldId: payload.fieldId || null,
      pinned: Boolean(payload.pinned),
    };

    try {
      const response = await api.put<Note>(`/api/v1/me/notes/${id}`, data);
      EntityCache.setNote(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err) || !isDeviceOnline()) {
        const now = new Date().toISOString();
        const existing = EntityCache.getNote(id);
        const optimistic: Note = {
          id,
          body,
          fieldId: payload.fieldId || null,
          pinned: Boolean(payload.pinned),
          createdAt: existing?.data.createdAt || now,
          updatedAt: now,
        };
        EntityCache.setNote(optimistic);
        await OfflineQueue.addOperation({
          method: 'put',
          endpoint: `/api/v1/me/notes/${id}`,
          data,
          entityType: 'note',
          entityId: id,
        });
        return optimistic;
      }
      throw err;
    }
  },

  deleteNote: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/v1/me/notes/${id}`);
      EntityCache.removeNote(id);
    } catch (err: unknown) {
      if (isNetworkError(err) || !isDeviceOnline()) {
        EntityCache.removeNote(id);
        await OfflineQueue.addOperation({
          method: 'delete',
          endpoint: `/api/v1/me/notes/${id}`,
          entityType: 'note',
          entityId: id,
        });
        return;
      }
      throw err;
    }
  },
};
