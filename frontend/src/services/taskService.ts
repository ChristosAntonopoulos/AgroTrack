import api from './api';

export interface Evidence {
  photoUrl?: string;
  notes?: string;
  timestamp: string;
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
  type: string;
  title: string;
  description?: string;
  lifecycleYear: string;
  assignedTo?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
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
    const response = await api.post<Task>('/api/v1/tasks', data);
    return response.data;
  },

  updateTaskStatus: async (id: string, status: string): Promise<Task> => {
    const response = await api.put<Task>(`/api/v1/tasks/${id}/status`, { status });
    return response.data;
  },

  addEvidence: async (id: string, photoUrl?: string, notes?: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${id}/evidence`, {
      photoUrl,
      notes,
    });
    return response.data;
  },

  assignTask: async (id: string, assignedTo: string): Promise<Task> => {
    const response = await api.put<Task>(`/api/v1/tasks/${id}/assign`, {
      assignedTo,
    });
    return response.data;
  },
};
