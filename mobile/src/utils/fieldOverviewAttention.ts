import type { FieldEnvironmentalAlert } from '../services/geospatialService';
import type { FieldTask, TaskProposal } from '../services/fieldWorkService';
import { templateTitle } from '../data/fieldWorkCatalogueLabels';
import { getNextUpcomingTask } from './fieldDisplay';
import { isActiveFieldTask } from '../services/fieldWorkService';

export type FieldAttentionKind =
  | 'safety'
  | 'agronomy'
  | 'overdue'
  | 'weatherReschedule'
  | 'nextTask'
  | 'proposal'
  | 'recording'
  | 'none';

export type FieldAttentionSeverity = 'critical' | 'warning' | 'info' | 'ok';

export type FieldAttentionModel = {
  kind: FieldAttentionKind;
  severity: FieldAttentionSeverity;
  id: string;
  title: string;
  explanationKey: string;
  explanationParams?: Record<string, string>;
  window?: string;
  reason?: string;
  primaryKey: string;
  /** Mobile navigation target instead of web paths. */
  primaryAction?: 'task' | 'proposal' | 'tasks' | 'chronologio' | 'none';
  secondaryKey?: string;
  taskId?: string;
  proposalId?: string;
  entryId?: string;
};

const SAFETY_TYPES = new Set(['frost', 'heat', 'fireproximity']);
const CLOSED_PROPOSAL = new Set(['accepted', 'dismissed', 'snoozed', 'expired']);
const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const startOfLocalDay = (now: Date): Date =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate());

export const isOpenTask = (task: FieldTask): boolean => isActiveFieldTask(task);

export const isOpenProposal = (proposal: TaskProposal): boolean =>
  !CLOSED_PROPOSAL.has(String(proposal.status || '').toLowerCase());

export const countPlannedRemaining = (tasks: FieldTask[]): number => tasks.filter(isOpenTask).length;

export const isOverdueTask = (task: FieldTask, now: Date = new Date()): boolean => {
  if (!isOpenTask(task) || !task.plannedEnd) return false;
  return new Date(task.plannedEnd).getTime() < startOfLocalDay(now).getTime();
};

const alertRank = (alert: FieldEnvironmentalAlert): number =>
  SEVERITY_RANK[String(alert.severity || '').toLowerCase()] ?? 9;

const sortAlerts = (alerts: FieldEnvironmentalAlert[]): FieldEnvironmentalAlert[] =>
  [...alerts].sort((a, b) => alertRank(a) - alertRank(b));

const isActiveAlert = (alert: FieldEnvironmentalAlert, now: Date): boolean => {
  if (alert.validTo && new Date(alert.validTo).getTime() < now.getTime()) return false;
  if (alert.validFrom && new Date(alert.validFrom).getTime() > now.getTime()) return false;
  return true;
};

const isSafetyAlert = (alert: FieldEnvironmentalAlert): boolean => {
  const type = String(alert.alertType || '').toLowerCase();
  const severity = String(alert.severity || '').toLowerCase();
  return SAFETY_TYPES.has(type) && (severity === 'critical' || severity === 'high');
};

const isAgronomyAlert = (alert: FieldEnvironmentalAlert): boolean => {
  if (isSafetyAlert(alert)) return false;
  const type = String(alert.alertType || '').toLowerCase();
  const severity = String(alert.severity || '').toLowerCase();
  if (type === 'vegetationchange' || type === 'taskwarning') return true;
  return severity === 'critical' || severity === 'high' || severity === 'medium';
};

const weatherNeedsReschedule = (task: FieldTask): boolean => {
  const suitability = String(task.weatherSuitability || '').toLowerCase();
  return suitability === 'caution' || suitability === 'unsuitable';
};

const noneAttention = (): FieldAttentionModel => ({
  kind: 'none',
  severity: 'ok',
  id: 'none',
  title: '',
  explanationKey: 'overview.attention.noneBody',
  primaryKey: 'overview.attention.noneAction',
  primaryAction: 'tasks',
});

const draftAttention = (): FieldAttentionModel => ({
  kind: 'none',
  severity: 'info',
  id: 'draft',
  title: '',
  explanationKey: 'overview.attention.draftBody',
  primaryKey: 'overview.attention.noneAction',
  primaryAction: 'none',
});

const windowForTask = (task: FieldTask): string | undefined =>
  task.preferredTimeWindow || task.plannedEnd || task.plannedStart;

export function resolveFieldAttention(input: {
  isDraft: boolean;
  isHistoricalYear: boolean;
  alerts: FieldEnvironmentalAlert[];
  tasks: FieldTask[];
  proposals: TaskProposal[];
  language?: string;
  dismissedIds?: string[];
  now?: Date;
}): FieldAttentionModel {
  if (input.isDraft) return draftAttention();

  const now = input.now ?? new Date();
  const dismissed = new Set(input.dismissedIds ?? []);
  const openTasks = input.tasks.filter(isOpenTask);
  const liveAlerts = sortAlerts(input.alerts.filter((alert) => isActiveAlert(alert, now)));

  if (!input.isHistoricalYear) {
    const safety = liveAlerts.find((alert) => isSafetyAlert(alert) && !dismissed.has(alert.id));
    if (safety) {
      return {
        kind: 'safety',
        severity: String(safety.severity).toLowerCase() === 'critical' ? 'critical' : 'warning',
        id: safety.id,
        title: safety.title,
        explanationKey: 'overview.attention.alertBody',
        explanationParams: { message: safety.message },
        primaryKey: 'overview.attention.seeChange',
        primaryAction: safety.relatedTaskId ? 'task' : 'none',
        taskId: safety.relatedTaskId,
      };
    }

    const agronomy = liveAlerts.find((alert) => isAgronomyAlert(alert) && !dismissed.has(alert.id));
    if (agronomy) {
      return {
        kind: 'agronomy',
        severity: 'warning',
        id: agronomy.id,
        title: agronomy.title,
        explanationKey: 'overview.attention.alertBody',
        explanationParams: { message: agronomy.message },
        primaryKey: 'overview.attention.seeChange',
        primaryAction: agronomy.relatedTaskId ? 'task' : 'none',
        taskId: agronomy.relatedTaskId,
      };
    }
  }

  const overdue = openTasks.find((task) => isOverdueTask(task, now) && !dismissed.has(task.id));
  if (overdue) {
    return {
      kind: 'overdue',
      severity: 'warning',
      id: overdue.id,
      title: overdue.title,
      explanationKey: 'overview.attention.overdueBody',
      window: windowForTask(overdue),
      primaryKey: 'overview.attention.openTask',
      primaryAction: 'task',
      taskId: overdue.id,
    };
  }

  if (!input.isHistoricalYear) {
    const weatherTask = openTasks.find(
      (task) => weatherNeedsReschedule(task) && !dismissed.has(task.id)
    );
    if (weatherTask) {
      return {
        kind: 'weatherReschedule',
        severity: 'warning',
        id: weatherTask.id,
        title: weatherTask.title,
        explanationKey: 'overview.attention.weatherBody',
        explanationParams: {
          reason: weatherTask.weatherSuitabilityLabel || '',
        },
        window: windowForTask(weatherTask),
        reason: weatherTask.weatherSuitabilityLabel,
        primaryKey: 'overview.attention.seeChange',
        primaryAction: 'task',
        secondaryKey: 'overview.attention.keepDate',
        taskId: weatherTask.id,
      };
    }
  }

  const nextTask = getNextUpcomingTask(openTasks, now);
  if (nextTask && !dismissed.has(nextTask.id)) {
    return {
      kind: 'nextTask',
      severity: 'info',
      id: nextTask.id,
      title: nextTask.title,
      explanationKey: 'overview.attention.nextBody',
      window: windowForTask(nextTask),
      primaryKey: 'overview.attention.openTask',
      primaryAction: 'task',
      taskId: nextTask.id,
    };
  }

  const proposal = input.proposals.find((item) => isOpenProposal(item) && !dismissed.has(item.id));
  if (proposal) {
    return {
      kind: 'proposal',
      severity: 'info',
      id: proposal.id,
      title: templateTitle(proposal.templateCode, input.language),
      explanationKey: 'overview.attention.proposalBody',
      explanationParams: {
        message: proposal.greekExplanation || proposal.explanation,
      },
      window: proposal.recommendedWindowEnd || proposal.recommendedWindowStart,
      primaryKey: 'overview.attention.seeProposal',
      primaryAction: 'proposal',
      proposalId: proposal.id,
    };
  }

  return noneAttention();
}

/** Chronologio warning/critical note when the live attention engine is quiet. */
export function chronologioAttentionFallback(input: {
  title: string;
  message: string;
  entryId: string;
  whenLabel: string;
}): FieldAttentionModel {
  return {
    kind: 'recording',
    severity: 'warning',
    id: input.entryId,
    title: input.title,
    explanationKey: 'overview.attention.recordingBody',
    explanationParams: { message: input.message, when: input.whenLabel },
    primaryKey: 'overview.seeObservation',
    primaryAction: 'chronologio',
    entryId: input.entryId,
  };
}
