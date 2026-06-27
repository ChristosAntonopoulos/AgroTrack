import api from './api';

export interface Evidence {
  photoUrl?: string;
  notes?: string;
  timestamp: string;
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
  cost?: number;
  approvalStatus?: string;
  approvalNote?: string;
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
}

export const taskService = {
  getAllTasks: async (): Promise<Task[]> => {
    const response = await api.get<Task[]>('/api/v1/tasks');
    return response.data;
  },

  getAssignedTasks: async (userId: string, userRole: string): Promise<Task[]> => {
    if (userRole === 'FieldOwner' || userRole === 'Administrator') {
      const response = await api.get<Task[]>('/api/v1/tasks');
      return response.data;
    }
    const response = await api.get<Task[]>(`/api/v1/tasks?assignedTo=${encodeURIComponent(userId)}`);
    return response.data;
  },

  getTask: async (id: string): Promise<Task> => {
    const response = await api.get<Task>(`/api/v1/tasks/${id}`);
    return response.data;
  },

  getTasksByField: async (fieldId: string): Promise<Task[]> => {
    const response = await api.get<Task[]>(`/api/v1/tasks?fieldId=${encodeURIComponent(fieldId)}`);
    return response.data;
  },

  updateTaskStatus: async (taskId: string, status: string): Promise<Task> => {
    const response = await api.put<Task>(`/api/v1/tasks/${taskId}/status`, { status });
    return response.data;
  },

  addEvidence: async (taskId: string, photoUrl?: string, notes?: string, kind?: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${taskId}/evidence`, { photoUrl, notes, kind });
    return response.data;
  },

  createTask: async (data: {
    fieldId: string;
    type: string;
    title: string;
    description?: string;
    assignedTo?: string;
    templateId?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
  }): Promise<Task> => {
    const response = await api.post<Task>('/api/v1/tasks', data);
    return response.data;
  },

  assignTask: async (taskId: string, userId: string): Promise<Task> => {
    const response = await api.put<Task>(`/api/v1/tasks/${taskId}/assign`, { assignedTo: userId });
    return response.data;
  },

  approveTask: async (taskId: string, note?: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${taskId}/approve`, note ? { note } : {});
    return response.data;
  },

  rejectTask: async (taskId: string, note?: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${taskId}/reject`, note ? { note } : {});
    return response.data;
  },
};
