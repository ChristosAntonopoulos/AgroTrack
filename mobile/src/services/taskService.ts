import api from './api';
import { OfflineQueue } from '../utils/offlineQueue';
import { EntityCache } from '../utils/entityCache';
import { isDeviceOnline, isNetworkError, createTempTaskId } from '../utils/networkStatus';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Evidence {
  photoUrl?: string;
  notes?: string;
  timestamp: string;
  kind?: string;
}

export interface Task {
  id: string;
  fieldId: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  assignedTo?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  lifecycleYear: string;
  harvestPhase?: 'prepare' | 'daily' | 'final';
  templateId?: string;
  cost?: number;
  approvalStatus?: string;
  approvalNote?: string;
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
}

type CreateTaskData = {
  fieldId: string;
  type: string;
  title: string;
  description?: string;
  assignedTo?: string;
  templateId?: string;
  harvestPhase?: 'prepare' | 'daily' | 'final';
  lifecycleYear?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
};

async function resolveUserId(): Promise<string | null> {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return typeof user?.userId === 'string' ? user.userId : null;
  } catch {
    return null;
  }
}

async function queueAndOptimisticTask(
  optimistic: Task,
  operation: Parameters<typeof OfflineQueue.addOperation>[0]
): Promise<Task> {
  await EntityCache.setTask(optimistic);
  await OfflineQueue.addOperation(operation);
  return optimistic;
}

export const taskService = {
  getAllTasks: async (): Promise<Task[]> => {
    const userId = await resolveUserId();

    if (!(await isDeviceOnline())) {
      if (userId) {
        const cached = await EntityCache.getTasks(userId);
        if (cached) return cached.data;
      }
      throw new Error('No cached tasks available offline');
    }

    try {
      const response = await api.get<Task[]>('/api/v1/tasks');
      if (userId) await EntityCache.setTasks(userId, response.data);
      return response.data;
    } catch (error) {
      if (userId && isNetworkError(error)) {
        const cached = await EntityCache.getTasks(userId);
        if (cached) return cached.data;
      }
      throw error;
    }
  },

  getAssignedTasks: async (userId: string, userRole: string): Promise<Task[]> => {
    if (!(await isDeviceOnline())) {
      const cached = await EntityCache.getTasks(userId);
      if (cached) return cached.data;
      throw new Error('No cached tasks available offline');
    }

    try {
      let data: Task[];
      if (userRole === 'FieldOwner' || userRole === 'Administrator') {
        const response = await api.get<Task[]>('/api/v1/tasks');
        data = response.data;
      } else {
        const response = await api.get<Task[]>(
          `/api/v1/tasks?assignedTo=${encodeURIComponent(userId)}`
        );
        data = response.data;
      }
      await EntityCache.setTasks(userId, data);
      return data;
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = await EntityCache.getTasks(userId);
        if (cached) return cached.data;
      }
      throw error;
    }
  },

  getTask: async (id: string): Promise<Task> => {
    if (!(await isDeviceOnline())) {
      const cached = await EntityCache.getTask(id);
      if (cached) return cached.data;
      throw new Error('No cached task available offline');
    }

    try {
      const response = await api.get<Task>(`/api/v1/tasks/${id}`);
      await EntityCache.setTask(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = await EntityCache.getTask(id);
        if (cached) return cached.data;
      }
      throw error;
    }
  },

  getTasksByField: async (fieldId: string): Promise<Task[]> => {
    const readCachedForField = async (): Promise<Task[] | null> => {
      const userId = await resolveUserId();
      if (!userId) return null;
      const cached = await EntityCache.getTasks(userId);
      if (!cached) return null;
      return cached.data.filter((t) => t.fieldId === fieldId);
    };

    if (!(await isDeviceOnline())) {
      const cached = await readCachedForField();
      if (cached) return cached;
      throw new Error('No cached tasks available offline');
    }

    try {
      const response = await api.get<Task[]>(
        `/api/v1/tasks?fieldId=${encodeURIComponent(fieldId)}`
      );
      const userId = await resolveUserId();
      if (userId) {
        const existing = await EntityCache.getTasks(userId);
        if (existing) {
          const others = existing.data.filter((t) => t.fieldId !== fieldId);
          await EntityCache.setTasks(userId, [...others, ...response.data]);
        } else {
          await EntityCache.setTasks(userId, response.data);
        }
      }
      for (const task of response.data) {
        await EntityCache.setTask(task);
      }
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = await readCachedForField();
        if (cached) return cached;
      }
      throw error;
    }
  },

  updateTaskStatus: async (taskId: string, status: string): Promise<Task> => {
    const enqueue = async (): Promise<Task> => {
      const now = new Date().toISOString();
      const patched = await EntityCache.patchTask(taskId, { status, updatedAt: now });
      const optimistic: Task =
        patched ??
        ({
          id: taskId,
          fieldId: '',
          type: '',
          title: '',
          status,
          lifecycleYear: 'low',
          evidence: [],
          createdAt: now,
          updatedAt: now,
        } as Task);

      return queueAndOptimisticTask(optimistic, {
        method: 'put',
        endpoint: `/api/v1/tasks/${taskId}/status`,
        data: { status },
        entityType: 'task',
        entityId: taskId,
      });
    };

    if (!(await isDeviceOnline())) {
      return enqueue();
    }

    try {
      const response = await api.put<Task>(`/api/v1/tasks/${taskId}/status`, { status });
      await EntityCache.setTask(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) return enqueue();
      throw error;
    }
  },

  addEvidence: async (
    taskId: string,
    photoUrl?: string,
    notes?: string,
    kind?: string
  ): Promise<Task> => {
    if (photoUrl) {
      // Photo evidence requires multipart upload — online only
      const response = await api.post<Task>(`/api/v1/tasks/${taskId}/evidence`, {
        photoUrl,
        notes,
        kind,
      });
      await EntityCache.setTask(response.data);
      return response.data;
    }

    const payload = { notes, kind };
    const enqueue = async (): Promise<Task> => {
      const existing = await EntityCache.getTask(taskId);
      const evidenceItem: Evidence = {
        notes,
        kind,
        timestamp: new Date().toISOString(),
      };
      const base = existing?.data;
      const optimistic: Task = base
        ? {
            ...base,
            evidence: [...(base.evidence ?? []), evidenceItem],
            updatedAt: evidenceItem.timestamp,
          }
        : {
            id: taskId,
            fieldId: '',
            type: '',
            title: '',
            status: 'pending',
            lifecycleYear: 'low',
            evidence: [evidenceItem],
            createdAt: evidenceItem.timestamp,
            updatedAt: evidenceItem.timestamp,
          };

      return queueAndOptimisticTask(optimistic, {
        method: 'post',
        endpoint: `/api/v1/tasks/${taskId}/evidence`,
        data: payload,
        entityType: 'task',
        entityId: taskId,
      });
    };

    if (!(await isDeviceOnline())) {
      return enqueue();
    }

    try {
      const response = await api.post<Task>(`/api/v1/tasks/${taskId}/evidence`, payload);
      await EntityCache.setTask(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) return enqueue();
      throw error;
    }
  },

  createTask: async (data: CreateTaskData): Promise<Task> => {
    const enqueue = async (): Promise<Task> => {
      const now = new Date().toISOString();
      const tempId = createTempTaskId();
      const optimistic: Task = {
        id: tempId,
        fieldId: data.fieldId,
        type: data.type,
        title: data.title,
        description: data.description,
        status: 'pending',
        assignedTo: data.assignedTo,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        harvestPhase: data.harvestPhase,
        lifecycleYear: data.lifecycleYear || 'low',
        evidence: [],
        createdAt: now,
        updatedAt: now,
      };

      return queueAndOptimisticTask(optimistic, {
        method: 'post',
        endpoint: '/api/v1/tasks',
        data,
        entityType: 'task',
        entityId: tempId,
        tempEntityId: tempId,
      });
    };

    if (!(await isDeviceOnline())) {
      return enqueue();
    }

    try {
      const response = await api.post<Task>('/api/v1/tasks', data);
      await EntityCache.setTask(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) return enqueue();
      throw error;
    }
  },

  assignTask: async (taskId: string, userId: string): Promise<Task> => {
    const enqueue = async (): Promise<Task> => {
      const patched = await EntityCache.patchTask(taskId, { assignedTo: userId });
      const now = new Date().toISOString();
      const optimistic: Task =
        patched ??
        ({
          id: taskId,
          fieldId: '',
          type: '',
          title: '',
          status: 'pending',
          assignedTo: userId,
          lifecycleYear: 'low',
          evidence: [],
          createdAt: now,
          updatedAt: now,
        } as Task);

      return queueAndOptimisticTask(optimistic, {
        method: 'put',
        endpoint: `/api/v1/tasks/${taskId}/assign`,
        data: { assignedTo: userId },
        entityType: 'task',
        entityId: taskId,
      });
    };

    if (!(await isDeviceOnline())) {
      return enqueue();
    }

    try {
      const response = await api.put<Task>(`/api/v1/tasks/${taskId}/assign`, {
        assignedTo: userId,
      });
      await EntityCache.setTask(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) return enqueue();
      throw error;
    }
  },

  approveTask: async (taskId: string, note?: string): Promise<Task> => {
    const body = note ? { note } : {};
    const enqueue = async (): Promise<Task> => {
      const patched = await EntityCache.patchTask(taskId, {
        approvalStatus: 'approved',
        approvalNote: note,
      });
      const now = new Date().toISOString();
      const optimistic: Task =
        patched ??
        ({
          id: taskId,
          fieldId: '',
          type: '',
          title: '',
          status: 'completed',
          approvalStatus: 'approved',
          approvalNote: note,
          lifecycleYear: 'low',
          evidence: [],
          createdAt: now,
          updatedAt: now,
        } as Task);

      return queueAndOptimisticTask(optimistic, {
        method: 'post',
        endpoint: `/api/v1/tasks/${taskId}/approve`,
        data: body,
        entityType: 'task',
        entityId: taskId,
      });
    };

    if (!(await isDeviceOnline())) {
      return enqueue();
    }

    try {
      const response = await api.post<Task>(`/api/v1/tasks/${taskId}/approve`, body);
      await EntityCache.setTask(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) return enqueue();
      throw error;
    }
  },

  rejectTask: async (taskId: string, note?: string): Promise<Task> => {
    const body = note ? { note } : {};
    const enqueue = async (): Promise<Task> => {
      const patched = await EntityCache.patchTask(taskId, {
        approvalStatus: 'rejected',
        approvalNote: note,
      });
      const now = new Date().toISOString();
      const optimistic: Task =
        patched ??
        ({
          id: taskId,
          fieldId: '',
          type: '',
          title: '',
          status: 'pending',
          approvalStatus: 'rejected',
          approvalNote: note,
          lifecycleYear: 'low',
          evidence: [],
          createdAt: now,
          updatedAt: now,
        } as Task);

      return queueAndOptimisticTask(optimistic, {
        method: 'post',
        endpoint: `/api/v1/tasks/${taskId}/reject`,
        data: body,
        entityType: 'task',
        entityId: taskId,
      });
    };

    if (!(await isDeviceOnline())) {
      return enqueue();
    }

    try {
      const response = await api.post<Task>(`/api/v1/tasks/${taskId}/reject`, body);
      await EntityCache.setTask(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) return enqueue();
      throw error;
    }
  },
};
