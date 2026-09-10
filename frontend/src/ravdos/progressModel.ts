import type { FieldTask } from '../services/fieldWorkService';
import {
  getSeasonBounds,
  isDateInSeason,
  isSeasonEnded,
  type SeasonBounds,
} from '../utils/harvestSeason';

export type RodPhaseId =
  | 'dormancy'
  | 'bud_break'
  | 'flowering'
  | 'fruit_growth'
  | 'harvest';

export type HarvestSubPhase = 'prepare' | 'daily' | 'final';

export interface RodMilestone {
  id: string;
  templateId: string;
  title: string;
  weight: number;
  phase: RodPhaseId;
  harvestSubPhase?: HarvestSubPhase;
  done: boolean;
  taskId?: string;
  status?: string;
}

export interface PhaseProgress {
  id: RodPhaseId;
  weightTotal: number;
  weightDone: number;
  percent: number;
}

export interface RodProgressResult {
  percent: number;
  weightTotal: number;
  weightDone: number;
  milestones: RodMilestone[];
  phases: PhaseProgress[];
  activePhaseId: RodPhaseId;
  harvestClosed: boolean;
}

/** Critical = 15, High structural = 10, Medium important = 5, recurring excluded = 0 */
const WEIGHT_BY_TEMPLATE: Record<string, number> = {
  olive_fruit_fly_trap_installation: 15,
  olive_fruit_fly_monitoring: 15,
  fruit_damage_sampling: 15,
  harvest_planning: 15,
  olive_harvest: 15,
  T14: 15,

  soil_analysis: 10,
  leaf_analysis: 10,
  annual_fertilization_plan: 10,
  nitrogen_application: 10,
  main_pruning: 10,
  irrigation_system_startup_inspection: 10,
  ripening_index_sampling: 10,
  pre_harvest_field_access_cleanup: 10,
  harvest_equipment_preparation: 10,
  post_harvest_field_inspection: 10,
  annual_field_report: 10,
  disease_scouting: 10,

  pre_flowering_nutrition_check: 5,
  potassium_nutrition_check: 5,
  remove_pruning_residues: 5,
  sucker_removal: 5,
  weed_control_mowing: 5,
  post_pruning_disease_protection_review: 5,
  equipment_maintenance: 5,
  post_harvest_irrigation_check: 5,

  general_field_inspection: 0,
  irrigation_event: 0,
  irrigation_filter_cleaning: 0,
};

const PHASE_ORDER: RodPhaseId[] = [
  'dormancy',
  'bud_break',
  'flowering',
  'fruit_growth',
  'harvest',
];

const FINAL_CLOSE_TYPES = new Set([
  'harvest_close_season',
  'harvest_mill_delivery',
  'annual_field_report',
  'post_harvest_field_inspection',
]);

const HARVEST_CODES = new Set([
  'olive_harvest',
  'harvest_planning',
  'ripening_index_sampling',
  'pre_harvest_field_access_cleanup',
  'harvest_equipment_preparation',
  'post_harvest_field_inspection',
  'annual_field_report',
  'harvest_close_season',
  'harvest_mill_delivery',
]);

export const isTaskCompleted = (status?: string): boolean => {
  const s = (status || '').toLowerCase();
  return s === 'completed' || s === 'done';
};

export const isTaskCancelled = (status?: string): boolean => {
  const s = (status || '').toLowerCase();
  return s === 'cancelled' || s === 'canceled';
};

const taskDateCandidates = (task: FieldTask): Array<string | undefined> => [
  task.plannedStart,
  task.plannedEnd,
  task.updatedAt,
  task.createdAt,
];

export const taskInSeasonBounds = (task: FieldTask, bounds: SeasonBounds): boolean => {
  if (isTaskCancelled(task.status)) return false;
  return taskDateCandidates(task).some((d) => isDateInSeason(d, bounds));
};

export const noteInSeasonBounds = (
  note: { occurredAt?: string; createdAt: string },
  bounds: SeasonBounds
): boolean => isDateInSeason(note.occurredAt, bounds) || isDateInSeason(note.createdAt, bounds);

const normalizeTypeKey = (task: FieldTask): string => {
  const raw = (task.templateCode || '').trim();
  return raw.toLowerCase().replace(/\s+/g, '_');
};

const phaseForKey = (key: string, title: string): RodPhaseId => {
  if (HARVEST_CODES.has(key) || /harvest|συγκομιδ|τρύγ|post.?harvest/i.test(`${key} ${title}`)) {
    return 'harvest';
  }
  if (/prun|κλάδ|dorman|winter/i.test(`${key} ${title}`)) return 'dormancy';
  if (/flower|άνθ/i.test(`${key} ${title}`)) return 'flowering';
  if (/bud|βλαστ/i.test(`${key} ${title}`)) return 'bud_break';
  return 'fruit_growth';
};

const weightForKey = (key: string): number => {
  if (WEIGHT_BY_TEMPLATE[key] !== undefined) return WEIGHT_BY_TEMPLATE[key];
  if (HARVEST_CODES.has(key) || FINAL_CLOSE_TYPES.has(key)) return 10;
  return 5;
};

export const hasHarvestCloseSignal = (tasks: FieldTask[], bounds: SeasonBounds): boolean => {
  return tasks.some((task) => {
    if (!taskInSeasonBounds(task, bounds)) return false;
    if (!isTaskCompleted(task.status)) return false;
    const key = normalizeTypeKey(task);
    if (FINAL_CLOSE_TYPES.has(key)) return true;
    const hay = `${task.templateCode || ''} ${task.title}`.toLowerCase();
    return (
      hay.includes('close harvest') ||
      hay.includes('κλείσ') ||
      hay.includes('mill delivery') ||
      hay.includes('annual field report')
    );
  });
};

export const isSeasonClosedForReview = (
  seasonStartYear: number,
  tasks: FieldTask[],
  now = new Date()
): boolean => {
  const bounds = getSeasonBounds(seasonStartYear);
  if (isSeasonEnded(seasonStartYear, now)) return true;
  return hasHarvestCloseSignal(tasks, bounds);
};

/**
 * Build milestones for a season from FieldTasks (templateCode weights).
 */
export const buildSeasonMilestones = (
  tasks: FieldTask[],
  options: { anyIrrigatedField: boolean; seasonStartYear: number }
): RodMilestone[] => {
  const bounds = getSeasonBounds(options.seasonStartYear);
  const seasonTasks = tasks.filter((t) => taskInSeasonBounds(t, bounds));

  const doneByTemplate = new Map<string, FieldTask>();
  const openByTemplate = new Map<string, FieldTask>();

  for (const task of seasonTasks) {
    const key = normalizeTypeKey(task) || task.id;
    if (!key) continue;
    if (isTaskCompleted(task.status)) {
      if (!doneByTemplate.has(key)) doneByTemplate.set(key, task);
    } else if (!openByTemplate.has(key)) {
      openByTemplate.set(key, task);
    }
  }

  const keys = new Set([...doneByTemplate.keys(), ...openByTemplate.keys()]);
  const milestones: RodMilestone[] = [];

  for (const key of keys) {
    const weight = weightForKey(key);
    if (weight <= 0) continue;
    if (!options.anyIrrigatedField && /irrigation/i.test(key)) continue;

    const doneTask = doneByTemplate.get(key);
    const openTask = openByTemplate.get(key);
    const task = doneTask || openTask;
    if (!task) continue;

    milestones.push({
      id: key,
      templateId: key,
      title: task.title,
      weight,
      phase: phaseForKey(key, task.title),
      harvestSubPhase: FINAL_CLOSE_TYPES.has(key) ? 'final' : undefined,
      done: Boolean(doneTask),
      taskId: task.id,
      status: task.status,
    });
  }

  return milestones.sort((a, b) => {
    const pi = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
    if (pi !== 0) return pi;
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.weight - a.weight;
  });
};

export const computeRodProgress = (milestones: RodMilestone[]): RodProgressResult => {
  const withWeight = milestones.filter((m) => m.weight > 0);
  const weightTotal = withWeight.reduce((s, m) => s + m.weight, 0);
  const weightDone = withWeight.reduce((s, m) => s + (m.done ? m.weight : 0), 0);
  const percent = weightTotal > 0 ? Math.round((weightDone / weightTotal) * 100) : 0;

  const phases: PhaseProgress[] = PHASE_ORDER.map((id) => {
    const rows = withWeight.filter((m) => m.phase === id);
    const total = rows.reduce((s, m) => s + m.weight, 0);
    const done = rows.reduce((s, m) => s + (m.done ? m.weight : 0), 0);
    return {
      id,
      weightTotal: total,
      weightDone: done,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  const firstOpen = withWeight.find((m) => !m.done);
  const activePhaseId = firstOpen?.phase ?? (percent >= 100 ? 'harvest' : 'dormancy');

  const harvestClosed = withWeight
    .filter((m) => m.phase === 'harvest' && m.harvestSubPhase === 'final')
    .some((m) => m.done);

  return {
    percent,
    weightTotal,
    weightDone,
    milestones: withWeight,
    phases,
    activePhaseId,
    harvestClosed,
  };
};

export const ROD_PHASE_ORDER = PHASE_ORDER;

/** Filter harvest/money rows client-side into a cultivation season. */
export const filterBySeasonDate = <T extends { date?: string; createdAt?: string }>(
  rows: T[],
  bounds: SeasonBounds,
  getDate: (row: T) => string | undefined = (row) => row.date || row.createdAt
): T[] => rows.filter((row) => isDateInSeason(getDate(row), bounds));
