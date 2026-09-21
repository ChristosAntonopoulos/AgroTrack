import { Field } from '../fieldService';
import type { FieldTaskStatus } from '../fieldWorkService';
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

type SeasonalTemplate = {
  months: number[];
  type: string;
  templateCode: string;
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
    templateCode: 'T06',
    title: 'Κλάδεμα',
    description: 'Διαμόρφωση κόμης και αφαίρεση ξερών κλαδιών πριν την άνοιξη.',
    priority: 'High',
    estimatedMinutes: 120,
  },
  {
    months: [2, 3],
    type: 'Soil Testing',
    templateCode: 'T03',
    title: 'Ανάλυση εδάφους',
    description: 'Δειγματοληψία ζωνών και αποστολή για ανάλυση θρεπτικών.',
    priority: 'Medium',
    estimatedMinutes: 90,
  },
  {
    months: [3, 4],
    type: 'Fertilization',
    templateCode: 'T05',
    title: 'Βασική λίπανση',
    description: 'Εφαρμογή αζώτου και ιχνοστοιχείων σύμφωνα με το σχέδιο.',
    priority: 'High',
    estimatedMinutes: 75,
  },
  {
    months: [3, 4],
    type: 'Irrigation',
    templateCode: 'T08',
    title: 'Έλεγχος αρδευτικού',
    description: 'Έλεγχος γραμμών, πίεσης και σταλακτών πριν την ξηρή περίοδο.',
    priority: 'High',
    estimatedMinutes: 45,
  },
  {
    months: [5, 6, 7],
    type: 'Pest Control',
    templateCode: 'T14',
    title: 'Έλεγχος παγίδων δάκου',
    description: 'Καταμέτρηση συλλήψεων και δειγματοληψία καρπών.',
    priority: 'Critical',
    estimatedMinutes: 60,
  },
  {
    months: [6, 7, 8],
    type: 'Irrigation',
    templateCode: 'T15',
    title: 'Άρδευση',
    description: 'Προσαρμογή προγράμματος με βάση υγρασία και πρόγνωση.',
    priority: 'High',
    estimatedMinutes: 40,
  },
  {
    months: [7, 8],
    type: 'Inspection',
    templateCode: 'T17',
    title: 'Θερινός έλεγχος καταπόνησης',
    description: 'Έλεγχος φύλλων και καρπού για υδατική καταπόνηση.',
    priority: 'Medium',
    estimatedMinutes: 50,
  },
  {
    months: [8, 9],
    type: 'Harvesting',
    templateCode: 'T19',
    title: 'Προετοιμασία συγκομιδής',
    description: 'Επιβεβαίωση συνεργείου, διχτυών και ραντεβού ελαιοτριβείου.',
    priority: 'High',
    estimatedMinutes: 55,
    lifecycleYear: 'high',
  },
  {
    months: [10, 11],
    type: 'Harvesting',
    templateCode: 'T21',
    title: 'Συγκομιδή',
    description: 'Συγκομιδή καρπού και καταγραφή κιλών ανά ζώνη.',
    priority: 'Critical',
    estimatedMinutes: 240,
    lifecycleYear: 'high',
  },
  {
    months: [11, 12],
    type: 'Fertilization',
    templateCode: 'T05',
    title: 'Μετασυλλεκτική λίπανση',
    description: 'Αναπλήρωση καλίου και οργανικής ουσίας μετά τη συγκομιδή.',
    priority: 'Medium',
    estimatedMinutes: 70,
  },
  {
    months: [12, 1],
    type: 'Irrigation',
    templateCode: 'T08',
    title: 'Χειμερινός έλεγχος άρδευσης',
    description: 'Άδειασμα γραμμών και προστασία βαλβίδων όπου χρειάζεται.',
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
  'Καλή δουλειά — εγκρίθηκε για πληρωμή.',
  'Προσθέστε πιο καθαρές φωτογραφίες την επόμενη φορά.',
  'Εγκρίθηκε. Προγραμματίστε έλεγχο άρδευσης.',
  'Απορρίφθηκε — έλειψε η βόρεια ζώνη. Επαναλάβετε.',
];

const PRODUCER_NOTES = [
  'Ολοκληρώθηκαν όλες οι ζώνες. Μικρή διαρροή κοντά στο φρεάτιο.',
  'Αυξημένες συλλήψεις στη βόρεια άκρη — ενημερώθηκε ο ιδιοκτήτης.',
  'Απόδοση συγκομιδής καταγράφηκε στο σημειωματάριο χωραφιού.',
  'Καθυστέρηση λόγω καιρού — ολοκληρώθηκε το επόμενο πρωί.',
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
      let weatherSuitability: DemoTask['weatherSuitability'] = 'unknown';

      if (endMs < nowMs - 3 * 24 * 60 * 60 * 1000) {
        status = 'completed';
        actualStart = toIso(addDays(scheduledStart, 0));
        actualEnd = toIso(addDays(scheduledEnd, -1));
        weatherSuitability = 'good';
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
        weatherSuitability = 'good';
      } else if (endMs < nowMs) {
        status = 'planned'; // overdue
        weatherSuitability = 'good';
      }

      const taskId = `67555555555555555555${(6000 + taskIndex).toString(16).padStart(4, '0')}`;
      taskIndex += 1;

      const title = `${template.title} — ${field.name.split('—')[0].trim()}`;
      const task: DemoTask = {
        id: taskId,
        fieldId: field.id,
        resultYear: scheduledStart.getFullYear(),
        templateCode: template.templateCode,
        title,
        description: template.description,
        status,
        statusLabel: status,
        plannedStart: toIso(scheduledStart),
        plannedEnd: toIso(scheduledEnd),
        assignedUserId: assignedTo,
        additionalParticipantUserIds: [],
        assignmentResponse: assignedTo ? 'accepted' : 'pending',
        checklist: [],
        estimatedCost: cost,
        notes:
          assignedTo && status === 'completed'
            ? `Σημείωση συνεργάτη: ${PRODUCER_NOTES[taskIndex % PRODUCER_NOTES.length]}`
            : undefined,
        attachmentIds: [],
        weatherSuitability,
        weatherSuitabilityLabel: weatherSuitability,
        createdByUserId: DEMO_OWNER_ID,
        createdAt: toIso(createdAt),
        updatedAt: actualEnd ?? actualStart ?? toIso(scheduledStart),
        approvalStatus,
        approvalNote,
      };

      tasks.push(task);

      if (assignedTo) {
        pushEvent({
          type: 'task_assigned',
          timestamp: task.createdAt,
          fieldId: field.id,
          taskId: task.id,
          actorUserId: DEMO_OWNER_ID,
          message: `Ο Γιώργος ανέθεσε στον Κώστα: ${title}`,
        });
      } else {
        pushEvent({
          type: 'task_status_changed',
          timestamp: task.createdAt,
          fieldId: field.id,
          taskId: task.id,
          actorUserId: DEMO_OWNER_ID,
          message: `Προγραμματίστηκε: ${title}`,
        });
      }

      if (status === 'in_progress' && actualStart) {
        pushEvent({
          type: 'task_status_changed',
          timestamp: actualStart,
          fieldId: field.id,
          taskId: task.id,
          actorUserId: assignedTo,
          message: `Ο Κώστας ξεκίνησε: ${title}`,
        });
      }

      if (status === 'completed' && actualEnd) {
        pushEvent({
          type: 'task_status_changed',
          timestamp: actualEnd,
          fieldId: field.id,
          taskId: task.id,
          actorUserId: assignedTo,
          message: `Ο Κώστας ολοκλήρωσε: ${title}`,
        });
        if (approvalStatus === 'pending') {
          pushEvent({
            type: 'task_status_changed',
            timestamp: actualEnd,
            fieldId: field.id,
            taskId: task.id,
            actorUserId: assignedTo,
            message: `Αναμονή έγκρισης Γιώργου: ${title}`,
          });
        }
        if (approvalStatus === 'approved') {
          pushEvent({
            type: 'task_approved',
            timestamp: toIso(addDays(new Date(actualEnd), 1)),
            fieldId: field.id,
            taskId: task.id,
            actorUserId: DEMO_OWNER_ID,
            message: `Ο Γιώργος ενέκρινε: ${title}`,
          });
        }
        if (approvalStatus === 'rejected') {
          pushEvent({
            type: 'task_rejected',
            timestamp: toIso(addDays(new Date(actualEnd), 1)),
            fieldId: field.id,
            taskId: task.id,
            actorUserId: DEMO_OWNER_ID,
            message: `Ο Γιώργος ζήτησε επανάληψη: ${title}`,
          });
        }
      }
    });
  }

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
    tasks: dedupedTasks,
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
      status: 'ready',
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
      templateCode: 'T17',
      title: 'Θερινός έλεγχος καταπόνησης',
      description: 'Ολοκληρώθηκε με φωτογραφίες και κόστος εργασίας.',
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
