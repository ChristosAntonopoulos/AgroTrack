import api from './api';

export type TaskStatus = 'planned' | 'done' | 'skipped';
export type TaskSource = 'custom' | 'template';
export type TaskTimingBucket = 'today' | 'tomorrow' | 'thisWeek' | 'later';
export type TaskListView = 'today' | 'upcoming' | 'done';

export interface TaskChecklistItem {
  key: string;
  label: string;
  greekLabel?: string;
  englishLabel?: string;
  itemType?: string;
  requirement?: string;
  isEssential?: boolean;
  sortOrder?: number;
  isAnswered?: boolean;
  textValue?: string;
  numberValue?: number;
  boolValue?: boolean;
  attachmentIds?: string[];
  choices?: string[];
  unit?: string;
}

export interface Task {
  id: string;
  fieldId: string;
  resultYear: number;
  ownerId: string;
  title: string;
  description?: string;
  status: TaskStatus | string;
  statusLabel?: string;
  source: TaskSource | string;
  templateCode?: string;
  timingBucket: TaskTimingBucket | string;
  scheduledFor?: string;
  plannedStart?: string;
  plannedEnd?: string;
  assigneeId?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  note?: string;
  notes?: string;
  recurrence?: string;
  checklist: TaskChecklistItem[];
  linkedWorkRecordId?: string;
  completedAt?: string;
  completedByUserId?: string;
  skippedAt?: string;
  skippedReason?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  fieldId: string;
  title: string;
  description?: string;
  templateCode?: string;
  timingBucket?: TaskTimingBucket | string;
  scheduledFor?: string;
  plannedStart?: string;
  plannedEnd?: string;
  assigneeId?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  note?: string;
  notes?: string;
  recurrence?: string;
  resultYear?: number;
  checklist?: Array<{ key: string; isAnswered?: boolean; textValue?: string }>;
}

export interface PatchTaskInput {
  title?: string;
  description?: string;
  timingBucket?: TaskTimingBucket | string;
  scheduledFor?: string;
  plannedStart?: string;
  plannedEnd?: string;
  assigneeId?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  note?: string;
  notes?: string;
  recurrence?: string;
  resultYear?: number;
}

export interface TaskSuggestion {
  templateCode: string;
  title: string;
  fieldId: string;
  resultYear: number;
  whyNow: string;
  category: string;
  recommendedWindowStart?: string;
  recommendedWindowEnd?: string;
  confidence: string;
}

export interface WorkRecord {
  id: string;
  linkedTaskId?: string;
  taskId?: string;
  fieldId: string;
  resultYear: number;
  ownerId: string;
  title?: string;
  templateCode?: string;
  startedAt?: string;
  completedAt: string;
  outcome: string;
  outcomeLabel?: string;
  completedByUserIds: string[];
  notes?: string;
  attachmentIds: string[];
  recordedByUserId: string;
  createdAt: string;
  updatedAt: string;
  matchingPlannedTasks?: Task[];
}

export interface CreateWorkRecordInput {
  fieldId: string;
  title?: string;
  templateCode?: string;
  completedAt?: string;
  startedAt?: string;
  notes?: string;
  attachmentIds?: string[];
  resultYear?: number;
  linkedTaskId?: string;
  offerPlannedTaskMatch?: boolean;
}

/** Farmer-facing curated templates for schedule picker. */
export const CURATED_TASK_TEMPLATE_CODES = [
  'T06',
  'T05',
  'T09',
  'T14',
  'T08',
  'T20',
  'T21',
  'T23',
] as const;

export const taskService = {
  listTasks: async (params?: {
    view?: TaskListView | string;
    fieldId?: string;
  }): Promise<Task[]> => {
    const response = await api.get<Task[]>('/api/v1/tasks', { params });
    return response.data;
  },

  getTask: async (id: string): Promise<Task> => {
    const response = await api.get<Task>(`/api/v1/tasks/${id}`);
    return response.data;
  },

  createTask: async (input: CreateTaskInput): Promise<Task> => {
    const response = await api.post<Task>('/api/v1/tasks', input);
    return response.data;
  },

  patchTask: async (id: string, input: PatchTaskInput): Promise<Task> => {
    const response = await api.patch<Task>(`/api/v1/tasks/${id}`, input);
    return response.data;
  },

  completeTask: async (id: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${id}/complete`);
    return response.data;
  },

  skipTask: async (id: string, reason?: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${id}/skip`, { reason });
    return response.data;
  },

  linkWorkRecord: async (id: string, workRecordId: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${id}/link-work-record`, {
      workRecordId,
    });
    return response.data;
  },

  undoComplete: async (id: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/v1/tasks/${id}/undo-complete`);
    return response.data;
  },

  listSuggestions: async (params: {
    fieldId: string;
    date?: string;
  }): Promise<TaskSuggestion[]> => {
    const response = await api.get<TaskSuggestion[]>('/api/v1/task-suggestions', { params });
    return response.data;
  },

  dismissSuggestion: async (input: {
    fieldId: string;
    templateCode: string;
    resultYear?: number;
  }): Promise<void> => {
    await api.post('/api/v1/task-suggestions/dismiss', input);
  },

  createWorkRecord: async (input: CreateWorkRecordInput): Promise<WorkRecord> => {
    const response = await api.post<WorkRecord>('/api/v1/work-records', input);
    return response.data;
  },
};
