import api from './api';

export type FieldTaskStatus =
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'cancelled';

export interface TaskProposal {
  id: string;
  fieldId: string;
  resultYear: number;
  templateCode: string;
  templateVersion: number;
  sourceType: string;
  sourceTypeLabel: string;
  sourceReference?: string;
  generatedAt: string;
  validFrom?: string;
  validUntil?: string;
  confidence: string;
  confidenceLabel: string;
  reasonCodes: string[];
  explanation: string;
  greekExplanation: string;
  englishExplanation?: string;
  requiredEvidence?: string;
  recommendedWindowStart?: string;
  recommendedWindowEnd?: string;
  status: string;
  statusLabel: string;
  acceptedTaskId?: string;
  snoozeUntil?: string;
}

export interface FieldTaskChecklistItem {
  key: string;
  label: string;
  greekLabel: string;
  englishLabel: string;
  itemType: string;
  requirement: string;
  isEssential: boolean;
  sortOrder: number;
  isAnswered: boolean;
  textValue?: string;
  numberValue?: number;
  boolValue?: boolean;
  attachmentIds: string[];
  choices: string[];
  unit?: string;
}

export interface FieldTask {
  id: string;
  fieldId: string;
  resultYear: number;
  templateCode?: string;
  templateVersion?: number;
  title: string;
  description?: string;
  status: FieldTaskStatus | string;
  statusLabel: string;
  plannedStart?: string;
  plannedEnd?: string;
  preferredTimeWindow?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  responsibleUserId?: string;
  additionalParticipantUserIds: string[];
  assignmentResponse: string;
  proposalId?: string;
  checklist: FieldTaskChecklistItem[];
  estimatedCost?: number;
  estimatedCostCurrency?: string;
  notes?: string;
  attachmentIds: string[];
  relatedHarvestId?: string;
  weatherSuitability: string;
  weatherSuitabilityLabel: string;
  latestExecutionId?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  fieldId: string;
  resultYear: number;
  startedAt?: string;
  completedAt: string;
  outcome: string;
  outcomeLabel: string;
  completedByUserIds: string[];
  notes?: string;
  attachmentIds: string[];
  followUpRequired: boolean;
  followUpTaskId?: string;
}

export interface CreateFieldTaskInput {
  fieldId: string;
  title: string;
  description?: string;
  templateCode?: string;
  plannedStart?: string;
  plannedEnd?: string;
  preferredTimeWindow?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  notes?: string;
  estimatedCost?: number;
  resultYear?: number;
  relatedHarvestId?: string;
}

export interface AcceptProposalInput {
  plannedStart?: string;
  plannedEnd?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  notes?: string;
  resultYear?: number;
}

/** Active Field Work list statuses (completed lives in Chronologio). */
export const ACTIVE_FIELD_TASK_STATUSES: ReadonlySet<string> = new Set([
  'planned',
  'ready',
  'in_progress',
  'blocked',
]);

export const isActiveFieldTask = (task: Pick<FieldTask, 'status'>): boolean =>
  ACTIVE_FIELD_TASK_STATUSES.has(String(task.status).toLowerCase());

export const isCompletedFieldTask = (task: Pick<FieldTask, 'status'>): boolean => {
  const s = String(task.status).toLowerCase();
  return s === 'completed' || s === 'done';
};

export const fieldTaskTypeKey = (task: Pick<FieldTask, 'templateCode' | 'title'>): string =>
  (task.templateCode || task.title || 'task').trim() || 'task';

export const fieldWorkService = {
  listProposals: async (params?: {
    fieldId?: string;
    resultYear?: number;
  }): Promise<TaskProposal[]> => {
    const response = await api.get<TaskProposal[]>('/api/v1/task-proposals', { params });
    return response.data;
  },

  evaluateFieldProposals: async (
    fieldId: string,
    body?: { resultYear?: number; hasWeatherData?: boolean; weatherSuitability?: string }
  ): Promise<TaskProposal[]> => {
    const response = await api.post<TaskProposal[]>(
      `/api/v1/fields/${fieldId}/task-proposals/evaluate`,
      body ?? {}
    );
    return response.data;
  },

  acceptProposal: async (id: string, body?: AcceptProposalInput): Promise<TaskProposal> => {
    const response = await api.post<TaskProposal>(`/api/v1/task-proposals/${id}/accept`, body ?? {});
    return response.data;
  },

  snoozeProposal: async (id: string, until?: string): Promise<TaskProposal> => {
    const response = await api.post<TaskProposal>(`/api/v1/task-proposals/${id}/snooze`, {
      until,
    });
    return response.data;
  },

  dismissProposal: async (
    id: string,
    decision: 'not_for_this_field' | 'dismiss_for_year' = 'dismiss_for_year'
  ): Promise<TaskProposal> => {
    const response = await api.post<TaskProposal>(`/api/v1/task-proposals/${id}/dismiss`, {
      decision,
    });
    return response.data;
  },

  listFieldTasks: async (params?: {
    fieldId?: string;
    resultYear?: number;
    status?: string;
  }): Promise<FieldTask[]> => {
    const response = await api.get<FieldTask[]>('/api/v1/field-tasks', { params });
    return response.data;
  },

  getFieldTask: async (id: string): Promise<FieldTask> => {
    const response = await api.get<FieldTask>(`/api/v1/field-tasks/${id}`);
    return response.data;
  },

  createFieldTask: async (input: CreateFieldTaskInput): Promise<FieldTask> => {
    const response = await api.post<FieldTask>('/api/v1/field-tasks', input);
    return response.data;
  },

  startFieldTask: async (id: string): Promise<FieldTask> => {
    const response = await api.post<FieldTask>(`/api/v1/field-tasks/${id}/start`);
    return response.data;
  },

  completeFieldTask: async (
    id: string,
    body: {
      outcome?: string;
      notes?: string;
      checklistAnswers?: Array<{
        key: string;
        textValue?: string;
        numberValue?: number;
        boolValue?: boolean;
      }>;
      createFollowUpForRemainder?: boolean;
    } = {}
  ): Promise<TaskExecution> => {
    const response = await api.post<TaskExecution>(`/api/v1/field-tasks/${id}/complete`, body);
    return response.data;
  },

  undoCompletion: async (executionId: string): Promise<FieldTask> => {
    const response = await api.post<FieldTask>(
      `/api/v1/field-tasks/executions/${executionId}/undo`
    );
    return response.data;
  },

  cancelFieldTask: async (id: string): Promise<FieldTask> => {
    const response = await api.post<FieldTask>(`/api/v1/field-tasks/${id}/cancel`);
    return response.data;
  },

  assignFieldTask: async (
    id: string,
    body: {
      assignedUserId?: string;
      assignedCollaboratorId?: string;
      responsibleUserId?: string;
    }
  ): Promise<FieldTask> => {
    const response = await api.post<FieldTask>(`/api/v1/field-tasks/${id}/assign`, body);
    return response.data;
  },

  getTaskPlan: async (fieldId: string, year: number) => {
    const response = await api.get(`/api/v1/fields/${fieldId}/year/${year}/task-plan`);
    return response.data;
  },
};
