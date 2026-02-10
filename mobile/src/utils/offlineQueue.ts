import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface SyncOperation {
  id: string;
  method: 'get' | 'post' | 'put' | 'delete';
  endpoint: string;
  data?: any;
  timestamp: number;
}

export class OfflineQueue {
  private static QUEUE_KEY = 'syncQueue';

  static async addOperation(operation: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getQueue();
    const newOperation: SyncOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    queue.push(newOperation);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }

  static async getQueue(): Promise<SyncOperation[]> {
    const data = await AsyncStorage.getItem(this.QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async removeOperation(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(op => op.id !== id);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered));
  }

  static async syncPending(): Promise<void> {
    const queue = await this.getQueue();
    
    for (const op of queue) {
      try {
        let response;
        switch (op.method) {
          case 'post':
            response = await api.post(op.endpoint, op.data);
            break;
          case 'put':
            response = await api.put(op.endpoint, op.data);
            break;
          case 'delete':
            response = await api.delete(op.endpoint);
            break;
          default:
            continue;
        }
        await this.removeOperation(op.id);
      } catch (error) {
        // Handle conflict - for now, skip failed operations
        console.error(`Failed to sync operation ${op.id}:`, error);
      }
    }
  }

  static async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(this.QUEUE_KEY);
  }
}
