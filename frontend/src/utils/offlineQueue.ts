export interface SyncOperation {
  id: string;
  method: 'post' | 'put' | 'delete';
  endpoint: string;
  data?: any;
  timestamp: number;
}

const QUEUE_KEY = 'agrotrack_offline_sync_queue_v1';

const readQueue = (): SyncOperation[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((op) => op && typeof op.id === 'string' && typeof op.endpoint === 'string');
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
  static async addOperation(operation: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<SyncOperation> {
    const queue = readQueue();
    const newOperation: SyncOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
    };
    queue.push(newOperation);
    writeQueue(queue);
    return newOperation;
  }

  static async getQueue(): Promise<SyncOperation[]> {
    return readQueue();
  }

  static async getCount(): Promise<number> {
    return readQueue().length;
  }

  static async removeOperation(id: string): Promise<void> {
    const queue = readQueue();
    writeQueue(queue.filter((op) => op.id !== id));
  }

  static async clearQueue(): Promise<void> {
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch {
      // ignore
    }
  }
}

