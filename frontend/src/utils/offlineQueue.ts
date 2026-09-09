import axios from 'axios';
import api from '../services/api';
import { isDeviceOnline } from './networkStatus';

export type SyncEntityType = 'task' | 'field' | 'note';

export interface SyncOperation {
  id: string;
  method: 'post' | 'put' | 'delete';
  endpoint: string;
  data?: unknown;
  timestamp: number;
  retries: number;
  lastError?: string;
  clientMutationId?: string;
  entityType?: SyncEntityType;
  entityId?: string;
  tempEntityId?: string;
}

export type OfflineQueueListener = (count: number) => void;
export type SyncSuccessListener = (op: SyncOperation, responseData: unknown) => void;
export type SyncDropListener = (op: SyncOperation, reason: string) => void;

const MAX_RETRIES = 5;
const QUEUE_KEY = 'Oleachron_offline_sync_queue_v1';

const listeners = new Set<OfflineQueueListener>();
const successListeners = new Set<SyncSuccessListener>();
const dropListeners = new Set<SyncDropListener>();

let syncInFlight = false;

const notify = async () => {
  const count = await OfflineQueue.getCount();
  listeners.forEach((fn) => fn(count));
};

const isRetryableStatus = (status?: number): boolean => {
  if (status == null) return true;
  if (status === 401) return false;
  if (status >= 500) return true;
  return false;
};

const readQueue = (): SyncOperation[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (op: SyncOperation) =>
        op &&
        typeof op.id === 'string' &&
        typeof op.method === 'string' &&
        typeof op.endpoint === 'string'
    );
  } catch {
    return [];
  }
};

const writeQueue = (queue: SyncOperation[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
};

export class OfflineQueue {
  static subscribe(listener: OfflineQueueListener): () => void {
    listeners.add(listener);
    OfflineQueue.getCount().then(listener).catch(() => listener(0));
    return () => {
      listeners.delete(listener);
    };
  }

  static onSyncSuccess(listener: SyncSuccessListener): () => void {
    successListeners.add(listener);
    return () => {
      successListeners.delete(listener);
    };
  }

  static onSyncDrop(listener: SyncDropListener): () => void {
    dropListeners.add(listener);
    return () => {
      dropListeners.delete(listener);
    };
  }

  static isSyncing(): boolean {
    return syncInFlight;
  }

  static async addOperation(
    operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'> & { retries?: number }
  ): Promise<SyncOperation> {
    const queue = readQueue();
    const newOperation: SyncOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
      retries: operation.retries ?? 0,
    };
    queue.push(newOperation);
    writeQueue(queue);
    await notify();
    return newOperation;
  }

  static async getQueue(): Promise<SyncOperation[]> {
    return readQueue();
  }

  static async getCount(): Promise<number> {
    return readQueue().length;
  }

  static async removeOperation(id: string): Promise<void> {
    writeQueue(readQueue().filter((op) => op.id !== id));
    await notify();
  }

  static async updateOperation(id: string, patch: Partial<SyncOperation>): Promise<void> {
    writeQueue(readQueue().map((op) => (op.id === id ? { ...op, ...patch } : op)));
    await notify();
  }

  static async syncPending(): Promise<{ synced: number; remaining: number; dropped: number }> {
    if (syncInFlight) {
      const remaining = await this.getCount();
      return { synced: 0, remaining, dropped: 0 };
    }

    syncInFlight = true;
    let synced = 0;
    let dropped = 0;

    try {
      if (!isDeviceOnline()) {
        const remaining = await this.getCount();
        return { synced: 0, remaining, dropped: 0 };
      }

      while (true) {
        const queue = readQueue();
        if (queue.length === 0) break;
        if (!isDeviceOnline()) break;

        const op = queue[0];
        try {
          let responseData: unknown;
          switch (op.method) {
            case 'post': {
              const response = await api.post(op.endpoint, op.data);
              responseData = response.data;
              break;
            }
            case 'put': {
              const response = await api.put(op.endpoint, op.data);
              responseData = response.data;
              break;
            }
            case 'delete': {
              await api.delete(op.endpoint);
              responseData = undefined;
              break;
            }
            default:
              await this.removeOperation(op.id);
              dropped += 1;
              continue;
          }

          await this.removeOperation(op.id);
          synced += 1;
          successListeners.forEach((fn) => fn(op, responseData));
        } catch (error) {
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          const message = axios.isAxiosError(error)
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Sync failed';

          if (status === 401) {
            await this.updateOperation(op.id, { lastError: message });
            break;
          }

          if (!isRetryableStatus(status) || (op.retries ?? 0) + 1 >= MAX_RETRIES) {
            await this.removeOperation(op.id);
            dropped += 1;
            dropListeners.forEach((fn) => fn(op, message));
            console.error(`Dropped sync operation ${op.id}:`, message);
            continue;
          }

          await this.updateOperation(op.id, {
            retries: (op.retries ?? 0) + 1,
            lastError: message,
          });
          console.error(`Failed to sync operation ${op.id} (will retry):`, message);
          break;
        }
      }

      const remaining = await this.getCount();
      return { synced, remaining, dropped };
    } finally {
      syncInFlight = false;
      await notify();
    }
  }

  static async clearQueue(): Promise<void> {
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch {
      // ignore
    }
    await notify();
  }
}
