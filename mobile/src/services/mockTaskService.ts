import type {
  CreateTaskInput,
  CreateWorkRecordInput,
  PatchTaskInput,
  Task,
  TaskListView,
  TaskSuggestion,
  TaskTimingBucket,
  WorkRecord,
} from './taskService';
import { CURATED_TASK_TEMPLATE_CODES } from './taskService';
import { templateTitle } from '../data/fieldWorkCatalogueLabels';

let mockTasks: Task[] = [];
let mockDismissals = new Set<string>();
let mockWorkRecords: WorkRecord[] = [];

const nowIso = () => new Date().toISOString();

const dismissalKey = (fieldId: string, templateCode: string, year?: number) =>
  `${fieldId}:${templateCode}:${year ?? ''}`;

const toTask = (input: CreateTaskInput, id: string): Task => {
  const bucket = (input.timingBucket || 'later') as TaskTimingBucket;
  return {
    id,
    fieldId: input.fieldId,
    resultYear: input.resultYear || new Date().getFullYear(),
    ownerId: 'mock-owner',
    title: input.title,
    description: input.description,
    status: 'planned',
    statusLabel: 'Προγραμματισμένη',
    source: input.templateCode ? 'template' : 'custom',
    templateCode: input.templateCode,
    timingBucket: bucket,
    scheduledFor: input.scheduledFor || input.plannedStart,
    plannedStart: input.plannedStart || input.scheduledFor,
    plannedEnd: input.plannedEnd,
    assigneeId: input.assigneeId || input.assignedUserId,
    assignedUserId: input.assignedUserId,
    assignedCollaboratorId: input.assignedCollaboratorId,
    note: input.note,
    notes: input.notes || input.note,
    recurrence: input.recurrence,
    checklist: [],
    createdByUserId: 'mock-owner',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
};

const isTodayOrOverdue = (task: Task, today: Date): boolean => {
  const raw = task.scheduledFor || task.plannedStart;
  if (!raw) return String(task.timingBucket) === 'today';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(task.timingBucket) === 'today';
  return date <= today;
};

const isUpcoming = (task: Task, today: Date): boolean => {
  const raw = task.scheduledFor || task.plannedStart;
  if (!raw) {
    const bucket = String(task.timingBucket);
    return bucket === 'tomorrow' || bucket === 'thisWeek' || bucket === 'later';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return true;
  return date > today;
};

export const mockTaskService = {
  listTasks: async (params?: { view?: TaskListView | string; fieldId?: string }): Promise<Task[]> => {
    const view = (params?.view || 'today').toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let items = mockTasks.filter((task) => {
      if (params?.fieldId && task.fieldId !== params.fieldId) return false;
      return true;
    });
    if (view === 'done') {
      return items
        .filter((t) => t.status === 'done' || t.status === 'skipped')
        .sort((a, b) => (b.completedAt || b.skippedAt || b.updatedAt).localeCompare(a.completedAt || a.skippedAt || a.updatedAt));
    }
    items = items.filter((t) => t.status === 'planned');
    if (view === 'today') return items.filter((t) => isTodayOrOverdue(t, today));
    if (view === 'upcoming') return items.filter((t) => isUpcoming(t, today));
    return items;
  },

  getTask: async (id: string): Promise<Task> => {
    const task = mockTasks.find((item) => item.id === id);
    if (!task) throw new Error('Task not found');
    return { ...task };
  },

  createTask: async (input: CreateTaskInput): Promise<Task> => {
    const task = toTask(input, `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    mockTasks = [task, ...mockTasks];
    return { ...task };
  },

  patchTask: async (id: string, input: PatchTaskInput): Promise<Task> => {
    const index = mockTasks.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Task not found');
    const next = {
      ...mockTasks[index],
      ...input,
      notes: input.notes ?? input.note ?? mockTasks[index].notes,
      updatedAt: nowIso(),
    };
    mockTasks[index] = next;
    return { ...next };
  },

  completeTask: async (id: string): Promise<Task> => {
    const index = mockTasks.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Task not found');
    const next = {
      ...mockTasks[index],
      status: 'done' as const,
      statusLabel: 'Ολοκληρώθηκε',
      completedAt: nowIso(),
      updatedAt: nowIso(),
    };
    mockTasks[index] = next;
    return { ...next };
  },

  skipTask: async (id: string, reason?: string): Promise<Task> => {
    const index = mockTasks.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Task not found');
    const next = {
      ...mockTasks[index],
      status: 'skipped' as const,
      statusLabel: 'Παραλείφθηκε',
      skippedAt: nowIso(),
      skippedReason: reason,
      updatedAt: nowIso(),
    };
    mockTasks[index] = next;
    return { ...next };
  },

  linkWorkRecord: async (id: string, workRecordId: string): Promise<Task> => {
    const index = mockTasks.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Task not found');
    const next = { ...mockTasks[index], linkedWorkRecordId: workRecordId, updatedAt: nowIso() };
    mockTasks[index] = next;
    return { ...next };
  },

  undoComplete: async (id: string): Promise<Task> => {
    const index = mockTasks.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Task not found');
    const next = {
      ...mockTasks[index],
      status: 'planned' as const,
      statusLabel: 'Προγραμματισμένη',
      completedAt: undefined,
      completedByUserId: undefined,
      linkedWorkRecordId: undefined,
      updatedAt: nowIso(),
    };
    mockTasks[index] = next;
    return { ...next };
  },

  listSuggestions: async (params: {
    fieldId: string;
    date?: string;
  }): Promise<TaskSuggestion[]> => {
    const year = new Date().getFullYear();
    return CURATED_TASK_TEMPLATE_CODES.slice(0, 3)
      .filter((code) => !mockDismissals.has(dismissalKey(params.fieldId, code, year)))
      .map((code) => ({
        templateCode: code,
        title: templateTitle(code, 'el'),
        fieldId: params.fieldId,
        resultYear: year,
        whyNow: 'Εποχική υπενθύμιση για αυτή την περίοδο.',
        category: 'seasonal',
        confidence: 'seasonal_reminder',
      }));
  },

  dismissSuggestion: async (input: {
    fieldId: string;
    templateCode: string;
    resultYear?: number;
  }): Promise<void> => {
    mockDismissals.add(dismissalKey(input.fieldId, input.templateCode, input.resultYear));
  },

  createWorkRecord: async (input: CreateWorkRecordInput): Promise<WorkRecord> => {
    const record: WorkRecord = {
      id: `wr-${Date.now()}`,
      linkedTaskId: input.linkedTaskId,
      taskId: input.linkedTaskId,
      fieldId: input.fieldId,
      resultYear: input.resultYear || new Date().getFullYear(),
      ownerId: 'mock-owner',
      title: input.title,
      templateCode: input.templateCode,
      startedAt: input.startedAt,
      completedAt: input.completedAt || nowIso(),
      outcome: 'completed',
      outcomeLabel: 'Ολοκληρώθηκε',
      completedByUserIds: ['mock-owner'],
      notes: input.notes,
      attachmentIds: input.attachmentIds || [],
      recordedByUserId: 'mock-owner',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      matchingPlannedTasks: [],
    };
    mockWorkRecords = [record, ...mockWorkRecords];
    if (input.linkedTaskId) {
      const index = mockTasks.findIndex((item) => item.id === input.linkedTaskId);
      if (index >= 0) {
        mockTasks[index] = {
          ...mockTasks[index],
          status: 'done',
          linkedWorkRecordId: record.id,
          completedAt: record.completedAt,
          updatedAt: nowIso(),
        };
      }
    }
    return { ...record };
  },
};
