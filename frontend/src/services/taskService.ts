import api from './api';
import { OfflineQueue } from '../utils/offlineQueue';
import { EntityCache } from '../utils/entityCache';
import { createTempTaskId, isDeviceOnline, isNetworkError } from '../utils/networkStatus';

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

export interface Evidence {
  photoUrl?: string;
  notes?: string;
  timestamp: string;
  kind?: 'before' | 'after' | 'general';
}

export interface Task {
  id: string;
  fieldId: string;
  templateId?: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  assignedTo?: string;
  approvalStatus?: 'not_required' | 'pending' | 'approved' | 'rejected';
  approvalNote?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedMinutes?: number;
  materials?: string[];
  checklist?: string[];
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  lifecycleYear: string;
  cost?: number;
  evidence: Evidence[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  fieldId: string;
  templateId?: string;
  type: string;
  title: string;
  description?: string;
  lifecycleYear: string;
  assignedTo?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  checklist?: string[];
  repetition?: string;
  completionFields?: string[];
  notes?: string;
}

export const taskService = {
  getTasks: async (fieldId?: string, assignedTo?: string): Promise<Task[]> => {
    const userId = getCurrentUserId();
    const filterCached = (tasks: Task[]) => {
      let list = tasks;
      if (fieldId) list = list.filter((t) => t.fieldId === fieldId);
      if (assignedTo) list = list.filter((t) => t.assignedTo === assignedTo);
      return list;
    };

    if (!isDeviceOnline()) {
      if (userId) {
        const cached = EntityCache.getTasks(userId);
        if (cached) return filterCached(cached.data);
      }
      throw new Error('No cached tasks available offline');
    }

    try {
      const params = new URLSearchParams();
      if (fieldId) params.append('fieldId', fieldId);
      if (assignedTo) params.append('assignedTo', assignedTo);

      const query = params.toString();
      const url = query ? `/api/v1/tasks?${query}` : '/api/v1/tasks';
      const response = await api.get<Task[]>(url);

      if (userId) {
        if (!fieldId && !assignedTo) {
          EntityCache.setTasks(userId, response.data);
        } else {
          const existing = EntityCache.getTasks(userId);
          if (existing) {
            const others = existing.data.filter((t) => {
              if (fieldId && t.fieldId === fieldId) return false;
              if (assignedTo && t.assignedTo === assignedTo) return false;
              return true;
            });
            EntityCache.setTasks(userId, [...others, ...response.data]);
          } else {
            EntityCache.setTasks(userId, response.data);
          }
          response.data.forEach((task) => EntityCache.setTask(task));
        }
      }

      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err) && userId) {
        const cached = EntityCache.getTasks(userId);
        if (cached) return filterCached(cached.data);
      }
      throw err;
    }
  },

  getTask: async (id: string): Promise<Task> => {
    if (!isDeviceOnline()) {
      const cached = EntityCache.getTask(id);
      if (cached) return cached.data;
      throw new Error('No cached task available offline');
    }

    try {
      const response = await api.get<Task>(`/api/v1/tasks/${id}`);
      EntityCache.setTask(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const cached = EntityCache.getTask(id);
        if (cached) return cached.data;
      }
      throw err;
    }
  },

  createTask: async (data: CreateTaskDto): Promise<Task> => {
    try {
      const response = await api.post<Task>('/api/v1/tasks', data);
      EntityCache.setTask(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const tempId = createTempTaskId();
        const now = new Date().toISOString();
        const optimistic: Task = {
          id: tempId,
          fieldId: data.fieldId,
          templateId: data.templateId,
          type: data.type,
          title: data.title,
          description: data.description,
          status: 'pending',
          assignedTo: data.assignedTo,
          scheduledStart: data.scheduledStart,
          scheduledEnd: data.scheduledEnd,
          lifecycleYear: data.lifecycleYear,
          priority: data.priority,
          checklist: data.checklist,
          evidence: [],
          notes: data.notes,
          createdAt: now,
          updatedAt: now,
        };
        EntityCache.setTask(optimistic);
        await OfflineQueue.addOperation({
          method: 'post',
          endpoint: '/api/v1/tasks',
          data,
          entityType: 'task',
          tempEntityId: tempId,
        });
        return optimistic;
      }
      throw err;
    }
  },

  updateTaskStatus: async (id: string, status: string): Promise<Task> => {
    try {
      const response = await api.put<Task>(`/api/v1/tasks/${id}/status`, { status });
      EntityCache.setTask(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const now = new Date().toISOString();
        const patched =
          EntityCache.patchTask(id, { status, updatedAt: now }) ??
          ({
            id,
            fieldId: '',
            type: '',
            title: 'Task',
            status,
            lifecycleYear: '',
            evidence: [],
            createdAt: now,
            updatedAt: now,
          } as Task);
        await OfflineQueue.addOperation({
          method: 'put',
          endpoint: `/api/v1/tasks/${id}/status`,
          data: { status },
          entityType: 'task',
          entityId: id,
        });
        return patched;
      }
      throw err;
    }
  },

  addEvidence: async (id: string, photoUrl?: string, notes?: string, kind?: Evidence['kind']): Promise<Task> => {
    const payload = { photoUrl, notes, kind };
    try {
      const response = await api.post<Task>(`/api/v1/tasks/${id}/evidence`, payload);
      EntityCache.setTask(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const now = new Date().toISOString();
        const existing = EntityCache.getTask(id);
        const evidence = [...(existing?.data.evidence || []), { photoUrl, notes, kind, timestamp: now }];
        const patched =
          EntityCache.patchTask(id, { evidence, updatedAt: now }) ??
          ({
            id,
            fieldId: '',
            type: '',
            title: 'Task',
            status: 'in_progress',
            lifecycleYear: '',
            evidence,
            createdAt: now,
            updatedAt: now,
          } as Task);
        await OfflineQueue.addOperation({
          method: 'post',
          endpoint: `/api/v1/tasks/${id}/evidence`,
          data: payload,
          entityType: 'task',
          entityId: id,
        });
        return patched;
      }
      throw err;
    }
  },

  assignTask: async (id: string, assignedTo: string): Promise<Task> => {
    const payload = { assignedTo };
    try {
      const response = await api.put<Task>(`/api/v1/tasks/${id}/assign`, payload);
      EntityCache.setTask(response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const now = new Date().toISOString();
        const patched =
          EntityCache.patchTask(id, { assignedTo, updatedAt: now }) ??
          ({
            id,
            fieldId: '',
            type: '',
            title: 'Task',
            status: 'pending',
            assignedTo,
            lifecycleYear: '',
            evidence: [],
            createdAt: now,
            updatedAt: now,
          } as Task);
        await OfflineQueue.addOperation({
          method: 'put',
          endpoint: `/api/v1/tasks/${id}/assign`,
          data: payload,
          entityType: 'task',
          entityId: id,
        });
        return patched;
      }
      throw err;
    }
  },

  approveTask: async (id: string, note?: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${id}/approve`, { note });
    EntityCache.setTask(response.data);
    return response.data;
  },

  rejectTask: async (id: string, note?: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${id}/reject`, { note });
    EntityCache.setTask(response.data);
    return response.data;
  },
};
