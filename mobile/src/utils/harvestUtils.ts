import { Task } from '../services/taskService';
import { Field } from '../services/fieldService';
import { normalizeStage } from './lifecycleUtils';
import {
  HarvestPhase,
  PHASE_ORDER,
  canonicalHarvestType,
  getHarvestJob,
} from './harvestJobs';

export const isHarvestTask = (task: Task): boolean => {
  if (task.harvestPhase) return true;
  if (getHarvestJob(task.type) || getHarvestJob(task.templateId)) return true;
  const haystack = `${task.type} ${task.title} ${task.description ?? ''}`.toLowerCase();
  return (
    haystack.includes('harvest') ||
    haystack.includes('τρύγος') ||
    haystack.includes('τρυγος')
  );
};

export const resolveHarvestPhase = (task: Task): HarvestPhase | null => {
  if (task.harvestPhase === 'prepare' || task.harvestPhase === 'daily' || task.harvestPhase === 'final') {
    return task.harvestPhase;
  }
  const fromType = getHarvestJob(task.type)?.phase;
  if (fromType) return fromType;
  if (!isHarvestTask(task)) return null;

  const haystack = `${task.type} ${task.title} ${task.description ?? ''}`.toLowerCase();
  if (
    haystack.includes('mill') ||
    haystack.includes('ελαιοτριβ') ||
    haystack.includes('close') ||
    haystack.includes('κλείσ') ||
    haystack.includes('post-harvest') ||
    haystack.includes('post harvest')
  ) {
    return 'final';
  }
  if (
    haystack.includes('net') ||
    haystack.includes('crate') ||
    haystack.includes('δίχτυ') ||
    haystack.includes('crew') ||
    haystack.includes('συνεργ') ||
    haystack.includes('access') ||
    haystack.includes('book') ||
    haystack.includes('prepare') ||
    haystack.includes('ετοίμ')
  ) {
    return 'prepare';
  }
  return 'daily';
};

export const harvestJobType = (task: Task): string =>
  canonicalHarvestType(task.type) ?? task.type;

export const isFieldInHarvest = (field?: Field | null): boolean =>
  normalizeStage(field?.currentLifecycleStage) === 'harvest';

export const currentHarvestSeason = (now = new Date()): string => {
  const month = now.getMonth() + 1;
  const year = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return String(year);
};

export const formatKg = (kg: number): string =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(kg);

export type NextHarvestWork =
  | { kind: 'task'; task: Task; phase: HarvestPhase; fieldId: string }
  | { kind: 'field'; fieldId: string; phase: HarvestPhase };

export const pickNextHarvestWork = (
  openTasks: Task[],
  fields: Field[]
): NextHarvestWork | null => {
  const harvestTasks = openTasks
    .map((task) => ({ task, phase: resolveHarvestPhase(task) }))
    .filter((row): row is { task: Task; phase: HarvestPhase } => row.phase != null)
    .sort((a, b) => {
      const phaseDiff = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
      if (phaseDiff !== 0) return phaseDiff;
      const ad = a.task.scheduledEnd ? new Date(a.task.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.task.scheduledEnd ? new Date(b.task.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });

  const next = harvestTasks[0];
  if (next) {
    return { kind: 'task', task: next.task, phase: next.phase, fieldId: next.task.fieldId };
  }

  const harvestField = fields.find(isFieldInHarvest);
  if (harvestField) {
    return { kind: 'field', fieldId: harvestField.id, phase: 'daily' };
  }
  return null;
};

export const harvestFocusForPhase = (phase: HarvestPhase): 'harvest' | 'harvest-final' | 'money' => {
  if (phase === 'final') return 'harvest-final';
  return 'harvest';
};
