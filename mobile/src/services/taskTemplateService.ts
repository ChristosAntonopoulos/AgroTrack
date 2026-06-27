import api from './api';

export interface TaskTemplate {
  id: string;
  type: string;
  title: string;
  description?: string;
  lifecycleYear: string;
}

export const taskTemplateService = {
  getTemplates: async (): Promise<TaskTemplate[]> => {
    const response = await api.get<TaskTemplate[]>('/api/v1/task-templates');
    return response.data;
  },
};

export interface CreateTaskDto {
  fieldId: string;
  templateId?: string;
  type: string;
  title: string;
  description?: string;
  assignedTo?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}
