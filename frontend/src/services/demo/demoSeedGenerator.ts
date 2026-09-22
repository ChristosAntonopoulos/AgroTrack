import { Field } from '../fieldService';
import { checksForTemplate } from '../../utils/taskFormTypes';
import { User } from '../userService';
import { Lifecycle } from '../lifecycleService';
import { DemoEvent, DemoIssue, DemoTask } from './demoStore';

/** Matches backend DemoAccounts / DemoFarmDataSeeder IDs */
export const DEMO_OWNER_ID = '675555555555555555555501';
export const DEMO_PRODUCER_ID = '675555555555555555555502';

export const DEMO_FIELD_IDS = [
  '675555555555555555555101',
  '675555555555555555555102',
  '675555555555555555555103',
] as const;

const DEMO_IMAGES = [
  '/demo-images/olive-branch.jpg',
  '/demo-images/olive-tree-field.jpg',
  '/demo-images/olive-grove-hillside.jpg',
  '/demo-images/olive-harvest.jpg',
  '/demo-images/olive-hills-village.jpg',
];

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const toIso = (d: Date) => d.toISOString();

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
      name: 'Φιλιατρών 088 — Μεγαρίτικη',
      latitude: 37.193787613627592,
      longitude: 21.593640833820832,
      area: 3191.44,
      variety: 'Μεγαρίτικη',
      treeAge: 28,
      groundType: 'Loam',
      irrigationStatus: true,
      currentLifecycleYear: 'high',
      currentLifecycleStage: 'fruit_growth',
      status: 'Active',
      createdAt: toIso(oneYearAgo),
      updatedAt: toIso(now),
    },
    {
      id: DEMO_FIELD_IDS[1],
      ownerId: DEMO_OWNER_ID,
      name: 'Φιλιατρών 089 — Κορωνέικη',
      latitude: 37.193794307275581,
      longitude: 21.593644047696579,
      area: 2968.44,
      variety: 'Κορωνέικη',
      treeAge: 18,
      groundType: 'Clay Loam',
      irrigationStatus: true,
      currentLifecycleYear: 'high',
      currentLifecycleStage: 'fruit_growth',
      status: 'Active',
      createdAt: toIso(oneYearAgo),
      updatedAt: toIso(now),
    },
    {
      id: DEMO_FIELD_IDS[2],
      ownerId: DEMO_OWNER_ID,
      name: 'Φιλιατρών 090 — Καλαμών',
      latitude: 37.19412,
      longitude: 21.59405,
      area: 2480,
      variety: 'Καλαμών',
      treeAge: 22,
      groundType: 'Sandy Loam',
      irrigationStatus: true,
      currentLifecycleYear: 'high',
      currentLifecycleStage: 'fruit_growth',
      status: 'Active',
      createdAt: toIso(oneYearAgo),
      updatedAt: toIso(now),
    },
  ];

  const users: User[] = [
    {
      id: DEMO_OWNER_ID,
      email: 'owner@olivefarm.com',
      firstName: 'Γιώργος',
      lastName: 'Παπαδάκης',
      role: 'FieldOwner',
    },
    {
      id: DEMO_PRODUCER_ID,
      email: 'producer1@olivefarm.com',
      firstName: 'Κώστας',
      lastName: 'Μανούσακης',
      role: 'Producer',
    },
  ];

  const events: DemoEvent[] = [];
  const pinned = getPinnedDemoTasks(now);

  const pushEvent = (e: Omit<DemoEvent, 'id'>) => {
    events.push({ id: `ev-${events.length + 1}`, ...e });
  };

  pinned.forEach((task) => {
    pushEvent({
      type: task.status === 'completed' ? 'task_status_changed' : 'task_assigned',
      timestamp: task.updatedAt || task.createdAt,
      fieldId: task.fieldId,
      taskId: task.id,
      actorUserId: task.assignedUserId || DEMO_OWNER_ID,
      message: task.title,
    });
  });


  const lifecycles: Lifecycle[] = fields.map((field, index) => ({
    id: `6755555555555555555520${(index + 1).toString().padStart(2, '0')}`,
    fieldId: field.id,
    currentYear: field.currentLifecycleYear,
    currentStage: field.currentLifecycleStage,
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
      message: `Ο Γιώργος ανέθεσε τον Κώστα στο ${f.name}`,
    });
  });

  const issues: DemoIssue[] = [
    {
      id: '675555555555555555555301',
      fieldId: DEMO_FIELD_IDS[1],
      type: 'Leak',
      severity: 'High',
      title: 'Διαρροή κύριας γραμμής άρδευσης κοντά στο φρεάτιο',
      description: 'Ο Κώστας ανέφερε λιμνάζοντα νερά και πτώση πίεσης στις ζώνες.',
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
      title: 'Εστίες δάκου στη βόρεια άκρη',
      description: 'Αυξημένες συλλήψεις — ενημερώθηκε ο ιδιοκτήτης για παράθυρο ψεκασμού.',
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
      message: `Αναφορά προβλήματος (${iss.severity} ${iss.type}): ${iss.title}`,
    });
  });

  return {
    users,
    fields,
    tasks: pinned,
    lifecycles,
    events: events.slice(0, 500),
    issues,
    assignments,
  };
}

/** Curated near-term tasks aligned with FieldWorkDemoSeeder (Cycle 2 LIVE story). */
export function getPinnedDemoTasks(now = new Date()): DemoTask[] {
  const daysFromNow = (days: number) => toIso(addDays(now, days));
  const year = now.getMonth() >= 1 ? now.getFullYear() : now.getFullYear() - 1;

  const base = (
    partial: Partial<DemoTask> &
      Pick<DemoTask, 'id' | 'fieldId' | 'title' | 'status' | 'plannedStart' | 'plannedEnd'>
  ): DemoTask => ({
    resultYear: year,
    statusLabel: partial.status,
    additionalParticipantUserIds: [],
    assignmentResponse: 'accepted',
    checklist: checksForTemplate(partial.templateCode).map((item, index) => ({
      key: item.key,
      label: item.el,
      greekLabel: item.el,
      englishLabel: item.en,
      itemType: 'bool',
      requirement: 'required',
      isEssential: true,
      sortOrder: index + 1,
      isAnswered: partial.status === 'completed' || (partial.status === 'in_progress' && index === 0),
      attachmentIds: [],
      choices: [],
    })),
    attachmentIds: [],
    weatherSuitability: 'unknown',
    weatherSuitabilityLabel: '',
    createdByUserId: DEMO_OWNER_ID,
    createdAt: daysFromNow(-10),
    updatedAt: daysFromNow(-1),
    ...partial,
  });

  return [
    // Overdue — assigned to collaborator
    base({
      id: '675555555555555555556001',
      fieldId: DEMO_FIELD_IDS[0],
      templateCode: 'T08',
      title: 'Έλεγχος αρδευτικού συστήματος',
      description: 'Έλεγχος αντλίας, φίλτρων και σταλακτών πριν την επόμενη άρδευση.',
      status: 'planned',
      assignedUserId: DEMO_PRODUCER_ID,
      plannedStart: daysFromNow(-8),
      plannedEnd: daysFromNow(-3),
      estimatedCost: 45,
      weatherSuitability: 'good',
      weatherSuitabilityLabel: 'good',
      approvalStatus: 'not_required',
    }),
    // Suitable today
    base({
      id: '675555555555555555556002',
      fieldId: DEMO_FIELD_IDS[1],
      templateCode: 'T14',
      title: 'Έλεγχος παγίδων δάκου και καρπών',
      description: 'Καταμέτρηση συλλήψεων και δειγματοληψία καρπών — καλές συνθήκες σήμερα.',
      status: 'planned',
      assignedUserId: DEMO_PRODUCER_ID,
      plannedStart: daysFromNow(0),
      plannedEnd: daysFromNow(0),
      weatherSuitability: 'good',
      weatherSuitabilityLabel: 'good',
      approvalStatus: 'not_required',
    }),
    // Weather-blocked
    base({
      id: '675555555555555555556003',
      fieldId: DEMO_FIELD_IDS[2],
      templateCode: 'T09',
      title: 'Διαχείριση ζιζανίων / κάλυψης εδάφους',
      description: 'Αναβολή λόγω βροχής και υγρασίας — ακατάλληλες συνθήκες.',
      status: 'blocked',
      assignedUserId: DEMO_OWNER_ID,
      plannedStart: daysFromNow(1),
      plannedEnd: daysFromNow(2),
      estimatedCost: 80,
      weatherSuitability: 'unsuitable',
      weatherSuitabilityLabel: 'unsuitable',
      notes: 'Πρόγνωση: βροχή > 8 mm και υγρασία φύλλων υψηλή.',
      approvalStatus: 'not_required',
    }),
    // In progress — collaborator
    base({
      id: '675555555555555555556004',
      fieldId: DEMO_FIELD_IDS[0],
      templateCode: 'T05',
      title: 'Βασική / εδαφική λίπανση',
      description: 'Ο Κώστας εφαρμόζει το σχέδιο λίπανσης στη βόρεια πλευρά.',
      status: 'in_progress',
      assignedUserId: DEMO_PRODUCER_ID,
      plannedStart: daysFromNow(-1),
      plannedEnd: daysFromNow(1),
      estimatedCost: 120,
      weatherSuitability: 'good',
      weatherSuitabilityLabel: 'good',
      approvalStatus: 'not_required',
    }),
    // Completed with cost + photos
    base({
      id: '675555555555555555556005',
      fieldId: DEMO_FIELD_IDS[1],
      templateCode: 'T06',
      title: 'Κλάδεμα',
      description: 'Ολοκληρώθηκε το κλάδεμα στη βόρεια πλευρά.',
      status: 'completed',
      assignedUserId: DEMO_PRODUCER_ID,
      plannedStart: daysFromNow(-12),
      plannedEnd: daysFromNow(-11),
      estimatedCost: 95,
      attachmentIds: ['675555555555555555557001', '675555555555555555557002'],
      notes: 'Ήπια καταπόνηση στα νεότερα δέντρα. Προτείνεται άρδευση εντός 3 ημερών.',
      weatherSuitability: 'good',
      weatherSuitabilityLabel: 'good',
      approvalStatus: 'pending',
      updatedAt: daysFromNow(-11),
    }),
  ];
}

export function buildDemoTasks(now = new Date()): DemoTask[] {
  return getPinnedDemoTasks(now);
}
