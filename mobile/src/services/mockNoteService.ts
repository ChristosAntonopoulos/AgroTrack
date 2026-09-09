import type { Note, UpsertNotePayload } from './noteService';

const notes: Note[] = [
  {
    id: 'demo-note-1',
    body: 'Gate code 4821 — leave closed after irrigation.',
    fieldId: null,
    pinned: true,
    createdAt: '2026-09-07T08:00:00.000Z',
    updatedAt: '2026-09-08T07:30:00.000Z',
  },
  {
    id: 'demo-note-2',
    body: 'North terrace looks dry.\nCheck drip tomorrow morning.',
    fieldId: null,
    pinned: false,
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
  },
];

let seq = 3;

const sortNotes = (list: Note[]): Note[] =>
  [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

export const mockNoteService = {
  getNotes: async (params?: { fieldId?: string; limit?: number }): Promise<Note[]> => {
    let list = [...notes];
    if (params?.fieldId) list = list.filter((n) => n.fieldId === params.fieldId);
    list = sortNotes(list);
    if (params?.limit && params.limit > 0) list = list.slice(0, params.limit);
    return list;
  },

  createNote: async (payload: UpsertNotePayload): Promise<Note> => {
    const now = new Date().toISOString();
    const created: Note = {
      id: `demo-note-${seq++}`,
      body: (payload.body || '').trim(),
      fieldId: payload.fieldId || null,
      pinned: Boolean(payload.pinned),
      occurredAt: payload.occurredAt || now,
      createdAt: now,
      updatedAt: now,
    };
    notes.unshift(created);
    return created;
  },

  updateNote: async (id: string, payload: UpsertNotePayload): Promise<Note> => {
    const existing = notes.find((n) => n.id === id);
    if (!existing) throw new Error('Note not found');
    existing.body = (payload.body || '').trim();
    existing.fieldId = payload.fieldId || null;
    existing.pinned = Boolean(payload.pinned);
    if (payload.occurredAt) existing.occurredAt = payload.occurredAt;
    existing.updatedAt = new Date().toISOString();
    return { ...existing };
  },

  deleteNote: async (id: string): Promise<void> => {
    const index = notes.findIndex((n) => n.id === id);
    if (index >= 0) notes.splice(index, 1);
  },
};
