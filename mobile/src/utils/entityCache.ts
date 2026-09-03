import AsyncStorage from '@react-native-async-storage/async-storage';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { SyncOperation } from './offlineQueue';

const STALE_MS = 24 * 60 * 60 * 1000;
const KEY_PREFIX = 'cache:';

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

const fieldsKey = (userId: string) => `${KEY_PREFIX}fields:${userId}`;
const tasksKey = (userId: string) => `${KEY_PREFIX}tasks:${userId}`;
const fieldKey = (id: string) => `${KEY_PREFIX}field:${id}`;
const taskKey = (id: string) => `${KEY_PREFIX}task:${id}`;

async function readEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
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

async function writeEntry<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
}

export function isCacheStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > STALE_MS;
}

async function getUserId(): Promise<string | null> {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return typeof user?.userId === 'string' ? user.userId : null;
  } catch {
    return null;
  }
}

export class EntityCache {
  /** Generic namespaced cache used by read-only derived data (e.g. geospatial). */
  static async setOne<T>(namespace: string, id: string, data: T): Promise<void> {
    await writeEntry(`${KEY_PREFIX}${namespace}:${id}`, data);
  }

  static async getOne<T>(namespace: string, id: string): Promise<T | null> {
    const entry = await readEntry<T>(`${KEY_PREFIX}${namespace}:${id}`);
    return entry ? entry.data : null;
  }

  static async setFields(userId: string, fields: Field[]): Promise<void> {
    await writeEntry(fieldsKey(userId), fields);
    await Promise.all(fields.map((f) => writeEntry(fieldKey(f.id), f)));
  }

  static async getFields(userId: string): Promise<CacheEntry<Field[]> | null> {
    return readEntry<Field[]>(fieldsKey(userId));
  }

  static async setTasks(userId: string, tasks: Task[]): Promise<void> {
    await writeEntry(tasksKey(userId), tasks);
    await Promise.all(tasks.map((t) => writeEntry(taskKey(t.id), t)));
  }

  static async getTasks(userId: string): Promise<CacheEntry<Task[]> | null> {
    return readEntry<Task[]>(tasksKey(userId));
  }

  static async setField(field: Field): Promise<void> {
    await writeEntry(fieldKey(field.id), field);
    const userId = await getUserId();
    if (!userId) return;
    const list = await this.getFields(userId);
    if (!list) return;
    const idx = list.data.findIndex((f) => f.id === field.id);
    const next =
      idx >= 0
        ? list.data.map((f) => (f.id === field.id ? field : f))
        : [...list.data, field];
    await writeEntry(fieldsKey(userId), next);
  }

  static async getField(id: string): Promise<CacheEntry<Field> | null> {
    return readEntry<Field>(fieldKey(id));
  }

  static async setTask(task: Task): Promise<void> {
    await writeEntry(taskKey(task.id), task);
    const userId = await getUserId();
    if (!userId) return;
    const list = await this.getTasks(userId);
    if (!list) return;
    const idx = list.data.findIndex((t) => t.id === task.id);
    const next =
      idx >= 0
        ? list.data.map((t) => (t.id === task.id ? task : t))
        : [...list.data, task];
    await writeEntry(tasksKey(userId), next);
  }

  static async getTask(id: string): Promise<CacheEntry<Task> | null> {
    const direct = await readEntry<Task>(taskKey(id));
    if (direct) return direct;

    const userId = await getUserId();
    if (!userId) return null;
    const list = await this.getTasks(userId);
    if (!list) return null;
    const found = list.data.find((t) => t.id === id);
    if (!found) return null;
    return { data: found, cachedAt: list.cachedAt };
  }

  static async patchTask(id: string, patch: Partial<Task>): Promise<Task | null> {
    const existing = await this.getTask(id);
    if (!existing) return null;
    const updated: Task = {
      ...existing.data,
      ...patch,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    };
    await this.setTask(updated);
    return updated;
  }

  static async patchField(id: string, patch: Partial<Field>): Promise<Field | null> {
    const existing = await this.getField(id);
    if (!existing) return null;
    const updated: Field = {
      ...existing.data,
      ...patch,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    };
    await this.setField(updated);
    return updated;
  }

  static async removeTask(id: string): Promise<void> {
    await AsyncStorage.removeItem(taskKey(id));
    const userId = await getUserId();
    if (!userId) return;
    const list = await this.getTasks(userId);
    if (!list) return;
    await writeEntry(
      tasksKey(userId),
      list.data.filter((t) => t.id !== id)
    );
  }

  /** Apply server response after a queued mutation succeeds (server-wins). */
  static async applySyncSuccess(op: SyncOperation, responseData: unknown): Promise<void> {
    if (op.entityType === 'task') {
      if (op.tempEntityId && responseData && typeof responseData === 'object') {
        const serverTask = responseData as Task;
        await this.removeTask(op.tempEntityId);
        await this.setTask(serverTask);
        return;
      }
      if (responseData && typeof responseData === 'object' && 'id' in (responseData as object)) {
        await this.setTask(responseData as Task);
        return;
      }
      if (op.entityId) {
        // No body — leave optimistic cache; list refresh on sync complete handles it
      }
      return;
    }

    if (op.entityType === 'field') {
      if (responseData && typeof responseData === 'object' && 'id' in (responseData as object)) {
        await this.setField(responseData as Field);
      }
    }
  }

  static async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing entity cache:', error);
    }
  }
}
