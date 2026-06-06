import { Field } from '../fieldService';
import { Task } from '../taskService';
import { User } from '../userService';
import { mockFields, mockTasks, mockUsers } from '../mock/mockData';

export type DemoAssignmentMap = Record<string, string[]>; // fieldId -> producer userIds

export type DemoTaskApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export type DemoTask = Task & {
  approvalStatus?: DemoTaskApprovalStatus;
  approvalNote?: string;
};

export type DemoEventType =
  | 'task_status_changed'
  | 'evidence_added'
  | 'task_assigned'
  | 'task_approved'
  | 'task_rejected'
  | 'producer_assigned'
  | 'producer_unassigned';

export type DemoEvent = {
  id: string;
  type: DemoEventType;
  timestamp: string;
  fieldId: string;
  taskId?: string;
  actorUserId?: string;
  message: string;
};

export type DemoStepKey =
  | 'producer_visit_today'
  | 'producer_start_task'
  | 'producer_add_evidence'
  | 'owner_visit_calendar'
  | 'owner_schedule_template'
  | 'owner_view_timeline';

export type DemoProgress = {
  dismissed: boolean;
  steps: Record<DemoStepKey, boolean>;
};

export type DemoIssueType = 'Leak' | 'Pest' | 'Damage' | 'Equipment';
export type DemoIssueSeverity = 'Low' | 'Medium' | 'High';
export type DemoIssueStatus = 'Open' | 'InProgress' | 'Resolved';

export type DemoIssue = {
  id: string;
  fieldId: string;
  type: DemoIssueType;
  severity: DemoIssueSeverity;
  title: string;
  description: string;
  photoUrls: string[];
  createdAt: string;
  createdByUserId: string;
  status: DemoIssueStatus;
};

export type DemoFieldUiTab = 'board' | 'timeline' | 'evidence';

export type DemoFieldUiPrefs = {
  fieldDetailTab?: DemoFieldUiTab;
};

type DemoState = {
  schemaVersion: number;
  seededAt: string;
  users: User[];
  fields: Field[];
  tasks: DemoTask[];
  assignments: DemoAssignmentMap;
  events: DemoEvent[];
  demoProgressByUserId: Record<string, DemoProgress>;
  issues: DemoIssue[];
  routeStateByUserId: Record<string, DemoRouteState>;
  fieldUiPrefsByUserId: Record<string, DemoFieldUiPrefs>;
};

const STORAGE_KEY = 'agrotrack_demo_state_v1';
const SCHEMA_VERSION = 8;

export type DemoRouteState = {
  active: boolean;
  currentIndex: number;
  completedFieldIds: string[];
  startedAt?: string;
};

const defaultProgressForRole = (role: string): DemoProgress => {
  const base: DemoProgress = {
    dismissed: false,
    steps: {
      producer_visit_today: false,
      producer_start_task: false,
      producer_add_evidence: false,
      owner_visit_calendar: false,
      owner_schedule_template: false,
      owner_view_timeline: false,
    },
  };

  // Keep all keys for simplicity; UI will show only relevant ones.
  return base;
};

const safeParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const computeDefaultAssignments = (tasks: Task[]): DemoAssignmentMap => {
  const map: DemoAssignmentMap = {};
  for (const t of tasks) {
    if (!t.assignedTo) continue;
    if (!map[t.fieldId]) map[t.fieldId] = [];
    if (!map[t.fieldId].includes(t.assignedTo)) map[t.fieldId].push(t.assignedTo);
  }
  return map;
};

const seedState = (): DemoState => {
  const seededAt = new Date().toISOString();
  const assignments = computeDefaultAssignments(mockTasks);

  // Ensure tasks have deterministic approval defaults.
  const tasksWithApprovals: DemoTask[] = mockTasks.map((t) => {
    const needsApproval = t.status === 'completed' && !!t.assignedTo;
    return {
      ...t,
      approvalStatus: needsApproval ? 'pending' : 'not_required',
    };
  });

  const events: DemoEvent[] = [];
  const pushEvent = (e: Omit<DemoEvent, 'id'>) => {
    events.push({ id: `ev-${events.length + 1}`, ...e });
  };

  // Seed events for demo realism.
  for (const t of tasksWithApprovals) {
    if (t.status === 'completed') {
      pushEvent({
        type: 'task_status_changed',
        timestamp: t.actualEnd || t.updatedAt,
        fieldId: t.fieldId,
        taskId: t.id,
        actorUserId: t.assignedTo,
        message: `Task completed: ${t.title}`,
      });
      if (t.approvalStatus === 'pending') {
        pushEvent({
          type: 'task_status_changed',
          timestamp: t.updatedAt,
          fieldId: t.fieldId,
          taskId: t.id,
          actorUserId: t.assignedTo,
          message: `Awaiting owner approval: ${t.title}`,
        });
      }
    } else if (t.status === 'in_progress') {
      pushEvent({
        type: 'task_status_changed',
        timestamp: t.actualStart || t.updatedAt,
        fieldId: t.fieldId,
        taskId: t.id,
        actorUserId: t.assignedTo,
        message: `Task started: ${t.title}`,
      });
    }
    if ((t.evidence || []).length > 0) {
      pushEvent({
        type: 'evidence_added',
        timestamp: t.evidence[t.evidence.length - 1].timestamp,
        fieldId: t.fieldId,
        taskId: t.id,
        actorUserId: t.assignedTo,
        message: `Evidence added for: ${t.title}`,
      });
    }
  }

  Object.entries(assignments).forEach(([fieldId, producerIds]) => {
    producerIds.forEach((pid) => {
      pushEvent({
        type: 'producer_assigned',
        timestamp: seededAt,
        fieldId,
        actorUserId: 'user1',
        message: `Producer assigned to field: ${pid}`,
      });
    });
  });

  const issues: DemoIssue[] = [
    {
      id: 'issue-1',
      fieldId: 'field2',
      type: 'Leak',
      severity: 'High',
      title: 'Main irrigation line leak near valve box',
      description: 'Standing water observed and pressure drop across zones. Needs inspection today.',
      photoUrls: ['/demo-images/olive-harvest.jpg'],
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      createdByUserId: 'user2',
      status: 'Open',
    },
    {
      id: 'issue-2',
      fieldId: 'field1',
      type: 'Pest',
      severity: 'Medium',
      title: 'Possible olive fruit fly hotspots',
      description: 'Noticed damaged fruit on north edge; recommend targeted scouting and traps.',
      photoUrls: ['/demo-images/olive-branch.jpg'],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdByUserId: 'user2',
      status: 'InProgress',
    },
  ];

  issues.forEach((iss) => {
    pushEvent({
      type: 'task_status_changed',
      timestamp: iss.createdAt,
      fieldId: iss.fieldId,
      actorUserId: iss.createdByUserId,
      message: `Issue reported (${iss.severity} ${iss.type}): ${iss.title}`,
    });
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    seededAt,
    users: [...mockUsers],
    fields: [...mockFields],
    tasks: tasksWithApprovals,
    assignments,
    events,
    demoProgressByUserId: {},
    issues,
    routeStateByUserId: {},
    fieldUiPrefsByUserId: {},
  };
};

const loadState = (): DemoState => {
  const parsed = safeParse<DemoState>(localStorage.getItem(STORAGE_KEY));
  if (!parsed) {
    const seeded = seedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  // Lightweight migrations to avoid wiping demo state.
  if ((parsed as any).schemaVersion === 2) {
    const upgraded: DemoState = {
      ...(parsed as any),
      schemaVersion: SCHEMA_VERSION,
      demoProgressByUserId: {},
      issues: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
    return upgraded;
  }

  if ((parsed as any).schemaVersion === 3) {
    const upgraded: DemoState = {
      ...(parsed as any),
      schemaVersion: SCHEMA_VERSION,
      issues: [],
      routeStateByUserId: {},
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
    return upgraded;
  }

  if ((parsed as any).schemaVersion === 4) {
    const upgraded: DemoState = {
      ...(parsed as any),
      schemaVersion: SCHEMA_VERSION,
      routeStateByUserId: {},
      fieldUiPrefsByUserId: {},
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
    return upgraded;
  }

  if ((parsed as any).schemaVersion === 5) {
    const upgraded: DemoState = {
      ...(parsed as any),
      schemaVersion: SCHEMA_VERSION,
      fieldUiPrefsByUserId: {},
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
    return upgraded;
  }

  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    const seeded = seedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  // Ensure new keys exist even if older state was manually edited.
  if (!(parsed as any).demoProgressByUserId) {
    const fixed = { ...(parsed as any), demoProgressByUserId: {}, issues: (parsed as any).issues || [] } as DemoState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixed));
    return fixed;
  }

  if (!(parsed as any).issues) {
    const fixed = { ...(parsed as any), issues: [] } as DemoState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixed));
    return fixed;
  }

  if (!(parsed as any).routeStateByUserId) {
    const fixed = { ...(parsed as any), routeStateByUserId: {} } as DemoState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixed));
    return fixed;
  }

  if (!(parsed as any).fieldUiPrefsByUserId) {
    const fixed = { ...(parsed as any), fieldUiPrefsByUserId: {} } as DemoState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixed));
    return fixed;
  }

  return parsed;
};

const saveState = (state: DemoState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const demoStore = {
  ensureSeeded: () => {
    void loadState();
  },

  reset: () => {
    const seeded = seedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  },

  getUsers: (): User[] => loadState().users,
  getFields: (): Field[] => loadState().fields,
  getTasks: (): DemoTask[] => loadState().tasks,
  getAssignments: (): DemoAssignmentMap => loadState().assignments,
  getEvents: (): DemoEvent[] => loadState().events,
  getDemoProgress: (userId: string, role: string): DemoProgress => {
    const state = loadState();
    const existing = state.demoProgressByUserId?.[userId];
    if (existing) return existing;
    const created = defaultProgressForRole(role);
    const demoProgressByUserId = { ...(state.demoProgressByUserId || {}), [userId]: created };
    saveState({ ...state, demoProgressByUserId });
    return created;
  },

  setDemoProgress: (userId: string, progress: DemoProgress) => {
    const state = loadState();
    const demoProgressByUserId = { ...(state.demoProgressByUserId || {}), [userId]: progress };
    saveState({ ...state, demoProgressByUserId });
  },

  markDemoStep: (userId: string, role: string, step: DemoStepKey) => {
    const current = demoStore.getDemoProgress(userId, role);
    if (current.steps[step]) return;
    const next: DemoProgress = {
      ...current,
      steps: { ...current.steps, [step]: true },
    };
    demoStore.setDemoProgress(userId, next);
  },

  dismissDemoTour: (userId: string, role: string, dismissed: boolean) => {
    const current = demoStore.getDemoProgress(userId, role);
    demoStore.setDemoProgress(userId, { ...current, dismissed });
  },

  getIssues: (): DemoIssue[] => loadState().issues || [],

  addIssue: (issue: Omit<DemoIssue, 'id' | 'createdAt' | 'status'> & { status?: DemoIssueStatus }) => {
    const state = loadState();
    const next: DemoIssue = {
      id: `issue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      status: issue.status || 'Open',
      ...issue,
    };
    const issues = [next, ...(state.issues || [])].slice(0, 200);
    saveState({ ...state, issues });
    demoStore.addEvent({
      type: 'task_status_changed',
      timestamp: next.createdAt,
      fieldId: next.fieldId,
      actorUserId: next.createdByUserId,
      message: `Issue reported (${next.severity} ${next.type}): ${next.title}`,
    });
    return next;
  },

  updateIssueStatus: (issueId: string, status: DemoIssueStatus, actorUserId?: string) => {
    const state = loadState();
    const idx = (state.issues || []).findIndex((i) => i.id === issueId);
    if (idx < 0) throw new Error('Issue not found');
    const updated: DemoIssue = { ...state.issues[idx], status };
    const issues = [...state.issues];
    issues[idx] = updated;
    saveState({ ...state, issues });
    demoStore.addEvent({
      type: 'task_status_changed',
      timestamp: new Date().toISOString(),
      fieldId: updated.fieldId,
      actorUserId,
      message: `Issue status updated: ${updated.title} → ${status}`,
    });
    return updated;
  },

  getRouteState: (userId: string): DemoRouteState => {
    const state = loadState();
    const existing = state.routeStateByUserId?.[userId];
    if (existing) return existing;
    const created: DemoRouteState = { active: false, currentIndex: 0, completedFieldIds: [] };
    const routeStateByUserId = { ...(state.routeStateByUserId || {}), [userId]: created };
    saveState({ ...state, routeStateByUserId });
    return created;
  },

  setRouteState: (userId: string, route: DemoRouteState) => {
    const state = loadState();
    const routeStateByUserId = { ...(state.routeStateByUserId || {}), [userId]: route };
    saveState({ ...state, routeStateByUserId });
  },

  getFieldUiPrefs: (userId: string): DemoFieldUiPrefs => {
    const state = loadState();
    return state.fieldUiPrefsByUserId?.[userId] || {};
  },

  setFieldUiPrefs: (userId: string, prefs: DemoFieldUiPrefs) => {
    const state = loadState();
    const fieldUiPrefsByUserId = { ...(state.fieldUiPrefsByUserId || {}), [userId]: prefs };
    saveState({ ...state, fieldUiPrefsByUserId });
  },

  setFields: (fields: Field[]) => {
    const state = loadState();
    saveState({ ...state, fields });
  },

  setTasks: (tasks: DemoTask[]) => {
    const state = loadState();
    saveState({ ...state, tasks });
  },

  setAssignments: (assignments: DemoAssignmentMap) => {
    const state = loadState();
    saveState({ ...state, assignments });
  },

  addEvent: (event: Omit<DemoEvent, 'id'>) => {
    const state = loadState();
    const next: DemoEvent = { id: `ev-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...event };
    const events = [next, ...(state.events || [])].slice(0, 500);
    saveState({ ...state, events });
    return next;
  },

  upsertTask: (task: DemoTask) => {
    const state = loadState();
    const idx = state.tasks.findIndex((t) => t.id === task.id);
    const tasks = [...state.tasks];
    if (idx >= 0) tasks[idx] = task;
    else tasks.unshift(task);
    saveState({ ...state, tasks });
  },

  updateTask: (taskId: string, patch: Partial<DemoTask>) => {
    const state = loadState();
    const idx = state.tasks.findIndex((t) => t.id === taskId);
    if (idx < 0) throw new Error('Task not found');
    const updated = { ...state.tasks[idx], ...patch, updatedAt: new Date().toISOString() };
    const tasks = [...state.tasks];
    tasks[idx] = updated;
    saveState({ ...state, tasks });
    return updated;
  },

  updateField: (fieldId: string, patch: Partial<Field>) => {
    const state = loadState();
    const idx = state.fields.findIndex((f) => f.id === fieldId);
    if (idx < 0) throw new Error('Field not found');
    const updated = { ...state.fields[idx], ...patch, updatedAt: new Date().toISOString() };
    const fields = [...state.fields];
    fields[idx] = updated;
    saveState({ ...state, fields });
    return updated;
  },

  assignProducerToField: (fieldId: string, producerId: string) => {
    const state = loadState();
    const current = state.assignments[fieldId] || [];
    if (!current.includes(producerId)) {
      const updatedAssignments = { ...state.assignments, [fieldId]: [...current, producerId] };
      saveState({ ...state, assignments: updatedAssignments });
    }
  },

  unassignProducerFromField: (fieldId: string, producerId: string) => {
    const state = loadState();
    const current = state.assignments[fieldId] || [];
    const next = current.filter((id) => id !== producerId);
    const updatedAssignments = { ...state.assignments, [fieldId]: next };
    saveState({ ...state, assignments: updatedAssignments });
  },
};

