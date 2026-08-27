import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import api from '../services/api';

export type SyncEntityType = 'task' | 'field';

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
  /** Optimistic create id to replace after successful POST */
  tempEntityId?: string;
}

export type OfflineQueueListener = (count: number) => void;
export type SyncSuccessListener = (op: SyncOperation, responseData: unknown) => void;
export type SyncDropListener = (op: SyncOperation, reason: string) => void;

const MAX_RETRIES = 5;
const QUEUE_KEY = 'syncQueue';

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
    if (operation.method === ('get' as string)) {
      throw new Error('GET operations must not be queued');
    }

    const queue = await this.getQueue();
    const newOperation: SyncOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
      retries: operation.retries ?? 0,
    };
    queue.push(newOperation);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    await notify();
    return newOperation;
  }

  static async getQueue(): Promise<SyncOperation[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (op: SyncOperation) =>
          op &&
          typeof op.id === 'string' &&
          typeof op.method === 'string' &&
          typeof op.endpoint === 'string' &&
          typeof op.timestamp === 'number'
      );
    } catch {
      return [];
    }
  }

  static async getCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  static async removeOperation(id: string): Promise<void> {
    const queue = await this.getQueue();
    await AsyncStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(queue.filter((op) => op.id !== id))
    );
    await notify();
  }

  static async updateOperation(id: string, patch: Partial<SyncOperation>): Promise<void> {
    const queue = await this.getQueue();
    const next = queue.map((op) => (op.id === id ? { ...op, ...patch } : op));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
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
      const net = await NetInfo.fetch();
      if (!(net.isConnected ?? true)) {
        const remaining = await this.getCount();
        return { synced: 0, remaining, dropped: 0 };
      }

      // Re-read queue each iteration so concurrent adds are safe
      while (true) {
        const queue = await this.getQueue();
        if (queue.length === 0) break;

        const stillOnline = await NetInfo.fetch();
        if (!(stillOnline.isConnected ?? true)) break;

        const op = queue[0];
        if (op.method === ('get' as string)) {
          await this.removeOperation(op.id);
          dropped += 1;
          continue;
        }

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
          const message =
            axios.isAxiosError(error)
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Sync failed';

          // 401: leave for auth interceptor; stop flush
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
          // Stop FIFO until network recovers or next reconnect
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
    await AsyncStorage.removeItem(QUEUE_KEY);
    await notify();
  }
}
