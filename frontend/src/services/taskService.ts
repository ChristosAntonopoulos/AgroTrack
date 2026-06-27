import api from './api';
import { OfflineQueue } from '../utils/offlineQueue';

const isNetworkError = (err: any) => {
  return !!err && !err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error');
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
    const params = new URLSearchParams();
    if (fieldId) params.append('fieldId', fieldId);
    if (assignedTo) params.append('assignedTo', assignedTo);
    
    const query = params.toString();
    const url = query ? `/api/v1/tasks?${query}` : '/api/v1/tasks';
    const response = await api.get<Task[]>(url);
    return response.data;
  },

  getTask: async (id: string): Promise<Task> => {
    const response = await api.get<Task>(`/api/v1/tasks/${id}`);
    return response.data;
  },

  createTask: async (data: CreateTaskDto): Promise<Task> => {
    try {
      const response = await api.post<Task>('/api/v1/tasks', data);
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        await OfflineQueue.addOperation({ method: 'post', endpoint: '/api/v1/tasks', data });
        const now = new Date().toISOString();
        return {
          id: `temp-task-${Date.now()}`,
          fieldId: data.fieldId,
          type: data.type,
          title: data.title,
          description: data.description,
          status: 'pending',
          assignedTo: data.assignedTo,
          scheduledStart: data.scheduledStart,
          scheduledEnd: data.scheduledEnd,
          lifecycleYear: data.lifecycleYear,
          evidence: [],
          createdAt: now,
          updatedAt: now,
        };
      }
      throw err;
    }
  },

  updateTaskStatus: async (id: string, status: string): Promise<Task> => {
    try {
      const response = await api.put<Task>(`/api/v1/tasks/${id}/status`, { status });
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        await OfflineQueue.addOperation({ method: 'put', endpoint: `/api/v1/tasks/${id}/status`, data: { status } });
        // Caller should refresh after sync; return a best-effort stub.
        const now = new Date().toISOString();
        return {
          id,
          fieldId: '',
          type: '',
          title: 'Task',
          status,
          lifecycleYear: '',
          evidence: [],
          createdAt: now,
          updatedAt: now,
        };
      }
      throw err;
    }
  },

  addEvidence: async (id: string, photoUrl?: string, notes?: string, kind?: Evidence['kind']): Promise<Task> => {
    const payload = { photoUrl, notes, kind };
    try {
      const response = await api.post<Task>(`/api/v1/tasks/${id}/evidence`, payload);
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        await OfflineQueue.addOperation({ method: 'post', endpoint: `/api/v1/tasks/${id}/evidence`, data: payload });
        const now = new Date().toISOString();
        return {
          id,
          fieldId: '',
          type: '',
          title: 'Task',
          status: 'in_progress',
          lifecycleYear: '',
          evidence: [{ photoUrl, notes, kind, timestamp: now }],
          createdAt: now,
          updatedAt: now,
        };
      }
      throw err;
    }
  },

  assignTask: async (id: string, assignedTo: string): Promise<Task> => {
    const payload = { assignedTo };
    try {
      const response = await api.put<Task>(`/api/v1/tasks/${id}/assign`, payload);
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        await OfflineQueue.addOperation({ method: 'put', endpoint: `/api/v1/tasks/${id}/assign`, data: payload });
        const now = new Date().toISOString();
        return {
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
        };
      }
      throw err;
    }
  },

  approveTask: async (id: string, note?: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${id}/approve`, { note });
    return response.data;
  },

  rejectTask: async (id: string, note?: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${id}/reject`, { note });
    return response.data;
  },
};
