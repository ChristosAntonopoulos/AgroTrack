import type {
  AcceptProposalInput,
  CompletionFrequencyChoice,
  CompletionLearningEvaluateResult,
  CopyFieldWorkProfileInput,
  CopyFieldWorkProfileResult,
  CreateFieldTaskInput,
  CreateFieldWorkProfileInput,
  DismissalLearningChoice,
  DismissalLearningEvaluateResult,
  FieldPhenology,
  FieldTask,
  FieldWorkLearningStatus,
  FieldWorkPlanPreview,
  FieldWorkProfile,
  TaskExecution,
  TaskProposal,
  UpdateFieldWorkProfileInput,
} from '../fieldWorkService';
import { demoStore } from '../demo/demoStore';
import { athensCalendarYear } from '../../utils/athensDate';
import { FIELD_WORK_TEMPLATE_META } from '../../data/fieldWorkCatalogueLabels';
import {
  DISMISSAL_PROMPT_THRESHOLD,
  isAnnualReviewDue,
  practiceKeyFromTemplate,
  resolveCompletionFrequencyUpdate,
  resolveDismissalPreferenceMode,
  shouldPromptCompletionFrequency,
  shouldPromptDismissalLearning,
} from '../../utils/fieldWorkLearning';

const nowIso = () => new Date().toISOString();

const emptyPractice = () => ({
  preferenceMode: 'unknown',
  preferenceModeLabel: 'Άγνωστο',
  frequencyType: 'unknown',
  frequencyTypeLabel: 'Άγνωστο',
  preferredMonths: [] as number[],
  source: 'unknown',
});

const createEmptyProfile = (fieldId: string, resultYear: number): FieldWorkProfile => ({
  id: `mock-profile-${fieldId}`,
  fieldId,
  resultYearCreated: resultYear,
  profileVersion: 1,
  onboardingVersion: 1,
  status: 'draft',
  statusLabel: 'Πρόχειρο',
  productionPurpose: 'unknown',
  productionPurposeLabel: 'Άγνωστο',
  irrigation: { ...emptyPractice(), method: 'unknown', decisionMaker: 'unknown' },
  pruning: emptyPractice(),
  fertilisation: { ...emptyPractice(), decisionMaker: 'unknown' },
  groundCover: { ...emptyPractice(), methods: [] },
  pestManagement: { ...emptyPractice(), decisionApproach: 'unknown', trapStatus: 'unknown' },
  analysis: { ...emptyPractice(), kinds: [] },
  harvest: {
    ...emptyPractice(),
    organizer: 'unknown',
    needsMillBooking: 'unknown',
  },
  defaultAssignments: { entries: [] },
  notificationPreference: {
    intensity: 'unknown',
    intensityLabel: 'Άγνωστο',
    acceptedTaskReminderDaysBefore: 3,
  },
  currentYearDeclaredWork: [],
  createdByUserId: 'mock-user',
  createdAt: nowIso(),
  updatedAt: nowIso(),
});

const mockProfiles = new Map<string, FieldWorkProfile>();

let mockProposals: TaskProposal[] = [
  {
    id: 'mock-proposal-1',
    fieldId: '',
    resultYear: new Date().getFullYear(),
    templateCode: 'T14',
    templateVersion: 1,
    sourceType: 'seasonal_baseline',
    sourceTypeLabel: 'Εποχική βάση',
    generatedAt: nowIso(),
    confidence: 'worth_checking',
    confidenceLabel: 'Χρειάζεται έλεγχο',
    reasonCodes: ['olive_fly_weekly_check'],
    explanation: 'Ήρθε η εβδομαδιαία ημερομηνία ελέγχου παγίδων δάκου.',
    greekExplanation: 'Ήρθε η εβδομαδιαία ημερομηνία ελέγχου παγίδων δάκου.',
    recommendedWindowStart: nowIso(),
    recommendedWindowEnd: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'active',
    statusLabel: 'Πρόταση',
  },
];

const mockCheck = (
  key: string,
  answered: boolean,
  sortOrder: number
): FieldTask['checklist'][number] => ({
  key,
  label: key,
  greekLabel: key,
  englishLabel: key,
  itemType: 'bool',
  requirement: 'required',
  isEssential: true,
  sortOrder,
  isAnswered: answered,
  attachmentIds: [],
  choices: [],
});

let mockTasks: FieldTask[] = [
  {
    id: 'mock-task-planned',
    fieldId: '',
    resultYear: athensCalendarYear(new Date()),
    templateCode: 'T18',
    title: 'Προκαταρκτική εκτίμηση συγκομιδής',
    status: 'planned',
    statusLabel: 'Προγραμματισμένη',
    plannedStart: `${athensCalendarYear(new Date())}-08-15`,
    plannedEnd: `${athensCalendarYear(new Date())}-10-01`,
    checklist: [mockCheck('a', false, 1), mockCheck('b', false, 2), mockCheck('c', false, 3)],
    additionalParticipantUserIds: [],
    assignmentResponse: 'pending',
    weatherSuitability: 'unknown',
    weatherSuitabilityLabel: 'Καλή ημέρα',
    attachmentIds: [],
    createdByUserId: 'mock-user',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: 'mock-task-active',
    fieldId: '',
    resultYear: athensCalendarYear(new Date()),
    templateCode: 'T19',
    title: 'Κράτηση συνεργείου και ελαιοτριβείου',
    status: 'in_progress',
    statusLabel: 'Σε εξέλιξη',
    plannedStart: `${athensCalendarYear(new Date())}-09-01`,
    plannedEnd: `${athensCalendarYear(new Date())}-09-20`,
    startedAt: `${athensCalendarYear(new Date())}-09-01T08:00:00Z`,
    checklist: [
      mockCheck('a', true, 1),
      mockCheck('b', true, 2),
      mockCheck('c', true, 3),
      mockCheck('d', false, 4),
      mockCheck('e', false, 5),
    ],
    additionalParticipantUserIds: [],
    assignmentResponse: 'accepted',
    weatherSuitability: 'good',
    weatherSuitabilityLabel: 'Καλή ημέρα',
    attachmentIds: [],
    createdByUserId: 'mock-user',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const ensureFieldIds = (fieldId?: string) => {
  demoStore.ensureSeeded();
  const resolved = fieldId || demoStore.getFields()[0]?.id || '';
  if (!resolved) return;
  mockProposals = mockProposals.map((p) => (p.fieldId ? p : { ...p, fieldId: resolved }));
  mockTasks = mockTasks.map((task) => (task.fieldId ? task : { ...task, fieldId: resolved }));
};

const mergePractice = <T extends object>(
  current: T,
  patch?: Record<string, unknown> | null
): T => {
  if (!patch) return current;
  const next: Record<string, unknown> = { ...(current as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    if (key.startsWith('clear') && value === true) {
      const field = key.replace(/^clear/, '');
      const camel = field.charAt(0).toLowerCase() + field.slice(1);
      next[camel] = null;
      continue;
    }
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next as T;
};

export const mockFieldWorkService = {
  listProposals: async (params?: { fieldId?: string; resultYear?: number }) => {
    ensureFieldIds(params?.fieldId);
    return mockProposals.filter((p) => {
      if (params?.fieldId && p.fieldId && p.fieldId !== params.fieldId) return false;
      if (params?.resultYear && p.resultYear !== params.resultYear) return false;
      return p.status === 'active' || p.status === 'snoozed';
    });
  },

  evaluateFieldProposals: async (fieldId: string) => {
    ensureFieldIds(fieldId);
    return mockFieldWorkService.listProposals({ fieldId });
  },

  acceptProposal: async (id: string, body?: AcceptProposalInput) => {
    const proposal = mockProposals.find((p) => p.id === id);
    if (!proposal) throw new Error('Proposal not found');
    const task = await mockFieldWorkService.createFieldTask({
      fieldId: proposal.fieldId,
      title:
        FIELD_WORK_TEMPLATE_META[proposal.templateCode]?.el ||
        proposal.greekExplanation ||
        proposal.explanation,
      templateCode: proposal.templateCode,
      plannedStart: body?.plannedStart,
      plannedEnd: body?.plannedEnd,
      assignedUserId: body?.assignedUserId,
      assignedCollaboratorId: body?.assignedCollaboratorId,
      notes: body?.notes,
      resultYear: body?.resultYear ?? proposal.resultYear,
    });
    proposal.status = 'accepted';
    proposal.statusLabel = 'Αποδεκτή';
    proposal.acceptedTaskId = task.id;
    return proposal;
  },

  snoozeProposal: async (id: string, until?: string) => {
    const proposal = mockProposals.find((p) => p.id === id);
    if (!proposal) throw new Error('Proposal not found');
    proposal.status = 'snoozed';
    proposal.statusLabel = 'Αναβλήθηκε';
    proposal.snoozeUntil = until;
    return proposal;
  },

  dismissProposal: async (
    id: string,
    decision: 'not_for_this_field' | 'dismiss_for_year' = 'dismiss_for_year'
  ) => {
    const proposal = mockProposals.find((p) => p.id === id);
    if (!proposal) throw new Error('Proposal not found');
    proposal.status =
      decision === 'not_for_this_field' ? 'dismissed_for_field' : 'dismissed_for_year';
    proposal.statusLabel = decision === 'not_for_this_field' ? 'Όχι για το χωράφι' : 'Όχι φέτος';
    return proposal;
  },

  listFieldTasks: async (params?: { fieldId?: string; resultYear?: number; status?: string }) => {
    ensureFieldIds(params?.fieldId);
    return mockTasks.filter((t) => {
      if (params?.fieldId && t.fieldId !== params.fieldId) return false;
      if (params?.resultYear && t.resultYear !== params.resultYear) return false;
      if (params?.status && t.status !== params.status) return false;
      return true;
    });
  },

  getFieldTask: async (id: string) => {
    const task = mockTasks.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');
    return task;
  },

  createFieldTask: async (input: CreateFieldTaskInput) => {
    const task: FieldTask = {
      id: `mock-task-${Date.now()}`,
      fieldId: input.fieldId,
      resultYear: input.resultYear ?? athensCalendarYear(new Date()),
      templateCode: input.templateCode,
      title: input.title,
      description: input.description,
      status: 'planned',
      statusLabel: 'Προγραμματισμένη',
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      preferredTimeWindow: input.preferredTimeWindow,
      assignedUserId: input.assignedUserId,
      assignedCollaboratorId: input.assignedCollaboratorId,
      additionalParticipantUserIds: [],
      assignmentResponse: 'pending',
      checklist: [],
      estimatedCost: input.estimatedCost,
      notes: input.notes,
      attachmentIds: [],
      relatedHarvestId: input.relatedHarvestId,
      weatherSuitability: 'unknown',
      weatherSuitabilityLabel: 'Άγνωστο',
      createdByUserId: 'mock-user',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    mockTasks = [task, ...mockTasks];
    return task;
  },

  startFieldTask: async (id: string) => {
    const task = await mockFieldWorkService.getFieldTask(id);
    task.status = 'in_progress';
    task.statusLabel = 'Σε εξέλιξη';
    task.updatedAt = nowIso();
    return task;
  },

  completeFieldTask: async (
    id: string,
    body?: {
      outcome?: string;
      notes?: string;
      checklistAnswers?: Array<{
        key: string;
        textValue?: string;
        numberValue?: number;
        boolValue?: boolean;
      }>;
      createFollowUpForRemainder?: boolean;
    }
  ) => {
    const task = await mockFieldWorkService.getFieldTask(id);
    task.status = 'completed';
    task.statusLabel = 'Ολοκληρώθηκε';
    task.updatedAt = nowIso();
    let followUpTaskId: string | undefined;
    if (body?.createFollowUpForRemainder) {
      const followUp = await mockFieldWorkService.createFieldTask({
        fieldId: task.fieldId,
        title: `${task.title} (υπόλοιπο)`,
        templateCode: task.templateCode,
        resultYear: task.resultYear,
      });
      followUpTaskId = followUp.id;
    }
    const execution: TaskExecution = {
      id: `mock-exec-${Date.now()}`,
      taskId: task.id,
      fieldId: task.fieldId,
      resultYear: task.resultYear,
      completedAt: nowIso(),
      outcome: body?.outcome || 'completed',
      outcomeLabel: body?.outcome === 'partial' ? 'Μερικώς' : 'Ολοκληρώθηκε',
      completedByUserIds: ['mock-user'],
      attachmentIds: [],
      followUpRequired: Boolean(followUpTaskId),
      followUpTaskId,
      notes: body?.notes,
    };
    task.latestExecutionId = execution.id;
    return execution;
  },

  undoCompletion: async (executionId: string) => {
    const task = mockTasks.find((t) => t.latestExecutionId === executionId);
    if (!task) throw new Error('Execution not found');
    task.status = 'in_progress';
    task.statusLabel = 'Σε εξέλιξη';
    task.latestExecutionId = undefined;
    task.updatedAt = nowIso();
    return task;
  },

  cancelFieldTask: async (id: string) => {
    const task = await mockFieldWorkService.getFieldTask(id);
    task.status = 'cancelled';
    task.statusLabel = 'Ακυρώθηκε';
    return task;
  },

  assignFieldTask: async (
    id: string,
    body: { assignedUserId?: string; assignedCollaboratorId?: string }
  ) => {
    const task = await mockFieldWorkService.getFieldTask(id);
    task.assignedUserId = body.assignedUserId;
    task.assignedCollaboratorId = body.assignedCollaboratorId;
    return task;
  },

  getTaskPlan: async (fieldId: string, year: number) => ({
    fieldId,
    resultYear: year,
    evaluatedAt: nowIso(),
    catalogue: [],
    proposals: await mockFieldWorkService.listProposals({ fieldId, resultYear: year }),
    tasks: await mockFieldWorkService.listFieldTasks({ fieldId, resultYear: year }),
    inWindowTemplateCodes: [],
  }),

  getPhenology: async (fieldId: string): Promise<FieldPhenology> => ({
    fieldId,
    isKnown: false,
    stageCode: 'unknown',
    stageLabel: '',
    message: 'Δεν γνωρίζουμε ακόμη το στάδιο του ελαιώνα.',
  }),

  getWorkProfile: async (fieldId: string): Promise<FieldWorkProfile | null> =>
    mockProfiles.get(fieldId) ?? null,

  createWorkProfile: async (
    fieldId: string,
    body?: CreateFieldWorkProfileInput
  ): Promise<FieldWorkProfile> => {
    if (mockProfiles.has(fieldId)) {
      throw new Error('Profile already exists');
    }
    const profile = createEmptyProfile(
      fieldId,
      body?.resultYearCreated ?? athensCalendarYear(new Date())
    );
    mockProfiles.set(fieldId, profile);
    return profile;
  },

  updateWorkProfile: async (
    fieldId: string,
    body: UpdateFieldWorkProfileInput
  ): Promise<FieldWorkProfile> => {
    const current = mockProfiles.get(fieldId);
    if (!current) throw new Error('Profile not found');
    const next: FieldWorkProfile = {
      ...current,
      productionPurpose: body.productionPurpose ?? current.productionPurpose,
      irrigation: mergePractice(
        current.irrigation,
        body.irrigation as Record<string, unknown> | undefined
      ),
      pruning: mergePractice(
        current.pruning,
        body.pruning as Record<string, unknown> | undefined
      ),
      fertilisation: mergePractice(
        current.fertilisation,
        body.fertilisation as Record<string, unknown> | undefined
      ),
      groundCover: mergePractice(
        current.groundCover,
        body.groundCover as Record<string, unknown> | undefined
      ),
      pestManagement: mergePractice(
        current.pestManagement,
        body.pestManagement as Record<string, unknown> | undefined
      ),
      analysis: mergePractice(
        current.analysis,
        body.analysis as Record<string, unknown> | undefined
      ),
      harvest: mergePractice(
        current.harvest,
        body.harvest as Record<string, unknown> | undefined
      ),
      defaultAssignments: body.defaultAssignments ?? current.defaultAssignments,
      notificationPreference: body.notificationPreference
        ? {
            ...current.notificationPreference,
            ...body.notificationPreference,
            intensityLabel:
              body.notificationPreference.intensity ??
              current.notificationPreference.intensityLabel,
          }
        : current.notificationPreference,
      currentYearDeclaredWork:
        body.currentYearDeclaredWork ?? current.currentYearDeclaredWork,
      profileVersion: current.profileVersion + 1,
      updatedAt: nowIso(),
    };
    mockProfiles.set(fieldId, next);
    return next;
  },

  activateWorkProfile: async (fieldId: string): Promise<FieldWorkProfile> => {
    const current = mockProfiles.get(fieldId);
    if (!current) throw new Error('Profile not found');
    const next: FieldWorkProfile = {
      ...current,
      status: 'active',
      statusLabel: 'Ενεργό',
      completedAt: nowIso(),
      lastReviewedAt: nowIso(),
      profileVersion: current.profileVersion + 1,
      updatedAt: nowIso(),
    };
    mockProfiles.set(fieldId, next);
    return next;
  },

  getPlanPreview: async (fieldId: string, year?: number): Promise<FieldWorkPlanPreview> => {
    const current = mockProfiles.get(fieldId);
    if (!current) throw new Error('Profile not found');
    const resultYear = year ?? current.resultYearCreated;
    const windowFor = (start: string, end: string) => ({
      windowStart: `${resultYear}-${start}`,
      windowEnd: end.startsWith('01-') ? `${resultYear + 1}-${end}` : `${resultYear}-${end}`,
    });
    const enabled = Object.entries(FIELD_WORK_TEMPLATE_META)
      .slice(0, 8)
      .map(([code, meta]) => ({
        templateCode: code,
        templateName: meta.el,
        eligibilityStatus: 'enabled',
        reasonCode: 'mock_enabled',
        reason: 'Ταιριάζει με τις απαντήσεις σας για φέτος.',
        practiceCategory: meta.category === 'ground' ? 'ground_cover' : meta.category,
        ...windowFor(
          code === 'T01' ? '01-01' : code === 'T06' ? '02-15' : '03-01',
          code === 'T01' ? '01-31' : code === 'T06' ? '04-15' : '05-31'
        ),
      }));
    const askFirst =
      current.irrigation.preferenceMode === 'ask_first'
        ? [
            {
              templateCode: 'T15',
              templateName: FIELD_WORK_TEMPLATE_META.T15.el,
              eligibilityStatus: 'ask_first',
              reasonCode: 'irrigation_ask_first',
              reason: 'Θα ρωτήσουμε πριν προτείνουμε πότισμα.',
              practiceCategory: 'irrigation',
              ...windowFor('06-01', '08-31'),
            },
          ]
        : [];
    const suppressed =
      current.pruning.preferenceMode === 'disabled'
        ? [
            {
              templateCode: 'T06',
              templateName: FIELD_WORK_TEMPLATE_META.T06.el,
              eligibilityStatus: 'suppressed',
              reasonCode: 'pruning_disabled',
              reason: 'Οι συνήθεις προτάσεις κλαδέματος είναι απενεργοποιημένες.',
              practiceCategory: 'pruning',
              ...windowFor('02-15', '04-15'),
            },
          ]
        : [];

    return {
      fieldId,
      resultYear,
      profileStatus: current.status,
      usedDraftAsPreview: current.status === 'draft',
      enabledCount: enabled.length,
      askFirstCount: askFirst.length,
      suppressedCount: suppressed.length,
      enabled,
      askFirst,
      suppressed,
    };
  },

  copyWorkProfile: async (
    fieldId: string,
    body: CopyFieldWorkProfileInput
  ): Promise<CopyFieldWorkProfileResult> => {
    const source = mockProfiles.get(fieldId);
    if (!source) {
      throw new Error('Profile not found');
    }
    const results = body.targetFieldIds.map((targetId) => {
      if (targetId === fieldId) {
        return {
          fieldId: targetId,
          success: false,
          errorCode: 'same_field',
          errorMessage: 'Cannot copy to the same field.',
          skippedAssignmentUserIds: [] as string[],
        };
      }
      const clone: FieldWorkProfile = {
        ...JSON.parse(JSON.stringify(source)),
        id: `mock-profile-${targetId}`,
        fieldId: targetId,
        status: 'draft',
        statusLabel: 'Πρόχειρο',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        completedAt: null,
        completedByUserId: null,
      };
      if (!body.copyIrrigation) {
        clone.irrigation = {
          ...emptyPractice(),
          method: 'unknown',
          decisionMaker: 'unknown',
        };
      }
      if (!body.copyLastPerformed) {
        const clearLast = <T extends { lastPerformedYear?: number | null; lastPerformedMonth?: number | null }>(
          p: T
        ): T => ({ ...p, lastPerformedYear: null, lastPerformedMonth: null });
        clone.pruning = clearLast(clone.pruning);
        clone.fertilisation = clearLast(clone.fertilisation);
        clone.groundCover = clearLast(clone.groundCover);
        clone.pestManagement = clearLast(clone.pestManagement);
        clone.analysis = clearLast(clone.analysis);
        clone.harvest = clearLast(clone.harvest);
        if (body.copyIrrigation) {
          clone.irrigation = clearLast(clone.irrigation);
        }
      }
      if (!body.copyAssignments) {
        clone.defaultAssignments = { entries: [] };
      }
      mockProfiles.set(targetId, clone);
      return {
        fieldId: targetId,
        success: true,
        profileId: clone.id,
        profileStatus: clone.status,
        skippedAssignmentUserIds: [] as string[],
      };
    });
    return { sourceFieldId: fieldId, results };
  },

  getLearningStatus: async (fieldId: string): Promise<FieldWorkLearningStatus> => {
    const profile = mockProfiles.get(fieldId);
    if (!profile) throw new Error('Profile not found');
    return {
      annualReviewDue: isAnnualReviewDue(profile.lastReviewedAt),
      lastReviewedAt: profile.lastReviewedAt,
      onboardingVersion: profile.onboardingVersion,
      currentOnboardingVersion: 1,
      hasIncrementalQuestions: false,
      pendingIncrementalQuestionIds: [],
      incrementalOnboardingNote:
        'Bump CurrentOnboardingVersion and register new question ids; ask only new questions.',
    };
  },

  evaluateDismissalLearning: async (
    fieldId: string,
    templateCode: string
  ): Promise<DismissalLearningEvaluateResult> => {
    const code = templateCode.toUpperCase();
    const dismissCount = mockProposals.filter(
      (p) =>
        p.fieldId === fieldId &&
        p.templateCode === code &&
        (p.status === 'dismissed_for_field' || p.status === 'dismissed_for_year')
    ).length;
    const profile = mockProfiles.get(fieldId);
    const practice = practiceKeyFromTemplate(code);
    const mode =
      practice === 'pruning'
        ? profile?.pruning.preferenceMode
        : practice === 'ground_cover'
          ? profile?.groundCover.preferenceMode
          : 'unknown';
    return {
      shouldPrompt: shouldPromptDismissalLearning(dismissCount),
      dismissCount,
      threshold: DISMISSAL_PROMPT_THRESHOLD,
      templateCode: code,
      practiceCategory: practice,
      currentPreferenceMode: mode || 'unknown',
      promptMessage: 'Δεν θέλεις να προτείνουμε αυτή την εργασία για το χωράφι;',
    };
  },

  applyDismissalLearning: async (
    fieldId: string,
    templateCode: string,
    choice: DismissalLearningChoice
  ): Promise<FieldWorkProfile> => {
    const profile = mockProfiles.get(fieldId);
    if (!profile || profile.status !== 'active') throw new Error('Active profile required');
    const practice = practiceKeyFromTemplate(templateCode);
    const next = resolveDismissalPreferenceMode(choice, profile.pruning.preferenceMode);
    const patch = (p: FieldWorkProfile['pruning']) => ({
      ...p,
      preferenceMode: next,
      preferenceModeLabel: next,
      source: 'learned_from_behaviour',
      confirmedAt: nowIso(),
    });
    if (practice === 'pruning') profile.pruning = patch(profile.pruning);
    if (practice === 'ground_cover') {
      profile.groundCover = { ...patch(profile.groundCover), methods: profile.groundCover.methods };
    }
    if (practice === 'irrigation') {
      profile.irrigation = {
        ...patch(profile.irrigation),
        method: profile.irrigation.method,
        decisionMaker: profile.irrigation.decisionMaker,
      };
    }
    if (practice === 'fertilisation') {
      profile.fertilisation = {
        ...patch(profile.fertilisation),
        decisionMaker: profile.fertilisation.decisionMaker,
      };
    }
    if (practice === 'pest') {
      profile.pestManagement = {
        ...patch(profile.pestManagement),
        decisionApproach: profile.pestManagement.decisionApproach,
        trapStatus: profile.pestManagement.trapStatus,
      };
    }
    if (practice === 'harvest') {
      profile.harvest = {
        ...patch(profile.harvest),
        organizer: profile.harvest.organizer,
        needsMillBooking: profile.harvest.needsMillBooking,
      };
    }
    profile.updatedAt = nowIso();
    profile.updatedByUserId = 'mock-user';
    profile.profileVersion += 1;
    mockProfiles.set(fieldId, profile);
    return profile;
  },

  evaluateCompletionLearning: async (
    fieldId: string,
    body: { templateCode: string; outcome?: string; resultYear?: number }
  ): Promise<CompletionLearningEvaluateResult> => {
    const year = body.resultYear ?? athensCalendarYear(new Date());
    const shouldPrompt = shouldPromptCompletionFrequency(body.templateCode, body.outcome);
    return {
      shouldPrompt,
      templateCode: body.templateCode.toUpperCase(),
      practiceCategory: practiceKeyFromTemplate(body.templateCode),
      resultYear: year,
      suggestNextYear: year + 2,
      promptMessage: shouldPrompt
        ? `Το κλάδεμα καταγράφηκε για το ${year}. Να το ξαναπροτείνουμε το ${year + 2};`
        : '',
    };
  },

  applyCompletionLearning: async (
    fieldId: string,
    body: { templateCode: string; resultYear: number; choice: CompletionFrequencyChoice }
  ): Promise<FieldWorkProfile> => {
    const profile = mockProfiles.get(fieldId);
    if (!profile || profile.status !== 'active') throw new Error('Active profile required');
    const update = resolveCompletionFrequencyUpdate(body.choice, body.resultYear);
    if (!update) return profile;
    profile.pruning = {
      ...profile.pruning,
      lastPerformedYear: update.lastPerformedYear,
      frequencyType: update.frequencyType,
      frequencyTypeLabel: update.frequencyType,
      frequencyValue: update.frequencyValue,
      source: 'learned_from_behaviour',
      confirmedAt: nowIso(),
    };
    profile.updatedAt = nowIso();
    profile.updatedByUserId = 'mock-user';
    profile.profileVersion += 1;
    mockProfiles.set(fieldId, profile);
    return profile;
  },

  markWorkProfileReviewed: async (fieldId: string): Promise<FieldWorkProfile> => {
    const profile = mockProfiles.get(fieldId);
    if (!profile || profile.status !== 'active') throw new Error('Active profile required');
    profile.lastReviewedAt = nowIso();
    profile.updatedAt = nowIso();
    profile.updatedByUserId = 'mock-user';
    profile.profileVersion += 1;
    mockProfiles.set(fieldId, profile);
    return profile;
  },
};
