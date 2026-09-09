import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import type { Note } from '../services/noteService';
import type { FieldMembership } from '../services/fieldPeopleService';
import type { SyncOperation } from './offlineQueue';

const STALE_MS = 24 * 60 * 60 * 1000;
const KEY_PREFIX = 'Oleachron_cache:';

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

const fieldsKey = (userId: string) => `${KEY_PREFIX}fields:${userId}`;
const tasksKey = (userId: string) => `${KEY_PREFIX}tasks:${userId}`;
const notesKey = (userId: string) => `${KEY_PREFIX}notes:${userId}`;
const fieldKey = (id: string) => `${KEY_PREFIX}field:${id}`;
const taskKey = (id: string) => `${KEY_PREFIX}task:${id}`;
const noteKey = (id: string) => `${KEY_PREFIX}note:${id}`;
const peopleKey = (fieldId: string) => `${KEY_PREFIX}people:${fieldId}`;

function readEntry<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || parsed.data === undefined || typeof parsed.cachedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeEntry<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Quota / private mode — ignore
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function isCacheStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > STALE_MS;
}

function getUserId(): string | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return typeof user?.userId === 'string' ? user.userId : null;
  } catch {
    return null;
  }
}

export class EntityCache {
  static setOne<T>(namespace: string, id: string, data: T): void {
    writeEntry(`${KEY_PREFIX}${namespace}:${id}`, data);
  }

  static getOne<T>(namespace: string, id: string): T | null {
    const entry = readEntry<T>(`${KEY_PREFIX}${namespace}:${id}`);
    return entry ? entry.data : null;
  }

  static setFields(userId: string, fields: Field[]): void {
    writeEntry(fieldsKey(userId), fields);
    fields.forEach((f) => writeEntry(fieldKey(f.id), f));
  }

  static getFields(userId: string): CacheEntry<Field[]> | null {
    return readEntry<Field[]>(fieldsKey(userId));
  }

  static setTasks(userId: string, tasks: Task[]): void {
    writeEntry(tasksKey(userId), tasks);
    tasks.forEach((t) => writeEntry(taskKey(t.id), t));
  }

  static getTasks(userId: string): CacheEntry<Task[]> | null {
    return readEntry<Task[]>(tasksKey(userId));
  }

  static setField(field: Field): void {
    writeEntry(fieldKey(field.id), field);
    const userId = getUserId();
    if (!userId) return;
    const list = this.getFields(userId);
    if (!list) return;
    const idx = list.data.findIndex((f) => f.id === field.id);
    const next =
      idx >= 0 ? list.data.map((f) => (f.id === field.id ? field : f)) : [...list.data, field];
    writeEntry(fieldsKey(userId), next);
  }

  static getField(id: string): CacheEntry<Field> | null {
    return readEntry<Field>(fieldKey(id));
  }

  static setTask(task: Task): void {
    writeEntry(taskKey(task.id), task);
    const userId = getUserId();
    if (!userId) return;
    const list = this.getTasks(userId);
    if (!list) return;
    const idx = list.data.findIndex((t) => t.id === task.id);
    const next =
      idx >= 0 ? list.data.map((t) => (t.id === task.id ? task : t)) : [...list.data, task];
    writeEntry(tasksKey(userId), next);
  }

  static getTask(id: string): CacheEntry<Task> | null {
    const direct = readEntry<Task>(taskKey(id));
    if (direct) return direct;

    const userId = getUserId();
    if (!userId) return null;
    const list = this.getTasks(userId);
    if (!list) return null;
    const found = list.data.find((t) => t.id === id);
    if (!found) return null;
    return { data: found, cachedAt: list.cachedAt };
  }

  static patchTask(id: string, patch: Partial<Task>): Task | null {
    const existing = this.getTask(id);
    if (!existing) return null;
    const updated: Task = {
      ...existing.data,
      ...patch,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    };
    this.setTask(updated);
    return updated;
  }

  static patchField(id: string, patch: Partial<Field>): Field | null {
    const existing = this.getField(id);
    if (!existing) return null;
    const updated: Field = {
      ...existing.data,
      ...patch,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    };
    this.setField(updated);
    return updated;
  }

  static removeTask(id: string): void {
    removeKey(taskKey(id));
    const userId = getUserId();
    if (!userId) return;
    const list = this.getTasks(userId);
    if (!list) return;
    writeEntry(
      tasksKey(userId),
      list.data.filter((t) => t.id !== id)
    );
  }

  static setNotes(userId: string, notes: Note[]): void {
    writeEntry(notesKey(userId), notes);
    notes.forEach((n) => writeEntry(noteKey(n.id), n));
  }

  static getNotes(userId: string): CacheEntry<Note[]> | null {
    return readEntry<Note[]>(notesKey(userId));
  }

  static setNote(note: Note): void {
    writeEntry(noteKey(note.id), note);
    const userId = getUserId();
    if (!userId) return;
    const list = this.getNotes(userId);
    if (!list) {
      writeEntry(notesKey(userId), [note]);
      return;
    }
    const idx = list.data.findIndex((n) => n.id === note.id);
    const next =
      idx >= 0 ? list.data.map((n) => (n.id === note.id ? note : n)) : [note, ...list.data];
    writeEntry(notesKey(userId), next);
  }

  static getNote(id: string): CacheEntry<Note> | null {
    const direct = readEntry<Note>(noteKey(id));
    if (direct) return direct;

    const userId = getUserId();
    if (!userId) return null;
    const list = this.getNotes(userId);
    if (!list) return null;
    const found = list.data.find((n) => n.id === id);
    if (!found) return null;
    return { data: found, cachedAt: list.cachedAt };
  }

  static removeNote(id: string): void {
    removeKey(noteKey(id));
    const userId = getUserId();
    if (!userId) return;
    const list = this.getNotes(userId);
    if (!list) return;
    writeEntry(
      notesKey(userId),
      list.data.filter((n) => n.id !== id)
    );
  }

  static setPeople(fieldId: string, people: FieldMembership[]): void {
    writeEntry(peopleKey(fieldId), people);
  }

  static getPeople(fieldId: string): CacheEntry<FieldMembership[]> | null {
    return readEntry<FieldMembership[]>(peopleKey(fieldId));
  }

  static applySyncSuccess(op: SyncOperation, responseData: unknown): void {
    if (op.entityType === 'task') {
      if (op.tempEntityId && responseData && typeof responseData === 'object') {
        this.removeTask(op.tempEntityId);
        this.setTask(responseData as Task);
        return;
      }
      if (responseData && typeof responseData === 'object' && 'id' in (responseData as object)) {
        this.setTask(responseData as Task);
      }
      return;
    }

    if (op.entityType === 'field') {
      if (op.tempEntityId && responseData && typeof responseData === 'object') {
        const serverField = responseData as Field;
        removeKey(fieldKey(op.tempEntityId));
        this.setField(serverField);
        return;
      }
      if (responseData && typeof responseData === 'object' && 'id' in (responseData as object)) {
        this.setField(responseData as Field);
      }
      return;
    }

    if (op.entityType === 'note') {
      if (op.method === 'delete' && op.entityId) {
        this.removeNote(op.entityId);
        return;
      }
      if (op.tempEntityId && responseData && typeof responseData === 'object') {
        this.removeNote(op.tempEntityId);
        this.setNote(responseData as Note);
        return;
      }
      if (responseData && typeof responseData === 'object' && 'id' in (responseData as object)) {
        this.setNote(responseData as Note);
      }
    }
  }

  static clearAll(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(KEY_PREFIX)) keys.push(key);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      console.error('Error clearing entity cache:', error);
    }
  }
}
