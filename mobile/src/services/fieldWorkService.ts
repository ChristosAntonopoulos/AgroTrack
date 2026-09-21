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

export interface FieldPhenologyObservation {
  id: string;
  fieldId: string;
  stageCode: string;
  stageLabel: string;
  observedOn: string;
  source: string;
  confidence: string;
  confidenceLabel?: string;
  photoIds: string[];
  notes?: string;
  observedByUserId: string;
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
  /** Soft pause while status remains in_progress — not a fifth status. */
  isPaused?: boolean;
  pauseReason?: string;
  pausedAt?: string;
  workGroupId?: string;
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

export type FieldWorkProfileStatus = 'draft' | 'active';

export interface PracticeProfile {
  preferenceMode: string;
  preferenceModeLabel?: string;
  frequencyType: string;
  frequencyTypeLabel?: string;
  frequencyValue?: number | null;
  preferredMonths?: number[];
  lastPerformedYear?: number | null;
  lastPerformedMonth?: number | null;
  datePrecision?: string | null;
  datePrecisionLabel?: string | null;
  defaultAssigneeId?: string | null;
  userNotes?: string | null;
  source?: string;
  confirmedAt?: string | null;
}

export interface IrrigationProfile extends PracticeProfile {
  method: string;
  decisionMaker: string;
}

export interface FertilisationProfile extends PracticeProfile {
  decisionMaker: string;
}

export interface GroundCoverProfile extends PracticeProfile {
  methods: string[];
}

export interface PestManagementProfile extends PracticeProfile {
  decisionApproach: string;
  trapStatus: string;
}

export interface AnalysisKindEntry {
  kind: string;
  lastPerformedYear?: number | null;
  datePrecision?: string | null;
}

export interface AnalysisProfile extends PracticeProfile {
  kinds: AnalysisKindEntry[];
}

export interface HarvestProfile extends PracticeProfile {
  expectedStartMonth?: number | null;
  organizer: string;
  needsMillBooking: string;
}

export interface DefaultAssignmentEntry {
  category: string;
  assigneeUserId?: string | null;
  isSelf: boolean;
}

export interface DefaultAssignments {
  entries: DefaultAssignmentEntry[];
}

export interface NotificationPreference {
  intensity: string;
  intensityLabel?: string;
  acceptedTaskReminderDaysBefore: number;
}

export interface ApproximateDate {
  year?: number | null;
  month?: number | null;
  day?: number | null;
  precision: string;
  precisionLabel?: string | null;
}

export interface CurrentYearDeclaredWork {
  category: string;
  templateCode?: string | null;
  resultYear: number;
  completion: string;
  approximateDate?: ApproximateDate | null;
  source: string;
}

export interface FieldWorkProfile {
  id?: string;
  fieldId?: string;
  resultYearCreated?: number;
  profileVersion?: number;
  onboardingVersion?: number;
  status?: FieldWorkProfileStatus | string;
  statusLabel?: string;
  productionPurpose?: string;
  productionPurposeLabel?: string;
  irrigation?: IrrigationProfile;
  pruning?: PracticeProfile;
  fertilisation?: FertilisationProfile;
  groundCover?: GroundCoverProfile;
  pestManagement?: PestManagementProfile;
  analysis?: AnalysisProfile;
  harvest?: HarvestProfile;
  defaultAssignments?: DefaultAssignments;
  notificationPreference?: NotificationPreference;
  currentYearDeclaredWork?: CurrentYearDeclaredWork[];
  completedAt?: string | null;
  completedByUserId?: string | null;
  lastReviewedAt?: string | null;
  createdByUserId?: string;
  updatedByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFieldWorkProfileInput {
  resultYearCreated?: number;
}

export interface UpdatePracticeProfileInput {
  preferenceMode?: string;
  frequencyType?: string;
  frequencyValue?: number | null;
  preferredMonths?: number[];
  lastPerformedYear?: number | null;
  lastPerformedMonth?: number | null;
  datePrecision?: string | null;
  defaultAssigneeId?: string | null;
  userNotes?: string | null;
  source?: string;
  confirmedAt?: string | null;
  clearFrequencyValue?: boolean;
  clearLastPerformedYear?: boolean;
  clearLastPerformedMonth?: boolean;
  clearDatePrecision?: boolean;
  clearDefaultAssigneeId?: boolean;
}

export interface UpdateIrrigationProfileInput extends UpdatePracticeProfileInput {
  method?: string;
  decisionMaker?: string;
}

export interface UpdateFertilisationProfileInput extends UpdatePracticeProfileInput {
  decisionMaker?: string;
}

export interface UpdateGroundCoverProfileInput extends UpdatePracticeProfileInput {
  methods?: string[];
}

export interface UpdatePestManagementProfileInput extends UpdatePracticeProfileInput {
  decisionApproach?: string;
  trapStatus?: string;
}

export interface UpdateAnalysisProfileInput extends UpdatePracticeProfileInput {
  kinds?: AnalysisKindEntry[];
}

export interface UpdateHarvestProfileInput extends UpdatePracticeProfileInput {
  expectedStartMonth?: number | null;
  organizer?: string;
  needsMillBooking?: string;
  clearExpectedStartMonth?: boolean;
}

export interface UpdateNotificationPreferenceInput {
  intensity?: string;
  acceptedTaskReminderDaysBefore?: number;
}

export interface UpdateFieldWorkProfileInput {
  productionPurpose?: string;
  irrigation?: UpdateIrrigationProfileInput;
  pruning?: UpdatePracticeProfileInput;
  fertilisation?: UpdateFertilisationProfileInput;
  groundCover?: UpdateGroundCoverProfileInput;
  pestManagement?: UpdatePestManagementProfileInput;
  analysis?: UpdateAnalysisProfileInput;
  harvest?: UpdateHarvestProfileInput;
  defaultAssignments?: DefaultAssignments;
  notificationPreference?: UpdateNotificationPreferenceInput;
  currentYearDeclaredWork?: CurrentYearDeclaredWork[];
}

export interface ActivateFieldWorkProfileInput {
  status?: string;
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

  /** Revert a just-started task with no checklist answers yet. */
  undoStartFieldTask: async (id: string): Promise<FieldTask> => {
    const response = await api.post<FieldTask>(`/api/v1/field-tasks/${id}/undo-start`);
    return response.data;
  },

  pauseFieldTask: async (
    id: string,
    body: { reason: string; plannedStart?: string; plannedEnd?: string }
  ): Promise<FieldTask> => {
    const response = await api.post<FieldTask>(`/api/v1/field-tasks/${id}/pause`, body);
    return response.data;
  },

  resumeFieldTask: async (id: string): Promise<FieldTask> => {
    const response = await api.post<FieldTask>(`/api/v1/field-tasks/${id}/resume`);
    return response.data;
  },

  rescheduleFieldTask: async (
    id: string,
    body: { plannedStart?: string; plannedEnd?: string }
  ): Promise<FieldTask> => {
    const response = await api.post<FieldTask>(`/api/v1/field-tasks/${id}/reschedule`, body);
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

  listPhenologyObservations: async (fieldId: string): Promise<FieldPhenologyObservation[]> => {
    const response = await api.get<FieldPhenologyObservation[]>(
      `/api/v1/fields/${fieldId}/phenology/observations`
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  getWorkProfile: async (fieldId: string): Promise<FieldWorkProfile | null> => {
    const response = await api.get<FieldWorkProfile | null>(`/api/v1/fields/${fieldId}/work-profile`);
    return response.data ?? null;
  },

  createWorkProfile: async (
    fieldId: string,
    body?: CreateFieldWorkProfileInput
  ): Promise<FieldWorkProfile> => {
    const response = await api.post<FieldWorkProfile>(
      `/api/v1/fields/${fieldId}/work-profile`,
      body ?? {}
    );
    return response.data;
  },

  updateWorkProfile: async (
    fieldId: string,
    body: UpdateFieldWorkProfileInput
  ): Promise<FieldWorkProfile> => {
    const response = await api.put<FieldWorkProfile>(
      `/api/v1/fields/${fieldId}/work-profile`,
      body
    );
    return response.data;
  },

  activateWorkProfile: async (
    fieldId: string,
    body?: ActivateFieldWorkProfileInput
  ): Promise<FieldWorkProfile> => {
    const response = await api.post<FieldWorkProfile>(
      `/api/v1/fields/${fieldId}/work-profile/activate`,
      body ?? {}
    );
    return response.data;
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
