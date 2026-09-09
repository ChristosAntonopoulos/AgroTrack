import { OLIVE_TASK_TEMPLATES } from '../data/oliveTaskTemplates';
import type { OliveTaskTemplate } from '../types/oliveTaskTemplate';
import type { Task } from '../services/taskService';
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

  // Excluded from year % (weight 0)
  general_field_inspection: 0,
  irrigation_event: 0,
  irrigation_filter_cleaning: 0,
};

const PHASE_MONTHS: Record<RodPhaseId, number[]> = {
  dormancy: [12, 1, 2],
  bud_break: [3, 4],
  flowering: [4, 5],
  fruit_growth: [6, 7, 8, 9],
  harvest: [9, 10, 11, 12],
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

const weightForTemplate = (template: OliveTaskTemplate): number => {
  if (WEIGHT_BY_TEMPLATE[template.id] !== undefined) return WEIGHT_BY_TEMPLATE[template.id];
  if (template.priority === 'Critical') return 15;
  if (template.priority === 'High') return 10;
  if (template.priority === 'Medium') return 5;
  return 0;
};

const phaseForTemplate = (template: OliveTaskTemplate): RodPhaseId => {
  if (template.harvestPhase || template.category === 'Harvest' || template.category === 'Post-Harvest') {
    return 'harvest';
  }
  const months = template.primaryMonths?.length ? template.primaryMonths : [1];
  const scores = PHASE_ORDER.map((id) => {
    const overlap = months.filter((m) => PHASE_MONTHS[id].includes(m)).length;
    return { id, overlap };
  });
  scores.sort((a, b) => b.overlap - a.overlap);
  return scores[0]?.overlap ? scores[0].id : 'dormancy';
};

export const isTaskCompleted = (status?: string): boolean => {
  const s = (status || '').toLowerCase();
  return s === 'completed' || s === 'done';
};

export const isTaskCancelled = (status?: string): boolean => {
  const s = (status || '').toLowerCase();
  return s === 'cancelled' || s === 'canceled';
};

const taskDateCandidates = (task: Task): Array<string | undefined> => [
  task.scheduledStart,
  task.scheduledEnd,
  task.actualEnd,
  task.actualStart,
  task.createdAt,
];

export const taskInSeasonBounds = (task: Task, bounds: SeasonBounds): boolean => {
  if (isTaskCancelled(task.status)) return false;
  return taskDateCandidates(task).some((d) => isDateInSeason(d, bounds));
};

export const noteInSeasonBounds = (
  note: { occurredAt?: string; createdAt: string },
  bounds: SeasonBounds
): boolean => isDateInSeason(note.occurredAt, bounds) || isDateInSeason(note.createdAt, bounds);

const normalizeTypeKey = (task: Task): string => {
  const raw = (task.templateId || task.type || '').trim();
  return raw.toLowerCase().replace(/\s+/g, '_');
};

const findTemplate = (task: Task): OliveTaskTemplate | undefined => {
  const key = normalizeTypeKey(task);
  return (
    OLIVE_TASK_TEMPLATES.find((t) => t.id === key) ||
    OLIVE_TASK_TEMPLATES.find((t) => t.id === task.templateId) ||
    OLIVE_TASK_TEMPLATES.find((t) => t.id === task.type)
  );
};

export const hasHarvestCloseSignal = (tasks: Task[], bounds: SeasonBounds): boolean => {
  return tasks.some((task) => {
    if (!taskInSeasonBounds(task, bounds)) return false;
    if (!isTaskCompleted(task.status)) return false;
    const key = normalizeTypeKey(task);
    const template = findTemplate(task);
    if (template?.harvestPhase === 'final') return true;
    if (FINAL_CLOSE_TYPES.has(key)) return true;
    const hay = `${task.type} ${task.title}`.toLowerCase();
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
  tasks: Task[],
  now = new Date()
): boolean => {
  const bounds = getSeasonBounds(seasonStartYear);
  if (isSeasonEnded(seasonStartYear, now)) return true;
  return hasHarvestCloseSignal(tasks, bounds);
};

/**
 * Build milestones for a season from catalog templates + actual tasks.
 * One credit per template id; irrigation-gated templates skipped when no irrigated field.
 */
export const buildSeasonMilestones = (
  tasks: Task[],
  options: { anyIrrigatedField: boolean; seasonStartYear: number }
): RodMilestone[] => {
  const bounds = getSeasonBounds(options.seasonStartYear);
  const seasonTasks = tasks.filter((t) => taskInSeasonBounds(t, bounds));

  const doneByTemplate = new Map<string, Task>();
  const openByTemplate = new Map<string, Task>();

  for (const task of seasonTasks) {
    const template = findTemplate(task);
    const key = template?.id || normalizeTypeKey(task);
    if (!key) continue;
    if (isTaskCompleted(task.status)) {
      if (!doneByTemplate.has(key)) doneByTemplate.set(key, task);
    } else if (!openByTemplate.has(key)) {
      openByTemplate.set(key, task);
    }
  }

  const milestones: RodMilestone[] = [];

  for (const template of OLIVE_TASK_TEMPLATES) {
    const weight = weightForTemplate(template);
    if (weight <= 0) continue;
    if (template.requiresIrrigation && !options.anyIrrigatedField) continue;

    const doneTask = doneByTemplate.get(template.id);
    const openTask = openByTemplate.get(template.id);
    const task = doneTask || openTask;

    milestones.push({
      id: template.id,
      templateId: template.id,
      title: template.title,
      weight,
      phase: phaseForTemplate(template),
      harvestSubPhase: template.harvestPhase,
      done: Boolean(doneTask),
      taskId: task?.id,
      status: task?.status,
    });
  }

  // Include completed ad-hoc harvest-close tasks not in catalog
  for (const [key, task] of doneByTemplate) {
    if (milestones.some((m) => m.templateId === key)) continue;
    if (!FINAL_CLOSE_TYPES.has(key) && !key.includes('harvest')) continue;
    milestones.push({
      id: key,
      templateId: key,
      title: task.title,
      weight: 10,
      phase: 'harvest',
      harvestSubPhase: 'final',
      done: true,
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
