import { Field } from '../fieldService';
import type { FieldTaskStatus } from '../fieldWorkService';
import { User } from '../userService';
import { Lifecycle } from '../lifecycleService';
import { DemoEvent, DemoIssue, DemoTask } from './demoStore';

/** Matches backend DemoAccounts seed IDs */
export const DEMO_OWNER_ID = '675555555555555555555501';
export const DEMO_PRODUCER_ID = '675555555555555555555502';

export const DEMO_FIELD_IDS = [
  '675555555555555555555101',
  '675555555555555555555102',
] as const;

type SeasonalTemplate = {
  months: number[];
  type: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedMinutes: number;
  lifecycleYear?: 'low' | 'high';
};

const SEASONAL_TEMPLATES: SeasonalTemplate[] = [
  {
    months: [1, 2],
    type: 'Pruning',
    title: 'Winter pruning',
    description: 'Shape canopy and remove deadwood before spring growth.',
    priority: 'High',
    estimatedMinutes: 120,
  },
  {
    months: [2, 3],
    type: 'Soil Testing',
    title: 'Soil sampling & analysis',
    description: 'Collect zone samples and send for nutrient analysis.',
    priority: 'Medium',
    estimatedMinutes: 90,
  },
  {
    months: [3, 4],
    type: 'Fertilization',
    title: 'Spring fertilization',
    description: 'Apply nitrogen and micronutrients per agronomist plan.',
    priority: 'High',
    estimatedMinutes: 75,
  },
  {
    months: [4, 5],
    type: 'Irrigation',
    title: 'Irrigation system check',
    description: 'Inspect lines, pressure, and timers before dry season.',
    priority: 'High',
    estimatedMinutes: 45,
  },
  {
    months: [5, 6, 7],
    type: 'Pest Control',
    title: 'Olive fruit fly monitoring',
    description: 'Deploy traps and scout fruit for fly damage hotspots.',
    priority: 'Critical',
    estimatedMinutes: 60,
  },
  {
    months: [6, 7, 8],
    type: 'Irrigation',
    title: 'Summer irrigation run',
    description: 'Adjust schedule based on soil moisture and heat forecast.',
    priority: 'High',
    estimatedMinutes: 40,
  },
  {
    months: [7, 8],
    type: 'Pest Control',
    title: 'Disease scouting',
    description: 'Check leaves and fruit for peacock spot and anthracnose.',
    priority: 'Medium',
    estimatedMinutes: 50,
  },
  {
    months: [8, 9],
    type: 'Harvesting',
    title: 'Harvest preparation',
    description: 'Confirm crew, nets, and mill pickup windows.',
    priority: 'High',
    estimatedMinutes: 55,
    lifecycleYear: 'high',
  },
  {
    months: [10, 11],
    type: 'Harvesting',
    title: 'Olive harvest',
    description: 'Harvest fruit and record kg per zone.',
    priority: 'Critical',
    estimatedMinutes: 240,
    lifecycleYear: 'high',
  },
  {
    months: [11, 12],
    type: 'Fertilization',
    title: 'Post-harvest fertilization',
    description: 'Replenish potassium and organic matter after harvest.',
    priority: 'Medium',
    estimatedMinutes: 70,
  },
  {
    months: [12, 1],
    type: 'Irrigation',
    title: 'Winter irrigation audit',
    description: 'Drain lines and protect valves from frost where needed.',
    priority: 'Low',
    estimatedMinutes: 35,
  },
];

const DEMO_IMAGES = [
  '/demo-images/olive-branch.jpg',
  '/demo-images/olive-tree-field.jpg',
  '/demo-images/olive-grove-hillside.jpg',
  '/demo-images/olive-harvest.jpg',
  '/demo-images/olive-hills-village.jpg',
];

const OWNER_NOTES = [
  'Good work â€” approved for payment.',
  'Please add clearer photos next time.',
  'Approved. Schedule follow-up irrigation check.',
  'Rejected â€” missed north zone. Please redo.',
];

const PRODUCER_NOTES = [
  'Completed all zones. Minor leak flagged near valve box.',
  'Trap counts elevated on north edge â€” reported to owner.',
  'Harvest yield logged in field notebook.',
  'Weather delay â€” finished next morning.',
];

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const toIso = (d: Date) => d.toISOString();

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

const pickTemplatesForMonth = (month: number): SeasonalTemplate[] =>
  SEASONAL_TEMPLATES.filter((t) => t.months.includes(month));

export type DemoDataset = {
  users: User[];
  fields: Field[];
  tasks: DemoTask[];
  lifecycles: Lifecycle[];
  events: DemoEvent[];
  issues: DemoIssue[];
  assignments: Record<string, string[]>;
};

export function generateDemoDataset(referenceDate = new Date()): DemoDataset {
  const now = referenceDate;
  const oneYearAgo = addDays(now, -365);

  const fields: Field[] = [
    {
      id: DEMO_FIELD_IDS[0],
      ownerId: DEMO_OWNER_ID,
      name: 'North Olive Grove',
      latitude: 37.1568,
      longitude: 21.586,
      area: 12.5,
      variety: 'Kalamata',
      treeAge: 15,
      groundType: 'Clay Loam',
      irrigationStatus: true,
      currentLifecycleYear: 'low',
      createdAt: toIso(oneYearAgo),
      updatedAt: toIso(now),
    },
    {
      id: DEMO_FIELD_IDS[1],
      ownerId: DEMO_OWNER_ID,
      name: 'South Valley Fields',
      latitude: 37.1492,
      longitude: 21.5745,
      area: 8.3,
      variety: 'Arbequina',
      treeAge: 8,
      groundType: 'Sandy Loam',
      irrigationStatus: true,
      currentLifecycleYear: 'high',
      createdAt: toIso(oneYearAgo),
      updatedAt: toIso(now),
    },
  ];

  const users: User[] = [
    {
      id: DEMO_OWNER_ID,
      email: 'owner@olivefarm.com',
      firstName: 'Giorgos',
      lastName: 'Papadakis',
      role: 'FieldOwner',
    },
    {
      id: DEMO_PRODUCER_ID,
      email: 'producer1@olivefarm.com',
      firstName: 'Kostas',
      lastName: 'Manousakis',
      role: 'Producer',
    },
  ];

  const tasks: DemoTask[] = [];
  const events: DemoEvent[] = [];
  let taskIndex = 0;

  const pushEvent = (e: Omit<DemoEvent, 'id'>) => {
    events.push({ id: `ev-${events.length + 1}`, ...e });
  };

  // Walk 13 months back through 2 months ahead
  for (let monthOffset = -12; monthOffset <= 2; monthOffset++) {
    const anchor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 12);
    const month = anchor.getMonth() + 1;
    const templates = pickTemplatesForMonth(month);
    if (templates.length === 0) continue;

    fields.forEach((field, fieldIdx) => {
      const template = templates[(fieldIdx + monthOffset + 12) % templates.length];

      const scheduledStart = addDays(anchor, (fieldIdx % 5) - 2);
      const scheduledEnd = addDays(scheduledStart, 2 + (fieldIdx % 3));
      const createdAt = addDays(scheduledStart, -5);
      const endMs = scheduledEnd.getTime();
      const nowMs = now.getTime();
      const startMs = scheduledStart.getTime();

      const assignProducer = taskIndex % 7 !== 0; // ~85% producer-assigned
      const assignedTo = assignProducer ? DEMO_PRODUCER_ID : undefined;

      let status: FieldTaskStatus = 'planned';
      let actualStart: string | undefined;
      let actualEnd: string | undefined;
      let approvalStatus: DemoTask['approvalStatus'] = 'not_required';
      let approvalNote: string | undefined;
            let cost: number | undefined;

      if (endMs < nowMs - 3 * 24 * 60 * 60 * 1000) {
        status = 'completed';
        actualStart = toIso(addDays(scheduledStart, 0));
        actualEnd = toIso(addDays(scheduledEnd, -1));
        if (assignedTo) {
          const roll = taskIndex % 10;
          if (roll < 7) {
            approvalStatus = 'approved';
            approvalNote = OWNER_NOTES[taskIndex % OWNER_NOTES.length];
          } else if (roll < 9) {
            approvalStatus = 'pending';
          } else {
            approvalStatus = 'rejected';
            approvalNote = OWNER_NOTES[3];
          }
        }
        
        cost = 80 + (taskIndex % 12) * 25;
      } else if (startMs <= nowMs && endMs >= nowMs) {
        status = taskIndex % 2 === 0 ? 'in_progress' : 'planned';
        
      } else if (endMs < nowMs) {
        status = 'planned'; // overdue
      }

      const taskId = `67555555555555555555${(6000 + taskIndex).toString(16).padStart(4, '0')}`;
      taskIndex += 1;

      const title = `${template.title} - `;
      const task: DemoTask = {
        id: taskId,
        fieldId: field.id,
        resultYear: scheduledStart.getFullYear(),
        templateCode: template.type.toLowerCase().replace(/\s+/g, '_'),
        title,
        description: template.description,
        status,
        statusLabel: status,
        plannedStart: toIso(scheduledStart),
        plannedEnd: toIso(scheduledEnd),
        assignedUserId: assignedTo,
        additionalParticipantUserIds: [],
        assignmentResponse: 'pending',
        checklist: [],
        estimatedCost: cost,
        notes:
          assignedTo && status === 'completed'
            ? `Producer note: ${PRODUCER_NOTES[taskIndex % PRODUCER_NOTES.length]}`
            : undefined,
        attachmentIds: [],
        weatherSuitability: 'unknown',
        weatherSuitabilityLabel: '',
        createdByUserId: DEMO_OWNER_ID,
        createdAt: toIso(createdAt),
        updatedAt: actualEnd ?? actualStart ?? toIso(scheduledStart),
        approvalStatus,
        approvalNote,
      };

      tasks.push(task);

      // Timeline: owner assigns â†’ producer works â†’ owner reviews
      if (assignedTo) {
        pushEvent({
          type: 'task_assigned',
          timestamp: task.createdAt,
          fieldId: field.id,
          taskId: task.id,
          actorUserId: DEMO_OWNER_ID,
          message: `Giorgos assigned to Kostas: ${title}`,
        });
      } else {
        pushEvent({
          type: 'task_status_changed',
          timestamp: task.createdAt,
          fieldId: field.id,
          taskId: task.id,
          actorUserId: DEMO_OWNER_ID,
          message: `Owner scheduled: ${title}`,
        });
      }

      if (status === 'in_progress' && actualStart) {
        pushEvent({
          type: 'task_status_changed',
          timestamp: actualStart,
          fieldId: field.id,
          taskId: task.id,
          actorUserId: assignedTo,
          message: `Kostas started: ${title}`,
        });
      }

      if (status === 'completed' && actualEnd) {
        pushEvent({
          type: 'task_status_changed',
          timestamp: actualEnd,
          fieldId: field.id,
          taskId: task.id,
          actorUserId: assignedTo,
          message: `Kostas completed: ${title}`,
        });
        if (approvalStatus === 'pending') {
          pushEvent({
            type: 'task_status_changed',
            timestamp: actualEnd,
            fieldId: field.id,
            taskId: task.id,
            actorUserId: assignedTo,
            message: `Awaiting Giorgos approval: ${title}`,
          });
        }
        if (approvalStatus === 'approved') {
          pushEvent({
            type: 'task_approved',
            timestamp: toIso(addDays(new Date(actualEnd), 1)),
            fieldId: field.id,
            taskId: task.id,
            actorUserId: DEMO_OWNER_ID,
            message: `Giorgos approved: ${title}`,
          });
        }
        if (approvalStatus === 'rejected') {
          pushEvent({
            type: 'task_rejected',
            timestamp: toIso(addDays(new Date(actualEnd), 1)),
            fieldId: field.id,
            taskId: task.id,
            actorUserId: DEMO_OWNER_ID,
            message: `Giorgos requested redo: ${title}`,
          });
        }
      }
    });
  }

  // De-duplicate very similar tasks in same month/field (keep first per monthKey+field)
  const seen = new Set<string>();
  const dedupedTasks = tasks.filter((t) => {
    const start = new Date(t.plannedStart!);
    const key = `${t.fieldId}-${monthKey(start)}-${t.templateCode || t.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const lifecycles: Lifecycle[] = fields.map((field, index) => ({
    id: `6755555555555555555520${(index + 1).toString().padStart(2, '0')}`,
    fieldId: field.id,
    currentYear: field.currentLifecycleYear,
    cycleStartDate: toIso(oneYearAgo),
    lastProgressionDate:
      index % 2 === 0 ? toIso(addDays(now, -30)) : undefined,
    createdAt: toIso(oneYearAgo),
    updatedAt: toIso(now),
  }));

  const assignments: Record<string, string[]> = {};
  fields.forEach((f) => {
    assignments[f.id] = [DEMO_PRODUCER_ID];
    pushEvent({
      type: 'producer_assigned',
      timestamp: toIso(oneYearAgo),
      fieldId: f.id,
      actorUserId: DEMO_OWNER_ID,
      message: `Giorgos assigned Kostas to ${f.name}`,
    });
  });

  const issues: DemoIssue[] = [
    {
      id: '675555555555555555555301',
      fieldId: DEMO_FIELD_IDS[1],
      type: 'Leak',
      severity: 'High',
      title: 'Main irrigation line leak near valve box',
      description: 'Kostas reported standing water and pressure drop across zones.',
      photoUrls: [DEMO_IMAGES[3]],
      createdAt: toIso(addDays(now, -1)),
      createdByUserId: DEMO_PRODUCER_ID,
      status: 'Open',
    },
    {
      id: '675555555555555555555302',
      fieldId: DEMO_FIELD_IDS[0],
      type: 'Pest',
      severity: 'Medium',
      title: 'Olive fruit fly hotspots on north edge',
      description: 'Trap counts rising â€” owner notified for spray window decision.',
      photoUrls: [DEMO_IMAGES[0]],
      createdAt: toIso(addDays(now, -3)),
      createdByUserId: DEMO_PRODUCER_ID,
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
    users,
    fields,
    tasks: dedupedTasks,
    lifecycles,
    events: events.slice(0, 500),
    issues,
    assignments,
  };
}

/** Curated near-term tasks always visible on dashboard (merged if missing) */
export function getPinnedDemoTasks(now = new Date()): DemoTask[] {
  const daysFromNow = (days: number) => toIso(addDays(now, days));
  const year = now.getFullYear();

  const base = (
    partial: Partial<DemoTask> &
      Pick<DemoTask, 'id' | 'fieldId' | 'title' | 'status' | 'plannedStart' | 'plannedEnd'>
  ): DemoTask => ({
    resultYear: year,
    statusLabel: partial.status,
    additionalParticipantUserIds: [],
    assignmentResponse: 'pending',
    checklist: [],
    attachmentIds: [],
    weatherSuitability: 'unknown',
    weatherSuitabilityLabel: '',
    createdByUserId: DEMO_OWNER_ID,
    createdAt: daysFromNow(-10),
    updatedAt: daysFromNow(-1),
    ...partial,
  });

  return [
    base({
      id: '675555555555555555556f01',
      fieldId: DEMO_FIELD_IDS[0],
      templateCode: 'irrigation',
      title: 'Irrigation - North Olive Grove',
      description: 'Inspect irrigation lines and verify flow in all zones.',
      status: 'planned',
      assignedUserId: DEMO_PRODUCER_ID,
      plannedStart: daysFromNow(-6),
      plannedEnd: daysFromNow(-2),
      approvalStatus: 'not_required',
    }),
    base({
      id: '675555555555555555556f02',
      fieldId: DEMO_FIELD_IDS[0],
      templateCode: 'pest_control',
      title: 'Fruit fly scouting - North Olive Grove',
      description: 'Scout for olive fruit fly and record hotspot locations.',
      status: 'in_progress',
      assignedUserId: DEMO_PRODUCER_ID,
      plannedStart: daysFromNow(-3),
      plannedEnd: daysFromNow(1),
      approvalStatus: 'not_required',
    }),
    base({
      id: '675555555555555555556f03',
      fieldId: DEMO_FIELD_IDS[1],
      templateCode: 'fertilization',
      title: 'Fertilization - South Valley Fields',
      description: 'Apply recommended nutrients; record quantities used.',
      status: 'planned',
      assignedUserId: DEMO_PRODUCER_ID,
      plannedStart: daysFromNow(-1),
      plannedEnd: daysFromNow(3),
      approvalStatus: 'not_required',
    }),
    base({
      id: '675555555555555555556f05',
      fieldId: DEMO_FIELD_IDS[0],
      templateCode: 'soil_testing',
      title: 'Soil testing - North Olive Grove',
      description: 'Collect samples from 3 representative zones.',
      status: 'completed',
      assignedUserId: DEMO_PRODUCER_ID,
      plannedStart: daysFromNow(-14),
      plannedEnd: daysFromNow(-12),
      estimatedCost: 220,
      approvalStatus: 'pending',
      updatedAt: daysFromNow(-12),
    }),
  ];
}

export function buildDemoTasks(now = new Date()): DemoTask[] {
  const { tasks } = generateDemoDataset(now);
  const pinned = getPinnedDemoTasks(now);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  pinned.forEach((p) => byId.set(p.id, p));
  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(a.plannedStart || a.createdAt).getTime() -
      new Date(b.plannedStart || b.createdAt).getTime()
  );
}

