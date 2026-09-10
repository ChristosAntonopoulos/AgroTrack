import type { FieldTask } from '../services/fieldWorkService';
import { fieldTaskTypeKey } from '../services/fieldWorkService';
import {
  getSeasonBounds,
  isDateInSeason,
  isSeasonEnded,
  type SeasonBounds,
} from './season';

export type RodPhaseId =
  | 'dormancy'
  | 'bud_break'
  | 'flowering'
  | 'fruit_growth'
  | 'harvest';

export type HarvestSubPhase = 'prepare' | 'daily' | 'final';

export interface MilestoneDef {
  id: string;
  title: string;
  weight: number;
  phase: RodPhaseId;
  harvestSubPhase?: HarvestSubPhase;
  requiresIrrigation?: boolean;
}

export interface RodMilestone extends MilestoneDef {
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
  milestones: RodMilestone[];
  phases: PhaseProgress[];
  activePhaseId: RodPhaseId;
}

export const ROD_PHASE_ORDER: RodPhaseId[] = [
  'dormancy',
  'bud_break',
  'flowering',
  'fruit_growth',
  'harvest',
];

const MILESTONE_DEFS: MilestoneDef[] = [
  { id: 'olive_fruit_fly_trap_installation', title: 'Fruit fly trap installation', weight: 15, phase: 'fruit_growth' },
  { id: 'olive_fruit_fly_monitoring', title: 'Fruit fly monitoring', weight: 15, phase: 'fruit_growth' },
  { id: 'fruit_damage_sampling', title: 'Fruit damage sampling', weight: 15, phase: 'fruit_growth' },
  { id: 'harvest_planning', title: 'Harvest planning', weight: 15, phase: 'harvest', harvestSubPhase: 'prepare' },
  { id: 'olive_harvest', title: 'Olive harvest', weight: 15, phase: 'harvest', harvestSubPhase: 'daily' },

  { id: 'soil_analysis', title: 'Soil analysis', weight: 10, phase: 'dormancy' },
  { id: 'leaf_analysis', title: 'Leaf analysis', weight: 10, phase: 'fruit_growth' },
  { id: 'annual_fertilization_plan', title: 'Annual fertilization plan', weight: 10, phase: 'dormancy' },
  { id: 'nitrogen_application', title: 'Nitrogen application', weight: 10, phase: 'bud_break' },
  { id: 'main_pruning', title: 'Main pruning', weight: 10, phase: 'bud_break' },
  {
    id: 'irrigation_system_startup_inspection',
    title: 'Irrigation startup inspection',
    weight: 10,
    phase: 'bud_break',
    requiresIrrigation: true,
  },
  { id: 'ripening_index_sampling', title: 'Ripening index sampling', weight: 10, phase: 'harvest', harvestSubPhase: 'prepare' },
  {
    id: 'pre_harvest_field_access_cleanup',
    title: 'Pre-harvest field access cleanup',
    weight: 10,
    phase: 'harvest',
    harvestSubPhase: 'prepare',
  },
  {
    id: 'harvest_equipment_preparation',
    title: 'Harvest equipment preparation',
    weight: 10,
    phase: 'harvest',
    harvestSubPhase: 'prepare',
  },
  {
    id: 'post_harvest_field_inspection',
    title: 'Post-harvest field inspection',
    weight: 10,
    phase: 'harvest',
    harvestSubPhase: 'final',
  },
  { id: 'annual_field_report', title: 'Annual field report', weight: 10, phase: 'harvest', harvestSubPhase: 'final' },
  { id: 'disease_scouting', title: 'Disease scouting', weight: 10, phase: 'fruit_growth' },

  { id: 'pre_flowering_nutrition_check', title: 'Pre-flowering nutrition check', weight: 5, phase: 'flowering' },
  { id: 'potassium_nutrition_check', title: 'Potassium nutrition check', weight: 5, phase: 'fruit_growth' },
  { id: 'remove_pruning_residues', title: 'Remove pruning residues', weight: 5, phase: 'bud_break' },
  { id: 'sucker_removal', title: 'Sucker removal', weight: 5, phase: 'fruit_growth' },
  { id: 'weed_control_mowing', title: 'Weed control / mowing', weight: 5, phase: 'fruit_growth' },
  { id: 'post_pruning_disease_protection_review', title: 'Post-pruning disease protection', weight: 5, phase: 'bud_break' },
  { id: 'equipment_maintenance', title: 'Equipment maintenance', weight: 5, phase: 'dormancy' },
  {
    id: 'post_harvest_irrigation_check',
    title: 'Post-harvest irrigation check',
    weight: 5,
    phase: 'harvest',
    harvestSubPhase: 'final',
    requiresIrrigation: true,
  },
];

const FINAL_CLOSE_TYPES = new Set([
  'harvest_close_season',
  'harvest_mill_delivery',
  'annual_field_report',
  'post_harvest_field_inspection',
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
  const raw = fieldTaskTypeKey(task);
  return raw.toLowerCase().replace(/\s+/g, '_');
};

export const hasHarvestCloseSignal = (tasks: FieldTask[], bounds: SeasonBounds): boolean =>
  tasks.some((task) => {
    if (!taskInSeasonBounds(task, bounds) || !isTaskCompleted(task.status)) return false;
    const key = normalizeTypeKey(task);
    if (FINAL_CLOSE_TYPES.has(key)) return true;
    const hay = `${fieldTaskTypeKey(task)} ${task.title}`.toLowerCase();
    return (
      hay.includes('close harvest') ||
      hay.includes('κλείσ') ||
      hay.includes('mill delivery') ||
      hay.includes('annual field report')
    );
  });

export const isSeasonClosedForReview = (
  seasonStartYear: number,
  tasks: FieldTask[],
  now = new Date()
): boolean => {
  const bounds = getSeasonBounds(seasonStartYear);
  if (isSeasonEnded(seasonStartYear, now)) return true;
  return hasHarvestCloseSignal(tasks, bounds);
};

export const buildSeasonMilestones = (
  tasks: FieldTask[],
  options: { anyIrrigatedField: boolean; seasonStartYear: number }
): RodMilestone[] => {
  const bounds = getSeasonBounds(options.seasonStartYear);
  const seasonTasks = tasks.filter((t) => taskInSeasonBounds(t, bounds));
  const doneByTemplate = new Map<string, FieldTask>();
  const openByTemplate = new Map<string, FieldTask>();

  for (const task of seasonTasks) {
    const key = normalizeTypeKey(task);
    if (!key) continue;
    if (isTaskCompleted(task.status)) {
      if (!doneByTemplate.has(key)) doneByTemplate.set(key, task);
    } else if (!openByTemplate.has(key)) {
      openByTemplate.set(key, task);
    }
  }

  const milestones: RodMilestone[] = [];
  for (const def of MILESTONE_DEFS) {
    if (def.requiresIrrigation && !options.anyIrrigatedField) continue;
    const doneTask = doneByTemplate.get(def.id);
    const openTask = openByTemplate.get(def.id);
    const task = doneTask || openTask;
    milestones.push({
      ...def,
      title: task?.title || def.title,
      done: Boolean(doneTask),
      taskId: task?.id,
      status: task?.status,
    });
  }

  return milestones.sort((a, b) => {
    const pi = ROD_PHASE_ORDER.indexOf(a.phase) - ROD_PHASE_ORDER.indexOf(b.phase);
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

  const phases: PhaseProgress[] = ROD_PHASE_ORDER.map((id) => {
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
  return {
    percent,
    milestones: withWeight,
    phases,
    activePhaseId: firstOpen?.phase ?? (percent >= 100 ? 'harvest' : 'dormancy'),
  };
};
