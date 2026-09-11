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

export interface FieldPhenology {
  fieldId: string;
  isKnown: boolean;
  stageCode: string;
  stageLabel: string;
  message: string;
  recordStageActionLabel?: string;
  observedOn?: string;
  source?: string;
  confidence?: string;
  confidenceLabel?: string;
  observationId?: string;
  photoIds?: string[];
  notes?: string;
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
  startedAt?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type DismissalLearningChoice = 'dont_propose' | 'ask_when_indicated' | 'keep_proposing';
export type CompletionFrequencyChoice =
  | 'every_2_years'
  | 'every_year'
  | 'when_needed'
  | 'no_change';

export interface DismissalLearningEvaluateResult {
  shouldPrompt: boolean;
  dismissCount: number;
  threshold: number;
  templateCode: string;
  practiceCategory: string;
  currentPreferenceMode: string;
  promptMessage: string;
}

export interface CompletionLearningEvaluateResult {
  shouldPrompt: boolean;
  templateCode: string;
  practiceCategory: string;
  resultYear: number;
  suggestNextYear: number;
  promptMessage: string;
}

export type FieldWorkProfile = {
  status?: string;
  pruning?: { defaultAssigneeId?: string | null };
  irrigation?: { defaultAssigneeId?: string | null };
  fertilisation?: { defaultAssigneeId?: string | null };
  groundCover?: { defaultAssigneeId?: string | null };
  pestManagement?: { defaultAssigneeId?: string | null };
  analysis?: { defaultAssigneeId?: string | null };
  harvest?: { defaultAssigneeId?: string | null };
  defaultAssignments?: {
    entries?: Array<{ category: string; assigneeUserId?: string | null; isSelf: boolean }>;
  };
};

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

  getTaskPlan: async (
    fieldId: string,
    year: number
  ): Promise<{ fieldId: string; resultYear: number; tasks: FieldTask[]; proposals: TaskProposal[] }> => {
    const response = await api.get(`/api/v1/fields/${fieldId}/year/${year}/task-plan`);
    return response.data;
  },

  getPhenology: async (fieldId: string): Promise<FieldPhenology> => {
    const response = await api.get<FieldPhenology>(`/api/v1/fields/${fieldId}/phenology`);
    return response.data;
  },

  getWorkProfile: async (fieldId: string): Promise<FieldWorkProfile | null> => {
    const response = await api.get<FieldWorkProfile | null>(`/api/v1/fields/${fieldId}/work-profile`);
    return response.data ?? null;
  },

  evaluateDismissalLearning: async (
    fieldId: string,
    templateCode: string
  ): Promise<DismissalLearningEvaluateResult> => {
    const response = await api.post<DismissalLearningEvaluateResult>(
      `/api/v1/fields/${fieldId}/work-profile/learning/dismissal-evaluate`,
      { templateCode }
    );
    return response.data;
  },

  applyDismissalLearning: async (
    fieldId: string,
    templateCode: string,
    choice: DismissalLearningChoice
  ): Promise<FieldWorkProfile> => {
    const response = await api.post<FieldWorkProfile>(
      `/api/v1/fields/${fieldId}/work-profile/learning/dismissal-apply`,
      { templateCode, choice }
    );
    return response.data;
  },

  evaluateCompletionLearning: async (
    fieldId: string,
    body: { templateCode: string; outcome?: string; resultYear?: number }
  ): Promise<CompletionLearningEvaluateResult> => {
    const response = await api.post<CompletionLearningEvaluateResult>(
      `/api/v1/fields/${fieldId}/work-profile/learning/completion-evaluate`,
      body
    );
    return response.data;
  },

  applyCompletionLearning: async (
    fieldId: string,
    body: { templateCode: string; resultYear: number; choice: CompletionFrequencyChoice }
  ): Promise<FieldWorkProfile> => {
    const response = await api.post<FieldWorkProfile>(
      `/api/v1/fields/${fieldId}/work-profile/learning/completion-apply`,
      body
    );
    return response.data;
  },
};
